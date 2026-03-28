"""Natural Language Query engine with HITL approval."""
import os, json, httpx

OPENAI_BASE  = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")


def _get_key() -> str:
    from key_manager import key_manager
    return key_manager.get() or os.getenv("OPENAI_API_KEY", "")

def _get_base() -> str:
    from key_manager import key_manager
    return key_manager.base_url()

def _get_model() -> str:
    from key_manager import key_manager
    return key_manager.model()
