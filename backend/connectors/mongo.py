"""MongoDB connector via Motor (async)."""
import asyncio
import ssl
import certifi

_orig_ssl_ctx = ssl.create_default_context

def _tls12_context(*args, **kwargs):
    ctx = _orig_ssl_ctx(*args, **kwargs)
    ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    return ctx

ssl.create_default_context = _tls12_context


def _parse_db_name(conn_str: str) -> str:
    path = conn_str.split("?")[0].rstrip("/")
    part = path.split("/")[-1].strip()
    if not part or part.startswith("cluster") or part in ("", "localhost", "27017"):
        return "test"
    return part
