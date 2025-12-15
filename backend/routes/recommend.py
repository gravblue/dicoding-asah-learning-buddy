from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional

from ..utils import supabase_client as sb
from ..auth import get_email_from_token
from ..db import get_conn, query
from ..services.data_loader import load_excel_as_records


def _contains(value: str, keyword: str) -> bool:
    if not value or not keyword:
        return False
    return keyword.lower() in str(value).lower()


def _match_level(course: dict, level: Optional[str]) -> bool:
    if not level:
        return True
    for field in ("level", "course_level", "course_level_name"):
        if _contains(course.get(field), level):
            return True
    return False


def _fetch_courses(limit: int = 300):
    try:
        return sb.get_courses({"select": "*", "limit": limit})
    except Exception:
        return []


def _filter_courses(courses, lp_hint=None, level=None, keywords=None):
    filtered = []
    keywords = keywords or []
    for course in courses:
        if lp_hint and not any(_contains(course.get(field), lp_hint) for field in ("learning_path", "learning_path_name", "lp_name", "track")):
            continue
        if not _match_level(course, level):
            continue
        if keywords:
            if not any(_contains(course.get(field), kw) for kw in keywords for field in ("name", "title", "course_name", "description")):
                continue
        filtered.append(course)
    return filtered


router = APIRouter(prefix="/recommend", tags=["recommend"])


def _auth_email(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    return get_email_from_token(token)


@router.get("/learning_paths")
def learning_paths():
    try:
        return sb.get_learning_paths({"select": "*", "limit": 100})
    except Exception as e:
        raise HTTPException(502, f"Gagal mengambil learning paths: {e}")


@router.get("/courses")
def courses(lp: Optional[str] = Query(default=None), q: Optional[str] = Query(default=None), level: Optional[str] = Query(default=None)):
    courses = _fetch_courses()
    keywords = [q] if q else []
    filtered = _filter_courses(courses, lp_hint=lp, level=level, keywords=keywords)
    return filtered[:100]


@router.get("/course_levels")
def course_levels():
    try:
        return sb.get_course_levels({"select": "*"})
    except Exception as e:
        raise HTTPException(502, f"Gagal mengambil course levels: {e}")


@router.get("/tutorials")
def tutorials():
    try:
        return sb.get_tutorials({"select": "*", "limit": 100})
    except Exception as e:
        raise HTTPException(502, f"Gagal mengambil tutorials: {e}")


@router.get("/by_onboarding")
def by_onboarding(authorization: Optional[str] = Header(None)):
    email = _auth_email(authorization)
    role = None
    experience = None
    if email:
        conn = get_conn()
        rows = query(conn, "SELECT role,experience FROM onboarding WHERE email=? ORDER BY id DESC LIMIT 1", (email,))
        conn.close()
        if rows:
            role = rows[0]["role"]
            experience = rows[0]["experience"]

    lp_hint = None
    if role:
        r = role.lower()
        if "front" in r:
            lp_hint = "Frontend"
        elif "back" in r:
            lp_hint = "Backend"
        elif "machine" in r or "ml" in r:
            lp_hint = "Machine Learning"
        elif "data" in r:
            lp_hint = "Data"

    courses = _fetch_courses()
    filtered = _filter_courses(courses, lp_hint=lp_hint, level=experience)
    if not filtered:
        try:
            rows = load_excel_as_records("LP and Course Mapping.xlsx")
            filtered = [r for r in rows if not lp_hint or _contains(r.get("learning_path"), lp_hint)]
        except Exception:
            filtered = []
    return {"role": role, "experience": experience, "courses": filtered[:10]}


@router.get("/roadmap")
def roadmap(authorization: Optional[str] = Header(None)):
    """Bangun roadmap dari skor sub-skill terakhir user.
    Heuristik: ambil 5 sub-skill dengan skor terendah → rekomendasikan kursus yang cocok.
    """
    email = _auth_email(authorization)
    if not email:
        raise HTTPException(401, "Butuh token autentikasi")

    conn = get_conn()
    scores = query(
        conn,
        "SELECT role, subskill, score, level FROM subskill_scores WHERE email=? ORDER BY id DESC LIMIT 200",
        (email,),
    )
    conn.close()
    items = [dict(r) for r in scores]
    if not items:
        raise HTTPException(404, "Belum ada asesmen sub-skill")

    # Ambil 5 terendah
    items.sort(key=lambda x: x.get("score", 0))
    targets = items[:5]

    recs = []
    all_courses = _fetch_courses()
    if all_courses:
        for it in targets:
            sub = it["subskill"]
            level = it["level"]
            matches = _filter_courses(all_courses, keywords=[sub], level=level)
            if not matches:
                matches = _filter_courses(all_courses, keywords=[sub])
            recs.append({"subskill": sub, "level": level, "courses": matches[:5]})
        if any(block["courses"] for block in recs):
            return {"targets": targets, "recommendations": recs}

    # Fallback: coba mapping dari Excel lokal
    try:
        rows = load_excel_as_records("LP and Course Mapping.xlsx")
        for it in targets:
            sub = it["subskill"].lower()
            matched = [r for r in rows if any(sub in str(v).lower() for v in r.values())]
            recs.append({"subskill": it["subskill"], "level": it["level"], "courses": matched[:5]})
        return {"targets": targets, "recommendations": recs, "source": "excel"}
    except Exception as e:
        raise HTTPException(502, f"Tidak bisa membangun roadmap: {e}")
