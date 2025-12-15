# Job Detection, Assessment, Course Recommendation, Progress Tracking, Next Skill Prediction, Learning Strategy

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from ..auth import user_from_auth
from ..db import get_conn, execute, query
from ..services.data_loader import load_excel_as_records
from ..ml.job_detector import detect_job_role, detect_skills
from ..ml.assessment_engine import prepare_assessment, calculate_level
from ..ml.course_recommender import CourseRecommender
from ..ml.student_progress import HybridLearningRecommender
from ..ml.roadmap_generator import RoadmapGenerator
from ..ml.learning_strategy import LearningStrategyGenerator
from ..ml.personal_learning import SkillPredictor
from ..ml.roadmap_progress import RoadmapProgressPredictor

import pandas as pd


router = APIRouter(prefix="/ml-advanced", tags=["ml-advanced"])


# JOB ROLE & SUBSKILL DETECTION
class JobDetectionReq(BaseModel):
    description: str
    top_k: int = Field(default=6, ge=1, le=20)


@router.post("/detect_job_and_skills")
def api_detect_job_and_skills(req: JobDetectionReq):
    """Deteksi job role dan skills dari deskripsi user."""
    try:
        lp_data = load_excel_as_records("LP and Course Mapping.xlsx", "Learning Path")
        lp_df = pd.DataFrame(lp_data)
        job_roles = lp_df['learning_path_name'].dropna().unique().tolist()
        
        skill_data = load_excel_as_records("Resource Data Learning Buddy.xlsx", "Skill Keywords")
        skill_df = pd.DataFrame(skill_data)
        valid_keywords = skill_df['keyword'].dropna().tolist()
    except Exception as e:
        raise HTTPException(500, f"Failed to load datasets: {e}")
    
    try:
        job_role = detect_job_role(req.description, job_roles)
        skills = detect_skills(req.description, job_role, valid_keywords, top_k=req.top_k)
    except Exception as e:
        raise HTTPException(500, f"Detection failed: {e}")
    
    return {
        "job_role": job_role,
        "skills": skills
    }


# ASSESSMENT GENERATION
class AssessmentReq(BaseModel):
    subskills: List[str]
    total_questions: int = Field(default=18, ge=6, le=36)


@router.post("/generate_assessment")
def api_generate_assessment(req: AssessmentReq):
    """Generate assessment untuk subskill yang dipilih."""
    try:
        tech_qs_df = pd.DataFrame(
            load_excel_as_records("Resource Data Learning Buddy.xlsx", "Current Tech Questions")
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to load tech questions: {e}")
    
    assessment = prepare_assessment(req.subskills, tech_qs_df, total_questions=req.total_questions)
    
    return {
        "assessment": assessment,
        "total_questions": sum(len(v) for v in assessment.values())
    }


class SubmitAssessmentReq(BaseModel):
    assessment_id: Optional[str] = None
    answers: Dict[str, List[Dict[str, Any]]]  


@router.post("/submit_assessment")
def api_submit_assessment(req: SubmitAssessmentReq, email: str = Depends(user_from_auth)):
    """
    Submit jawaban assessment dan simpan skor.
    
    Expected format:
    {
      "answers": {
        "React.js": [
          {
            "question": "What is JSX?",
            "user_answer": "A",
            "correct_answer": "B",
            "is_correct": false
          },
          ...
        ],
        "JavaScript": [...]
      }
    }
    """
    results = {}
    aggregate_scores = []
    
    for subskill, answer_list in req.answers.items():
        correct = 0
        total = len(answer_list)
        
        # Count correct answers from is_correct field
        for ans in answer_list:
            if ans.get("is_correct", False):
                correct += 1
        
        # Calculate level using existing function
        level = calculate_level(correct, total)
        
        results[subskill] = {
            "correct": correct,
            "total": total,
            "score": int((correct / total) * 100) if total > 0 else 0,
            "level": level
        }
        
        aggregate_scores.append(level)
    
    # Aggregate level by majority voting
    from collections import Counter
    level_count = Counter(aggregate_scores)
    aggregate_level = level_count.most_common(1)[0][0] if aggregate_scores else "Beginner"
    
    # Save to database
    conn = get_conn()
    for subskill, res in results.items():
        try:
            execute(
                conn,
                "INSERT INTO subskill_scores(email,role,subskill,score,level) VALUES(?,?,?,?,?)",
                (email, "Unknown", subskill, res["score"], res["level"])
            )
        except Exception as e:
            print(f"Failed to save {subskill}: {e}")
    conn.close()
    
    return {
        "status": "ok",
        "results": results,
        "aggregate_level": aggregate_level
    }


# COURSE RECOMMENDATION (Sentence Transformer)
class CourseRecommendReq(BaseModel):
    user_input: str
    user_level: Optional[str] = None
    top_k: int = Field(default=10, ge=1, le=50)


_course_recommender = None


def get_course_recommender() -> CourseRecommender:
    global _course_recommender
    if _course_recommender is None:
        _course_recommender = CourseRecommender()
        
        try:
            lp_answer_df = pd.DataFrame(
                load_excel_as_records("Resource Data Learning Buddy.xlsx", "Learning Path Answer")
            )
            course_df = pd.DataFrame(
                load_excel_as_records("LP and Course Mapping.xlsx", "Course")
            )
            
            _course_recommender.prepare_courses(lp_answer_df, course_df)
            
            if not _course_recommender.load_embeddings():
                _course_recommender.build_embeddings(save=True)
        
        except Exception as e:
            print(f"Failed to initialize CourseRecommender: {e}")
    
    return _course_recommender


@router.post("/recommend_courses_st")
def api_recommend_courses_st(req: CourseRecommendReq):
    """Rekomendasi course dengan Sentence Transformer."""
    recommender = get_course_recommender()
    
    try:
        results = recommender.recommend(
            user_input=req.user_input,
            user_level=req.user_level,
            top_k=req.top_k
        )
        
        return {
            "courses": results.to_dict('records')
        }
    except Exception as e:
        raise HTTPException(500, f"Recommendation failed: {e}")


# PROGRESS TRACKING BY EMAIL

_hybrid_recommender = None


def get_hybrid_recommender() -> HybridLearningRecommender:
    """Singleton"""
    global _hybrid_recommender
    
    if _hybrid_recommender is None:
        _hybrid_recommender = HybridLearningRecommender()
        
        try:
            print("Loading datasets for progress tracking")
            lp_answer = pd.DataFrame(
                load_excel_as_records("Resource Data Learning Buddy.xlsx", "Learning Path Answer")
            )
            course = pd.DataFrame(
                load_excel_as_records("LP and Course Mapping.xlsx", "Course")
            )
            stud_progress = pd.DataFrame(
                load_excel_as_records("Resource Data Learning Buddy.xlsx", "Student Progress")
            )
            tutorials = pd.DataFrame(
                load_excel_as_records("LP and Course Mapping.xlsx", "Tutorials")
            )
            
            print("Preparing data")
            course_features, stud_metrics, course_data = _hybrid_recommender.prepare_data(
                lp_answer, course, stud_progress, tutorials
            )
            
            print("Building models")
            model, train_acc, test_acc = _hybrid_recommender.build_classification_model(stud_metrics)
            
            print(f"Training Accuracy: {train_acc*100:.2f}%")
            print(f"Testing Accuracy: {test_acc*100:.2f}%")
            
            _hybrid_recommender._course_features = course_features
            _hybrid_recommender._stud_metrics = stud_metrics
            _hybrid_recommender._course_data = course_data
            _hybrid_recommender._train_acc = train_acc
            _hybrid_recommender._test_acc = test_acc
            
            print("HybridLearningRecommender initialized!")
        
        except Exception as e:
            print(f"Failed to initialize: {e}")
            raise
    
    return _hybrid_recommender


class ProgressEmailReq(BaseModel):
    email: str


@router.post("/progress_by_email")
def api_progress_by_email(req: ProgressEmailReq):
    """Get student progress by email"""
    recommender = get_hybrid_recommender()
    
    stud_metrics = recommender._stud_metrics
    course_features = recommender._course_features
    course_data = recommender._course_data
    
    if req.email not in stud_metrics['email'].values:
        raise HTTPException(404, f"Email '{req.email}' not found in dataset")
    
    strategy = recommender.generate_learning_strategy(
        req.email, stud_metrics, course_features, course_data
    )
    
    return {
        "student_name": strategy['student_name'],
        "email": strategy['email'],
        "current_course": strategy['current_course'],
        "completion_rate": f"{strategy['completion_rate']:.1f}%",
        "exam_score": f"{strategy['exam_score']:.0f}/100",
        "submission_rating": f"{strategy['submission_rating']:.1f}/5",
        "success_probability": f"{strategy['success_probability']*100:.1f}%",
        "overall_status": strategy['adaptive_roadmap']['current_status']['overall_status'],
        "recommended_courses": strategy['recommended_courses'],
        "next_steps": strategy['adaptive_roadmap']['next_steps'],
        "estimated_completion": strategy['adaptive_roadmap']['estimated_completion'],
        "insights": strategy['adaptive_roadmap']['insights']
    }


@router.get("/all_students_progress")
def api_all_students():
    """Get all students"""
    recommender = get_hybrid_recommender()
    
    stud_metrics = recommender._stud_metrics
    course_features = recommender._course_features
    course_data = recommender._course_data
    
    all_students = []
    
    for email in stud_metrics['email'].unique():
        strategy = recommender.generate_learning_strategy(
            email, stud_metrics, course_features, course_data
        )
        
        all_students.append({
            "student_name": strategy['student_name'],
            "email": strategy['email'],
            "current_course": strategy['current_course'],
            "completion_rate": strategy['completion_rate'],
            "exam_score": strategy['exam_score'],
            "submission_rating": strategy['submission_rating'],
            "success_probability": strategy['success_probability'],
            "overall_status": strategy['adaptive_roadmap']['current_status']['overall_status']
        })
    
    return {
        "total_students": len(all_students),
        "model_accuracy": {
            "train": f"{recommender._train_acc*100:.2f}%",
            "test": f"{recommender._test_acc*100:.2f}%"
        },
        "students": all_students
    }


# ROADMAP GENERATOR
_roadmap_generator = None


def get_roadmap_generator() -> RoadmapGenerator:
    """Singleton roadmap generator"""
    global _roadmap_generator
    
    if _roadmap_generator is None:
        _roadmap_generator = RoadmapGenerator()
        
        try:
            print("Loading skill data for roadmap")
            skill_df = pd.read_csv("Skill.csv")
            
            _roadmap_generator.load_data(skill_df)
            _roadmap_generator.train_model()
            
            print("Roadmap generator initialized!")
        
        except Exception as e:
            print(f"Failed to initialize roadmap generator: {e}")
            raise
    
    return _roadmap_generator


class RoadmapQueryReq(BaseModel):
    query: str
    top_n: int = Field(default=5, ge=1, le=10)


@router.post("/predict_next_skills")
def api_predict_next_skills(req: RoadmapQueryReq):
    """
    Predict next skills 
    """
    generator = get_roadmap_generator()
    
    try:
        result = generator.predict_next_skills(req.query, top_n=req.top_n)
        
        if result.empty:
            return {
                "query": req.query,
                "recommendations": [],
                "message": "No recommendations found"
            }
        
        return {
            "query": req.query,
            "recommendations": result.to_dict('records')
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


# LEARNING STRATEGY GENERATOR 
_strategy_generator = None


def get_strategy_generator() -> LearningStrategyGenerator:
    """Singleton learning strategy generator"""
    global _strategy_generator
    
    if _strategy_generator is None:
        # GANTI dengan API key Anda!
        GEMINI_API_KEY = "AIzaSyAlilmKBqA4Y0JuBnflxtuCNdXWZYE4RpI"
        
        try:
            print("Initializing Learning Strategy Generator")
            _strategy_generator = LearningStrategyGenerator(
                api_key=GEMINI_API_KEY,
                resources_path="data.json"
            )
            print("Learning Strategy Generator initialized!")
        
        except Exception as e:
            print(f"Failed to initialize strategy generator: {e}")
            raise
    
    return _strategy_generator


class LearningStrategyReq(BaseModel):
    query: str
    goal: Optional[str] = None
    top_n: int = Field(default=5, ge=1, le=10)


@router.post("/generate_learning_strategy")
def api_generate_learning_strategy(req: LearningStrategyReq):
    """
    Generate actionable learning strategy - Full Pipeline
    
    Example Request:
    {
      "query": "sehabis CSS, apa lagi yang harus dipelajari untuk jadi front-end developer?",
      "goal": "Menjadi Front-End Developer profesional",
      "top_n": 5
    }
    
    Response:
    {
      "query": "...",
      "next_skills": ["JavaScript", "React", ...],
      "next_skills_details": [...],
      "strategy": "Yuk naikin skill kamu! ..."
    }
    """
    roadmap_gen = get_roadmap_generator()
    strategy_gen = get_strategy_generator()
    
    try:
        result = strategy_gen.generate_from_query(
            query=req.query,
            roadmap_generator=roadmap_gen,
            goal=req.goal,
            top_n=req.top_n
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(500, f"Strategy generation failed: {e}")


class DirectStrategyReq(BaseModel):
    next_skills: List[str]
    goal: Optional[str] = None


@router.post("/generate_strategy_direct")
def api_generate_strategy_direct(req: DirectStrategyReq):
    """
    Generate strategy directly from skill list (without roadmap prediction)
    
    Example Request:
    {
      "next_skills": ["JavaScript", "React", "TypeScript"],
      "goal": "Menjadi Full-Stack Developer"
    }
    """
    strategy_gen = get_strategy_generator()
    roadmap_gen = get_roadmap_generator()
    
    # Set dataframe for level detection
    if strategy_gen.df is None and roadmap_gen.df is not None:
        strategy_gen.df = roadmap_gen.df
    
    try:
        strategy = strategy_gen.generate_actionable_learning_strategy(
            next_skills=req.next_skills,
            goal=req.goal
        )
        
        return {
            "next_skills": req.next_skills,
            "goal": req.goal,
            "strategy": strategy
        }
    
    except Exception as e:
        raise HTTPException(500, f"Strategy generation failed: {e}")


# 8. SKILL PREDICTION FROM USER PROGRESS 

_skill_predictor = None


def get_skill_predictor() -> SkillPredictor:
    """Singleton skill predictor"""
    global _skill_predictor
    
    if _skill_predictor is None:
        _skill_predictor = SkillPredictor()
        
        try:
            print("Initializing Skill Predictor")
            _skill_predictor.train()
            print("Skill Predictor initialized!")
        
        except Exception as e:
            print(f"Failed to initialize skill predictor: {e}")
            raise
    
    return _skill_predictor


class UserProgressReq(BaseModel):
    name: str
    email: str
    learning_path_id: Optional[str] = None
    course_name: Optional[str] = None


class BatchUserProgressReq(BaseModel):
    users: List[UserProgressReq]


@router.post("/predict_skills_from_file")
def api_predict_skills_from_file():
    """
    Predict skills dari file Excel 
    Membaca sheet "Tracking Progress Pengguna"
    """
    predictor = get_skill_predictor()
    
    try:
        user_skill_predictions = predictor.predict_from_excel()
        
        return {
            "status": "ok",
            "total_users": len(user_skill_predictions),
            "predictions": user_skill_predictions.to_dict('records')
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


@router.post("/predict_skills_single")
def api_predict_skills_single(req: UserProgressReq):
    """
    Predict skills untuk 1 user
    
    Example Request:
    {
      "name": "John Doe",
      "email": "john@example.com",
      "learning_path_id": "Front-End Web Developer",
      "course_name": "Belajar Membuat Front-End Web untuk Pemula"
    }
    """
    predictor = get_skill_predictor()
    
    try:
        # Create dataframe from single user
        df_user = pd.DataFrame([{
            "name": req.name,
            "email": req.email,
            "learning_path_id": req.learning_path_id or "",
            "course_name": req.course_name or ""
        }])
        
        user_skill_predictions = predictor.predict_user_progress(df_user)
        result = user_skill_predictions.to_dict('records')[0]
        
        return {
            "status": "ok",
            "name": result["name"],
            "email": result["email"],
            "predicted_skills": result["predicted_skills"]
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


@router.post("/predict_skills_batch")
def api_predict_skills_batch(req: BatchUserProgressReq):
    """
    Predict skills untuk multiple users
    
    Example Request:
    {
      "users": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "learning_path_id": "Front-End Web Developer",
          "course_name": "Belajar Membuat Front-End Web untuk Pemula"
        },
        {
          "name": "Jane Smith",
          "email": "jane@example.com",
          "learning_path_id": "Back-End Developer Python",
          "course_name": "Belajar Dasar Pemrograman Python"
        }
      ]
    }
    """
    predictor = get_skill_predictor()
    
    try:
        # Create dataframe from batch
        df_user = pd.DataFrame([{
            "name": u.name,
            "email": u.email,
            "learning_path_id": u.learning_path_id or "",
            "course_name": u.course_name or ""
        } for u in req.users])
        
        user_skill_predictions = predictor.predict_user_progress(df_user)
        
        return {
            "status": "ok",
            "total_users": len(user_skill_predictions),
            "predictions": user_skill_predictions.to_dict('records')
        }
    
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


@router.get("/available_skills")
def api_available_skills():
    """Get all available skills yang bisa diprediksi"""
    predictor = get_skill_predictor()
    
    try:
        skills = predictor.get_all_skills()
        
        return {
            "total_skills": len(skills),
            "skills": sorted(skills)
        }
    
    except Exception as e:
        raise HTTPException(500, f"Failed to get skills: {e}")

# PERSONAL LEARNING ASSISTANT FOR LOGGED USER 

@router.post("/predict_my_skills")
def api_predict_my_skills(email: str = Depends(user_from_auth)):
    """
    Predict skills untuk user yang sedang login 
    """
    predictor = get_skill_predictor()
    
    try:
        conn = get_conn()
        
        # Get onboarding data
        onboarding_rows = query(
            conn,
            "SELECT role, experience, goal FROM onboarding WHERE email=? ORDER BY id DESC LIMIT 1",
            (email,)
        )
        
        # Get progress data
        progress_rows = query(
            conn,
            """
            SELECT course_name, subskill 
            FROM progress 
            WHERE email=? 
            LIMIT 10
            """,
            (email,)
        )
        
        conn.close()
        
        # Convert to dicts
        onboarding = [dict(row) for row in onboarding_rows] if onboarding_rows else []
        progress_data = [dict(row) for row in progress_rows] if progress_rows else []
        
        # Build learning path
        learning_path = ""
        if onboarding and len(onboarding) > 0:
            role = onboarding[0].get("role", "")
            learning_path = role if role else ""
        
        # Get latest course
        course_name = ""
        if progress_data and len(progress_data) > 0:
            course_name = progress_data[0].get("course_name", "")
        
        # Predict skills
        df_user = pd.DataFrame([{
            "name": "Current User",
            "email": email,
            "learning_path_id": learning_path,
            "course_name": course_name
        }])
        
        user_skill_predictions = predictor.predict_user_progress(df_user)
        result = user_skill_predictions.to_dict('records')[0]
        
        # Parse predicted skills
        predicted_skills_str = result.get("predicted_skills", "")
        predicted_skills = [s.strip() for s in predicted_skills_str.split(",") if s.strip()]
        
        return {
            "status": "ok",
            "email": email,
            "learning_path": learning_path,
            "current_course": course_name,
            "predicted_skills": predicted_skills,
            "total_skills": len(predicted_skills)
        }
    
    except Exception as e:
        import traceback
        print("Error in predict_my_skills:")
        print(traceback.format_exc())
        raise HTTPException(500, f"Prediction failed: {e}")


@router.post("/my_learning_recommendation")
def api_my_learning_recommendation(email: str = Depends(user_from_auth)):
    """
    Get personal learning recommendation 
    Returns current skills and progress summary
    """
    predictor = get_skill_predictor()
    
    try:
        conn = get_conn()
        
        # Get user data (name, email)
        user_data = query(
            conn,
            "SELECT name, email FROM users WHERE email=? LIMIT 1",
            (email,)
        )
        
        # Get onboarding data
        onboarding_rows = query(
            conn,
            "SELECT role, experience, goal FROM onboarding WHERE email=? ORDER BY id DESC LIMIT 1",
            (email,)
        )
        
        # Get progress data
        progress_rows = query(
            conn,
            """
            SELECT course_name, subskill, minutes
            FROM progress 
            WHERE email=? 
            LIMIT 20
            """,
            (email,)
        )
        
        conn.close()
        
        # Convert Row objects to dicts
        user_info = [dict(row) for row in user_data] if user_data else []
        onboarding = [dict(row) for row in onboarding_rows] if onboarding_rows else []
        progress_data = [dict(row) for row in progress_rows] if progress_rows else []
        
        # Get user name
        user_name = ""
        if user_info and len(user_info) > 0:
            user_name = str(user_info[0].get("name", "")) if user_info[0].get("name") else ""
        
        # Build user profile
        learning_path = ""
        experience = "Pemula"
        goal = "Belum diset"
        
        if onboarding and len(onboarding) > 0:
            row = onboarding[0]
            learning_path = str(row.get("role", "")) if row.get("role") else ""
            experience = str(row.get("experience", "Pemula")) if row.get("experience") else "Pemula"
            goal = str(row.get("goal", "Belum diset")) if row.get("goal") else "Belum diset"
        
        # Get latest course
        course_name = ""
        if progress_data and len(progress_data) > 0:
            row = progress_data[0]
            course_name = str(row.get("course_name", "")) if row.get("course_name") else ""
        
        # Predict skills using SkillPredictor
        df_user = pd.DataFrame([{
            "name": user_name or "Current User",
            "email": email,
            "learning_path_id": learning_path,
            "course_name": course_name
        }])
        
        print(f"\nPredicting skills for: {email}")
        print(f"   Name: {user_name}")
        print(f"   LP: {learning_path}")
        print(f"   Course: {course_name}")
        
        user_skill_predictions = predictor.predict_user_progress(df_user)
        result = user_skill_predictions.to_dict('records')[0]
        
        # Parse current skills
        predicted_skills_str = result.get("predicted_skills", "")
        current_skills = []
        if predicted_skills_str and predicted_skills_str.strip():
            current_skills = [s.strip() for s in predicted_skills_str.split(",") if s.strip()]
        
        print(f"Detected {len(current_skills)} skills")
        
        # Build progress summary
        progress_summary = []
        if progress_data:
            for p in progress_data[:10]:
                progress_summary.append({
                    "course": str(p.get("course_name", "")) if p.get("course_name") else "",
                    "skill": str(p.get("subskill", "")) if p.get("subskill") else "",
                    "minutes": int(p.get("minutes", 0)) if p.get("minutes") else 0
                })
        
        return {
            "status": "ok",
            "name": user_name,
            "email": email,
            "user_profile": {
                "name": user_name,
                "learning_path": learning_path,
                "experience": experience,
                "goal": goal,
                "current_course": course_name
            },
            "current_skills": current_skills,
            "progress_summary": progress_summary,
            "total_current_skills": len(current_skills)
        }
    
    except Exception as e:
        import traceback
        print("Error in my_learning_recommendation:")
        print(traceback.format_exc())
        raise HTTPException(500, f"Failed: {e}")


# WEEKLY STUDY PLAN TRACKER 
class SimpleLearningTracker:
    """Simple Learning Tracker for weekly study plans"""
    
    def __init__(self):
        self.label_encoders = {}
    
    def prepare_data(self, lp_answer, course, stud_progress):
        """Prepare data"""
        course_data = course.copy()
        stud_metrics = stud_progress.copy()
        
        # Merge course info
        stud_metrics = stud_metrics.merge(
            course_data[['course_name', 'course_level_str', 'hours_to_study', 'learning_path_id']],
            on='course_name',
            how='left'
        )
        
        # Encode categorical
        from sklearn.preprocessing import LabelEncoder
        for col in ['course_level_str', 'course_name']:
            if col in stud_metrics.columns:
                le = LabelEncoder()
                stud_metrics[col] = stud_metrics[col].astype(str)
                stud_metrics[f'{col}_encoded'] = le.fit_transform(stud_metrics[col])
                self.label_encoders[col] = le
        
        if 'password' not in stud_metrics.columns:
            stud_metrics['password'] = 'N/A'
        
        return stud_metrics, course_data
    
    def recommend_courses(self, course_name, course_data, top_n=3):
        """Recommend next courses"""
        current_course = course_data[course_data['course_name'] == course_name]
        if current_course.empty:
            return pd.DataFrame()
        
        current_level_str = str(current_course.iloc[0]['course_level_str']).strip()
        current_lp_id = current_course.iloc[0]['learning_path_id']
        
        print(f"\nDEBUG: Current Course: {course_name}")
        print(f"   Current Level: {current_level_str}")
        print(f"   Learning Path: {current_lp_id}")
        
        try:
            current_level_num = int(float(current_level_str))
        except:
            current_level_num = 0
        
        filtered = course_data[course_data['learning_path_id'] == current_lp_id].copy()
        filtered['course_level_int'] = pd.to_numeric(filtered['course_level_str'], errors='coerce').fillna(0).astype(int)
        same_path_courses = filtered[
            (filtered['course_level_int'] > current_level_num) &
            (filtered['course_name'] != course_name)
        ]
        
        print(f"   Found {len(same_path_courses)} courses in same path")
        
        # MAPPING DENGAN "1.0", "2.0", dll
        level_map = {
            "1.0": "Dasar", 
            "2.0": "Pemula", 
            "3.0": "Menengah", 
            "4.0": "Mahir", 
            "5.0": "Profesional"
        }
        
        recommendations = []
        for idx, row in same_path_courses.head(top_n).iterrows():
            # Handle hours_to_study dengan lebih baik
            hours = row.get('hours_to_study', None)
            print(f"\nCourse: {row['course_name']}")
            print(f"      Level Str: '{row['course_level_str']}'")
            print(f"      Hours Raw: {hours} (type: {type(hours)})")
            
            if pd.isna(hours) or hours == '' or hours == 'N/A':
                hours_str = 'N/A'
            else:
                try:
                    hours_str = str(int(float(hours)))
                except:
                    hours_str = str(hours)
            
            print(f"      Hours Final: {hours_str}")
            
            # MAPPING KE TEXT LEVEL (Dasar, Pemula, dll)
            level_str = str(row['course_level_str']).strip()
            difficulty = level_map.get(level_str, "Pemula")
            
            print(f"      Difficulty Mapped: {difficulty}")
            
            recommendations.append({
                'name': row['course_name'],
                'course_difficulty': difficulty,
                'hours_to_study': hours_str
            })
        
        return pd.DataFrame(recommendations)


_weekly_tracker = None


def get_weekly_tracker() -> SimpleLearningTracker:
    """Singleton weekly study plan tracker"""
    global _weekly_tracker
    
    if _weekly_tracker is None:
        _weekly_tracker = SimpleLearningTracker()
        
        try:
            print("Loading datasets for weekly study plan")
            lp_answer = pd.DataFrame(
                load_excel_as_records("Resource Data Learning Buddy.xlsx", "Learning Path Answer")
            )
            course = pd.DataFrame(
                load_excel_as_records("LP and Course Mapping.xlsx", "Course")
            )
            stud_progress = pd.DataFrame(
                load_excel_as_records("Resource Data Learning Buddy.xlsx", "Student Progress")
            )
            
            print("Preparing data")
            stud_metrics, course_data = _weekly_tracker.prepare_data(lp_answer, course, stud_progress)
            
            _weekly_tracker._stud_metrics = stud_metrics
            _weekly_tracker._course_data = course_data
            
            print("Weekly Study Plan Tracker initialized!")
        
        except Exception as e:
            print(f"Failed to initialize weekly tracker: {e}")
            raise
    
    return _weekly_tracker


class WeeklyPlanReq(BaseModel):
    weeks: int = Field(default=4, ge=1, le=12)


@router.post("/my_weekly_study_plan")
def api_my_weekly_study_plan(req: WeeklyPlanReq, email: str = Depends(user_from_auth)):
    """
    Get weekly study plan untuk user yang sedang login
    """
    tracker = get_weekly_tracker()
    
    stud_metrics = tracker._stud_metrics
    course_data = tracker._course_data
    
    try:
        # Find user in dataset
        user_data = stud_metrics[stud_metrics['email'] == email]
        
        if user_data.empty:
            # User tidak ada di dataset, coba ambil dari database
            conn = get_conn()
            
            # Get user info
            user_info = query(
                conn,
                "SELECT name, email FROM users WHERE email=? LIMIT 1",
                (email,)
            )
            
            # Get current course from progress
            progress_rows = query(
                conn,
                """
                SELECT course_name 
                FROM progress 
                WHERE email=? 
                ORDER BY created_at DESC 
                LIMIT 1
                """,
                (email,)
            )
            
            conn.close()
            
            user_name = ""
            current_course = ""
            
            if user_info and len(user_info) > 0:
                user_name = str(user_info[0].get("name", "")) if user_info[0].get("name") else ""
            
            if progress_rows and len(progress_rows) > 0:
                current_course = str(progress_rows[0].get("course_name", "")) if progress_rows[0].get("course_name") else ""
            
            if not current_course:
                return {
                    "status": "no_data",
                    "message": "Anda belum memiliki progress course. Mulai belajar dulu yuk!",
                    "student_name": user_name,
                    "email": email,
                    "current_course": "",
                    "weekly_plan": [],
                    "has_recommendations": False
                }
            
            # Get recommendations based on current course
            recommendations = tracker.recommend_courses(current_course, course_data, top_n=req.weeks)
            
            if recommendations.empty:
                return {
                    "status": "ok",
                    "student_name": user_name,
                    "email": email,
                    "current_course": current_course,
                    "weekly_plan": [],
                    "has_recommendations": False,
                    "message": "Tidak ada rekomendasi"
                }
            
            # Build weekly plan
            weekly_plan = []
            for week in range(1, req.weeks + 1):
                if week <= len(recommendations):
                    course_idx = (week - 1) % len(recommendations)
                    course_rec = recommendations.iloc[course_idx]
                    
                    # Format hours properly
                    hours_val = course_rec['hours_to_study']
                    if hours_val and hours_val != 'N/A':
                        duration = f"{hours_val}h"
                    else:
                        duration = ""
                    
                    weekly_plan.append({
                        "week": week,
                        "course_name": course_rec['name'],
                        "difficulty": course_rec['course_difficulty'],
                        "hours": duration
                    })
            
            return {
                "status": "ok",
                "student_name": user_name,
                "email": email,
                "current_course": current_course,
                "weekly_plan": weekly_plan,
                "has_recommendations": True
            }
        
        # User ada di dataset
        student = user_data.iloc[0]
        student_name = str(student['name']) if student.get('name') else ""
        current_course = str(student['course_name']) if student.get('course_name') else ""
        
        # Get course recommendations
        recommendations = tracker.recommend_courses(current_course, course_data, top_n=req.weeks)
        
        if recommendations.empty:
            return {
                "status": "ok",
                "student_name": student_name,
                "email": email,
                "current_course": current_course,
                "weekly_plan": [],
                "has_recommendations": False,
                "message": "Tidak ada rekomendasi"
            }
        
        # Build weekly plan
        weekly_plan = []
        for week in range(1, req.weeks + 1):
            if week <= len(recommendations):
                course_idx = (week - 1) % len(recommendations)
                course_rec = recommendations.iloc[course_idx]
                
                # Format hours properly
                hours_val = course_rec['hours_to_study']
                if hours_val and hours_val != 'N/A':
                    duration = f"{hours_val}h"
                else:
                    duration = ""
                
                weekly_plan.append({
                    "week": week,
                    "course_name": course_rec['name'],
                    "difficulty": course_rec['course_difficulty'],
                    "hours": duration
                })
        
        return {
            "status": "ok",
            "student_name": student_name,
            "email": email,
            "current_course": current_course,
            "weekly_plan": weekly_plan,
            "has_recommendations": True
        }
    
    except Exception as e:
        import traceback
        print("Error in my_weekly_study_plan:")
        print(traceback.format_exc())
        raise HTTPException(500, f"Failed to generate weekly study plan: {e}")


@router.get("/all_weekly_study_plans")
def api_all_weekly_study_plans(weeks: int = 4):
    """
    Get weekly study plans for ALL students
    """
    tracker = get_weekly_tracker()
    
    stud_metrics = tracker._stud_metrics
    course_data = tracker._course_data
    
    all_plans = []
    
    for email in stud_metrics['email'].unique():
        student = stud_metrics[stud_metrics['email'] == email].iloc[0]
        current_course = str(student['course_name']) if student.get('course_name') else ""
        student_name = str(student['name']) if student.get('name') else ""
        
        recommendations = tracker.recommend_courses(current_course, course_data, top_n=weeks)
        
        weekly_plan = []
        if not recommendations.empty:
            for week in range(1, weeks + 1):
                if week <= len(recommendations):
                    course_idx = (week - 1) % len(recommendations)
                    course_rec = recommendations.iloc[course_idx]
                    
                    # Format hours properly
                    hours_val = course_rec['hours_to_study']
                    if hours_val and hours_val != 'N/A':
                        duration = f"{hours_val}h"
                    else:
                        duration = ""
                    
                    weekly_plan.append({
                        "week": week,
                        "course_name": course_rec['name'],
                        "difficulty": course_rec['course_difficulty'],
                        "hours": duration
                    })
        
        all_plans.append({
            "student_name": student_name,
            "email": email,
            "current_course": current_course,
            "weekly_plan": weekly_plan,
            "has_recommendations": len(weekly_plan) > 0
        })
    
    return {
        "status": "ok",
        "total_students": len(all_plans),
        "plans": all_plans
    }


# 1LEARNING STRATEGY FROM QUERY 

class QueryStrategyReq(BaseModel):
    """Request model untuk natural language query"""
    query: str  # User query: "sehabis HTML, CSS apa lagi yang harus dipelajari?"


@router.post("/generate_strategy_from_query")
def api_generate_strategy_from_query(
    req: QueryStrategyReq, 
    email: str = Depends(user_from_auth)
):
    """
    Generate strategy dari natural language query
    """
    roadmap_gen = get_roadmap_generator()
    strategy_gen = get_strategy_generator()
    
    try:
        # Set dataframe
        if strategy_gen.df is None and roadmap_gen.df is not None:
            strategy_gen.df = roadmap_gen.df
        
        print(f"\nGenerate Strategy from Query")
        print(f"   Query: {req.query}")
        print(f"   Email: {email}")
        
        # STEP 1: Predict next skills
        print(f"\nSTEP 1: Predicting next skills...")
        next_skills_df = roadmap_gen.predict_next_skills(req.query, top_n=5)
        
        # FIX: Check if empty BEFORE extracting skills
        if next_skills_df.empty:
            print("No next skills predicted - trying fallback")
            
            # Detect learning path dan kasih beginner skills
            lp = roadmap_gen.detect_learning_path(req.query)
            print(f"   Detected LP: {lp}")
            
            if lp:
                # Get beginner skills dari LP ini
                lp_skills = roadmap_gen.df[roadmap_gen.df["learning_path_name"] == lp]
                beginner_skills = lp_skills[lp_skills["level_num"] == 1]
                
                if not beginner_skills.empty:
                    next_skills_df = beginner_skills[["skill", "skill_level", "prerequisite"]].copy()
                    next_skills_df["probability"] = 0.8
                    next_skills_df = next_skills_df.head(5)
                    print(f"Using {len(next_skills_df)} beginner skills as fallback")
        
        # Check again after fallback
        if next_skills_df.empty:
            print("Still no recommendations after fallback")
            return {
                "status": "no_next_skills",
                "message": "Tidak ada rekomendasi skill berikutnya. Coba query yang lebih spesifik seperti 'sehabis HTML, CSS apa lagi yang harus dipelajari?'",
                "query": req.query,
                "detected_skills": [],
                "learning_path": "",
                "next_skills": [],
                "next_skills_details": [],
                "strategy": ""
            }
        
        # Extract skill names
        next_skills = [
            s.split("(")[0].strip() 
            for s in next_skills_df["skill"].tolist()
        ]
        
        print(f"Next skills predicted: {next_skills}")
        
        # STEP 2: Extract detected info
        print(f"\nSTEP 2: Detecting current skills & LP...")
        detected_skills = []
        learning_path = ""
        
        # Parse dari query untuk extract current skills
        import re
        query_lower = req.query.lower()
        
        # Extract skills mentioned in query
        for skill_row in roadmap_gen.df.itertuples():
            skill_name = skill_row.skill.split("(")[0].strip().lower()
            if skill_name in query_lower:
                full_name = skill_row.skill.split("(")[0].strip()
                if full_name not in detected_skills:
                    detected_skills.append(full_name)
        
        # Detect learning path
        if hasattr(roadmap_gen, 'detect_learning_path'):
            learning_path = roadmap_gen.detect_learning_path(req.query)
        
        print(f"Detected current skills: {detected_skills if detected_skills else ['None - using query context']}")
        print(f"Detected learning path: {learning_path}")
        
        # STEP 3: Generate learning strategy
        print(f"\nSTEP 3: Generating learning strategy...")
        strategy = strategy_gen.generate_actionable_learning_strategy(
            next_skills=next_skills,
            goal=None
        )
        
        print(f"Strategy generated ({len(strategy)} chars)")
        
        # RETURN SUCCESS
        return {
            "status": "ok",
            "query": req.query,
            "detected_skills": detected_skills if detected_skills else ["Skills dari query Anda"],
            "learning_path": learning_path,
            "next_skills": next_skills,
            "next_skills_details": next_skills_df.to_dict('records'),
            "strategy": strategy
        }
    
    except Exception as e:
        import traceback
        print("Error in generate_strategy_from_query:")
        print(traceback.format_exc())
        
        # Return proper error response
        return {
            "status": "error",
            "message": f"Terjadi kesalahan: {str(e)}",
            "query": req.query,
            "detected_skills": [],
            "learning_path": "",
            "next_skills": [],
            "next_skills_details": [],
            "strategy": ""
        }

# ROADMAP PROGRESS PREDICTION 
_roadmap_progress_predictor = None
_roadmap_predictor_failed = False


def get_roadmap_progress_predictor() -> RoadmapProgressPredictor:
    """Singleton roadmap progress predictor"""
    global _roadmap_progress_predictor, _roadmap_predictor_failed
    
    # If already failed, don't try again
    if _roadmap_predictor_failed:
        raise Exception("Roadmap predictor initialization failed previously")
    
    if _roadmap_progress_predictor is None:
        _roadmap_progress_predictor = RoadmapProgressPredictor()
        
        try:
            print("Loading roadmap prediction models")
            
            # Load models with error checking
            if not _roadmap_progress_predictor.load_models():
                print("Failed to initialize roadmap predictor: Models not found")
                _roadmap_predictor_failed = True
                raise Exception("Failed to load models")
            
            # Load data with error checking
            df_users, df_progress = _roadmap_progress_predictor.load_data()
            
            if df_users is None or df_progress is None:
                print("❌ Failed to initialize roadmap predictor: Data not found")
                _roadmap_predictor_failed = True
                raise Exception("Failed to load data")
            
            # Predict progress
            X = _roadmap_progress_predictor.prepare_features(df_progress)
            df_progress['pred_progresss'] = _roadmap_progress_predictor.predict_progress(X)
            df_progress['pred_status'] = _roadmap_progress_predictor.predict_status(X)
            
            # Store for later use
            _roadmap_progress_predictor._df_users = df_users
            _roadmap_progress_predictor._df_progress = df_progress
            
            print("Roadmap Progress Predictor initialized!")
        
        except Exception as e:
            print(f"Failed to initialize roadmap predictor: {e}")
            _roadmap_predictor_failed = True
            _roadmap_progress_predictor = None
            raise
    
    return _roadmap_progress_predictor


# API Endpoints

@router.get("/my_roadmap")
def api_my_roadmap(email: str = Depends(user_from_auth)):
    """
    Get personalized roadmap untuk user yang sedang login
    
    Returns:
    - Roadmap lengkap dengan status (Completed/In Progress/Locked)
    - Progress percentage untuk setiap modul
    - Next module message jika ada modul baru yang terbuka
    
    Example Response:
    {
      "status": "ok",
      "user_name": "John Doe",
      "email": "john@example.com",
      "current_course": "Front-End Web Developer",
      "learning_path": "Web Development",
      "roadmap": [
        {
          "title_id": 1,
          "title": "HTML Dasar",
          "status": "Completed",
          "progress": 100.0,
          "unlock_requirement": 80,
          "access_status": "🔓 (Unlocked)",
          "display": "HTML Dasar ✅ (Completed)"
        }
      ],
      "next_module_message": "Karena kamu sudah mencapai 85.5% pada CSS...",
      "total_modules": 10,
      "completed_modules": 5,
      "in_progress_modules": 2
    }
    """
    try:
        predictor = get_roadmap_progress_predictor()
        
        roadmap = predictor.generate_roadmap_for_user(
            email,
            predictor._df_users,
            predictor._df_progress
        )
        
        if roadmap is None:
            raise HTTPException(404, f"Email '{email}' tidak ditemukan dalam dataset roadmap")
        
        return {
            "status": "ok",
            **roadmap
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("Error in my_roadmap:")
        print(traceback.format_exc())
        
        # Return user-friendly error
        error_msg = str(e)
        if "Failed to load models" in error_msg or "Models not found" in error_msg:
            raise HTTPException(500, "Roadmap feature sedang dalam pengembangan. File model belum tersedia.")
        elif "Failed to load data" in error_msg or "Data not found" in error_msg:
            raise HTTPException(500, "Data roadmap belum tersedia. Silakan hubungi administrator.")
        elif "failed previously" in error_msg:
            raise HTTPException(500, "Roadmap feature tidak tersedia saat ini.")
        else:
            raise HTTPException(500, f"Gagal memuat roadmap: {error_msg}")


@router.get("/all_roadmaps")
def api_all_roadmaps():
    """
    Get roadmap untuk semua user (Admin endpoint)
    
    Returns:
    - List of all user roadmaps
    - Statistics untuk setiap user
    
    Example Response:
    {
      "status": "ok",
      "total_users": 150,
      "roadmaps": [
        {
          "user_name": "John Doe",
          "email": "john@example.com",
          "current_course": "Front-End Web Developer",
          "learning_path": "Web Development",
          "roadmap": [...],
          "next_module_message": "...",
          "total_modules": 10,
          "completed_modules": 5
        }
      ]
    }
    """
    try:
        predictor = get_roadmap_progress_predictor()
        
        all_roadmaps = predictor.generate_all_roadmaps(
            predictor._df_users,
            predictor._df_progress
        )
        
        return {
            "status": "ok",
            "total_users": len(all_roadmaps),
            "roadmaps": all_roadmaps
        }
    
    except Exception as e:
        import traceback
        print("Error in all_roadmaps:")
        print(traceback.format_exc())
        
        # Return user-friendly error
        error_msg = str(e)
        if "Failed to load models" in error_msg or "Models not found" in error_msg:
            raise HTTPException(500, "Roadmap feature sedang dalam pengembangan. File model belum tersedia.")
        elif "Failed to load data" in error_msg or "Data not found" in error_msg:
            raise HTTPException(500, "Data roadmap belum tersedia. Silakan hubungi administrator.")
        elif "failed previously" in error_msg:
            raise HTTPException(500, "Roadmap feature tidak tersedia saat ini.")
        else:
            raise HTTPException(500, f"Gagal memuat roadmaps: {error_msg}")


class RoadmapEmailReq(BaseModel):
    email: str


@router.post("/roadmap_by_email")
def api_roadmap_by_email(req: RoadmapEmailReq):
    """
    Get roadmap by specific email (Admin use)
    
    Example Request:
    {
      "email": "user@example.com"
    }
    
    Example Response:
    {
      "status": "ok",
      "user_name": "Jane Smith",
      "email": "user@example.com",
      "current_course": "Back-End Developer",
      "learning_path": "Back-End Development",
      "roadmap": [...],
      "next_module_message": "...",
      "total_modules": 12,
      "completed_modules": 3,
      "in_progress_modules": 1
    }
    """
    try:
        predictor = get_roadmap_progress_predictor()
        
        roadmap = predictor.generate_roadmap_for_user(
            req.email,
            predictor._df_users,
            predictor._df_progress
        )
        
        if roadmap is None:
            raise HTTPException(404, f"Email '{req.email}' tidak ditemukan dalam dataset roadmap")
        
        return {
            "status": "ok",
            **roadmap
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("Error in roadmap_by_email:")
        print(traceback.format_exc())
        
        # Return user-friendly error
        error_msg = str(e)
        if "Failed to load models" in error_msg or "Models not found" in error_msg:
            raise HTTPException(500, "Roadmap feature sedang dalam pengembangan. File model belum tersedia.")
        elif "Failed to load data" in error_msg or "Data not found" in error_msg:
            raise HTTPException(500, "Data roadmap belum tersedia. Silakan hubungi administrator.")
        elif "failed previously" in error_msg:
            raise HTTPException(500, "Roadmap feature tidak tersedia saat ini.")
        else:
            raise HTTPException(500, f"Gagal memuat roadmap: {error_msg}")
 