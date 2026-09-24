import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';
import { api } from '../services/api';

// ── Badge map ─────────────────────────────────────────────────────────────────
const BADGE       = { HIGH: 'badge-high', MED: 'badge-med', LOW: 'badge-low' };
const BADGE_LABEL = { HIGH: 'HIGH PRIORITY', MED: 'MEDIUM PRIORITY', LOW: 'LOW PRIORITY' };

// Normalise pitch to [{issue, data, action}] regardless of whether the API
// returned a JSON array (old format) or a markdown-numbered string (new format).
function normalisePitch(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  const items = [];
  const re = /\d+\.\s+\*\*([^*]+)\*\*[:\s]+([\s\S]*?)(?=\s*\d+\.\s+\*\*|$)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const body = m[2].trim();
    if (body) items.push({ issue: m[1].trim(), data: '', action: body });
  }
  return items.length > 0 ? items : [{ issue: 'Pitch', data: '', action: raw }];
}

// ── Dynamic prompt builders (IR KPI set) ──────────────────────────────────────
const PITCH_SYSTEM = `You are an expert IAM sales coach. Generate a personalised pre-visit pitch for a field executive visiting an Independent Repairer (IR) today. Return ONLY a valid JSON array — no markdown fences, no explanation, no surrounding text. Each element must have exactly three string fields:
- "issue": the specific performance topic or opportunity (short label, e.g. "Engagement & Recency Risk")
- "data": 1–2 key metrics or facts that support it (concise, cite actual numbers)
- "action": an exact question or proposal to raise during the visit (direct, persuasive, specific)
Generate 3–5 pitch points covering the most critical issues and one positive/opportunity angle. Output must be parseable by JSON.parse().`;

const SUMMARY_SYSTEM = `You are an IAM territory intelligence analyst. Generate a pre-visit IR intelligence summary of 5-6 sentences covering: overall purchasing posture versus peer average, activity/recency, declining categories (always cite the actual numbers), year-on-year trend, and the top priorities for today's visit. Third person, no bullet points, factual and concise.`;

function buildIRKpiLines(ir) {
  const fmtPct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  return [
    `- Turnover: ${ir.turnover != null ? `€${ir.turnover.toLocaleString()}` : '—'} (peer avg: ${ir.avg_turnover != null ? `€${ir.avg_turnover.toLocaleString()}` : '—'})`,
    `- Activity: ${ir.low_activity ? 'Quiet' : 'Active'} — ${ir.recency_days ?? '—'} days since last purchase, ${ir.invoice_count ?? '—'} invoices (3 months)`,
    `- Volume: ${ir.volume != null ? ir.volume.toLocaleString() : '—'} units (peer avg: ${ir.avg_volume != null ? ir.avg_volume.toLocaleString() : '—'})`,
    `- Declining categories (value): ${ir.categories_with_decline_pct && ir.categories_with_decline_pct !== 'None' ? ir.categories_with_decline_pct : 'None'}`,
    `- Volume trend: ${ir.volume_trend || '—'}`,
    `- Purchase YoY (value): ${fmtPct(ir.yoy_value_pct)}`,
    `- Purchase YoY (volume): ${fmtPct(ir.yoy_volume_pct)}`,
    `- Top declining categories: ${ir.top_declining_categories && ir.top_declining_categories !== 'None' ? ir.top_declining_categories : 'None'}`,
  ].join('\n');
}

function buildPitchPrompt(ir, data) {
  const issueLines = data.issues.map(i => `- ${i.title}: ${i.impact}`).join('\n');
  return `Generate an opening pitch for a field executive visiting ${ir.name} (${ir.ir_code}) today.\n\nIR: ${ir.name}, ${ir.location}\nPriority: ${ir.priority}\n\nKey KPIs:\n${buildIRKpiLines(ir)}\n\nTop issues:\n${issueLines}`;
}

function buildSummaryPrompt(ir, data) {
  const issueLines = data.issues.map(i => `${i.num}. ${i.title}: ${i.impact}`).join('\n');
  return `Generate a pre-visit intelligence summary for ${ir.name} (${ir.ir_code}).\n\nIR: ${ir.name}, ${ir.location}\nPriority: ${ir.priority} | Last purchase: ${ir.last_purchase_date || '—'} (${ir.recency_days ?? '—'} days ago)\n\nKPIs:\n${buildIRKpiLines(ir)}\n\nTop issues:\n${issueLines}`;
}

// ── Category string parsing (tolerates "None" and empty string, per §6.5) ─────
function parseCategoryNames(str) {
  if (!str || str === 'None') return [];
  return str.split(',').map((s) => s.split(':')[0].trim()).filter(Boolean);
}

// ── Suggested agenda — derived from declining categories + activity (§4.5) ────
function buildSuggestedAgenda(ir) {
  const items = [];
  if (ir.low_activity) {
    items.push(`Re-establish ordering cadence — ${ir.recency_days ?? '—'} days since last purchase`);
  }
  if (ir.declineNames.length > 0) {
    items.push(`Review declining categories: ${ir.declineNames.join(', ')}`);
  }
  if (ir.volume_trend === 'Negative') {
    items.push('Investigate drivers behind the negative volume trend');
  }
  if (ir.yoy_value_pct != null && ir.yoy_value_pct < 0) {
    items.push('Discuss year-on-year purchase decline and a recovery plan');
  }
  items.push('Confirm next order timeline and follow-up actions');
  return items.map((item, i) => ({ order: i + 1, item }));
}

// ── Normalize raw API response to IR detail shape (spec §6.3 field names) ──────
function normalizeIRDetail(raw) {
  const flag     = raw.high_turnover_low_activity_flag;
  const priority = flag ? 'HIGH' : raw.low_activity ? 'MED' : 'LOW';

  const turnoverVsPeerPct = (raw.turnover != null && raw.avg_turnover)
    ? (raw.turnover / raw.avg_turnover - 1) * 100 : null;
  const volumeVsPeerPct = (raw.volume != null && raw.avg_volume)
    ? (raw.volume / raw.avg_volume - 1) * 100 : null;

  const declineNames = parseCategoryNames(raw.categories_with_decline_pct);
  const declineCount = raw.decline_count != null ? raw.decline_count : declineNames.length;

  return {
    ...raw,
    id:        raw.ir_code,
    name:      raw.customer_name,
    location:  [raw.dealer_city, raw.country].filter(Boolean).join(', ') || '—',
    priority,
    turnoverVsPeerPct,
    volumeVsPeerPct,
    declineNames,
    declineCount,
  };
}

export default function IRBriefing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isManager = api.isManager();

  // ── API state ─────────────────────────────────────────────────────────────────
  const [irData,          setIrData]          = useState(null);
  const [apiLoading,      setApiLoading]      = useState(true);
  const [apiError,        setApiError]        = useState(null);
  const [insightsData,    setInsightsData]    = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [showFullKPI,    setShowFullKPI]    = useState(false);
  const [pitch,          setPitch]          = useState(null);
  const [pitchLoading,   setPitchLoading]   = useState(false);
  const [pitchError,     setPitchError]     = useState('');
  const [pitchCount,     setPitchCount]     = useState(0);
  const [summary,        setSummary]        = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError,   setSummaryError]   = useState('');
  const [summaryCount,   setSummaryCount]   = useState(0);

  useEffect(() => {
    api.getIRByCode(id)
      .then(data => {
        console.log('[GET /irs/:code]', data);
        setIrData(data);
      })
      .catch(err => {
        console.error('[GET /irs/:code] error:', err);
        setApiError(err.message);
      })
      .finally(() => setApiLoading(false));
  }, [id]);

  useEffect(() => {
    api.getIRInsights(id)
      .then(data => {
        console.log('[GET /irs/:code/insights]', data);
        setInsightsData(data);
      })
      .catch(err => console.error('[GET /irs/:code/insights] FAILED:', err))
      .finally(() => setInsightsLoading(false));
  }, [id]);

  // ── Loading gate ───────────────────────────────────────────────────────────────
  if (apiLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading IR data...</div>
      </div>
    );
  }

  // ── Error gate ─────────────────────────────────────────────────────────────────
  if (apiError && !irData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#EF4444', fontSize: '14px' }}>Error loading IR: {apiError}</div>
      </div>
    );
  }

  // ── Derive IR + reused-section data stub ───────────────────────────────────────
  const ir = normalizeIRDetail(irData);

  const mappedIssues = (insightsData?.top_issues || []).map(i => ({
    num:       i.num,
    title:     i.title,
    rootCause: i.root_cause,
    impact:    i.impact,
  }));
  const data = { issues: mappedIssues, agenda: buildSuggestedAgenda(ir) };

  // ── KPI helpers ──────────────────────────────────────────────────────────────
  const fmtPct = (v, dec = 1) =>
    v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(dec)}%`;
  const fmtEur = (n) =>
    n == null ? '—' : n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : `€${Math.round(n / 1000)}K`;
  const fmtUnits = (n) =>
    n == null ? '—' : n.toLocaleString();
  const fmtCat = (str) =>
    str && str !== 'None' ? str : 'None';
  const pctColor = (v, warnAt = -10) =>
    v == null ? '#606060' : v >= 0 ? '#22C55E' : v >= warnAt ? '#F59E0B' : '#EF4444';
  const peerColor = (v) =>
    v == null ? '#606060' : v >= 0 ? '#22C55E' : v >= -20 ? '#F59E0B' : '#EF4444';
  const recencyColor = (d) =>
    d == null ? '#606060' : d <= 30 ? '#22C55E' : d <= 45 ? '#F59E0B' : '#EF4444';
  const invoiceColor = (n) =>
    n == null ? '#606060' : n >= 2 ? '#22C55E' : n === 1 ? '#F59E0B' : '#EF4444';
  const declineColor = (n) =>
    n == null ? '#606060' : n === 0 ? '#22C55E' : n === 1 ? '#F59E0B' : '#EF4444';
  const trendColor = (t) =>
    t === 'Positive' ? '#22C55E' : t === 'Negative' ? '#EF4444' : '#F59E0B';

  // KPI pill strip — 4 pills (from real API data) + disabled AOS/PL24 slots (§4.2)
  const kpiBarData = [
    {
      label: 'Turnover',
      value: `${fmtEur(ir.turnover)}${ir.turnoverVsPeerPct != null ? ` (${ir.turnoverVsPeerPct >= 0 ? '+' : ''}${ir.turnoverVsPeerPct.toFixed(0)}% vs peer)` : ''}`,
      color: peerColor(ir.turnoverVsPeerPct),
    },
    {
      label: 'Activity',
      value: ir.recency_days == null && ir.invoice_count == null
        ? `${ir.low_activity ? 'Quiet' : 'Active'} · No recent activity`
        : `${ir.low_activity ? 'Quiet' : 'Active'} · ${ir.recency_days ?? '—'}d · ${ir.invoice_count ?? '—'} inv`,
      color: ir.low_activity ? '#F59E0B' : '#22C55E',
    },
    {
      label: 'Declining Categories',
      value: `${ir.declineCount ?? '—'}${ir.declineNames.length ? ` · ${ir.declineNames.join(', ')}` : ''}`,
      color: declineColor(ir.declineCount),
    },
    {
      label: 'Volume Trend',
      value: ir.volume_trend || '—',
      color: trendColor(ir.volume_trend),
    },
  ];

  // Disabled placeholder pills — data source to be confirmed (§2, §6.5)
  const disabledPills = [
    { label: 'AOS', value: 'Pending' },
    { label: 'PL24', value: 'Pending' },
  ];

  // Full KPI table — all 11 metrics (§4.3), using exact §6 field names
  const fullKpiTable = [
    {
      metric: 'Purchase turnover vs peer average',
      actual: fmtEur(ir.turnover),
      target: fmtEur(ir.avg_turnover),
      note:   ir.turnoverVsPeerPct != null ? `${ir.turnoverVsPeerPct >= 0 ? '+' : ''}${ir.turnoverVsPeerPct.toFixed(1)}% vs peer average` : 'No turnover data',
      color:  peerColor(ir.turnoverVsPeerPct),
    },
    {
      metric: 'Invoice count (3 months)',
      actual: ir.invoice_count != null ? String(ir.invoice_count) : '—',
      target: '≥ 2',
      note:   ir.invoice_count == null ? 'No invoice data' : ir.invoice_count >= 2 ? 'Regular ordering cadence' : 'Low ordering cadence',
      color:  invoiceColor(ir.invoice_count),
    },
    {
      metric: 'Recency in days',
      actual: ir.recency_days != null ? `${ir.recency_days}d` : '—',
      target: '≤ 30d',
      note:   ir.recency_days == null ? 'No recency data' : ir.recency_days <= 30 ? 'Recently active' : 'Overdue for re-engagement',
      color:  recencyColor(ir.recency_days),
    },
    {
      metric: 'Volume in units vs peer average',
      actual: fmtUnits(ir.volume),
      target: fmtUnits(ir.avg_volume),
      note:   ir.volumeVsPeerPct != null ? `${ir.volumeVsPeerPct >= 0 ? '+' : ''}${ir.volumeVsPeerPct.toFixed(1)}% vs peer average` : 'No volume data',
      color:  peerColor(ir.volumeVsPeerPct),
    },
    {
      metric: 'Category decline — value',
      actual: fmtCat(ir.categories_with_decline_pct),
      target: 'None',
      note:   ir.declineNames.length ? `${ir.declineNames.length} declining ${ir.declineNames.length === 1 ? 'category' : 'categories'} by value` : 'No value decline',
      color:  declineColor(ir.declineNames.length),
    },
    {
      metric: 'Category decline — volume',
      actual: fmtCat(ir.categories_with_decline_pct_volume),
      target: 'None',
      note:   parseCategoryNames(ir.categories_with_decline_pct_volume).length ? 'Declining categories by volume' : 'No volume decline',
      color:  declineColor(parseCategoryNames(ir.categories_with_decline_pct_volume).length),
    },
    {
      metric: 'Category trend — value',
      actual: fmtCat(ir.categories_with_trend_summary),
      target: 'Positive',
      note:   'Per-category value trend summary',
      color:  'var(--text-primary)',
    },
    {
      metric: 'Category trend — volume',
      actual: fmtCat(ir.categories_with_trend_summary_volume),
      target: 'Positive',
      note:   'Per-category volume trend summary',
      color:  'var(--text-primary)',
    },
    {
      metric: 'Purchase year-on-year — value',
      actual: fmtPct(ir.yoy_value_pct),
      target: 'Positive (≥ 0%)',
      note:   ir.yoy_value_pct == null ? 'No YoY data'
            : ir.yoy_value_pct >= 0    ? 'Year-on-year value growth'
            :                            'Year-on-year value decline',
      color:  pctColor(ir.yoy_value_pct),
    },
    {
      metric: 'Purchase year-on-year — volume',
      actual: fmtPct(ir.yoy_volume_pct),
      target: 'Positive (≥ 0%)',
      note:   ir.yoy_volume_pct == null ? 'No YoY data'
            : ir.yoy_volume_pct >= 0    ? 'Year-on-year volume growth'
            :                             'Year-on-year volume decline',
      color:  pctColor(ir.yoy_volume_pct),
    },
    {
      metric: 'Top declining categories year-on-year',
      actual: fmtCat(ir.top_declining_categories),
      target: '—',
      note:   ir.top_declining_categories && ir.top_declining_categories !== 'None' ? 'Prioritise these categories on-site' : 'No declining categories',
      color:  ir.top_declining_categories && ir.top_declining_categories !== 'None' ? '#EF4444' : '#22C55E',
    },
  ];

  const subtitle = [
    ir.location,
    `Last purchase: ${ir.last_purchase_date || '—'}${ir.recency_days != null ? ` · ${ir.recency_days} days ago` : ''}`,
  ].filter(Boolean).join(' · ');

  const handleGenerateSummary = async () => {
    // First click ("Generate"): show cached endpoint content with brief loading feel
    if (!summary && insightsData?.summary) {
      setSummaryLoading(true);
      await new Promise((r) => setTimeout(r, 1200));
      setSummary(insightsData.summary);
      setSummaryLoading(false);
      return;
    }
    // Subsequent clicks ("Regenerate"): rephrase via Azure OpenAI
    setSummaryLoading(true); setSummaryError('');
    try {
      const userPrompt = summary
        ? `Rephrase and improve the following IR intelligence summary. Keep all facts and numbers exactly the same — only improve clarity, flow, and engagement. Return only the rephrased text, no preamble.\n\nCurrent summary:\n${summary}`
        : buildSummaryPrompt(ir, data);
      const result = await api.generate({
        systemPrompt: SUMMARY_SYSTEM,
        userPrompt,
        maxTokens: 420,
        temperature: 0.7,
      });
      setSummary(result);
      setSummaryCount(c => c + 1);
    } catch (err) { setSummaryError(`Failed to generate summary: ${err.message}`); }
    finally { setSummaryLoading(false); }
  };

  const handleGeneratePitch = async () => {
    // First click ("Generate"): show cached endpoint content with brief loading feel
    if (!pitch && insightsData?.pitch) {
      setPitchLoading(true);
      await new Promise((r) => setTimeout(r, 1200));
      setPitch(normalisePitch(insightsData.pitch));
      setPitchLoading(false);
      return;
    }
    // Subsequent clicks ("Regenerate"): rephrase via Azure OpenAI
    setPitchLoading(true); setPitchError('');
    try {
      const userPrompt = pitch
        ? `Rephrase and improve the action points in the following pitch. Keep the same "issue" labels and "data" metrics exactly — only rephrase the "action" field to be more compelling and direct. Return ONLY the same JSON array, parseable by JSON.parse(), no markdown fences.\n\nCurrent pitch:\n${JSON.stringify(pitch, null, 2)}`
        : buildPitchPrompt(ir, data);
      const raw = await api.generate({
        systemPrompt: PITCH_SYSTEM,
        userPrompt,
        maxTokens: 800,
        temperature: 0.85,
      });
      let parsed;
      try {
        const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
        parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) throw new Error('not array');
      } catch {
        parsed = [{ issue: 'Pitch', data: '', action: raw }];
      }
      setPitch(parsed);
      setPitchCount(c => c + 1);
    } catch (err) { setPitchError(`Failed to generate pitch: ${err.message}`); }
    finally { setPitchLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px 24px 40px' }}>
      {/* Back + header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <BackButton to="/ir-dashboard" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {ir.name}
              <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>
                ({ir.ir_code})
              </span>
            </h1>
            <span className={BADGE[ir.priority] || 'badge-med'}>
              {BADGE_LABEL[ir.priority] || ir.priority}
            </span>
            {/* Disabled ABC tier slot — placeholder, no value (§4.1, §6.5) */}
            <span
              title="ABC tier — pending country-level logic"
              style={{
                fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)',
                background: 'var(--surface-raised)', border: '1px dashed var(--border)',
                borderRadius: '4px', padding: '2px 8px', opacity: 0.6,
              }}
            >
              ABC — Pending
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: '20px', alignItems: 'start' }}>
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* KPI Bar */}
          <div className="card">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {kpiBarData.map((k) => (
                <div key={k.label} className="kpi-pill" style={{ padding: '6px 14px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{k.label}: </span>
                  <span style={{ color: k.color, fontWeight: '700', fontSize: '13px' }}>{k.value}</span>
                </div>
              ))}
              {/* Disabled AOS / PL24 placeholder slots (§4.2) */}
              {disabledPills.map((k) => (
                <div
                  key={k.label}
                  className="kpi-pill"
                  title="Data source to be confirmed"
                  style={{ padding: '6px 14px', opacity: 0.5, borderStyle: 'dashed' }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{k.label}: </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px' }}>{k.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowFullKPI(!showFullKPI)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#A100FF',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {showFullKPI ? 'Hide KPIs ▲' : 'View Full KPIs ▼'}
            </button>
            {showFullKPI && (
              <div style={{ marginTop: '14px' }}>
                {/* Desktop: Table view */}
                {window.innerWidth >= 768 ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-raised)' }}>
                          {['Metric', 'Actual', 'Target', 'Note'].map((h) => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: '500', borderBottom: '1px solid var(--border)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fullKpiTable.map((row, i) => (
                          <tr key={row.metric} style={{ borderBottom: i < fullKpiTable.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{row.metric}</td>
                            <td style={{ padding: '10px 14px', color: row.color, fontWeight: '600' }}>{row.actual}</td>
                            <td style={{ padding: '10px 14px', color: '#22C55E' }}>{row.target}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Mobile: Card view */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fullKpiTable.map((row) => (
                      <div key={row.metric} style={{
                        border: `2px solid ${row.color}`,
                        borderRadius: '6px',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                          {row.metric}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Actual</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: row.color }}>{row.actual}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Target</div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#22C55E' }}>{row.target}</div>
                          </div>
                        </div>
                        {row.note && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                            {row.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div className="card" style={{ borderLeft: '3px solid #A100FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="section-label" style={{ margin: 0 }}>AI Summary</span>
                <Sparkles size={13} color="#A100FF" />
                {insightsData?.summary && summaryCount === 0 && (
                  <span style={{ fontSize: '10px', color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '3px', padding: '1px 6px' }}>Cached · {insightsData.run_date}</span>
                )}
                {summaryCount > 0 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1px 8px' }}>v{summaryCount}</span>}
              </div>
              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: summaryLoading ? '#1C1C1C' : 'rgba(161,0,255,0.12)',
                  border: '1px solid rgba(161,0,255,0.4)',
                  borderRadius: '6px',
                  color: summaryLoading ? '#A0A0A0' : '#A100FF',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: summaryLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!summaryLoading) e.currentTarget.style.background = 'rgba(161,0,255,0.22)'; }}
                onMouseLeave={(e) => { if (!summaryLoading) e.currentTarget.style.background = 'rgba(161,0,255,0.12)'; }}
              >
                {summaryLoading
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analysing...</>
                  : summary
                    ? <><RefreshCw size={12} /> Regenerate</>
                    : <><Sparkles size={12} /> Generate Summary</>
                }
              </button>
            </div>

            {/* Error */}
            {summaryError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', color: '#EF4444', marginBottom: '10px' }}>
                {summaryError}
              </div>
            )}

            {/* Empty state */}
            {!summary && !summaryLoading && (
              <div style={{ minHeight: '80px', border: '1px dashed #2A2A2A', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <Sparkles size={18} color="#2A2A2A" />
                Click "Generate Summary" for an AI-powered IR intelligence brief
              </div>
            )}

            {/* Shimmer */}
            {summaryLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[100, 95, 88, 60].map((w, i) => (
                  <div key={i} style={{ height: '13px', background: 'linear-gradient(90deg, #1C1C1C 25%, #2A2A2A 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', borderRadius: '4px', width: `${w}%`, animation: 'shimmer 1.4s infinite', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}

            {/* Generated summary */}
            {summary && !summaryLoading && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                {summary}
              </p>
            )}
          </div>

          {/* Last Visit Summary (IR-scoped) */}
          <div className="card">
            <div className="section-label-muted">
              Last Visit — {ir.last_visit ? ir.last_visit : 'No previous visit on record'}
            </div>
            {!ir.last_visit && (
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No previous visit on record for this IR.
              </p>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                Open actions carried forward:
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {ir.open_actions_count > 0 ? `${ir.open_actions_count} open action(s)` : 'No open actions as of now'}
              </div>
            </div>
          </div>

          {/* Top Issues */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span className="section-label" style={{ margin: 0 }}>Top Issues to Address</span>
              {insightsLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading…</span>}
              {!insightsLoading && insightsData && (
                <span style={{ fontSize: '10px', color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '3px', padding: '1px 6px' }}>
                  Cached · {insightsData.run_date}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {insightsLoading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '8px 0' }}>Generating insights…</div>
              ) : data.issues.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>No issues data available for this IR.</div>
              ) : data.issues.map((issue) => (
                <div
                  key={issue.num}
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(161,0,255,0.15)',
                        border: '1px solid rgba(161,0,255,0.3)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#A100FF',
                      }}
                    >
                      {issue.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        {issue.title}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Root Cause: </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{issue.rootCause}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Revenue Impact: </span>
                        <span style={{ fontSize: '13px', color: '#22C55E', fontWeight: '600' }}>{issue.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Generated Pitch */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="section-label" style={{ margin: 0 }}>AI Generated Pitch</span>
                <Sparkles size={13} color="#A100FF" />
                {insightsData?.pitch && pitchCount === 0 && (
                  <span style={{ fontSize: '10px', color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '3px', padding: '1px 6px' }}>Cached · {insightsData.run_date}</span>
                )}
                {pitchCount > 0 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '20px', padding: '1px 8px' }}>v{pitchCount}</span>}
              </div>
              <button
                onClick={handleGeneratePitch}
                disabled={pitchLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  background: pitchLoading ? '#1C1C1C' : 'rgba(161,0,255,0.12)',
                  border: '1px solid rgba(161,0,255,0.4)',
                  borderRadius: '6px',
                  color: pitchLoading ? '#A0A0A0' : '#A100FF',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: pitchLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!pitchLoading) e.currentTarget.style.background = 'rgba(161,0,255,0.22)'; }}
                onMouseLeave={(e) => { if (!pitchLoading) e.currentTarget.style.background = 'rgba(161,0,255,0.12)'; }}
              >
                {pitchLoading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                  : pitch
                    ? <><RefreshCw size={13} /> Regenerate</>
                    : <><Sparkles size={13} /> Generate Pitch</>
                }
              </button>
            </div>

            {/* Error */}
            {pitchError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#EF4444', marginBottom: '10px' }}>
                {pitchError}
              </div>
            )}

            {/* Empty state */}
            {(!pitch || pitch.length === 0) && !pitchLoading && (
              <div style={{ minHeight: '100px', border: '1px dashed #2A2A2A', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <Sparkles size={20} color="#2A2A2A" />
                Click "Generate Pitch" to create a personalised AI opening pitch
              </div>
            )}

            {/* Loading shimmer */}
            {pitchLoading && (
              <div style={{ minHeight: '100px', border: '1px solid var(--border)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[100, 90, 70].map((w, i) => (
                  <div key={i} style={{ height: '14px', background: 'linear-gradient(90deg, #1C1C1C 25%, #2A2A2A 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', borderRadius: '4px', width: `${w}%`, animation: 'shimmer 1.4s infinite' }} />
                ))}
              </div>
            )}

            {/* Generated pitch — all points in one card */}
            {pitch && pitch.length > 0 && !pitchLoading && (
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pitch.map((item, i) => (
                  <div key={i}>
                    {i > 0 && <div style={{ height: '1px', background: 'var(--border)', marginBottom: '14px' }} />}
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {item.issue}
                    </div>
                    {item.data && (
                      <div style={{ fontSize: '12px', color: '#A100FF', marginBottom: '6px', fontStyle: 'italic' }}>
                        {item.data}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                      {item.action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (Sidebar) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '76px' }}>

          {/* Suggested Agenda */}
          <div className="card">
            <div className="section-label">Suggested Agenda</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.agenda.map((row) => (
                <li key={row.order} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'rgba(161,0,255,0.15)',
                      border: '1px solid rgba(161,0,255,0.3)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '10px',
                      color: '#A100FF',
                      fontWeight: '700',
                      marginTop: '1px',
                    }}
                  >
                    {row.order}
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{row.item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Start Visit CTA — routes to existing IR visit capture (§4.5) */}
          <button
            onClick={() => navigate(`/ir-visit-capture/${ir.id}`)}
            disabled={isManager}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600' }}
          >
            Capture Visit →
          </button>
        </div>
      </div>
    </div>
  );
}
