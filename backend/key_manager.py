"""API Key Manager — reads keys from file, auto-rotates on failure."""
import asyncio, os, re, logging
from typing import Optional

logger = logging.getLogger("key_manager")
KEYS_FILE = os.path.join(os.path.dirname(__file__), "api_keys.txt")
PEKPIK_BASE = "https://aiapiv2.pekpik.com/v1"
PEKPIK_MODEL = "gpt-4o"


class KeyManager:
    def __init__(self):
        self._keys: list[str] = []
        self._active_index: int = 0
        self._active_key: Optional[str] = None
        self._is_pekpik: bool = True
        self._reload_keys()

    def get(self) -> Optional[str]:
        return self._active_key

    def base_url(self) -> str:
        return PEKPIK_BASE if self._is_pekpik else os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1")

    def model(self) -> str:
        return PEKPIK_MODEL if self._is_pekpik else os.getenv("OPENAI_MODEL", "deepseek-chat")

    def _reload_keys(self):
        file_keys = []
        try:
            with open(KEYS_FILE) as f:
                for line in f:
                    line = line.split("#")[0].strip()
                    if line and re.match(r"^sk-[A-Za-z0-9]{20,}$", line):
                        file_keys.append(line)
        except FileNotFoundError:
            pass
        self._keys = list(dict.fromkeys(file_keys))
        if self._keys:
            self._active_index = 0
            self._active_key = self._keys[0]
        logger.info(f"[KeyManager] {len(self._keys)} key(s) loaded")


key_manager = KeyManager()
