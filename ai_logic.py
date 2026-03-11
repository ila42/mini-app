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
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

load_dotenv()

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

VALID_CATEGORIES = ["Продукты", "Транспорт", "Жилье", "Развлечения", "Другое"]

SYSTEM_PROMPT = (
    'Ты — финансовый парсер. Верни ТОЛЬКО JSON без каких-либо пояснений: '
    '{"amount": float, "category": string, "items": list, "date": string}. '
    f'Категории (выбери одну из списка): {VALID_CATEGORIES}. '
    'Если дата не указана — используй текущую дату в формате YYYY-MM-DD. '
    'items — список купленных товаров/позиций. '
    'Ответ должен быть валидным JSON и ничем больше.'
)


# ─────────────────────────────────────────────
#  Pydantic Schema
# ─────────────────────────────────────────────

class ExpenseData(BaseModel):
    amount: float = Field(..., gt=0, description="Total expense amount")
    category: str
    items: list[str] = Field(default_factory=list)
    date: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d"))

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            logger.warning("Unknown category '%s', falling back to 'Другое'", v)
            return "Другое"
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        # Accept any non-empty string; normalise common formats.
        if not v or not v.strip():
            return datetime.utcnow().strftime("%Y-%m-%d")
        return v.strip()

    @field_validator("items", mode="before")
    @classmethod
    def coerce_items(cls, v) -> list[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return [str(i) for i in v]
        return []


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """Pull the first JSON object out of the model's raw reply."""
    # Try direct parse first.
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Fall back to regex extraction.
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No valid JSON found in model response:\n{raw}")


async def _parse_with_gpt(user_text: str) -> ExpenseData:
    """Send plain text to GPT-4o-mini and parse the response."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
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
    2. Convert to .mp3 with pydub (requires ffmpeg in PATH).
    3. Transcribe with Whisper.
    4. Extract structured data with GPT-4o-mini.
    """
    import pydub  # imported here so the rest of the module works without it

    with tempfile.TemporaryDirectory() as tmp:
        ogg_path = os.path.join(tmp, "voice.ogg")
        mp3_path = os.path.join(tmp, "voice.mp3")

        with open(ogg_path, "wb") as f:
            f.write(ogg_bytes)

        # Convert OGG → MP3
        audio = pydub.AudioSegment.from_ogg(ogg_path)
        audio.export(mp3_path, format="mp3")
        logger.info("Voice converted: ogg→mp3 (%d bytes)", len(ogg_bytes))

        # Transcribe
        with open(mp3_path, "rb") as audio_file:
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
    The image is sent as a base64-encoded data URL.
    """
    import base64

    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:image/jpeg;base64,{b64}"

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
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
                            "Извлеки финансовые данные и верни JSON согласно инструкции."
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
