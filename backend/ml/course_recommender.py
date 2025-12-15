# Course Recommender menggunakan Sentence Transformers

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    import torch
    SENTENCE_TRANSFORMER_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMER_AVAILABLE = False
    SentenceTransformer = None
    torch = None

try:
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    cosine_similarity = None


MODEL_NAME = "BAAI/bge-base-en-v1.5"
EMBEDDINGS_PATH = Path(__file__).parent / "models" / "course_embeddings.pt"


def clean_text(text) -> str:
    """
    Clean text untuk preprocessing 
    """
    if pd.isna(text):
        return ""
    text = str(text).lower()
    text = text.replace("-", " ")
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def clean_dataframe_for_json(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean DataFrame untuk JSON compliance
    - Replace NaN dengan None
    - Replace Infinity dengan None
    - Convert numpy types ke Python native types
    """
    df = df.copy()
    
    # Replace NaN dan Infinity
    df = df.replace([np.inf, -np.inf], None)
    df = df.where(pd.notna(df), None)
    
    # Convert numpy types ke Python native
    for col in df.columns:
        if df[col].dtype == np.float64 or df[col].dtype == np.float32:
            df[col] = df[col].astype(object).where(df[col].notna(), None)
        elif df[col].dtype == np.int64 or df[col].dtype == np.int32:
            df[col] = df[col].astype(object).where(df[col].notna(), None)
    
    return df


class CourseRecommenderST:
    """
    Course Recommender 
    """
    
    def __init__(self):
        self.model = None
        self.embeddings = None
        self.lp_combined = None
        self.learning_path_mapping = {
            1: "AI Engineer",
            2: "Android Developer",
            3: "Back-End Developer JavaScript",
            4: "Back-End Developer Python",
            5: "Data Scientist",
            6: "DevOps Engineer",
            7: "Front-End Web Developer",
            8: "Gen AI Engineer",
            9: "Google Cloud Professional",
            10: "iOS Developer",
            11: "MLOps Engineer",
            12: "Multi-Platform App Developer",
            13: "React Developer"
        }
        
        if SENTENCE_TRANSFORMER_AVAILABLE:
            try:
                self.model = SentenceTransformer(MODEL_NAME)
            except Exception as e:
                print(f"Failed to load Sentence Transformer: {e}")
    
    def load_data(self, lp_answer_df: pd.DataFrame, course_df: pd.DataFrame):
        """
        Load data dan prepare courses
        
        Args:
            lp_answer_df: DataFrame Learning Path Answer
            course_df: DataFrame Course
        """
        self.prepare_courses(lp_answer_df, course_df)
        
        # Auto load atau build embeddings
        if not self.load_embeddings():
            print("Building new embeddings")
            self.build_embeddings(save=True)
    
    def prepare_courses(self, lp_answer_df: pd.DataFrame, course_df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare course data
        """
        course_level_mapping = {
            1: "Beginner",
            2: "Beginner",
            3: "Intermediate",
            4: "Advanced",
            5: "Advanced"
        }
        
        # Prepare course 
        course_df = course_df.copy()
        course_df['learning_path'] = course_df['learning_path_id'].map(self.learning_path_mapping)
        course_df['course_level'] = course_df['course_level_str'].map(course_level_mapping)
        
        # Simple merge - ambil semua kolom yang dibutuhkan
        merge_cols = ['course_name', 'course_level', 'learning_path']
        
        # Tambahkan kolom optional jika ada
        for col in ['course_price', 'technologies']:
            if col in course_df.columns:
                merge_cols.append(col)
        
        lp_combined = lp_answer_df.merge(
            course_df[merge_cols],
            left_on='name',
            right_on='course_name',
            how='left'
        )
        
        # Combined text 
        # Gunakan technologies dari course_df jika ada, fallback ke lp_answer
        if 'technologies_y' in lp_combined.columns:
            lp_combined['tech_final'] = lp_combined['technologies_y'].fillna(lp_combined['technologies_x'].fillna(''))
        elif 'technologies' in lp_combined.columns:
            lp_combined['tech_final'] = lp_combined['technologies'].fillna('')
        else:
            lp_combined['tech_final'] = ''
        
        lp_combined['combined_text'] = (
            lp_combined['learning_path'].fillna('') + " " +
            lp_combined['course_level'].fillna('') + " " +
            lp_combined['course_name'].fillna('') + " " +
            lp_combined['description'].fillna('') + " " +
            lp_combined['tech_final']
        ).apply(clean_text)
        
        self.lp_combined = lp_combined
        return lp_combined
    
    def build_embeddings(self, save: bool = True) -> Optional[Any]:
        """
        Build embeddings
        """
        if not SENTENCE_TRANSFORMER_AVAILABLE or self.model is None:
            print("Sentence Transformer not available. Skipping embeddings.")
            return None
        
        if self.lp_combined is None:
            raise ValueError("Call prepare_courses() first")
        
        texts = self.lp_combined['combined_text'].tolist()
        self.embeddings = self.model.encode(texts, show_progress_bar=True)
        
        if save and torch is not None:
            EMBEDDINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
            torch.save(self.embeddings, EMBEDDINGS_PATH)
            print(f"Embeddings saved to {EMBEDDINGS_PATH}")
        
        return self.embeddings
    
    def load_embeddings(self) -> bool:
        """
        Load embeddings dari file.
        """
        if not EMBEDDINGS_PATH.exists():
            return False
        
        if torch is None:
            return False
        
        try:
            self.embeddings = torch.load(EMBEDDINGS_PATH, weights_only=True)
            print(f"Embeddings loaded from {EMBEDDINGS_PATH}")
            return True
        except Exception as e:
            print(f"Failed to load embeddings: {e}")
            return False
    
    def recommend(
        self,
        user_input: str,
        user_level: Optional[str] = None,
        top_k: int = 10
    ) -> pd.DataFrame:
        """
        Rekomendasi course 
        
        Args:
            user_input: Job role user (e.g., "Front-End Web Developer")
            user_level: Level user (Beginner/Intermediate/Advanced)
            top_k: Jumlah rekomendasi
        """
        if not SENTENCE_TRANSFORMER_AVAILABLE or self.model is None or self.embeddings is None:
            return self._fallback_recommend(user_input, user_level, top_k)
        
        # STEP 1: Prepare input 
        final_input = f"{user_input} {user_level}" if user_level else user_input
        input_clean = clean_text(final_input)
        user_emb = self.model.encode([input_clean])
        
        # STEP 2: Calculate similarity 
        sim_scores = cosine_similarity(user_emb, self.embeddings).flatten()
        
        df = self.lp_combined.copy()
        df['sim'] = sim_scores
        
        # STEP 3: Filter by learning_path 
        matched_lp = None
        for lp in self.learning_path_mapping.values():
            if lp.lower() in user_input.lower():
                matched_lp = lp
                break
        
        if matched_lp:
            df = df[df['learning_path'] == matched_lp]
        
        # STEP 4: Filter by level
        if user_level:
            df = df[df['course_level'].str.lower() == user_level.lower()]
        
        # STEP 5: Sort by similarity dan ambil top-K 
        df = df.sort_values(by='sim', ascending=False).head(top_k)
        
        # Return dengan kolom yang ada
        result_cols = ['course_name', 'course_level', 'learning_path']
        if 'summary' in df.columns:
            result_cols.append('summary')
        if 'course_price' in df.columns:
            result_cols.append('course_price')
        
        result_df = df[result_cols].copy()
        
        # Convert price to numeric dan handle NaN
        if 'course_price' in result_df.columns:
            result_df['course_price'] = pd.to_numeric(result_df['course_price'], errors='coerce')
        
        # Clean untuk JSON compliance
        result_df = clean_dataframe_for_json(result_df)
        
        return result_df
    
    def _fallback_recommend(
        self,
        user_input: str,
        user_level: Optional[str],
        top_k: int
    ) -> pd.DataFrame:
        """
        Fallback 
        """
        if self.lp_combined is None:
            return pd.DataFrame()
        
        df = self.lp_combined.copy()
        
        # Filter by learning path
        matched_lp = None
        for lp in self.learning_path_mapping.values():
            if lp.lower() in user_input.lower():
                matched_lp = lp
                break
        
        if matched_lp:
            df = df[df['learning_path'] == matched_lp]
        
        # Filter by level
        if user_level:
            df = df[df['course_level'].str.lower() == user_level.lower()]
        
        # Simple keyword matching
        keywords = clean_text(user_input).split()
        
        def score_row(row):
            text = row['combined_text']
            return sum(1 for kw in keywords if kw in text)
        
        df['score'] = df.apply(score_row, axis=1)
        df = df.sort_values(by='score', ascending=False).head(top_k)
        
        result_cols = ['course_name', 'course_level', 'learning_path']
        if 'summary' in df.columns:
            result_cols.append('summary')
        if 'course_price' in df.columns:
            result_cols.append('course_price')
        
        result_df = df[result_cols].copy()
        
        # Convert price dan clean untuk JSON
        if 'course_price' in result_df.columns:
            result_df['course_price'] = pd.to_numeric(result_df['course_price'], errors='coerce')
        
        # Clean untuk JSON compliance
        result_df = clean_dataframe_for_json(result_df)
        
        return result_df


# Alias untuk backward compatibility
CourseRecommender = CourseRecommenderST