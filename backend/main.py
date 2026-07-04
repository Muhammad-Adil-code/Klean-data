import os, sys, json, asyncio, logging
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="DataLib API", version="1.0.0")


@app.on_event("startup")
async def startup():
    from key_manager import key_manager
    key_manager.start_background_tasks()
    st = key_manager.status()
    logging.getLogger("key_manager").info(
        f"[KeyManager] Startup — {st['total_keys']} key(s), "
        f"active index {st['active_index']} ({st['active_source']})"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "*",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Settings ───────────────────────────────────────────────────────────────

@app.get("/settings")
async def get_settings():
    from user_settings import load_settings
    return load_settings()

@app.post("/settings")
async def save_settings_endpoint(body: dict):
    from user_settings import save_settings
    save_settings(body)
    return {"ok": True}

@app.post("/settings/test-key")
async def test_user_key(body: dict):
    """Quick test of a specific provider's key."""
    key = body.get("api_key", "").strip()
    base_url = body.get("base_url", "").rstrip("/")
    model = body.get("model", "gpt-4o-mini")
    if not key or not base_url:
        raise HTTPException(400, "api_key and base_url required")
    try:
        async with __import__("httpx").AsyncClient(timeout=12) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1},
            )
        return {"ok": resp.status_code == 200, "status": resp.status_code, "detail": resp.text[:120]}
    except Exception as e:
        return {"ok": False, "status": 0, "detail": str(e)[:120]}


# ── Health ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    from key_manager import key_manager
    return {"status": "ok", "version": "1.0.0", "keys": key_manager.status()}


@app.post("/keys/check-now")
async def trigger_key_check():
    """Manually trigger a health check + rotation right now."""
    from key_manager import key_manager
    key_manager._reload_keys()
    ok = await key_manager._test_key(key_manager.get() or "")
    if not ok:
        rotated = await key_manager._rotate()
        return {"checked": True, "was_ok": False, "rotated": rotated, "status": key_manager.status()}
    return {"checked": True, "was_ok": True, "rotated": False, "status": key_manager.status()}


@app.post("/keys/fetch-now")
async def trigger_key_fetch():
    """Manually trigger a README re-fetch and key file update right now."""
    from key_manager import key_manager
    from key_fetcher import fetch_and_update
    result = await fetch_and_update()
    key_manager._reload_keys()
    return {"fetch": result, "status": key_manager.status()}


# ── Connector CRUD ─────────────────────────────────────────────────────────

class ConnectorBody(BaseModel):
    name: str
    type: str          # postgresql | mysql | sqlite | mongodb | csv | excel
    connection_string: str
    readonly: bool = True


@app.get("/connectors")
async def list_connectors():
    from connector_store import list_connectors as _list
    return _list()


@app.post("/connectors")
async def add_connector(body: ConnectorBody):
    from connector_store import add_connector as _add
    conn = _add(body.name, body.type, body.connection_string, body.readonly)
    return conn


@app.delete("/connectors/{cid}")
async def remove_connector(cid: str):
    from connector_store import remove_connector as _rm, get_connector
    if not get_connector(cid):
        raise HTTPException(404, "Connector not found")
    _rm(cid)
    return {"ok": True}


@app.post("/connectors/{cid}/test")
async def test_connector(cid: str):
    """Test connection and fetch schema."""
    from connector_store import get_connector, update_connector
    conn = get_connector(cid)
    if not conn:
        raise HTTPException(404, "Connector not found")

    try:
        schema = await _fetch_schema(conn)
        update_connector(cid, {"status": "connected", "schema": schema})
        return {"ok": True, "schema": schema}
    except Exception as e:
        update_connector(cid, {"status": "error", "schema": None})
        raise HTTPException(502, str(e)[:300])


# ── File upload ────────────────────────────────────────────────────────────

@app.post("/connectors/upload")
async def upload_file(
    name: str = Form(...),
    file: UploadFile = File(...),
):
    from connector_store import add_connector as _add
    from connectors.files import save_upload

    content = await file.read()
    path = save_upload(file.filename, content)
    ext = file.filename.rsplit(".", 1)[-1].lower()
    conn_type = "excel" if ext in ("xlsx", "xls") else "csv"
    conn = _add(name or file.filename, conn_type, path, readonly=True)
    return conn


# ── Chat ───────────────────────────────────────────────────────────────────

class AnalyzeBody(BaseModel):
    connector_id: str
    question: str


class ExecuteBody(BaseModel):
    connector_id: str
    steps: list[dict]
    approved_step_ids: list[int]


class FollowUpBody(BaseModel):
    connector_id: str
    question: str
    previous_results: list[dict] = []


@app.post("/chat/analyze")
async def chat_analyze(body: AnalyzeBody):
    """
    Step 1 — HITL: read schema, understand question, return plan.
    Nothing is executed yet.
    """
    from connector_store import get_connector
    from nlq_engine import analyze

    conn = get_connector(body.connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")

    schema = conn.get("schema") or await _fetch_and_cache_schema(conn)
    plan = await analyze(body.question, conn, schema)
    return plan


@app.post("/chat/execute")
async def chat_execute(body: ExecuteBody):
    """
    Step 2 — run only the approved steps and return results.
    """
    from connector_store import get_connector
    from nlq_engine import execute_steps

    conn = get_connector(body.connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")

    results = await execute_steps(body.steps, conn, body.approved_step_ids)
    return {"results": results}


@app.post("/chat/followup")
async def chat_followup(body: FollowUpBody):
    from connector_store import get_connector
    from nlq_engine import follow_up

    conn = get_connector(body.connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")

    schema = conn.get("schema") or {}
    answer = await follow_up(body.question, body.previous_results, conn, schema)
    return {"answer": answer}


# ── Parallel chunk job (SSE streaming) ────────────────────────────────────

class ParallelJobBody(BaseModel):
    connector_id: str
    table: str
    operation: str      # "count" | "clean_nulls" | "custom_sql"
    total_rows: int
    chunk_size: int = 50_000
    max_workers: int = 8
    custom_sql_template: str = ""


@app.post("/jobs/parallel")
async def run_parallel_job(body: ParallelJobBody):
    """
    Run a large-dataset operation in parallel chunks.
    Returns SSE stream: each event is a JSON progress update.
    """
    from connector_store import get_connector
    from parallel_worker import process_in_parallel

    conn = get_connector(body.connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")

    async def event_stream():
        events = asyncio.Queue()

        async def on_progress(msg: dict):
            await events.put(msg)

        async def worker():
            result = await process_in_parallel(
                conn_type=conn["type"],
                conn_str=conn["connection_string"],
                table=body.table,
                total_rows=body.total_rows,
                operation=body.operation,
                chunk_size=body.chunk_size,
                max_workers=body.max_workers,
                custom_sql_template=body.custom_sql_template,
                on_progress=on_progress,
            )
            await events.put({"event": "done", **result})

        asyncio.create_task(worker())

        while True:
            msg = await events.get()
            yield f"data: {json.dumps(msg)}\n\n"
            if msg.get("event") == "done":
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Helpers ────────────────────────────────────────────────────────────────

async def _fetch_schema(conn: dict) -> dict:
    t = conn["type"]
    cs = conn["connection_string"]
    if t in ("postgresql", "postgres", "mysql", "sqlite"):
        from connectors.sql import get_schema
        return await get_schema(t, cs)
    if t == "mongodb":
        from connectors.mongo import get_schema
        return await get_schema(cs)
    if t in ("csv", "excel", "file"):
        from connectors.files import get_schema
        return get_schema(cs)
    raise ValueError(f"Unknown connector type: {t}")


async def _fetch_and_cache_schema(conn: dict) -> dict:
    from connector_store import update_connector
    schema = await _fetch_schema(conn)
    update_connector(conn["id"], {"schema": schema, "status": "connected"})
    return schema


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8766, reload=True)
