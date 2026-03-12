"""
ai_logic.py — AI processing layer.

Responsibilities:
  - Voice: .ogg → .mp3 (pydub/ffmpeg) → Whisper transcription
  - Text / transcribed voice: GPT-4o-mini structured extraction
  - Photo (receipt): GPT-4o-mini Vision extraction
  - Pydantic validation of the extracted payload
"""

import json
import logging
import os
import re
import tempfile

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

load_dotenv()

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Categories must match the Mini App UI exactly.
KNOWN_CATEGORIES = [
    "Еда",
    "Транспорт",
    "Покупки",
    "Здоровье",
    "Подписки",
    "Саша",
    "Перевод другим",
    "Другое",
]


def _build_system_prompt() -> str:
    """Build system prompt with the current date so relative dates resolve correctly."""
    from datetime import date, timedelta
    today = date.today()
    yesterday = today - timedelta(days=1)
    return (
        f"Today is {today.strftime('%A, %B {d}, %Y').format(d=today.day)}. "
        f"If the user mentions 'yesterday', use {yesterday.isoformat()}. "
        f"If the user mentions 'today', use {today.isoformat()}. "
        f"Если пользователь говорит «вчера» — используй дату {yesterday.isoformat()}. "
        f"Если пользователь говорит «сегодня» — используй дату {today.isoformat()}. "
        "Дата ВСЕГДА в формате YYYY-MM-DD. "
        "Ты — финансовый парсер. Верни ТОЛЬКО валидный JSON без пояснений и markdown:\n"
        '{"amount": float, "category": string, "description": string, "date": string}\n'
        "Поле description — краткое название товара, услуги или магазина (одна строка).\n"
        f"Выбирай category ТОЛЬКО из этого списка: {', '.join(KNOWN_CATEGORIES)}.\n"
        "Если покупка не подходит ни к одной категории — используй «Другое».\n"
        f"Если дата не указана — используй {today.isoformat()}.\n"
        "Ответ — валидный JSON и ничем больше."
    )


# ─────────────────────────────────────────────
#  Pydantic Schema
# ─────────────────────────────────────────────

class ExpenseData(BaseModel):
    amount: float = Field(..., gt=0, description="Total expense amount")
    category: str = Field(..., min_length=1)
    description: str = Field(default="")
    date: str = Field(default_factory=lambda: __import__('datetime').date.today().isoformat())

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not v or not v.strip():
            return __import__('datetime').date.today().isoformat()
        clean = v.strip()
        if len(clean) > 10:
            clean = clean[:10]
        return clean

    @field_validator("category")
    @classmethod
    def normalise_category(cls, v: str) -> str:
        v = v.strip()
        if not v:
            return "Другое"
        # Case-insensitive match to keep casing consistent with Mini App.
        for known in KNOWN_CATEGORIES:
            if v.lower() == known.lower():
                return known
        logger.warning("Unknown category '%s', falling back to 'Другое'", v)
        return "Другое"

    @field_validator("description", mode="before")
    @classmethod
    def coerce_description(cls, v) -> str:
        """Accept list or string from the model response."""
        if isinstance(v, list):
            return ", ".join(str(i) for i in v if i)
        return str(v) if v else ""


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Pull the first JSON object out of the model's raw reply."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No valid JSON found in model response:\n{raw}")


async def _parse_with_gpt(user_text: str) -> ExpenseData:
    """Send plain text to GPT-4o-mini and parse the response."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            {"role": "user", "content": user_text},
        ],
        temperature=0,
        max_tokens=256,
    )
    raw = response.choices[0].message.content or ""
    logger.debug("GPT raw response: %s", raw)
    payload = _extract_json(raw)
    return ExpenseData(**payload)


# ─────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────

async def process_voice(ogg_bytes: bytes) -> ExpenseData:
    """
    1. Write .ogg bytes to a temp file.
    2. Send directly to Whisper (supports OGG natively — no pydub/ffmpeg needed).
    3. Extract structured data with GPT-4o-mini.
    """
    with tempfile.TemporaryDirectory() as tmp:
        ogg_path = os.path.join(tmp, "voice.ogg")

        with open(ogg_path, "wb") as f:
            f.write(ogg_bytes)

        with open(ogg_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="ru",
            )
        text = transcript.text
        logger.info("Whisper transcription: %s", text)

    return await _parse_with_gpt(text)


async def process_text(text: str) -> ExpenseData:
    """Extract financial data from plain user text."""
    logger.info("Processing text input: %.120s", text)
    return await _parse_with_gpt(text)


async def process_photo(image_bytes: bytes) -> ExpenseData:
    """
    Analyse a receipt photo using GPT-4o-mini Vision.
    Extracts total amount and store/item name from the receipt.
    """
    import base64

    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:image/jpeg;base64,{b64}"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url, "detail": "high"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Это фото чека или квитанции. "
                            "Найди итоговую сумму (ИТОГО или сумму к оплате) и название магазина или "
                            "основного товара. Верни JSON согласно инструкции в системном промпте."
                        ),
                    },
                ],
            },
        ],
        temperature=0,
        max_tokens=512,
    )
    raw = response.choices[0].message.content or ""
    logger.debug("Vision raw response: %s", raw)
    payload = _extract_json(raw)
    return ExpenseData(**payload)
