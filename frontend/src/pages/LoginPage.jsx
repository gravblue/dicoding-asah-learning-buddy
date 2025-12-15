import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Email dan password wajib diisi");
    setLoading(true);
    
    try {
      // Direct fetch to save email and name properly
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login gagal');
      }

      const data = await response.json();
      
      // Save ALL data to localStorage (token, email, name)
      localStorage.setItem('lb_auth', JSON.stringify({
        token: data.token,
        email: data.email,
        name: data.name
      }));

      // 🎯 REDIRECT KE CHAT PAGE LANGSUNG
      nav("/chat");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25); }
          50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(37, 99, 235, 0.35); }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes floatGentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
      
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* Animated Background Shapes */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
          top: '-100px',
          left: '-100px',
          borderRadius: '50%',
          opacity: 0.5,
          filter: 'blur(80px)',
          animation: 'float 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          bottom: '-80px',
          right: '-80px',
          borderRadius: '50%',
          opacity: 0.5,
          filter: 'blur(80px)',
          animation: 'float 8s ease-in-out infinite 2s'
        }} />
        <div style={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          background: 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)',
          top: '50%',
          right: '10%',
          borderRadius: '50%',
          opacity: 0.5,
          filter: 'blur(80px)',
          animation: 'float 8s ease-in-out infinite 4s'
        }} />

        <div style={{
          width: '100%',
          maxWidth: '1100px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '32px',
          boxShadow: '0 25px 70px rgba(37, 99, 235, 0.15)',
          position: 'relative',
          zIndex: 10,
          animation: 'slideUp 0.6s ease-out',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
          minHeight: '650px'
        }}>
          {/* Left Side - Illustration */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '60px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              top: '-100px',
              right: '-100px',
              animation: 'float 6s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              bottom: '-50px',
              left: '-50px',
              animation: 'float 8s ease-in-out infinite 2s'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <h2 style={{
                fontSize: '36px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '16px',
                lineHeight: '1.2'
              }}>
                Welcome Back!
              </h2>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '24px'
              }}>
                Ready to learn?
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.6',
                maxWidth: '320px',
                margin: '0 auto'
              }}>
                Masuk untuk melanjutkan perjalanan belajarmu bersama Learning Buddy
              </p>
              
              {/* Illustration */}
              <div style={{
                marginTop: '40px',
                position: 'relative',
                width: '340px',
                height: '340px',
                margin: '40px auto 0',
                animation: 'floatGentle 3s ease-in-out infinite'
              }}>
                <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
                  {/* Background circles */}
                  <circle cx="120" cy="150" r="80" fill="#60a5fa" opacity="0.3" />
                  <circle cx="280" cy="250" r="60" fill="#93c5fd" opacity="0.3" />
                  
                  {/* Main character body */}
                  <ellipse cx="200" cy="280" rx="140" ry="120" fill="#1e3a8a" />
                  
                  {/* Arms */}
                  <ellipse cx="90" cy="240" rx="35" ry="55" fill="#1e3a8a" transform="rotate(-25 90 240)" />
                  <ellipse cx="310" cy="240" rx="35" ry="55" fill="#1e3a8a" transform="rotate(25 310 240)" />
                  
                  {/* Book in left hand */}
                  <rect x="60" y="200" width="50" height="35" rx="3" fill="#60a5fa" />
                  <line x1="85" y1="200" x2="85" y2="235" stroke="#1e3a8a" strokeWidth="2" />
                  
                  {/* Pencil in right hand */}
                  <rect x="295" y="205" width="8" height="45" rx="2" fill="#fbbf24" transform="rotate(20 299 227)" />
                  <path d="M 290 235 L 295 242 L 300 235 Z" fill="#1e3a8a" transform="rotate(20 295 238)" />
                  
                  {/* Decorative elements on body */}
                  <circle cx="150" cy="270" r="25" fill="#60a5fa" opacity="0.7" />
                  <circle cx="250" cy="290" r="30" fill="#93c5fd" opacity="0.6" />
                  <circle cx="200" cy="250" r="15" fill="#dbeafe" opacity="0.8" />
                  
                  {/* Head/Face */}
                  <circle cx="200" cy="130" r="65" fill="#1e293b" />
                  <circle cx="200" cy="125" r="60" fill="white" />
                  
                  {/* Graduation cap base */}
                  <ellipse cx="200" cy="80" rx="70" ry="12" fill="#1e293b" />
                  
                  {/* Graduation cap top */}
                  <rect x="160" y="55" width="80" height="25" rx="3" fill="#1e293b" />
                  
                  {/* Tassel */}
                  <line x1="240" y1="67" x2="260" y2="67" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="262" cy="67" r="4" fill="#fbbf24" />
                  
                  {/* Eyes */}
                  <circle cx="185" cy="120" r="8" fill="#1e293b" />
                  <circle cx="215" cy="120" r="8" fill="#1e293b" />
                  <circle cx="187" cy="118" r="3" fill="white" />
                  <circle cx="217" cy="118" r="3" fill="white" />
                  
                  {/* Smile */}
                  <path d="M 180 135 Q 200 145 220 135" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
                  
                  {/* Floating academic elements */}
                  <g opacity="0.6">
                    {/* Star/sparkle 1 */}
                    <path d="M 50 120 L 55 125 L 50 130 L 45 125 Z" fill="#fbbf24" />
                    <path d="M 50 120 L 55 125 L 50 130 L 45 125 Z" fill="#fbbf24" transform="rotate(45 50 125)" />
                    
                    {/* Star/sparkle 2 */}
                    <path d="M 340 140 L 345 145 L 340 150 L 335 145 Z" fill="#fbbf24" />
                    <path d="M 340 140 L 345 145 L 340 150 L 335 145 Z" fill="#fbbf24" transform="rotate(45 340 145)" />
                    
                    {/* Math symbols */}
                    <text x="320" y="180" fontSize="24" fill="#dbeafe" fontWeight="bold">+</text>
                    <text x="70" y="280" fontSize="24" fill="#dbeafe" fontWeight="bold">×</text>
                    <text x="330" y="320" fontSize="24" fill="#dbeafe" fontWeight="bold">=</text>
                  </g>
                  
                  {/* Light bulb idea */}
                  <g transform="translate(40, 90)">
                    <ellipse cx="0" cy="0" rx="12" ry="15" fill="#fbbf24" opacity="0.8" />
                    <rect x="-6" y="12" width="12" height="4" rx="1" fill="#94a3b8" />
                    <rect x="-4" y="16" width="8" height="3" rx="1" fill="#94a3b8" />
                    {/* Light rays */}
                    <line x1="-18" y1="-8" x2="-22" y2="-12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                    <line x1="18" y1="-8" x2="22" y2="-12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                    <line x1="0" y1="-18" x2="0" y2="-24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                  </g>
                  
                  {/* Decorative curved lines */}
                  <path d="M 60 100 Q 65 95 70 100" stroke="#1e3a8a" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
                  <path d="M 330 115 Q 335 110 340 115" stroke="#1e3a8a" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
                  <path d="M 340 340 Q 345 335 350 340" stroke="#1e3a8a" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div style={{
            padding: '60px 50px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '32px',
              color: '#1e293b'
            }}>
              Welcome Back
            </h1>

            <form onSubmit={onSubmit}>
              {/* Email Field */}
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.5s ease-out 0.1s forwards', opacity: 0 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px'
                }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 48px',
                      fontSize: '15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      fontFamily: 'inherit',
                      background: 'white',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: '16px', animation: 'fadeIn 0.5s ease-out 0.2s forwards', opacity: 0 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 48px',
                      fontSize: '15px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      outline: 'none',
                      transition: 'all 0.3s',
                      fontFamily: 'inherit',
                      background: 'white',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div style={{
                textAlign: 'right',
                marginBottom: '24px',
                animation: 'fadeIn 0.5s ease-out 0.3s forwards',
                opacity: 0
              }}>
                <Link to="/forgot-password" style={{
                  fontSize: '14px',
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: '500',
                  transition: 'color 0.3s'
                }}>
                  Lupa Password?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '12px',
                  color: '#dc2626',
                  fontSize: '14px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  animation: 'shake 0.5s'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: loading ? 'none' : '0 10px 25px rgba(37, 99, 235, 0.25)',
                  fontFamily: 'inherit',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 15px 35px rgba(37, 99, 235, 0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.25)';
                  }
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }}></span>
                    Memproses...
                  </span>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '14px',
              color: '#64748b',
              animation: 'fadeIn 0.5s ease-out 0.4s forwards',
              opacity: 0
            }}>
              Belum memiliki akun?{' '}
              <Link to="/register" style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'color 0.3s'
              }}>
                Daftar di sini
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}