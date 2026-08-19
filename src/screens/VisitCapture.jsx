import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import BackButton from '../components/BackButton';
import { dataService } from '../data/dataService';
import { dealers } from '../data/dealers';
import { getCurrentTime } from '../utils/dateUtils';
import { api } from '../services/api';

// ── Chip multi-select ───────────────────────────────────────
function ChipSelect({ options, selected, onChange }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            background: selected.includes(opt) ? 'rgba(161,0,255,0.2)' : '#1C1C1C',
            border: `1px solid ${selected.includes(opt) ? '#A100FF' : '#2A2A2A'}`,
            color: selected.includes(opt) ? '#A100FF' : '#A0A0A0',
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Radio group ────────────────────────────────────────────
function RadioGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <label
          key={opt}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            color: value === opt ? '#FFFFFF' : '#A0A0A0',
          }}
        >
          <div
            onClick={() => onChange(opt)}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: `2px solid ${value === opt ? '#A100FF' : '#2A2A2A'}`,
              background: value === opt ? '#A100FF' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {value === opt && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
            )}
          </div>
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────
function QuestionGroup({ title, children }) {
  return (
    <div
      style={{
        borderLeft: '3px solid #A100FF',
        paddingLeft: '14px',
        marginBottom: '20px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF', marginBottom: '14px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Question row ───────────────────────────────────────────
function QRow({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', color: '#A0A0A0', marginBottom: '8px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Issue row (shared by seeded + custom) ──────────────────
function IssueRow({ issue, isCustom = false, onUpdate, onRemove }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        background: isCustom ? 'rgba(161,0,255,0.04)' : '#141414',
        border: `1px solid ${isCustom ? '#A100FF44' : '#2A2A2A'}`,
        borderRadius: '8px',
        flexWrap: 'wrap',
      }}
    >
      {/* Title — editable for custom, static for seeded */}
      {isCustom ? (
        <input
          className="input-field"
          value={issue.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          placeholder="Describe the issue identified on-site…"
          style={{ flex: 1, minWidth: '200px', fontSize: '13px', padding: '6px 10px' }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: '13px', color: '#FFFFFF', minWidth: '200px' }}>
          {issue.title}
        </span>
      )}

      {/* Option controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: issue.confirmed ? '#FFFFFF' : '#A0A0A0' }}>
          <input
            type="checkbox"
            checked={issue.confirmed}
            onChange={(e) => onUpdate('confirmed', e.target.checked)}
            style={{ accentColor: '#A100FF' }}
          />
          Confirmed on-site
          {issue.confirmed && (
            <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: '600', background: 'rgba(34,197,94,0.1)', padding: '1px 6px', borderRadius: '3px', marginLeft: '4px' }}>
              ✓
            </span>
          )}
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: issue.addAction ? '#FFFFFF' : '#A0A0A0' }}>
          <input
            type="checkbox"
            checked={issue.addAction}
            onChange={(e) => onUpdate('addAction', e.target.checked)}
            style={{ accentColor: '#A100FF' }}
          />
          Add to Action Plan
        </label>

        <label
          onClick={() => { onUpdate('na', !issue.na); if (!issue.na) { onUpdate('confirmed', false); onUpdate('addAction', false); } }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px',
            color: issue.na ? '#A0A0A0' : '#A0A0A0',
            opacity: issue.na ? 1 : 0.7,
            userSelect: 'none',
          }}
        >
          <div style={{
            width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
            border: `2px solid ${issue.na ? '#A0A0A0' : '#444'}`,
            background: issue.na ? '#A0A0A0' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {issue.na && <span style={{ fontSize: '9px', color: '#0A0A0A', fontWeight: '700' }}>✕</span>}
          </div>
          Not Applicable
        </label>

        {/* Remove button — only on custom rows */}
        {isCustom && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#EF4444', fontSize: '16px', lineHeight: 1, padding: '0 2px',
            }}
            title="Remove issue"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default function VisitCapture() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isManager = api.isManager();
  const dealer = dealers.find((d) => d.id === id) || dealers[0];
  const data = dataService.getDealerData(dealer.id);

  // Group 1: PL24
  const [pl24Staff, setPl24Staff] = useState('');
  const [pl24Blockers, setPl24Blockers] = useState([]);
  const [pl24BlockerOther, setPl24BlockerOther] = useState('');
  const [pl24Committed, setPl24Committed] = useState('');
  const [pl24Note, setPl24Note] = useState('');

  // Group 2: Parts
  const [partsReviewed, setPartsReviewed] = useState('');
  const [fastMovers, setFastMovers] = useState('');
  const [carPark, setCarPark] = useState('');
  const [partsNote, setPartsNote] = useState('');

  // Group 3: Overdue
  const [pricingDelivered, setPricingDelivered] = useState('');
  const [irTraining, setIrTraining] = useState('');
  const [acknowledged, setAcknowledged] = useState('');
  const [overdueNote, setOverdueNote] = useState('');

  // AI Questions
  const [aiAnswers, setAiAnswers] = useState({ q1: '', q2: '', q3: '', q4: '' });

  // Free notes
  const [freeNotes, setFreeNotes] = useState('');

  // Confirm issues — seeded from dealer issues CSV
  const [issues, setIssues] = useState(
    (data.issues || []).map((iss) => ({
      title: iss.title,
      confirmed: false,
      addAction: true,
      na: false,
    }))
  );

  const updateIssue = (idx, field, val) => {
    setIssues((prev) => prev.map((iss, i) => (i === idx ? { ...iss, [field]: val } : iss)));
  };

  // Manually added custom issues
  const [customIssues, setCustomIssues] = useState([]);

  const addCustomIssue = () => {
    setCustomIssues((prev) => [...prev, { title: '', confirmed: false, addAction: false, na: false }]);
  };

  const updateCustomIssue = (idx, field, val) => {
    setCustomIssues((prev) => prev.map((iss, i) => (i === idx ? { ...iss, [field]: val } : iss)));
  };

  const removeCustomIssue = (idx) => {
    setCustomIssues((prev) => prev.filter((_, i) => i !== idx));
  };

  const aiQuestions = [
    { key: 'q1', label: 'Klaus mentioned expanding to AutoFix Cologne — 3 new locations. Has this been discussed further and what are the IAM implications?' },
    { key: 'q2', label: 'PL24 adoption dropped 18% last month specifically — what was the trigger event according to Klaus?' },
    { key: 'q3', label: 'Anna (Parts Manager) was flagged as the key contact for AOS ordering. Was she available today and engaged in the process?' },
    { key: 'q4', label: "What is Klaus's stated Q2 revenue ambition and does it align with the current trajectory?" },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '20px 24px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
        <BackButton />
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
            Visit Capture — {dealer.name}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
            On-site · {getCurrentTime()}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '20px', alignItems: 'start', ...(isManager && { pointerEvents: 'none' }) }}>

        {/* ── LEFT: Structured Questions ── */}
        <div className="card">
          <div className="section-label-muted" style={{ marginBottom: '18px' }}>
            Structured Questions
            <span style={{ fontSize: '12px', fontWeight: '400', textTransform: 'none', letterSpacing: 0, marginLeft: '8px', color: '#A0A0A0' }}>
              Grouped by issue — capture responses on-site.
            </span>
          </div>

          {/* Group 1: PL24 */}
          <QuestionGroup title="Group 1: PL24 Activation">
            <QRow label="Q1. How many staff are currently using PL24 daily?">
              <select className="input-field" value={pl24Staff} onChange={(e) => setPl24Staff(e.target.value)}>
                <option value="">Select...</option>
                <option>0</option>
                <option>1</option>
                <option>2</option>
                <option>3 or more</option>
              </select>
            </QRow>
            <QRow label="Q2. What is the primary blocker for PL24 adoption?">
              <ChipSelect
                options={['Credentials missing', 'No training', 'System issue', 'Staff resistance', 'Other']}
                selected={pl24Blockers}
                onChange={setPl24Blockers}
              />
              {pl24Blockers.includes('Other') && (
                <input
                  className="input-field"
                  value={pl24BlockerOther}
                  onChange={(e) => setPl24BlockerOther(e.target.value)}
                  placeholder="Describe the blocker…"
                  style={{ marginTop: '8px', fontSize: '12px' }}
                />
              )}
            </QRow>
            <QRow label="Q3. Has the dealer principal committed to a resolution date?">
              <RadioGroup options={['Yes', 'No', 'Partially']} value={pl24Committed} onChange={setPl24Committed} />
            </QRow>
            <QRow label="">
              <textarea
                className="input-field"
                value={pl24Note}
                onChange={(e) => setPl24Note(e.target.value)}
                placeholder="Add a note for this section…"
                style={{ minHeight: '60px', fontSize: '12px' }}
              />
            </QRow>
          </QuestionGroup>

          {/* Group 2: Parts */}
          <QuestionGroup title="Group 2: Parts Portfolio / Fast Movers">
            <QRow label="Q1. Has the parts manager reviewed the AOS basket this month?">
              <RadioGroup options={['Yes', 'No', 'Not sure']} value={partsReviewed} onChange={setPartsReviewed} />
            </QRow>
            <QRow label="Q2. How many fast-mover families are actively ordered via AOS?">
              <select className="input-field" value={fastMovers} onChange={(e) => setFastMovers(e.target.value)}>
                <option value="">Select...</option>
                <option>0–3</option>
                <option>4–6</option>
                <option>7–10</option>
                <option>10+</option>
              </select>
            </QRow>
            <QRow label="Q3. Was the car park analysis conducted?">
              <RadioGroup options={['Yes', 'No', 'Scheduled']} value={carPark} onChange={setCarPark} />
            </QRow>
            <QRow label="">
              <textarea
                className="input-field"
                value={partsNote}
                onChange={(e) => setPartsNote(e.target.value)}
                placeholder="Add a note for this section…"
                style={{ minHeight: '60px', fontSize: '12px' }}
              />
            </QRow>
          </QuestionGroup>

          {/* Group 3: Overdue */}
          <QuestionGroup title="Group 3: Overdue Actions">
            <QRow label="Q1. Has the pricing sheet been delivered to the dealer?">
              <RadioGroup options={['Yes', 'No']} value={pricingDelivered} onChange={setPricingDelivered} />
            </QRow>
            <QRow label="Q2. What is the current status of IR training completion?">
              <select className="input-field" value={irTraining} onChange={(e) => setIrTraining(e.target.value)}>
                <option value="">Select...</option>
                <option>Not started</option>
                <option>In progress</option>
                <option>Completed for some</option>
                <option>Completed for all</option>
              </select>
            </QRow>
            <QRow label="Q3. Did the dealer acknowledge the overdue actions?">
              <RadioGroup options={['Yes', 'Partially', 'No']} value={acknowledged} onChange={setAcknowledged} />
            </QRow>
            <QRow label="">
              <textarea
                className="input-field"
                value={overdueNote}
                onChange={(e) => setOverdueNote(e.target.value)}
                placeholder="Add a note for this section…"
                style={{ minHeight: '60px', fontSize: '12px' }}
              />
            </QRow>
          </QuestionGroup>
        </div>

        {/* ── RIGHT: AI Questions + Free Notes ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* AI Questions */}
          <div className="card">
            <div className="section-label">AI-Generated Questions</div>
            <p style={{ fontSize: '12px', color: '#A0A0A0', margin: '0 0 14px 0' }}>
              Based on this dealer's profile and last visit.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {aiQuestions.map((q) => (
                <div key={q.key}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#FFFFFF', lineHeight: 1.5, marginBottom: '6px' }}>
                    {q.label}
                  </label>
                  <textarea
                    className="input-field"
                    value={aiAnswers[q.key]}
                    onChange={(e) => setAiAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder="Type answer or notes here…"
                    style={{ minHeight: '64px', fontSize: '12px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Free Notes */}
          <div className="card">
            <div className="section-label-muted">Free Notes</div>
            <textarea
              className="input-field"
              value={freeNotes}
              onChange={(e) => setFreeNotes(e.target.value)}
              placeholder="Capture anything not covered above — observations, dealer sentiment, unexpected topics raised…"
              style={{ minHeight: '180px', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* ── Confirm Issues Panel ── */}
      <div
        className="card"
        style={{ marginTop: '20px', background: '#1C1C1C' }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#A0A0A0',
            marginBottom: '14px',
          }}
        >
          Confirm Issues Identified
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Pre-seeded issues from CSV */}
          {issues.map((issue, idx) => (
            <IssueRow
              key={`seed-${idx}`}
              issue={issue}
              onUpdate={(field, val) => updateIssue(idx, field, val)}
            />
          ))}

          {/* Manually added custom issues */}
          {customIssues.map((issue, idx) => (
            <IssueRow
              key={`custom-${idx}`}
              issue={issue}
              isCustom
              onUpdate={(field, val) => updateCustomIssue(idx, field, val)}
              onRemove={() => removeCustomIssue(idx)}
            />
          ))}

          {/* Add Section button */}
          <button
            type="button"
            onClick={addCustomIssue}
            style={{
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'transparent',
              border: '1px dashed #A100FF',
              borderRadius: '8px',
              color: '#A100FF',
              fontSize: '13px',
              fontWeight: '600',
              padding: '10px 18px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: 'fit-content',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(161,0,255,0.07)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add Issue
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          onClick={() => navigate(`/submit/${dealer.id}`)}
          disabled={isManager}
          className="btn-primary"
          style={{ fontSize: '15px', padding: '12px 28px', fontWeight: '600' }}
        >
          Generate Action Plan →
        </button>
      </div>
    </div>
  );
}
