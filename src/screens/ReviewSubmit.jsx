import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Plus, Send, Calendar, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';
import { dataService } from '../data/dataService';
import { api } from '../services/api';
import { formatShort, getNextVisitOptions, resolveDueDate } from '../utils/dateUtils';

// ── Prompt definitions (dealer-agnostic base — runtime context added per call)
const VISIT_CONTEXT_BASE = `Marcus Schmidt, C1 Europe Sales Executive. Visit completed successfully.`;

const SUMMARY_SYS = `You are an IAM field sales report writer. Generate a concise yet informative post-visit meeting summary in 4-6 sentences. Cover in order: (1) Visit opening — dealer name, location, date, and attendees. (2) Today's confirmed issues identified on-site and top issues to address, including their root causes and revenue impact. (3) Key actions agreed with owners and due dates. (4) Dealer KPI snapshot — sales vs target, PL24/AOS adoption, DB margin. (5) Close — estimated monthly uplift and next visit date. Use third person, past tense. Flowing prose only — no bullet points, no headers, no numbered lists.`;
const EMAIL_SYS = `You are an IAM field sales executive (Marcus Schmidt). Write a concise, professional follow-up email to the dealer principal after a visit. Tone: warm but businesslike. Cover: thanks for the meeting and the 3 agreed actions with their owners. Max 5-6 sentences. Do not use a formal subject line — start with the greeting directly. Do NOT mention any specific dates or deadlines in the email body.`;

// ── Shimmer rows ──────────────────────────────────────────────────────────────
function Shimmer({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '13px',
            background: 'linear-gradient(90deg,#1C1C1C 25%,#2A2A2A 50%,#1C1C1C 75%)',
            backgroundSize: '200% 100%',
            borderRadius: '4px',
            width: `${[100, 92, 78][i] || 85}%`,
            animation: 'shimmer 1.4s infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── AI Section card ───────────────────────────────────────────────────────────
function AISectionCard({ label, loading, error, generated, count, onGenerate, children }) {
  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="section-label-muted" style={{ margin: 0 }}>{label}</span>
          <Sparkles size={12} color="#A100FF" />
          {count > 0 && (
            <span style={{ fontSize: '11px', color: '#A0A0A0', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '1px 8px' }}>
              v{count}
            </span>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px',
            background: loading ? '#1C1C1C' : 'rgba(161,0,255,0.12)',
            border: '1px solid rgba(161,0,255,0.4)',
            borderRadius: '6px',
            color: loading ? '#A0A0A0' : '#A100FF',
            fontSize: '12px', fontWeight: '500',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(161,0,255,0.22)'; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(161,0,255,0.12)'; }}
        >
          {loading
            ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
            : count === 0 ? <><Sparkles size={12} /> Generate</> : <><RefreshCw size={12} /> Regenerate</>
          }
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', color: '#EF4444', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Empty */}
      {!generated && !loading && (
        <div style={{ minHeight: '80px', border: '1px dashed #2A2A2A', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#A0A0A0', fontSize: '13px', marginBottom: '12px' }}>
          <Sparkles size={18} color="#2A2A2A" />
          Click "Generate" to create AI content
        </div>
      )}

      {/* Shimmer */}
      {loading && <div style={{ marginBottom: '12px' }}><Shimmer /></div>}

      {/* Content area */}
      {generated && !loading && children}

    </div>
  );
}

function SectionCard({ label, children }) {
  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ marginBottom: '14px' }}>
        <span className="section-label-muted" style={{ margin: 0 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function ReviewSubmit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const dealer = dataService.getDealerById(id);
  const data = dataService.getDealerData(dealer.id);

  // Derive principal contact name from contacts CSV (first contact row or fallback)
  const principalContact = data.contacts?.[0] || null;
  const principalName = principalContact?.value || dealer.name;

  const [emailSent, setEmailSent] = useState(false);
  const dateBtns = getNextVisitOptions(3);                // today +7, +14, +21
  const [selectedDate, setSelectedDate] = useState(dateBtns[1]);  // default middle option
  const [priority, setPriority] = useState(dealer.priority || 'HIGH');

  // Actions table (seeded from dealer's actions CSV; +N due tokens resolved to live dates)
  const [actions, setActions] = useState(
    (data.actions || []).map((a) => ({ ...a, due: resolveDueDate(a.due) }))
  );

  // Build dynamic visit context from dealer data
  const visitContext = [
    `Dealer: ${dealer.name}, ${dealer.location}`,
    `Visit date: ${formatShort()} | Attendees: ${data.lastVisit?.[0]?.attendees || 'Dealer Principal, Parts Manager, Workshop Manager'}`,
    `KPIs: Sales vs Target ${dealer.salesVsTarget}, PL24 Adoption ${dealer.pl24Adoption}, AOS Adoption ${dealer.aosAdoption}, DB Margin ${dealer.dbMargin}`,
    `Top Issues to Address / Confirmed Issues Identified: ${(data.issues || []).map((iss, i) => `${i + 1}. ${iss.title || 'N/A'} — Root cause: ${iss.rootCause || 'N/A'} — Impact: ${iss.impact || 'N/A'}`).join('; ')}`,
    `Agreed actions: ${(data.actions || []).map((a) => `(${a.num}) ${a.action} — ${a.owner}, due ${a.due}`).join('; ')}`,
    `Key visit notes: ${(data.visitNotes || []).map((n) => n.note).join(' ')}`,
  ].join('\n');

  // ── AI: Meeting Summary ───────────────────────────────────────────────────
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryCount, setSummaryCount] = useState(0);

  const handleGenSummary = async () => {
    setSummaryLoading(true); setSummaryError('');
    try {
      const res = await api.generate({
        systemPrompt: SUMMARY_SYS,
        userPrompt: `Generate a post-visit meeting summary.\n\n${visitContext}`,
        maxTokens: 380,
        temperature: 0.7,
      });
      setSummary(res); setSummaryCount((c) => c + 1);
    } catch (e) { setSummaryError(e.message); }
    finally { setSummaryLoading(false); }
  };

  // ── AI: Follow-Up Email ───────────────────────────────────────────────────
  const [emailBody, setEmailBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailCount, setEmailCount] = useState(0);

  const handleGenEmail = async () => {
    setEmailLoading(true); setEmailError('');
    try {
      const res = await api.generate({
        systemPrompt: EMAIL_SYS,
        userPrompt: `Write a follow-up email to ${principalName} at ${dealer.name}.\n\n${visitContext}`,
        maxTokens: 300,
        temperature: 0.75,
      });
      setEmailBody(res); setEmailCount((c) => c + 1);
    } catch (e) { setEmailError(e.message); }
    finally { setEmailLoading(false); }
  };

  const handleSendEmail = () => { setEmailSent(true); setTimeout(() => setEmailSent(false), 3500); };

  const addAction = () => setActions((prev) => [...prev, { num: prev.length + 1, action: '', owner: '', due: '', status: 'Open' }]);
  const updateAction = (idx, field, val) => setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));

  const priorityBtns = [
    { label: 'HIGH', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
    { label: 'MEDIUM', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
    { label: 'ROUTINE', color: '#22C55E', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '20px 24px 40px' }}>
      {/* Toast */}
      {emailSent && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', background: '#141414', border: '1px solid #22C55E', borderRadius: '8px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <CheckCircle size={16} color="#22C55E" />
          <span style={{ fontSize: '14px', color: '#FFFFFF' }}>Email sent to {principalName} ✓</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <BackButton />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
              Review &amp; Submit — {dealer.name}
            </h1>
            <span style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '4px' }}>
              ✓ VISIT COMPLETE · 12:06 PM
            </span>
          </div>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
            Generate AI report sections below — review, edit, and submit
          </p>
        </div>
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT ── */}
        <div>

          {/* Section 1: Meeting Summary */}
          <AISectionCard
            label="Meeting Summary"
            loading={summaryLoading}
            error={summaryError}
            generated={summary}
            count={summaryCount}
            onGenerate={handleGenSummary}
          >
            <textarea
              className="input-field"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ minHeight: '180px', lineHeight: '1.8', fontSize: '13px' }}
            />
          </AISectionCard>

          {/* Section 2: Agreed Actions (seeded from CSV, editable) */}
          <SectionCard label="Agreed Action Items">
            <div style={{ border: '1px solid #2A2A2A', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1C1C1C' }}>
                    {['#', 'Action', 'Owner', 'Due Date', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#A0A0A0', fontWeight: '500', fontSize: '12px', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < actions.length - 1 ? '1px solid #2A2A2A' : 'none' }}>
                      <td style={{ padding: '8px 12px', color: '#A0A0A0', width: '30px' }}>{row.num}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="input-field" value={row.action} onChange={(e) => updateAction(idx, 'action', e.target.value)} style={{ padding: '5px 8px', fontSize: '12px' }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input className="input-field" value={row.owner} onChange={(e) => updateAction(idx, 'owner', e.target.value)} style={{ padding: '5px 8px', fontSize: '12px' }} />
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: '#FFFFFF', fontSize: '12px' }}>{row.due}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 7px', borderRadius: '3px' }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addAction} style={{ background: 'transparent', border: 'none', color: '#A100FF', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
              <Plus size={14} /> Add Action
            </button>
          </SectionCard>

          {/* Section 3: Training Plan (static) */}
          <SectionCard label="Training Plan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { title: 'PL24 Live Demo', format: 'Online', duration: '25 min', attendees: 'Thomas + Anna', status: 'Scheduled for today', color: '#A100FF' },
                { title: 'AOS Ordering Module', format: 'Online', duration: '30 min', attendees: 'Anna Schmidt', status: 'Due 19 May', color: '#F59E0B' },
              ].map((t) => (
                <div key={t.title} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: '#A0A0A0', marginTop: '3px' }}>{t.format} · {t.duration} · {t.attendees}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: t.color }}>{t.status}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Section 4: Draft Follow-Up Email */}
          <AISectionCard
            label="Draft Follow-Up Email"
            loading={emailLoading}
            error={emailError}
            generated={emailBody}
            count={emailCount}
            onGenerate={handleGenEmail}
          >
            <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '2px' }}>
                <span style={{ fontWeight: '500', color: '#FFFFFF' }}>To: </span>{principalName} ({dealer.id}@dealership.de)
              </div>
              <div style={{ fontSize: '12px', color: '#A0A0A0', marginBottom: '10px' }}>
                <span style={{ fontWeight: '500', color: '#FFFFFF' }}>Subject: </span>Follow-up: {dealer.name} Visit — {dealer.lastVisitDate || 'Recent'}
              </div>
              <textarea
                className="input-field"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                style={{ minHeight: '100px', fontSize: '13px', lineHeight: '1.6', borderTop: '1px solid #2A2A2A', paddingTop: '10px', background: 'transparent', border: 'none', padding: '10px 0 0 0', resize: 'vertical' }}
              />
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleSendEmail}
            >
              <Send size={13} /> Send to Dealer
            </button>
          </AISectionCard>

          {/* Section 5: Additional Notes */}
          <SectionCard label="Additional Notes">
            <textarea
              className="input-field"
              placeholder="Add anything not captured above before submitting…"
              style={{ minHeight: '100px', fontSize: '13px' }}
            />
          </SectionCard>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '76px' }}>

          {/* Report Snapshot */}
          <div className="card">
            <div className="section-label-muted">Report Snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Visit date', value: formatShort() },
                { label: 'Attendees', value: '3 (Principal, Parts, Workshop)' },
                { label: 'Actions agreed', value: String(actions.length) },
                { label: 'Est. monthly uplift', value: '+€10,400', color: '#22C55E' },
                { label: 'Dealer priority', value: priority, color: '#EF4444' },
                { label: 'Next visit', value: selectedDate },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #2A2A2A' }}>
                  <span style={{ fontSize: '12px', color: '#A0A0A0' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: item.color || '#FFFFFF' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Next Visit */}
          <div className="card">
            <div className="section-label-muted">Schedule Next Visit</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {dateBtns.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: selectedDate === d ? 'rgba(161,0,255,0.15)' : '#1C1C1C',
                    border: `1px solid ${selectedDate === d ? '#A100FF' : '#2A2A2A'}`,
                    color: selectedDate === d ? '#A100FF' : '#A0A0A0',
                    transition: 'all 0.15s',
                  }}
                >
                  {d}{selectedDate === d && ' ✓'}
                </button>
              ))}
            </div>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Calendar size={13} /> Add to Calendar
            </button>
          </div>

          {/* Update Dealer Priority */}
          <div className="card">
            <div className="section-label-muted">Update Dealer Priority</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {priorityBtns.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPriority(p.label)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: priority === p.label ? p.bg : '#1C1C1C',
                    border: `1px solid ${priority === p.label ? p.border : '#2A2A2A'}`,
                    color: priority === p.label ? p.color : '#A0A0A0',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit CTA */}
          <button
            onClick={() => navigate('/success', { state: { dealerName: dealer.name, nextVisit: selectedDate } })}
            style={{
              width: '100%', padding: '16px', background: '#22C55E', border: 'none', borderRadius: '8px',
              color: '#FFFFFF', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#16A34A')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#22C55E')}
          >
            <CheckCircle size={18} />
            Approve + Upload to Central System
          </button>
        </div>
      </div>
    </div>
  );
}
