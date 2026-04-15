"""
MongoDB connector via Motor (async).
"""
import asyncio
import ssl
import certifi

# Python 3.13 / OpenSSL 3.x sends TLS 1.3 ClientHello features that trigger
# an INTERNAL_ERROR alert from some MongoDB Atlas clusters. Capping at TLS 1.2
# is the only reliable workaround without a Motor-level ssl_context param.
_orig_ssl_ctx = ssl.create_default_context


def _tls12_context(*args, **kwargs):
    ctx = _orig_ssl_ctx(*args, **kwargs)
    ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    return ctx


ssl.create_default_context = _tls12_context


def _parse_db_name(conn_str: str) -> str:
    # Strip query params, then grab the last path segment
    path = conn_str.split("?")[0].rstrip("/")
    part = path.split("/")[-1].strip()
    if not part or part.startswith("cluster") or part in ("", "localhost", "27017"):
        return "test"
    return part


def _make_client(conn_str: str, timeout_ms: int = 8000):
    import motor.motor_asyncio as motor
    # Use certifi CA bundle so MongoDB Atlas TLS handshakes succeed
    return motor.AsyncIOMotorClient(
        conn_str,
        serverSelectionTimeoutMS=timeout_ms,
        tlsCAFile=certifi.where(),
    )


async def get_schema(conn_str: str) -> dict:
    client = _make_client(conn_str)
    db_name = _parse_db_name(conn_str)
    db = client[db_name]
    try:
        collections = await asyncio.wait_for(db.list_collection_names(), timeout=9)
        tables = []
        for coll in collections:
            count = await asyncio.wait_for(db[coll].estimated_document_count(), timeout=5)
            sample = await db[coll].find_one()
            cols = [{"name": k, "type": type(v).__name__} for k, v in (sample or {}).items() if k != "_id"]
            tables.append({"name": coll, "columns": cols, "rows": count})
        return {"tables": tables}
    finally:
        client.close()


async def run_query(conn_str: str, collection: str, pipeline: list, limit: int = 500) -> list[dict]:
    """Run an aggregation pipeline and return documents as plain dicts."""
    import json
    client = _make_client(conn_str)
    db_name = _parse_db_name(conn_str)
    db = client[db_name]
    try:
        pipeline = pipeline + [{"$limit": limit}]
        cursor = db[collection].aggregate(pipeline)
        docs = []
        async for doc in cursor:
            docs.append(json.loads(json.dumps(doc, default=str)))
        return docs
    finally:
        client.close()


async def run_simple_find(conn_str: str, collection: str, query: dict = None, limit: int = 500) -> list[dict]:
    import json
    client = _make_client(conn_str)
    db_name = _parse_db_name(conn_str)
    db = client[db_name]
    try:
        cursor = db[collection].find(query or {}).limit(limit)
        docs = []
        async for doc in cursor:
            docs.append(json.loads(json.dumps(doc, default=str)))
        return docs
    finally:
        client.close()
