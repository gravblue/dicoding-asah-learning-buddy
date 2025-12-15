from __future__ import annotations

import os
import httpx
from typing import List


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def _make_payload(parts: List[str]):
    return {
        "contents": [
            {
                "parts": [{"text": text} for text in parts if text],
            }
        ]
    }


def generate_message(parts: List[str]) -> str:
    if not GEMINI_API_KEY:
        return "(Mode offline) Tetap semangat! Susun target kecil mingguan dan lanjutkan progresmu."

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                f"{API_URL}?key={GEMINI_API_KEY}",
                json=_make_payload(parts),
            )
            resp.raise_for_status()
            data = resp.json()
        candidates = data.get("candidates") or []
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "Terima kasih, tetap semangat!")
    except Exception as exc:  
        return f"(Layanan motivasi tidak tersedia) {exc}. Tetap semangat dan lanjutkan belajar dengan langkah kecil."

    return "(Layanan motivasi tidak tersedia) Tetap semangat dan lanjutkan belajar dengan langkah kecil."
