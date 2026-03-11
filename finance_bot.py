"""
finance_bot.py — aiogram 3.x entry point for the AI-analyst bot.

Handlers:
  /start            — welcome message
  /history          — last 10 expenses
  /summary          — all-time totals by category
  /stats            — current-month spending total
  message.voice     — voice message → Whisper → GPT → Supabase
  message.text      — plain text → GPT → Supabase
  message.photo     — receipt photo → GPT Vision → Supabase

Run:
    BOT_TOKEN=... OPENAI_API_KEY=... SUPABASE_URL=... SUPABASE_KEY=... py finance_bot.py
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

import database as db
import ai_logic as ai
from ai_logic import ExpenseData

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
load_dotenv()

logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ["BOT_TOKEN"]

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _format_confirmation(data: ExpenseData) -> str:
    desc = data.description or "—"
    return (
        f"✅ Записал {data.amount:.0f}₽ в категорию «{data.category}»\n\n"
        f"Описание: {desc}\n"
        f"Дата:     {data.date}"
    )


async def _save_and_confirm(message: Message, data: ExpenseData) -> None:
    user_id = message.from_user.id
    await db.save_expense(user_id, data.model_dump())
    await message.answer(_format_confirmation(data))


# ─────────────────────────────────────────────
#  /start
# ─────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! Я твой финансовый ассистент.\n\n"
        "Отправь мне:\n"
        "  • Голосовое сообщение — «Купил продукты на 1500»\n"
        "  • Текст — «Такси 350 рублей вчера»\n"
        "  • Фото чека\n\n"
        "Категории: Еда, Транспорт, Покупки, Здоровье, Подписки, Саша, Перевод другим.\n\n"
        "Команды:\n"
        "  /history — последние 10 трат\n"
        "  /summary — сводка по категориям\n"
        "  /stats   — итог за текущий месяц"
    )


# ─────────────────────────────────────────────
#  /history
# ─────────────────────────────────────────────

@dp.message(Command("history"))
async def cmd_history(message: Message) -> None:
    rows = await db.get_user_expenses(message.from_user.id, limit=10)
    if not rows:
        await message.answer("У тебя пока нет записей о тратах.")
        return

    lines = ["Последние 10 трат:\n"]
    for r in rows:
        desc = r.get("description") or "—"
        lines.append(
            f"{r['expense_date']}  {r['amount']:.0f}₽  [{r['category']}]\n"
            f"  {desc}"
        )
    await message.answer("\n\n".join(lines))


# ─────────────────────────────────────────────
#  /summary
# ─────────────────────────────────────────────

@dp.message(Command("summary"))
async def cmd_summary(message: Message) -> None:
    summary = await db.get_expense_summary(message.from_user.id)
    if summary["total"] == 0:
        await message.answer("Данных пока нет.")
        return

    lines = [f"Всего потрачено: {summary['total']:.0f}₽\n\nПо категориям:"]
    for cat, amount in summary["by_category"].items():
        pct = amount / summary["total"] * 100
        lines.append(f"  {cat}: {amount:.0f}₽ ({pct:.1f}%)")

    await message.answer("\n".join(lines))


# ─────────────────────────────────────────────
#  /stats — current month
# ─────────────────────────────────────────────

@dp.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    year, month = 2026, 3
    total = await db.get_monthly_total(message.from_user.id, year, month)
    if total == 0:
        await message.answer("В марте 2026 трат пока нет.")
    else:
        await message.answer(
            f"📊 Март 2026:\n\nИтого потрачено: {total:.0f}₽"
        )


# ─────────────────────────────────────────────
#  Voice handler
# ─────────────────────────────────────────────

@dp.message(F.voice)
async def handle_voice(message: Message) -> None:
    status = await message.answer("🎤 Обрабатываю голосовое сообщение...")
    try:
        file = await bot.get_file(message.voice.file_id)
        ogg_bytes = await bot.download_file(file.file_path)
        data = await ai.process_voice(ogg_bytes.read())
        await status.delete()
        await _save_and_confirm(message, data)
    except Exception as exc:
        logger.exception("Voice processing failed")
        await status.edit_text(f"Не удалось обработать голосовое: {exc}")


# ─────────────────────────────────────────────
#  Text handler
# ─────────────────────────────────────────────

@dp.message(F.text)
async def handle_text(message: Message) -> None:
    text = message.text or ""
    if text.startswith("/"):
        return

    status = await message.answer("💬 Анализирую...")
    try:
        data = await ai.process_text(text)
        await status.delete()
        await _save_and_confirm(message, data)
    except Exception as exc:
        logger.exception("Text processing failed")
        await status.edit_text(f"Не удалось разобрать сообщение: {exc}")


# ─────────────────────────────────────────────
#  Photo handler
# ─────────────────────────────────────────────

@dp.message(F.photo)
async def handle_photo(message: Message) -> None:
    status = await message.answer("🧾 Анализирую фото чека...")
    try:
        photo = message.photo[-1]  # highest resolution
        file = await bot.get_file(photo.file_id)
        img_bytes = await bot.download_file(file.file_path)
        data = await ai.process_photo(img_bytes.read())
        await status.delete()
        await _save_and_confirm(message, data)
    except Exception as exc:
        logger.exception("Photo processing failed")
        await status.edit_text(f"Не удалось обработать фото: {exc}")


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

async def main() -> None:
    logger.info("Starting finance bot polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
