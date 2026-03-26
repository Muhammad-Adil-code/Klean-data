"""
Fetches free LLM API keys from the public GitHub README.
Parses markdown tables, prioritizes GPT > Claude > Gemini > others,
writes sorted keys + metadata to api_keys.txt.
Runs automatically every 24 hours inside key_manager.
"""

import re
import logging
import os
import httpx
from datetime import datetime

logger = logging.getLogger("key_fetcher")

README_URL  = "https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md"
KEYS_FILE   = os.path.join(os.path.dirname(__file__), "api_keys.txt")
BASE_URL    = "https://aiapiv2.pekpik.com/v1"   # all keys in this repo use pekpik

# Priority order — higher index = lower priority
PRIORITY = [
    ("gpt",     ["gpt", "o1", "o3", "o4", "o5", "gpt-5", "gpt-4"]),
    ("claude",  ["claude", "anthropic"]),
    ("gemini",  ["gemini", "google"]),
    ("others",  []),   # catch-all
]


async def fetch_and_update() -> dict:
    """
    Fetch README, parse all keys, sort by priority, write to api_keys.txt.
    Returns { fetched, written, by_provider }.
    """
    logger.info(f"[KeyFetcher] Fetching {README_URL}")
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(README_URL)
        if resp.status_code != 200:
            logger.error(f"[KeyFetcher] HTTP {resp.status_code}")
            return {"fetched": 0, "written": 0, "error": f"HTTP {resp.status_code}"}
        content = resp.text
    except Exception as e:
        logger.error(f"[KeyFetcher] Fetch failed: {e}")
        return {"fetched": 0, "written": 0, "error": str(e)}

    entries = _parse_markdown(content)
    if not entries:
        logger.warning("[KeyFetcher] No keys found in README")
        return {"fetched": 0, "written": 0, "error": "No keys parsed"}

    sorted_entries = _sort_by_priority(entries)
    _write_keys_file(sorted_entries)

    by_provider = {}
    for e in sorted_entries:
        p = e["provider"]
        by_provider[p] = by_provider.get(p, 0) + 1

    logger.info(f"[KeyFetcher] Done — {len(sorted_entries)} keys written. {by_provider}")
    return {"fetched": len(entries), "written": len(sorted_entries), "by_provider": by_provider}


def _parse_markdown(content: str) -> list[dict]:
    """
    Extract key entries from markdown table rows.
    Looks for rows containing sk- tokens.
    Expected columns: key | model | status | budget | rate_limit | expires | description
    """
    entries = []
    seen = set()

    for line in content.splitlines():
        # Only process table rows (start and end with |)
        line = line.strip()
        if not line.startswith("|") or "---" in line:
            continue

        cells = [c.strip() for c in line.strip("|").split("|")]
        if not cells:
            continue

        # Find a cell that looks like an API key
        key = None
        for cell in cells:
            # Strip markdown formatting (bold, code, links)
            clean = re.sub(r"[`*\[\]()]", "", cell).strip()
            if re.match(r"^sk-[A-Za-z0-9]{20,}$", clean):
                key = clean
                break

        if not key or key in seen:
            continue
        seen.add(key)

        # Extract model name — usually 2nd or 3rd cell after the key cell
        model = ""
        key_idx = next((i for i, c in enumerate(cells) if key in c), -1)
        for offset in [1, 2, -1]:
            idx = key_idx + offset
            if 0 <= idx < len(cells) and cells[idx] and "---" not in cells[idx]:
                candidate = re.sub(r"[`*\[\]()]", "", cells[idx]).strip()
                if candidate and not re.match(r"^sk-", candidate) and len(candidate) > 2:
                    model = candidate.lower()
                    break

        entries.append({"key": key, "model": model, "provider": _classify(model)})

    return entries


def _classify(model: str) -> str:
    for provider, keywords in PRIORITY:
        if provider == "others":
            return "others"
        for kw in keywords:
            if kw in model:
                return provider
    return "others"


def _sort_by_priority(entries: list[dict]) -> list[dict]:
    order = {p: i for i, (p, _) in enumerate(PRIORITY)}
    return sorted(entries, key=lambda e: order.get(e["provider"], 99))


def _write_keys_file(entries: list[dict]):
    """Write keys to api_keys.txt grouped by provider with comments."""
    lines = [
        f"# Auto-updated by key_fetcher.py — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"# Source: {README_URL}",
        f"# Base URL for all keys: {BASE_URL}",
        f"# Total: {len(entries)} keys | Priority: GPT → Claude → Gemini → Others",
        "",
    ]

    current_provider = None
    for e in entries:
        if e["provider"] != current_provider:
            current_provider = e["provider"]
            lines.append(f"# ── {current_provider.upper()} ──")
        model_note = f"  # {e['model']}" if e["model"] else ""
        lines.append(f"{e['key']}{model_note}")

    lines.append("")
    with open(KEYS_FILE, "w") as f:
        f.write("\n".join(lines))
    logger.info(f"[KeyFetcher] Wrote {len(entries)} keys to {KEYS_FILE}")
