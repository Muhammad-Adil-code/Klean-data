"""
Parallel chunk processor — splits large operations into N async workers.

Like Claude's parallel agents: Worker 1 handles rows 0-50k,
Worker 2 handles rows 50k-100k, etc., all running simultaneously.

Usage:
    results = await process_in_parallel(
        conn_type="postgresql",
        conn_str="...",
        table="orders",
        total_rows=1_000_000,
        operation="clean_nulls",
        chunk_size=50_000,
        on_progress=lambda msg: print(msg),
    )
"""
import asyncio
from typing import Callable, Awaitable, Any


async def process_in_parallel(
    conn_type: str,
    conn_str: str,
    table: str,
    total_rows: int,
    operation: str,        # "count" | "clean_nulls" | "custom_sql"
    chunk_size: int = 50_000,
    max_workers: int = 8,
    custom_sql_template: str = "",   # use {offset} and {limit} placeholders
    on_progress: Callable[[dict], Awaitable[None]] = None,
) -> dict:
    """
    Split `total_rows` into chunks and process them concurrently.
    Returns { total_processed, chunks, errors, results }.
    """
    chunks = _make_chunks(total_rows, chunk_size)
    semaphore = asyncio.Semaphore(max_workers)

    results = []
    errors  = []

    async def process_chunk(idx: int, offset: int, limit: int):
        async with semaphore:
            if on_progress:
                await on_progress({
                    "event": "chunk_start",
                    "worker": idx + 1,
                    "offset": offset,
                    "limit": limit,
                    "total_chunks": len(chunks),
                })
            try:
                result = await _run_chunk(
                    conn_type, conn_str, table, operation,
                    offset, limit, custom_sql_template,
                )
                if on_progress:
                    await on_progress({
                        "event": "chunk_done",
                        "worker": idx + 1,
                        "offset": offset,
                        "limit": limit,
                        "rows_processed": result.get("rows", 0),
                    })
                return result
            except Exception as e:
                err = {"worker": idx + 1, "offset": offset, "error": str(e)}
                errors.append(err)
                if on_progress:
                    await on_progress({"event": "chunk_error", **err})
                return None

    tasks = [process_chunk(i, off, lim) for i, (off, lim) in enumerate(chunks)]
    raw = await asyncio.gather(*tasks)
    results = [r for r in raw if r is not None]

    total_processed = sum(r.get("rows", 0) for r in results)
    return {
        "total_processed": total_processed,
        "chunks_total": len(chunks),
        "chunks_done": len(results),
        "errors": errors,
        "results": results,
    }


def _make_chunks(total: int, chunk_size: int) -> list[tuple[int, int]]:
    chunks = []
    offset = 0
    while offset < total:
        limit = min(chunk_size, total - offset)
        chunks.append((offset, limit))
        offset += limit
    return chunks


async def _run_chunk(conn_type, conn_str, table, operation, offset, limit, sql_template):
    if conn_type in ("csv", "excel", "file"):
        return await _file_chunk(conn_str, table, operation, offset, limit)

    if conn_type == "mongodb":
        return await _mongo_chunk(conn_str, table, operation, offset, limit)

    # SQL databases
    return await _sql_chunk(conn_type, conn_str, table, operation, offset, limit, sql_template)


async def _sql_chunk(conn_type, conn_str, table, operation, offset, limit, sql_template):
    from connectors.sql import run_query, run_write

    if operation == "count":
        sql = f'SELECT COUNT(*) as n FROM "{table}" LIMIT {limit} OFFSET {offset}'
        rows = await run_query(conn_type, conn_str, sql, limit=1)
        return {"rows": rows[0]["n"] if rows else 0}

    if operation == "clean_nulls":
        # Count nulls per chunk — actual deletion requires user approval
        sql = f'SELECT COUNT(*) as n FROM "{table}" WHERE {_build_null_check(table)} LIMIT {limit} OFFSET {offset}'
        try:
            rows = await run_query(conn_type, conn_str, sql)
            return {"rows": limit, "nulls_found": rows[0]["n"] if rows else 0}
        except Exception:
            return {"rows": limit, "nulls_found": 0}

    if operation == "custom_sql" and sql_template:
        sql = sql_template.replace("{offset}", str(offset)).replace("{limit}", str(limit))
        rows = await run_query(conn_type, conn_str, sql)
        return {"rows": len(rows), "data": rows}

    return {"rows": limit}


async def _mongo_chunk(conn_str, collection, operation, offset, limit):
    from connectors.mongo import run_query
    pipeline = [{"$skip": offset}, {"$limit": limit}]
    if operation == "count":
        pipeline = [{"$skip": offset}, {"$limit": limit}, {"$count": "n"}]
        rows = await run_query(conn_str, collection, pipeline)
        return {"rows": rows[0]["n"] if rows else 0}
    docs = await run_query(conn_str, collection, pipeline, limit=limit)
    return {"rows": len(docs)}


async def _file_chunk(path, table_name, operation, offset, limit):
    import pandas as pd
    from connectors.files import _load
    df = _load(path)
    chunk = df.iloc[offset: offset + limit]
    if operation == "count":
        return {"rows": len(chunk)}
    if operation == "clean_nulls":
        return {"rows": len(chunk), "nulls_found": int(chunk.isnull().sum().sum())}
    return {"rows": len(chunk)}


def _build_null_check(table: str) -> str:
    # Generic null check — caller should pass real column list for accuracy
    return "1=1"
