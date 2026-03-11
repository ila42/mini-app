"""
finance_bot.py — aiogram 3.x entry point for the AI-analyst bot.

Handlers:
  /start            — welcome + upsert user
  /history          — last 10 expenses
  /summary          — totals by category
  message.voice     — voice message processing
  message.text      — plain text expense entry
  message.photo     — receipt photo processing

Run:
    BOT_TOKEN=... OPENAI_API_KEY=... py finance_bot.py
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
    items_line = ", ".join(data.items) if data.items else "—"
    return (
        "Трата сохранена!\n\n"
        f"Сумма:     {data.amount:.2f} руб.\n"
        f"Категория: {data.category}\n"
        f"Позиции:   {items_line}\n"
        f"Дата:      {data.date}"
    )


async def _save_and_confirm(message: Message, data: ExpenseData) -> None:
    """Persist validated expense and reply with confirmation."""
    user_id = message.from_user.id
    await db.upsert_user(user_id, message.from_user.username)
    await db.add_expense(user_id, data.model_dump())
    await message.answer(_format_confirmation(data))


# ─────────────────────────────────────────────
#  /start
# ─────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await db.upsert_user(message.from_user.id, message.from_user.username)
    await message.answer(
        "Привет! Я твой финансовый ассистент.\n\n"
        "Отправь мне:\n"
        "  • Голосовое сообщение с описанием траты\n"
        "  • Текст: «Купил продукты на 1500 рублей»\n"
        "  • Фото чека или квитанции\n\n"
        "Команды:\n"
        "  /history — последние 10 трат\n"
        "  /summary — сводка по категориям"
    )


# ─────────────────────────────────────────────
#  /history
# ─────────────────────────────────────────────

@dp.message(Command("history"))
async def cmd_history(message: Message) -> None:
    rows = await db.get_user_expenses(message.from_user.id)
    if not rows:
        await message.answer("У тебя пока нет записей о тратах.")
        return

    lines = ["Последние траты:\n"]
    for r in rows[:10]:
        lines.append(
            f"{r['date']}  |  {r['amount']:.2f} руб.  |  {r['category']}\n"
            f"  {r['items']}"
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

    lines = [f"Всего потрачено: {summary['total']:.2f} руб.\n\nПо категориям:"]
    for cat, amount in summary["by_category"].items():
        pct = amount / summary["total"] * 100
        lines.append(f"  {cat}: {amount:.2f} руб. ({pct:.1f}%)")

    await message.answer("\n".join(lines))


# ─────────────────────────────────────────────
#  Voice handler
# ─────────────────────────────────────────────

@dp.message(F.voice)
async def handle_voice(message: Message) -> None:
    status = await message.answer("Обрабатываю голосовое сообщение...")
    try:
        file = await bot.get_file(message.voice.file_id)
        ogg_bytes = await bot.download_file(file.file_path)
        data = await ai.process_voice(ogg_bytes.read())
        await status.delete()
        await _save_and_confirm(message, data)
    except Exception as exc:
        logger.exception("Voice processing failed")
        await status.edit_text(f"Не удалось обработать голосовое сообщение: {exc}")


# ─────────────────────────────────────────────
#  Text handler
# ─────────────────────────────────────────────

@dp.message(F.text)
async def handle_text(message: Message) -> None:
    text = message.text or ""
    if text.startswith("/"):  # skip commands
        return

    status = await message.answer("Анализирую текст...")
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
    status = await message.answer("Анализирую фото чека...")
    try:
        # Use the highest-resolution version of the photo.
        photo = message.photo[-1]
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
    await db.init_db()
    logger.info("Starting finance bot polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
