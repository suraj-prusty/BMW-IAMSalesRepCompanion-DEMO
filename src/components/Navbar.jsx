import { useState } from 'react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import bmwLogo from '../../BMW_logo.png';
import { api } from '../services/api';

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState('Dealership');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === '/dashboard';

  return (
    <nav
      style={{
        height: '56px',
        background: '#0A0A0A',
        borderBottom: '1px solid #2A2A2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src={bmwLogo}
          alt="BMW Logo"
          style={{ width: '34px', height: '34px', objectFit: 'contain' }}
        />
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
          Intelligent IAM Copilot
        </span>
      </div>

      {/* Right: Toggle + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

      {/* Dealer / IR toggle — Dashboard only */}
      {isDashboard && (
        <div
          style={{
            display: 'flex',
            background: '#1C1C1C',
            border: '1px solid #2A2A2A',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px',
          }}
        >
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
                background: viewMode === mode
                  ? 'rgba(161,0,255,0.18)'
                  : 'transparent',
                color: viewMode === mode ? '#A100FF' : '#A0A0A0',
                transition: 'all 0.18s',
                whiteSpace: 'nowrap',
                outline: viewMode === mode ? '1px solid rgba(161,0,255,0.35)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== mode) e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                if (viewMode !== mode) e.currentTarget.style.color = '#A0A0A0';
              }}
            >
              {mode}
            </button>
          ))}
        </div>
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
            color: '#FFFFFF',
            padding: '6px 10px',
            borderRadius: '6px',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #A100FF, #7B2D8B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            MS
          </div>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Marcus Schmidt</span>
          <ChevronDown size={14} color="#A0A0A0" />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              background: '#141414',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              minWidth: '160px',
              overflow: 'hidden',
              zIndex: 200,
            }}
          >
            <button
              onClick={() => setDropdownOpen(false)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1C1C')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <User size={14} color="#A0A0A0" /> Profile
            </button>
            <button
              onClick={() => { setDropdownOpen(false); api.logout(); navigate('/login'); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid #2A2A2A',
                color: '#FFFFFF',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1C1C')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} color="#A0A0A0" /> Logout
            </button>
          </div>
        )}
      </div>

      </div>
    </nav>
  );
}
