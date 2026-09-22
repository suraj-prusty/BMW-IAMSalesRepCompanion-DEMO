import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Shield, Route, TrendingUp } from 'lucide-react';
import carBg from '../images/DI25_000321641.png';
import accentureLogo from '../../BMW_logo.png';
import { api } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.login(email, password);
      if (result.success) {
        navigate(result.user?.isManager ? '/team' : '/dashboard');
      } else {
        setError(result.error || 'Invalid Username & Password');
      }
    } catch (err) {
      setError(err.message || 'Invalid Username & Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        backgroundImage: `url(${carBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Light wash overlay — makes background image very subtle */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backdropFilter: 'blur(1px)',
          background: 'rgba(240,242,245,0.88)',
          pointerEvents: 'none',
        }}
      />

      {/* Two-panel card */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          maxWidth: '880px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          style={{
            flex: '0 0 42%',
            background: 'linear-gradient(160deg, #1a2a4a 0%, #1e3a6e 60%, #1a4080 100%)',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            color: '#ffffff',
          }}
        >
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
            {/* Accenture logo */}
            <img
              src={accentureLogo}
              alt="Accenture"
              style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.02em' }}>
              IAM Field Intelligence
            </span>
          </div>

          {/* Branding */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', textTransform: 'uppercase' }}>
              BMW &amp; MINI AFTERSALES
            </p>
            <h1 style={{ fontSize: '28px', fontWeight: '700', lineHeight: 1.25, margin: '0 0 14px 0' }}>
              Intelligent IAM Copilot
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '28px' }}>
              A focused workspace for dealer priorities, visit planning, field capture, and post-visit actions.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: <Shield size={15} />, label: 'Secure demo access' },
                { icon: <Route size={15} />, label: '3 planned stops' },
                { icon: <TrendingUp size={15} />, label: '+EUR 10.4k uplift' },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '32px' }}>
            <span>C1 Europe</span>
            <span>Field sales companion</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          style={{
            flex: 1,
            background: '#f4f5f7',
            padding: '44px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.14em',
              color: '#1e6fd9',
              textTransform: 'uppercase',
              marginBottom: '32px',
            }}
          >
            WELCOME BACK
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="firstname.lastname@corporate.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '14px', position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 16px',
                  background: '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Keep signed in + Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ accentColor: '#1e6fd9', width: '14px', height: '14px' }}
                />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Keep me signed in</span>
              </label>
              <button
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#1e6fd9',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '18px',
                }}
              >
                <AlertCircle size={14} color="#EF4444" />
                <span style={{ fontSize: '13px', color: '#EF4444' }}>{error}</span>
              </div>
            )}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#5a8fd9' : '#1e6fd9',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '24px' }}>
            Powered by Accenture
          </p>
        </div>
      </div>
    </div>
  );
}
