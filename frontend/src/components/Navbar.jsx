import { Link, useNavigate, useLocation } from "react-router-dom";
import { Backend, getToken } from "../lib/backend";

function isAuthed() {
  return Boolean(getToken());
}

export default function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();
  const authed = isAuthed();

  const logout = () => {
  Backend.logout();
  nav("/");  
  };

  return (
    <nav style={{
      padding: '20px 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#4169E1',
      position: 'relative',
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '22px',
        fontWeight: '700',
        color: 'white',
        textDecoration: 'none'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'white',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#4169E1">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        Learning Buddy
      </Link>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        {authed ? (
          <>
            {loc.pathname !== "/dashboard" && (
              <Link to="/dashboard" style={{
                padding: '10px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '15px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}>
                Dashboard
              </Link>
            )}
            <button onClick={logout} style={{
              padding: '10px 24px',
              background: 'white',
              color: '#4169E1',
              borderRadius: '12px',
              border: 'none',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}>
              Keluar
            </button>
          </>
        ) : (
          <>
            {loc.pathname !== "/login" && (
              <Link to="/login" style={{
                padding: '10px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '15px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}>
                Login
              </Link>
            )}
            {loc.pathname !== "/register" && (
              <Link to="/register" style={{
                padding: '10px 24px',
                background: 'white',
                color: '#4169E1',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}>
                Register
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}