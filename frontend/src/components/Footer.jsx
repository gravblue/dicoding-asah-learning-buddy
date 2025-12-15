import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <>
      <footer style={{
        background: 'linear-gradient(135deg, #4169E1 0%, #4169E1 100%)',
        color: 'white',
        padding: '60px 5% 30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-80px',
          left: '-80px',
          width: '250px',
          height: '250px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(70px)'
        }} />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Main Footer Content */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
            gap: '60px',
            marginBottom: '50px'
          }}>
            {/* Brand Section */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'white',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#4169E1">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: 'white'
                }}>
                  Learning Buddy
                </div>
              </div>
              <p style={{
                fontSize: '15px',
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '24px',
                maxWidth: '350px'
              }}>
                Platform belajar cerdas yang membantu kamu memahami materi Dicoding lebih cepat dengan latihan interaktif dan penjelasan personal.
              </p>
              {/* Social Media */}
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                color: 'white'
              }}>
                Menu
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                <li style={{ marginBottom: '12px' }}>
                  <Link to="/" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Home
                  </Link>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <Link to="/dashboard" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Dashboard
                  </Link>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <Link to="/chat" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Chat
                  </Link>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <Link to="/about" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Tentang Kami
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                color: 'white'
              }}>
                Resources
              </h3>
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}>
                <li style={{ marginBottom: '12px' }}>
                  <a href="#" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Blog
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href="#" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Dokumentasi
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href="#" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    FAQ
                  </a>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <a href="#" style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    transition: 'all 0.2s',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateX(5px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = 'rgba(255, 255, 255, 0.85)';
                    e.target.style.transform = 'translateX(0)';
                  }}>
                    Tutorial
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Newsletter */}
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '20px',
                color: 'white'
              }}>
                Hubungi Kami
              </h3>
              <div style={{
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <a href="mailto:support@learningbuddy.com" style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textDecoration: 'none',
                    fontSize: '14px'
                  }}>
                    support@learningbuddy.com
                  </a>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px'
                  }}>
                    +62 812-3456-7890
                  </span>
                </div>
              </div>
              
              {/* Newsletter */}
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '12px'
              }}>
                Dapatkan tips belajar terbaru langsung ke inbox kamu!
              </p>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <input
                  type="email"
                  placeholder="Email kamu"
                  className="footer-email-placeholder"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
                <button style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#4169E1',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            paddingTop: '30px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.8)',
              margin: 0
            }}>
              © 2025 Learning Buddy. All rights reserved.
            </p>
            <div style={{
              display: 'flex',
              gap: '24px'
            }}>
              <a href="#" style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}>
                Kebijakan Privasi
              </a>
              <a href="#" style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}>
                Syarat & Ketentuan
              </a>
              <a href="#" style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}>
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* HANYA TAMBAHAN INI AJA UNTUK PLACEHOLDER PUTIH */}
      <style>{`
        .footer-email-placeholder::placeholder {
          color: white !important;
          opacity: 1;
        }
      `}</style>
    </>
  );
}