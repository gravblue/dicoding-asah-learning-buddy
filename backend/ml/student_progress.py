import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

class HybridLearningRecommender:
    def __init__(self):
        self.content_similarity = None
        self.success_predictor = None
        self.scaler = StandardScaler()
        self.label_encoders = {}

    # DATA PREPARATION (FIXED - Handle 'name' vs 'course_name'!)
    def prepare_data(self, lp_answer, course, stud_progress, tutorials):
        print("\n🔍 DEBUG: Starting prepare_data...")
        
        course_features = lp_answer.copy()
        
        # Standardize column name 'name' -> 'course_name'
        if 'name' in course_features.columns and 'course_name' not in course_features.columns:
            course_features['course_name'] = course_features['name']
            print("Renamed 'name' to 'course_name' in course_features")
        
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

        print(f"course_features columns: {course_features.columns.tolist()}")
        if 'course_name' in course_features.columns:
            print(f"course_features sample:\n{course_features[['course_name', 'course_difficulty', 'technologies']].head(3)}")

        course_data = course.copy()
        
        # Standardize column name 'name' -> 'course_name' in course_data too
        if 'name' in course_data.columns and 'course_name' not in course_data.columns:
            course_data['course_name'] = course_data['name']
            print("Renamed 'name' to 'course_name' in course_data")
        
        print(f"course_data BEFORE merge columns: {course_data.columns.tolist()}")
        
        # Merge course_difficulty & technologies dari lp_answer ke course_data
        if 'course_name' in course_data.columns and 'course_name' in course_features.columns:
            print("Both have 'course_name', proceeding with merge...")
            
            # Ambil hanya kolom yang dibutuhkan dari course_features
            merge_df = course_features[['course_name', 'course_difficulty', 'technologies']].copy()
            print(f"merge_df shape: {merge_df.shape}")
            print(f"merge_df sample:\n{merge_df.head(3)}")
            
            # Merge ke course_data
            course_data = course_data.merge(
                merge_df,
                on='course_name',
                how='left',
                suffixes=('', '_lp')
            )
            
            print(f"course_data AFTER merge columns: {course_data.columns.tolist()}")
            
            # Jika ada duplikat kolom, prioritaskan dari lp_answer
            if 'course_difficulty_lp' in course_data.columns:
                print("Found duplicate 'course_difficulty_lp', merging...")
                course_data['course_difficulty'] = course_data['course_difficulty_lp'].fillna(
                    course_data.get('course_difficulty', 'N/A')
                )
                course_data.drop(columns=['course_difficulty_lp'], inplace=True)
            
            if 'technologies_lp' in course_data.columns:
                print("Found duplicate 'technologies_lp', merging...")
                course_data['technologies'] = course_data['technologies_lp'].fillna(
                    course_data.get('technologies', 'N/A')
                )
                course_data.drop(columns=['technologies_lp'], inplace=True)
            
            # Fill NaN dengan 'N/A' jika masih ada
            if 'course_difficulty' not in course_data.columns:
                print("ERROR: 'course_difficulty' not in course_data after merge!")
                course_data['course_difficulty'] = 'N/A'
            else:
                course_data['course_difficulty'] = course_data['course_difficulty'].fillna('N/A')
                
            if 'technologies' not in course_data.columns:
                print("ERROR: 'technologies' not in course_data after merge!")
                course_data['technologies'] = 'N/A'
            else:
                course_data['technologies'] = course_data['technologies'].fillna('N/A')
            
            print(f"course_data FINAL sample:\n{course_data[['course_name', 'course_difficulty', 'technologies']].head(3)}")
        else:
            print("ERROR: Missing 'course_name' in one of the dataframes!")

        stud_metrics = stud_progress.copy()
        
        # Standardize column name 'name' -> 'course_name' in stud_progress
        if 'name' in stud_metrics.columns and 'course_name' not in stud_metrics.columns:
            # Ini untuk student name, jangan direname
            pass
        
        # Check if course_name exists or needs to be created from course reference
        if 'course_name' not in stud_metrics.columns:
            print("WARNING: 'course_name' not found in stud_metrics")
        
        numeric_cols = ['completed_tutorials', 'active_tutorials', 'exam_score', 'submission_rating']
        for col in numeric_cols:
            if col in stud_metrics.columns:
                stud_metrics[col] = pd.to_numeric(stud_metrics[col], errors='coerce').fillna(0)

        total_tutorials = stud_metrics['completed_tutorials'] + stud_metrics['active_tutorials']
        stud_metrics['completion_rate'] = np.where(
            total_tutorials > 0,
            (stud_metrics['completed_tutorials'] / total_tutorials) * 100,
            0
        )

        stud_metrics = stud_metrics.merge(
            course_data[['course_name', 'course_level_str', 'hours_to_study', 'learning_path_id']],
            on='course_name',
            how='left'
        )

        if 'hours_to_study' not in stud_metrics.columns:
            stud_metrics['hours_to_study'] = 10
        else:
            stud_metrics['hours_to_study'] = pd.to_numeric(stud_metrics['hours_to_study'], errors='coerce').fillna(10)

        for col in ['course_level_str', 'course_name']:
            if col in stud_metrics.columns:
                le = LabelEncoder()
                stud_metrics[col] = stud_metrics[col].astype(str)
                stud_metrics[f'{col}_encoded'] = le.fit_transform(stud_metrics[col])
                self.label_encoders[col] = le

        if 'password' not in stud_metrics.columns:
            stud_metrics['password'] = 'N/A'

        print("prepare_data completed!\n")
        return course_features, stud_metrics, course_data

    # CONTENT-BASED MODEL
    def build_content_based_model(self, course_features):
        tfidf = TfidfVectorizer(stop_words='english', max_features=100)
        tfidf_matrix = tfidf.fit_transform(course_features['combined_features'])
        self.content_similarity = cosine_similarity(tfidf_matrix)
        return self.content_similarity

    # COURSE RECOMMENDATION (WITH DEBUG LOGGING!)
    def recommend_courses(self, course_name, course_features, course_data, top_n=3):
        print(f"\nDEBUG: recommend_courses for '{course_name}'")
        print(f"course_data has columns: {course_data.columns.tolist()}")
        
        current_course = course_data[course_data['course_name'] == course_name]
        if current_course.empty:
            print(f"Course '{course_name}' not found!")
            return pd.DataFrame()

        current_level_str = str(current_course.iloc[0]['course_level_str']).strip()
        current_lp_id = current_course.iloc[0]['learning_path_id']

        try:
            current_level_num = int(current_level_str)
        except:
            current_level_num = 0

        # Filter by same learning path
        filtered = course_data[course_data['learning_path_id'] == current_lp_id].copy()

        # Convert level to integer
        filtered['course_level_int'] = pd.to_numeric(
            filtered['course_level_str'], errors='coerce'
        ).fillna(0).astype(int)

        # Take only courses with higher level
        same_path_courses = filtered[
            (filtered['course_level_int'] > current_level_num) &
            (filtered['course_name'] != course_name)
        ].sort_values('course_level_int')

        print(f"Found {len(same_path_courses)} courses in same path")

        # Level mapping sebagai fallback
        level_map = {
            "1": "Dasar",
            "2": "Pemula",
            "3": "Menengah",
            "4": "Mahir",
            "5": "Profesional"
        }

        recommendations = []
        for idx, row in same_path_courses.head(top_n).iterrows():
            course_name_rec = row['course_name']
            
            # CHECK if columns exist
            has_difficulty = 'course_difficulty' in row.index
            has_tech = 'technologies' in row.index
            
            print(f"\nProcessing: {course_name_rec}")
            print(f"     Has course_difficulty? {has_difficulty}")
            print(f"     Has technologies? {has_tech}")
            
            # Ambil langsung dari course_data yang sudah di-merge!
            difficulty = row.get('course_difficulty', 'N/A') if has_difficulty else 'N/A'
            technologies = row.get('technologies', 'N/A') if has_tech else 'N/A'
            
            print(f"     Raw difficulty: '{difficulty}'")
            print(f"     Raw technologies: '{technologies}'")
            
            # Fallback ke level mapping jika masih N/A atau empty
            if str(difficulty).strip() in ['N/A', '', 'None', 'nan', 'NaN']:
                difficulty = level_map.get(str(row['course_level_str']).strip(), "N/A")
                print(f"     Fallback difficulty: '{difficulty}'")
            
            if str(technologies).strip() in ['N/A', '', 'None', 'nan', 'NaN']:
                technologies = 'N/A'
            
            recommendations.append({
                'name': course_name_rec,
                'course_difficulty': str(difficulty),
                'technologies': str(technologies),
                'hours_to_study': row.get('hours_to_study', 'N/A')
            })

        print(f"\nReturning {len(recommendations)} recommendations\n")
        return pd.DataFrame(recommendations)

    # CLASSIFICATION MODEL
    def build_classification_model(self, stud_metrics):
        features = ['completion_rate', 'active_tutorials', 'completed_tutorials',
                    'course_level_str_encoded', 'hours_to_study']

        X = stud_metrics[features].fillna(0)

        y = ((stud_metrics['is_graduated'] == 1) |
             (stud_metrics['exam_score'] > 75)).astype(int)

        if len(y.unique()) == 1:
            normalized_cr = stud_metrics['completion_rate'] / 100
            normalized_exam = stud_metrics['exam_score'] / 100
            weighted = (normalized_cr * 0.5 + normalized_exam * 0.5)
            y = (weighted >= 0.65).astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(y.unique()) > 1 else None
        )

        self.success_predictor = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.success_predictor.fit(X_train, y_train)

        y_train_pred = self.success_predictor.predict(X_train)
        train_accuracy = accuracy_score(y_train, y_train_pred)

        y_test_pred = self.success_predictor.predict(X_test)
        test_accuracy = accuracy_score(y_test, y_test_pred)

        return self.success_predictor, train_accuracy, test_accuracy

    # SUCCESS PROBABILITY
    def predict_success(self, student_data):
        features = ['completion_rate', 'active_tutorials', 'completed_tutorials',
                    'course_level_str_encoded', 'hours_to_study']

        X = student_data[features].fillna(0)
        if len(X) == 0:
            return 0.0

        cr = student_data['completion_rate'].values[0]
        exam = student_data['exam_score'].values[0] if 'exam_score' in student_data else 0
        sr = student_data['submission_rating'].values[0] if 'submission_rating' in student_data else 0

        norm_cr = cr / 100
        norm_exam = exam / 100
        norm_sr = sr / 5

        final_prob = (norm_cr * 0.25) + (norm_exam * 0.35) + (norm_sr * 0.40)

        return min(final_prob, 0.95)

    # LEARNING STRATEGY
    def generate_learning_strategy(self, student_email, stud_metrics, course_features, course_data):
        student = stud_metrics[stud_metrics['email'] == student_email]
        if len(student) == 0:
            return {"error": "Student not found"}

        student = student.iloc[0]
        current_course = student['course_name']

        recommendations = self.recommend_courses(current_course, course_features, course_data, top_n=3)
        recommended_list = recommendations.to_dict('records') if not recommendations.empty else []

        temp_student = stud_metrics[stud_metrics['email'] == student_email].copy()
        for col in ['completion_rate', 'exam_score', 'submission_rating', 'active_tutorials', 'completed_tutorials', 'hours_to_study']:
            if col not in temp_student.columns:
                temp_student[col] = 0

        success_prob = self.predict_success(temp_student)

        adaptive_roadmap = self._generate_adaptive_roadmap(student, success_prob)

        strategy = {
            "student_name": student['name'],
            "email": student_email,
            "password": student.get('password', 'N/A'),
            "current_course": current_course,
            "completion_rate": student.get('completion_rate', 0),
            "exam_score": student.get('exam_score', 0),
            "submission_rating": student.get('submission_rating', 0),
            "success_probability": success_prob,
            "recommended_courses": recommended_list,
            "adaptive_roadmap": adaptive_roadmap
        }
        return strategy

    # ADAPTIVE ROADMAP
    def _generate_adaptive_roadmap(self, student, success_prob):
        cr = student['completion_rate']
        es = student['exam_score']
        sr = student['submission_rating']
        hours_left = student.get('hours_to_study', 10)

        remaining_completion = 100 - cr

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

        if es >= 90 and cr < 60:
            insights.append("High exam score but low completion - focus on finishing modules!")
        if cr >= 80 and es < 60:
            insights.append("High completion but low exam - review concepts more deeply!")

        roadmap["insights"] = insights if insights else ["Keep up the good work!"]

        return roadmap


# MAIN FUNCTION - untuk testing/debugging
def main(lp_answer, course, stud_progress, tutorials):
    recommender = HybridLearningRecommender()
    course_features, stud_metrics, course_data = recommender.prepare_data(
        lp_answer, course, stud_progress, tutorials
    )
    recommender.build_content_based_model(course_features)
    model, train_acc, test_acc = recommender.build_classification_model(stud_metrics)

    return recommender, stud_metrics, course_features, course_data, train_acc, test_acc


# PRINT STUDENT RESULTS FUNCTION
def print_all_students_results(recommender, stud_metrics, course_features, course_data):
    for email in stud_metrics['email'].unique():
        strategy = recommender.generate_learning_strategy(
            email, stud_metrics, course_features, course_data
        )

        print(f"\n{'='*70}")
        print(f"👤 Student: {strategy['student_name']} ({strategy['email']})")
        print(f"{'='*70}")

        print(f"\nCurrent Course:")
        print(f"  - {strategy['current_course']}")

        print(f"\nCurrent Status:")
        print(f"  - Completion Rate: {strategy['completion_rate']:.1f}%")
        print(f"  - Exam Score: {strategy['exam_score']:.0f}/100")
        print(f"  - Submission Rating: {strategy['submission_rating']:.1f}/5")
        print(f"  - Success Probability: {strategy['success_probability']*100:.1f}%")
        print(f"  - Overall Status: {strategy['adaptive_roadmap']['current_status']['overall_status']}")

        print(f"\nRecommended Next Courses:")
        if strategy['recommended_courses']:
            for i, course_rec in enumerate(strategy['recommended_courses'], 1):
                duration = f" ({course_rec['hours_to_study']}h)" if course_rec['hours_to_study'] != 'N/A' else ""
                print(f"  {i}. {course_rec['name']} ({course_rec['course_difficulty']}) - Duration{duration}")
        else:
            print("  Tidak ada rekomendasi")

        print(f"\nLearning Roadmap:")
        for i, step in enumerate(strategy['adaptive_roadmap']['next_steps'], 1):
            print(f"  {i}. {step}")

        print(f"\nEstimated Completion: {strategy['adaptive_roadmap']['estimated_completion']}")

        if strategy['adaptive_roadmap']['insights']:
            print(f"\nKey Insights:")
            for insight in strategy['adaptive_roadmap']['insights']:
                print(f"  - {insight}")


if __name__ == "__main__":
    pass