import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';
import { dataService } from '../data/dataService';
import { api } from '../services/api';

// ── Badge map ─────────────────────────────────────────────────────────────────
const BADGE       = { HIGH: 'badge-high', MED: 'badge-med', LOW: 'badge-low' };
const BADGE_LABEL = { HIGH: 'HIGH PRIORITY', MED: 'MEDIUM PRIORITY', LOW: 'LOW PRIORITY' };

// ── Dynamic prompt builders ───────────────────────────────────────────────────
const PITCH_SYSTEM = `You are an expert IAM sales coach. Generate a personalised pre-visit pitch for Marcus Schmidt visiting a dealer today. Write exactly 2-3 paragraphs of flowing prose — no bullet points, no headings, no numbered lists.
Paragraph 1: a warm, confident opening addressed to the dealer principal by first name, referencing the ongoing relationship and the purpose of today's visit.
Paragraph 2: highlight the key performance gaps and their business impact — frame it collaboratively, not as a criticism, and reference what was discussed or agreed at the last visit to show continuity.
Paragraph 3: clearly outline the 1-2 priority actions Marcus needs the dealer to commit to today, including a persuasion angle — why acting now directly benefits the dealer's revenue or standing. Keep it human, specific, and action-oriented.`;

const SUMMARY_SYSTEM = `You are an IAM territory intelligence analyst. Generate a pre-visit dealer intelligence summary of 5-6 sentences covering: overall performance posture, critical metric gaps (always cite the actual numbers), revenue at risk, top priorities for today's visit, and a brief high-level recap of what was discussed or agreed at the last visit. Third person, no bullet points, factual and concise.`;

function buildPitchPrompt(dealer, data) {
  const principal      = data.contacts.find(c => c.label.toLowerCase().includes('principal'))?.value || 'the Principal';
  const partsManager   = data.contacts.find(c => c.label.toLowerCase().includes('parts manager'))?.value || 'the Parts Manager';
  const kpiLines       = data.kpis.slice(0, 4).map(k => `- ${k.metric}: ${k.actual} (target ${k.target}) — ${k.note}`).join('\n');
  const issueLines     = data.issues.map(i => `- ${i.title}: ${i.impact}`).join('\n');
  const actionLines    = data.openActions.slice(0, 3).map(a => `- ${a.label}: ${a.status}`).join('\n');
  const visitNoteLines = data.visitNotes.map(n => `- ${n.note}`).join('\n');
  const lv             = data.lastVisit[0];
  return `Generate an opening pitch for Marcus Schmidt visiting ${dealer.name} today.\n\nDealer: ${dealer.name}, ${dealer.location}\nPrincipal: ${principal}\nParts Manager: ${partsManager}\n\nKey KPIs:\n${kpiLines}\n\nTop issues:\n${issueLines}\n\nOpen actions to follow up:\n${actionLines}\n\nWhat was discussed / agreed at last visit:\n${visitNoteLines}\n\nLast visit date: ${lv?.date || 'recent'} — Attendees: ${lv?.attendees || ''}`;
}

function buildSummaryPrompt(dealer, data) {
  const kpiLines       = data.kpis.map(k => `- ${k.metric}: ${k.actual} (target ${k.target}) — ${k.note}`).join('\n');
  const issueLines     = data.issues.map(i => `${i.num}. ${i.title}: ${i.impact}`).join('\n');
  const actionLines    = data.openActions.map(a => `- ${a.label}: ${a.status}`).join('\n');
  const visitNoteLines = data.visitNotes.map(n => `- ${n.note}`).join('\n');
  const lv             = data.lastVisit[0];
  return `Generate a pre-visit intelligence summary for ${dealer.name}.\n\nDealer: ${dealer.name}, ${dealer.location}\nPriority: ${dealer.priority} | Last visit: ${lv?.date || 'recent'} (${dealer.lastVisit})\nAttendees: ${lv?.attendees || ''}\n\nKPIs:\n${kpiLines}\n\nOpen actions:\n${actionLines}\n\nTop issues:\n${issueLines}\n\nLast visit notes (high level — summarise, do not list verbatim):\n${visitNoteLines}`;
}

export default function DealerBriefing() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Resolve dealer + data from URL id
  const dealer = dataService.getDealerById(id);
  const data   = dataService.getDealerData(dealer.id);

  // Derived display values
  const kpiBarData   = data.kpis.slice(0, 4).map(k => ({ label: k.metric, value: k.actual, color: k.color }));
  const fullKpiTable = data.kpis.map(k => ({ metric: k.metric, actual: k.actual, target: k.target, note: k.note, color: k.color }));
  const lv           = data.lastVisit[0] || {};
  const visitSubtitle = [
    dealer.location,
    dealer.visitTime ? `Visit scheduled: Today ${dealer.visitTime}` : null,
    `Last visit: ${dealer.lastVisit}${dealer.lastVisitDate ? ` · ${dealer.lastVisitDate}` : ''}`,
  ].filter(Boolean).join(' · ');

  const [showFullKPI, setShowFullKPI] = useState(false);
  const [pitch, setPitch]               = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchError, setPitchError]     = useState('');
  const [pitchCount, setPitchCount]     = useState(0);
  const [summary, setSummary]               = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError]     = useState('');
  const [summaryCount, setSummaryCount]     = useState(0);

  const handleGeneratePitch = async () => {
    setPitchLoading(true); setPitchError('');
    try {
      const result = await api.generate({
        systemPrompt: PITCH_SYSTEM,
        userPrompt: buildPitchPrompt(dealer, data),
        maxTokens: 600,
        temperature: 0.85,
      });
      setPitch(result);
      setPitchCount(c => c + 1);
    } catch (err) { setPitchError(`Failed to generate pitch: ${err.message}`); }
    finally { setPitchLoading(false); }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true); setSummaryError('');
    try {
      const result = await api.generate({
        systemPrompt: SUMMARY_SYSTEM,
        userPrompt: buildSummaryPrompt(dealer, data),
        maxTokens: 420,
        temperature: 0.7,
      });
      setSummary(result);
      setSummaryCount(c => c + 1);
    } catch (err) { setSummaryError(`Failed to generate summary: ${err.message}`); }
    finally { setSummaryLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '20px 24px 40px' }}>
      {/* Back + header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <BackButton />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
              {dealer.name}
            </h1>
            <span className={BADGE[dealer.priority] || 'badge-med'}>
              {BADGE_LABEL[dealer.priority] || dealer.priority}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
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
                  <span style={{ color: '#A0A0A0', fontSize: '12px' }}>{k.label}: </span>
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
              <div style={{ marginTop: '14px', border: '1px solid #2A2A2A', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#1C1C1C' }}>
                      {['Metric', 'Actual', 'Target', 'Note'].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#A0A0A0', fontWeight: '500', borderBottom: '1px solid #2A2A2A' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fullKpiTable.map((row, i) => (
                      <tr key={row.metric} style={{ borderBottom: i < fullKpiTable.length - 1 ? '1px solid #2A2A2A' : 'none' }}>
                        <td style={{ padding: '10px 14px', color: '#FFFFFF' }}>{row.metric}</td>
                        <td style={{ padding: '10px 14px', color: row.color, fontWeight: '600' }}>{row.actual}</td>
                        <td style={{ padding: '10px 14px', color: '#22C55E' }}>{row.target}</td>
                        <td style={{ padding: '10px 14px', color: '#A0A0A0', fontSize: '12px' }}>{row.note}</td>
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
                {summaryCount > 0 && <span style={{ fontSize: '11px', color: '#A0A0A0', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '1px 8px' }}>v{summaryCount}</span>}
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
                  : summaryCount === 0
                    ? <><Sparkles size={12} /> Generate Summary</>
                    : <><RefreshCw size={12} /> Refresh</>
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
              <div style={{ minHeight: '80px', border: '1px dashed #2A2A2A', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#A0A0A0', fontSize: '13px' }}>
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
              <p style={{ margin: 0, fontSize: '13px', color: '#A0A0A0', lineHeight: 1.75 }}>
                {summary}
              </p>
            )}
          </div>

          {/* Last Visit Summary */}
          <div className="card">
            <div className="section-label-muted">
              Last Visit — {lv.date || dealer.lastVisitDate} · {lv.attendees || ''}
            </div>
            <ul style={{ margin: '0 0 14px 0', padding: '0 0 0 18px', fontSize: '13px', color: '#A0A0A0', lineHeight: 1.8 }}>
              {data.visitNotes.map((n, i) => <li key={i}>{n.note}</li>)}
            </ul>
            <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '8px', fontWeight: '500' }}>
                Open actions carried forward:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.openActions.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#1C1C1C', borderRadius: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#FFFFFF' }}>{item.label}</span>
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
            <div className="section-label">Top Issues to Address</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.issues.map((issue) => (
                <div
                  key={issue.num}
                  style={{
                    background: '#1C1C1C',
                    border: '1px solid #2A2A2A',
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
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', marginBottom: '8px' }}>
                        {issue.title}
                      </div>
                      <div style={{ marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#A0A0A0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Root Cause: </span>
                        <span style={{ fontSize: '13px', color: '#FFFFFF' }}>{issue.rootCause}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#A0A0A0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Revenue Impact: </span>
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
                {pitchCount > 0 && <span style={{ fontSize: '11px', color: '#A0A0A0', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '1px 8px' }}>v{pitchCount}</span>}
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
                  : pitchCount === 0
                    ? <><Sparkles size={13} /> Generate Pitch</>
                    : <><RefreshCw size={13} /> Regenerate</>
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
            {!pitch && !pitchLoading && (
              <div style={{ minHeight: '100px', border: '1px dashed #2A2A2A', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#A0A0A0', fontSize: '13px' }}>
                <Sparkles size={20} color="#2A2A2A" />
                Click "Generate Pitch" to create a personalised AI opening pitch
              </div>
            )}

            {/* Loading shimmer */}
            {pitchLoading && (
              <div style={{ minHeight: '100px', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[100, 90, 70].map((w, i) => (
                  <div key={i} style={{ height: '14px', background: 'linear-gradient(90deg, #1C1C1C 25%, #2A2A2A 50%, #1C1C1C 75%)', backgroundSize: '200% 100%', borderRadius: '4px', width: `${w}%`, animation: 'shimmer 1.4s infinite' }} />
                ))}
              </div>
            )}

            {/* Generated pitch — editable */}
            {pitch && !pitchLoading && (
              <textarea
                className="input-field"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                style={{ minHeight: '120px', lineHeight: '1.7', fontSize: '13px' }}
              />
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
                  <span style={{ fontSize: '13px', color: '#A0A0A0', lineHeight: 1.5 }}>{row.item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Who You'll Meet */}
          <div className="card" style={{ background: 'rgba(161,0,255,0.04)', border: '1px solid rgba(161,0,255,0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.contacts.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#A0A0A0' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: '500' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Visit CTA */}
          <button
            onClick={() => navigate(`/visit/${dealer.id}`)}
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
