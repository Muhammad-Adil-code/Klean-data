"""
File connector: CSV and Excel via pandas.
Files are stored in an upload directory and referenced by path.
"""
import os
import pandas as pd
from typing import Optional

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_upload(filename: str, content: bytes) -> str:
    """Save uploaded file and return its absolute path."""
    import re
    safe = re.sub(r"[^\w.\-]", "_", filename)
    path = os.path.join(UPLOAD_DIR, safe)
    with open(path, "wb") as f:
        f.write(content)
    return path


def get_schema(path: str) -> dict:
    df = _load(path)
    cols = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    return {"tables": [{"name": os.path.basename(path), "columns": cols, "rows": len(df)}]}


def query_dataframe(path: str, question_or_expr: str, limit: int = 500) -> list[dict]:
    """
    Run a pandas query expression like "age > 30 and country == 'US'"
    or return first N rows if expression is empty.
    """
    df = _load(path)
    if question_or_expr.strip():
        try:
            df = df.query(question_or_expr)
        except Exception:
            pass
    return df.head(limit).to_dict(orient="records")


def get_sample(path: str, n: int = 5) -> list[dict]:
    return _load(path).head(n).to_dict(orient="records")


def _load(path: str) -> pd.DataFrame:
    ext = path.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        return pd.read_csv(path)
    if ext in ("xlsx", "xls"):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported file type: .{ext}")
