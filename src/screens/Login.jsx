import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import bmwLogo from '../../BMW_logo.png';
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
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(161,0,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Login card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#141414',
          border: '1px solid #2A2A2A',
          borderRadius: '12px',
          padding: '36px 32px',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <img
            src={bmwLogo}
            alt="BMW Logo"
            style={{ width: '44px', height: '44px', objectFit: 'contain' }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: '700',
            color: '#FFFFFF',
            margin: '0 0 10px 0',
            lineHeight: 1.2,
          }}
        >
          Intelligent IAM Copilot
        </h1>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #2A2A2A', marginBottom: '24px' }} />

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#FFFFFF', marginBottom: '8px' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="firstname.lastname@corporate.com"
              className="input-field"
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#FFFFFF', marginBottom: '8px' }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-field"
                style={{ paddingRight: '44px' }}
                required
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
                  color: '#A0A0A0',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Keep signed in + Forgot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                style={{ accentColor: '#A100FF', width: '14px', height: '14px' }}
              />
              <span style={{ fontSize: '13px', color: '#A0A0A0' }}>Keep me signed in</span>
            </label>
            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A100FF',
                fontSize: '13px',
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: '600' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        {/* Footer hint */}
        <p style={{ fontSize: '12px', color: '#2A2A2A', textAlign: 'center', marginTop: '20px', margin: '20px 0 0 0' }}>
          Powered by Accenture
        </p>
      </div>
    </div>
  );
}
