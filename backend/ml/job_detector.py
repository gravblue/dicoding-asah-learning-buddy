# Job Role & Subskill Detection 

from __future__ import annotations

import os
import re
from typing import List, Union
from difflib import get_close_matches
import pandas as pd

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    httpx = None


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


# DETECT JOB ROLE
def detect_job_role(user_input: str, job_role: List[str]) -> str:
    """
    Deteksi job role 
    
    Args:
        user_input: Deskripsi user
        job_role: List job role dari dataset
    
    Returns:
        Nama job role yang terdeteksi
    """
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY tidak ditemukan!\n"
            "Buat file .env dan isi: GEMINI_API_KEY=your-key-here"
        )
    
    # PROMPT
    prompt = f"""
    Anda adalah asisten pintar yang bertugas untuk mengklasifikasikan deskripsi pengguna ke job role yang paling tepat.

    Petunjuk:
    1. Analisis deskripsi pengguna secara menyeluruh.
    2. Bandingkan dengan daftar job role berikut, pilih yang paling relevan.
    3. Hanya pilih **satu job role** yang paling cocok.
    4. Jawaban **hanya berupa nama job role**, tanpa penjelasan, tanda kutip, atau teks tambahan.
    5. Jika tidak yakin, pilih job role yang paling mendekati, jangan buat job role baru.

    Job role valid:
    {job_role}

    Deskripsi pengguna:
    "{user_input}"
    """
    
    # FIXED: Timeout diperpanjang dari 30 ke 90 detik
    with httpx.Client(timeout=90) as client:
        resp = client.post(
            f"{API_URL}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )
        resp.raise_for_status()
        data = resp.json()
    
    candidates = data.get("candidates", [])
    if not candidates:
        raise Exception("Gemini tidak return candidates!")
    
    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        raise Exception("Gemini tidak return parts!")
    
    result = parts[0].get("text", "").strip()
    
    # Clean
    result = result.replace('"', '').replace("'", "").strip()
    
    print(f"Job Role detected: {result}")
    return result


# DETECT SKILLS 
def detect_skills(
    user_input: str, 
    job_role: str, 
    skill_keywords: Union[pd.DataFrame, List[str]], 
    top_k: int = 6
) -> List[str]:
    """
    Deteksi skills 
    
    Args:
        user_input: Deskripsi user
        job_role: Job role yang terdeteksi
        skill_keywords: DataFrame atau List skill keywords
        top_k: Jumlah skill
    
    Returns:
        List skills yang terdeteksi
    """
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY tidak ditemukan!\n"
            "Buat file .env dan isi: GEMINI_API_KEY=your-key-here"
        )
    
    # Convert DataFrame to list if needed
    if isinstance(skill_keywords, pd.DataFrame):
        if 'keyword' in skill_keywords.columns:
            valid_keywords = skill_keywords['keyword'].dropna().tolist()
        else:
            valid_keywords = skill_keywords.iloc[:, 0].dropna().tolist()
    else:
        valid_keywords = skill_keywords
    
    print(f"Total valid keywords: {len(valid_keywords)}")
    
    # Batasi jumlah keywords yang dikirim ke Gemini
    sample_keywords = valid_keywords[:500] if len(valid_keywords) > 500 else valid_keywords
    
    prompt = f"""
    Anda adalah AI pakar dalam technical skill assessment untuk berbagai job role IT.

    ATURAN SUPER KETAT (WAJIB):
    1. HANYA ambil skill yang PERSIS ada di dataset berikut: {sample_keywords}. Tidak boleh sinonim, variasi ejaan, atau penambahan baru.
    2. Skill HARUS relevan langsung dengan job role dan TERBATAS pada:
    - Bahasa pemrograman
    - Framework
    - Library
    - Library/Framework cloud
    - Library/Framework yang relevan dengan AI/ML
    3. DILARANG KERAS:
    - Skill generik (contoh: problem solving, data analysis, OOP, SDLC, REST)
    - Teori, konsep, metodologi, arsitektur
    - Platform software/cloud (contoh: AWS, GCP, Azure, Firebase)
    - Tools non-teknis/desain
    - Version control dan CI/CD
    - Platform atau library yang tidak relevan dengan job role
    4. Jika job role adalah Gen AI Engineer, perlakukan SAMA PERSIS seperti AI Engineer.
    5. Pilih skill yang PALING SPESIFIK dan TEKNIS, hindari skill tingkat umum jika ada versi library/framework yang lebih konkret.
    6. Output HARUS TEPAT {top_k} skill. Tidak boleh lebih atau kurang.

    FORMAT OUTPUT:
    Satu baris saja, dipisahkan dengan koma, TANPA penjelasan, TANPA bullet, TANPA teks tambahan.
    
    Job Role: {job_role}
    User Input: {user_input}

    Output:
    """
    
    # FIXED: Timeout diperpanjang dari 30 ke 120 detik untuk skill detection
    with httpx.Client(timeout=120) as client:
        resp = client.post(
            f"{API_URL}?key={GEMINI_API_KEY}",
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )
        resp.raise_for_status()
        data = resp.json()
    
    candidates = data.get("candidates", [])
    if not candidates:
        raise Exception("Gemini tidak return candidates!")
    
    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        raise Exception("Gemini tidak return parts!")
    
    raw_text = parts[0].get("text", "")
    print(f"Gemini raw response: {raw_text}")
    
    raw_items = [s.strip() for s in raw_text.replace("\n", "").split(",") if s.strip()]
    
    # Ambil skill yang valid dari dataset saja (cari di SEMUA keywords, bukan hanya sample)
    filtered = []
    
    for item in raw_items:
        match = get_close_matches(item, valid_keywords, n=1, cutoff=0.6)
        if match and match[0] not in filtered:
            filtered.append(match[0])
    
    # Jika kurang dari top_k, isi dengan skill lain dari dataset
    if len(filtered) < top_k:
        remaining = [k for k in valid_keywords if k not in filtered]
        filtered.extend(remaining[:top_k - len(filtered)])
    
    result = filtered[:top_k]
    print(f"Skills detected: {result}")
    return result