from __future__ import annotations

import re
from typing import List, Dict, Any, Tuple

try:
    from rank_bm25 import BM25Okapi  # type: ignore
except Exception: 
    BM25Okapi = None  

try:
    from rapidfuzz import process, fuzz 
except Exception:  
    process = None
    fuzz = None

from ..utils import supabase_client as sb
from ..services.data_loader import load_excel_as_records


DEFAULT_SUBSKILLS = [
    "HTML/CSS", "JavaScript", "React", "State Management", "Testing",
    "API Design", "Database", "Authentication", "Caching",
    "Python", "Data Preprocessing", "Modeling", "Evaluation", "Deployment",
    "SQL", "Data Cleaning", "Visualization", "Statistics", "Storytelling"
]


_TOKEN_RE = re.compile(r"[a-zA-Z0-9_+#]+")


def tokenize(text: str) -> List[str]:
    if not text:
        return []
    return [t.lower() for t in _TOKEN_RE.findall(text.lower())]


def _load_courses_fallback() -> List[Dict[str, Any]]:
    # coba dari Resource Data
    try:
        rows = load_excel_as_records("Resource Data Learning Buddy.xlsx")
        if rows:
            return rows
    except Exception:
        pass
    # coba dari LP + Course Mapping
    try:
        rows = load_excel_as_records("LP and Course Mapping.xlsx")
        return rows
    except Exception:
        return []


def load_courses(limit: int = 500) -> List[Dict[str, Any]]:
    try:
        return sb.get_courses({"select": "*", "limit": limit})
    except Exception:
        return _load_courses_fallback()[:limit]


def extract_skills(text: str, candidates: List[str] | None = None, limit: int = 8) -> List[Tuple[str, float]]:
    """Ekstraksi skill berbasis fuzzy matching sederhana terhadap daftar kandidat.
    Mengembalikan (skill, skor 0..100).
    """
    cands = candidates or DEFAULT_SUBSKILLS
    if process and fuzz:  # gunakan rapidfuzz jika ada
        results = process.extract(text, cands, scorer=fuzz.token_set_ratio, limit=limit)
        return [(r[0], float(r[1])) for r in results if r[1] >= 60]
    # fallback: substring match kasar
    t = text.lower()
    out: List[Tuple[str, float]] = []
    for s in cands:
        out.append((s, 100.0 if s.lower() in t else 0.0))
    return [x for x in out if x[1] > 0]


def recommend_by_query(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Rekomendasi kursus berbasis kemiripan BM25 pada name/description."""
    rows = load_courses(limit=1000)
    corpus = []
    for r in rows:
        text = " ".join(str(r.get(k, "")) for k in ("name", "title", "course_name", "description"))
        corpus.append(tokenize(text))

    q_tokens = tokenize(query)
    if BM25Okapi and corpus and q_tokens:
        bm25 = BM25Okapi(corpus)
        scores = bm25.get_scores(q_tokens)
        ranked = sorted(zip(rows, scores), key=lambda x: x[1], reverse=True)
        return [r for r, s in ranked[:limit]]

    # fallback: frekuensi sederhana
    def score(doc: List[str]) -> int:
        return sum(doc.count(t) for t in set(q_tokens))

    ranked = sorted(zip(rows, [score(d) for d in corpus]), key=lambda x: x[1], reverse=True)
    return [r for r, s in ranked[:limit]]

