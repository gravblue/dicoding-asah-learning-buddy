# Learning Strategy Generator

from __future__ import annotations

import json
from typing import List, Optional, Dict, Any
import pandas as pd

# Direct import without try-except 
import google.generativeai as genai


class LearningStrategyGenerator:
    """Generator untuk strategi belajar berbasis LLM"""
    
    def __init__(self, api_key: str, resources_path: str = "data.json"):
        """
        Initialize Learning Strategy Generator
        
        Args:
            api_key: Google Gemini API key
            resources_path: Path ke file data.json yang berisi resources
        """
        self.api_key = api_key
        self.resources = []
        self.df = None  # Will be set from RoadmapGenerator
        
        # Load resources
        try:
            with open(resources_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.resources = data.get("resources", [])
            print(f"Loaded {len(self.resources)} resources from {resources_path}")
        except Exception as e:
            print(f"Failed to load resources: {e}")
            self.resources = []
        
        # Configure Gemini
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("models/gemini-2.5-flash")
            print("Gemini model initialized")
        except Exception as e:
            print(f"Failed to initialize Gemini: {e}")
            raise
    
    def _get_skill_level_nums(self, next_skills: List[str]) -> List[int]:
        """Get level numbers untuk skill list"""
        if self.df is None:
            return [1] * len(next_skills)
        
        level_nums = []
        for skill in next_skills:
            row = self.df[self.df["skill"] == skill]
            if not row.empty:
                level_nums.append(row["level_num"].iloc[0])
            else:
                # Fallback: coba match partial
                for _, r in self.df.iterrows():
                    if skill.lower() in r["skill"].lower():
                        level_nums.append(r["level_num"])
                        break
        
        return level_nums if level_nums else [1]
    
    def _get_references_text(self, next_skills: List[str], max_per_skill: int = 2) -> str:
        """Generate reference text dari resources"""
        references_text = ""
        
        for i, skill in enumerate(next_skills, start=1):
            # Filter resource yang judulnya mengandung skill
            skill_resources = [
                r for r in self.resources 
                if skill.lower() in r.get("title", "").lower()
            ][:max_per_skill]
            
            if skill_resources:
                references_text += f"{i}. {skill}:\n"
                for r in skill_resources:
                    title = r.get("title", "Unknown")
                    url = r.get("url", "#")
                    res_type = r.get("type", "Resource")
                    references_text += f"  - {title} ({res_type})\n    {url}\n"
        
        return references_text
    
    def generate_actionable_learning_strategy(
        self, 
        next_skills: List[str], 
        goal: Optional[str] = None
    ) -> str:
        """
        Generate strategi belajar yang actionable
        
        Args:
            next_skills: List skill yang akan dipelajari
            goal: Tujuan akhir (optional)
        
        Returns:
            Strategi belajar dalam format text
        """
        next_text = ", ".join(next_skills)
        level_nums = self._get_skill_level_nums(next_skills)
        level_num = min(level_nums) if level_nums else 1
        references_text = self._get_references_text(next_skills)
        
        # Build prompt 
        prompt = f"""
Kamu adalah mentor belajar yang praktis dan terstruktur. Gunakan bahasa yang tidak terlalu baku, semangat, ramah, dan ceria.
Buat strategi belajar harian untuk seseorang yang ingin mempelajari skill: {next_text} {f"dengan tujuan akhir: {goal}" if goal else ""}.
Berikan saran output subskill berdasarkan level skill yang sudah terdeteksi: {level_nums}.
Format output harus persis seperti ini.
Yuk naikin skill kamu! Ini rencana belajar yang bakal nge-boost perkembanganmu! 
1️. <Nama Skill>:
  - <Subskill>
  - <Subskill>
  - <Subskill>
  dst.

Tips seru supaya belajar makin efektif 
(Pilih 3 tips belajar secara acak. Harus berikan 1 tips teknik belajar populer.
Tips boleh berasal dari kebiasaan belajar, trik fokus, pengaturan lingkungan, manajemen waktu, mindset positif, atau cara mencatat yang efektif.
Setiap tips harus sangat singkat, maksimal 2 kalimat pendek, tidak lebih dari 10 kata.)
- <Tips 1>
- <Tips 2>
- <Tips 3>

Referensi buat kamu 
(Resource yang dikeluarkan hanya berdasarkan skill: {next_text}. Dilarang menambahkan resource selain di sini)
{references_text}

Berikut roadmap belajar mingguanmu 
Atur jadwal sesuai aturan berikut:
1. Fokus pada satu skill utama terlebih dahulu sebelum pindah ke skill berikutnya.
2. Jika dalam satu hari hanya ada 1 subskill → berikan 1 durasi belajar (durasi bebas).
3. Jika dalam satu hari ada lebih dari 1 subskill → berikan durasi untuk masing-masing subskill (setiap durasi bebas).
4. Durasi belajar harus realistis dan logis berdasarkan tingkat kesulitan subskill.
5. Durasi belajar menggunakan format lama waktu, bukan jam pada pukul tertentu.
Durasi belajar harus dalam format lama waktu saja: "45 menit", "1 jam", "90 menit", "2 jam", dst. Tidak boleh menggunakan kombinasi jam + menit (misal: "1 jam 30 menit" dilarang).
Format jadwal harus persis seperti ini:
- Hari 1: <Durasi 1> → <Skill>: <Subskill 1>
  Hari 1: <Durasi 2> → <Skill>: <Subskill 2> (jika ada)
- Hari 2: <Durasi> → <Skill>: <Subskill>
dst.
"""
        
        try:
            response = self.model.generate_content(prompt)
            strategy_text = response.text
            
            # Remove markdown bold formatting 
            strategy_text = strategy_text.replace("**", "")
            
            return strategy_text
        
        except Exception as e:
            return f"Error generating strategy: {e}"
    
    def generate_from_query(
        self,
        query: str,
        roadmap_generator,
        goal: Optional[str] = None,
        top_n: int = 5
    ) -> Dict[str, Any]:
        """
        Full pipeline: dari query → next skills → strategi
        
        Args:
            query: User query (e.g., "sehabis CSS, apa lagi yang harus dipelajari?")
            roadmap_generator: Instance dari RoadmapGenerator
            goal: Tujuan akhir (optional)
            top_n: Jumlah next skills yang direkomendasikan
        
        Returns:
            Dictionary berisi next_skills, next_skills_details, dan strategy
        """
        # Set dataframe untuk level detection
        if self.df is None and hasattr(roadmap_generator, 'df'):
            self.df = roadmap_generator.df
        
        # Predict next skills
        next_skills_df = roadmap_generator.predict_next_skills(query, top_n=top_n)
        
        if next_skills_df.empty:
            return {
                "query": query,
                "next_skills": [],
                "next_skills_details": [],
                "strategy": "No next skill recommendations found."
            }
        
        # Extract skill names (remove parentheses content)
        next_skills = [
            s.split("(")[0].strip() 
            for s in next_skills_df["skill"].tolist()
        ]
        
        # Generate strategy
        strategy = self.generate_actionable_learning_strategy(next_skills, goal)
        
        return {
            "query": query,
            "next_skills": next_skills,
            "next_skills_details": next_skills_df.to_dict('records'),
            "strategy": strategy
        }


# STANDALONE USAGE EXAMPLE

if __name__ == "__main__":
    """
    Example usage
    
    CARA RUNNING:
    1. Pastikan semua file ada di direktori yang sama:
       - learning_strategy.py (file ini)
       - roadmap_generator.py
       - Skill.csv
       - data.json
    
    2. Install dependencies:
       pip install pandas numpy scikit-learn google-generativeai
    
    3. Ganti API key di bawah dengan API key Gemini Anda
    
    4. Run:
       python learning_strategy.py
    """
    
    # Import harus ada di direktori yang sama
    try:
        from roadmap_generator import RoadmapGenerator
    except ImportError:
        print("Error: roadmap_generator.py tidak ditemukan!")
        print("Pastikan file roadmap_generator.py ada di direktori yang sama")
        exit(1)
    
    # 1. Setup Roadmap Generator
    print("Loading skill data")
    try:
        skill_df = pd.read_csv("Skill.csv")
    except FileNotFoundError:
        print("Error: Skill.csv tidak ditemukan!")
        print("Pastikan file Skill.csv ada di direktori yang sama")
        exit(1)
    
    roadmap_gen = RoadmapGenerator()
    roadmap_gen.load_data(skill_df)
    roadmap_gen.train_model()
    
    # 2. Setup Strategy Generator
    print("\nInitializing Learning Strategy Generator")
    
    # API KEY
    GEMINI_API_KEY = "AIzaSyAKddVqR4aOjWwxg6oam_m-H-WwKpAoE2g"
    
    try:
        strategy_gen = LearningStrategyGenerator(
            api_key=GEMINI_API_KEY,
            resources_path="data.json"
        )
    except FileNotFoundError:
        print("Warning: data.json tidak ditemukan, melanjutkan tanpa references")
        strategy_gen = LearningStrategyGenerator(
            api_key=GEMINI_API_KEY,
            resources_path="data.json"
        )
    
    # 3. Full Pipeline Example
    print("\n" + "="*60)
    print("FULL PIPELINE EXAMPLE")
    print("="*60)
    
    query = "sehabis css, apa lagi yang harus dipelajari untuk jadi front-end web developer?"
    goal = "Menjadi Front-End Developer profesional"
    
    print(f"\nQuery: {query}")
    print(f"Goal: {goal}")
    print("\nGenerating strategy (ini bisa memakan waktu 10-30 detik)...\n")
    
    result = strategy_gen.generate_from_query(
        query=query,
        roadmap_generator=roadmap_gen,
        goal=goal,
        top_n=5
    )
    
    print(f"\nNext Skills Recommended: {', '.join(result['next_skills'])}")
    print(f"\n{'='*60}")
    print("LEARNING STRATEGY:")
    print('='*60)
    print(result['strategy'])