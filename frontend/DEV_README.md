Setup cepat Frontend (Vite + React)

Prasyarat
- Node.js 18+ dan npm 9+.

Langkah
1) Masuk ke folder frontend:
   cd dicoding-asah-learning-buddy/frontend

2) Install dependencies:
   npm install

3) Jalankan pengembangan:
   npm run dev

   Aplikasi akan muncul di http://localhost:5175

Proxy Backend
- Vite telah disetel mem-proxy path "/api" ke http://localhost:8000 (lihat vite.config.js).
- Jika backend FastAPI berjalan di 8000, panggilan fetch ke "/api/..." akan diteruskan otomatis.
 - Endpoint data dari file Excel lokal tersedia via backend: 
   - GET /api/data/lp_course_mapping
   - GET /api/data/resource_data
   (backend akan membaca .xlsx di root repo dan mengembalikan JSON)

Struktur Penting
- src/App.jsx               -> routing + proteksi route
- src/pages/*               -> halaman Login, Register, Chat, Dashboard, Onboarding
- src/components/*          -> Navbar, Footer, ChatBubble
- src/styles.css            -> gaya global sesuai mockup
- src/lib/api.js            -> helper Supabase public API
- src/lib/chatApi.js        -> helper chat, fallback mock bila backend belum aktif

Catatan
- Auth masih berbasis localStorage (stub). Ganti dengan integrasi backend/auth sesungguhnya jika siap.
- Dashboard contoh memanggil endpoint Supabase public dan akan menampilkan data jika koneksi diizinkan.

