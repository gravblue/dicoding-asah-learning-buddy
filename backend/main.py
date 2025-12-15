from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Learning Buddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest):
    text = req.message.strip()
    reply = f"Kamu berkata: {text}. Aku akan bantu menyiapkan saran belajar."
    return {"reply": reply}

# Data endpoints (membaca .xlsx lokal)
from typing import Optional, List
from fastapi import Query
from .services.data_loader import load_excel_as_records
from .db import init_db, get_conn, execute, query
from .auth import create_user, find_user, verify_password, issue_token, get_email_from_token
from pathlib import Path


# Inisialisasi DB saat start
init_db()


@app.get("/data/lp_course_mapping")
def lp_course_mapping(sheet: Optional[str] = Query(default=None)):
    filename = "LP and Course Mapping.xlsx"
    return {"filename": filename, "sheet": sheet, "rows": load_excel_as_records(filename, sheet)}


@app.get("/data/resource_data")
def resource_data(sheet: Optional[str] = Query(default=None)):
    filename = "Resource Data Learning Buddy.xlsx"
    return {"filename": filename, "sheet": sheet, "rows": load_excel_as_records(filename, sheet)}

# Jalankan: uvicorn backend.main:app --reload --port 8000

# Mount routers
from .routes.recommend import router as recommend_router
from .routes.assessment import router as assessment_router
from .routes.ml_advanced import router as ml_router
from .routes.progress import router as progress_router, build_progress_text
# from .routes.ml_advanced import router as ml_advanced_router  
from .ml.simple_nlp import recommend_by_query
from .llm.gemini_client import generate_message
from .auth import user_from_auth

app.include_router(recommend_router)
app.include_router(assessment_router)
app.include_router(ml_router)
app.include_router(progress_router)
# app.include_router(ml_advanced_router)  


#  Auth endpoints 
class RegisterReq(BaseModel):
    name: str
    email: str
    password: str


class LoginReq(BaseModel):
    email: str
    password: str


@app.post("/auth/register")
def register(req: RegisterReq):
    if find_user(req.email):
        raise HTTPException(400, "Email sudah terdaftar")
    create_user(req.name, req.email, req.password)
    token = issue_token(req.email)
    return {"token": token, "email": req.email, "name": req.name}


@app.post("/auth/login")
def login(req: LoginReq):
    user = find_user(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Email atau password salah")
    token = issue_token(req.email)
    return {"token": token, "email": req.email, "name": user["name"]}


def user_from_auth(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Token tidak ditemukan")
    token = authorization.split(" ", 1)[1]
    email = get_email_from_token(token)
    if not email:
        raise HTTPException(401, "Token tidak valid")
    return email


# Onboarding 
class OnboardingReq(BaseModel):
    role: Optional[str] = None
    experience: Optional[str] = None
    goal: Optional[str] = None


@app.post("/onboarding")
def save_onboarding(req: OnboardingReq, email: str = Depends(user_from_auth)):
    conn = get_conn()
    execute(
        conn,
        "INSERT INTO onboarding(email,role,experience,goal) VALUES(?,?,?,?)",
        (email, req.role, req.experience, req.goal),
    )
    conn.close()
    return {"status": "ok"}


@app.get("/onboarding/last")
def get_onboarding_latest(email: str = Depends(user_from_auth)):
    info = get_latest_onboarding(email)
    if not info:
        raise HTTPException(404, "Belum ada data onboarding")
    return info


# -Conversations 
class NewConvReq(BaseModel):
    title: Optional[str] = None


@app.post("/conversations")
def create_conversation(req: NewConvReq, email: str = Depends(user_from_auth)):
    conn = get_conn()
    title = req.title or "Obrolan baru"
    cid = execute(conn, "INSERT INTO conversations(user_email,title) VALUES(?,?)", (email, title))
    conn.close()
    return {"id": cid, "title": title}


@app.delete("/conversations/{cid}")
def delete_conversation(cid: int, email: str = Depends(user_from_auth)):
    conn = get_conn()
    rows = query(conn, "SELECT user_email FROM conversations WHERE id=?", (cid,))
    if not rows or rows[0]["user_email"] != email:
        conn.close()
        raise HTTPException(404, "Percakapan tidak ditemukan")
    execute(conn, "DELETE FROM messages WHERE conversation_id=?", (cid,))
    execute(conn, "DELETE FROM conversations WHERE id=?", (cid,))
    conn.close()
    return {"status": "deleted"}


@app.get("/conversations")
def list_conversations(email: str = Depends(user_from_auth)):
    conn = get_conn()
    rows = query(conn, "SELECT id,title,created_at FROM conversations WHERE user_email=? ORDER BY id DESC", (email,))
    conn.close()
    return [dict(r) for r in rows]


@app.get("/conversations/{cid}/messages")
def get_messages(cid: int, email: str = Depends(user_from_auth)):
    conn = get_conn()
    # verifikasi kepemilikan
    rows = query(conn, "SELECT user_email FROM conversations WHERE id=?", (cid,))
    if not rows or rows[0]["user_email"] != email:
        conn.close()
        raise HTTPException(404, "Percakapan tidak ditemukan")
    msgs = query(conn, "SELECT role,text,created_at FROM messages WHERE conversation_id=? ORDER BY id ASC", (cid,))
    conn.close()
    return [dict(m) for m in msgs]


class NewMessageReq(BaseModel):
    text: str


async def bot_reply(text: str, email: str) -> str:
    """Semua dialog diarahkan ke Gemini dengan konteks profil & progres."""
    info = get_latest_onboarding(email) or {}
    persona = f"Role: {info.get('role') or '-'}, Level: {info.get('experience') or '-'}, Goal: {info.get('goal') or '-'}"
    progress_summary = build_progress_text(email)
    prompt_intro = (
        "Kamu adalah Learning Buddy, asisten belajar Dicoding. "
        "Jawablah singkat (maks 3 paragraf), beri langkah praktis & rekomendasi kursus relevan. "
        "Jika data terbatas, jelaskan apa yang perlu pengguna lengkapi."
    )
    prompt = [
        prompt_intro,
        f"Persona pengguna: {persona}",
        f"Ringkasan progres: {progress_summary}",
        f"Pertanyaan terbaru: {text}",
    ]
    try:
        return generate_message(prompt)
    except Exception:
        # Fallback manual jika GEMINI_API_KEY belum di-set/ada gangguan koneksi.
        items = recommend_by_query(text, limit=3)
        if items:
            rows = []
            for item in items:
                name = item.get("name") or item.get("title") or item.get("course_name") or "Kursus Dicoding"
                level = item.get("level") or item.get("course_level") or item.get("category") or ""
                rows.append(f"- {name}{f' ({level})' if level else ''}")
            return (
                "Mode Gemini belum aktif, berikut opsi yang tetap bisa kamu eksplor:\n"
                + "\n".join(rows)
                + "\nKlik Mulai di Dashboard untuk menyimpan progresnya."
            )
        return "Server AI belum siap. Set GEMINI_API_KEY dan jalankan ulang backend untuk jawaban optimal."


@app.post("/conversations/{cid}/messages")
async def post_message(cid: int, req: NewMessageReq, email: str = Depends(user_from_auth)):
    conn = get_conn()
    # verifikasi
    rows = query(conn, "SELECT user_email FROM conversations WHERE id=?", (cid,))
    if not rows or rows[0]["user_email"] != email:
        conn.close()
        raise HTTPException(404, "Percakapan tidak ditemukan")

    execute(conn, "INSERT INTO messages(conversation_id,role,text) VALUES(?,?,?)", (cid, "user", req.text))
    # update judul percakapan jika masih default
    conv_rows = query(conn, "SELECT title FROM conversations WHERE id=?", (cid,))
    if conv_rows:
        current_title = conv_rows[0]["title"] or ""
        snippet = req.text.strip()[:40]
        if current_title.lower().startswith("obrolan baru") and snippet:
            execute(conn, "UPDATE conversations SET title=? WHERE id=?", (snippet, cid))
    reply = await bot_reply(req.text, email)
    execute(conn, "INSERT INTO messages(conversation_id,role,text) VALUES(?,?,?)", (cid, "bot", reply))
    conn.close()
    return {"reply": reply}


def get_latest_onboarding(email: str):
    conn = get_conn()
    rows = query(
        conn,
        "SELECT role, experience, goal FROM onboarding WHERE email=? ORDER BY id DESC LIMIT 1",
        (email,),
    )
    conn.close()
    if rows:
        return dict(rows[0])
    return None