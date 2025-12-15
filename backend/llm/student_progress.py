# Student Progress Tracking & Prediction 
from __future__ import annotations

from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class HybridLearningRecommender:
    """Hybrid Learning Recommender"""
    
    def __init__(self):
        self.content_similarity = None
        self.success_predictor = None
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.label_encoders = {}
    
    # DATA PREPARATION
    def prepare_data(self, lp_answer, course, stud_progress, tutorials):
        """Prepare data"""
        
        # Course features
        course_features = lp_answer.copy()
        text_columns = ['technologies', 'course_type', 'course_difficulty', 'summary']
        
        for col in text_columns:
            if col in course_features.columns:
                course_features[col] = course_features[col].fillna('').astype(str)
        
        course_features['combined_features'] = (
            course_features['technologies'] + ' ' +
            course_features['course_type'] + ' ' +
            course_features['course_difficulty'] + ' ' +
            course_features['summary']
        )
        
        course_data = course.copy()
        
        # Student metrics
        stud_metrics = stud_progress.copy()
        numeric_cols = ['completed_tutorials', 'active_tutorials', 'exam_score', 'submission_rating']
        for col in numeric_cols:
            if col in stud_metrics.columns:
                stud_metrics[col] = pd.to_numeric(stud_metrics[col], errors='coerce').fillna(0)
        
        # Completion rate
        total_tutorials = stud_metrics['completed_tutorials'] + stud_metrics['active_tutorials']
        stud_metrics['completion_rate'] = np.where(
            total_tutorials > 0,
            (stud_metrics['completed_tutorials'] / total_tutorials) * 100,
            0
        )
        
        # Merge course info
        stud_metrics = stud_metrics.merge(
            course_data[['course_name', 'course_level_str', 'hours_to_study', 'learning_path_id']],
            on='course_name',
            how='left'
        )
        
        if 'hours_to_study' in stud_metrics.columns:
            stud_metrics['hours_to_study'] = pd.to_numeric(
                stud_metrics['hours_to_study'], errors='coerce'
            ).fillna(10)
        
        # Label encoding
        for col in ['course_level_str', 'course_name']:
            if col in stud_metrics.columns:
                le = LabelEncoder()
                stud_metrics[col] = stud_metrics[col].astype(str)
                stud_metrics[f'{col}_encoded'] = le.fit_transform(stud_metrics[col])
                self.label_encoders[col] = le
        
        if 'password' not in stud_metrics.columns:
            stud_metrics['password'] = 'N/A'
        
        print(f"✓ Prepared {len(stud_metrics)} student records")
        return course_features, stud_metrics, course_data
    
    # CONTENT-BASED MODEL
    def build_content_based_model(self, course_features):
        """Build TF-IDF content similarity"""
        if not SKLEARN_AVAILABLE:
            return None
        
        tfidf = TfidfVectorizer(stop_words='english', max_features=100)
        tfidf_matrix = tfidf.fit_transform(course_features['combined_features'])
        self.content_similarity = cosine_similarity(tfidf_matrix)
        print("✓ Content-based model built")
        return self.content_similarity
    
    # RECOMMENDATION
    def recommend_courses(self, course_name, course_features, course_data, top_n=3):
        """Recommend next courses"""
        
        current_course = course_data[course_data['course_name'] == course_name]
        if current_course.empty:
            return pd.DataFrame()
        
        current_level_str = str(current_course.iloc[0]['course_level_str']).strip()
        current_lp_id = current_course.iloc[0]['learning_path_id']
        
        try:
            current_level_num = int(current_level_str)
        except:
            current_level_num = 0
        
        # Find same learning path, higher level
        same_path_courses = course_data[
            (course_data['learning_path_id'] == current_lp_id) &
            (course_data['course_level_str'].astype(int) > current_level_num) &
            (course_data['course_name'] != course_name)
        ].sort_values('course_level_str')
        
        level_map = {
            "1": "Dasar",
            "2": "Pemula",
            "3": "Menengah",
            "4": "Mahir",
            "5": "Profesional"
        }
        
        recommendations = []
        for _, row in same_path_courses.head(top_n).iterrows():
            recommendations.append({
                'name': row['course_name'],
                'course_difficulty': level_map.get(str(row['course_level_str']).strip(), "N/A"),
                'technologies': row.get('technologies', 'N/A'),
                'hours_to_study': row.get('hours_to_study', 'N/A')
            })
        
        return pd.DataFrame(recommendations)
    

    # CLASSIFICATION MODEL
    def build_classification_model(self, stud_metrics):
        """Train Random Forest"""
        
        if not SKLEARN_AVAILABLE:
            return None, 0.0, 0.0
        
        features = [
            'completion_rate', 
            'active_tutorials', 
            'completed_tutorials',
            'course_level_str_encoded', 
            'hours_to_study'
        ]
        
        X = stud_metrics[features].fillna(0)
        y = ((stud_metrics['is_graduated'] == 1) | (stud_metrics['exam_score'] > 75)).astype(int)
        
        # Improved labeling jika y semua sama
        if len(y.unique()) == 1:
            normalized_cr = stud_metrics['completion_rate'] / 100
            normalized_exam = stud_metrics['exam_score'] / 100
            weighted = (normalized_cr * 0.5 + normalized_exam * 0.5)
            y = (weighted >= 0.65).astype(int)
        
        # Train test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, 
            stratify=y if len(y.unique()) > 1 else None
        )
        
        # Train model
        self.success_predictor = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.success_predictor.fit(X_train, y_train)
        
        # Accuracies
        train_accuracy = accuracy_score(y_train, self.success_predictor.predict(X_train))
        test_accuracy = accuracy_score(y_test, self.success_predictor.predict(X_test))
        
        print(f"Model trained - Train: {train_accuracy:.2%}, Test: {test_accuracy:.2%}")
        return self.success_predictor, train_accuracy, test_accuracy
    
    # SUCCESS PREDICTION
    def predict_success(self, student_data):
        """Predict success probabilit"""
        
        features = [
            'completion_rate', 
            'active_tutorials', 
            'completed_tutorials',
            'course_level_str_encoded', 
            'hours_to_study'
        ]
        
        X = student_data[features].fillna(0)
        if len(X) == 0:
            return None
        
        # Extract metrics
        cr = student_data['completion_rate'].values[0]
        exam = student_data['exam_score'].values[0] if 'exam_score' in student_data else 0
        sr = student_data['submission_rating'].values[0] if 'submission_rating' in student_data else 0
        
        # Normalize
        norm_cr = cr / 100
        norm_exam = exam / 100
        norm_sr = sr / 5
        
        # Weighted probability 
        final_prob = (norm_cr * 0.25) + (norm_exam * 0.35) + (norm_sr * 0.40)
        
        return min(final_prob, 0.95)
    
    # LEARNING STRATEGY
    def generate_learning_strategy(self, student_email, stud_metrics, course_features, course_data):
        """Generate strategy"""
        
        student = stud_metrics[stud_metrics['email'] == student_email]
        if len(student) == 0:
            return {"error": "Student not found"}
        
        student = student.iloc[0]
        current_course = student['course_name']
        
        # Recommend courses
        recommendations = self.recommend_courses(
            current_course, course_features, course_data, top_n=3
        )
        recommended_list = recommendations.to_dict('records') if not recommendations.empty else []
        
        # Success probability
        success_prob = self.predict_success(
            stud_metrics[stud_metrics['email'] == student_email]
        )
        if success_prob is None:
            success_prob = 0
        
        # Adaptive roadmap
        adaptive_roadmap = self._generate_adaptive_roadmap(student, success_prob)
        
        strategy = {
            "student_name": student['name'],
            "email": student_email,
            "password": student.get('password', 'N/A'),
            "current_course": current_course,
            "completion_rate": student['completion_rate'],
            "exam_score": student['exam_score'],
            "submission_rating": student['submission_rating'],
            "success_probability": success_prob,
            "recommended_courses": recommended_list,
            "adaptive_roadmap": adaptive_roadmap
        }
        return strategy
    
    def _generate_adaptive_roadmap(self, student, success_prob):
        """Generate roadmap"""
        
        cr = student['completion_rate']
        es = student['exam_score']
        sr = student['submission_rating']
        hours_left = student.get('hours_to_study', 10)
        
        remaining_completion = 100 - cr
        
        # Determine status and timeline
        if success_prob >= 0.70:
            weeks_needed = max(1, int((remaining_completion / 100) * hours_left / 10))
            status_label = "Excellent - On Track"
        elif success_prob >= 0.55:
            weeks_needed = max(2, int((remaining_completion / 100) * hours_left / 8))
            status_label = "Good - Minor Adjustments Needed"
        elif success_prob >= 0.40:
            weeks_needed = max(3, int((remaining_completion / 100) * hours_left / 6))
            status_label = "Moderate - Needs Improvement"
        else:
            weeks_needed = max(4, int((remaining_completion / 100) * hours_left / 4))
            status_label = "At Risk - Immediate Action Required"
        
        roadmap = {
            "current_status": {
                "overall_status": status_label,
                "progress": f"{cr:.0f}% selesai",
                "exam_performance": f"Score: {es:.0f}/100",
                "submission_rating": f"Rating: {sr:.1f}/5"
            },
            "next_steps": [],
            "estimated_completion": f"{weeks_needed} minggu"
        }
        
        # Next steps based on probability
        if success_prob >= 0.70:
            roadmap["next_steps"] = [
                "Step 1: Selesaikan modul advanced & final project",
                "Step 2: Ambil certification exam",
                "Step 3: Build portfolio showcase project",
                "Step 4: Siap lanjut ke level berikutnya"
            ]
        elif success_prob >= 0.55:
            roadmap["next_steps"] = [
                "Step 1: Selesaikan modul yang tertinggal (fokus pada weak areas)",
                "Step 2: Review & retake practice exam untuk score >80",
                "Step 3: Tingkatkan submission quality (target rating 4+)",
                "Step 4: Complete semua assignments sebelum deadline"
            ]
        elif success_prob >= 0.40:
            roadmap["next_steps"] = [
                "Step 1: Fokus pada fundamental concepts (review basics)",
                "Step 2: Join study group atau minta bantuan mentor",
                "Step 3: Submit minimal 50% assignments untuk feedback",
                "Step 4: Target 70%+ completion rate dalam 2 minggu"
            ]
        else:
            roadmap["next_steps"] = [
                "Step 1: URGENT - Meet dengan academic advisor",
                "Step 2: Join intensive tutoring sessions",
                "Step 3: Create daily study schedule dengan mentor",
                "Step 4: Consider course retake atau schedule adjustment"
            ]
        
        # Generate insights
        insights = []
        if sr < 2:
            insights.append("Submission rating rendah - perlu improve assignment quality")
        if cr < 50:
            insights.append("Completion rate <50% - accelerate learning pace")
        elif cr < 70:
            insights.append("Completion rate moderate - maintain steady progress")
        if es < 70:
            insights.append("Exam score <70 - review fundamental concepts")
        elif es >= 90:
            insights.append("Excellent exam performance - strong understanding!")
        if sr == 0:
            insights.append("Belum ada submission - mulai kerjakan assignments!")
        
        # Cross-metric insights
        if es >= 90 and cr < 60:
            insights.append("High exam score but low completion - focus on finishing modules!")
        if cr >= 80 and es < 60:
            insights.append("High completion but low exam - review concepts more deeply!")
        
        roadmap["insights"] = insights if insights else ["Keep up the good work!"]
        
        return roadmap
