"""SQL connector — PostgreSQL, MySQL, SQLite."""
import asyncio


async def get_schema(db_type: str, conn_str: str) -> dict:
    """Return {tables: [{name, columns, rows}]}."""
    if db_type in ("postgresql", "postgres"):
        return await _pg_schema(conn_str)
    if db_type == "mysql":
        return await _mysql_schema(conn_str)
    if db_type == "sqlite":
        return await _sqlite_schema(conn_str)
    raise ValueError(f"Unsupported type: {db_type}")
