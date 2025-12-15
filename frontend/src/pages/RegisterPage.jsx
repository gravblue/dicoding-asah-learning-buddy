import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Backend } from "../lib/backend";

export default function RegisterPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) return setError("Semua field wajib diisi");
    if (password !== confirm) return setError("Konfirmasi password tidak cocok");
    setLoading(true);
    try {
      await Backend.register({ name, email, password });
      nav("/chat");
    } catch (err) {
      setError(String(err));
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
                Welcome!
              </h2>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: '24px'
              }}>
                First things first...
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: '1.6',
                maxWidth: '320px',
                margin: '0 auto'
              }}>
                Buat profil untuk mempersonalisasi tampilan Anda dalam kolaborasi
              </p>
              
              {/* Illustration */}
              <div style={{
                marginTop: '40px',
                position: 'relative',
                width: '300px',
                height: '300px',
                margin: '40px auto 0',
                animation: 'floatGentle 3s ease-in-out infinite'
              }}>
                <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
                  {/* Book shelves background */}
                  {/* Left shelf */}
                  <rect x="20" y="90" width="100" height="4" fill="#D4A574" />
                  <rect x="30" y="75" width="25" height="15" rx="2" fill="#4ECDC4" />
                  <rect x="30" y="78" width="25" height="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="58" y="70" width="28" height="20" rx="2" fill="#6C63FF" />
                  <rect x="58" y="73" width="28" height="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="58" y="76" width="28" height="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="89" y="78" width="22" height="12" rx="2" fill="#FF6B9D" />
                  
                  {/* Right shelf */}
                  <rect x="280" y="100" width="100" height="4" fill="#D4A574" />
                  <rect x="285" y="75" width="30" height="25" rx="2" fill="#FFD93D" />
                  <rect x="285" y="78" width="30" height="2" fill="rgba(0,0,0,0.1)" />
                  <rect x="318" y="80" width="25" height="20" rx="2" fill="#4ECDC4" />
                  <rect x="318" y="83" width="25" height="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="346" y="85" width="28" height="15" rx="2" fill="#FF6B9D" />
                  
                  {/* Clouds */}
                  <ellipse cx="80" cy="130" rx="25" ry="15" fill="rgba(255,255,255,0.3)" />
                  <ellipse cx="95" cy="130" rx="20" ry="12" fill="rgba(255,255,255,0.3)" />
                  <ellipse cx="320" cy="160" rx="30" ry="18" fill="rgba(255,255,255,0.3)" />
                  <ellipse cx="340" cy="160" rx="25" ry="15" fill="rgba(255,255,255,0.3)" />
                  
                  {/* Decorative circles */}
                  <circle cx="90" cy="200" r="8" fill="#4ECDC4" opacity="0.5" />
                  <circle cx="310" cy="140" r="6" fill="#4ECDC4" opacity="0.5" />
                  <circle cx="100" cy="180" r="5" fill="#6C63FF" opacity="0.4" />
                  <circle cx="75" cy="210" r="10" fill="transparent" stroke="#6C63FF" strokeWidth="2" opacity="0.4" />
                  <circle cx="315" cy="175" r="12" fill="transparent" stroke="#4ECDC4" strokeWidth="2" opacity="0.4" />
                  
                  {/* Main globe with graduation cap */}
                  {/* Globe base */}
                  <circle cx="200" cy="240" r="90" fill="#4ECDC4" />
                  <circle cx="200" cy="240" r="90" fill="#6C63FF" opacity="0.6" />
                  
                  {/* Continents pattern */}
                  <path d="M 150 220 Q 160 215 170 220 Q 180 225 190 220 Q 200 215 210 222" 
                        fill="#4ECDC4" stroke="none" opacity="0.8" />
                  <ellipse cx="170" cy="250" rx="25" ry="20" fill="#4ECDC4" opacity="0.8" />
                  <ellipse cx="230" cy="260" rx="30" ry="25" fill="#4ECDC4" opacity="0.8" />
                  <path d="M 210 230 Q 220 225 235 230 L 240 245 Q 230 250 220 245 Z" 
                        fill="#4ECDC4" opacity="0.8" />
                  
                  {/* Graduation cap */}
                  <ellipse cx="200" cy="160" rx="55" ry="12" fill="#1a1a4d" />
                  <rect x="165" y="145" width="70" height="15" rx="2" fill="#1a1a4d" />
                  <path d="M 165 145 L 200 135 L 235 145" fill="#1a1a4d" />
                  
                  {/* Tassel */}
                  <line x1="235" y1="152" x2="255" y2="152" stroke="#FFB347" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="257" cy="152" r="5" fill="#FFB347" />
                  
                  {/* Glasses */}
                  <ellipse cx="175" cy="235" rx="22" ry="25" fill="transparent" stroke="#1a1a4d" strokeWidth="4" />
                  <ellipse cx="225" cy="235" rx="22" ry="25" fill="transparent" stroke="#1a1a4d" strokeWidth="4" />
                  <line x1="197" y1="235" x2="203" y2="235" stroke="#1a1a4d" strokeWidth="4" />
                  <ellipse cx="175" cy="235" rx="18" ry="21" fill="#93C5FD" opacity="0.3" />
                  <ellipse cx="225" cy="235" rx="18" ry="21" fill="#93C5FD" opacity="0.3" />
                  
                  {/* Eyes inside glasses */}
                  <circle cx="173" cy="233" r="6" fill="#1a1a4d" />
                  <circle cx="223" cy="233" r="6" fill="#1a1a4d" />
                  <circle cx="175" cy="231" r="2" fill="white" />
                  <circle cx="225" cy="231" r="2" fill="white" />
                  
                  {/* Cheeks */}
                  <circle cx="155" cy="250" r="8" fill="#FF6B9D" opacity="0.4" />
                  <circle cx="245" cy="250" r="8" fill="#FF6B9D" opacity="0.4" />
                  
                  {/* Mouth/smile */}
                  <path d="M 185 258 Q 200 265 215 258" stroke="#1a1a4d" strokeWidth="3" 
                        fill="none" strokeLinecap="round" opacity="0.7" />
                  
                  {/* Open book at bottom */}
                  <path d="M 120 310 L 200 300 L 280 310 L 280 340 Q 200 335 120 340 Z" 
                        fill="white" stroke="#1a1a4d" strokeWidth="2" />
                  <line x1="200" y1="300" x2="200" y2="337" stroke="#1a1a4d" strokeWidth="2" />
                  <path d="M 120 310 Q 200 305 280 310" stroke="none" fill="#FF6B9D" opacity="0.3" />
                  
                  {/* Book pages lines */}
                  <line x1="140" y1="318" x2="190" y2="315" stroke="#D1D5DB" strokeWidth="1.5" />
                  <line x1="140" y1="324" x2="190" y2="321" stroke="#D1D5DB" strokeWidth="1.5" />
                  <line x1="140" y1="330" x2="190" y2="327" stroke="#D1D5DB" strokeWidth="1.5" />
                  <line x1="210" y1="315" x2="260" y2="318" stroke="#D1D5DB" strokeWidth="1.5" />
                  <line x1="210" y1="321" x2="260" y2="324" stroke="#D1D5DB" strokeWidth="1.5" />
                  <line x1="210" y1="327" x2="260" y2="330" stroke="#D1D5DB" strokeWidth="1.5" />
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
              Create Account
            </h1>

            <form onSubmit={onSubmit}>
              {/* Name Field */}
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.5s ease-out 0.1s forwards', opacity: 0 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px'
                }}>
                  Nama Lengkap
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.5s ease-out 0.2s forwards', opacity: 0 }}>
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
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.5s ease-out 0.3s forwards', opacity: 0 }}>
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
                    placeholder="Minimal 6 karakter"
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

              {/* Confirm Password Field */}
              <div style={{ marginBottom: '24px', animation: 'fadeIn 0.5s ease-out 0.4s forwards', opacity: 0 }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px'
                }}>
                  Konfirmasi Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ulangi password"
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
                  'Daftar Sekarang'
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '24px',
              fontSize: '14px',
              color: '#64748b',
              animation: 'fadeIn 0.5s ease-out 0.5s forwards',
              opacity: 0
            }}>
              Sudah memiliki akun?{' '}
              <Link to="/login" style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'color 0.3s'
              }}>
                Masuk di sini
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}