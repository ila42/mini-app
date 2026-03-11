"""
database.py — Async SQLite layer via aiosqlite.
Tables: users, expenses.
"""

import logging
from datetime import datetime
from typing import Optional

import aiosqlite

DB_PATH = "finance_bot.db"
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
#  Schema
# ─────────────────────────────────────────────

CREATE_USERS_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY,   -- Telegram user_id
    username TEXT
);
"""

CREATE_EXPENSES_SQL = """
CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    BIGINT  NOT NULL,
    amount     REAL    NOT NULL,
    category   TEXT    NOT NULL,
    items      TEXT    NOT NULL,   -- comma-separated list
    date       TEXT    NOT NULL,   -- ISO-8601 string
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""


# ─────────────────────────────────────────────
#  Initialisation
# ─────────────────────────────────────────────

async def init_db() -> None:
    """Create all tables if they don't exist yet."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_USERS_SQL)
        await db.execute(CREATE_EXPENSES_SQL)
        await db.commit()
    logger.info("Database initialised at %s", DB_PATH)


# ─────────────────────────────────────────────
#  Users
# ─────────────────────────────────────────────

async def upsert_user(user_id: int, username: Optional[str]) -> None:
    """Insert or ignore user record."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)",
            (user_id, username or ""),
        )
        # Update username in case it changed.
        await db.execute(
            "UPDATE users SET username = ? WHERE id = ?",
            (username or "", user_id),
        )
        await db.commit()


# ─────────────────────────────────────────────
#  Expenses
# ─────────────────────────────────────────────

async def add_expense(user_id: int, data: dict) -> int:
    """
    Persist a single expense record.

    Expected keys in *data*:
        amount   : float
        category : str
        items    : list[str]
        date     : str  (ISO-8601 or human-readable)

    Returns the new row id.
    """
    items_str = ", ".join(data["items"]) if isinstance(data["items"], list) else str(data["items"])
    date_str = data.get("date") or datetime.utcnow().isoformat()

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO expenses (user_id, amount, category, items, date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, float(data["amount"]), data["category"], items_str, date_str),
        )
        await db.commit()
        row_id = cursor.lastrowid

    logger.info("Saved expense id=%s for user_id=%s  amount=%.2f  category=%s",
                row_id, user_id, data["amount"], data["category"])
    return row_id


async def get_user_expenses(user_id: int) -> list[dict]:
    """Return all expenses for a given user, newest first."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, amount, category, items, date, created_at
            FROM expenses
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
        rows = await cursor.fetchall()

    return [dict(row) for row in rows]


async def get_expense_summary(user_id: int) -> dict:
    """
    Quick summary: total spent and per-category breakdown.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        total_cur = await db.execute(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?",
            (user_id,),
        )
        total_row = await total_cur.fetchone()

        cat_cur = await db.execute(
            """
            SELECT category, SUM(amount) AS subtotal
            FROM expenses
            WHERE user_id = ?
            GROUP BY category
            ORDER BY subtotal DESC
            """,
            (user_id,),
        )
        cat_rows = await cat_cur.fetchall()

    return {
        "total": total_row["total"],
        "by_category": {row["category"]: row["subtotal"] for row in cat_rows},
    }
