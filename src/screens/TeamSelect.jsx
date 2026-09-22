import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { api } from '../services/api';
import { TEAM_REPS } from '../data/teamReps';
import { getTodayLong } from '../utils/dateUtils';
import TeamDocuments from '../components/TeamDocuments';

const PAGE_SIZE = 6; // even multiple of the 2-column desktop grid

// Below this viewport width: Dealer/IR panels stack, and KPI rows become a vertical list.
const MOBILE_BREAKPOINT = 780;
// At/above this viewport width: representative cards render two-up.
const TWO_COL_BREAKPOINT = 1150;

const AVATAR_PALETTE = [
  'linear-gradient(135deg, #22D3C5, #0E7C86)', // teal
  'linear-gradient(135deg, #F59E0B, #B45309)', // amber
  'linear-gradient(135deg, #22C55E, #15803D)', // green
  'linear-gradient(135deg, #A100FF, #7B2D8B)', // purple (existing accent)
];

const AMBER = '#F59E0B';
const GREEN = '#22C55E';
const RED   = '#EF4444';

// Exactly 5 Dealer KPIs, in required order.
const DEALER_KPI_FIELDS = [
  { key: 'totalDealers',     label: 'Total Dealers',      format: (v) => `${v}` },
  { key: 'tasksThisWeek',    label: 'Tasks This Week',    format: (v) => `${v}` },
  { key: 'tasksOverdue',     label: 'Tasks Overdue',      format: (v) => String(v).padStart(2, '0'), color: (v) => (v > 0 ? AMBER : 'var(--text-primary)') },
  { key: 'salesVsTarget',    label: 'Sales vs Target',    format: (v) => `${v}%`, color: (v) => (v >= 100 ? GREEN : AMBER) },
  { key: 'purchaseVsTarget', label: 'Purchase vs Target', format: (v) => `${v}%`, color: (v) => (v >= 90 ? GREEN : AMBER) },
];

// Exactly 4 IR Workshop KPIs, in required order.
const IR_KPI_FIELDS = [
  { key: 'totalWorkshops', label: 'Total Workshops', format: (v) => `${v}` },
  { key: 'tasksThisWeek',  label: 'Tasks This Week',  format: (v) => `${v}` },
  { key: 'tasksOverdue',   label: 'Tasks Overdue',   format: (v) => String(v).padStart(2, '0'), color: (v) => (v > 0 ? AMBER : 'var(--text-primary)') },
  {
    key: 'purchaseDeviation', label: 'Purchase Deviation',
    format: formatDeviation,
    color: (v) => (v >= 0 ? GREEN : RED),
  },
];

function formatDeviation(value) {
  const k = Math.round(Math.abs(value) / 1000);
  return `${value < 0 ? '-' : '+'}€${k}K`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// "12:39" — native Date only, no date library.
function formatTime(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Tracks viewport width so the layout can react to real resizes, not just initial load.
function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function KpiItem({ label, value, color, sub }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '5px', lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{ fontSize: '17px', fontWeight: '700', color: color || 'var(--text-primary)', lineHeight: 1.15 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{sub}</div>}
    </div>
  );
}

function KpiPanel({ title, columns, children }) {
  return (
    <div>
      <div className="section-label-muted" style={{ marginBottom: '10px' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: columns, rowGap: '14px', columnGap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

function RepCard({ rep, onOpen, isMobile, avatarBg }) {
  const dk = rep.dealerKpis;
  const ik = rep.irWorkshopKpis;
  const panelCols   = isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))';
  const dealerCols  = isMobile ? '1fr' : `repeat(${DEALER_KPI_FIELDS.length}, minmax(0, 1fr))`;
  const irCols      = isMobile ? '1fr' : `repeat(${IR_KPI_FIELDS.length}, minmax(0, 1fr))`;

  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ cursor: 'pointer', padding: isMobile ? '16px' : '22px 24px', transition: 'border-color 0.2s, background 0.2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(161,0,255,0.5)'; e.currentTarget.style.background = 'rgba(161,0,255,0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
    >
      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '700', color: '#fff',
        }}>
          {rep.initials}
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>
            {rep.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {rep.region} · {rep.role}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>
          View reports <ArrowRight size={15} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginBottom: '18px' }} />

      {/* Dealer + IR Workshops — same representative, side by side on wide viewports */}
      <div style={{ display: 'grid', gridTemplateColumns: panelCols, gap: isMobile ? '20px' : '24px' }}>
        <KpiPanel title="Dealer" columns={dealerCols}>
          {DEALER_KPI_FIELDS.map((f) => (
            <KpiItem key={f.key} label={f.label} value={f.format(dk[f.key])} color={f.color?.(dk[f.key])} />
          ))}
        </KpiPanel>

        <KpiPanel title="IR Workshops" columns={irCols}>
          {IR_KPI_FIELDS.map((f) => (
            <KpiItem
              key={f.key}
              label={f.label}
              value={f.format(ik[f.key])}
              color={f.color?.(ik[f.key])}
              sub={f.key === 'purchaseDeviation' ? ik.purchaseDeviationComparison : undefined}
            />
          ))}
        </KpiPanel>
      </div>
    </div>
  );
}

const MANAGER_KPIS = [
  { key: 'purchaseRevVsTarget', label: 'Purchase Rev vs Target' },
  { key: 'abc',                 label: 'ABC' },
  { key: 'revYoY',              label: 'Rev YoY' },
  { key: 'custMoM',             label: 'Cust YoY' },
];

function KpiPillBar({ selected, onToggle }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {MANAGER_KPIS.map((kpi) => {
          const isSelected = selected.has(kpi.key);
          const isDisabled = !isSelected && selected.size >= 2;
          return (
            <button
              key={kpi.key}
              onClick={() => !isDisabled && onToggle(kpi.key)}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                border: isSelected ? '2px solid #A100FF' : '1.5px solid rgba(255,255,255,0.25)',
                background: isSelected ? 'rgba(161,0,255,0.15)' : 'rgba(255,255,255,0.07)',
                color: isSelected ? '#A100FF' : isDisabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
                fontSize: '13px',
                fontWeight: isSelected ? '700' : '500',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                fontFamily: 'inherit',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
                letterSpacing: '0.01em',
              }}
              title={isDisabled ? 'Max 2 KPIs can be selected' : isSelected ? 'Deselect' : 'Select'}
            >
              {isSelected && <span style={{ marginRight: '5px', fontSize: '11px' }}>✓</span>}
              {kpi.label}
            </button>
          );
        })}
        {selected.size > 0 && (
          <button
            onClick={() => onToggle(null)}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1.5px solid transparent',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Select up to 2 KPIs — dealerships marked{' '}
        <span style={{ color: '#EF4444', fontWeight: '600' }}>Critical</span>{' '}
        under the chosen KPIs will be highlighted across your team.
      </div>
    </div>
  );
}

export default function TeamSelect() {
  const navigate = useNavigate();
  const manager  = api.getUser();
  const width    = useViewportWidth();
  const isMobile = width < MOBILE_BREAKPOINT;
  const isTwoCol = width >= TWO_COL_BREAKPOINT;

  const [repSearch,    setRepSearch]    = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [selectedKpis, setSelectedKpis] = useState(new Set());

  const handleKpiToggle = (key) => {
    setSelectedKpis((prev) => {
      if (key === null) return new Set();
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 2) next.add(key);
      return next;
    });
  };

  const filteredReps = useMemo(() => {
    const q = repSearch.trim().toLowerCase();
    if (q === '') return TEAM_REPS;
    return TEAM_REPS.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q)
    );
  }, [repSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredReps.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);

  // Keep currentPage in sync with the clamped value (e.g. after a search narrows the result set).
  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
  }, [safePage, currentPage]);

  // Jump back to page 1 whenever the search term changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [repSearch]);

  const visibleReps = filteredReps.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstName   = (manager?.name || 'Manager').split(' ')[0];

  const avatarByRepId = useMemo(() => {
    const m = {};
    TEAM_REPS.forEach((r, i) => { m[r.id] = AVATAR_PALETTE[i % AVATAR_PALETTE.length]; });
    return m;
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: isMobile ? '20px 16px' : '32px 28px' }}>

      {/* Manager View eyebrow + greeting */}
      <div style={{ marginBottom: isMobile ? '28px' : '36px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Manager View · {getTodayLong()} · Updated {formatTime()}
        </div>
        <h1 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '22px' : '26px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {greeting()}, {firstName}.
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
          Your authorized Sales Representative portfolio at a glance.
        </p>
      </div>

      {/* KPI Filter Pills */}
      <KpiPillBar selected={selectedKpis} onToggle={handleKpiToggle} />

      {/* Sales Representative Performance section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px', marginBottom: '20px',
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              My Team
            </div>
            <h2 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Sales Representative performance
            </h2>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <SearchIcon size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search representative"
              value={repSearch}
              onChange={(e) => setRepSearch(e.target.value)}
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                padding: '10px 30px 10px 34px',
                width: '100%',
                outline: 'none',
                fontFamily: 'inherit',
                minHeight: '40px',
              }}
              onFocus={(e) => e.target.style.borderColor = '#A100FF'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            {repSearch && (
              <button
                onClick={() => setRepSearch('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: 0,
                }}
              >×</button>
            )}
          </div>
        </div>

        {/* Rep list + empty state */}
        {filteredReps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No sales representatives found
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isTwoCol ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '16px' }}>
              {visibleReps.map((rep) => (
                <RepCard
                  key={rep.id}
                  rep={rep}
                  isMobile={isMobile}
                  avatarBg={avatarByRepId[rep.id]}
                  onOpen={() => {
                    sessionStorage.setItem('managerSelectedRepId', rep.id);
                    navigate('/dashboard');
                  }}
                />
              ))}
            </div>

            {/* Pagination — kept visually attached to the rep list */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '20px' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '7px 12px' }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '7px 12px' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Team Documents — separate, team-level section */}
      <TeamDocuments />
    </div>
  );
}

