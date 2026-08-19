import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, BarChart2, ClipboardList, Building2 } from 'lucide-react';
import { api } from '../services/api';

const TEAM_MEMBERS = [
  {
    id: 'marcus-schmidt',
    name: 'Marcus Schmidt',
    initials: 'MS',
    role: 'C1 Europe Sales Executive',
    territory: 'C1 Europe',
    stats: [
      { label: 'Dealers', value: 18 },
      { label: 'Planned Today', value: 3 },
      { label: 'Open Actions', value: 6 },
    ],
    kpis: [
      { label: 'Avg Rev vs Target', value: '−12.4%', color: '#EF4444' },
      { label: 'HIGH Priority', value: '4 dealers', color: '#F59E0B' },
      { label: 'ABC-A', value: '6 dealers', color: '#22C55E' },
    ],
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TeamSelect() {
  const navigate = useNavigate();
  const manager  = api.getUser();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 28px' }}>

      {/* Manager greeting */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {greeting()}, {manager?.name || 'Manager'}
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
          {manager?.role} · {manager?.territory}
        </p>
      </div>

      {/* Team section */}
      <div style={{ maxWidth: '680px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Users size={14} color="var(--text-secondary)" />
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: '0.07em', color: 'var(--text-secondary)',
          }}>
            My Team
          </span>
        </div>

        {TEAM_MEMBERS.map((rep) => (
          <div
            key={rep.id}
            className="card"
            onClick={() => navigate('/dashboard')}
            style={{
              cursor: 'pointer',
              padding: '22px 24px',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(161,0,255,0.5)';
              e.currentTarget.style.background  = 'rgba(161,0,255,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background  = 'var(--surface)';
            }}
          >
            {/* Top row: avatar + name + arrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #A100FF, #7B2D8B)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: '700', color: '#fff',
              }}>
                {rep.initials}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>
                  {rep.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {rep.role} · {rep.territory}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '13px', fontWeight: '500' }}>
                View Reports <ArrowRight size={15} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', marginBottom: '16px' }} />

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '16px' }}>
              {rep.stats.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    paddingRight: i < rep.stats.length - 1 ? '20px' : 0,
                    borderRight: i < rep.stats.length - 1 ? '1px solid var(--border)' : 'none',
                    marginRight: i < rep.stats.length - 1 ? '20px' : 0,
                  }}
                >
                  <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '4px' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* KPI pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {rep.kpis.map((k) => (
                <div
                  key={k.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{k.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: k.color }}>{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
