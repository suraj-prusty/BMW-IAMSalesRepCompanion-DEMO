import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../services/api';

const PRIORITY_RANK = { HIGH: 0, MED: 1, LOW: 2 };

function getPriority(ir) {
  if (ir.high_turnover_low_activity_flag) return 'HIGH';
  if (ir.low_activity) return 'MED';
  return 'LOW';
}

function formatTurnover(value) {
  if (value == null) return '—';
  return value >= 1_000_000 ? `€${(value / 1_000_000).toFixed(1)}M` : `€${Math.round(value / 1000)}K`;
}

function Badge({ label, value, color }) {
  return (
    <div className="kpi-pill">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color, fontWeight: '600' }}>{value}</span>
    </div>
  );
}

// ── IR Card ──────────────────────────────────────────────────────────────────
function IRCard({ ir, isPlanned, onPostpone, onPlanToday, canPlan, isManager }) {
  const navigate = useNavigate();
  const priority = getPriority(ir);
  const priorityColor = priority === 'HIGH' ? '#EF4444' : priority === 'MED' ? '#F59E0B' : '#22C55E';
  const activityValue = ir.low_activity ? 'Quiet' : 'Active';
  const activityColor = ir.low_activity ? '#F59E0B' : '#22C55E';
  const declineValue = ir.decline_count == null ? '—' : ir.decline_count === 0 ? 'None' : String(ir.decline_count);
  const declineColor = ir.decline_count == null ? '#606060' : ir.decline_count === 0 ? '#22C55E' : ir.decline_count === 1 ? '#F59E0B' : '#EF4444';
  const trendColor = ir.volume_trend === 'Positive' ? '#22C55E' : ir.volume_trend === 'Negative' ? '#EF4444' : '#F59E0B';

  const openBriefing = () => navigate(`/ir/${ir.ir_code}`);
  return (
    <div
      className="card"
      onClick={openBriefing}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px',
        padding: '12px 16px',
        transition: 'border-color 0.2s, background 0.15s',
        cursor: !isPlanned && !isManager ? (canPlan ? 'grab' : 'not-allowed') : 'default',
        opacity: !isPlanned && !canPlan && !isManager ? 0.55 : 1,
      }}
      onMouseEnter={(event) => { event.currentTarget.style.borderColor = '#3a4a6a'; event.currentTarget.style.background = '#243044'; }}
      onMouseLeave={(event) => { event.currentTarget.style.borderColor = 'var(--border)'; event.currentTarget.style.background = 'var(--surface)'; }}
    >
      <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '2px', flexShrink: 0, background: priorityColor }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>
          {ir.customer_name}
          <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>
            ({ir.ir_code})
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {ir.dealer_city || '—'} · {ir.recency_days == null ? 'No recent activity' : `${ir.recency_days} days since purchase`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', flexShrink: 0 }}>
        <Badge label="Turnover" value={ir.high_turnover ? `${formatTurnover(ir.turnover)} High` : formatTurnover(ir.turnover)} color={ir.high_turnover ? '#22C55E' : 'var(--text-primary)'} />
        <Badge label="Activity" value={activityValue} color={activityColor} />
        <Badge label="Decline" value={declineValue} color={declineColor} />
        <Badge label="Volume" value={ir.volume_trend || '—'} color={trendColor} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexShrink: 0 }}>
        {isPlanned ? (
          <button
            onClick={(event) => { event.stopPropagation(); onPostpone?.(ir.ir_code); }}
            disabled={isManager}
            className="btn-secondary"
            style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '7px 12px', minHeight: 'unset', color: isManager ? undefined : 'var(--text-secondary)' }}
          >
            Postpone ↷
          </button>
        ) : onPlanToday ? (
          <button
            onClick={(event) => { event.stopPropagation(); if (canPlan) onPlanToday?.(ir.ir_code); }}
            disabled={!canPlan || isManager}
            className="btn-secondary"
            title={canPlan ? '' : 'Postpone a visit above to free a slot'}
            style={{
              whiteSpace: 'nowrap', fontSize: '12px', padding: '7px 12px', minHeight: 'unset',
              color: canPlan && !isManager ? '#2d72de' : 'var(--text-muted)',
              borderColor: canPlan && !isManager ? 'rgba(45,114,222,0.4)' : 'var(--border)',
              cursor: canPlan && !isManager ? 'pointer' : 'not-allowed', opacity: canPlan && !isManager ? 1 : 0.5,
            }}
          >
            + Plan Today
          </button>
        ) : null}
        <button
          onClick={(event) => { event.stopPropagation(); openBriefing(); }}
          className="btn-primary"
          style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '7px 14px', minHeight: 'unset' }}
        >
          View IR
        </button>
      </div>
    </div>
  );
}

export default function IRDashboard() {
  const navigate = useNavigate();
  const isManager = api.isManager();
  const [irs, setIrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [declineFilter, setDeclineFilter] = useState('all');
  const [trendFilter, setTrendFilter] = useState('all');
  const [plannedIds, setPlannedIds] = useState([]);

  useEffect(() => {
    api.getIRs()
      .then((data) => setIrs(Array.isArray(data) ? data : Array.isArray(data?.irs) ? data.irs : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredIrs = irs
    .filter((ir) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || ir.customer_name?.toLowerCase().includes(query) || String(ir.ir_code).includes(query);
      const matchesActivity = activityFilter === 'all' || (activityFilter === 'quiet' ? ir.low_activity : !ir.low_activity);
      const matchesDecline = declineFilter === 'all' || (declineFilter === 'declining' ? (ir.decline_count ?? 0) > 0 : (ir.decline_count ?? 0) === 0);
      const matchesTrend = trendFilter === 'all' || ir.volume_trend === trendFilter;
      return matchesSearch && matchesActivity && matchesDecline && matchesTrend;
    })
    .sort((left, right) => {
      const priorityDelta = PRIORITY_RANK[getPriority(left)] - PRIORITY_RANK[getPriority(right)];
      if (priorityDelta !== 0) return priorityDelta;
      return (right.turnover ?? -Infinity) - (left.turnover ?? -Infinity);
    });

  const plannedIrs = irs.filter((ir) => plannedIds.includes(ir.ir_code));
  const remainingIrs = filteredIrs.filter((ir) => !plannedIds.includes(ir.ir_code));
  const canPlanMore = plannedIrs.length < 3;
  const moveToPlanned = (id) => {
    if (plannedIrs.length >= 3) return;
    setPlannedIds((previous) => previous.includes(id) ? previous : [...previous, id]);
  };
  const postponeIR = (id) => setPlannedIds((previous) => previous.filter((plannedId) => plannedId !== id));

  const Filter = ({ label, value, onChange, children }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', padding: '6px 9px', fontFamily: 'inherit', outline: 'none' }}
      >
        {children}
      </select>
    </label>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>My IRs</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Prioritised by activity risk and purchase turnover</p>
        </div>
      </div>

      <div className="card" style={{ padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 230px', maxWidth: '320px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by IR name or code..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', padding: '7px 30px 7px 31px', outline: 'none', fontFamily: 'inherit' }}
            />
            {search && <button onClick={() => setSearch('')} title="Clear search" style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: '2px', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>}
          </div>
          <Filter label="Activity" value={activityFilter} onChange={setActivityFilter}>
            <option value="all">All</option><option value="quiet">Quiet</option><option value="active">Active</option>
          </Filter>
          <Filter label="Categories" value={declineFilter} onChange={setDeclineFilter}>
            <option value="all">All</option><option value="declining">Declining</option><option value="stable">No decline</option>
          </Filter>
          <Filter label="Volume trend" value={trendFilter} onChange={setTrendFilter}>
            <option value="all">All</option><option value="Positive">Positive</option><option value="Negative">Negative</option><option value="Flat">Flat</option>
          </Filter>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading IRs...</div>}
      {!loading && error && <div style={{ padding: '16px', color: '#EF4444', fontSize: '13px' }}>Error loading IRs: {error}</div>}
      {!loading && !error && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '3px solid #A100FF', paddingLeft: '10px', marginBottom: '4px' }}>
              Recommended for this week
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '13px', marginBottom: '14px' }}>
              {plannedIrs.length} of 3 slots filled · Postpone a visit to free a slot
            </div>
            {plannedIrs.length === 0 ? (
              <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#505050', fontSize: '13px' }}>
                Plan an IR visit for today
              </div>
            ) : plannedIrs.map((ir) => (
              <IRCard key={ir.ir_code} ir={ir} isPlanned={true} isManager={isManager} onPostpone={postponeIR} canPlan={canPlanMore} />
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', borderLeft: '3px solid #3A3A3A', paddingLeft: '10px', marginBottom: '8px' }}>
              My IRs ({remainingIrs.length})
            </div>
            <div style={{ fontSize: '11px', color: canPlanMore ? '#A100FF' : '#8090B0', paddingLeft: '13px', marginBottom: '12px' }}>
              {canPlanMore
                ? `${3 - plannedIrs.length} slot${3 - plannedIrs.length !== 1 ? 's' : ''} available — click + Plan Today`
                : 'Postpone a visit above to free a slot'}
            </div>
            {remainingIrs.map((ir) => (
              <IRCard key={ir.ir_code} ir={ir} isPlanned={false} isManager={isManager} canPlan={canPlanMore} onPlanToday={moveToPlanned} />
            ))}
            {remainingIrs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>No IRs match the selected filters.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
