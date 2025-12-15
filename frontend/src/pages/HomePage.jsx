import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LearningBuddyAPI } from "../lib/api";
import heroImage from "../assets/gambar_untuk_home.jpeg";
import androidPath from "../assets/android-path.jpg";
import frontendPath from "../assets/frontend-path.jpg";
import backendPath from "../assets/backend-path.jpg";
import iosPath from "../assets/ios-path.jpg";
import mlPath from "../assets/ml-path.jpg";
import cloudPath from "../assets/cloud-path.jpg";
import aiPath from "../assets/ai-path.jpg";
import dataPath from "../assets/data-path.jpg";
import reactPath from "../assets/react-path.jpg";
import multiplatformPath from "../assets/multiplatform-path.jpg";
import mlopsPath from "../assets/mlops-path.jpg";
import gcpPath from "../assets/gcp-path.jpg";
import genaiPath from "../assets/genai-path.jpg";
import backendPythonPath from "../assets/backend-python-path.jpg";
import devopsPath from "../assets/devops-path.jpg";

const PATH_VISUALS = {
  "Android Developer": { image: androidPath, icon: "📱" },
  "Front-End Web Developer": { image: frontendPath, icon: "💻" },
  "Back-End Developer JavaScript": { image: backendPath, icon: "⚙️" },
  "iOS Developer": { image: iosPath, icon: "🍎" },
  "Machine Learning": { image: mlPath, icon: "🤖" },
  "Cloud Computing": { image: cloudPath, icon: "☁️" },
  "AI Engineer": { image: aiPath, icon: "🧠" },
  "Data Scientist": { image: dataPath, icon: "📊" },
  "React Developer": { image: reactPath, icon: "⚛️" },
  "Multi-Platform App Developer": { image: multiplatformPath, icon: "📲" },
  "MLOps Engineer": { image: mlopsPath, icon: "🔁" },
  "Google Cloud Professional": { image: gcpPath, icon: "🌐" },
  "Gen AI Engineer": { image: genaiPath, icon: "✨" },
  "Back-End Developer Python": { image: backendPythonPath, icon: "🐍" },
  "DevOps Engineer": { image: devopsPath, icon: "🚀" }

};

const PATH_DESCRIPTIONS = {
  "Android Developer":
    "Kurikulum Android standar industri yang disusun Dicoding dan mitra industri.",
  "Front-End Web Developer":
    "Belajar membangun antarmuka web modern dari dasar sampai mahir.",
  "Back-End Developer JavaScript":
    "Fokus membangun API dan layanan backend menggunakan JavaScript/Node.js.",
  "iOS Developer":
    "Pelajari ekosistem iOS serta praktik terbaik membangun aplikasi iPhone.",
  "Machine Learning":
    "Roadmap pembelajaran ML yang terstruktur dari konsep dasar hingga lanjutan.",
  "Cloud Computing":
    "Bangun pondasi cloud dan DevOps untuk mendukung deployment aplikasi skala besar.",
  "AI Engineer":
    "Pelajari konsep dan teknik membangun solusi AI yang efektif dan efisien.",
  "Data Scientist":
    "Kuasai analisis data, visualisasi, dan machine learning untuk pengambilan keputusan berbasis data.",
  "React Developer":
    "Pelajari cara membangun aplikasi web interaktif menggunakan React.js dari dasar hingga mahir.",
  "Multi-Platform App Developer":
    "Pelajari cara membangun aplikasi yang berjalan di berbagai platform dengan efisien.",
  "MLOps Engineer":
    "Pelajari praktik terbaik dalam mengelola siklus hidup model machine learning secara efisien.", 
  "Google Cloud Professional":
    "Persiapkan diri untuk sertifikasi Google Cloud Professional dengan roadmap pembelajaran terstruktur.",
  "Gen AI Engineer":
    "Pelajari cara membangun dan mengelola aplikasi berbasis Generative AI dengan praktik terbaik industri.",
  "Back-End Developer Python":
    "Fokus membangun API dan layanan backend menggunakan Python dan framework terkait.",
  "DevOps Engineer":
    "Pelajari prinsip dan praktik DevOps untuk meningkatkan kolaborasi dan efisiensi pengembangan perangkat lunak."


};

const getPathVisual = (name) =>
  PATH_VISUALS[name] || { image: heroImage, icon: "🎯" };

const getPathDescription = (name) =>
  PATH_DESCRIPTIONS[name] || "Roadmap belajar interaktif untuk menuntaskan kelas Dicoding.";

export default function HomePage() {
  const [isVisible, setIsVisible] = useState({});
  const [learningPaths, setLearningPaths] = useState([]);
  const [courseLevels, setCourseLevels] = useState({});
  const [coursesByPath, setCoursesByPath] = useState({});
  const [selectedPathId, setSelectedPathId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        setErrorMessage("");
        setLoadingPaths(true);
        const [paths, levels] = await Promise.all([
          LearningBuddyAPI.learningPaths({ order: "learning_path_id.asc" }),
          LearningBuddyAPI.courseLevels({ order: "id.asc" }),
        ]);
        setLearningPaths(paths);
        setSelectedPathId(paths[0]?.learning_path_id ?? null);
        const levelMap = {};
        levels.forEach((level) => {
          levelMap[level.id] = level.course_level;
        });
        setCourseLevels(levelMap);
      } catch (err) {
        console.error(err);
        setErrorMessage("Gagal memuat data dari API Dicoding.");
      } finally {
        setLoadingPaths(false);
      }
    };

    fetchPaths();
  }, []);

  useEffect(() => {
    if (!selectedPathId || coursesByPath[selectedPathId]) return;

    let cancelled = false;
    const fetchCourses = async () => {
      try {
        setErrorMessage("");
        setLoadingCourses(true);
        const data = await LearningBuddyAPI.courses({
          learning_path_id: `eq.${selectedPathId}`,
          order: "course_id.asc",
        });
        if (!cancelled) {
          setCoursesByPath((prev) => ({ ...prev, [selectedPathId]: data }));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setErrorMessage("Gagal memuat daftar course.");
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [selectedPathId, coursesByPath]);

  const selectedPath = learningPaths.find(
    (path) => path.learning_path_id === selectedPathId
  );
  const selectedCourses = selectedPath
    ? coursesByPath[selectedPath.learning_path_id] || []
    : [];

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(15px, -10px); }
          66% { transform: translate(-10px, 5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
          50% { opacity: 1; transform: scale(1.05) rotate(2deg); }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0); }
        }
        
        .hero-content {
          animation: slideInLeft 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-image-wrapper {
          animation: slideInRight 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        
        .path-card {
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .path-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.15), transparent);
          transition: left 0.6s;
        }
        .path-card:hover::before {
          left: 100%;
        }
        .path-card:hover {
          transform: translateY(-12px) scale(1.03);
          box-shadow: none !important;
        }
        .path-card.active {
          transform: translateY(-12px) scale(1.03);
          box-shadow: none !important;
        }
        .path-card:hover img {
          transform: scale(1.15) rotate(2deg);
        }
        .path-card img {
          transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .course-card {
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .course-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.08) 100%);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .course-card:hover::after {
          opacity: 1;
        }
        .course-card:hover {
          transform: translateY(-16px) scale(1.04);
          box-shadow: 0 25px 60px rgba(59, 130, 246, 0.25) !important;
        }
        .course-card:hover img {
          transform: scale(1.2) rotate(1deg);
        }
        .course-card img {
          transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .why-card {
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .why-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          padding: 2px;
          background: linear-gradient(135deg, transparent, rgba(59, 130, 246, 0.4), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.4s;
        }
        .why-card:hover::before {
          opacity: 1;
        }
        .why-card:hover {
          transform: translateY(-14px) scale(1.06);
          box-shadow: 0 30px 60px rgba(59, 130, 246, 0.25) !important;
        }
        .why-card:hover .why-icon {
          transform: scale(1.1) rotate(5deg);
        }
        .why-icon {
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .scroll-container {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          gap: 32px;
          padding: 40px 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
        .scroll-item {
          scroll-snap-align: start;
          flex-shrink: 0;
          width: 360px;
        }
        
        .scroll-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 3px solid #e0f2fe;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-size: 28px;
          font-weight: 800;
          color: #3b82f6;
        }
        .scroll-btn:hover {
          transform: translateY(-50%) scale(1.2);
          box-shadow: 0 12px 36px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(0, 0, 0, 0.1);
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-color: #1e40af;
        }
        .scroll-btn:active {
          transform: translateY(-50%) scale(1.05);
        }
        .scroll-btn-left { left: 24px; }
        .scroll-btn-right { right: 24px; }
        
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s;
        }
        .btn-primary:hover::before {
          left: 100%;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 20px 45px rgba(59, 130, 246, 0.5) !important;
        }
        .btn-primary:active {
          transform: translateY(0) scale(0.98);
        }
        
        .stat-card {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .stat-card:hover {
          transform: scale(1.15) rotate(-2deg);
        }
        
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .why-grid {
            grid-template-columns: 1fr !important;
          }
          .scroll-item {
            width: 320px;
          }
        }
        @media (max-width: 768px) {
          .hero-title {
            font-size: 36px !important;
          }
          .scroll-btn {
            display: none !important;
          }
          .scroll-item {
            width: 280px;
          }
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: '#ffffff', 
        position: 'relative', 
        overflow: 'hidden'
      }}>
        
        {/* Animated Background Blobs - Blue Only */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 10s ease-in-out infinite 2s'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '15%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(70px)',
          animation: 'float 12s ease-in-out infinite 4s'
        }} />

        {/* Hero Section */}
        <section style={{
          padding: '100px 5%',
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 5
        }}>
          <div className="hero-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center'
          }}>
            
            <div className="hero-content">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 24px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#3b82f6',
                marginBottom: '32px',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                animation: 'bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
              }}>
                <span style={{ fontSize: '20px' }}>⭐</span>
                Platform Belajar #1 untuk Dicoding
              </div>

              <h1 className="hero-title" style={{
                fontSize: '64px',
                fontWeight: '900',
                lineHeight: '1.1',
                marginBottom: '28px',
                color: '#0f172a',
                letterSpacing: '-0.02em'
              }}>
                Belajar Lebih <span className="gradient-text">Cerdas</span> dengan Learning Buddy
              </h1>

              <p style={{
                fontSize: '20px',
                color: '#64748b',
                lineHeight: '1.8',
                marginBottom: '40px',
                maxWidth: '550px'
              }}>
                Learning Buddy membantu kamu memahami materi Dicoding lebih cepat melalui 
                <strong style={{ color: '#3b82f6' }}> latihan interaktif</strong> dan 
                <strong style={{ color: '#2563eb' }}> penjelasan personal</strong> yang disesuaikan.
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '60px' }}>
                <Link to="/register" className="btn-primary" style={{
                  padding: '18px 36px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '17px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
                  border: 'none'
                }}>
                  Mulai Belajar Gratis
                  <span style={{ fontSize: '20px' }}>→</span>
                </Link>
                
                <button style={{
                  padding: '18px 36px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#3b82f6',
                  borderRadius: '16px',
                  border: '2px solid #e0f2fe',
                  fontWeight: '700',
                  fontSize: '17px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e0f2fe';
                }}>
                  <span style={{ fontSize: '20px' }}>▶️</span>
                  Tonton Demo
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '30px',
                padding: '32px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <div className="stat-card" style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '40px', 
                    fontWeight: '900', 
                    color: '#3b82f6',
                    marginBottom: '8px'
                  }}>1000+</div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Pengguna Aktif</div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '40px', 
                    fontWeight: '900', 
                    color: '#2563eb',
                    marginBottom: '8px'
                  }}>50+</div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Kursus Tersedia</div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '40px', 
                    fontWeight: '900', 
                    color: '#1e40af',
                    marginBottom: '8px'
                  }}>95%</div>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Tingkat Kepuasan</div>
                </div>
              </div>
            </div>

            <div className="hero-image-wrapper" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                inset: '-20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '50px',
                filter: 'blur(40px)',
                opacity: 0.3,
                animation: 'pulse 4s ease-in-out infinite'
              }} />
              
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
                padding: '40px',
                borderRadius: '40px',
                boxShadow: '0 30px 60px rgba(59, 130, 246, 0.2)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(59, 130, 246, 0.1)'
              }}>
                <img 
                  src={heroImage} 
                  alt="Learning" 
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '30px',
                    display: 'block'
                  }}
                />
                
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '30px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  padding: '20px 28px',
                  borderRadius: '20px',
                  boxShadow: '0 15px 40px rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  <div style={{
                    fontSize: '32px'
                  }}>✓</div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.95)', marginBottom: '4px', fontWeight: '600' }}>Progress Hari Ini</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>8/10</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Learning Paths Section */}
        <section data-animate id="learning-paths" style={{
          padding: '120px 0 80px',
          position: 'relative',
          zIndex: 5
        }}>
          <div style={{ padding: '0 5%', maxWidth: '1400px', margin: '0 auto', marginBottom: '70px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '24px',
              border: '2px solid rgba(59, 130, 246, 0.15)'
            }}>
              🎯 LEARNING PATHS
            </div>
            
            <h2 style={{
              fontSize: '52px',
              fontWeight: '900',
              color: '#0f172a',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>
              Pilih <span className="gradient-text">Learning Path</span> Sesuai Tujuan Karirmu
            </h2>
            <p style={{ fontSize: '20px', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>
              Klik card untuk melihat detail course dan roadmap pembelajaran yang terstruktur
            </p>
          </div>

          {errorMessage && (
            <div style={{
              margin: '0 auto 24px',
              maxWidth: '780px',
              padding: '14px 18px',
              borderRadius: '14px',
              background: 'rgba(248, 113, 113, 0.12)',
              color: '#b91c1c',
              fontWeight: '700',
              border: '1px solid rgba(248, 113, 113, 0.3)'
            }}>
              {errorMessage}
            </div>
          )}

          <div style={{ position: 'relative', padding: '0 5%' }}>
            <button 
              className="scroll-btn scroll-btn-left"
              onClick={() => {
                const container = document.getElementById('learning-path-scroll');
                if (container) container.scrollBy({ left: -392, behavior: 'smooth' });
              }}
            >
              ←
            </button>

            <div 
              id="learning-path-scroll"
              className="scroll-container"
              style={{ padding: '30px 80px' }}
            >
              {loadingPaths && (
                <div style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '32px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                }}>
                  Memuat learning path dari API Dicoding...
                </div>
              )}
              {!loadingPaths && learningPaths.length === 0 && (
                <div style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '32px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                }}>
                  Belum ada learning path yang bisa ditampilkan.
                </div>
              )}
              {learningPaths.map((path) => {
                const visuals = getPathVisual(path.learning_path_name);
                const courseCount = coursesByPath[path.learning_path_id]?.length;
                const isActive = selectedPathId === path.learning_path_id;
                return (
                  <div 
                    key={path.learning_path_id} 
                    className={`scroll-item path-card ${isActive ? 'active' : ''}`} 
                    onClick={() => setSelectedPathId(path.learning_path_id)}
                    style={{
                      background: 'white',
                      borderRadius: '28px',
                      overflow: 'hidden',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      border: isActive ? '3px solid #3b82f6' : '3px solid transparent'
                    }}
                  >
                    <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
                      <img 
                        src={visuals.image} 
                        alt={path.learning_path_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.15) 100%)'
                      }} />
                      
                      <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '56px',
                        height: '56px',
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {visuals.icon}
                      </div>
                    </div>
                    
                    <div style={{ padding: '28px' }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#0f172a',
                        marginBottom: '10px'
                      }}>
                        {path.learning_path_name}
                      </h3>

                      <p style={{ 
                        fontSize: '15px', 
                        color: '#64748b', 
                        lineHeight: '1.6',
                        minHeight: '60px',
                        marginBottom: '16px'
                      }}>
                        {getPathDescription(path.learning_path_name)}
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '15px',
                          color: '#64748b',
                          fontWeight: '600'
                        }}>
                          <span style={{ fontSize: '18px' }}>🆔</span>
                          Path #{path.learning_path_id}
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '15px',
                          color: '#64748b',
                          fontWeight: '600'
                        }}>
                          <span style={{ fontSize: '18px' }}>📚</span>
                          {courseCount != null ? `${courseCount} course` : 'Memuat...'}
                        </div>
                      </div>
                      
                      <div style={{
                        padding: '14px 24px',
                        background: isActive 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                          : 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '14px',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: isActive ? 'white' : '#3b82f6',
                        textAlign: 'center',
                        transition: 'all 0.4s',
                        border: isActive ? 'none' : '2px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        {isActive ? '✓ Terpilih' : 'Lihat Detail →'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              className="scroll-btn scroll-btn-right"
              onClick={() => {
                const container = document.getElementById('learning-path-scroll');
                if (container) container.scrollBy({ left: 392, behavior: 'smooth' });
              }}
            >
              →
            </button>
          </div>
        </section>

        {/* Courses Section */}
        <section data-animate id="courses" style={{
          padding: '120px 5%',
          background: 'transparent',
          position: 'relative'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '60px' }}>
              {!selectedPath && (
                <div style={{
                  padding: '16px 18px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '14px',
                  color: '#0f172a',
                  fontWeight: '700',
                  border: '1px solid rgba(59, 130, 246, 0.15)'
                }}>
                  Pilih learning path untuk melihat daftar course Dicoding yang tersedia.
                </div>
              )}

              {selectedPath && (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px',
                      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
                    }}>
                      {getPathVisual(selectedPath.learning_path_name).icon}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#3b82f6',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '4px'
                      }}>
                        LEARNING PATH
                      </div>
                      <h2 style={{
                        fontSize: '44px',
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: '-0.02em'
                      }}>
                        {selectedPath.learning_path_name}
                      </h2>
                    </div>
                  </div>
                  
                  <p style={{ 
                    fontSize: '18px', 
                    color: '#64748b', 
                    lineHeight: '1.7',
                    maxWidth: '800px' 
                  }}>
                    {getPathDescription(selectedPath.learning_path_name)}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginTop: '20px'
                  }}>
                    <div style={{
                      padding: '12px 20px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.15)'
                    }}>
                      🆔 Path #{selectedPath.learning_path_id}
                    </div>
                    <div style={{
                      padding: '12px 20px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.15)'
                    }}>
                      📚 {loadingCourses && selectedCourses.length === 0 ? 'Memuat...' : `${selectedCourses.length} Courses`}
                    </div>
                  </div>
                </>
              )}
            </div>

            {selectedPath && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '32px'
              }}>
                {loadingCourses && selectedCourses.length === 0 && (
                  <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                  }}>
                    Memuat course untuk learning path ini...
                  </div>
                )}
                {!loadingCourses && selectedCourses.length === 0 && (
                  <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                  }}>
                    Belum ada course untuk learning path ini.
                  </div>
                )}
                {selectedCourses.map((course, i) => {
                  const levelName =
                    courseLevels[course.course_level_str] ||
                    `Level ${course.course_level_str || "-"}`;
                  const visuals = getPathVisual(selectedPath.learning_path_name);
                  return (
                    <div key={course.course_id} className="course-card" style={{
                      background: 'white',
                      borderRadius: '24px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      cursor: 'pointer',
                      border: '2px solid #f1f5f9'
                    }}>
                      <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                        <img 
                          src={visuals.image} 
                          alt={course.course_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)'
                        }} />
                        
                        <div className="course-badge" style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          background: 'white',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#3b82f6',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ fontSize: '18px' }}>🎯</span>
                          Langkah {i + 1}
                        </div>
                        
                        <div style={{
                          position: 'absolute',
                          bottom: '16px',
                          right: '16px',
                          background: 'rgba(255,255,255,0.95)',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0f172a',
                          backdropFilter: 'blur(10px)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>🏷️</span>
                          Course #{course.course_id}
                        </div>
                      </div>
                      
                      <div style={{ padding: '24px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: 'rgba(59, 130, 246, 0.08)',
                          color: '#3b82f6',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          marginBottom: '16px',
                          border: '1px solid rgba(59, 130, 246, 0.15)'
                        }}>
                          Level: {levelName}
                        </div>
                        
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#0f172a',
                          marginBottom: '20px',
                          lineHeight: '1.4',
                          minHeight: '50px'
                        }}>
                          {course.course_name}
                        </h3>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '16px',
                          borderTop: '2px solid #f1f5f9'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#0f172a',
                            fontWeight: '800'
                          }}>
                            <span style={{ fontSize: '20px' }}>🎓</span>
                            <span style={{ fontSize: '16px' }}>{levelName}</span>
                          </div>
                          <div style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '700'
                          }}>
                            Pelajari →
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Why Choose Section */}
        <section data-animate id="why" style={{ 
          padding: '120px 5%', 
          maxWidth: '1400px', 
          background: 'transparent',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '70px' }}>
            <div style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#3b82f6',
              marginBottom: '24px',
              border: '2px solid rgba(59, 130, 246, 0.15)'
            }}>
              ✨ KEUNGGULAN KAMI
            </div>
            
            <h2 style={{
              fontSize: '52px',
              fontWeight: '900',
              color: '#0f172a',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>
              Mengapa Memilih <span className="gradient-text">Learning Buddy?</span>
            </h2>
            <p style={{ fontSize: '20px', color: '#64748b', maxWidth: '700px', margin: '0 auto' }}>
              Platform yang dirancang khusus untuk mendukung perjalanan belajarmu dengan fitur-fitur unggulan
            </p>
          </div>

          <div className="why-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px'
          }}>
            {[
              {
                icon: '📚',
                title: 'Latihan Interaktif',
                desc: 'Ratusan soal latihan yang disesuaikan dengan materi Dicoding untuk menguji dan meningkatkan pemahamanmu'
              },
              {
                icon: '🎯',
                title: 'Pembelajaran Personal',
                desc: 'Penjelasan yang disesuaikan dengan gaya belajarmu dan kemampuanmu untuk hasil maksimal'
              },
              {
                icon: '🚀',
                title: 'Roadmap Terstruktur',
                desc: 'Rancang roadmap belajar yang jelas dan terstruktur sesuai dengan tujuan karirmu di dunia teknologi'
              }
            ].map((item, i) => (
              <div key={i} className="why-card" style={{
                background: 'white',
                padding: '48px 36px',
                borderRadius: '28px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(59, 130, 246, 0.1)',
                border: '2px solid #f1f5f9'
              }}>
                <div className="why-icon" style={{
                  width: '90px',
                  height: '90px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 28px',
                  fontSize: '42px',
                  boxShadow: '0 15px 35px rgba(59, 130, 246, 0.25)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: '-4px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '26px',
                    filter: 'blur(12px)',
                    opacity: 0.4,
                    zIndex: -1
                  }} />
                  {item.icon}
                </div>
                
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#0f172a',
                  marginBottom: '16px'
                }}>
                  {item.title}
                </h3>
                
                <p style={{ 
                  fontSize: '16px', 
                  color: '#64748b', 
                  lineHeight: '1.7'
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ 
          padding: '80px 5% 120px', 
          maxWidth: '1200px', 
          background: 'transparent',
          margin: '0 auto',
          position: 'relative'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #4169E1 0%, #4169E1 100%)',
            padding: '70px 50px',
            borderRadius: '40px',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(59, 130, 246, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '300px',
              height: '300px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(60px)'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-100px',
              left: '-100px',
              width: '300px',
              height: '300px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(60px)'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🎓
              </div>
              
              <h2 style={{
                fontSize: '48px',
                fontWeight: '900',
                color: 'white',
                marginBottom: '20px',
                letterSpacing: '-0.02em'
              }}>
                Siap Memulai Perjalanan Belajarmu?
              </h2>
              
              <p style={{
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '40px',
                maxWidth: '650px',
                margin: '0 auto 40px',
                lineHeight: '1.7'
              }}>
                Bergabunglah dengan ribuan learner lainnya dan capai tujuan belajarmu bersama Learning Buddy. 
                <strong> Gratis untuk memulai!</strong>
              </p>
              
              <Link to="/register" className="btn-primary" style={{
                padding: '20px 48px',
                background: 'white',
                color: '#3b82f6',
                borderRadius: '18px',
                textDecoration: 'none',
                fontWeight: '800',
                fontSize: '19px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
                border: 'none'
              }}>
                Mulai Gratis Sekarang
                <span style={{ fontSize: '24px' }}>🚀</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
