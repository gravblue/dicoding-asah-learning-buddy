# Roadmap Progress Predictor -

import pandas as pd
import numpy as np
import joblib
import warnings
from typing import Dict, List, Optional
import os
warnings.filterwarnings('ignore')


class RoadmapProgressPredictor:
    """
    Class untuk memprediksi progress dan status roadmap pembelajaran
    """
    
    def __init__(self, 
                 model_progress_path: str = 'catboost_progress.pkl',
                 model_status_path: str = 'rf_status.pkl',
                 encoder_path: str = 'target_encoder.pkl',
                 data_path: str = 'Roadmap Course.xlsx'):
        """
        Initialize predictor dengan path ke model dan data
        
        Args:
            model_progress_path: Path ke CatBoost model
            model_status_path: Path ke RandomForest model
            encoder_path: Path ke Target Encoder
            data_path: Path ke Excel data
        """
        self.model_progress_path = model_progress_path
        self.model_status_path = model_status_path
        self.encoder_path = encoder_path
        self.data_path = data_path
        
        # Model & data containers
        self.regressor = None
        self.classifier = None
        self.encoder = None
        
        self.df_users = None
        self.df_progress = None
        self.df_roadmap = None
        
        # Feature definitions
        self.categorical_cols = ['user_id', 'title_id', 'user_title']
        self.numerical_cols = []
        
    def load_models(self):
        """Load semua models yang diperlukan - dengan error handling"""
        print("Loading roadmap prediction models")
        
        try:
            # Check if files exist
            if not os.path.exists(self.model_progress_path):
                print(f"Model file not found: {self.model_progress_path}")
                return False
                
            if not os.path.exists(self.model_status_path):
                print(f"Model file not found: {self.model_status_path}")
                return False
                
            if not os.path.exists(self.encoder_path):
                print(f"Encoder file not found: {self.encoder_path}")
                return False
            
            # Load models
            self.regressor = joblib.load(self.model_progress_path)
            self.classifier = joblib.load(self.model_status_path)
            self.encoder = joblib.load(self.encoder_path)
            
            print("Models loaded successfully!")
            return True
            
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def load_data(self):
        """Load data dari Excel - dengan error handling"""
        print("Loading roadmap datasets")
        
        try:
            # Check if file exists
            if not os.path.exists(self.data_path):
                print(f"Data file not found: {self.data_path}")
                return None, None
            
            self.df_users = pd.read_excel(self.data_path, sheet_name='User')
            self.df_progress = pd.read_excel(self.data_path, sheet_name='User Progress')
            self.df_roadmap = pd.read_excel(self.data_path, sheet_name='Title')
            
            print(f"Roadmap data loaded!")
            print(f"   - Users: {len(self.df_users)}")
            print(f"   - Progress records: {len(self.df_progress)}")
            print(f"   - Roadmap items: {len(self.df_roadmap)}")
            
            return self.df_users, self.df_progress
            
        except Exception as e:
            print(f"Error loading data: {e}")
            return None, None
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features untuk prediksi
        
        Args:
            df: DataFrame dengan kolom user_id, title_id
            
        Returns:
            DataFrame dengan features siap prediksi
        """
        df_prepared = df.copy()
        
        # CREATE user_title FIRST!
        df_prepared['user_title'] = (
            df_prepared['user_id'].astype(str) + '_' + 
            df_prepared['title_id'].astype(str)
        )
        
        # Define numerical columns (exclude target dan categorical)
        exclude_cols = ['progress_percentage', 'status'] + self.categorical_cols
        self.numerical_cols = [
            col for col in df_prepared.columns 
            if col not in exclude_cols
        ]
        
        # Create feature matrix
        feature_cols = self.categorical_cols + self.numerical_cols
        X = df_prepared[feature_cols].copy()
        
        # Encode WITHOUT renaming columns!
        try:
            X_encoded = self.encoder.transform(X[self.categorical_cols])
            X[self.categorical_cols] = X_encoded
        except Exception as e:
            print(f"Encoding warning: {e}")
            # Fallback: simple label encoding
            for col in self.categorical_cols:
                X[col] = pd.factorize(X[col])[0]
        
        return X
    
    def predict_progress(self, X: pd.DataFrame) -> np.ndarray:
        """
        Prediksi progress percentage menggunakan CatBoost
        
        Args:
            X: Feature matrix
            
        Returns:
            Array of predicted progress values
        """
        try:
            predictions = self.regressor.predict(X)
            # Clip predictions to valid range [0, 100]
            predictions = np.clip(predictions, 0, 100)
            return predictions
        except Exception as e:
            print(f"CatBoost prediction failed: {e}")
            # Fallback: return zeros
            return np.zeros(len(X))
    
    def predict_status(self, X: pd.DataFrame) -> np.ndarray:
        """
        Prediksi status menggunakan RandomForest
        
        Args:
            X: Feature matrix
            
        Returns:
            Array of predicted status
        """
        try:
            # Match feature names with training
            if hasattr(self.classifier, 'feature_names_in_'):
                # Reorder columns to match training
                X_rf = X[self.classifier.feature_names_in_]
            else:
                X_rf = X
            
            predictions = self.classifier.predict(X_rf)
            return predictions
            
        except Exception as e:
            print(f"RandomForest prediction failed: {e}")
            # Fallback: return 'Unknown'
            return np.array(['Unknown'] * len(X))
    
    def predict_all(self) -> pd.DataFrame:
        """
        Jalankan semua prediksi untuk data yang ada
        
        Returns:
            DataFrame dengan kolom predictions
        """
        if self.df_progress is None:
            raise ValueError("Data belum dimuat! Jalankan load_data() dulu")
        
        if self.regressor is None or self.classifier is None:
            raise ValueError("Model belum dimuat! Jalankan load_models() dulu")
        
        # Prepare features
        X = self.prepare_features(self.df_progress)
        
        # Predict
        df_result = self.df_progress.copy()
        df_result['user_title'] = (
            df_result['user_id'].astype(str) + '_' + 
            df_result['title_id'].astype(str)
        )
        df_result['pred_progresss'] = self.predict_progress(X)
        df_result['pred_status'] = self.predict_status(X)
        
        return df_result
    
    def generate_roadmap_for_user(self, email: str, df_users: pd.DataFrame, df_progress: pd.DataFrame) -> Dict:
        """
        Generate roadmap untuk user tertentu - FIXED VERSION
        
        Args:
            email: Email user
            df_users: DataFrame users
            df_progress: DataFrame progress dengan predictions
            
        Returns:
            Dictionary berisi roadmap info atau None jika user tidak ditemukan
        """
        # Get user info
        user_data = df_users[df_users['email'] == email]
        
        if len(user_data) == 0:
            return None
        
        user = user_data.iloc[0]
        user_id = user['user_id']
        
        # Filter progress untuk user ini
        user_progress = df_progress[df_progress['user_id'] == user_id].copy()
        
        if len(user_progress) == 0:
            return {
                "user_name": str(user.get('name', '')),
                "email": email,
                "current_course": str(user.get('course', '')),
                "learning_path": str(user.get('learning_path_name', '')),
                "roadmap": [],
                "next_module_message": "Belum ada progress tercatat",
                "total_modules": 0,
                "completed_modules": 0,
                "in_progress_modules": 0
            }
        
        # Merge dengan roadmap info jika ada
        if self.df_roadmap is not None:
            user_progress = pd.merge(
                user_progress, 
                self.df_roadmap, 
                on='title_id', 
                how='left'
            )
        
        # Sort by title_id
        user_progress = user_progress.sort_values('title_id')
        
        # Generate roadmap items
        roadmap_items = []
        completed = 0
        in_progress = 0
        
        for _, row in user_progress.iterrows():
            status = row.get('pred_status', 'Unknown')
            progress = float(row.get('pred_progresss', 0))
            title = str(row.get('title', f"Module {row['title_id']}"))
            unlock_req = float(row.get('unlock_requirement', 80))
            
            # Count status
            if status == 'Completed':
                completed += 1
            elif status == 'In Progress':
                in_progress += 1
            
            # Format access status
            if status == 'Completed':
                access_status = "🔓 (Unlocked)"
                display = f"{title} ✅ (Completed)"
            elif status == 'In Progress':
                access_status = "🔓 (Unlocked)"
                display = f"{title} 🔄 (In Progress)"
            else:
                if progress >= unlock_req:
                    access_status = "🔓 (Unlocked)"
                    display = f"{title} 🔓 (Unlocked)"
                else:
                    access_status = f"🔒 (Locked - {unlock_req:.0f}%)"
                    display = f"{title} 🔒 (Locked)"
            
            roadmap_items.append({
                'title_id': int(row['title_id']),
                'title': title,
                'status': status,
                'progress': round(progress, 1),
                'unlock_requirement': int(unlock_req),
                'access_status': access_status,
                'display': display
            })
        
        # Generate next module message
        next_msg = "Terus belajar untuk unlock modul berikutnya!💪"
        in_prog_items = [item for item in roadmap_items if item['status'] == 'In Progress']
        
        if in_prog_items:
            current = in_prog_items[0]
            if current['progress'] >= current['unlock_requirement']:
                next_idx = roadmap_items.index(current) + 1
                if next_idx < len(roadmap_items):
                    next_module = roadmap_items[next_idx]
                    next_msg = f"🎉 Karena kamu sudah mencapai {current['progress']:.1f}% pada {current['title']}, modul {next_module['title']} sudah terbuka!"
        
        return {
            'user_name': str(user.get('name', '')),
            'email': email,
            'current_course': str(user.get('course', '')),
            'learning_path': str(user.get('learning_path_name', '')),
            'roadmap': roadmap_items,
            'next_module_message': next_msg,
            'total_modules': len(roadmap_items),
            'completed_modules': completed,
            'in_progress_modules': in_progress
        }
    
    def generate_all_roadmaps(self, df_users: pd.DataFrame, df_progress: pd.DataFrame) -> List[Dict]:
        """
        Generate roadmap untuk semua users
        
        Args:
            df_users: DataFrame users
            df_progress: DataFrame progress dengan predictions
            
        Returns:
            List of roadmap dictionaries
        """
        all_roadmaps = []
        
        for email in df_users['email'].unique():
            roadmap = self.generate_roadmap_for_user(email, df_users, df_progress)
            if roadmap:
                all_roadmaps.append(roadmap)
        
        return all_roadmaps


# Convenience Functions
def load_predictor() -> RoadmapProgressPredictor:
    """Load predictor dengan default settings"""
    predictor = RoadmapProgressPredictor()
    
    if not predictor.load_models():
        raise Exception("Failed to load models")
    
    df_users, df_progress = predictor.load_data()
    
    if df_users is None or df_progress is None:
        raise Exception("Failed to load data")
    
    return predictor


def get_roadmap(email: str) -> Dict:
    """
    Quick function untuk get roadmap
    
    Args:
        email: User email
        
    Returns:
        Roadmap dictionary
    """
    predictor = load_predictor()
    df_users, df_progress = predictor.load_data()
    
    # Predict progress
    X = predictor.prepare_features(df_progress)
    df_progress['pred_progresss'] = predictor.predict_progress(X)
    df_progress['pred_status'] = predictor.predict_status(X)
    
    return predictor.generate_roadmap_for_user(email, df_users, df_progress)


def print_roadmap(email: str):
    """
    Quick function untuk print roadmap
    
    Args:
        email: User email
    """
    roadmap_data = get_roadmap(email)
    
    if roadmap_data is None:
        print(f"User dengan email {email} tidak ditemukan")
        return
    
    print("="*60)
    print(f"  ROADMAP: {roadmap_data['user_name']}")
    print("="*60)
    print(f"Email: {roadmap_data['email']}")
    print(f"Course: {roadmap_data['current_course']}")
    print(f"Learning Path: {roadmap_data['learning_path']}")
    print("")
    print(f"Progress: {roadmap_data['completed_modules']}/{roadmap_data['total_modules']} completed")
    print(f"   In Progress: {roadmap_data['in_progress_modules']}")
    print("")
    print(roadmap_data['next_module_message'])
    print("")
    print("="*60)
    print("  MODULES")
    print("="*60)
    
    for i, item in enumerate(roadmap_data['roadmap'], start=1):
        print(f"{i}. {item['display']}")
    
    print("="*60)


# Main - untuk testing
if __name__ == "__main__":
    print("Roadmap Progress Predictor - Testing\n")
    
    # Initialize predictor
    predictor = RoadmapProgressPredictor()
    
    # Load models & data
    if not predictor.load_models():
        print("Failed to load models. Exiting")
        exit(1)
    
    df_users, df_progress = predictor.load_data()
    
    if df_users is None or df_progress is None:
        print("Failed to load data. Exiting")
        exit(1)
    
    # Predict all
    X = predictor.prepare_features(df_progress)
    df_progress['pred_progresss'] = predictor.predict_progress(X)
    df_progress['pred_status'] = predictor.predict_status(X)
    
    # Test dengan sample user
    test_emails = [
        'hana.pratama3@example.com',
        'rafi.santoso5@example.com',
        'sari.prasetyo55@example.com'
    ]
    
    print("\n" + "="*60)
    print("  TESTING ROADMAP GENERATION")
    print("="*60 + "\n")
    
    for email in test_emails:
        roadmap_data = predictor.generate_roadmap_for_user(email, df_users, df_progress)
        
        if roadmap_data:
            print_roadmap(email)
            print("\n")
        else:
            print(f"User {email} not found\n")
    
    print("Testing complete!")