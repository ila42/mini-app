"""
finance_bot.py — aiogram 3.x Telegram bot.

Handlers:
  /start   — welcome
  /history — last 10 expenses
  /summary — all-time category breakdown
  /stats   — current-month total

  voice  → Whisper → GPT-4o-mini → Supabase
  text   → GPT-4o-mini → Supabase
  photo  → GPT-4o-mini Vision → Supabase
  ogo
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.exceptions import TelegramBadRequest
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

bot = Bot(token=os.environ["BOT_TOKEN"])
dp = Dispatcher()


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

async def _safe_edit(msg: Message, text: str) -> None:
    """Edit a message, silently ignoring 'message not found' errors."""
    try:
        await msg.edit_text(text)
    except TelegramBadRequest as e:
        logger.warning("Could not edit message: %s", e)


def _format_confirmation(data: ExpenseData) -> str:
    desc = data.description or "—"
    return (
        f"✅ Записал в категорию «{data.category}»: {data.amount:.0f}₽\n\n"
        f"Описание: {desc}\n"
        f"Дата:     {data.date}"
    )


async def _process_and_reply(status_msg: Message, data: ExpenseData, user_id: int) -> None:
    """Save expense to Supabase and edit the status message with the result."""
    await db.save_expense(user_id, data.model_dump())
    await _safe_edit(status_msg, _format_confirmation(data))


# ─────────────────────────────────────────────
#  /start
# ─────────────────────────────────────────────

@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! Я твой финансовый ассистент.\n\n"
        "Отправь мне:\n"
        "  • Голосовое — «Купил продукты на 1500»\n"
        "  • Текст — «Такси 350 вчера»\n"
        "  • Фото чека\n\n"
        "Категории: Еда, Транспорт, Покупки, Здоровье, Подписки, Саша, Перевод другим, Другое.\n\n"
        "Команды:\n"
        "  /history — последние 10 трат\n"
        "  /summary — сводка по категориям\n"
        "  /stats   — итог за март 2026"
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
    total = await db.get_monthly_total(message.from_user.id, year=2026, month=3)
    if total == 0:
        await message.answer("В марте 2026 трат пока нет.")
    else:
        await message.answer(f"📊 Март 2026:\n\nИтого потрачено: {total:.0f}₽")


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
        await _process_and_reply(status, data, message.from_user.id)
    except Exception as exc:
        logger.exception("Voice processing failed")
        await _safe_edit(status, f"❌ Не удалось обработать голосовое: {exc}")


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
        await _process_and_reply(status, data, message.from_user.id)
    except Exception as exc:
        logger.exception("Text processing failed")
        await _safe_edit(status, f"❌ Не удалось разобрать сообщение: {exc}")


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
        await _process_and_reply(status, data, message.from_user.id)
    except Exception as exc:
        logger.exception("Photo processing failed")
        await _safe_edit(status, f"❌ Не удалось обработать фото: {exc}")


# ─────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────

async def main() -> None:
    logger.info("Starting finance bot polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
