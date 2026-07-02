import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { formatShort } from '../utils/dateUtils';

const CONFETTI_COLORS = ['#A100FF', '#22C55E', '#F59E0B', '#EF4444', '#FFFFFF', '#7B2D8B'];

function ConfettiPiece({ style }) {
  return <div className="confetti-piece" style={style} />;
}

export default function Success() {
  const navigate = useNavigate();
  const location = useLocation();
  const dealerName = location.state?.dealerName || 'Dealer';
  const nextVisit = location.state?.nextVisit || null;
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 10 + 6}px`,
      height: `${Math.random() * 10 + 6}px`,
      background: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      borderRadius: Math.random() > 0.5 ? '50%' : '0',
      animationDuration: `${Math.random() * 2 + 2}s`,
      animationDelay: `${Math.random() * 1.5}s`,
      opacity: 1,
    }));
    setConfetti(pieces);
    const t = setTimeout(() => setConfetti([]), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Confetti */}
      {confetti.map((p) => (
        <ConfettiPiece
          key={p.id}
          style={{
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            background: p.background,
            borderRadius: p.borderRadius,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}

      {/* Green glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div style={{ textAlign: 'center', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
        {/* Checkmark */}
        <div
          style={{
            width: '80px',
            height: '80px',
            background: 'rgba(34,197,94,0.15)',
            border: '2px solid rgba(34,197,94,0.4)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <CheckCircle size={42} color="#22C55E" />
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '700', color: '#FFFFFF' }}>
          Visit Submitted Successfully
        </h1>
        <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#A0A0A0' }}>
          {dealerName} · {formatShort()}
        </p>

        {/* Summary pills */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '36px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: '3 Actions Agreed', color: '#A100FF', bg: 'rgba(161,0,255,0.12)', border: 'rgba(161,0,255,0.3)' },
            { label: '+€10,400 Est. Uplift', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
            { label: nextVisit ? `Next Visit: ${nextVisit}` : 'Next Visit: TBD', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                padding: '10px 18px',
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                color: pill.color,
              }}
            >
              {pill.label}
            </div>
          ))}
        </div>

        {/* Upload confirmation */}
        <div
          style={{
            background: '#141414',
            border: '1px solid #2A2A2A',
            borderRadius: '8px',
            padding: '14px 20px',
            marginBottom: '28px',
            fontSize: '13px',
            color: '#A0A0A0',
          }}
        >
          <span style={{ color: '#22C55E', marginRight: '6px' }}>✓</span>
          Visit report uploaded to Central System · Report ID: RPT-2025-0512-AG-001
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={{ padding: '14px 36px', fontSize: '15px', fontWeight: '600' }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
