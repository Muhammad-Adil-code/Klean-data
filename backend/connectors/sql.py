"""
SQL connector: PostgreSQL, MySQL, SQLite via SQLAlchemy async.
"""
import asyncio
from typing import Any


async def get_schema(conn_type: str, conn_str: str) -> dict:
    """Return table names, column names/types, and row counts."""
    if conn_type in ("postgresql", "postgres"):
        return await _pg_schema(conn_str)
    if conn_type == "mysql":
        return await _mysql_schema(conn_str)
    if conn_type in ("sqlite",):
        return await _sqlite_schema(conn_str)
    raise ValueError(f"Unknown SQL type: {conn_type}")


async def run_query(conn_type: str, conn_str: str, sql: str, limit: int = 500) -> list[dict]:
    """Run a SELECT query and return rows as list of dicts."""
    safe = sql.strip()
    if not safe.upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries allowed in read-only mode")
    if "LIMIT" not in safe.upper():
        safe = f"{safe} LIMIT {limit}"
    if conn_type in ("postgresql", "postgres"):
        return await _pg_query(conn_str, safe)
    if conn_type == "mysql":
        return await _mysql_query(conn_str, safe)
    if conn_type in ("sqlite",):
        return await _sqlite_query(conn_str, safe)
    raise ValueError(f"Unknown SQL type: {conn_type}")


async def run_write(conn_type: str, conn_str: str, sql: str) -> int:
    """Run an INSERT/UPDATE/DELETE. Returns rows affected."""
    if conn_type in ("postgresql", "postgres"):
        return await _pg_write(conn_str, sql)
    if conn_type == "mysql":
        return await _mysql_write(conn_str, sql)
    if conn_type in ("sqlite",):
        return await _sqlite_write(conn_str, sql)
    raise ValueError(f"Unknown SQL type: {conn_type}")


# ── PostgreSQL ─────────────────────────────────────────────────────────────

async def _pg_schema(conn_str: str) -> dict:
    import asyncpg
    conn = await asyncio.wait_for(asyncpg.connect(conn_str), timeout=8)
    try:
        rows = await conn.fetch(
            "SELECT t.table_name, c.column_name, c.data_type "
            "FROM information_schema.tables t "
            "JOIN information_schema.columns c ON c.table_name = t.table_name "
            "WHERE t.table_schema = 'public' ORDER BY t.table_name, c.ordinal_position"
        )
        tables: dict[str, list] = {}
        for r in rows:
            tables.setdefault(r["table_name"], []).append(
                {"name": r["column_name"], "type": r["data_type"]}
            )
        counts = {}
        for t in tables:
            try:
                n = await conn.fetchval(f'SELECT COUNT(*) FROM "{t}"')
                counts[t] = n
            except Exception:
                counts[t] = None
        return {"tables": [{"name": t, "columns": cols, "rows": counts.get(t)} for t, cols in tables.items()]}
    finally:
        await conn.close()


async def _pg_query(conn_str: str, sql: str) -> list[dict]:
    import asyncpg
    conn = await asyncio.wait_for(asyncpg.connect(conn_str), timeout=15)
    try:
        rows = await conn.fetch(sql)
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def _pg_write(conn_str: str, sql: str) -> int:
    import asyncpg
    conn = await asyncio.wait_for(asyncpg.connect(conn_str), timeout=30)
    try:
        status = await conn.execute(sql)
        # status looks like "UPDATE 42"
        parts = status.split()
        return int(parts[-1]) if parts[-1].isdigit() else 0
    finally:
        await conn.close()


# ── MySQL ──────────────────────────────────────────────────────────────────

async def _mysql_schema(conn_str: str) -> dict:
    import aiomysql
    from urllib.parse import urlparse
    p = urlparse(conn_str)
    db = (p.path or "").lstrip("/") or None
    conn = await asyncio.wait_for(
        aiomysql.connect(host=p.hostname, port=p.port or 3306,
                         user=p.username, password=p.password or "", db=db),
        timeout=8,
    )
    try:
        tables: dict[str, list] = {}
        async with conn.cursor() as cur:
            await cur.execute("SHOW TABLES")
            table_names = [r[0] for r in await cur.fetchall()]
            for t in table_names:
                await cur.execute(f"DESCRIBE `{t}`")
                cols = [{"name": r[0], "type": r[1]} for r in await cur.fetchall()]
                tables[t] = cols
        counts = {}
        async with conn.cursor() as cur:
            for t in tables:
                try:
                    await cur.execute(f"SELECT COUNT(*) FROM `{t}`")
                    counts[t] = (await cur.fetchone())[0]
                except Exception:
                    counts[t] = None
        return {"tables": [{"name": t, "columns": cols, "rows": counts.get(t)} for t, cols in tables.items()]}
    finally:
        conn.close()


async def _mysql_query(conn_str: str, sql: str) -> list[dict]:
    import aiomysql
    from urllib.parse import urlparse
    p = urlparse(conn_str)
    db = (p.path or "").lstrip("/") or None
    conn = await asyncio.wait_for(
        aiomysql.connect(host=p.hostname, port=p.port or 3306,
                         user=p.username, password=p.password or "", db=db),
        timeout=15,
    )
    try:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql)
            return list(await cur.fetchall())
    finally:
        conn.close()


async def _mysql_write(conn_str: str, sql: str) -> int:
    import aiomysql
    from urllib.parse import urlparse
    p = urlparse(conn_str)
    db = (p.path or "").lstrip("/") or None
    conn = await asyncio.wait_for(
        aiomysql.connect(host=p.hostname, port=p.port or 3306,
                         user=p.username, password=p.password or "", db=db,
                         autocommit=True),
        timeout=30,
    )
    try:
        async with conn.cursor() as cur:
            await cur.execute(sql)
            return cur.rowcount
    finally:
        conn.close()


# ── SQLite ─────────────────────────────────────────────────────────────────

async def _sqlite_schema(conn_str: str) -> dict:
    import aiosqlite, os
    path = conn_str.replace("sqlite:///", "").replace("sqlite://", "")
    if not os.path.exists(path):
        raise FileNotFoundError(f"SQLite file not found: {path}")
    async with aiosqlite.connect(path) as db:
        async with db.execute("SELECT name FROM sqlite_master WHERE type='table'") as cur:
            table_names = [r[0] async for r in cur]
        tables = []
        for t in table_names:
            async with db.execute(f"PRAGMA table_info(`{t}`)") as cur:
                cols = [{"name": r[1], "type": r[2]} async for r in cur]
            async with db.execute(f"SELECT COUNT(*) FROM `{t}`") as cur:
                row = await cur.fetchone()
                count = row[0] if row else 0
            tables.append({"name": t, "columns": cols, "rows": count})
    return {"tables": tables}


async def _sqlite_query(conn_str: str, sql: str) -> list[dict]:
    import aiosqlite
    path = conn_str.replace("sqlite:///", "").replace("sqlite://", "")
    async with aiosqlite.connect(path) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(sql) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def _sqlite_write(conn_str: str, sql: str) -> int:
    import aiosqlite
    path = conn_str.replace("sqlite:///", "").replace("sqlite://", "")
    async with aiosqlite.connect(path) as db:
        await db.execute(sql)
        await db.commit()
        return db.total_changes
