# Assessment Engine 
from __future__ import annotations

import re
import random
from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher
import pandas as pd

from ..llm.gemini_client import GEMINI_API_KEY, API_URL
import httpx

# ADD THIS FUNCTION HERE (setelah imports)
def calculate_level(correct: int, total: int) -> str:
    """
    Calculate skill level based on assessment score
    Compatible dengan logic yang ada di run_assessment()
    
    Args:
        correct: Number of correct answers
        total: Total number of questions
    
    Returns:
        Level string: "Beginner", "Intermediate", or "Advanced"
    """
    if total == 0:
        return "Beginner"
    
    # Logic sama dengan run_assessment() 
    elif correct >= total - 1:
        return "Intermediate"
    else:
        return "Beginner"


def get_questions_for_subskill_from_dataset(
    subskill: str,
    tech_qs_df: pd.DataFrame,
    num_questions: int = 3
) -> Optional[List[Dict[str, Any]]]:
    """
    Ambil pertanyaan dari dataset tech_qs berdasarkan subskill.
    
    Args:
        subskill: Nama subskill
        tech_qs_df: DataFrame Current Tech Questions
        num_questions: Jumlah pertanyaan yang diinginkan
    
    Returns:
        List dict dengan format:
        {
            "question": str,
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A" | "B" | "C" | "D" | None
        }
    """
    filtered = tech_qs_df[
        tech_qs_df['question_desc'].str.contains(subskill, case=False, na=False)
    ]
    
    if len(filtered) >= num_questions:
        filtered = filtered.sample(n=num_questions)
    elif len(filtered) == 0:
        return None
    
    questions = []
    for _, row in filtered.iterrows():
        options = [
            str(row['option_1']).strip(),
            str(row['option_2']).strip(),
            str(row['option_3']).strip(),
            str(row['option_4']).strip()
        ]
        
        formatted_options = [f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)]
        
        # Convert correct_answer (text) ke huruf (A/B/C/D)
        answer_letter = None
        if not pd.isna(row['correct_answer']):
            correct_text = str(row['correct_answer']).strip()
            
            # Exact match dulu
            for i, opt in enumerate(options):
                if opt.lower() == correct_text.lower():
                    answer_letter = chr(65 + i)
                    break
            
            # Fuzzy matching jika tidak ketemu
            if answer_letter is None:
                best_match_idx = 0
                best_similarity = 0
                
                for i, opt in enumerate(options):
                    similarity = SequenceMatcher(None, opt.lower(), correct_text.lower()).ratio()
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_match_idx = i
                
                if best_similarity > 0.8:
                    answer_letter = chr(65 + best_match_idx)
        
        questions.append({
            "question": row['question_desc'],
            "options": formatted_options,
            "answer": answer_letter
        })
    
    return questions


def generate_questions_gemini(subskill: str, num_questions: int = 3) -> List[Dict[str, Any]]:
    """
    Generate pertanyaan via Gemini AI jika dataset kurang.
    
    Args:
        subskill: Nama subskill
        num_questions: Jumlah pertanyaan
    
    Returns:
        List dict dengan format sama seperti get_questions_for_subskill_from_dataset
    """
    if not GEMINI_API_KEY:
        # Fallback: dummy questions
        return [{
            "question": f"Pertanyaan tentang {subskill}?",
            "options": ["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4"],
            "answer": "A"
        }] * num_questions
    
    prompt = f"""
    Anda adalah AI pakar pembuat pertanyaan teknologi.

    Buat {num_questions} pertanyaan pilihan ganda terkait subskill: "{subskill}".
    Setiap pertanyaan harus memiliki 4 opsi jawaban (A, B, C, D), **tanpa menuliskan jawaban benar**.
    Output cukup dalam text biasa, misal:

    1. Pertanyaan?
    A. jawaban1
    B. jawaban2
    C. jawaban3
    D. jawaban4
    """
    
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{API_URL}?key={GEMINI_API_KEY}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}]
                }
            )
            resp.raise_for_status()
            data = resp.json()
        
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                resp_text = parts[0].get("text", "").strip()
    except Exception as e:
        print(f"Error generate_questions_gemini: {e}")
        resp_text = ""
    
    if not resp_text:
        return []
    
    # Parse text ke format dict
    questions = []
    q = {}
    lines = resp_text.split("\n")
    answer_index_cycle = list(range(4))
    
    for line in lines:
        line = line.strip()
        if re.match(r"^\d+\.", line):
            question_text = re.sub(r"^\d+\.\s*", "", line).strip()
            if q:
                if q.get("options"):
                    answer_idx = answer_index_cycle.pop(0)
                    answer_index_cycle.append(answer_idx)
                    q["answer"] = q["options"][answer_idx][0]
                else:
                    q["answer"] = "A"
                questions.append(q)
            q = {"question": question_text, "options": [], "answer": "A"}
        elif re.match(r"^[A-D]\.", line):
            q.setdefault("options", []).append(line)
    
    if q:
        if q.get("options"):
            answer_idx = answer_index_cycle.pop(0)
            answer_index_cycle.append(answer_idx)
            q["answer"] = q["options"][answer_idx][0]
        else:
            q["answer"] = "A"
        questions.append(q)
    
    return questions[:num_questions]


def prepare_assessment(
    detected_subskills: List[str],
    tech_qs_df: pd.DataFrame,
    total_questions: int = 18
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Siapkan assessment dengan kombinasi dataset + Gemini.
    
    Args:
        detected_subskills: List subskill yang terdeteksi
        tech_qs_df: DataFrame Current Tech Questions
        total_questions: Total pertanyaan (default 18)
    
    Returns:
        Dict dengan key = subskill, value = list pertanyaan
    """
    num_subskills = len(detected_subskills)
    questions_per_subskill = total_questions // num_subskills
    
    assessment = {}
    for subskill in detected_subskills:
        questions = get_questions_for_subskill_from_dataset(
            subskill, tech_qs_df, num_questions=questions_per_subskill
        )
        
        if questions is None or len(questions) < questions_per_subskill:
            needed = questions_per_subskill if questions is None else questions_per_subskill - len(questions)
            generated = generate_questions_gemini(subskill, num_questions=needed)
            questions = (questions or []) + generated
        
        # Validasi format
        for i, q in enumerate(questions):
            q.setdefault("question", "Pertanyaan tidak tersedia")
            q.setdefault("options", ["A. ...", "B. ...", "C. ...", "D. ..."])
            q.setdefault("answer", "A")
        
        assessment[subskill] = questions
    
    return assessment


def run_assessment(assessment: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
    """
    Jalankan assessment dan return hasil 
    
    Args:
        assessment: Dict dari prepare_assessment()
    
    Returns:
        Dict hasil assessment per skill:
        {
            "skill_name": {
                "correct": int,
                "total": int,
                "level": str
            }
        }
    """
    results = {}
    
    for skill, questions in assessment.items():
        print(f"\n{'='*80}")
        print(f"SKILL: {skill}")
        print(f"{'='*80}")
        
        correct_count = 0
        
        for idx, q in enumerate(questions, 1):
            print(f"\n{idx}. {q['question']}")
            
            options = q.get('options', ["A. ...", "B. ...", "C. ...", "D. ..."])
            for opt in options:
                print(opt)
            
            # Input jawaban
            user_answer = input("\nJawaban (A/B/C/D): ").strip().upper()
            
            # Validasi input
            while user_answer not in ['A', 'B', 'C', 'D']:
                user_answer = input("Jawaban salah. Masukkan A/B/C/D: ").strip().upper()
            
            # Check jawaban benar
            correct_answer = q.get('answer', 'A').upper()
            if user_answer == correct_answer:
                correct_count += 1
                print("Benar!")
            else:
                print(f"Salah! Jawaban yang benar: {correct_answer}")
        
        # Hitung level 
        if correct_count == len(questions):
            level = "Advanced"
        elif correct_count >= len(questions) - 1:
            level = "Intermediate"
        else:
            level = "Beginner"
        
        results[skill] = {
            "correct": correct_count,
            "total": len(questions),
            "level": level
        }
    
    return results


def aggregate_user_level_majority(results: Dict[str, Dict[str, Any]]) -> str:
    """
    Aggregate level user berdasarkan majority voting 
    
    Args:
        results: Dict hasil dari run_assessment()
    
    Returns:
        Level yang paling banyak muncul (Beginner/Intermediate/Advanced)
    """
    from collections import Counter
    
    # Ambil semua level dari results
    levels = [res["level"] for res in results.values()]
    
    # Hitung frekuensi tiap level
    level_count = Counter(levels)
    
    # Cari level yang paling banyak muncul
    most_common_level, count = level_count.most_common(1)[0]
    
    return most_common_level