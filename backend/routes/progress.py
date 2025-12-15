from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from ..auth import user_from_auth
from ..db import get_conn, execute, query


router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressReq(BaseModel):
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    subskill: Optional[str] = None
    action: str  
    minutes: Optional[int] = 0


def _map_action_to_status(action: str) -> str:
    a = (action or "").lower()
    if a in ("plan", "planned"):
        return "planned"
    if a in ("start", "in_progress"):
        return "in_progress"
    if a in ("complete", "done", "finish"):
        return "done"
    raise HTTPException(400, "action tidak dikenal (plan|start|complete)")


@router.post("")
def upsert_progress(req: ProgressReq, email: str = Depends(user_from_auth)):
    status = _map_action_to_status(req.action)
    minutes = int(req.minutes or 0)
    course_id = req.course_id or f"manual::{(req.course_name or '').strip() or 'course'}"
    conn = get_conn()
    # jika baris progress sudah ada untuk (email,course_id) → update, else insert
    rows = query(conn, "SELECT id, minutes FROM progress WHERE email=? AND course_id=?", (email, course_id))
    if rows:
        pid = rows[0]["id"]
        total_minutes = (rows[0]["minutes"] or 0) + minutes
        execute(conn, "UPDATE progress SET status=?, minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (status, total_minutes, pid))
    else:
        execute(
            conn,
            "INSERT INTO progress(email,course_id,course_name,subskill,status,minutes) VALUES(?,?,?,?,?,?)",
            (email, course_id, req.course_name, req.subskill, status, minutes),
        )
    conn.close()
    return {"status": "ok"}


@router.get("/by_course")
def by_course(email: str = Depends(user_from_auth)):
    conn = get_conn()
    rows = query(conn, "SELECT course_id, course_name, subskill, status, minutes, updated_at FROM progress WHERE email=? ORDER BY updated_at DESC", (email,))
    conn.close()
    return [dict(r) for r in rows]


def _summary_rows(email: str, days: int):
    conn = get_conn()
    rows = query(
        conn,
        """
        SELECT subskill, status, COUNT(*) AS cnt, SUM(minutes) AS mins
        FROM progress
        WHERE email=? AND updated_at >= datetime('now', ?)
        GROUP BY subskill, status
        ORDER BY subskill
        """,
        (email, f'-{int(days)} days'),
    )
    conn.close()
    return rows


@router.get("/summary")
def summary(days: int = Query(default=7, ge=1, le=90), email: str = Depends(user_from_auth)):
    return [dict(r) for r in _summary_rows(email, days)]


def build_progress_text(email: str, days: int = 7) -> str:
    rows = [dict(r) for r in _summary_rows(email, days)]
    if not rows:
        return "Belum ada progres 7 hari terakhir. Klik Mulai/Selesai pada kursus untuk merekam aktivitasmu."

    agg = {}
    for r in rows:
        key = (r.get("subskill") or "Umum")
        entry = agg.setdefault(key, {"done": 0, "minutes": 0, "in_progress": 0})
        if (r.get("status") == "done"):
            entry["done"] += int(r.get("cnt") or 0)
        if (r.get("status") == "in_progress"):
            entry["in_progress"] += int(r.get("cnt") or 0)
        entry["minutes"] += int(r.get("mins") or 0)

    top = sorted(agg.items(), key=lambda x: (x[1]["done"], x[1]["minutes"]), reverse=True)
    lines = []
    for name, stats in top[:3]:
        lines.append(f"{name}: {stats['done']} selesai, {stats['in_progress']} in-progress, {stats['minutes']} menit belajar")

    return "Ringkasan progres {} hari terakhir: ".format(days) + "; ".join(lines)
