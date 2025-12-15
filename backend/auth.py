from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional
from passlib.context import CryptContext
from fastapi import Header, HTTPException

from .db import get_conn, query, execute


# Gunakan pbkdf2_sha256 (pure-Python, tanpa ketergantungan C seperti bcrypt)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_user(name: str, email: str, password: str) -> None:
    conn = get_conn()
    execute(
        conn,
        "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)",
        (name, email, hash_password(password)),
    )
    conn.close()


def find_user(email: str):
    conn = get_conn()
    rows = query(conn, "SELECT * FROM users WHERE email=?", (email,))
    conn.close()
    return rows[0] if rows else None


def issue_token(email: str) -> str:
    token = uuid.uuid4().hex
    conn = get_conn()
    execute(conn, "INSERT INTO tokens(token,email) VALUES(?,?)", (token, email))
    conn.close()
    return token


def get_email_from_token(token: str) -> Optional[str]:
    conn = get_conn()
    rows = query(conn, "SELECT email FROM tokens WHERE token=?", (token,))
    conn.close()
    return rows[0]["email"] if rows else None


def user_from_auth(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Token tidak ditemukan")
    token = authorization.split(" ", 1)[1]
    email = get_email_from_token(token)
    if not email:
        raise HTTPException(401, "Token tidak valid")
    return email
