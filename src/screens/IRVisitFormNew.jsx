import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, TrendingUp, Camera, Plus, Trash2,
  ExternalLink, Users, Package, Truck, Wrench, Volume2, Tag,
  DollarSign, FileText, MoreHorizontal, Gift, Headphones, Shield,
  ToggleLeft, ToggleRight, Mic,
} from 'lucide-react';
import { api } from '../services/api';
import bmwLogo from '../assets/bmw-logo.svg';

// ── Responsive hook ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

// ── Topic definitions ─────────────────────────────────────────────────────────
const TOPICS = [
  { label: 'Pricing',           Icon: DollarSign     },
  { label: 'Stock Availability',Icon: Package        },
  { label: 'PL24',              Icon: Wrench         },
  { label: 'Delivery',          Icon: Truck          },
  { label: 'Rewards Program',   Icon: Gift           },
  { label: 'Technical Support', Icon: Headphones     },
  { label: 'Competition',       Icon: Users          },
  { label: 'Marketing',         Icon: Tag            },
  { label: 'Warranty',          Icon: Shield         },
  { label: 'Other',             Icon: MoreHorizontal },
];

const BUYING_BEHAVIOURS = [
  'Regular & Growing',
  'Captive Parts Only',
  'Buying Competitive Parts Elsewhere',
  'Inconsistent / Seasonal',
];

const COMPETITORS    = ['LKQ', 'Bosch', 'Autodoc', 'Inter-Team', 'Other'];
const CATEGORIES_LOST = ['Brake Parts', 'Filters', 'Engine Oil', 'Tyres', 'Electrical', 'Other'];
const PRIORITIES     = ['High', 'Medium', 'Low'];
const RESPONSIBLE    = ['Rep', 'Dealer', 'Both'];
const ACTION_STATUSES = ['Open', 'In Progress', 'Closed'];

const VISIT_OUTCOMES = [
  { label: 'Order Generated',      color: '#22C55E', bg: 'rgba(34,197,94,0.1)'   },
  { label: 'Opportunity Identified',color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { label: 'No Progress',           color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
];

const priorityColor = (p) =>
  p === 'High' ? '#EF4444' : p === 'Medium' ? '#F59E0B' : p === 'Low' ? '#22C55E' : 'var(--text-muted)';

const inputStyle = {
  padding: '7px 10px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '16px 18px', ...style,
    }}>
      {children}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ number, title, subtitle }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#A100FF' }}>{number}.</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {subtitle && (
        <p style={{ margin: '2px 0 0 17px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────
function SummaryRow({ label, labelColor, children }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        fontSize: '10px', fontWeight: '600',
        color: labelColor || 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Radio ─────────────────────────────────────────────────────────────────────
function Radio({ value, selected, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
      fontSize: '12px', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    }}>
      <div onClick={() => onChange(value)} style={{
        width: '15px', height: '15px', borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${selected ? '#A100FF' : 'var(--border)'}`,
        background: selected ? '#A100FF' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}
      </div>
      {value}
    </label>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function IRVisitFormNew({ irId: irIdProp }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const irId = irIdProp || routeId;
  const isMobile = useIsMobile();
  const photoRef = useRef(null);
  const pdfRef   = useRef(null);
  const [pdfZoom, setPdfZoom] = useState(75);
  const ZOOM_STEP = 10;
  const ZOOM_MIN  = 50;
  const ZOOM_MAX  = 150;

  // ── API: IR lookup ────────────────────────────────────────────────────────
  const [apiIR,      setApiIR]      = useState(null);
  const [apiLoading, setApiLoading] = useState(true);

  // ── Visit persistence ─────────────────────────────────────────────────────
  const [visitId,    setVisitId]    = useState(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!irId) { setApiLoading(false); setVisitId(crypto.randomUUID()); return; }

    api.getDealerByCode(irId)
      .then((raw) => {
        setApiIR(raw);
        const code = raw?.dealer_code || irId;
        return api.getDraftVisitCapture(code, 'ir')
          .then((res) => {
            const visit = res?.draft || res?.visit;
            if (visit && visit.status === 'draft') {
              setVisitId(visit.visit_id);
              const fd = visit.form_data || {};
              if (fd.topics_discussed?.length)       setTopics(fd.topics_discussed);
              if (fd.other_topic)                    setOtherTopicText(fd.other_topic);
              if (fd.visit_notes)                    setVisitNotes(fd.visit_notes);
              if (fd.contact_met)                    setContactMet(fd.contact_met);
              if (fd.visit_type)                     setVisitType(fd.visit_type);
              if (fd.buying_behaviour)               setBuyingBehaviour(fd.buying_behaviour);
              if (fd.competitor_insight?.mode)        setCompetitorMode(fd.competitor_insight.mode);
              if (fd.competitor_insight?.competitor)  setCompetitor(fd.competitor_insight.competitor);
              if (fd.competitor_insight?.category_lost) setCategoryLost(fd.competitor_insight.category_lost);
              if (fd.competitor_insight?.reason)      setCompetitorReason(fd.competitor_insight.reason);
              if (fd.competitor_insight?.photo_url)   setCompetitorPhotoUrl(fd.competitor_insight.photo_url);
              if (fd.competitor_insight?.photo_key) {
                setCompetitorPhotoKey(fd.competitor_insight.photo_key);
                api.getPhotoUrl(fd.competitor_insight.photo_key)
                  .then((presigned) => setCompetitorPhoto(presigned))
                  .catch((err) => console.error('[IRVisitFormNew] getPhotoUrl failed:', err.message));
              }
              if (fd.direct_sale?.sale_achieved != null) setSaleAchieved(fd.direct_sale.sale_achieved);
              if (fd.direct_sale?.products?.length)  setSaleRows(fd.direct_sale.products);
              if (fd.actions_agreed?.length)          setActions(fd.actions_agreed);
              if (fd.visit_outcome)                  setVisitOutcome(fd.visit_outcome);
              if (fd.new_irs_identified)             setNewIRsIdentified(fd.new_irs_identified);
              setSaveStatus('draft_restored');
            } else {
              setVisitId(crypto.randomUUID());
            }
          })
          .catch(() => setVisitId(crypto.randomUUID()));
      })
      .catch((err) => { console.error('[IRVisitFormNew] getDealerByCode:', err); setVisitId(crypto.randomUUID()); })
      .finally(() => setApiLoading(false));
  }, [irId]); // eslint-disable-line react-hooks/exhaustive-deps

  const irName     = apiIR?.dealer_name                     || '—';
  const irCode     = apiIR?.dealer_code                     || '—';
  const irLocation = apiIR?.kpis?.abc_segmentation?.country || '—';

  const visitDateISO = new Date().toISOString().split('T')[0];
  const now = new Date();
  const visitDateTime =
    now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ', ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── Form state ────────────────────────────────────────────────────────────
  const [topics,           setTopics]          = useState([]);
  const [otherTopicText,   setOtherTopicText]  = useState('');
  const [visitNotes,       setVisitNotes]      = useState('');
  const [contactMet,       setContactMet]      = useState('');
  const [visitType,        setVisitType]       = useState('Sales Call');

  // Section 3 — Buying Behaviour
  const [buyingBehaviour, setBuyingBehaviour] = useState('');

  // Section 4 — Competitor / Lost Business
  const [competitorMode,    setCompetitorMode]    = useState('Not Observed');
  const [competitor,        setCompetitor]        = useState('');
  const [categoryLost,      setCategoryLost]      = useState('');
  const [competitorReason,  setCompetitorReason]  = useState('');
  const [competitorPhoto,    setCompetitorPhoto]    = useState(null); // base64 or presigned URL for preview
  const [competitorPhotoUrl, setCompetitorPhotoUrl] = useState('');  // permanent S3 URL stored in DB
  const [competitorPhotoKey, setCompetitorPhotoKey] = useState('');  // S3 key used to regenerate presigned URL
  const [photoUploading,     setPhotoUploading]     = useState(false);

  // Section 5 — Direct Sale
  const [saleAchieved, setSaleAchieved] = useState(false);
  const [saleRows, setSaleRows] = useState([
    { product: '', qty: '', unitPrice: '', totalValue: '', invoiceRef: '' },
  ]);

  // Section 6 — Actions
  const [actions, setActions] = useState([
    { action: '', responsible: '', dueDate: '', priority: '', status: 'Open' },
  ]);

  // Section 7 — Visit Outcome
  const [visitOutcome,      setVisitOutcome]      = useState('');
  const [newIRsIdentified,  setNewIRsIdentified]  = useState('No');

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleTopic = (label) =>
    setTopics((p) => p.includes(label) ? p.filter((x) => x !== label) : [...p, label]);

  const addSaleRow = () => setSaleRows((p) => [...p, { product: '', qty: '', unitPrice: '', totalValue: '', invoiceRef: '' }]);
  const updateSaleRow = (i, f, v) => {
    setSaleRows((p) => p.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, [f]: v };
      if (f === 'qty' || f === 'unitPrice') {
        const q = parseFloat(f === 'qty' ? v : updated.qty) || 0;
        const u = parseFloat(f === 'unitPrice' ? v : updated.unitPrice) || 0;
        updated.totalValue = (q * u).toFixed(2);
      }
      return updated;
    }));
  };
  const removeSaleRow = (i) => setSaleRows((p) => p.filter((_, idx) => idx !== i));

  const totalOrderValue = saleRows.reduce((sum, r) => sum + (parseFloat(r.totalValue) || 0), 0);

  const addAction    = () => setActions((p) => [...p, { action: '', responsible: '', dueDate: '', priority: '', status: 'Open' }]);
  const updateAction = (i, f, v) => setActions((p) => p.map((a, idx) => idx === i ? { ...a, [f]: v } : a));
  const removeAction = (i) => setActions((p) => p.filter((_, idx) => idx !== i));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setCompetitorPhoto(base64);
      setPhotoUploading(true);
      try {
        const { url, key } = await api.uploadPhoto(base64, file.name, 'ir');
        setCompetitorPhotoUrl(url);
        setCompetitorPhotoKey(key);
      } catch (err) {
        console.error('[IRVisitFormNew] photo upload failed:', err.message);
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const topicLabelsForSummary = topics.map((t) =>
    t === 'Other' && otherTopicText.trim() ? otherTopicText.trim() : t
  );

  // ── Payload ───────────────────────────────────────────────────────────────
  const buildPayload = (status) => ({
    form_type:    'ir',
    status,
    visit_date:   visitDateISO,
    submitted_by: api.getUser()?.email || '',
    updated_at:   new Date().toISOString(),
    form_data: {
      ir_name:            irName,
      ir_code:            irCode,
      visit_type:         visitType,
      contact_met:        contactMet,
      topics_discussed:   topics,
      other_topic:        otherTopicText,
      visit_notes:        visitNotes,
      buying_behaviour:   buyingBehaviour,
      competitor_insight: {
        mode:          competitorMode,
        competitor,
        category_lost: categoryLost,
        reason:        competitorReason,
        has_photo:     !!competitorPhotoUrl,
        photo_url:     competitorPhotoUrl || null,
        photo_key:     competitorPhotoKey || null,
      },
      direct_sale: {
        sale_achieved:    saleAchieved,
        total_order_value: totalOrderValue,
        products:         saleRows.filter((r) => r.product),
      },
      actions_agreed: actions.filter((a) => a.action),
      visit_outcome:       visitOutcome,
      new_irs_identified:  newIRsIdentified,
    },
  });

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: [12, 12],
        filename: `BMW_IR_Visit_Report_${irCode}_${visitDateISO}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(pdfRef.current)
      .save();
  };

  const handlePrint = () => {
    if (!pdfRef.current) return;
    const content = pdfRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=860,height=1000');
    win.document.write(`<!DOCTYPE html>
<html><head><title>BMW IR Visit Report</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; font-size: 10px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  @media print { body { margin: 0; } }
</style>
</head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const handleSave = async () => {
    if (!visitId) return;
    setIsSaving(true); setSaveStatus('');
    try { await api.saveVisitCapture(irCode, visitId, buildPayload('draft')); setSaveStatus('saved'); }
    catch { setSaveStatus('error'); }
    finally { setIsSaving(false); }
  };

  const handleSubmit = async () => {
    if (!visitId) return;
    setIsSaving(true); setSaveStatus('');
    try { await api.saveVisitCapture(irCode, visitId, buildPayload('submitted')); setSaveStatus('submitted'); }
    catch { setSaveStatus('error'); }
    finally { setIsSaving(false); }
  };

  // ── Shared button styles ──────────────────────────────────────────────────
  const outlineBtn = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '500',
    cursor: 'pointer', fontFamily: 'inherit', background: 'transparent',
    border: '1px solid var(--border)', color: 'var(--text-secondary)', transition: 'all 0.15s',
  };

  if (apiLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: isMobile ? '12px 16px' : '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            IR Visit Capture
          </div>
          {/* Dealer / IR toggle */}
          <div style={{
            display: 'inline-flex', background: 'var(--surface-raised)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '2px', gap: '2px',
          }}>
            {[{ label: 'Dealer', path: `/visit-capture/${irId}` }, { label: 'IR', path: `/ir-visit-capture/${irId}` }].map(({ label, path }) => (
              <button key={label} type="button" onClick={() => navigate(path)} style={{
                padding: '4px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.15s',
                background: label === 'IR' ? '#A100FF' : 'transparent',
                color: label === 'IR' ? '#fff' : 'var(--text-secondary)',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', ...(isMobile && { width: '100%' }) }}>
          {saveStatus === 'draft_restored' && <span style={{ fontSize: '11px', color: '#F59E0B' }}>Draft restored</span>}
          {saveStatus === 'saved'          && <span style={{ fontSize: '11px', color: '#22C55E' }}>✓ Saved</span>}
          {saveStatus === 'submitted'      && <span style={{ fontSize: '11px', color: '#22C55E' }}>✓ Submitted</span>}
          {saveStatus === 'error'          && <span style={{ fontSize: '11px', color: '#EF4444' }}>Save failed</span>}
          <button onClick={handleSave} disabled={isSaving} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'inherit',
            background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
            ...(isMobile && { flex: 1 }),
          }}>
            Save Draft
          </button>
          <button onClick={handleSubmit} disabled={isSaving} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'inherit',
            background: '#A100FF', border: 'none', color: '#fff',
            ...(isMobile && { flex: 1 }),
          }}>
            Submit Visit
          </button>
        </div>
      </div>

      {/* ── Dealer info bar ───────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: isMobile ? '10px 16px' : '10px 24px',
        display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'var(--surface-raised)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FileText size={16} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{irName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{irLocation}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: isMobile ? '12px' : '20px', flexWrap: 'wrap', flex: 1 }}>
          {[
            { label: 'Customer Code', value: irCode },
            { label: 'IR Category',   value: apiIR?.kpis?.ir_category || '—' },
            { label: 'IAM Status',    value: apiIR?.kpis?.iam_status  || '—' },
            { label: 'Servicing Dealer', value: apiIR?.kpis?.servicing_dealer || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '1px' }}>{value}</div>
            </div>
          ))}
        </div>

        {!isMobile && (
          <button
            onClick={() => navigate(`/dealer/${irId}`)}
            style={{ ...outlineBtn, border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: '12px', padding: '7px 12px' }}
          >
            View IR Profile <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 520px',
        gap: '14px',
        padding: isMobile ? '12px 16px 48px' : '14px 24px 48px',
        alignItems: 'stretch',
      }}>

        {/* ══ LEFT column ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>

          {/* 1 ─ Sales Conversation Topics */}
          <SectionCard>
            <SectionHeader number="1" title="Sales Conversation Topics" subtitle="Select all topics discussed during this visit." />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {TOPICS.map(({ label, Icon }) => {
                const sel = topics.includes(label);
                return (
                  <button key={label} type="button" onClick={() => toggleTopic(label)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    border: `1.5px solid ${sel ? '#A100FF' : 'var(--border)'}`,
                    background: sel ? 'rgba(161,0,255,0.08)' : 'var(--surface-raised)',
                    color: sel ? '#A100FF' : 'var(--text-secondary)',
                  }}>
                    <Icon size={12} />
                    {label}
                    {sel && <span style={{ marginLeft: '2px', fontSize: '10px', color: '#A100FF' }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {topics.includes('Other') && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text" value={otherTopicText} onChange={(e) => setOtherTopicText(e.target.value)}
                  placeholder="Describe the other topic discussed..."
                  style={{ ...inputStyle, fontSize: '12px' }}
                />
              </div>
            )}
          </SectionCard>

          {/* 2 ─ Visit Notes */}
          <SectionCard>
            <SectionHeader number="2" title="Visit Notes" subtitle="Add key notes or use voice capture." />
            <div style={{ position: 'relative' }}>
              <textarea
                value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Type your visit notes here…"
                style={{
                  ...inputStyle, minHeight: '110px', resize: 'vertical',
                  paddingBottom: '40px', lineHeight: 1.5,
                }}
              />
              <div style={{
                position: 'absolute', bottom: '8px', left: '8px', right: '8px',
                display: 'flex', gap: '6px',
              }}>
                <button type="button" style={outlineBtn}><Mic size={12} /> Record Voice Note</button>
                <button type="button" style={{ ...outlineBtn, color: '#A100FF', borderColor: '#A100FF' }}>
                  <Sparkles size={12} /> AI Assist
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Contact Met */}
          <SectionCard>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Contact Met</div>
            <input type="text" value={contactMet} onChange={(e) => setContactMet(e.target.value)}
              placeholder="e.g. David Brown (Owner)" style={inputStyle} />
          </SectionCard>

          {/* 3 + 4 ─ Buying Behaviour + Competitor row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>

            {/* 3 ─ Buying Behaviour */}
            <SectionCard>
              <SectionHeader number="3" title="Buying Behaviour" subtitle="What best describes the IR's current buying pattern?" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {BUYING_BEHAVIOURS.map((opt) => (
                  <Radio key={opt} value={opt} selected={buyingBehaviour === opt} onChange={setBuyingBehaviour} />
                ))}
              </div>
            </SectionCard>

            {/* 4 ─ Competitor / Lost Business Insight */}
            <SectionCard>
              <SectionHeader number="4" title="Competitor / Lost Business Insight" subtitle="Any competitor activity or business lost?" />
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                {['Not Observed', 'Observed'].map((opt) => (
                  <Radio key={opt} value={opt} selected={competitorMode === opt} onChange={setCompetitorMode} />
                ))}
              </div>
              {competitorMode === 'Observed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Competitor</div>
                      <select value={competitor} onChange={(e) => setCompetitor(e.target.value)} style={{ ...inputStyle }}>
                        <option value="">Select…</option>
                        {COMPETITORS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Category Lost</div>
                      <select value={categoryLost} onChange={(e) => setCategoryLost(e.target.value)} style={{ ...inputStyle }}>
                        <option value="">Select…</option>
                        {CATEGORIES_LOST.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Reason</div>
                    <input type="text" value={competitorReason} onChange={(e) => setCompetitorReason(e.target.value)}
                      placeholder="e.g. 20% discount on brake parts" style={{ ...inputStyle }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                    {competitorPhoto ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={competitorPhoto} alt="Evidence" style={{
                          width: '72px', height: '52px', objectFit: 'cover',
                          borderRadius: '6px', border: '1px solid var(--border)',
                          opacity: photoUploading ? 0.5 : 1,
                        }} />
                        {photoUploading && (
                          <span style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '9px', color: 'var(--text-primary)',
                          }}>Uploading…</span>
                        )}
                        {!photoUploading && (
                          <button type="button" onClick={() => { setCompetitorPhoto(null); setCompetitorPhotoUrl(''); setCompetitorPhotoKey(''); }} style={{
                            position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px',
                            borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff',
                            fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>×</button>
                        )}
                      </div>
                    ) : null}
                    <button type="button" onClick={() => photoRef.current?.click()} style={outlineBtn} disabled={photoUploading}>
                      <Camera size={12} /> {photoUploading ? 'Uploading…' : competitorPhoto ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* 5 ─ Direct Sale Generated */}
          <SectionCard>
            {/* Card header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: saleAchieved ? '#22C55E' : '#A100FF' }}>5.</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: saleAchieved ? '#22C55E' : 'var(--text-primary)' }}>Direct Sale Generated from This Visit</span>
                </div>
                <p style={{ margin: '2px 0 0 17px', fontSize: '11px', color: 'var(--text-secondary)' }}>Record all parts ordered during or as a result of this visit.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sale Achieved?</span>
                <button type="button" onClick={() => setSaleAchieved((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
                  {saleAchieved ? <ToggleRight size={28} color="#22C55E" /> : <ToggleLeft size={28} color="var(--text-muted)" />}
                </button>
                <span style={{ fontSize: '12px', fontWeight: '600', color: saleAchieved ? '#22C55E' : 'var(--text-muted)' }}>
                  {saleAchieved ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Table + Total side by side (stacked on mobile) */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
              {/* Table */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 52px 76px 28px' : '2fr 52px 76px 76px 96px 28px', gap: '5px', marginBottom: '5px', padding: '0 2px' }}>
                  {(isMobile ? ['Product / Part Description', 'Qty', 'Total Value', ''] : ['Product / Part Description', 'Qty', 'Unit Price', 'Total Value', 'Invoice / Ref No.', '']).map((h) => (
                    <div key={h} style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>

                {saleRows.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 52px 76px 28px' : '2fr 52px 76px 76px 96px 28px', gap: '5px', marginBottom: '5px', alignItems: 'center' }}>
                    <input value={row.product}   onChange={(e) => updateSaleRow(i, 'product',   e.target.value)} placeholder="e.g. Brake Pads" style={inputStyle} />
                    <input value={row.qty}       onChange={(e) => updateSaleRow(i, 'qty',       e.target.value)} placeholder="0" type="number" min="0" style={inputStyle} />
                    {!isMobile && <input value={row.unitPrice} onChange={(e) => updateSaleRow(i, 'unitPrice', e.target.value)} placeholder="€0.00" type="number" min="0" style={inputStyle} />}
                    <input value={row.totalValue} readOnly placeholder="€0.00" style={{ ...inputStyle, background: 'var(--surface-raised)', color: 'var(--text-secondary)' }} />
                    {!isMobile && <input value={row.invoiceRef} onChange={(e) => updateSaleRow(i, 'invoiceRef', e.target.value)} placeholder="INV-" style={inputStyle} />}
                    <button type="button" onClick={() => removeSaleRow(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button type="button" onClick={addSaleRow} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: 'none', color: '#A100FF',
                  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                  fontFamily: 'inherit', padding: '4px 0', marginTop: '2px',
                }}>
                  <Plus size={13} /> Add Product
                </button>
              </div>

              {/* Total Order Value box — right on desktop, below table on mobile */}
              {saleAchieved && (
                <div style={{
                  width: isMobile ? '100%' : '148px', flexShrink: 0, padding: '12px 14px', borderRadius: '8px',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Total Order Value</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#22C55E', marginBottom: '8px' }}>
                    €{totalOrderValue.toFixed(0)}
                  </div>
                  {totalOrderValue > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: '600', color: '#22C55E',
                      background: 'rgba(34,197,94,0.15)', padding: '4px 8px', borderRadius: '20px',
                    }}>
                      ✓ Direct Sale Achieved
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* 6 ─ Actions & Next Visit Planning */}
          <SectionCard>
            <SectionHeader number="6" title="Actions & Next Visit Planning" subtitle="List actions and plan the next visit." />

            {/* Actions table */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 100px 32px' : '1fr 110px 130px 110px 120px 32px',
              gap: '6px', marginBottom: '6px', padding: '0 2px',
            }}>
              {(isMobile ? ['Action Required', 'Responsible', ''] : ['Action Required', 'Responsible', 'Due Date', 'Priority', 'Status', '']).map((h) => (
                <div key={h} style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {actions.map((a, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 100px 32px' : '1fr 110px 130px 110px 120px 32px',
                gap: '6px', marginBottom: '6px', alignItems: 'center',
              }}>
                <input value={a.action} onChange={(e) => updateAction(i, 'action', e.target.value)}
                  placeholder="Describe the action…" style={inputStyle} />
                <select value={a.responsible} onChange={(e) => updateAction(i, 'responsible', e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {RESPONSIBLE.map((r) => <option key={r}>{r}</option>)}
                </select>
                {!isMobile && (
                  <>
                    <input type="date" value={a.dueDate} onChange={(e) => updateAction(i, 'dueDate', e.target.value)} style={inputStyle} />
                    <select value={a.priority} onChange={(e) => updateAction(i, 'priority', e.target.value)}
                      style={{ ...inputStyle, color: a.priority ? priorityColor(a.priority) : 'var(--text-muted)' }}>
                      <option value="">—</option>
                      {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <select value={a.status} onChange={(e) => updateAction(i, 'status', e.target.value)} style={inputStyle}>
                      {ACTION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </>
                )}
                <button type="button" onClick={() => removeAction(i)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            <button type="button" onClick={addAction} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', color: '#A100FF',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0', marginTop: '2px',
            }}>
              <Plus size={13} /> Add Another Action
            </button>

          </SectionCard>

          {/* 7 ─ Visit Outcome */}
          <SectionCard>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
              7. Visit Outcome
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              What was the outcome of this visit?
            </p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {VISIT_OUTCOMES.map((opt) => (
                <button key={opt.label} type="button"
                  onClick={() => setVisitOutcome(visitOutcome === opt.label ? '' : opt.label)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: '8px',
                    fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'center',
                    border: `1.5px solid ${visitOutcome === opt.label ? opt.color : 'var(--border)'}`,
                    background: visitOutcome === opt.label ? opt.bg : 'var(--surface-raised)',
                    color: visitOutcome === opt.label ? opt.color : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>New IRs identified in area?</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Radio value="No"                    selected={newIRsIdentified === 'No'}                    onChange={setNewIRsIdentified} />
              <Radio value="Yes — added to CRM"    selected={newIRsIdentified === 'Yes — added to CRM'}    onChange={setNewIRsIdentified} />
            </div>
          </SectionCard>
        </div>

        {/* ══ RIGHT: PDF Preview Panel ════════════════════════════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          position: isMobile ? 'static' : 'sticky', top: '16px',
          alignSelf: 'stretch',
          height: isMobile ? '600px' : 'calc(100vh - 110px)',
          border: '1px solid var(--border)', borderRadius: '10px',
          overflow: 'hidden',
        }}>
            {/* Panel header with tabs */}
            <div style={{ background: 'var(--surface)', padding: '12px 14px 0', flexShrink: 0 }}>
              <h2 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Visit Report (PDF Preview)
              </h2>
              <p style={{ margin: '0 0 8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                This is how your visit report will look.
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', gap: '2px' }}>
                <button type="button" style={{
                  padding: '5px 10px', border: 'none', background: 'none',
                  borderBottom: '2px solid #A100FF', color: '#A100FF',
                  fontSize: '11px', fontWeight: '600', cursor: 'default',
                  fontFamily: 'inherit', marginBottom: '-1px',
                }}>Preview</button>
                <button type="button" onClick={handleDownloadPdf} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px', border: 'none', background: 'none',
                  borderBottom: '2px solid transparent', color: 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: '400', cursor: 'pointer',
                  fontFamily: 'inherit', marginBottom: '-1px',
                }}>↓ Download PDF</button>
                <button type="button" onClick={handlePrint} style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px', border: 'none', background: 'none',
                  borderBottom: '2px solid transparent', color: 'var(--text-secondary)',
                  fontSize: '11px', fontWeight: '400', cursor: 'pointer',
                  fontFamily: 'inherit', marginBottom: '-1px',
                }}>⎙ Print</button>
              </div>
            </div>

            {/* Zoom toolbar */}
            <div style={{
              background: 'var(--surface-raised)', borderBottom: '1px solid var(--border)', fontSize: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              padding: '4px 10px', gap: '4px', flexShrink: 0,
            }}>
              <button type="button"
                onClick={() => setPdfZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                disabled={pdfZoom <= ZOOM_MIN}
                style={{ background: 'none', border: 'none', color: pdfZoom <= ZOOM_MIN ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: pdfZoom <= ZOOM_MIN ? 'not-allowed' : 'pointer', padding: '1px 6px', fontSize: '15px', lineHeight: 1 }}>
                −
              </button>
              <span style={{ minWidth: '34px', textAlign: 'center', color: 'var(--text-secondary)' }}>{pdfZoom}%</span>
              <button type="button"
                onClick={() => setPdfZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                disabled={pdfZoom >= ZOOM_MAX}
                style={{ background: 'none', border: 'none', color: pdfZoom >= ZOOM_MAX ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: pdfZoom >= ZOOM_MAX ? 'not-allowed' : 'pointer', padding: '1px 6px', fontSize: '15px', lineHeight: 1 }}>
                +
              </button>
            </div>

            {/* PDF scroll area */}
            <div style={{ background: '#f4f4f6', overflow: 'auto', flex: 1, padding: '16px' }}>
              <div ref={pdfRef} style={{
                background: '#f4f4f6', width: '100%',
                padding: '22px 24px', fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9.5px', color: '#1a1a1a', lineHeight: '1.6',
                zoom: `${pdfZoom}%`,
              }}>

                {/* BMW letterhead */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #1a1a1a' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.04em' }}>BMW &amp; MINI</div>
                    <div style={{ fontSize: '8px', color: '#555', marginTop: '2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>IAM Independent Repairer Visit Report</div>
                  </div>
                  <img src={bmwLogo} alt="BMW" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                </div>

                {/* 1. VISIT INFORMATION */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Visit Information
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }}>
                    {[
                      ['IR Name',          irName],
                      ['Visit Type',       visitType],
                      ['Customer Code',    irCode],
                      ['Visit Date',       new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
                      ['IR Category',      apiIR?.kpis?.ir_category || '—'],
                      ['Visit Time',       new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
                      ['IAM Status',       apiIR?.kpis?.iam_status || 'Registered & Active'],
                      ['Contact Met',      contactMet || '—'],
                      ['Servicing Dealer', apiIR?.kpis?.servicing_dealer || '—'],
                      ['Representative',   api.getUser()?.name || api.getUser()?.email?.split('@')[0] || '—'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', gap: '5px' }}>
                        <span style={{ color: '#777', flexShrink: 0, minWidth: '90px' }}>{label}</span>
                        <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. SALES CONVERSATION TOPICS */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Sales Conversation Topics
                  </div>
                  {topicLabelsForSummary.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {topicLabelsForSummary.map((t, i) => (
                        <span key={i} style={{
                          fontSize: '8px', padding: '2px 8px', borderRadius: '10px',
                          background: '#eef2ff', color: '#3b46a0', fontWeight: '600',
                          border: '1px solid #c7d2fe',
                        }}>{t}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>No topics selected</span>
                  )}
                </div>

                {/* 3. VISIT NOTES */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3. Visit Notes
                  </div>
                  <p style={{ margin: 0, color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{visitNotes || '—'}</p>
                </div>

                {/* 4. BUYING BEHAVIOUR */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    4. Buying Behaviour
                  </div>
                  <span style={{ color: '#333', fontWeight: buyingBehaviour ? '600' : '400', fontStyle: buyingBehaviour ? 'normal' : 'italic' }}>
                    {buyingBehaviour || 'Not recorded'}
                  </span>
                </div>

                {/* 5. COMPETITOR / LOST BUSINESS INSIGHT */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    5. Competitor / Lost Business Insight
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: competitorMode === 'Observed' ? '8px' : '0' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 9px', borderRadius: '5px', fontWeight: '600', fontSize: '8.5px',
                      background: competitorMode === 'Observed' ? '#fee2e2' : '#dcfce7',
                      color: competitorMode === 'Observed' ? '#dc2626' : '#16a34a',
                    }}>{competitorMode}</span>
                  </div>
                  {competitorMode === 'Observed' && (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', marginBottom: '6px' }}>
                        <thead>
                          <tr>
                            <th style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600', textAlign: 'left' }}>Competitor</th>
                            <th style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600', textAlign: 'left' }}>Category Lost</th>
                            <th style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600', textAlign: 'left' }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{competitor || '—'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{categoryLost || '—'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{competitorReason || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                      {competitorPhoto && (
                        <div style={{ marginTop: '4px' }}>
                          <div style={{ fontSize: '8px', color: '#777', marginBottom: '3px' }}>Evidence Photo</div>
                          <img src={competitorPhoto} alt="Competitor evidence" style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 6. DIRECT SALE GENERATED */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    6. Direct Sale Generated
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ color: '#777', fontSize: '8.5px' }}>Sale Achieved:</span>
                    <span style={{
                      display: 'inline-block', padding: '2px 9px', borderRadius: '5px', fontWeight: '600', fontSize: '8.5px',
                      background: saleAchieved ? '#dcfce7' : '#f5f5f5',
                      color: saleAchieved ? '#16a34a' : '#999',
                    }}>{saleAchieved ? 'Yes' : 'No'}</span>
                  </div>
                  {saleRows.filter((r) => r.product).length > 0 ? (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', marginBottom: '6px' }}>
                        <thead>
                          <tr>
                            {['Product / Part Description', 'Qty', 'Unit Price', 'Total Value', 'Invoice / Ref No.'].map((h) => (
                              <th key={h} style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600', textAlign: 'left' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {saleRows.filter((r) => r.product).map((r, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{r.product}</td>
                              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>{r.qty}</td>
                              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>€{parseFloat(r.unitPrice || 0).toFixed(2)}</td>
                              <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>€{parseFloat(r.totalValue || 0).toFixed(2)}</td>
                              <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{r.invoiceRef}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '9.5px', color: '#1c69d4', borderTop: '2px solid #1c69d4', paddingTop: '4px' }}>
                        TOTAL ORDER VALUE &nbsp;&nbsp; €{totalOrderValue.toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>No products recorded</span>
                  )}
                </div>

                {/* 7. ACTIONS AGREED */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    7. Actions & Next Visit Planning
                  </div>
                  {actions.filter((a) => a.action).length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
                      <thead>
                        <tr>
                          {['#', 'Action Required', 'Responsible', 'Due Date', 'Priority', 'Status'].map((h) => (
                            <th key={h} style={{ background: '#f0f0f0', border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600', textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {actions.filter((a) => a.action).map((a, i) => (
                          <tr key={i}>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px', color: '#777' }}>{i + 1}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{a.action}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{a.responsible || '—'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>
                              {a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{
                              border: '1px solid #ccc', padding: '4px 6px', fontWeight: '600',
                              color: a.priority === 'High' ? '#dc2626' : a.priority === 'Medium' ? '#d97706' : a.priority === 'Low' ? '#16a34a' : '#999',
                            }}>{a.priority || '—'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '4px 6px', color: '#555' }}>{a.status || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>No actions agreed</span>
                  )}
                </div>

                {/* 8. VISIT OUTCOME */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    8. Visit Outcome
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '6px', marginBottom: '8px',
                    background: visitOutcome === 'Order Generated' ? '#dcfce7'
                      : visitOutcome === 'Opportunity Identified' ? '#fef9c3'
                      : visitOutcome === 'No Progress' ? '#fee2e2'
                      : '#f5f5f5',
                    color: visitOutcome === 'Order Generated' ? '#16a34a'
                      : visitOutcome === 'Opportunity Identified' ? '#d97706'
                      : visitOutcome === 'No Progress' ? '#dc2626'
                      : '#999',
                    fontWeight: '700', fontSize: '9px',
                  }}>
                    {visitOutcome || 'Not set'}
                  </div>
                  <div style={{ fontSize: '8px', color: '#777', marginBottom: '3px' }}>New IRs Identified in Area</div>
                  <div style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '9px' }}>{newIRsIdentified}</div>
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555' }}>
                      Prepared by: <strong>{api.getUser()?.name || api.getUser()?.email?.split('@')[0] || '—'}</strong>
                    </span>
                    <span style={{ color: '#555' }}>
                      Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: '7.5px', marginTop: '8px', fontStyle: 'italic' }}>
                    CONFIDENTIAL – For authorised BMW &amp; MINI field representatives only.
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
