import aiosqlite
import pathlib
from typing import Optional, Tuple, List, Dict, Any

# Database file path
DB = pathlib.Path("calibrations.db")

async def init() -> None:
    """Initialize the calibrations database."""
    async with aiosqlite.connect(DB) as db:
        await db.execute("""CREATE TABLE IF NOT EXISTS calib (
            stream TEXT,
            element_type TEXT,
            element_id INTEGER,
            meas_type TEXT,
            bias REAL,
            scale REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (stream, element_type, element_id, meas_type)
        )""")
        await db.commit()

async def get(stream: str, etype: str, eid: int, mtype: str) -> Optional[Tuple[float, float]]:
    """Get calibration factors for a specific sensor.
    
    Returns:
        Tuple of (bias, scale) or None if not found
    """
    async with aiosqlite.connect(DB) as db:
        cur = await db.execute(
            "SELECT bias, scale FROM calib WHERE stream=? AND element_type=? "
            "AND element_id=? AND meas_type=?",
            (stream, etype, eid, mtype)
        )
        return await cur.fetchone()  # None or (bias, scale)

async def upsert(stream: str, etype: str, eid: int, mtype: str, bias: float, scale: float) -> None:
    """Insert or update calibration factors for a sensor."""
    async with aiosqlite.connect(DB) as db:
        await db.execute("""INSERT INTO calib (stream, element_type, element_id, meas_type, bias, scale)
             VALUES (?,?,?,?,?,?)
             ON CONFLICT(stream, element_type, element_id, meas_type)
             DO UPDATE SET bias=excluded.bias, scale=excluded.scale, updated_at=CURRENT_TIMESTAMP""",
             (stream, etype, eid, mtype, bias, scale))
        await db.commit()

async def clear(stream: str, etype: str, eid: int, mtype: str) -> None:
    """Clear calibration factors for a specific sensor."""
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "DELETE FROM calib WHERE stream=? AND element_type=? "
            "AND element_id=? AND meas_type=?",
            (stream, etype, eid, mtype)
        )
        await db.commit()

async def list_all() -> List[Dict[str, Any]]:
    """List all calibration factors."""
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT stream, element_type, element_id, meas_type, bias, scale, "
            "created_at, updated_at FROM calib ORDER BY updated_at DESC"
        )
        rows = await cur.fetchall()
        return [dict(row) for row in rows]

async def clear_all() -> int:
    """Clear all calibration factors. Returns number of deleted records."""
    async with aiosqlite.connect(DB) as db:
        cur = await db.execute("DELETE FROM calib")
        await db.commit()
        return cur.rowcount 