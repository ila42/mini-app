"""
database.py — Supabase layer.

Table: expenses
Columns: user_id (bigint), amount (float), category (text),
         description (text), expense_date (date)
"""

import logging
import os
from datetime import date

from dotenv import load_dotenv
from supabase import acreate_client, AsyncClient

load_dotenv(override=True)

logger = logging.getLogger(__name__)

_client: AsyncClient | None = None


async def _get_client() -> AsyncClient:
    """Lazy singleton for the Supabase async client."""
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_KEY"]
        _client = await acreate_client(url, key)
        logger.info("Supabase client initialised.")
    return _client


# ─────────────────────────────────────────────
#  Expenses
# ─────────────────────────────────────────────

async def save_expense(user_id: int, data: dict) -> None:
    """
    Insert a single expense row into Supabase.

    Expected keys in *data*:
        amount      : float
        category    : str
        description : str
        date        : str  (YYYY-MM-DD)
    """
    expense_date = data.get("date") or date.today().isoformat()
    if len(expense_date) > 10:
        expense_date = expense_date[:10]

    client = await _get_client()
    await (
        client.table("expenses")
        .insert(
            {
                "user_id": user_id,
                "amount": float(data["amount"]),
                "category": data["category"],
                "description": data.get("description", ""),
                "expense_date": expense_date,
            }
        )
        .execute()
    )
    logger.info(
        "Saved expense  user=%s  amount=%.2f  category=%s  date=%s",
        user_id,
        data["amount"],
        data["category"],
        expense_date,
    )


async def get_user_expenses(user_id: int, limit: int = 10) -> list[dict]:
    """Return the most recent *limit* expenses for a user."""
    client = await _get_client()
    response = (
        await client.table("expenses")
        .select("*")
        .eq("user_id", user_id)
        .order("expense_date", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


async def get_expense_summary(user_id: int) -> dict:
    """Total spent and per-category breakdown (all time)."""
    rows = await get_user_expenses(user_id, limit=1000)
    if not rows:
        return {"total": 0.0, "by_category": {}}

    total = sum(r["amount"] for r in rows)
    by_category: dict[str, float] = {}
    for r in rows:
        by_category[r["category"]] = by_category.get(r["category"], 0.0) + r["amount"]

    by_category = dict(sorted(by_category.items(), key=lambda x: x[1], reverse=True))
    return {"total": total, "by_category": by_category}


async def get_monthly_total(user_id: int, year: int, month: int) -> float:
    """Sum of expenses for a given calendar month."""
    start = f"{year}-{month:02d}-01"
    end = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"

    client = await _get_client()
    response = (
        await client.table("expenses")
        .select("amount")
        .eq("user_id", user_id)
        .gte("expense_date", start)
        .lt("expense_date", end)
        .execute()
    )
    return sum(r["amount"] for r in (response.data or []))
