"""
Seeder untuk mengimpor data pengguna dan progres belajar dari file Excel
"Resource Data Learning Buddy.xlsx" sheet "Student Progress" ke SQLite lokal.

Semua email di sheet itu akan dibuat/diupdate dengan password default "admin".

Jalankan dari root repo:
    python -m backend.seed_from_excel
"""

from __future__ import annotations

import re
from typing import Dict, Tuple

from .auth import create_user, find_user, hash_password
from .db import get_conn, execute, query, init_db
from .services.data_loader import load_excel_as_records


DEFAULT_PASSWORD = "admin"
# Lokasi file Excel (saat ini berada di ml/data/)
EXCEL_FILE = "ml/data/Resource Data Learning Buddy.xlsx"
EXCEL_SHEET = "Student Progress"


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "course"


def derive_status(row: Dict) -> str:
    grad = int(row.get("is_graduated") or 0)
    cert = int(row.get("already_generated_certificate") or 0)
    completed = float(row.get("completed_tutorials") or 0)
    final_submission_id = row.get("final_submission_id")
    if grad > 0 or cert > 0:
        return "done"
    if completed > 0 or final_submission_id:
        return "in_progress"
    return "planned"


def derive_minutes(row: Dict) -> int:
    completed = float(row.get("completed_tutorials") or 0)
    active = float(row.get("active_tutorials") or 0)
    if completed > 0:
        return int(completed * 10)
    if active > 0:
        return int(active * 5)
    return 0


def upsert_progress(conn, email: str, course_name: str, status: str, minutes: int) -> None:
    course_id = f"excel::{slugify(course_name)}"
    rows = query(conn, "SELECT id FROM progress WHERE email=? AND course_id=?", (email, course_id))
    if rows:
        pid = rows[0]["id"]
        execute(
            conn,
            "UPDATE progress SET course_name=?, status=?, minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (course_name, status, minutes, pid),
        )
    else:
        execute(
            conn,
            "INSERT INTO progress(email, course_id, course_name, subskill, status, minutes) VALUES(?,?,?,?,?,?)",
            (email, course_id, course_name, None, status, minutes),
        )


def seed(file_name: str = EXCEL_FILE, sheet_name: str = EXCEL_SHEET, default_password: str = DEFAULT_PASSWORD) -> Tuple[int, int]:
    init_db()
    records = load_excel_as_records(file_name, sheet_name)
    conn = get_conn()

    users_created = 0
    progress_upserted = 0
    seen_users = set()

    for row in records:
        email_raw = row.get("email") or ""
        email = str(email_raw).strip().lower()
        if not email:
            continue

        name = (row.get("name") or email.split("@")[0] or "User").strip()
        course_name = (row.get("course_name") or "Kursus Dicoding").strip()
        status = derive_status(row)
        minutes = derive_minutes(row)

        existing = find_user(email)
        if email not in seen_users and not existing:
            create_user(name, email, default_password)
            users_created += 1
        elif email not in seen_users and existing:
            execute(conn, "UPDATE users SET password_hash=? WHERE email=?", (hash_password(default_password), email))

        seen_users.add(email)

        upsert_progress(conn, email, course_name, status, minutes)
        progress_upserted += 1

    conn.close()
    return users_created, progress_upserted


if __name__ == "__main__":
    users, progress_rows = seed()
    print(f"Selesai. Users baru: {users}, progres di-upsert: {progress_rows}")
