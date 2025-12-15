Backend (FastAPI) - Setup Cepat

Prasyarat
- Python 3.10+

Langkah
1) Buat virtualenv dan install dependency:
   cd dicoding-asah-learning-buddy/backend
   python -m venv .venv
   .venv/Scripts/activate  (Windows)
   pip install -r requirements.txt

2) Jalankan server lokal:
   uvicorn backend.main:app --reload --port 8000

3) Cek health:
   GET http://localhost:8000/health  -> {"status":"ok"}

Endpoint Sementara
- POST /chat { message: string } -> { reply: string }
  Ini masih mock. Sambungkan ke model ML / layanan LLM ketika siap.

