import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

// ── Input primitives ──────────────────────────────────────────

const baseInput = {
  background: '#141414',
  border: '1px solid #2A2A2A',
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: window.innerWidth < 640 ? '14px' : '12px',
  padding: window.innerWidth < 640 ? '10px 12px' : '7px 10px',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  minHeight: '44px',
};

function Inp({ value, onChange, placeholder, type = 'text', mode, style = {} }) {
  const filter = (raw) => {
    if (mode === 'int')      return raw.replace(/[^0-9]/g, '');
    if (mode === 'pct')      return raw.replace(/[^0-9.\-]/g, '').replace(/(\..*)\./g, '$1');
    if (mode === 'currency') return raw.replace(/[^0-9,.£\-\+ ]/g, '');
    if (mode === 'alpha')    return raw.replace(/[0-9]/g, '');
    return raw;
  };
  const derivedInputMode = mode === 'int' ? 'numeric' : (mode === 'pct' || mode === 'currency') ? 'decimal' : undefined;
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(filter(e.target.value))}
      placeholder={placeholder}
      inputMode={derivedInputMode}
      style={{ ...baseInput, ...style }}
    />
  );
}

function Txt({ value, onChange, placeholder, rows = 2, style = {} }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...baseInput, resize: 'vertical', ...style }}
    />
  );
}

function Sel({ value, onChange, options, style = {} }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...baseInput, cursor: 'pointer', ...style }}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function YesNo({ value, onChange }) {
  return <Sel value={value} onChange={onChange} options={['Yes', 'No']} />;
}

// ── Layout helpers ────────────────────────────────────────────

function Sec({ letter, title, subtitle, loading, children }) {
  const isMobile = window.innerWidth < 640;
  return (
    <div className="card" style={{ marginBottom: isMobile ? '12px' : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? '6px' : '10px', marginBottom: isMobile ? '12px' : '18px', borderBottom: '1px solid #1E1E1E', paddingBottom: isMobile ? '8px' : '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#A100FF' }}>{letter}.</span>
        <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'none', letterSpacing: 0 }}>{subtitle}</span>}
        {loading && (
          <span style={{ fontSize: '9px', color: '#A0A0A0', fontStyle: 'italic', marginLeft: 'auto' }}>Loading live data…</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children, style = {} }) {
  const isMobile = window.innerWidth < 640;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '10px' : '12px 20px', marginBottom: '12px', ...style }}>
      {children}
    </div>
  );
}

function Grid3({ children }) {
  const isMobile = window.innerWidth < 640;
  const isTablet = window.innerWidth < 1024;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: isMobile ? '10px' : isTablet ? '12px 16px' : '16px 24px', marginBottom: '12px' }}>
      {children}
    </div>
  );
}

function Fld({ label, children, span, fromApi, hint }) {
  return (
    <div style={span ? { gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}>
      {label && (
        <div style={{ fontSize: '11px', color: '#A0A0A0', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', minHeight: '16px' }}>
          {label}
          {fromApi && (
            <span
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', flexShrink: 0 }}
              title="Auto-filled from live KPI data"
            />
          )}
          {hint && (
            <span style={{ fontSize: '10px', color: '#555', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>— {hint}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: '700', color: '#A100FF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function PurpleBorder({ children }) {
  return (
    <div style={{ borderLeft: '3px solid #A100FF', paddingLeft: '14px', marginBottom: '14px' }}>
      {children}
    </div>
  );
}

const TH = { fontSize: '11px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap' };
const TD = { padding: '6px 8px', verticalAlign: 'middle' };

// ── Static data ───────────────────────────────────────────────

const C_TOOLS = [
  'PL24 — Dealer setup',
  'AOS — promoted to IRs (Principle 7.2)',
  'Tool 3',
  'Tool 4',
  'Performance Data Upload in IAM Portal',
  'DMS reporting to NSC',
  'Marketing material at IRs',
  'Process 4',
  'Process 5',
];

const D_ITEMS = [
  'Obstacle 1 to achieve targets',
  'Obstacle 2 to achieve targets',
  'Obstacle 3 to achieve targets',
  'Enabler 1 to achieve targets',
  'Enabler 2 to achieve targets',
  'Enabler 3 to achieve targets',
];

const G_METRICS = [
  'Quality of NSC target setting',
  'NSC IAM marketing materials & campaigns',
  'IAM coaching quality',
  'IAM programme tools (IAM Portal, PL24, AOS)',
  'NSC reporting requirements',
  'Overall IAM programme satisfaction',
];

const initCRows = () => C_TOOLS.map((tool) => ({ tool, status: '', demonstrated: '', pct: '', notes: '' }));
const initDRows = () => D_ITEMS.map((item) => ({ item, response: '', completionDate: '', followUp: '' }));
const initGRows = () => G_METRICS.map((metric) => ({ metric, rating: '', comments: '' }));
const initFRows = () => Array.from({ length: 6 }, (_, i) => ({ num: i + 1, action: '', responsible: '', byWhen: '', priority: '' }));

// ── Component ─────────────────────────────────────────────────

export default function DealerVisitForm({ onDealerNameLoaded }) {
  const { id: routeId } = useParams();

  // ── API state ──
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiFilledA, setApiFilledA] = useState(new Set());

  // ── Section A ──
  const [a, setA] = useState({
    visitPurpose: '', auditType: '', dealerName: '', dealerCode: '',
    visitDate: '', ffrName: '',
    dealerLocation: '', operatingLevel: '',
    contactMet: '', contactRole: '',
  });
  const ua = (k, v) => setA((p) => ({ ...p, [k]: v }));

  // ── Section B ──
  const [b, setB] = useState({
    managerInPlace: '', externalReps: '', internalSpecialists: '', contactCentre: '',
    stockPct: '', minRequired: '', extRequired: '', focusParts: '',
    deliveryVans: '', fteDrivers: '', deliveryOwnership: '',
    irA: '', irB: '', irC: '', irTotal: '',
    dmsSystem: '', nscReporting: '', annualTargetAgreed: '',
    toTarget: '', toGrowth: '', iamMix: '', sellInOut: '', irTarget: '',
    marketingPlanStatus: '',
  });
  const ub = (k, v) => setB((p) => ({ ...p, [k]: v }));

  // ── Section C (Programme Tools) ──
  const [cRows, setCRows] = useState(initCRows());
  const uc = (i, k, v) => setCRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  // ── Section D (Objections / Enablers) ──
  const [dRows, setDRows] = useState(initDRows());
  const ud = (i, k, v) => setDRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [dBarrier, setDBarrier] = useState('');

  // ── Section E (Market Intelligence) ──
  const [e, setE] = useState({
    competitorDealer: '', competitorActivities: '', motorFactor: '',
    lostSales: '', localTrends: '', nscIntel: '', invoiceCollected: '',
  });
  const ue = (k, v) => setE((p) => ({ ...p, [k]: v }));

  // ── Section F (Actions) ──
  const [fRows, setFRows] = useState(initFRows());
  const uf = (i, k, v) => setFRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [f2, setF2] = useState({ nextDate: '', nextTime: '', obj1: '', obj2: '', obj3: '', coaching: '' });
  const uf2 = (k, v) => setF2((p) => ({ ...p, [k]: v }));

  // ── Section G (NSC Feedback) ──
  const [gRows, setGRows] = useState(initGRows());
  const ug = (i, k, v) => setGRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [gConcerns, setGConcerns] = useState('');
  const avgRating = (() => {
    const rated = gRows.filter((r) => r.rating !== '');
    if (!rated.length) return '—';
    return (rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length).toFixed(1);
  })();

  // ── Section H (Sign-Off) ──
  const [h, setH] = useState({ ffrName: '', ffrDate: '', dealerContact: '', dealerDate: '', evaluationIncluded: '' });
  const uh = (k, v) => setH((p) => ({ ...p, [k]: v }));

  // ── Visit persistence ──
  const [visitId, setVisitId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // ── Load modal ──
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadDealerCode, setLoadDealerCode] = useState('');
  const [loadVisitDate, setLoadVisitDate] = useState('');
  const [isLoadingVisit, setIsLoadingVisit] = useState(false);
  const [loadError, setLoadError] = useState('');

  // ── Live data + draft fetch ───────────────────────────────────
  useEffect(() => {
    if (!routeId) return;
    setIsLoading(true);
    setApiError('');

    api.getDealerByCode(routeId)
      .then((data) => {
        const abcSeg = (data.kpis || {}).abc_segmentation || {};
        if (data.dealer_name) onDealerNameLoaded?.(data.dealer_name);
        const aUpdates = {
          dealerName:     data.dealer_name || '',
          dealerCode:     data.dealer_code || routeId,
          visitDate:      new Date().toISOString().split('T')[0],
          dealerLocation: abcSeg.country || '',
        };
        setA((prev) => ({ ...prev, ...aUpdates }));
        setApiFilledA(new Set(Object.keys(aUpdates)));
        setVisitId(crypto.randomUUID());
      })
      .catch(() => {
        setApiError('Could not load live data — complete the form manually.');
        setVisitId(crypto.randomUUID());
      })
      .finally(() => setIsLoading(false));
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save / Submit ─────────────────────────────────────────────
  const buildPayload = (status) => ({
    form_type: 'dealer',
    status,
    visit_date: a.visitDate,
    submitted_by: api.getUser()?.email || '',
    updated_at: new Date().toISOString(),
    form_data: {
      visit_identification:    a,
      dealer_business_profile: b,
      programme_tools:         cRows,
      dealer_objections:       { rows: dRows, barrier: dBarrier },
      market_intelligence:     e,
      actions_agreed:          { rows: fRows, next_visit: f2 },
      nsc_programme_support:   { rows: gRows, concerns: gConcerns },
      sign_off:                h,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      await api.saveVisit(routeId, visitId, buildPayload('draft'));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      await api.saveVisit(routeId, visitId, buildPayload('submitted'));
      setSaveStatus('submitted');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadVisit = async () => {
    if (!loadDealerCode || !loadVisitDate) return;
    setIsLoadingVisit(true);
    setLoadError('');
    try {
      const result = await api.getVisitByDate(loadDealerCode, 'dealer', loadVisitDate);
      if (result?.visit) {
        const fd = result.visit.form_data;
        setVisitId(result.visit.visit_id);
        if (fd.visit_identification)    setA(fd.visit_identification);
        if (fd.dealer_business_profile) setB(fd.dealer_business_profile);
        if (fd.programme_tools)         setCRows(fd.programme_tools);
        if (fd.dealer_objections)       { setDRows(fd.dealer_objections.rows || initDRows()); setDBarrier(fd.dealer_objections.barrier || ''); }
        if (fd.market_intelligence)     setE(fd.market_intelligence);
        if (fd.actions_agreed)          { setFRows(fd.actions_agreed.rows || initFRows()); setF2(fd.actions_agreed.next_visit || {}); }
        if (fd.nsc_programme_support)   { setGRows(fd.nsc_programme_support.rows || initGRows()); setGConcerns(fd.nsc_programme_support.concerns || ''); }
        if (fd.sign_off)                setH(fd.sign_off);
        setShowLoadModal(false);
      } else {
        setLoadError('No visit found for that dealer and date.');
      }
    } catch {
      setLoadError('Visit not found — check the details and try again.');
    } finally {
      setIsLoadingVisit(false);
    }
  };

  const handleNewVisit = () => {
    if (!window.confirm('Start a new visit? Unsaved entries will be cleared.')) return;
    const preserved = {};
    apiFilledA.forEach((k) => { preserved[k] = a[k]; });
    setA({ visitPurpose: '', auditType: '', dealerName: '', dealerCode: '', visitDate: '', ffrName: '', dealerLocation: '', operatingLevel: '', contactMet: '', contactRole: '', ...preserved });
    setB({ managerInPlace: '', externalReps: '', internalSpecialists: '', contactCentre: '', stockPct: '', minRequired: '', extRequired: '', focusParts: '', deliveryVans: '', fteDrivers: '', deliveryOwnership: '', irA: '', irB: '', irC: '', irTotal: '', dmsSystem: '', nscReporting: '', annualTargetAgreed: '', toTarget: '', toGrowth: '', iamMix: '', sellInOut: '', irTarget: '', marketingPlanStatus: '' });
    setCRows(initCRows());
    setDRows(initDRows());
    setDBarrier('');
    setE({ competitorDealer: '', competitorActivities: '', motorFactor: '', lostSales: '', localTrends: '', nscIntel: '', invoiceCollected: '' });
    setFRows(initFRows());
    setF2({ nextDate: '', nextTime: '', obj1: '', obj2: '', obj3: '', coaching: '' });
    setGRows(initGRows());
    setGConcerns('');
    setH({ ffrName: '', ffrDate: '', dealerContact: '', dealerDate: '', evaluationIncluded: '' });
    setVisitId(crypto.randomUUID());
    setSaveStatus('');
  };

  const hasAnyData = (() => {
    const aUserKeys = Object.keys(a).filter((k) => !apiFilledA.has(k));
    if (aUserKeys.some((k) => a[k] !== '')) return true;
    if (Object.values(b).some((v) => v !== '')) return true;
    if (cRows.some((r) => r.status !== '' || r.demonstrated !== '' || r.pct !== '' || r.notes !== '')) return true;
    if (dRows.some((r) => r.response !== '' || r.followUp !== '')) return true;
    if (dBarrier !== '') return true;
    if (Object.values(e).some((v) => v !== '')) return true;
    if (fRows.some((r) => r.action !== '')) return true;
    if (gRows.some((r) => r.rating !== '' || r.comments !== '')) return true;
    if (gConcerns !== '') return true;
    if (Object.values(h).some((v) => v !== '')) return true;
    return false;
  })();

  const handleExport = () => {
    const prev = document.title;
    document.title = `Dealer Visit — ${a.dealerCode || routeId} — ${a.visitDate || 'Draft'}`;
    window.print();
    document.title = prev;
  };

  const btnBase   = { borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', letterSpacing: '0.04em', minHeight: '44px', padding: window.innerWidth < 640 ? '10px 12px' : '8px 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' };
  const newBtn    = { ...btnBase, background: 'transparent', color: '#A0A0A0', border: '1px solid #2A2A2A' };
  const saveBtn   = { ...btnBase, background: '#2A2A2A', color: '#FFFFFF' };
  const submitBtn = { ...btnBase, background: '#A100FF', color: '#FFFFFF' };

  const ActionBar = () => {
    const isMobile = window.innerWidth < 640;
    return (
      <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', padding: '10px 0', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {saveStatus === 'saved'      && <span style={{ fontSize: '12px', color: '#22C55E' }}>Draft saved</span>}
        {saveStatus === 'submitted'  && <span style={{ fontSize: '12px', color: '#22C55E' }}>Submitted successfully</span>}
        {saveStatus === 'error'      && <span style={{ fontSize: '12px', color: '#EF4444' }}>Save failed — try again</span>}
        <div style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
          <button onClick={handleNewVisit} style={newBtn}>Start New Visit</button>
          <button onClick={() => { setLoadDealerCode(routeId || ''); setLoadVisitDate(''); setLoadError(''); setShowLoadModal(true); }} style={newBtn}>Load a Visit</button>
          <button onClick={handleExport} disabled={!hasAnyData} style={{ ...newBtn, opacity: hasAnyData ? 1 : 0.4, cursor: hasAnyData ? 'pointer' : 'not-allowed' }}>Export</button>
          <button onClick={handleSave}   disabled={isSaving || !visitId} style={saveBtn}>{isSaving ? 'Saving…' : 'Save Draft'}</button>
          <button onClick={handleSubmit} disabled={isSaving || !visitId} style={submitBtn}>{isSaving ? 'Saving…' : 'Submit'}</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>

      <ActionBar />

      {/* How to use */}
      <div style={{ background: 'rgba(161,0,255,0.04)', border: '1px solid rgba(161,0,255,0.12)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '11px', color: '#A0A0A0' }}>
        <span style={{ color: '#A100FF', fontWeight: '700' }}>HOW TO USE: </span>
        Complete at each Dealer visit. Complete the Dealer Evaluation sheet at least quarterly (or on NSC recommended frequency) or on Evaluation visits.
      </div>

      {/* API legend + error banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#A0A0A0' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
          Auto-filled from live KPI data · all fields remain editable
        </div>
        {isLoading && <span style={{ fontSize: '11px', color: '#A0A0A0', fontStyle: 'italic' }}>Fetching live data…</span>}
      </div>

      {apiError && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#FCA5A5' }}>
          ⚠ {apiError}
        </div>
      )}

      {/* ── A: Visit Identification ── */}
      <Sec letter="A" title="Visit Identification & Context" loading={isLoading}>
        <Grid2>
          <Fld label="Visit Purpose">
            <Sel value={a.visitPurpose} onChange={(v) => ua('visitPurpose', v)} options={['Self Assessment', 'Pre-Audit', 'Audit', 'Follow Up']} />
          </Fld>
          <Fld label="Audit / Assessment Type">
            <Sel value={a.auditType} onChange={(v) => ua('auditType', v)} options={['Self Assessment', 'Pre-Audit', 'Audit', 'Follow Up']} />
          </Fld>
          <Fld label="Dealer / Business Name" fromApi={apiFilledA.has('dealerName')}>
            <Inp value={a.dealerName} onChange={(v) => ua('dealerName', v)} />
          </Fld>
          <Fld label="Dealer Code / No." fromApi={apiFilledA.has('dealerCode')}>
            <Inp value={a.dealerCode} onChange={(v) => ua('dealerCode', v)} />
          </Fld>
          <Fld label="Visit Date" fromApi={apiFilledA.has('visitDate')}>
            <Inp type="date" value={a.visitDate} onChange={(v) => ua('visitDate', v)} />
          </Fld>
          <div />
          <Fld label="Field Force Representative (Previously known as TPR) Name" span={2}>
            <Inp value={a.ffrName} onChange={(v) => ua('ffrName', v)} mode="alpha" />
          </Fld>
          <Fld label="Dealer Location" fromApi={apiFilledA.has('dealerLocation')}>
            <Inp value={a.dealerLocation} onChange={(v) => ua('dealerLocation', v)} />
          </Fld>
          <Fld label="Operating Standards Level">
            <Inp value={a.operatingLevel} onChange={(v) => ua('operatingLevel', v)} />
          </Fld>
          <Fld label="Dealer Contact Met (name & job title)">
            <Inp value={a.contactMet} onChange={(v) => ua('contactMet', v)} />
          </Fld>
          <Fld label="Role">
            <Sel value={a.contactRole} onChange={(v) => ua('contactRole', v)} options={['Decision maker — Owner', 'Decision maker — Manager', 'Decision maker — Parts person / Foreman', 'Influencer — Parts person', 'Influencer — Foreman', 'Influencer — Technician']} />
          </Fld>
        </Grid2>
      </Sec>

      {/* ── B: Dealer Business Profile ── */}
      <Sec letter="B" title="Dealer Business Profile" subtitle="confirm / update each visit">
        <Grid3>
          <div>
            <SubHeading>IAM Team (Principle 1)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="IAM Manager in place?"><YesNo value={b.managerInPlace} onChange={(v) => ub('managerInPlace', v)} /></Fld>
              <Fld label="External sales reps (dedicated)"><Inp value={b.externalReps} onChange={(v) => ub('externalReps', v)} mode="int" /></Fld>
              <Fld label="Internal IAM specialists"><Inp value={b.internalSpecialists} onChange={(v) => ub('internalSpecialists', v)} mode="int" /></Fld>
              <Fld label="Contact Centre in place?"><YesNo value={b.contactCentre} onChange={(v) => ub('contactCentre', v)} /></Fld>
            </div>
          </div>
          <div>
            <SubHeading>Stock (Principle 2)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="Current stock % of annual target"><Inp value={b.stockPct} onChange={(v) => ub('stockPct', v)} placeholder="%" mode="pct" /></Fld>
              <Fld label="Minimum required (Core)" hint="Defined and updated by NSC"><Inp value={b.minRequired} onChange={(v) => ub('minRequired', v)} /></Fld>
              <Fld label="Extended required (Mandatory)" hint="Defined and updated by NSC"><Inp value={b.extRequired} onChange={(v) => ub('extRequired', v)} /></Fld>
              <Fld label="Focus Parts Basket # coverage"><Inp value={b.focusParts} onChange={(v) => ub('focusParts', v)} /></Fld>
            </div>
          </div>
          <div>
            <SubHeading>Delivery (Principle 3)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="Number of delivery vans"><Inp value={b.deliveryVans} onChange={(v) => ub('deliveryVans', v)} mode="int" /></Fld>
              <Fld label="Number of FTE drivers"><Inp value={b.fteDrivers} onChange={(v) => ub('fteDrivers', v)} mode="int" /></Fld>
              <Fld label="Delivery owned or outsourced?">
                <Sel value={b.deliveryOwnership} onChange={(v) => ub('deliveryOwnership', v)} options={['Owned', 'Outsourced', 'Hybrid']} />
              </Fld>
            </div>
          </div>
        </Grid3>

        <PurpleBorder>
          {(() => {
            const isMobile = window.innerWidth < 640;
            const isTablet = window.innerWidth < 1024;
            const cols = isMobile ? 1 : isTablet ? 2 : 5;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '0' }}>
                <Fld label="Total no. of IRs in database"><Inp value={b.irTotal} onChange={(v) => ub('irTotal', v)} mode="int" /></Fld>
                <Fld label="A IRs"><Inp value={b.irA} onChange={(v) => ub('irA', v)} mode="int" /></Fld>
                <Fld label="B IRs"><Inp value={b.irB} onChange={(v) => ub('irB', v)} mode="int" /></Fld>
                <Fld label="C IRs"><Inp value={b.irC} onChange={(v) => ub('irC', v)} mode="int" /></Fld>
                <Fld label="A+B+C Check">
                  {(() => {
                    const sum = Number(b.irA) + Number(b.irB) + Number(b.irC);
                    const total = Number(b.irTotal);
                    const hasValues = b.irA !== '' || b.irB !== '' || b.irC !== '' || b.irTotal !== '';
                    if (!hasValues) return <span style={{ fontSize: '12px', color: '#A0A0A0' }}>—</span>;
                    return sum === total
                      ? <span style={{ fontSize: '12px', fontWeight: '700', color: '#22C55E' }}>OK</span>
                      : <span style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444' }}>Does not match total</span>;
                  })()}
                </Fld>
              </div>
            );
          })()}
        </PurpleBorder>

        <Grid2>
          <Fld label="DMS system in use"><Inp value={b.dmsSystem} onChange={(v) => ub('dmsSystem', v)} /></Fld>
          <Fld label="NSC reporting interface active?"><YesNo value={b.nscReporting} onChange={(v) => ub('nscReporting', v)} /></Fld>
        </Grid2>

        <PurpleBorder>
          <Fld label="Annual target agreed with NSC in writing? (Principle 4.1)">
            <YesNo value={b.annualTargetAgreed} onChange={(v) => ub('annualTargetAgreed', v)} />
          </Fld>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF', margin: '12px 0 8px' }}>Annual targets (from the NSC agreement)</div>
          {(() => {
            const isMobile = window.innerWidth < 640;
            const isTablet = window.innerWidth < 1024;
            const cols = isMobile ? 1 : isTablet ? 2 : 5;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px', marginBottom: '0' }}>
                <Fld label="TO target"><Inp value={b.toTarget} onChange={(v) => ub('toTarget', v)} mode="currency" /></Fld>
                <Fld label="TO growth target"><Inp value={b.toGrowth} onChange={(v) => ub('toGrowth', v)} mode="pct" /></Fld>
                <Fld label="IAM mix target"><Inp value={b.iamMix} onChange={(v) => ub('iamMix', v)} mode="pct" /></Fld>
                <Fld label="Sell in / Sell out target"><Inp value={b.sellInOut} onChange={(v) => ub('sellInOut', v)} /></Fld>
                <Fld label="No. of IRs target"><Inp value={b.irTarget} onChange={(v) => ub('irTarget', v)} mode="int" /></Fld>
              </div>
            );
          })()}
        </PurpleBorder>

        <Fld label="Marketing plan status (Principle 5.3 — agreed by end of January)">
          <Inp value={b.marketingPlanStatus} onChange={(v) => ub('marketingPlanStatus', v)} />
        </Fld>
      </Sec>

      {/* ── C: Programme Tools ── */}
      <Sec letter="C" title="Programme Tools & Dealer Adoption">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Tool / Programme', 'Dealer status', 'Demonstrated?', '% of IRs reached', 'Notes / actions'].map((col) => (
                  <th key={col} style={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '220px' }}>{r.tool}</td>
                  <td style={{ ...TD, minWidth: '120px' }}>
                    <Sel value={r.status} onChange={(v) => uc(i, 'status', v)} options={['Yes — this visit', 'Yes — previously', 'No — to be done next visit']} />
                  </td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <YesNo value={r.demonstrated} onChange={(v) => uc(i, 'demonstrated', v)} />
                  </td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <Inp value={r.pct} onChange={(v) => uc(i, 'pct', v)} placeholder="%" mode="pct" />
                  </td>
                  <td style={{ ...TD, minWidth: '180px' }}>
                    <Inp value={r.notes} onChange={(v) => uc(i, 'notes', v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>

      {/* ── D: Dealer Objections & Obstacles ── */}
      <Sec letter="D" title="Dealer Objections & Obstacles to Programme Delivery" subtitle="Mark each objection raised, note the response, and record the follow-up required">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Objection raised</th>
                <th style={TH}>Response / tool used</th>
                <th style={{ ...TH, minWidth: '130px' }}>Completion date</th>
                <th style={TH}>Follow-up action</th>
              </tr>
            </thead>
            <tbody>
              {dRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '220px', lineHeight: '1.4' }}>{r.item}</td>
                  <td style={{ ...TD, minWidth: '200px' }}><Inp value={r.response} onChange={(v) => ud(i, 'response', v)} /></td>
                  <td style={{ ...TD, minWidth: '130px' }}><Inp type="date" value={r.completionDate} onChange={(v) => ud(i, 'completionDate', v)} /></td>
                  <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.followUp} onChange={(v) => ud(i, 'followUp', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '14px' }}>
          <Fld label="Biggest single barrier to IAM growth at this Dealer">
            <Txt value={dBarrier} onChange={setDBarrier} rows={2} />
          </Fld>
        </div>
      </Sec>

      {/* ── E: Market Intelligence ── */}
      <Sec letter="E" title="Market Intelligence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Fld label="Competitor Dealer activity (other Brand Group dealers, Retailers, Tier 1 Supplier retailers like Bosch, Würth, Amazon — pricing, service levels, logistics, visits, marketing)">
            <Txt value={e.competitorDealer} onChange={(v) => ue('competitorDealer', v)} rows={2} />
          </Fld>
          <Fld label="Competitor activities (visits, marketing, promotions, logistics efficiencies, etc.)">
            <Txt value={e.competitorActivities} onChange={(v) => ue('competitorActivities', v)} rows={2} />
          </Fld>
          <Fld label="Motor factor / IAM activity (pricing, promotions, new entrants in the AOI)">
            <Txt value={e.motorFactor} onChange={(v) => ue('motorFactor', v)} rows={2} />
          </Fld>
          <Fld label="Lost sales — IR feedback (who is buying elsewhere, what, and why)">
            <Txt value={e.lostSales} onChange={(v) => ue('lostSales', v)} rows={2} />
          </Fld>
          <Fld label="Local market trends (EV growth, parc changes, new competitor sites)">
            <Txt value={e.localTrends} onChange={(v) => ue('localTrends', v)} rows={2} />
          </Fld>
          <Fld label="Intelligence to report to the NSC">
            <Txt value={e.nscIntel} onChange={(v) => ue('nscIntel', v)} rows={2} />
          </Fld>
          <Fld label="Competitor invoice / pricing collected?">
            <YesNo value={e.invoiceCollected} onChange={(v) => ue('invoiceCollected', v)} />
          </Fld>
        </div>
      </Sec>

      {/* ── F: Actions Agreed ── */}
      <Sec letter="F" title="Actions Agreed & Next Visit Planning">
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '30px' }}>#</th>
                <th style={TH}>Action required</th>
                <th style={{ ...TH, minWidth: '120px' }}>Responsible</th>
                <th style={{ ...TH, minWidth: '120px' }}>By when</th>
                <th style={{ ...TH, minWidth: '100px' }}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {fRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', fontWeight: '700' }}>{r.num}</td>
                  <td style={{ ...TD, minWidth: '260px' }}><Inp value={r.action} onChange={(v) => uf(i, 'action', v)} /></td>
                  <td style={TD}><Inp value={r.responsible} onChange={(v) => uf(i, 'responsible', v)} /></td>
                  <td style={TD}><Inp type="date" value={r.byWhen} onChange={(v) => uf(i, 'byWhen', v)} /></td>
                  <td style={TD}>
                    <Sel value={r.priority} onChange={(v) => uf(i, 'priority', v)} options={['High', 'Medium', 'Low']} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Grid2>
          <Fld label="Next visit date"><Inp type="date" value={f2.nextDate} onChange={(v) => uf2('nextDate', v)} /></Fld>
          <Fld label="Agreed visit time"><Inp type="time" value={f2.nextTime} onChange={(v) => uf2('nextTime', v)} /></Fld>
        </Grid2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Fld label="Next visit objective 1"><Inp value={f2.obj1} onChange={(v) => uf2('obj1', v)} /></Fld>
          <Fld label="Next visit objective 2"><Inp value={f2.obj2} onChange={(v) => uf2('obj2', v)} /></Fld>
          <Fld label="Next visit objective 3"><Inp value={f2.obj3} onChange={(v) => uf2('obj3', v)} /></Fld>
          <Fld label="Coaching / development focus for the next visit">
            <Txt value={f2.coaching} onChange={(v) => uf2('coaching', v)} rows={2} />
          </Fld>
        </div>
      </Sec>

      {/* ── G: NSC & Programme Support ── */}
      <Sec letter="G" title="NSC & Programme Support — Dealer Feedback" subtitle="Rate each item from the Dealer's point of view: 1 = poor → 5 = excellent">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Metric</th>
                <th style={{ ...TH, minWidth: '100px' }}>Rating (1–5)</th>
                <th style={TH}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {gRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '240px' }}>{r.metric}</td>
                  <td style={TD}>
                    <input
                      type="number"
                      step="0.1"
                      value={r.rating}
                      onChange={(e) => ug(i, 'rating', e.target.value)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) ug(i, 'rating', String(Math.min(5, Math.max(1, v))));
                      }}
                      placeholder="1–5"
                      style={{ ...baseInput, width: '80px' }}
                    />
                  </td>
                  <td style={{ ...TD, minWidth: '220px' }}>
                    <Inp value={r.comments} onChange={(v) => ug(i, 'comments', v)} />
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #2A2A2A' }}>
                <td style={{ ...TD, fontWeight: '700', color: '#FFFFFF' }}>Average score</td>
                <td style={{ ...TD, fontWeight: '700', color: '#A100FF', fontSize: '15px' }}>{avgRating}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '14px' }}>
          <Fld label="Specific programme concerns or NSC requests raised by the Dealer">
            <Txt value={gConcerns} onChange={setGConcerns} rows={3} />
          </Fld>
        </div>
      </Sec>

      {/* ── H: Sign-Off ── */}
      <Sec letter="H" title="Sign-Off & Declaration">
        <Grid2>
          <Fld label="Field Force Representative (name)"><Inp value={h.ffrName} onChange={(v) => uh('ffrName', v)} mode="alpha" /></Fld>
          <Fld label="Date"><Inp type="date" value={h.ffrDate} onChange={(v) => uh('ffrDate', v)} /></Fld>
          <Fld label="Dealer contact (name)"><Inp value={h.dealerContact} onChange={(v) => uh('dealerContact', v)} mode="alpha" /></Fld>
          <Fld label="Date"><Inp type="date" value={h.dealerDate} onChange={(v) => uh('dealerDate', v)} /></Fld>
          <Fld label="IAM Dealer Evaluation included?" span={2}>
            <YesNo value={h.evaluationIncluded} onChange={(v) => uh('evaluationIncluded', v)} />
          </Fld>
        </Grid2>
        <div style={{ marginTop: '20px', padding: '12px 16px', background: '#141414', borderRadius: '8px', border: '1px solid #2A2A2A', fontSize: '11px', color: '#A0A0A0', textAlign: 'center' }}>
          CONFIDENTIAL — for authorised IAM field representatives only. &nbsp; BMW &amp; MINI · IAM Authorised Dealer Visit Form v3.0
        </div>
      </Sec>

      <ActionBar />

      {showLoadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '360px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', marginBottom: '20px' }}>Load a Saved Visit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <Fld label="Dealer Code">
                <Inp value={loadDealerCode} onChange={setLoadDealerCode} placeholder="e.g. 33400" />
              </Fld>
              <Fld label="Visit Date">
                <Inp type="date" value={loadVisitDate} onChange={setLoadVisitDate} />
              </Fld>
            </div>
            {loadError && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '14px' }}>{loadError}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLoadModal(false)} style={newBtn}>Cancel</button>
              <button onClick={handleLoadVisit} disabled={!loadDealerCode || !loadVisitDate || isLoadingVisit} style={{ ...saveBtn, opacity: (!loadDealerCode || !loadVisitDate) ? 0.5 : 1 }}>
                {isLoadingVisit ? 'Loading…' : 'Load Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
