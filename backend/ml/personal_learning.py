# Skill Prediction from User Progress 
import pandas as pd
import numpy as np
import re
from collections import Counter
from difflib import SequenceMatcher

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from iterstrat.ml_stratifiers import MultilabelStratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier


PATH = "Personal Learning Assistant.xlsx"
RANDOM_STATE = 42
BASE_THRESHOLD = 0.2
SCALE_THRESHOLD = 0.8

custom_stopwords = [
    'dan','dengan','untuk','pada','dari','yang','ke','di','sebagai','dalam','atas','tentang',
    'memulai','pemrograman','pengenalan','belajar','lanjutan', 'menjadi',
    'modul','kelas','course','materi', 'tingkat','level','bagian','seri',
    'introduction','learning','tutorial', 'module','class','overview','guide','getting','started','how','to','using',
    'membangun','membuat','implementasi','aplikasi','project','studi','kasus',
    'mengenal','bagaimana','cara','menggunakan','pengantar','praktik'
]


def clean_text(text):
    """Clean text"""
    text = "" if pd.isna(text) else str(text)
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\+\#\-\.]', ' ', text)
    return ' '.join(text.split())


def similarity_ratio(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a, b).ratio()


def fuzzy_match_course(user_course, valid_courses_list, threshold=0.4):
    """
    Fuzzy match course dengan multiple methods
    Returns best match or None
    """
    if not user_course or pd.isna(user_course):
        return None
    
    user_clean = clean_text(user_course).strip()
    if not user_clean:
        return None
    
    # Method 1: Exact match
    for valid in valid_courses_list:
        if user_clean == valid:
            return valid
    
    # Method 2: Substring match
    for valid in valid_courses_list:
        if user_clean in valid or valid in user_clean:
            if len(user_clean) > 10 or len(valid) > 10:  
                return valid
    
    # Method 3: Word overlap
    user_words = set(user_clean.split())
    best_match = None
    best_score = 0
    
    for valid in valid_courses_list:
        valid_words = set(valid.split())
        
        # Jaccard similarity
        intersection = len(user_words & valid_words)
        union = len(user_words | valid_words)
        
        if union > 0:
            jaccard = intersection / union
            
            # SequenceMatcher similarity
            seq_sim = similarity_ratio(user_clean, valid)
            
            # Combined score
            score = (jaccard * 0.7) + (seq_sim * 0.3)
            
            if score > best_score and score >= threshold:
                best_score = score
                best_match = valid
    
    return best_match


class SkillPredictor:
    """Skill Predictor"""
    
    def __init__(self):
        self.lr_model = None
        self.tfidf = None
        self.mlb = None
        self.class_thresholds = None
        self.df = None
        self.valid_courses_list = []
        self._trained = False
    
    
    def train(self):
        """Train model"""
        if self._trained:
            print("Model already trained!")
            return
        
        print("🔧 Loading Skill Course data...")
        df = pd.read_excel(PATH, sheet_name="Skill Course")
        
        learning_path_mapping = {
            1: "AI Engineer", 2: "Android Developer", 3: "Back-End Developer JavaScript",
            4: "Back-End Developer Python", 5: "Data Scientist", 6: "DevOps Engineer",
            7: "Front-End Web Developer", 8: "Gen AI Engineer", 9: "Google Cloud Professional",
            10: "iOS Developer", 11: "MLOps Engineer", 12: "Multi-Platform App Developer",
            13: "React Developer"
        }
        
        df['learning_path_name'] = df['learning_path_id'].map(learning_path_mapping)
        df['course_name'] = df['course_name'].fillna('')
        df['learning_path_name'] = df['learning_path_name'].fillna('')
        
        df['skill'] = df['skill'].apply(
            lambda x: [] if pd.isna(x) else [
                s.strip().lower() for s in str(x).split(',')
                if s and s.strip().lower() != 'nan' and s.strip()
            ]
        )
        
        print("Oversampling minority skills")
        all_skills = [s for skills in df['skill'] for s in skills]
        skill_counts = Counter(all_skills)
        minor_skills = [s for s, c in skill_counts.items() if c < 5]
        oversampled_rows = []
        
        for idx, skills in enumerate(df['skill']):
            if any(s in minor_skills for s in skills):
                oversampled_rows.append(df.iloc[idx])
        
        if oversampled_rows:
            df = pd.concat([df, pd.DataFrame(oversampled_rows)], ignore_index=True)
        
        print("Building text features")
        df['text'] = (
            (df['learning_path_name'].apply(clean_text) + ' ') * 2 +
            (df['course_name'].apply(clean_text) + ' ') * 8 +
            (df['skill'].apply(lambda skills: ' '.join(skills)) + ' ') * 2
        )
        
        print("Building TF-IDF")
        tfidf = TfidfVectorizer(
            max_features=3000,
            ngram_range=(1,3),
            min_df=1,
            max_df=0.9,
            sublinear_tf=True,
            norm='l2',
            stop_words=custom_stopwords
        )
        
        X = tfidf.fit_transform(df['text'])
        mlb = MultiLabelBinarizer()
        y = mlb.fit_transform(df['skill'])
        
        print("Splitting data")
        mskf = MultilabelStratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        train_index, test_index = next(mskf.split(X, y))
        X_train, X_test = X[train_index], X[test_index]
        y_train, y_test = y[train_index], y[test_index]
        
        print("Training model")
        lr_model = OneVsRestClassifier(
            LogisticRegression(
                C=1.0,
                penalty='l2',
                solver='lbfgs',
                max_iter=1000,
                class_weight='balanced',
                random_state=RANDOM_STATE
            ),
            n_jobs=-1
        )
        lr_model.fit(X_train, y_train)
        
        print("Calculating thresholds")
        y_train_proba = 1 / (1 + np.exp(-lr_model.decision_function(X_train)))
        class_thresholds = BASE_THRESHOLD + SCALE_THRESHOLD * y_train_proba.mean(axis=0)
        
        # Store valid courses as LIST for fuzzy matching
        valid_courses_list = [clean_text(c).strip() for c in df['course_name'].unique() if c and not pd.isna(c)]
        valid_courses_list = [c for c in valid_courses_list if c]  # Remove empty
        
        self.lr_model = lr_model
        self.tfidf = tfidf
        self.mlb = mlb
        self.class_thresholds = class_thresholds
        self.df = df
        self.valid_courses_list = valid_courses_list
        self._trained = True
        
        print("Model trained successfully!")
        print(f"Total skills: {len(mlb.classes_)}")
        print(f"Total valid courses: {len(valid_courses_list)}")
    
    
    def predict_skills(self, text):
        """Predict skills from text"""
        if not self._trained:
            raise Exception("Model not trained!")
        
        text_clean = clean_text(text)
        X_new = self.tfidf.transform([text_clean])
        proba = 1 / (1 + np.exp(-self.lr_model.decision_function(X_new)))[0]
        pred = (proba > self.class_thresholds).astype(int)
        predicted_skills = self.mlb.inverse_transform(pred.reshape(1, -1))[0]
        return list(predicted_skills)
    
    
    def predict_user_progress(self, df_user):
        """
        Predict skills untuk SEMUA USER 
        """
        if not self._trained:
            raise Exception("Model not trained!")
        
        results = []
        total_users = len(df_user)
        
        print(f"\n{'='*80}")
        print(f"PREDICTING SKILLS FOR {total_users} USERS")
        print(f"{'='*80}\n")
        
        for idx, row in df_user.iterrows():
            name = str(row.get("name", "Unknown"))
            email = str(row.get("email", "unknown@email.com"))
            lp_raw = row.get("learning_path_id", "")
            course_raw = row.get("course_name", "")
            
            print(f"[{idx+1}/{total_users}] 👤 {name}")
            print(f"{email}")
            
            lp = clean_text(lp_raw) if lp_raw and not pd.isna(lp_raw) else ""
            
            # FUZZY MATCH COURSE
            matched_course = fuzzy_match_course(course_raw, self.valid_courses_list, threshold=0.3)
            
            predicted = []
            
            if matched_course:
                print(f"Course matched: '{course_raw}' → '{matched_course}'")
                text = f"{lp} {matched_course}".strip()
                predicted = self.predict_skills(text)
            elif lp:
                print(f"Course not matched, using LP: '{lp_raw}'")
                predicted = self.predict_skills(lp)
            else:
                print(f"No valid data (no LP and no course)")
            
            print(f"Skills detected: {len(predicted)}")
            if predicted:
                print(f"     → {', '.join(predicted[:8])}{'...' if len(predicted) > 8 else ''}")
            print()
            
            results.append({
                "name": name,
                "email": email,
                "predicted_skills": ", ".join(predicted) if predicted else ""
            })
        
        print(f"{'='*80}")
        print(f"PREDICTION COMPLETE!")
        print(f"{'='*80}\n")
        
        return pd.DataFrame(results)
    
    
    def predict_from_excel(self, sheet_name="Tracking Progress Pengguna"):
        """Predict dari Excel - SEMUA USER"""
        if not self._trained:
            self.train()
        
        print(f"\nLoading '{sheet_name}' from {PATH}")
        df_user = pd.read_excel(PATH, sheet_name=sheet_name)
        print(f"Total users to process: {len(df_user)}\n")
        
        predictions = self.predict_user_progress(df_user)
        
        # Summary
        total_with_skills = (predictions['predicted_skills'] != '').sum()
        print(f"SUMMARY:")
        print(f"   Total users: {len(predictions)}")
        print(f"   Users with skills detected: {total_with_skills}")
        print(f"   Users without skills: {len(predictions) - total_with_skills}")
        
        return predictions
    
    
    def get_all_skills(self):
        """Get all available skills"""
        if not self._trained:
            raise Exception("Model not trained!")
        return list(self.mlb.classes_)