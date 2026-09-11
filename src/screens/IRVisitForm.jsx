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

function Chk({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ accentColor: '#A100FF', width: '16px', height: '16px', cursor: 'pointer' }}
    />
  );
}

// ── Layout helpers ────────────────────────────────────────────

function Sec({ letter, title, subtitle, children }) {
  const isMobile = window.innerWidth < 640;
  return (
    <div className="card" style={{ marginBottom: isMobile ? '12px' : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? '6px' : '10px', marginBottom: isMobile ? '12px' : '18px', borderBottom: '1px solid #1E1E1E', paddingBottom: isMobile ? '8px' : '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#A100FF' }}>{letter}.</span>
        <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'none', letterSpacing: 0 }}>{subtitle}</span>}
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

function Grid3({ children, style = {} }) {
  const isMobile = window.innerWidth < 640;
  const isTablet = window.innerWidth < 1024;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '1fr 1fr 1fr', gap: isMobile ? '10px' : isTablet ? '12px 16px' : '16px 24px', marginBottom: '12px', ...style }}>
      {children}
    </div>
  );
}

function Fld({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}`, display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column' }}>
      {label && (
        <div style={{ fontSize: '11px', color: '#A0A0A0', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em', minHeight: '16px' }}>
          {label}
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

// ── Data ──────────────────────────────────────────────────────

const C_KPIS = [
  'Total genuine parts revenue from this Dealer',
  'Service & wear parts (brakes, filters, oil, wipers)',
  'Captive parts (BMW-only OE)',
  'Highly competitive parts',
  'No. of part numbers ordered (breadth)',
  'PL24 orders placed this month',
  'Rewards programme points / threshold status',
];

const D_TOOLS = [
  { label: 'BwIR Portal registration', hint: 'Assist to register if not yet done' },
  { label: 'PL24 — Parts Link 24', hint: 'Promote the trial period if not using' },
  { label: 'AOS (online service system)', hint: 'Demo: digital service history, ETK, technical help' },
  { label: 'BMW parts warranty', hint: "Value to the IR's end customers" },
  { label: 'Service Level Agreement (SLA)', hint: '' },
  { label: 'Rewards / bonus programme', hint: 'Check proximity to the next threshold' },
  { label: 'Marketing campaigns / promotions', hint: 'Show the current campaigns from the portal' },
];

const E_METRICS = [
  'Parts availability & fill rate',
  'Delivery speed & reliability',
  'Pricing competitiveness',
  'Telephone & email response time',
  'Technical support quality',
  'Van driver attitude & professionalism',
  'Returns & warranty process',
  'Overall Dealer satisfaction',
];

const F_OBJECTIONS = [
  { isHeader: true, category: 'PRODUCT OBJECTIONS' },
  { objection: 'BMW OE parts are too expensive / not competitive' },
  { objection: "I don't see the benefit of fitting genuine OE parts" },
  { objection: "My customers don't care about OE vs aftermarket parts" },
  { objection: 'Not enough BMW/MINI vehicles coming through to justify it' },
  { isHeader: true, category: 'SERVICE & DELIVERY OBJECTIONS' },
  { objection: 'Delivery is too slow or unreliable' },
  { objection: "I can't get the parts I need — stock is not available" },
  { objection: 'The portal / PL24 ordering system is too complicated' },
  { objection: 'There is no useful technical support available (AOS not valuable)' },
  { isHeader: true, category: 'RELATIONSHIP & COMMERCIAL OBJECTIONS' },
  { objection: "I have a good relationship with my current supplier — I don't want to change" },
  { objection: 'A competitor motor factor gives me better pricing and service' },
  { objection: "The credit / payment terms don't work for my business" },
  { objection: 'The SLA or rewards scheme is not attractive enough' },
  { objection: 'Other (specify in the response column)' },
];

const BUYING_HABITS = [
  'Buying mainly captive parts only',
  'Buying service & wear parts regularly',
  'Buying competitive parts elsewhere',
  'Inconsistent / seasonal buying',
  'Regular & growing',
];

const F_DATA = F_OBJECTIONS.filter((o) => !o.isHeader);

const initCRows = () => C_KPIS.map((kpi) => ({ kpi, target: '', actual: '', status: '', comments: '' }));
const initDRows = () => D_TOOLS.map((t) => ({ tool: t.label, hint: t.hint, status: '', demonstrated: '', notes: '' }));
const initERows = () => E_METRICS.map((metric) => ({ metric, rating: '', comments: '' }));
const initFRows = () => F_DATA.map((o) => ({ objection: o.objection, raised: false, response: '', resolved: '', followUp: '' }));
const initHRows = () => Array.from({ length: 6 }, (_, i) => ({ num: i + 1, action: '', responsible: '', byWhen: '', done: '' }));
const initIRows = () => Array.from({ length: 6 }, (_, i) => ({ num: i + 1, part: '', qty: '', unitPrice: '', invoice: '' }));

function rowTotal(qty, price) {
  const q = parseFloat(qty);
  const p = parseFloat(price);
  return (!isNaN(q) && !isNaN(p)) ? (q * p).toFixed(2) : '';
}

function parseCurrency(v) {
  const n = parseFloat(String(v || '').replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Component ─────────────────────────────────────────────────

export default function IRVisitForm({ dealer }) {
  const d = dealer || { name: '', id: '', city: '' };
  const { id: routeId } = useParams();

  // Section A
  const [a, setA] = useState({
    visitType: '', irStatus: '', irName: d.name, accountNo: d.id,
    visitDate: '', visitTime: '',
    tprName: '', bdcName: '', irLocation: d.city || '', nearestDealer: '',
    irCategory: '', contactMet: '', contactRole: '',
    servicingDealer: '', dealerConflict: '',
  });
  const ua = (k, v) => setA((p) => ({ ...p, [k]: v }));

  // Section B
  const [b, setB] = useState({
    ramps: '', workshopType: '', bwirRegistered: '',
    technicians: '', specialistStatus: '',
    bmwPerMonth: '', bmwPct: '',
    partsSuppliers: '',
    spendThisDealer: '', spendCompetitors: '',
    motorFactors: '', surveyCompleted: '',
  });
  const ub = (k, v) => setB((p) => ({ ...p, [k]: v }));
  const spendTotalComputed = (() => {
    const d = parseCurrency(b.spendThisDealer);
    const c = parseCurrency(b.spendCompetitors);
    return (d !== null || c !== null) ? (d || 0) + (c || 0) : null;
  })();

  // Section C
  const [cRows, setCRows] = useState(initCRows());
  const uc = (i, k, v) => setCRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [gaps, setGaps] = useState({ g1: '', g2: '', g3: '' });
  const [habits, setHabits] = useState({});
  const [c2, setC2] = useState({ achieved: '', actual: '', target: '', keyDriver: '' });
  const uc2 = (k, v) => setC2((p) => ({ ...p, [k]: v }));

  // Section D
  const [dRows, setDRows] = useState(initDRows());
  const ud = (i, k, v) => setDRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  // Section E
  const [eRows, setERows] = useState(initERows());
  const ue = (i, k, v) => setERows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [eConcerns, setEConcerns] = useState('');
  const avgRating = (() => {
    const rated = eRows.filter((r) => r.rating !== '');
    if (!rated.length) return '—';
    return (rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length).toFixed(1);
  })();

  // Section F
  const [fRows, setFRows] = useState(initFRows());
  const uf = (i, k, v) => setFRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [fBarrier, setFBarrier] = useState('');

  // Section G
  const [g, setG] = useState({ competitorOffers: '', otherOEM: '', irObservations: '', nscIntel: '', invoiceCollected: '' });
  const ug = (k, v) => setG((p) => ({ ...p, [k]: v }));

  // Section H
  const [hRows, setHRows] = useState(initHRows());
  const uh = (i, k, v) => setHRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [h2, setH2] = useState({ nextDate: '', nextTime: '', obj1: '', obj2: '', obj3: '', freqAdjust: '', freqReason: '', newIRs: '' });
  const uh2 = (k, v) => setH2((p) => ({ ...p, [k]: v }));

  // Section I
  const [iRows, setIRows] = useState(initIRows());
  const ui = (i, k, v) => setIRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [saleAchieved, setSaleAchieved] = useState('');
  const totalOrderValue = iRows.reduce((sum, r) => {
    const q = parseFloat(r.qty);
    const p = parseFloat(r.unitPrice);
    return (!isNaN(q) && !isNaN(p)) ? sum + q * p : sum;
  }, 0);

  // Section J
  const [j, setJ] = useState({ tprName: '', tprDate: '', formSubmitted: '' });
  const uj = (k, v) => setJ((p) => ({ ...p, [k]: v }));

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

  // ── Draft load + dealer pre-fill ─────────────────────────────
  useEffect(() => {
    if (!routeId) return;

    api.getDealerByCode(routeId)
      .then((data) => {
        const abcSeg = (data.kpis || {}).abc_segmentation || {};
        setA((prev) => ({
          ...prev,
          irName:     data.dealer_name || prev.irName,
          accountNo:  data.dealer_code || routeId,
          irLocation: abcSeg.country   || prev.irLocation,
          visitDate:  new Date().toISOString().split('T')[0],
        }));
        setVisitId(crypto.randomUUID());
      })
      .catch(() => setVisitId(crypto.randomUUID()));
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save / Submit ─────────────────────────────────────────────
  const buildPayload = (status) => {
    const kpiRowsWithVariance = cRows.map((r) => {
      const t = parseCurrency(r.target);
      const aVal = parseCurrency(r.actual);
      return { ...r, variance: t !== null && aVal !== null ? (aVal - t).toFixed(2) : '' };
    });
    const c2Variance = (() => {
      const aVal = parseCurrency(c2.actual);
      const t = parseCurrency(c2.target);
      return aVal !== null && t !== null ? (aVal - t).toFixed(2) : '';
    })();
    return {
      form_type: 'ir',
      status,
      visit_date: a.visitDate,
      submitted_by: api.getUser()?.email || '',
      updated_at: new Date().toISOString(),
      form_data: {
        visit_identification:  a,
        ir_business_profile:   { ...b, spendTotal: spendTotalComputed !== null ? spendTotalComputed.toFixed(2) : '' },
        sales_performance:     { kpi_rows: kpiRowsWithVariance, gaps, habits, month_end_review: { ...c2, variance: c2Variance } },
        programme_tools:       dRows,
        dealer_service_quality:{ rows: eRows, concerns: eConcerns },
        ir_objections:         { rows: fRows, barrier: fBarrier },
        market_intelligence:   g,
        actions_agreed:        { rows: hRows, next_visit: h2 },
        direct_sales_orders:   { rows: iRows, sale_achieved: saleAchieved },
        sign_off:              j,
      },
    };
  };

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
      const result = await api.getVisitByDate(loadDealerCode, 'ir', loadVisitDate);
      if (result?.visit) {
        const fd = result.visit.form_data;
        setVisitId(result.visit.visit_id);
        if (fd.visit_identification)   setA(fd.visit_identification);
        if (fd.ir_business_profile)    setB(fd.ir_business_profile);
        if (fd.sales_performance)      {
          setCRows(fd.sales_performance.kpi_rows      || initCRows());
          setGaps(fd.sales_performance.gaps           || { g1: '', g2: '', g3: '' });
          setHabits(fd.sales_performance.habits       || {});
          setC2(fd.sales_performance.month_end_review || { achieved: '', actual: '', target: '', keyDriver: '' });
        }
        if (fd.programme_tools)        setDRows(fd.programme_tools);
        if (fd.dealer_service_quality) { setERows(fd.dealer_service_quality.rows || initERows()); setEConcerns(fd.dealer_service_quality.concerns || ''); }
        if (fd.ir_objections)          { setFRows(fd.ir_objections.rows || initFRows()); setFBarrier(fd.ir_objections.barrier || ''); }
        if (fd.market_intelligence)    setG(fd.market_intelligence);
        if (fd.actions_agreed)         { setHRows(fd.actions_agreed.rows || initHRows()); setH2(fd.actions_agreed.next_visit || {}); }
        if (fd.direct_sales_orders)    { setIRows(fd.direct_sales_orders.rows || initIRows()); setSaleAchieved(fd.direct_sales_orders.sale_achieved || ''); }
        if (fd.sign_off)               setJ(fd.sign_off);
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
    setA({ visitType: '', irStatus: '', irName: d.name, accountNo: d.id, visitDate: '', visitTime: '', tprName: '', bdcName: '', irLocation: d.city || '', nearestDealer: '', irCategory: '', contactMet: '', contactRole: '', servicingDealer: '', dealerConflict: '' });
    setB({ ramps: '', workshopType: '', bwirRegistered: '', technicians: '', specialistStatus: '', bmwPerMonth: '', bmwPct: '', partsSuppliers: '', spendThisDealer: '', spendCompetitors: '', motorFactors: '', surveyCompleted: '' });
    setCRows(initCRows());
    setGaps({ g1: '', g2: '', g3: '' });
    setHabits({});
    setC2({ achieved: '', actual: '', target: '', keyDriver: '' });
    setDRows(initDRows());
    setERows(initERows());
    setEConcerns('');
    setFRows(initFRows());
    setFBarrier('');
    setG({ competitorOffers: '', otherOEM: '', irObservations: '', nscIntel: '', invoiceCollected: '' });
    setHRows(initHRows());
    setH2({ nextDate: '', nextTime: '', obj1: '', obj2: '', obj3: '', freqAdjust: '', freqReason: '', newIRs: '' });
    setIRows(initIRows());
    setSaleAchieved('');
    setJ({ tprName: '', tprDate: '', formSubmitted: '' });
    setVisitId(crypto.randomUUID());
    setSaveStatus('');
  };

  const hasAnyData = (() => {
    const apiFields = new Set(['irName', 'accountNo', 'irLocation', 'visitDate']);
    if (Object.entries(a).some(([k, v]) => !apiFields.has(k) && v !== '')) return true;
    if (Object.values(b).some((v) => v !== '')) return true;
    if (cRows.some((r) => r.target !== '' || r.actual !== '' || r.status !== '' || r.comments !== '')) return true;
    if (gaps.g1 !== '' || gaps.g2 !== '' || gaps.g3 !== '') return true;
    if (Object.keys(habits).some((k) => habits[k])) return true;
    if (Object.values(c2).some((v) => v !== '')) return true;
    if (dRows.some((r) => r.status !== '' || r.demonstrated !== '' || r.notes !== '')) return true;
    if (eRows.some((r) => r.rating !== '' || r.comments !== '')) return true;
    if (eConcerns !== '') return true;
    if (fRows.some((r) => r.raised || r.response !== '')) return true;
    if (fBarrier !== '') return true;
    if (Object.values(g).some((v) => v !== '')) return true;
    if (hRows.some((r) => r.action !== '')) return true;
    if (iRows.some((r) => r.part !== '' || r.qty !== '')) return true;
    if (saleAchieved !== '') return true;
    if (Object.values(j).some((v) => v !== '')) return true;
    return false;
  })();

  const handleExport = () => {
    const prev = document.title;
    document.title = `IR Visit — ${a.accountNo || routeId} — ${a.visitDate || 'Draft'}`;
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
        {saveStatus === 'saved'     && <span style={{ fontSize: '12px', color: '#22C55E' }}>Draft saved</span>}
        {saveStatus === 'submitted' && <span style={{ fontSize: '12px', color: '#22C55E' }}>Submitted successfully</span>}
        {saveStatus === 'error'     && <span style={{ fontSize: '12px', color: '#EF4444' }}>Save failed — try again</span>}
        <div style={{ display: 'flex', gap: '8px', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
          <button onClick={() => setShowLoadModal(true)} style={{ ...newBtn }}>Load a Visit</button>
          <button onClick={handleExport} disabled={!hasAnyData} style={{ ...newBtn, opacity: hasAnyData ? 1 : 0.4, cursor: hasAnyData ? 'pointer' : 'not-allowed' }}>Export</button>
          <button onClick={handleNewVisit} style={newBtn}>Start New Visit</button>
          <button onClick={handleSave}   disabled={isSaving || !visitId} style={saveBtn}>{isSaving ? 'Saving…' : 'Save Draft'}</button>
          <button onClick={handleSubmit} disabled={isSaving || !visitId} style={submitBtn}>{isSaving ? 'Saving…' : 'Submit'}</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>

      <ActionBar />

      {/* ── A: Visit Identification ── */}
      <Sec letter="A" title="Visit Identification & Context">
        <Grid2>
          <Fld label="Visit type" span={2}>
            <Sel value={a.visitType} onChange={(v) => ua('visitType', v)} options={['Visit 1 of 2 — assessment + target setting', 'Visit 2 of 2 — progress review + direct sales', 'Additional / unplanned visit']} />
          </Fld>
          <Fld label="IR registration status" span={2}>
            <Sel value={a.irStatus} onChange={(v) => ua('irStatus', v)} options={['Type 1 — not yet registered (registration visit)', 'Type 2 — registered (ongoing relationship visit)', 'Investigative visit (unknown IR)']} />
          </Fld>
          <Fld label="IR business name"><Inp value={a.irName} onChange={(v) => ua('irName', v)} /></Fld>
          <Fld label="Customer account no."><Inp value={a.accountNo} onChange={(v) => ua('accountNo', v)} /></Fld>
          <Fld label="Visit date"><Inp type="date" value={a.visitDate} onChange={(v) => ua('visitDate', v)} /></Fld>
          <Fld label="Time of visit"><Inp type="time" value={a.visitTime} onChange={(v) => ua('visitTime', v)} /></Fld>
          <Fld label="Representative (TPR) name"><Inp value={a.tprName} onChange={(v) => ua('tprName', v)} mode="alpha" /></Fld>
          <Fld label="BDC / Coach name"><Inp value={a.bdcName} onChange={(v) => ua('bdcName', v)} /></Fld>
          <Fld label="IR location / postcode"><Inp value={a.irLocation} onChange={(v) => ua('irLocation', v)} /></Fld>
          <Fld label="Distance from nearest Dealer (km/mi)"><Inp value={a.nearestDealer} onChange={(v) => ua('nearestDealer', v)} /></Fld>
          <Fld label="IR category (from CRM6 prioritisation)" span={2}>
            <Sel value={a.irCategory} onChange={(v) => ua('irCategory', v)} options={['A — highest opportunity (direct TPR engagement)', 'B — medium (Dealer sales rep / telesales)', 'C — low opportunity']} />
          </Fld>
          <Fld label="Contact person met (name & job title)"><Inp value={a.contactMet} onChange={(v) => ua('contactMet', v)} /></Fld>
          <Fld label="Role"><Sel value={a.contactRole} onChange={(v) => ua('contactRole', v)} options={['Decision maker — Owner', 'Decision maker — Manager', 'Decision maker — Parts person / Foreman', 'Influencer — Parts person', 'Influencer — Foreman', 'Influencer — Technician']} /></Fld>
          <Fld label="Servicing Dealer (primary)"><Inp value={a.servicingDealer} onChange={(v) => ua('servicingDealer', v)} /></Fld>
          <Fld label="Conflict with another Dealer?"><YesNo value={a.dealerConflict} onChange={(v) => ua('dealerConflict', v)} /></Fld>
        </Grid2>
      </Sec>

      {/* ── B: IR Business Profile ── */}
      <Sec letter="B" title="IR Business Profile" subtitle="confirm / update on every first visit">
        <Grid3>
          <div>
            <SubHeading>Facility</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="No. of ramps / work bays"><Inp value={b.ramps} onChange={(v) => ub('ramps', v)} mode="int" /></Fld>
              <Fld label="Workshop type">
                <Sel value={b.workshopType} onChange={(v) => ub('workshopType', v)} options={['Mechanical', 'Bodyshop', 'Both']} />
              </Fld>
            </div>
          </div>
          <div>
            <SubHeading>Staffing</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="No. of technicians"><Inp value={b.technicians} onChange={(v) => ub('technicians', v)} mode="int" /></Fld>
              <Fld label="Specialist status"><Sel value={b.specialistStatus} onChange={(v) => ub('specialistStatus', v)} options={['BMW / MINI', 'Prestige', 'German', 'None']} /></Fld>
            </div>
          </div>
          <div>
            <SubHeading>BMW / MINI Focus</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="BMW/MINI vehicles serviced per month"><Inp value={b.bmwPerMonth} onChange={(v) => ub('bmwPerMonth', v)} mode="int" /></Fld>
              <Fld label="% of total throughput BMW/MINI"><Inp value={b.bmwPct} onChange={(v) => ub('bmwPct', v)} placeholder="%" mode="pct" /></Fld>
            </div>
          </div>
        </Grid3>

        <Fld label="BwIR registered?" style={{ marginBottom: '14px' }}>
          <YesNo value={b.bwirRegistered} onChange={(v) => ub('bwirRegistered', v)} />
        </Fld>

        <Fld label="Parts suppliers currently used (motor factors, competitor dealers, direct suppliers — e.g. LKQ, GSF, ECP, Dealer X)">
          <Txt value={b.partsSuppliers} onChange={(v) => ub('partsSuppliers', v)} rows={2} />
        </Fld>

        <div style={{ overflowX: 'auto', marginTop: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Monthly BMW/MINI parts spend</th>
                <th style={{ ...TH, minWidth: '110px' }}>With this Dealer</th>
                <th style={{ ...TH, minWidth: '110px' }}>With competitors</th>
                <th style={{ ...TH, minWidth: '110px' }}>Total estimated</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1E1E1E' }}>
                <td style={{ ...TD, color: '#A0A0A0' }}>Including all suppliers</td>
                <td style={TD}><Inp value={b.spendThisDealer} onChange={(v) => ub('spendThisDealer', v)} placeholder="£" mode="currency" /></td>
                <td style={TD}><Inp value={b.spendCompetitors} onChange={(v) => ub('spendCompetitors', v)} placeholder="£" mode="currency" /></td>
                <td style={{ ...TD, color: spendTotalComputed !== null ? '#FFFFFF' : '#555', fontWeight: spendTotalComputed !== null ? '600' : '400' }}>
                  {spendTotalComputed !== null ? `£${spendTotalComputed.toFixed(2)}` : '—'}
                </td>
              </tr>
              <tr>
                <td style={TD}><Fld label="Number of motor factors used"><Sel value={b.motorFactors} onChange={(v) => ub('motorFactors', v)} options={['1 only', '2–3', '4 or more', 'Unknown']} /></Fld></td>
                <td />
                <td colSpan={2} style={TD}><Fld label="IR Expectation Survey (CRM3) completed?"><Sel value={b.surveyCompleted} onChange={(v) => ub('surveyCompleted', v)} options={['Yes — this visit', 'Yes — previously', 'No — to be done next visit']} /></Fld></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Sec>

      {/* ── C: Sales Performance ── */}
      <Sec letter="C" title="Sales Performance & Monthly Targets">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['KPI / Metric', 'Target', 'Actual MTD', 'Variance', 'Status', 'Comments'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '200px', lineHeight: '1.4' }}>{r.kpi}</td>
                  <td style={{ ...TD, minWidth: '90px' }}><Inp value={r.target} onChange={(v) => uc(i, 'target', v)} mode="currency" /></td>
                  <td style={{ ...TD, minWidth: '90px' }}><Inp value={r.actual} onChange={(v) => uc(i, 'actual', v)} mode="currency" /></td>
                  <td style={{ ...TD, minWidth: '90px' }}>
                    {(() => {
                      const t = parseCurrency(r.target);
                      const aVal = parseCurrency(r.actual);
                      if (t === null || aVal === null) return <span style={{ color: '#555' }}>—</span>;
                      const diff = aVal - t;
                      return <span style={{ color: diff >= 0 ? '#22C55E' : '#EF4444', fontWeight: '600', fontSize: '12px' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(2)}</span>;
                    })()}
                  </td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <Sel value={r.status} onChange={(v) => uc(i, 'status', v)} options={['On Track', 'At Risk', 'Off Track']} />
                  </td>
                  <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.comments} onChange={(v) => uc(i, 'comments', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PurpleBorder>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF', marginBottom: '10px' }}>
            Purchase gap analysis — parts the IR is NOT currently buying from this Dealer
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Fld label="Gap 1"><Inp value={gaps.g1} onChange={(v) => setGaps((p) => ({ ...p, g1: v }))} /></Fld>
            <Fld label="Gap 2"><Inp value={gaps.g2} onChange={(v) => setGaps((p) => ({ ...p, g2: v }))} /></Fld>
            <Fld label="Gap 3"><Inp value={gaps.g3} onChange={(v) => setGaps((p) => ({ ...p, g3: v }))} /></Fld>
          </div>
        </PurpleBorder>

        <PurpleBorder>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF', marginBottom: '10px' }}>
            Buying habits assessment — mark every pattern that applies
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {BUYING_HABITS.map((habit) => (
              <label
                key={habit}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: habits[habit] ? '#FFFFFF' : '#A0A0A0' }}
              >
                <Chk checked={!!habits[habit]} onChange={(v) => setHabits((p) => ({ ...p, [habit]: v }))} />
                {habit}
              </label>
            ))}
          </div>
        </PurpleBorder>

        <PurpleBorder>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
            Visit 2 — month-end review{' '}
            <span style={{ color: '#A0A0A0', fontWeight: '400' }}>(complete on the second visit of the month)</span>
          </div>
          <Grid2>
            <Fld label="Were month-end targets achieved?"><Sel value={c2.achieved} onChange={(v) => uc2('achieved', v)} options={['Yes - All Met', 'Partially', 'No', 'N/A']} /></Fld>
            <div />
          </Grid2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <Fld label="Final month revenue — Actual"><Inp value={c2.actual} onChange={(v) => uc2('actual', v)} mode="currency" /></Fld>
            <Fld label="Target"><Inp value={c2.target} onChange={(v) => uc2('target', v)} mode="currency" /></Fld>
            <Fld label="Variance">
              {(() => {
                const aVal = parseCurrency(c2.actual);
                const t = parseCurrency(c2.target);
                if (aVal === null || t === null) return <span style={{ color: '#555', fontSize: '12px' }}>—</span>;
                const diff = aVal - t;
                return <span style={{ color: diff >= 0 ? '#22C55E' : '#EF4444', fontWeight: '700', fontSize: '13px' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(2)}</span>;
              })()}
            </Fld>
          </div>
          <Fld label="Key driver of performance this month (what changed? new purchases? stopped buying something? competitor price change?)">
            <Txt value={c2.keyDriver} onChange={(v) => uc2('keyDriver', v)} rows={2} />
          </Fld>
        </PurpleBorder>
      </Sec>

      {/* ── D: Programme Tools ── */}
      <Sec letter="D" title="Programme Tools & IR Adoption">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Tool / Programme</th>
                <th style={{ ...TH, minWidth: '110px' }}>IR status</th>
                <th style={{ ...TH, minWidth: '110px' }}>Demonstrated today?</th>
                <th style={TH}>Notes / next action</th>
              </tr>
            </thead>
            <tbody>
              {dRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '200px' }}>{r.tool}</td>
                  <td style={{ ...TD, minWidth: '120px' }}>
                    <Sel value={r.status} onChange={(v) => ud(i, 'status', v)} options={['Yes — this visit', 'Yes — previously', 'No — to be done next visit']} />
                  </td>
                  <td style={TD}>
                    <YesNo value={r.demonstrated} onChange={(v) => ud(i, 'demonstrated', v)} />
                  </td>
                  <td style={{ ...TD, minWidth: '220px' }}>
                    <Inp value={r.notes} onChange={(v) => ud(i, 'notes', v)} placeholder={r.hint} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>

      {/* ── E: Dealer Service Quality ── */}
      <Sec letter="E" title="Dealer Service Quality — Rated from the IR's Perspective" subtitle="1 = poor → 5 = excellent">
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
              {eRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '240px' }}>{r.metric}</td>
                  <td style={TD}>
                    <Sel value={r.rating} onChange={(v) => ue(i, 'rating', v)} options={['1', '2', '3', '4', '5']} />
                  </td>
                  <td style={{ ...TD, minWidth: '220px' }}>
                    <Inp value={r.comments} onChange={(v) => ue(i, 'comments', v)} />
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
          <Fld label="Specific complaints or concerns raised by the IR">
            <Txt value={eConcerns} onChange={setEConcerns} rows={3} />
          </Fld>
        </div>
      </Sec>

      {/* ── F: IR Objections ── */}
      <Sec letter="F" title="IR Objections Raised & How They Were Handled" subtitle="Note tool used — Parts Basket, Opportunity Calculator, Warranty, AOS, PL24, campaigns">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={TH}>Objection raised</th>
                <th style={{ ...TH, width: '70px', textAlign: 'center' }}>Raised?</th>
                <th style={TH}>Response / tool used</th>
                <th style={{ ...TH, width: '90px' }}>Resolved?</th>
                <th style={TH}>Follow-up action</th>
              </tr>
            </thead>
            <tbody>
              {F_OBJECTIONS.map((item, i) => {
                if (item.isHeader) {
                  return (
                    <tr key={`h-${i}`}>
                      <td colSpan={5} style={{ padding: '10px 8px 6px', color: '#A100FF', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(161,0,255,0.06)', borderTop: '1px solid #2A2A2A' }}>
                        {item.category}
                      </td>
                    </tr>
                  );
                }
                const idx = fRows.findIndex((r) => r.objection === item.objection);
                const r = fRows[idx];
                if (!r) return null;
                return (
                  <tr key={`r-${i}`} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td style={{ ...TD, color: '#A0A0A0', minWidth: '240px', lineHeight: '1.5' }}>{r.objection}</td>
                    <td style={{ ...TD, textAlign: 'center' }}><Chk checked={r.raised} onChange={(v) => uf(idx, 'raised', v)} /></td>
                    <td style={{ ...TD, minWidth: '180px' }}><Inp value={r.response} onChange={(v) => uf(idx, 'response', v)} /></td>
                    <td style={TD}><Sel value={r.resolved} onChange={(v) => uf(idx, 'resolved', v)} options={['Yes', 'No', 'Pending']} /></td>
                    <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.followUp} onChange={(v) => uf(idx, 'followUp', v)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '14px' }}>
          <Fld label="Biggest single barrier to growing sales with this IR">
            <Txt value={fBarrier} onChange={setFBarrier} rows={2} />
          </Fld>
        </div>
      </Sec>

      {/* ── G: Market Intelligence ── */}
      <Sec letter="G" title="Market Intelligence Gathered at This IR">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Fld label="Competitor offers seen at this IR (pricing, campaigns or promotions from motor factors or other suppliers)">
            <Txt value={g.competitorOffers} onChange={(v) => ug('competitorOffers', v)} rows={2} />
          </Fld>
          <Fld label="Other OEM brand activity at this IR (VW Group, Ford, Vauxhall promotions)">
            <Txt value={g.otherOEM} onChange={(v) => ug('otherOEM', v)} rows={2} />
          </Fld>
          <Fld label="The IR's local market observations (EV growth, fewer older BMWs, new competitor)">
            <Txt value={g.irObservations} onChange={(v) => ug('irObservations', v)} rows={2} />
          </Fld>
          <Fld label="Intelligence to pass on to the Dealer or BDC">
            <Txt value={g.nscIntel} onChange={(v) => ug('nscIntel', v)} rows={2} />
          </Fld>
          <Fld label="Competitor invoice / pricing collected?">
            <YesNo value={g.invoiceCollected} onChange={(v) => ug('invoiceCollected', v)} />
          </Fld>
        </div>
      </Sec>

      {/* ── H: Actions Agreed ── */}
      <Sec letter="H" title="Actions Agreed & Next Visit Planning">
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '30px' }}>#</th>
                <th style={TH}>Action required</th>
                <th style={{ ...TH, minWidth: '120px' }}>Responsible</th>
                <th style={{ ...TH, minWidth: '120px' }}>By when</th>
                <th style={{ ...TH, width: '60px', textAlign: 'center' }}>Done?</th>
              </tr>
            </thead>
            <tbody>
              {hRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', fontWeight: '700' }}>{r.num}</td>
                  <td style={{ ...TD, minWidth: '260px' }}><Inp value={r.action} onChange={(v) => uh(i, 'action', v)} /></td>
                  <td style={TD}><Sel value={r.responsible} onChange={(v) => uh(i, 'responsible', v)} options={['TPR', 'BDC', 'Dealer', 'IR']} /></td>
                  <td style={TD}><Inp type="date" value={r.byWhen} onChange={(v) => uh(i, 'byWhen', v)} /></td>
                  <td style={TD}><Sel value={r.done} onChange={(v) => uh(i, 'done', v)} options={['Yes', 'No']} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Grid2>
          <Fld label="Next visit date"><Inp type="date" value={h2.nextDate} onChange={(v) => uh2('nextDate', v)} /></Fld>
          <Fld label="Agreed visit time (use an assumptive close)"><Inp type="time" value={h2.nextTime} onChange={(v) => uh2('nextTime', v)} /></Fld>
        </Grid2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          <Fld label="Next visit objective 1"><Inp value={h2.obj1} onChange={(v) => uh2('obj1', v)} /></Fld>
          <Fld label="Next visit objective 2"><Inp value={h2.obj2} onChange={(v) => uh2('obj2', v)} /></Fld>
          <Fld label="Next visit objective 3"><Inp value={h2.obj3} onChange={(v) => uh2('obj3', v)} /></Fld>
        </div>
        <Grid2>
          <Fld label="Visit frequency adjustment?"><Sel value={h2.freqAdjust} onChange={(v) => uh2('freqAdjust', v)} options={['No change', 'Increase', 'Decrease']} /></Fld>
          <Fld label="Reason for frequency change (if applicable)"><Inp value={h2.freqReason} onChange={(v) => uh2('freqReason', v)} /></Fld>
        </Grid2>
        <Fld label="New IRs identified in the area? (10–20% of TPR time should be prospecting)">
          <Sel value={h2.newIRs} onChange={(v) => uh2('newIRs', v)} options={['Yes — added to CRM6 for follow-up', 'No new IRs identified']} />
        </Fld>
      </Sec>

      {/* ── I: Direct Sales Orders ── */}
      <Sec letter="I" title="Direct Sales Orders Placed During This Visit" subtitle="Every effort must be made to achieve a direct sale on every visit">
        <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '30px' }}>#</th>
                <th style={TH}>Part description / part number</th>
                <th style={{ ...TH, width: '60px' }}>Qty</th>
                <th style={{ ...TH, minWidth: '90px' }}>Unit price</th>
                <th style={{ ...TH, minWidth: '90px' }}>Total value</th>
                <th style={{ ...TH, minWidth: '100px' }}>Invoice no.</th>
              </tr>
            </thead>
            <tbody>
              {iRows.map((r, i) => {
                const total = rowTotal(r.qty, r.unitPrice);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                    <td style={{ ...TD, color: '#A0A0A0', fontWeight: '700' }}>{r.num}</td>
                    <td style={{ ...TD, minWidth: '220px' }}><Inp value={r.part} onChange={(v) => ui(i, 'part', v)} /></td>
                    <td style={TD}><Inp value={r.qty} onChange={(v) => ui(i, 'qty', v)} mode="int" style={{ width: '60px' }} /></td>
                    <td style={TD}><Inp value={r.unitPrice} onChange={(v) => ui(i, 'unitPrice', v)} placeholder="£" mode="currency" /></td>
                    <td style={{ ...TD, color: total ? '#FFFFFF' : '#555', fontWeight: total ? '600' : '400' }}>
                      {total ? `£${total}` : '—'}
                    </td>
                    <td style={TD}><Inp value={r.invoice} onChange={(v) => ui(i, 'invoice', v)} /></td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid #2A2A2A', background: 'rgba(161,0,255,0.04)' }}>
                <td colSpan={4} style={{ ...TD, fontWeight: '700', color: '#FFFFFF', textAlign: 'right', paddingRight: '12px' }}>
                  TOTAL ORDER VALUE THIS VISIT
                </td>
                <td style={{ ...TD, fontWeight: '700', color: '#A100FF', fontSize: '15px' }}>
                  {totalOrderValue > 0 ? `£${totalOrderValue.toFixed(2)}` : '—'}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <Fld label="Was a sale achieved this visit?">
          <Sel value={saleAchieved} onChange={setSaleAchieved} options={['Yes — order placed', 'Not today — follow up next visit', 'IR not in a position to order']} />
        </Fld>
      </Sec>

      {/* ── J: Sign-Off ── */}
      <Sec letter="J" title="Sign-Off & Declaration">
        <Grid2>
          <Fld label="Trade Parts Representative (name)"><Inp value={j.tprName} onChange={(v) => uj('tprName', v)} mode="alpha" /></Fld>
          <Fld label="Date"><Inp type="date" value={j.tprDate} onChange={(v) => uj('tprDate', v)} /></Fld>
          <Fld label="Form submitted to Dealer / BDC?" span={2}>
            <YesNo value={j.formSubmitted} onChange={(v) => uj('formSubmitted', v)} />
          </Fld>
        </Grid2>
        <div style={{ marginTop: '20px', padding: '12px 16px', background: '#141414', borderRadius: '8px', border: '1px solid #2A2A2A', fontSize: '11px', color: '#A0A0A0', textAlign: 'center' }}>
          CONFIDENTIAL — for authorised BwIR field representatives only. &nbsp; BMW &amp; MINI · BwIR Independent Repairer Visit Form v3.0
        </div>
      </Sec>

      <ActionBar />

      {/* ── Load a Saved Visit modal ── */}
      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '28px 32px', width: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Load a Saved Visit</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Account No. / Dealer Code</label>
              <input
                className="input-field"
                value={loadDealerCode}
                onChange={(e) => setLoadDealerCode(e.target.value)}
                placeholder={routeId || 'e.g. IR001'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Visit Date</label>
              <input
                type="date"
                className="input-field"
                value={loadVisitDate}
                onChange={(e) => setLoadVisitDate(e.target.value)}
              />
            </div>
            {loadError && <p style={{ margin: 0, fontSize: '12px', color: '#EF4444' }}>{loadError}</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowLoadModal(false); setLoadError(''); }} style={{ ...btnBase, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
              <button
                onClick={handleLoadVisit}
                disabled={isLoadingVisit || !loadDealerCode || !loadVisitDate}
                style={{ ...btnBase, background: '#A100FF', color: '#fff', opacity: (isLoadingVisit || !loadDealerCode || !loadVisitDate) ? 0.5 : 1, cursor: (isLoadingVisit || !loadDealerCode || !loadVisitDate) ? 'not-allowed' : 'pointer' }}
              >
                {isLoadingVisit ? 'Loading…' : 'Load Visit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
