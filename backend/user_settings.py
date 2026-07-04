"""User-configurable API key settings. Stored in user_config.json next to this file."""
import json, os
from pathlib import Path

SETTINGS_FILE = Path(os.path.dirname(__file__)) / "user_config.json"

PRESET_PROVIDERS = [
    {
        "id": "openai",
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "api_key": "",
        "model": "gpt-4o",
        "enabled": False,
        "builtin": True,
        "placeholder": "sk-...",
        "description": "GPT-4o, GPT-4-turbo, o1, o3",
    },
    {
        "id": "gemini",
        "name": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key": "",
        "model": "gemini-2.0-flash-exp",
        "enabled": False,
        "builtin": True,
        "placeholder": "AIza...",
        "description": "Gemini 2.0 Flash, Gemini 1.5 Pro",
    },
    {
        "id": "deepseek",
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "api_key": "",
        "model": "deepseek-chat",
        "enabled": False,
        "builtin": True,
        "placeholder": "sk-...",
        "description": "DeepSeek-V3, DeepSeek-R1",
    },
    {
        "id": "openrouter",
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key": "",
        "model": "openai/gpt-4o-mini",
        "enabled": False,
        "builtin": True,
        "placeholder": "sk-or-v1-...",
        "description": "300+ models incl. Claude, Llama, Mistral",
    },
]


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            # Back-fill any new preset providers added since last save
            existing_ids = {p["id"] for p in data.get("providers", [])}
            for preset in PRESET_PROVIDERS:
                if preset["id"] not in existing_ids:
                    data["providers"].append(dict(preset))
            return data
        except Exception:
            pass
    return {
        "providers": [dict(p) for p in PRESET_PROVIDERS],
        "custom_providers": [],
        "use_free_fallback": True,
    }


def save_settings(data: dict):
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))


def get_active_user_provider() -> dict | None:
    """Return first enabled provider that has a non-empty API key."""
    settings = load_settings()
    all_providers = settings.get("providers", []) + settings.get("custom_providers", [])
    for p in all_providers:
        if p.get("enabled") and p.get("api_key", "").strip():
            return p
    return None
