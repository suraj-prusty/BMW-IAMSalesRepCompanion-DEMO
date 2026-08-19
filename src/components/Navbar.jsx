import { useState, useContext } from 'react';
import { ChevronDown, User, LogOut, Sun, Moon, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import bmwLogo from '../../BMW_logo.png';
import { api } from '../services/api';
import { ThemeContext } from '../App';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewMode,     setViewMode]     = useState('Dealership');
  const navigate   = useNavigate();
  const { pathname } = useLocation();
  const isDashboard  = pathname === '/dashboard';
  const { isDark, toggleTheme } = useContext(ThemeContext);

  const currentUser = api.getUser();
  const userName    = currentUser?.name || 'User';
  const isManager   = currentUser?.isManager === true;
  const initials    = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <nav style={{
      height: '56px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      {/* Left: Logo + Title + Manager back link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={bmwLogo} alt="BMW Logo" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
        <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Intelligent IAM Copilot
        </span>
        {isManager && pathname !== '/team' && (
          <>
            <span style={{ color: 'var(--border)', fontSize: '16px', margin: '0 2px' }}>·</span>
            <button
              onClick={() => navigate('/team')}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '13px', padding: '3px 6px',
                borderRadius: '5px', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-raised)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Users size={13} /> My Team
            </button>
          </>
        )}
      </div>

      {/* Right: Dealer/IR toggle + Theme toggle + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Dealer / IR toggle — Dashboard only */}
        {isDashboard && (
          <div style={{
            display: 'flex',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px',
          }}>
            {['Dealer', 'IR'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '5px 13px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: viewMode === mode ? '600' : '400',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: 'none',
                  background: viewMode === mode ? 'var(--accent-bg)' : 'transparent',
                  color: viewMode === mode ? 'var(--accent)' : 'var(--text-secondary)',
                  outline: viewMode === mode ? '1px solid rgba(161,0,255,0.35)' : 'none',
                  transition: 'all 0.18s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (viewMode !== mode) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { if (viewMode !== mode) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* View Only badge — manager mode */}
        {isManager && (
          <span style={{
            fontSize: '11px', fontWeight: '600',
            color: '#F59E0B',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: '20px',
            padding: '3px 10px',
            whiteSpace: 'nowrap',
          }}>
            View Only
          </span>
        )}

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-primary)',
              padding: '6px 10px',
              borderRadius: '6px',
            }}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: isManager
                ? 'linear-gradient(135deg, #F59E0B, #B45309)'
                : 'linear-gradient(135deg, #A100FF, #7B2D8B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0,
            }}>{initials}</div>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{userName}</span>
            <ChevronDown size={14} color="var(--text-secondary)" />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px', minWidth: '160px', overflow: 'hidden', zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              <button
                onClick={() => setDropdownOpen(false)}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-raised)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={14} color="var(--text-secondary)" /> Profile
              </button>
              <button
                onClick={() => { setDropdownOpen(false); api.logout(); navigate('/login'); }}
                style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-raised)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} color="var(--text-secondary)" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
