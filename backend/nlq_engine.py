"""
Natural Language → Query engine with Human-in-the-Loop approval.

Two-step flow:
  Step 1 (analyze): Read schema + user question → return a plan (no execution)
  Step 2 (execute): Run the approved plan → return results
"""
import os
import json
import httpx
from typing import Any


OPENAI_BASE  = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")


def _get_llm_config() -> tuple[str, str, str]:
    """Return (api_key, base_url, model). User-configured keys take priority."""
    from user_settings import get_active_user_provider
    user = get_active_user_provider()
    if user:
        return user["api_key"].strip(), user["base_url"].rstrip("/"), user["model"]
    from key_manager import key_manager
    return (
        key_manager.get() or os.getenv("OPENAI_API_KEY", ""),
        key_manager.base_url(),
        key_manager.model(),
    )

def _get_key() -> str:   return _get_llm_config()[0]
def _get_base() -> str:  return _get_llm_config()[1]
def _get_model() -> str: return _get_llm_config()[2]


# ── Step 1: Analyze and plan ───────────────────────────────────────────────

async def analyze(
    question: str,
    connector: dict,
    schema: dict,
) -> dict:
    """
    Read schema + question → return a structured plan (no DB touch).
    Returns:
    {
      "diagnosis": "...",
      "understanding": "...",
      "steps": [{"id": 1, "description": "...", "code": "SELECT ...", "safe": true}],
      "requires_write": false,
      "estimated_rows": 0,
      "can_parallel": false,
    }
    """
    conn_type = connector["type"]
    schema_text = _format_schema(schema, conn_type)

    system = f"""You are a database analyst assistant. You help users query and clean data.
Database type: {conn_type}
User's database schema:
{schema_text}

RULES:
- Never execute anything — only plan.
- Always output valid JSON matching the exact structure requested.
- For NL→SQL: write actual executable SQL (or MongoDB aggregation pipelines).
- Mark steps as safe=true if they are read-only SELECT queries.
- Mark safe=false for UPDATE, DELETE, INSERT, DROP operations.
- If question requires reading >50,000 rows, set can_parallel=true.
- Be concise and honest about what you can and cannot do."""

    user = f"""Question: {question}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact structure:
{{
  "diagnosis": "one sentence describing what the user is asking",
  "understanding": "what data you will touch and why",
  "steps": [
    {{
      "id": 1,
      "description": "plain English description of this step",
      "code": "the actual SQL / mongo aggregation / pandas expression to run",
      "code_type": "sql" | "mongo_pipeline" | "pandas",
      "table": "which table/collection this touches",
      "safe": true
    }}
  ],
  "requires_write": false,
  "estimated_rows": 0,
  "can_parallel": false,
  "message": "summary message to show the user before they approve"
}}"""

    raw = await _llm(system, user)
    try:
        # Strip markdown fences if present
        clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(clean)
    except json.JSONDecodeError:
        return {
            "diagnosis": "Could not parse AI response",
            "understanding": raw[:300],
            "steps": [],
            "requires_write": False,
            "estimated_rows": 0,
            "can_parallel": False,
            "message": "I had trouble understanding the question. Could you rephrase it?",
        }


# ── Step 2: Execute approved steps ────────────────────────────────────────

async def execute_steps(
    steps: list[dict],
    connector: dict,
    approved_step_ids: list[int],
) -> list[dict]:
    """
    Run only the approved steps. Returns list of results per step.
    For large tables, parallel_worker handles chunking automatically.
    """
    conn_type = connector["type"]
    conn_str  = connector["connection_string"]
    results   = []

    for step in steps:
        if step["id"] not in approved_step_ids:
            results.append({"step_id": step["id"], "skipped": True})
            continue

        code = step.get("code", "")
        code_type = step.get("code_type", "sql")
        table = step.get("table", "")

        try:
            if conn_type in ("csv", "excel", "file"):
                from connectors.files import query_dataframe
                rows = query_dataframe(conn_str, code)
                results.append({"step_id": step["id"], "rows": rows, "count": len(rows)})

            elif conn_type == "mongodb":
                if code_type == "mongo_pipeline":
                    pipeline = json.loads(code) if isinstance(code, str) else code
                    from connectors.mongo import run_query
                    rows = await run_query(conn_str, table, pipeline)
                else:
                    from connectors.mongo import run_simple_find
                    rows = await run_simple_find(conn_str, table)
                results.append({"step_id": step["id"], "rows": rows, "count": len(rows)})

            else:
                # SQL
                if step.get("safe", True):
                    from connectors.sql import run_query
                    rows = await run_query(conn_type, conn_str, code)
                    results.append({"step_id": step["id"], "rows": rows, "count": len(rows)})
                else:
                    from connectors.sql import run_write
                    affected = await run_write(conn_type, conn_str, code)
                    results.append({"step_id": step["id"], "rows_affected": affected})

        except Exception as e:
            results.append({"step_id": step["id"], "error": str(e)[:300]})

    return results


# ── Simple follow-up chat (after results are shown) ───────────────────────

async def follow_up(
    question: str,
    previous_results: list[dict],
    connector: dict,
    schema: dict,
) -> str:
    """Conversational follow-up — explain results, suggest next steps."""
    conn_type = connector["type"]
    schema_text = _format_schema(schema, conn_type)
    sample = json.dumps(previous_results[:3], default=str)[:800]

    system = f"""You are a helpful data analyst. The user has a {conn_type} database.
Schema: {schema_text[:600]}
Previous query returned these sample rows: {sample}
Give a clear, plain-English answer. Suggest follow-up queries if useful. Keep it under 150 words."""

    return await _llm(system, question)


# ── Helpers ────────────────────────────────────────────────────────────────

def _format_schema(schema: dict, conn_type: str) -> str:
    tables = schema.get("tables", [])
    lines = []
    for t in tables[:15]:  # cap at 15 tables to stay within context
        cols = ", ".join(f"{c['name']} ({c['type']})" for c in t.get("columns", [])[:20])
        rows = f" [{t.get('rows', '?')} rows]" if t.get("rows") is not None else ""
        label = "collection" if conn_type == "mongodb" else "table"
        lines.append(f"  {label} {t['name']}{rows}: {cols}")
    return "\n".join(lines) or "No schema available"


async def _llm(system: str, user: str) -> str:
    key = _get_key()
    if not key:
        return "AI not configured. Add keys to backend/api_keys.txt or OPENAI_API_KEY to .env"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_get_base()}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": _get_model(),
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                "max_tokens": 1500,
            },
        )
    if resp.status_code != 200:
        raise RuntimeError(f"LLM error {resp.status_code}: {resp.text[:200]}")
    return resp.json()["choices"][0]["message"]["content"]
