# Learning Buddy (DC-06 Asah 2025)

Learning Buddy adalah asisten belajar personal yang kami bangun untuk memenuhi use case DC-06. Fitur utama:

- **Personalized onboarding**: analisis skill otomatis (ML-lite), slider penilaian per sub-skill (Beginner/Intermediate/Advanced), simpan skor ke backend.
- **Roadmap & rekomendasi kursus**: per job role (≥6 sub-skill) dari API Supabase + fallback Excel Dicoding.
- **Chatbot kontekstual**: riwayat tersimpan, dapat menjawab pertanyaan progres (“skill apa yang paling berkembang minggu ini?”).
- **Tracking progres adaptif**: Mulai/Selesai kursus, ringkasan mingguan, integrasi ke rekomendasi dan chatbot.
- **Embed chat widget**: bisa ditanam di HTML lain via `<iframe src="/embed">` (contoh di `/embed-demo.html`).

## Cara Menjalankan

1. **Prasyarat**
   - Node.js 18+
   - Python 3.10 atau lebih baru (sertakan “Install launcher for all users” & “Add to PATH” saat instalasi)
   - Git
2. **Clone & siapkan environment**
   ```powershell
   git clone https://github.com/lexistp/dicoding-asah-learning-buddy.git
   cd dicoding-asah-learning-buddy

   # salin env untuk backend (aktifkan Gemini otomatis)
   Copy-Item backend/.env.example backend/.env
   # edit backend/.env dan isi GEMINI_API_KEY milikmu
   ```
3. **Jalankan sekaligus backend + frontend**
   ```powershell
   npm run dev
   ```
   Perintah ini akan:
   - membuat / memperbarui virtualenv backend (menggunakan versi Python tertinggi yang tersedia),
   - menjalankan `pip install -r backend/requirements.txt`,
   - menjalankan `npm install` di frontend,
   - membuka jendela baru untuk backend (`http://localhost:8000`) dan menjalankan Vite di `http://localhost:5175`.

4. **Utility tambahan**
   ```powershell
   npm run clean        # hapus node_modules & package-lock di frontend
   npm run clean:hard   # hentikan proses node lalu hapus paksa
   npm run reset        # clean:hard + npm install + npm run dev
   ```

5. **Menjalankan backend secara manual (opsional)**
   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload --port 8000
   ```

6. **Menjalankan frontend saja**
   ```powershell
   cd frontend
   npm install
   npm run dev:5175
   ```

## Rute Penting

- `/onboarding` – wizard onboarding multi-step + analisis skill.
- `/dashboard` – rekomendasi kursus, tombol Mulai/Selesai, ringkasan mingguan.
- `/chat` – chatbot Learning Buddy (butuh login).
- `/embed` – versi chatbot compact untuk di-embed (iframe).
- `/embed-demo.html` – contoh HTML sederhana menanamkan chatbot.

## API Tambahan

- `POST /ml/extract_skills` – ekstraksi skill berbasis RapidFuzz dari teks user.
- `POST /ml/recommend_by_query` – rekomendasi kursus berbasis BM25.
- `POST /progress` – catat progres (plan/start/complete + menit belajar).
- `GET /progress/summary` – ringkasan mingguan (dipakai dashboard & chatbot).
- `POST /ml/extract_skills` & `/ml/recommend_by_query` – analisis skill & rekomendasi kursus berbasis ML-lite.
- Chatbot otomatis memanggil Gemini (via endpoint internal) jika mendeteksi permintaan motivasi/progres. Isi `backend/.env` dengan `GEMINI_API_KEY` (dan `GEMINI_MODEL` bila ingin mengganti model, default `gemini-2.0-flash-lite`). Dengan `.env` ini, kamu tidak perlu mengetik environment variable di terminal setiap kali menjalankan backend.

## Indikator Teknis yang Terpenuhi

1. **Roadmap ≥ 1 job role dengan ≥6 sub-skill** – tiap role pada onboarding memiliki minimal 6 sub-skill, dan dashboard menampilkan rekomendasi berdasarkan penilaian pengguna.
2. **Penilaian sub-skill kategori B/I/A** – slider 0–100 otomatis dikonversi ke kategori saat submit onboarding & tersimpan untuk roadmap.
3. **Chatbot menjawab progres** – bot memanggil ringkasan /progress/summary bila user menanyakan perkembangan skill.
4. **Rekomendasi kelas Dicoding** – data kursus/LP dari Supabase + fallback Excel, plus ML BM25 untuk query bebas.
5. **Chatbot dapat di-embed** – route `/embed` + file `frontend/public/embed-demo.html` siap di-iframe oleh halaman HTML luar.

Silakan gunakan fondasi ini untuk integrasi ML lanjut (model final), tambahan visualisasi roadmap, atau sinkronisasi akun Dicoding bila API resmi tersedia.
