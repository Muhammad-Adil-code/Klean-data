"""
In-memory connector registry with disk persistence (JSON file).
Stores connection metadata only — never the actual data.
"""
import json, os, uuid
from typing import Optional

STORE_PATH = os.path.join(os.path.dirname(__file__), "connectors.json")

_store: dict[str, dict] = {}


def _load():
    global _store
    if os.path.exists(STORE_PATH):
        try:
            _store = json.loads(open(STORE_PATH).read())
        except Exception:
            _store = {}


def _save():
    with open(STORE_PATH, "w") as f:
        json.dump(_store, f, indent=2)


_load()


def add_connector(name: str, conn_type: str, connection_string: str, readonly: bool = True) -> dict:
    cid = str(uuid.uuid4())[:8]
    conn = {
        "id": cid,
        "name": name,
        "type": conn_type,          # postgresql | mysql | sqlite | mongodb | csv | excel
        "connection_string": connection_string,
        "readonly": readonly,
        "status": "untested",
        "schema": None,             # populated after first test
        "row_count": None,
    }
    _store[cid] = conn
    _save()
    return conn


def get_connector(cid: str) -> Optional[dict]:
    return _store.get(cid)


def list_connectors() -> list[dict]:
    return list(_store.values())


def update_connector(cid: str, patch: dict):
    if cid in _store:
        _store[cid].update(patch)
        _save()


def remove_connector(cid: str):
    _store.pop(cid, None)
    _save()
