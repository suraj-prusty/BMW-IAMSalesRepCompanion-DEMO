import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';
import { api } from '../services/api';

// ── Badge map ─────────────────────────────────────────────────────────────────
const BADGE       = { HIGH: 'badge-high', MED: 'badge-med', LOW: 'badge-low' };
const BADGE_LABEL = { HIGH: 'HIGH PRIORITY', MED: 'MEDIUM PRIORITY', LOW: 'LOW PRIORITY' };

// ── Dynamic prompt builders ───────────────────────────────────────────────────
const PITCH_SYSTEM = `You are an expert IAM sales coach. Generate a personalised pre-visit pitch for Marcus Schmidt visiting a dealer today. Return ONLY a valid JSON array — no markdown fences, no explanation, no surrounding text. Each element must have exactly three string fields:
- "issue": the specific performance topic or opportunity (short label, e.g. "Engagement & Recency Risk")
- "data": 1–2 key metrics or facts that support it (concise, cite actual numbers)
- "action": an exact question or proposal to raise during the visit (direct, persuasive, specific)
Generate 4–5 pitch points covering the most critical issues and one positive/opportunity angle. Output must be parseable by JSON.parse().`;

const SUMMARY_SYSTEM = `You are an IAM territory intelligence analyst. Generate a pre-visit dealer intelligence summary of 5-6 sentences covering: overall performance posture, critical metric gaps (always cite the actual numbers), revenue at risk, top priorities for today's visit, and a brief high-level recap of what was discussed or agreed at the last visit. Third person, no bullet points, factual and concise.`;

function buildKpiLines(dealer) {
  const fmtPct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  return [
    `- Revenue Achievement: ${dealer.revenueAchvPct != null ? `${dealer.revenueAchvPct.toFixed(1)}%` : '—'} of target (target: 100%)`,
    `- ABC Segment: ${dealer.abcSegment || '—'}`,
    `- Revenue YoY Growth: ${fmtPct(dealer.yoyGrowth)}`,
    `- Parts Purchase YoY: ${fmtPct(dealer.partsYoY)}`,
    `- Active IR Clients: ${dealer.activeClientsIrs ?? '—'}`,
    `- Open Actions: ${dealer.openActionsCount ?? '—'}`,
    `- Last Purchase Month: ${dealer.lastPurchaseMonth ?? '—'}`,
    `- MoM Sales Trend: ${dealer.momSalesGrowth != null ? `${dealer.momSalesGrowth >= 0 ? '+' : ''}${dealer.momSalesGrowth.toFixed(1)}%` : '—'}`,
  ].join('\n');
}

function buildPitchPrompt(dealer, data) {
  const principal      = data.contacts.find(c => c.label.toLowerCase().includes('principal'))?.value || 'the Principal';
  const partsManager   = data.contacts.find(c => c.label.toLowerCase().includes('parts manager'))?.value || 'the Parts Manager';
  const issueLines     = data.issues.map(i => `- ${i.title}: ${i.impact}`).join('\n');
  const actionLines    = data.openActions.slice(0, 3).map(a => `- ${a.label}: ${a.status}`).join('\n');
  const visitNoteLines = data.visitNotes.map(n => `- ${n.note}`).join('\n');
  const lv             = data.lastVisit[0];
  return `Generate an opening pitch for Marcus Schmidt visiting ${dealer.name} today.\n\nDealer: ${dealer.name}, ${dealer.location}\nPrincipal: ${principal}\nParts Manager: ${partsManager}\n\nKey KPIs:\n${buildKpiLines(dealer)}\n\nTop issues:\n${issueLines}\n\nOpen actions to follow up:\n${actionLines}\n\nWhat was discussed / agreed at last visit:\n${visitNoteLines}\n\nLast visit date: ${lv?.date || 'recent'} — Attendees: ${lv?.attendees || ''}`;
}

function buildSummaryPrompt(dealer, data) {
  const issueLines     = data.issues.map(i => `${i.num}. ${i.title}: ${i.impact}`).join('\n');
  const actionLines    = data.openActions.map(a => `- ${a.label}: ${a.status}`).join('\n');
  const visitNoteLines = data.visitNotes.map(n => `- ${n.note}`).join('\n');
  const lv             = data.lastVisit[0];
  return `Generate a pre-visit intelligence summary for ${dealer.name}.\n\nDealer: ${dealer.name}, ${dealer.location}\nPriority: ${dealer.priority} | Last visit: ${lv?.date || 'recent'} (${dealer.lastVisit})\nAttendees: ${lv?.attendees || ''}\n\nKPIs:\n${buildKpiLines(dealer)}\n\nOpen actions:\n${actionLines}\n\nTop issues:\n${issueLines}\n\nLast visit notes (high level — summarise, do not list verbatim):\n${visitNoteLines}`;
}

// ── Normalize raw API response to dealer detail shape ─────────────────────────
function normalizeDealerDetail(raw) {
  const kpis        = raw.kpis || {};
  const abc         = kpis.abc_segmentation           || {};
  const purchaseRvt = kpis.purchase_revenue_vs_target || {};
  const saleRvt     = kpis.sale_revenue_vs_target     || {};
  const legacyRvt   = kpis.revenue_vs_target          || {};
  const ryoy        = kpis.revenue_yoy                || {};
  const yoyComp     = kpis.yoy_comparison             || {};
  const momDecline  = kpis.mom_decline                || {};
  const custTrend   = kpis.customer_trend             || {};

  // Pick primary RVT source: explicit purchase > explicit sale > legacy
  const hasPurchaseData = purchaseRvt.M2_AchvPct != null || purchaseRvt.M2_Target != null;
  const hasSaleData     = saleRvt.M2_AchvPct != null     || saleRvt.M2_Target != null;
  const rvt             = hasPurchaseData ? purchaseRvt : hasSaleData ? saleRvt : legacyRvt;

  // revenueVsTarget
  let revenueVsTarget = null;
  if (rvt.M2_AchvPct != null) {
    revenueVsTarget = rvt.M2_AchvPct - 100;
  } else if (rvt.M2_Actual != null && rvt.M2_Target != null && rvt.M2_Target !== 0) {
    revenueVsTarget = (rvt.M2_Actual / rvt.M2_Target - 1) * 100;
  }

  // yoyGrowth
  let yoyGrowth = null;
  if (ryoy.cy_revenue_eur > 0 && ryoy.ly_revenue_eur > 0) {
    yoyGrowth = (ryoy.cy_revenue_eur / ryoy.ly_revenue_eur - 1) * 100;
  }

  // partsYoY — average all numeric values in yoy_comparison
  let partsYoY = null;
  const yoyVals = Object.values(yoyComp).map((v) => parseFloat(v)).filter((v) => !isNaN(v));
  if (yoyVals.length > 0) {
    partsYoY = yoyVals.reduce((s, v) => s + v, 0) / yoyVals.length;
  }

  // momSalesGrowth: "None" → 0; comma-separated numbers → average (negative = decline)
  let momSalesGrowth = null;
  const momStr = momDecline.categories_with_decline_pct;
  if (momStr) {
    if (momStr === 'None') {
      momSalesGrowth = 0;
    } else {
      const nums = momStr.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
      if (nums.length > 0) {
        momSalesGrowth = nums.reduce((s, v) => s + v, 0) / nums.length;
      }
    }
  }

  // activeClientsIrs + customerMoM from "apr, may, jun" customer counts
  let activeClientsIrs = null;
  let customerMoM      = null;
  const cStr = custTrend.customer_count_apr_may_jun;
  if (cStr) {
    const nums = cStr.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v));
    const lastNonZero = [...nums].reverse().find((v) => v !== 0);
    activeClientsIrs = lastNonZero != null ? lastNonZero : null;
    if (nums.length >= 2) {
      const prev = nums[nums.length - 2];
      const curr = nums[nums.length - 1];
      customerMoM = prev !== 0
        ? Math.round((curr - prev) / prev * 100 * 10) / 10
        : curr > 0 ? 100 : null;
    }
  }

  const abcSegment = abc.segment || null;
  const priority   = abcSegment === 'A' ? 'LOW' : abcSegment === 'B' ? 'MED' : 'HIGH';
  const lastVisit  = raw.run_date ? `Data: ${raw.run_date.slice(0, 10)}` : '—';

  return {
    id:               raw.dealer_code,
    dealer_code:      raw.dealer_code,
    name:             raw.dealer_name,
    location:         abc.country || '—',
    abcSegment,
    revenueAchvPct:   rvt.M2_AchvPct ?? null,
    revenueVsTarget,
    revenueTarget:    rvt.M2_Target  ?? null,
    revenueActual:    rvt.M2_Actual  ?? null,
    yoyGrowth,
    partsYoY,
    momSalesGrowth,
    activeClientsIrs,
    customerMoM,
    openActionsCount: null,
    lastPurchaseMonth: null,
    priority,
    lastVisit,
    lastVisitDate:    null,
    visitTime:        null,
    dormancyScore:    null,
  };
}

export default function DealerBriefing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isManager = api.isManager();

  // ── API state ─────────────────────────────────────────────────────────────────
  const [dealerData,      setDealerData]      = useState(null);
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
    api.getDealerByCode(id)
      .then(data => {
        console.log('[GET /dealers/:code]', data);
        setDealerData(data);
      })
      .catch(err => {
        console.error('[GET /dealers/:code] error:', err);
        setApiError(err.message);
      })
      .finally(() => setApiLoading(false));
  }, [id]);

  useEffect(() => {
    api.getInsights(id)
      .then(data => {
        console.log('[GET /dealers/:code/insights]', data);
        setInsightsData(data);
      })
      .catch(err => console.error('[GET /dealers/:code/insights] error:', err))
      .finally(() => setInsightsLoading(false));
  }, [id]);

  // ── Loading gate ───────────────────────────────────────────────────────────────
  if (apiLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading dealer data...</div>
      </div>
    );
  }

  // ── Error gate ─────────────────────────────────────────────────────────────────
  if (apiError && !dealerData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#EF4444', fontSize: '14px' }}>Error loading dealer: {apiError}</div>
      </div>
    );
  }

  // ── Derive dealer + data stub ──────────────────────────────────────────────────
  const dealer = normalizeDealerDetail(dealerData);
  // Map top_issues from insights (snake_case → camelCase for UI)
  const mappedIssues = (insightsData?.top_issues || []).map(i => ({
    num:       i.num,
    title:     i.title,
    rootCause: i.root_cause,
    impact:    i.impact,
  }));
  const data = { contacts: [], issues: mappedIssues, openActions: [], visitNotes: [], lastVisit: [], agenda: [] };

  // ── KPI helpers ──────────────────────────────────────────────────────────────
  const fmtPct = (v, dec = 1) =>
    v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(dec)}%`;
  const fmtAchv = (v, dec = 1) =>
    v == null ? '—' : `${v.toFixed(dec)}%`;
  const fmtEur = (n) =>
    n == null ? '—' : n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : `€${Math.round(n / 1000)}K`;
  const pctColor = (v, warnAt = -20) =>
    v == null ? '#606060' : v >= 0 ? '#22C55E' : v >= warnAt ? '#F59E0B' : '#EF4444';
  const achvColor = (v) =>
    v == null ? '#606060' : v >= 100 ? '#22C55E' : v >= 60 ? '#F59E0B' : '#EF4444';
  const abcColor = (s) =>
    s === 'A' ? '#22C55E' : s === 'B' ? '#F59E0B' : s ? '#EF4444' : '#606060';

  // KPI bar — 4 pills shown at the top (from real API data)
  const kpiBarData = [
    { label: 'Rev Achievement', value: fmtAchv(dealer.revenueAchvPct), color: achvColor(dealer.revenueAchvPct) },
    { label: 'ABC Tier',        value: dealer.abcSegment || '—',        color: abcColor(dealer.abcSegment) },
    { label: 'Rev YoY',         value: fmtPct(dealer.yoyGrowth),        color: pctColor(dealer.yoyGrowth, -10) },
    { label: 'Cust MoM',        value: fmtPct(dealer.customerMoM),      color: pctColor(dealer.customerMoM, 0) },
  ];

  // Full KPI table
  const abcDesc = { A: 'Top revenue — protect & grow', B: 'Mid-tier — develop & move up', C: 'Low contribution — qualify or churn' };
  const fullKpiTable = [
    {
      metric: 'Revenue vs Target',
      actual: fmtAchv(dealer.revenueAchvPct),
      target: '100%',
      note:   dealer.revenueAchvPct == null ? '—'
            : dealer.revenueAchvPct >= 100   ? 'On or above target'
            : dealer.revenueAchvPct >= 60    ? 'Below target — monitor'
            : 'Under target — gap to close',
      color:  achvColor(dealer.revenueAchvPct),
    },
    {
      metric: 'ABC Segment',
      actual: dealer.abcSegment || '—',
      target: '—',
      note:  '—',
      color:  'var(--text-primary)',
    },
    {
      metric: 'Revenue YoY Growth',
      actual: fmtPct(dealer.yoyGrowth),
      target: 'Positive (≥ 0%)',
      note:   dealer.yoyGrowth < 0 ? 'Declining — customer churn risk' : 'Growing',
      color:  pctColor(dealer.yoyGrowth, -10),
    },
    {
      metric: 'Parts Purchase YoY',
      actual: fmtPct(dealer.partsYoY),
      target: 'Positive (≥ 0%)',
      note:   'Aggregated across all part categories',
      color:  pctColor(dealer.partsYoY, 0),
    },
    {
      metric: 'Active IR Clients',
      actual: dealer.activeClientsIrs != null ? String(dealer.activeClientsIrs) : '—',
      target: '≥ 50 active',
      note:   'IR accounts currently active',
      color:  dealer.activeClientsIrs == null ? '#606060'
            : dealer.activeClientsIrs >= 50   ? '#22C55E' : '#F59E0B',
    },
    {
      metric: 'Open Actions',
      actual: dealer.openActionsCount != null ? String(dealer.openActionsCount) : '—',
      target: '—',
      note:   '—',
      color:  dealer.openActionsCount > 5 ? '#EF4444' : dealer.openActionsCount > 2 ? '#F59E0B' : '#22C55E',
    },
    {
      metric: 'Last Purchase Month',
      actual: dealer.lastPurchaseMonth || '—',
      target: 'Within last 30 days',
      note:   dealer.lastPurchaseMonth ? 'Most recent parts order placed' : 'No purchase data',
      color:  (() => {
        if (!dealer.lastPurchaseMonth) return '#606060';
        const [mon, yr] = dealer.lastPurchaseMonth.split(' ');
        const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
        const monthsAgo = (new Date().getFullYear() - parseInt(yr, 10)) * 12
          + new Date().getMonth() - (months[mon] ?? 0);
        return monthsAgo <= 1 ? '#22C55E' : monthsAgo <= 3 ? '#F59E0B' : '#EF4444';
      })(),
    },
    {
      metric: 'MoM Sales Trend',
      actual: dealer.momSalesGrowth != null ? `${dealer.momSalesGrowth >= 0 ? '+' : ''}${dealer.momSalesGrowth.toFixed(1)}%` : '—',
      target: 'Positive (≥ 0%)',
      note:   dealer.momSalesGrowth == null ? 'No trend data'
            : dealer.momSalesGrowth >= 0    ? 'Positive month-on-month momentum'
            : dealer.momSalesGrowth >= -5   ? 'Slight month-on-month decline'
            :                                 'Significant month-on-month decline',
      color:  dealer.momSalesGrowth == null   ? '#606060'
            : dealer.momSalesGrowth >= 0      ? '#22C55E'
            : dealer.momSalesGrowth >= -5     ? '#F59E0B' : '#EF4444',
    },
  ];

  const lv           = data.lastVisit[0] || {};
  const visitSubtitle = [
    dealer.location,
    dealer.visitTime ? `Visit scheduled: Today ${dealer.visitTime}` : null,
    `Last visit: ${dealer.lastVisit}${dealer.lastVisitDate ? ` · ${dealer.lastVisitDate}` : ''}`,
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
        ? `Rephrase and improve the following dealer intelligence summary. Keep all facts and numbers exactly the same — only improve clarity, flow, and engagement. Return only the rephrased text, no preamble.\n\nCurrent summary:\n${summary}`
        : buildSummaryPrompt(dealer, data);
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
      setPitch(insightsData.pitch);
      setPitchLoading(false);
      return;
    }
    // Subsequent clicks ("Regenerate"): rephrase via Azure OpenAI
    setPitchLoading(true); setPitchError('');
    try {
      const userPrompt = pitch
        ? `Rephrase and improve the action points in the following pitch. Keep the same "issue" labels and "data" metrics exactly — only rephrase the "action" field to be more compelling and direct. Return ONLY the same JSON array, parseable by JSON.parse(), no markdown fences.\n\nCurrent pitch:\n${JSON.stringify(pitch, null, 2)}`
        : buildPitchPrompt(dealer, data);
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
        <BackButton />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {dealer.name}
            </h1>
            <span className={BADGE[dealer.priority] || 'badge-med'}>
              {BADGE_LABEL[dealer.priority] || dealer.priority}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {visitSubtitle}
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
              <div style={{ marginTop: '14px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
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
                Click "Generate Summary" for an AI-powered dealer intelligence brief
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

          {/* Last Visit Summary */}
          <div className="card">
            <div className="section-label-muted">
              Last Visit — {lv.date || dealer.lastVisitDate} · {lv.attendees || ''}
            </div>
            <ul style={{ margin: '0 0 14px 0', padding: '0 0 0 18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {data.visitNotes.map((n, i) => <li key={i}>{n.note}</li>)}
            </ul>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                Open actions carried forward:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.openActions.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-raised)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: item.statusColor, background: item.statusBg, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${item.statusColor}40`, whiteSpace: 'nowrap' }}>
                      {item.status}
                    </span>
                  </div>
                ))}
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
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>No issues data available for this dealer.</div>
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
              {data.agenda.map((row, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
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

          {/* Who You'll Meet */}
          <div className="card" style={{ background: 'rgba(161,0,255,0.04)', border: '1px solid rgba(161,0,255,0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.contacts.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Visit CTA */}
          <button
            onClick={() => navigate(`/visit/${dealer.id}`)}
            disabled={isManager}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600' }}
          >
            Start Visit →
          </button>
        </div>
      </div>
    </div>
  );
}
