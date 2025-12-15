from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List

from ..auth import user_from_auth
from ..db import get_conn, execute, query


router = APIRouter(prefix="/assessment", tags=["assessment"])


def to_level(score: int) -> str:
    if score is None:
        return "Beginner"
    if score <= 33:
        return "Beginner"
    if score <= 66:
        return "Intermediate"
    return "Advanced"


class SubSkill(BaseModel):
    subskill: str
    score: int = Field(ge=0, le=100)


class SubmitReq(BaseModel):
    role: str
    items: List[SubSkill]


@router.post("/submit")
def submit(req: SubmitReq, email: str = Depends(user_from_auth)):
    if not req.items:
        raise HTTPException(400, "items kosong")
    conn = get_conn()
    for it in req.items:
        level = to_level(it.score)
        execute(
            conn,
            "INSERT INTO subskill_scores(email,role,subskill,score,level) VALUES(?,?,?,?,?)",
            (email, req.role, it.subskill, int(it.score), level),
        )
    conn.close()
    return {"status": "ok", "count": len(req.items)}


@router.get("/last")
def last(email: str = Depends(user_from_auth)):
    conn = get_conn()
    rows = query(
        conn,
        """
        SELECT role, subskill, score, level, created_at
        FROM subskill_scores
        WHERE email=?
        ORDER BY id DESC
        LIMIT 200
        """,
        (email,),
    )
    conn.close()
    return [dict(r) for r in rows]

