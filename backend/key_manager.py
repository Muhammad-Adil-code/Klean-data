"""
API Key Manager with automatic rotation and periodic health checks.

Two background loops run forever:
  1. Fetcher  — every 24h: re-downloads README, parses keys, writes api_keys.txt
  2. Checker  — every 5h:  tests active key; rotates to next if it fails

Key priority (set by key_fetcher): GPT → Claude → Gemini → Others

Usage:
  from key_manager import key_manager
  key  = key_manager.get()                # current working key
  base = key_manager.base_url()           # matching base URL
  key_manager.start_background_tasks()   # call once at startup
"""

import asyncio
import os
import re
import logging
import httpx
from typing import Optional

logger = logging.getLogger("key_manager")

KEYS_FILE          = os.path.join(os.path.dirname(__file__), "api_keys.txt")
CHECK_INTERVAL_SEC = int(os.getenv("KEY_CHECK_INTERVAL_HOURS", "5")) * 3600
FETCH_INTERVAL_SEC = 24 * 3600   # re-download README every 24 hours

# pekpik is the base for all keys from the GitHub README
PEKPIK_BASE = "https://aiapiv2.pekpik.com/v1"
PEKPIK_MODEL = "gpt-4o"   # default test model on pekpik

# Env-var fallback (user's own key, different base)
ENV_BASE  = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
ENV_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")


class KeyManager:
    def __init__(self):
        self._keys: list[str] = []          # ordered: GPT → Claude → Gemini → others
        self._active_index: int = 0
        self._active_key: Optional[str] = None
        self._is_pekpik: bool = True         # track whether active key is pekpik or env
        self._lock = asyncio.Lock()
        self._last_fetch: float = 0
        self._reload_keys()

    # ── Public API ────────────────────────────────────────────────────────

    def get(self) -> Optional[str]:
        return self._active_key

    def base_url(self) -> str:
        """Return the correct base URL for the currently active key."""
        return PEKPIK_BASE if self._is_pekpik else ENV_BASE

    def model(self) -> str:
        return PEKPIK_MODEL if self._is_pekpik else ENV_MODEL

    def start_background_tasks(self):
        asyncio.create_task(self._fetch_loop())
        asyncio.create_task(self._health_loop())
        logger.info(
            f"[KeyManager] Started — "
            f"fetch every 24h, health-check every {CHECK_INTERVAL_SEC // 3600}h"
        )

    # ── Key file reader ───────────────────────────────────────────────────

    def _reload_keys(self):
        """Read api_keys.txt. Keys starting with sk- from pekpik go first."""
        file_keys = []
        try:
            with open(KEYS_FILE) as f:
                for line in f:
                    # Strip inline comments (e.g. "sk-abc123  # gpt-4o")
                    line = line.split("#")[0].strip()
                    if line and re.match(r"^sk-[A-Za-z0-9]{20,}$", line):
                        file_keys.append(line)
        except FileNotFoundError:
            pass

        # Env-var key is always appended last as fallback
        env_key = os.getenv("OPENAI_API_KEY", "").strip()
        all_keys = list(dict.fromkeys(file_keys))   # dedupe, preserve order
        if env_key and env_key not in all_keys:
            all_keys.append(env_key)

        if not all_keys:
            logger.error("[KeyManager] No keys found — requests will fail until fetched")
            self._keys = []
            self._active_key = None
            return

        # Preserve active key position if it's still in the list
        if self._active_key and self._active_key in all_keys:
            self._active_index = all_keys.index(self._active_key)
        else:
            self._active_index = 0
            self._active_key = all_keys[0]

        self._keys = all_keys
        self._is_pekpik = self._active_key in file_keys
        logger.info(
            f"[KeyManager] {len(all_keys)} key(s) loaded "
            f"({len(file_keys)} from file). "
            f"Active: index {self._active_index} "
            f"({'pekpik' if self._is_pekpik else 'env'})"
        )

    # ── Key tester ────────────────────────────────────────────────────────

    async def _test_key(self, key: str) -> bool:
        """Send one minimal request. Uses pekpik base if key came from file."""
        is_file_key = key in self._keys and self._keys.index(key) < len(self._keys)
        # Decide which base to ping
        env_key = os.getenv("OPENAI_API_KEY", "").strip()
        is_env = key == env_key
        base  = ENV_BASE  if is_env else PEKPIK_BASE
        model = ENV_MODEL if is_env else PEKPIK_MODEL
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                resp = await client.post(
                    f"{base}/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": "hi"}], "max_tokens": 1},
                )
            ok = resp.status_code == 200
            if not ok:
                logger.warning(f"[KeyManager] Key test HTTP {resp.status_code}: {resp.text[:80]}")
            return ok
        except Exception as e:
            logger.warning(f"[KeyManager] Key test error: {e}")
            return False

    # ── Rotation ──────────────────────────────────────────────────────────

    async def _rotate(self) -> bool:
        async with self._lock:
            self._reload_keys()
            if not self._keys:
                return False
            n = len(self._keys)
            for i in range(n):
                idx = (self._active_index + 1 + i) % n
                candidate = self._keys[idx]
                logger.info(f"[KeyManager] Trying key index {idx}…")
                if await self._test_key(candidate):
                    self._active_index = idx
                    self._active_key = candidate
                    env_key = os.getenv("OPENAI_API_KEY", "").strip()
                    self._is_pekpik = candidate != env_key
                    logger.info(f"[KeyManager] ✓ Switched to index {idx}")
                    return True
            logger.error("[KeyManager] All keys failed.")
            return False

    # ── Background loops ──────────────────────────────────────────────────

    async def _fetch_loop(self):
        """Every 24h: re-download README → update api_keys.txt → reload."""
        # Run immediately at startup too
        while True:
            logger.info("[KeyManager] Running key fetch from GitHub README…")
            try:
                from key_fetcher import fetch_and_update
                result = await fetch_and_update()
                logger.info(f"[KeyManager] Fetch done: {result}")
                self._reload_keys()
            except Exception as e:
                logger.error(f"[KeyManager] Fetch failed: {e}")
            await asyncio.sleep(FETCH_INTERVAL_SEC)

    async def _health_loop(self):
        """Every 5h: test active key, rotate if dead."""
        # First check after one interval (not at startup — fetcher just ran)
        await asyncio.sleep(CHECK_INTERVAL_SEC)
        while True:
            logger.info("[KeyManager] Health check…")
            self._reload_keys()
            key = self._active_key
            if not key:
                await self._rotate()
            elif await self._test_key(key):
                logger.info(f"[KeyManager] ✓ Key index {self._active_index} healthy")
            else:
                logger.warning(f"[KeyManager] ✗ Key index {self._active_index} dead — rotating")
                found = await self._rotate()
                if not found:
                    logger.error("[KeyManager] All keys dead. Waiting for next fetch cycle.")
            await asyncio.sleep(CHECK_INTERVAL_SEC)

    # ── Status ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        return {
            "total_keys": len(self._keys),
            "active_index": self._active_index,
            "has_active_key": self._active_key is not None,
            "active_source": "pekpik" if self._is_pekpik else "env",
            "active_base_url": self.base_url(),
            "check_interval_hours": CHECK_INTERVAL_SEC // 3600,
            "fetch_interval_hours": FETCH_INTERVAL_SEC // 3600,
        }


key_manager = KeyManager()
