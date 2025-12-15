# Roadmap Generator - Next Skill Prediction

from __future__ import annotations

import re
from typing import List, Dict, Any
import pandas as pd
import numpy as np

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.model_selection import train_test_split
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.ensemble import RandomForestClassifier
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


class RoadmapGenerator:
    """Roadmap Generator - prediksi skill berikutnya"""
    
    def __init__(self):
        self.df = None
        self.tfidf = None
        self.skill_tfidf = None
        self.lp_tfidf = None
        self.rf_model = None
        self.level_order = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}
    
    def load_data(self, skill_df: pd.DataFrame):
        """Load dan prepare data"""
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn required!")
        
        self.df = skill_df.fillna("")
        self.df["level_num"] = self.df["skill_level"].map(self.level_order)
        
        # TF-IDF untuk skill
        self.df["skill_text"] = self.df["skill"] + " " + self.df["description"]
        self.tfidf = TfidfVectorizer()
        self.skill_tfidf = self.tfidf.fit_transform(self.df["skill_text"])
        
        # TF-IDF untuk learning path
        self.df["lp_text"] = self.df["learning_path_name"] + " " + self.df["skill_text"]
        self.lp_tfidf = self.tfidf.fit_transform(self.df["lp_text"])
        
        print(f"Loaded {len(self.df)} skills")
    
    def _parse_prereq(self, prereq: str) -> List[str]:
        """Parse prerequisite string"""
        if prereq == "":
            return []
        text = prereq.lower()
        text = re.sub(r" and |&|\+|/|;", ",", text)
        parts = [p.strip() for p in text.split(",") if p.strip()]
        return parts
    
    def _match_skill(self, token: str) -> str:
        """Match token to skill name"""
        token = token.lower()
        for s in self.df["skill"].str.lower():
            s_clean = s.split("(")[0].strip()
            if token == s_clean or token in s_clean or s_clean in token:
                return s_clean
        return None
    
    def detect_learning_path(self, query: str) -> str:
        """Detect learning path from query"""
        q_vec = self.tfidf.transform([query])
        lp_scores = {}
        
        for lp in self.df["learning_path_name"].unique():
            lp_skills = self.df[self.df["learning_path_name"] == lp]
            lp_vec = self.tfidf.transform(lp_skills["skill_text"])
            sims = cosine_similarity(q_vec, lp_vec).max()
            lp_scores[lp] = sims
        
        best_lp = max(lp_scores, key=lp_scores.get)
        return best_lp
    
    def find_current_skill(self, query: str):
        """Find single current skill from query - FIXED"""
        query_lower = query.lower()
        
        # Case-insensitive search
        df_filtered = self.df[
            self.df["skill"].str.lower().str.contains(query_lower, na=False, regex=False)
        ]
        
        if df_filtered.empty:
            return None
        
        min_idx = df_filtered["level_num"].idxmin()
        
        if min_idx not in df_filtered.index:
            return None
        
        return df_filtered.loc[min_idx]
    
    def find_current_skills(self, query: str) -> List[Dict]:
        """Find multiple current skills - FIXED with better detection"""
        matched_skills = []
        query_lower = query.lower()
        
        # Extract common tech keywords
        tech_keywords = [
            'html', 'css', 'javascript', 'js', 'react', 'vue', 'angular',
            'python', 'java', 'php', 'nodejs', 'node.js', 'typescript', 'swift',
            'kotlin', 'flutter', 'dart', 'sql', 'mysql', 'mongodb', 'postgresql',
            'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
            'bootstrap', 'tailwind', 'sass', 'webpack', 'jest', 'redux',
            'express', 'django', 'flask', 'spring', 'laravel', 'rails',
            'restful', 'graphql', 'api', 'json', 'xml', 'ajax',
            'responsive', 'frontend', 'backend', 'fullstack', 'devops',
            'android', 'ios', 'mobile', 'web', 'cloud', 'database'
        ]
        
        # Check each keyword in query
        for keyword in tech_keywords:
            if keyword in query_lower:
                # Search in dataframe (case-insensitive)
                skill_rows = self.df[
                    self.df["skill"].str.lower().str.contains(keyword, na=False, regex=False)
                ]
                
                if not skill_rows.empty:
                    # Get lowest level (beginner) first
                    min_idx = skill_rows["level_num"].idxmin()
                    matched_skills.append(skill_rows.loc[min_idx])
        
        # If still no match, try word-by-word
        if not matched_skills:
            words = query_lower.split()
            for word in words:
                if len(word) > 2:  # Skip very short words
                    skill_rows = self.df[
                        self.df["skill"].str.lower().str.contains(word, na=False, regex=False)
                    ]
                    if not skill_rows.empty:
                        min_idx = skill_rows["level_num"].idxmin()
                        matched_skills.append(skill_rows.loc[min_idx])
        
        # Remove duplicates
        if matched_skills:
            seen = set()
            unique_skills = []
            for skill in matched_skills:
                skill_name = skill["skill"]
                if skill_name not in seen:
                    seen.add(skill_name)
                    unique_skills.append(skill)
            return unique_skills
        
        return []
    
    def train_model(self):
        """Train Random Forest model"""
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn required!")
        
        print("Training model")
        
        # Create positive pairs (prerequisite relationships)
        pairs = []
        for _, row in self.df.iterrows():
            curr = row["skill"]
            curr_level = row["level_num"]
            prereq_tokens = self._parse_prereq(row["prerequisite"])
            
            if not prereq_tokens:
                continue
            
            for p in prereq_tokens:
                matched_skill = self._match_skill(p)
                if matched_skill is None:
                    continue
                
                parent_rows = self.df[self.df["skill"].str.lower().str.startswith(matched_skill)]
                if parent_rows.empty:
                    continue
                
                parent = parent_rows.iloc[0]
                pairs.append({
                    "current_skill": parent["skill"],
                    "next_skill": curr,
                    "current_level": parent["level_num"],
                    "next_level": curr_level,
                    "is_prerequisite": 1
                })
        
        positive_pairs = pd.DataFrame(pairs)
        
        # Create negative pairs
        neg_pairs = []
        for _ in range(len(positive_pairs)):
            sample = self.df.sample(2).reset_index(drop=True)
            a = sample.iloc[0]
            b = sample.iloc[1]
            neg_pairs.append({
                "current_skill": a["skill"],
                "next_skill": b["skill"],
                "current_level": a["level_num"],
                "next_level": b["level_num"],
                "is_prerequisite": 0
            })
        
        negative_pairs = pd.DataFrame(neg_pairs)
        pairs_df = pd.concat([positive_pairs, negative_pairs]).reset_index(drop=True)
        
        # Feature extraction
        X_features = []
        y_labels = pairs_df["is_prerequisite"].values
        
        for _, row in pairs_df.iterrows():
            curr_idx = self.df[self.df["skill"] == row["current_skill"]].index[0]
            next_idx = self.df[self.df["skill"] == row["next_skill"]].index[0]
            sim = cosine_similarity(self.skill_tfidf[curr_idx], self.skill_tfidf[next_idx])[0][0]
            
            X_features.append([
                sim,
                row["next_level"] - row["current_level"],
                row["current_level"],
                row["next_level"],
            ])
        
        X = np.array(X_features)
        y = y_labels
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest
        self.rf_model = RandomForestClassifier(
            n_estimators=120,
            max_depth=7,
            min_samples_split=4,
            random_state=42,
            class_weight="balanced",
            n_jobs=-1
        )
        self.rf_model.fit(X_train, y_train)
        
        train_acc = self.rf_model.score(X_train, y_train)
        test_acc = self.rf_model.score(X_test, y_test)
        
        print(f"Train accuracy: {train_acc:.3f}")
        print(f"Test accuracy: {test_acc:.3f}")
        
        return train_acc, test_acc
    
    def predict_next_skills(self, query: str, top_n: int = 5) -> pd.DataFrame:
        """Predict next skills"""
        if self.rf_model is None:
            raise ValueError("Model not trained! Call train_model() first")
        
        #  Better logging
        print(f"\nPredicting next skills for query: '{query}'")
        
        current_skills = self.find_current_skills(query)
        
        if not current_skills or len(current_skills) == 0:
            print("No current skills detected from query")
            print(f"   Query: {query}")
            
            # Try to detect learning path at least
            lp = self.detect_learning_path(query)
            print(f"   Detected Learning Path: {lp}")
            
            # Return beginner skills from detected LP
            if lp:
                lp_skills = self.df[self.df["learning_path_name"] == lp]
                beginner_skills = lp_skills[lp_skills["level_num"] == 1]
                
                if not beginner_skills.empty:
                    print(f"Returning {len(beginner_skills)} beginner skills from {lp}")
                    result = beginner_skills[["skill", "skill_level", "prerequisite"]].copy()
                    result["probability"] = 0.8
                    return result.head(top_n)
            
            print("No fallback skills available")
            return pd.DataFrame()
        
        # Log detected skills
        detected_names = [s["skill"] for s in current_skills]
        print(f"Detected {len(detected_names)} current skills: {detected_names}")
        
        all_predictions = []
        
        # Get current skill names
        current_skill_names = set()
        for curr in current_skills:
            skill_lower = curr["skill"].lower().split("(")[0].strip()
            current_skill_names.add(skill_lower)
        
        lp = current_skills[0]["learning_path_name"]
        max_curr_level = max(curr["level_num"] for curr in current_skills)
        
        print(f"   Learning Path: {lp}")
        print(f"   Max Current Level: {max_curr_level}")
        
        lp_skills = self.df[self.df["learning_path_name"] == lp].copy()
        
        # Filter candidates by prerequisites
        def prereqs_satisfied(row):
            prereq_tokens = self._parse_prereq(row["prerequisite"])
            if not prereq_tokens:
                return False
            
            matched_prereqs = set()
            for token in prereq_tokens:
                matched = self._match_skill(token)
                if matched:
                    matched_prereqs.add(matched)
            
            if len(matched_prereqs) == 0:
                return False
            
            matched_count = 0
            for curr_name in current_skill_names:
                for prereq in matched_prereqs:
                    if curr_name in prereq or prereq in curr_name:
                        matched_count += 1
                        break
            
            if len(current_skill_names) == 1:
                return matched_count >= 1
            else:
                return matched_count == len(current_skill_names)
        
        candidates = lp_skills[lp_skills.apply(prereqs_satisfied, axis=1)]
        candidates = candidates[candidates["level_num"] >= max_curr_level]
        
        print(f"   Found {len(candidates)} candidate next skills")
        
        # Calculate probabilities
        for _, cand in candidates.iterrows():
            next_idx = cand.name
            similarities = []
            
            for curr in current_skills:
                curr_idx = curr.name
                sim = cosine_similarity(self.skill_tfidf[curr_idx], self.skill_tfidf[next_idx])[0][0]
                similarities.append(sim)
            
            avg_sim = np.mean(similarities)
            features = np.array([[avg_sim, cand["level_num"] - max_curr_level, max_curr_level, cand["level_num"]]])
            prob = self.rf_model.predict_proba(features)[0][1]
            
            # Level boost
            level_boost = 1.0
            if cand["level_num"] == max_curr_level + 1:
                level_boost = 1.2
            elif cand["level_num"] == max_curr_level:
                level_boost = 1.1
            
            all_predictions.append({
                "skill": cand["skill"],
                "skill_level": cand["skill_level"],
                "prerequisite": cand["prerequisite"],
                "probability": prob * level_boost,
                "level_num": cand["level_num"]
            })
        
        if not all_predictions:
            print("No predictions generated")
            return pd.DataFrame()
        
        result_df = pd.DataFrame(all_predictions)
        
        # Hitung total prerequisite
        result_df["total_prereq"] = result_df["prerequisite"].apply(lambda x: len(self._parse_prereq(x)))
        
        # Sort: level ascending, total_prereq ascending, probability descending
        result_df = result_df.sort_values(
            ["level_num", "total_prereq", "probability"],
            ascending=[True, True, False]
        )
        
        result_df = result_df.drop(columns=["level_num", "total_prereq"])
        result_df = result_df.drop_duplicates(subset=["skill"])
        
        print(f"Returning {len(result_df)} next skill recommendations")
        
        return result_df.head(top_n)
