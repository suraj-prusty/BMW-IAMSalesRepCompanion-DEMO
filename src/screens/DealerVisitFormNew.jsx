import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, Cloud, Mic, Sparkles, AlertTriangle, TrendingUp,
  Camera, Plus, Trash2, ExternalLink, CheckCircle, Users,
  Package, Truck, Wrench, Volume2, Tag, DollarSign, FileText, MoreHorizontal,
  Smile, Meh, Frown,
} from 'lucide-react';
import { api } from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
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
  { label: 'Stock',       Icon: Package        },
  { label: 'Delivery',    Icon: Truck          },
  { label: 'PL24',        Icon: Wrench         },
  { label: 'AOS',         Icon: Volume2        },
  { label: 'Marketing',   Icon: Tag            },
  { label: 'Competition', Icon: Users          },
  { label: 'Pricing',     Icon: DollarSign     },
  { label: 'Reporting',   Icon: FileText       },
  { label: 'Other',       Icon: MoreHorizontal },
];

const CHALLENGES = [
  'Stock Availability', 'Delivery Issues', 'PL24 Adoption',
  'AOS Compliance', 'Competitor Pressure', 'Pricing Concerns',
  'Training Needed', 'Other',
];
const OPPORTUNITIES = [
  'Increase PL24 Adoption', 'Expand Parts Range', 'AOS Upsell',
  'Fleet Conversion', 'Workshop Upgrade', 'Marketing Support', 'Other',
];
const OWNERS     = ['Dealer', 'Rep', 'Both'];
const PRIORITIES = ['High', 'Medium', 'Low'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const perfFromRV = (rv) => {
  if (rv == null) return { label: 'On Track', color: '#22C55E' };
  if (rv >= 85)   return { label: 'On Track', color: '#22C55E' };
  if (rv >= 70)   return { label: 'Monitor',  color: '#F59E0B' };
  return               { label: 'At Risk',  color: '#EF4444' };
};

const priorityColor = (p) =>
  p === 'High' ? '#EF4444' : p === 'Medium' ? '#F59E0B' : p === 'Low' ? '#22C55E' : 'var(--text-muted)';

const inputStyle = (hasValue) => ({
  padding: '8px 10px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: hasValue ? 'var(--text-primary)' : 'var(--text-muted)',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
});

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
function Radio({ value, displayLabel, selected, onChange }) {
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
      {displayLabel !== undefined ? displayLabel : value}
    </label>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════════════
// Props:
//   dealerId — URL param (dealer_code from the backend, used for all API calls)
//   dealer   — local CSV fallback (used only for lastVisitDate, openActionsCount, revenueVsTarget)
//   data     — local CSV dealer data (contacts, openActions, etc.)
export default function DealerVisitFormNew({ dealerId: dealerIdProp, dealer, data }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const dealerId = dealerIdProp || routeId;
  const isMobile = useIsMobile();
  const photoRef = useRef(null);

  // ── API: dealer lookup ────────────────────────────────────────────────────
  const [apiDealer,   setApiDealer]   = useState(null);
  const [apiLoading,  setApiLoading]  = useState(true);

  // ── Visit persistence (mirrors DealerVisitForm pattern) ──────────────────
  const [visitId,    setVisitId]    = useState(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saved' | 'submitted' | 'error'
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!dealerId) { setApiLoading(false); setVisitId(crypto.randomUUID()); return; }

    api.getDealerByCode(dealerId)
      .then((raw) => {
        setApiDealer(raw);
        const code = raw?.dealer_code || dealerId;
        // Try to load existing draft for this dealer
        return api.getDraftVisitCapture(code, 'dealer')
          .then((res) => {
            console.log('[DealerVisitFormNew] getDraftVisitCapture response:', res);
            const visit = res?.draft || res?.visit;
            console.log('[DealerVisitFormNew] visit:', visit, '| status:', visit?.status);
            if (visit && visit.status === 'draft') {
              // Restore draft — use saved visit_id so Save overwrites the same record
              setVisitId(visit.visit_id);
              const fd = visit.form_data || {};
              if (fd.topics_discussed?.length)  setTopics(fd.topics_discussed);
              if (fd.other_topic)                setOtherTopicText(fd.other_topic);
              if (fd.visit_notes)                setVisitNotes(fd.visit_notes);
              if (fd.voice_note_key)             setVoiceNoteKey(fd.voice_note_key);
              if (fd.biggest_challenge)          setChallenge(fd.biggest_challenge);
              if (fd.biggest_opportunity)        setOpportunity(fd.biggest_opportunity);
              if (fd.competitor_activity?.mode)      setCompetitorMode(fd.competitor_activity.mode);
              if (fd.competitor_activity?.comment)   setCompetitorComment(fd.competitor_activity.comment);
              if (fd.competitor_activity?.photo_url) setCompetitorPhotoUrl(fd.competitor_activity.photo_url);
              if (fd.competitor_activity?.photo_key) {
                setCompetitorPhotoKey(fd.competitor_activity.photo_key);
                api.getPhotoUrl(fd.competitor_activity.photo_key)
                  .then((presigned) => setCompetitorPhoto(presigned))
                  .catch((err) => console.error('[DealerVisitFormNew] getPhotoUrl failed:', err.message));
              }
              if (fd.actions_agreed?.length)     setActions(fd.actions_agreed);
              if (fd.overall_status)             setOverallStatus(fd.overall_status);
              setDraftLoaded(true);
              setSaveStatus('draft_restored');
            } else {
              // No draft or already submitted — fresh form
              setVisitId(crypto.randomUUID());
            }
          })
          .catch((err) => { console.error('[DealerVisitFormNew] getDraftVisitCapture error:', err); setVisitId(crypto.randomUUID()); });
      })
      .catch((err) => {
        console.error('[DealerVisitFormNew] getDealerByCode:', err);
        setVisitId(crypto.randomUUID());
      })
      .finally(() => setApiLoading(false));
  }, [dealerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolved display values — API is source of truth, local CSV is fallback ─
  const dealerName     = apiDealer?.dealer_name                          || dealer?.name        || '—';
  const dealerCode     = apiDealer?.dealer_code                          || dealer?.account_id  || '—';
  const dealerLocation = apiDealer?.kpis?.abc_segmentation?.country      || dealer?.location    || '—';

  // These fields are not in the API response — keep reading from local CSV
  const openActionsCount = data?.openActions?.length ?? 0;
  const perf = perfFromRV(dealer?.revenueVsTarget);
  const lastVisit = dealer?.lastVisitDate || dealer?.lastVisit || '—';

  // Primary contact from contacts CSV
  const contacts = data?.contacts || [];
  const primaryContact =
    contacts.find((c) => c.label === 'Parts Manager') ||
    contacts.find((c) => c.label === 'Dealer Principal') ||
    contacts[0];
  const contactDisplay = primaryContact
    ? `${primaryContact.value}${primaryContact.label ? ` (${primaryContact.label})` : ''}`
    : '—';

  const visitDateISO = new Date().toISOString().split('T')[0];
  const now = new Date();
  const visitDateTime =
    now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ', ' +
    now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── Form state ────────────────────────────────────────────────────────────
  const [topics,            setTopics]           = useState([]);
  const [otherTopicText,    setOtherTopicText]   = useState('');
  const [visitNotes,        setVisitNotes]        = useState('');
  const [challenge,         setChallenge]         = useState('');
  const [opportunity,       setOpportunity]       = useState('');
  const [competitorMode,    setCompetitorMode]    = useState('Not Observed');
  const [competitorPhoto,    setCompetitorPhoto]    = useState(null); // base64 or presigned URL for preview
  const [competitorPhotoUrl, setCompetitorPhotoUrl] = useState('');  // permanent S3 URL stored in DB
  const [competitorPhotoKey, setCompetitorPhotoKey] = useState('');  // S3 key used to regenerate presigned URL
  const [photoUploading,     setPhotoUploading]     = useState(false);
  const [showCommentInput,  setShowCommentInput]  = useState(false);
  const [competitorComment, setCompetitorComment] = useState('');
  const [actions,           setActions]           = useState([
    { action: '', owner: '', dueDate: '', priority: '' },
  ]);
  const [overallStatus, setOverallStatus] = useState('');
  const [voiceNoteKey,  setVoiceNoteKey]  = useState(''); // S3 key of stored audio

  // ── Voice recorder ────────────────────────────────────────────────────────
  const { isRecording, isTranscribing, error: voiceError, start: startRecording, stop: stopRecording } =
    useVoiceRecorder({
      visitId:        visitId,
      folder:         'dealer',
      onTranscript:   (text) => {
        setVisitNotes((prev) => (prev ? prev + ' ' + text : text).slice(0, 1000));
        setPreSummaryNotes(null); // new recording invalidates undo
      },
      onAudioStored:  (key)  => setVoiceNoteKey(key),
    });

  // ── AI Summarize + Undo (local only — not persisted) ─────────────────────
  const [preSummaryNotes, setPreSummaryNotes] = useState(null); // null = no summary applied
  const [isSummarizing,   setIsSummarizing]   = useState(false);
  const [summarizeError,  setSummarizeError]  = useState(null);

  const handleSummarize = async () => {
    if (!visitNotes.trim() || isSummarizing) return;
    setSummarizeError(null);
    setIsSummarizing(true);
    try {
      const summary = await api.generate({
        systemPrompt: 'You are a sales rep assistant. Summarise the dealer visit note in 3-5 concise bullet points. Preserve key facts, decisions, action items, and any specific numbers or names mentioned. Return plain text only, no markdown.',
        userPrompt: visitNotes,
        maxTokens: 300,
        temperature: 0.3,
      });
      setPreSummaryNotes(visitNotes);
      setVisitNotes(summary.slice(0, 1000));
    } catch (err) {
      setSummarizeError('Could not generate summary. Please try again.');
      console.error('[DealerVisitFormNew] summarize error:', err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRevertSummary = () => {
    if (preSummaryNotes !== null) {
      setVisitNotes(preSummaryNotes);
      setPreSummaryNotes(null);
    }
  };

  // ── PDF preview state ─────────────────────────────────────────────────────
  const pdfRef  = useRef(null);
  const [pdfZoom, setPdfZoom] = useState(75);
  const ZOOM_STEP = 10;
  const ZOOM_MIN  = 50;
  const ZOOM_MAX  = 150;

  const handleDownloadPdf = async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const { DealerVisitReportPdf } = await import('../components/DealerVisitReportPdf');
    const { createElement } = await import('react');

    const blob = await pdf(
      createElement(DealerVisitReportPdf, {
        dealerName,
        dealerCode,
        dealerLocation,
        contactDisplay,
        visitDateISO,
        topics: topicLabelsForSummary,
        visitNotes,
        competitorMode,
        competitorComment,
        competitorPhoto,
        challenge,
        opportunity,
        actions,
        overallStatus,
        userName: api.getUser()?.name || api.getUser()?.email?.split('@')[0] || '—',
      })
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BMW_Visit_Report_${dealerCode}_${visitDateISO}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!pdfRef.current) return;
    const content = pdfRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=860,height=1000');
    win.document.write(`<!DOCTYPE html>
<html><head><title>BMW Visit Report</title>
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

  // ── Payload builder (mirrors DealerVisitForm.buildPayload) ────────────────
  const buildPayload = (status) => ({
    form_type:    'dealer',
    status,
    visit_date:   visitDateISO,
    submitted_by: api.getUser()?.email || '',
    updated_at:   new Date().toISOString(),
    form_data: {
      dealer_name:        dealerName,
      dealer_code:        dealerCode,
      topics_discussed:   topics,
      other_topic:        otherTopicText,
      visit_notes:        visitNotes,
      voice_note_key:     voiceNoteKey || null,
      biggest_challenge:  challenge,
      biggest_opportunity: opportunity,
      competitor_activity: {
        mode:      competitorMode,
        comment:   competitorComment,
        has_photo: !!competitorPhotoUrl,
        photo_url: competitorPhotoUrl || null,
        photo_key: competitorPhotoKey || null,
      },
      actions_agreed:  actions.filter((a) => a.action),
      overall_status:  overallStatus,
      contact_met:     contactDisplay,
    },
  });

  // ── Save Draft ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!visitId) return;
    setIsSaving(true);
    setSaveStatus('');
    try {
      await api.saveVisitCapture(dealerCode, visitId, buildPayload('draft'));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit Visit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!visitId) return;
    setIsSaving(true);
    setSaveStatus('');
    try {
      await api.saveVisitCapture(dealerCode, visitId, buildPayload('submitted'));
      setSaveStatus('submitted');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleTopic  = (label) => setTopics((p) => p.includes(label) ? p.filter((x) => x !== label) : [...p, label]);
  const addAction    = () => setActions((p) => [...p, { action: '', owner: '', dueDate: '', priority: '' }]);
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
        const { url, key } = await api.uploadPhoto(base64, file.name, 'dealer');
        setCompetitorPhotoUrl(url);
        setCompetitorPhotoKey(key);
      } catch (err) {
        console.error('[DealerVisitFormNew] photo upload failed:', err.message);
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Topics labels for right panel — "Other" chip shows typed text if available
  const topicLabelsForSummary = topics.map((t) =>
    t === 'Other' && otherTopicText.trim() ? otherTopicText.trim() : t
  );

  // ── Shared styles ─────────────────────────────────────────────────────────
  const outlineBtn = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '7px 12px', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--surface-raised)',
    color: 'var(--text-primary)', fontSize: '12px', fontWeight: '500',
    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
  };

  const STATUS_OPTIONS = [
    { value: 'Good',          label: t('dealerVisitForm.status.good'),         Icon: Smile, color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
    { value: 'Monitor',       label: t('dealerVisitForm.status.monitor'),      Icon: Meh,   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { value: 'Needs Support', label: t('dealerVisitForm.status.needsSupport'), Icon: Frown, color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Page title row ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: isMobile ? '16px 16px 0' : '20px 24px 0',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {t('dealerVisitForm.title')}
          </h1>
          {/* Dealer / IR toggle */}
          <div style={{
            display: 'inline-flex', background: 'var(--surface-raised)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '2px', gap: '2px',
          }}>
            {[{ value: 'Dealer', label: t('dealerVisitForm.toggleDealer'), path: `/visit-capture/${dealerId}` }, { value: 'IR', label: t('dealerVisitForm.toggleIR'), path: `/ir-visit-capture/${dealerId}` }].map(({ value, label, path }) => (
              <button key={value} type="button" onClick={() => navigate(path)} style={{
                padding: '4px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.15s',
                background: value === 'Dealer' ? '#A100FF' : 'transparent',
                color: value === 'Dealer' ? '#fff' : 'var(--text-secondary)',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', ...(isMobile && { width: '100%' }) }}>
          {/* Save status feedback */}
          {saveStatus === 'draft_restored' && <span style={{ fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}><Cloud size={13} /> {t('dealerVisitForm.saveStatus.draftRestored')}</span>}
          {saveStatus === 'saved'          && <span style={{ fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px' }}><Cloud size={13} /> {t('dealerVisitForm.saveStatus.saved')}</span>}
          {saveStatus === 'submitted'      && <span style={{ fontSize: '12px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={13} /> {t('dealerVisitForm.saveStatus.submitted')}</span>}
          {saveStatus === 'error'          && <span style={{ fontSize: '12px', color: '#EF4444' }}>{t('dealerVisitForm.saveStatus.failed')}</span>}
          {!saveStatus && !isMobile  && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Cloud size={13} /> {t('dealerVisitForm.saveStatus.autoSaved')}</span>}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !visitId}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-primary)', fontSize: '12px', fontWeight: '500',
              cursor: isSaving || !visitId ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: isSaving || !visitId ? 0.6 : 1,
              ...(isMobile && { flex: 1 }),
            }}
          >
            {isSaving ? t('dealerVisitForm.saveStatus.saving') : t('dealerVisitForm.buttons.saveDraft')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !visitId}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: '#A100FF', color: '#fff', fontSize: '12px',
              fontWeight: '600',
              cursor: isSaving || !visitId ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: isSaving || !visitId ? 0.6 : 1,
              ...(isMobile && { flex: 1 }),
            }}
          >
            <CheckCircle size={14} /> {isSaving ? t('dealerVisitForm.saveStatus.saving') : t('dealerVisitForm.buttons.submitVisit')}
          </button>
        </div>
      </div>

      {/* ── Dealer info bar ───────────────────────────────────────────────── */}
      <div style={{
        margin: isMobile ? '12px 16px 0' : '14px 24px 0',
        padding: isMobile ? '12px 14px' : '13px 18px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
      }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
          background: 'var(--surface-raised)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={20} color="var(--text-secondary)" />
        </div>

        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {apiLoading ? t('dealerVisitForm.loading') : dealerName}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
            {dealerLocation}
          </div>
        </div>

        {!isMobile && (
          <div style={{ width: '1px', height: '34px', background: 'var(--border)', flexShrink: 0 }} />
        )}

        <div style={{ display: 'flex', gap: isMobile ? '16px' : '20px', flexWrap: 'wrap', flex: 1 }}>
          {[
            { label: t('dealerVisitForm.infoBar.dealerCode'),  value: apiLoading ? '—' : dealerCode },
            { label: t('dealerVisitForm.infoBar.lastVisit'),   value: lastVisit },
            { label: t('dealerVisitForm.infoBar.openActions'), value: openActionsCount, color: openActionsCount > 0 ? '#EF4444' : 'var(--text-primary)' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: stat.color || 'var(--text-primary)' }}>
                {stat.value}
              </div>
            </div>
          ))}

          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
              {t('dealerVisitForm.infoBar.performance')}
            </div>
            <span style={{
              fontSize: '11px', fontWeight: '600', color: perf.color,
              background: perf.color + '22', padding: '2px 9px', borderRadius: '12px',
            }}>
              {t(`dealerVisitForm.infoBar.perf${perf.label.replace(' ', '')}`)}
            </span>
          </div>
        </div>

        {/* View Dealer — uses dealerId which is the dealer_code used to reach this page */}
        {!isMobile && (
          <button type="button" onClick={() => navigate(`/dealer/${dealerId}`)} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--surface-raised)',
            color: 'var(--text-primary)', fontSize: '12px', fontWeight: '500',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: 'auto',
          }}>
            {t('dealerVisitForm.buttons.viewDealer')} <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 520px',
        gap: '14px',
        padding: isMobile ? '12px 16px 48px' : '14px 24px 48px',
        alignItems: 'stretch',
      }}>

        {/* ══ LEFT ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* 1 ─ Topics */}
          <SectionCard>
            <SectionHeader number="1" title={t('dealerVisitForm.sections.1.title')}
              subtitle={t('dealerVisitForm.sections.1.subtitle')} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {TOPICS.map(({ label, Icon }) => {
                const sel = topics.includes(label);
                return (
                  <button key={label} type="button" onClick={() => toggleTopic(label)} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 13px', borderRadius: '20px', fontSize: '12px',
                    fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit',
                    background: sel ? 'rgba(161,0,255,0.12)' : 'var(--surface-raised)',
                    border: `1.5px solid ${sel ? '#A100FF' : 'var(--border)'}`,
                    color: sel ? '#A100FF' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                    <Icon size={12} />
                    {t(`dealerVisitForm.topics.${label.toLowerCase()}`)}
                    {sel && (
                      <span style={{
                        width: '13px', height: '13px', borderRadius: '50%',
                        background: '#A100FF', display: 'inline-flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '8px', color: '#fff', flexShrink: 0,
                      }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Free-text when "Other" is selected */}
            {topics.includes('Other') && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={otherTopicText}
                  onChange={(e) => setOtherTopicText(e.target.value)}
                  placeholder={t('dealerVisitForm.placeholders.otherTopic')}
                  style={{ ...inputStyle(!!otherTopicText), fontSize: '13px', padding: '9px 12px' }}
                />
              </div>
            )}
          </SectionCard>

          {/* 2 ─ Visit Notes */}
          <SectionCard>
            <SectionHeader number="2" title={t('dealerVisitForm.sections.2.title')}
              subtitle={t('dealerVisitForm.sections.2.subtitle')} />
            <textarea
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value.slice(0, 1000))}
              placeholder={t('dealerVisitForm.placeholders.visitNotes')}
              rows={5}
              style={{
                width: '100%', resize: 'vertical', padding: '11px 12px',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: '1.55',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '7px', gap: '7px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{visitNotes.length} / 1000</span>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {preSummaryNotes !== null && (
                  <button
                    type="button"
                    onClick={handleRevertSummary}
                    style={{ ...outlineBtn, color: '#F59E0B', border: '1px solid #F59E0B' }}
                  >
                    {t('dealerVisitForm.buttons.revertSummary')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing || isSummarizing}
                  style={{
                    ...outlineBtn,
                    border: isRecording ? '1px solid #EF4444' : outlineBtn.border,
                    color: isRecording ? '#EF4444' : outlineBtn.color,
                    opacity: (isTranscribing || isSummarizing) ? 0.6 : 1,
                    cursor: (isTranscribing || isSummarizing) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Mic size={12} />
                  {isRecording ? t('dealerVisitForm.buttons.stopRecording') : isTranscribing ? t('dealerVisitForm.buttons.transcribing') : t('dealerVisitForm.buttons.recordVoice')}
                </button>
                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={!visitNotes.trim() || isSummarizing || isRecording || isTranscribing}
                  title={t('dealerVisitForm.buttons.summarize')}
                  style={{
                    padding: '7px 9px', borderRadius: '8px',
                    border: '1px solid rgba(161,0,255,0.3)', background: 'rgba(161,0,255,0.07)',
                    color: '#A100FF',
                    cursor: (!visitNotes.trim() || isSummarizing || isRecording || isTranscribing) ? 'not-allowed' : 'pointer',
                    opacity: (!visitNotes.trim() || isSummarizing || isRecording || isTranscribing) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    fontFamily: 'inherit', fontSize: '12px', fontWeight: '500',
                  }}
                >
                  <Sparkles size={14} />
                  {isSummarizing ? t('dealerVisitForm.buttons.summarizing') : ''}
                </button>
              </div>
            </div>
            {voiceError && (
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#EF4444' }}>{voiceError}</p>
            )}
            {summarizeError && (
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#EF4444' }}>{summarizeError}</p>
            )}
          </SectionCard>

          {/* 3 + 4 + 5 ─ one row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px' }}>

            {/* 3 ─ Biggest Challenge */}
            <SectionCard>
              <SectionHeader number="3" title={t('dealerVisitForm.sections.3.title')} subtitle={t('dealerVisitForm.sections.3.subtitle')} />
              <div style={{ position: 'relative' }}>
                <AlertTriangle size={13} color="#F59E0B" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select value={challenge} onChange={(e) => setChallenge(e.target.value)}
                  style={{ ...inputStyle(!!challenge), paddingLeft: '28px', cursor: 'pointer' }}>
                  <option value="">{t('dealerVisitForm.placeholders.selectChallenge')}</option>
                  {CHALLENGES.map((c) => <option key={c} value={c}>{t(`dealerVisitForm.challenges.${c.toLowerCase().replace(/\s+/g, '_')}`)}</option>)}
                </select>
              </div>
            </SectionCard>

            {/* 4 ─ Biggest Opportunity */}
            <SectionCard>
              <SectionHeader number="4" title={t('dealerVisitForm.sections.4.title')} subtitle={t('dealerVisitForm.sections.4.subtitle')} />
              <div style={{ position: 'relative' }}>
                <TrendingUp size={13} color="#22C55E" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <select value={opportunity} onChange={(e) => setOpportunity(e.target.value)}
                  style={{ ...inputStyle(!!opportunity), paddingLeft: '28px', cursor: 'pointer' }}>
                  <option value="">{t('dealerVisitForm.placeholders.selectOpportunity')}</option>
                  {OPPORTUNITIES.map((o) => <option key={o} value={o}>{t(`dealerVisitForm.opportunities.${o.toLowerCase().replace(/\s+/g, '_')}`)}</option>)}
                </select>
              </div>
            </SectionCard>

            {/* 5 ─ Competitor Activity */}
            <SectionCard>
              <SectionHeader number="5" title={t('dealerVisitForm.sections.5.title')} subtitle={t('dealerVisitForm.sections.5.subtitle')} />
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <Radio value="Not Observed" displayLabel={t('dealerVisitForm.competitor.notObserved')} selected={competitorMode === 'Not Observed'} onChange={setCompetitorMode} />
                <Radio value="Observed"     displayLabel={t('dealerVisitForm.competitor.observed')}     selected={competitorMode === 'Observed'}     onChange={setCompetitorMode} />
              </div>
              {competitorMode === 'Observed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {competitorPhoto ? (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={competitorPhoto} alt="Competitor" style={{
                          width: '72px', height: '50px', objectFit: 'cover',
                          borderRadius: '6px', border: '1px solid var(--border)', display: 'block',
                          opacity: photoUploading ? 0.5 : 1,
                        }} />
                        {photoUploading && (
                          <span style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '9px', color: 'var(--text-primary)',
                          }}>{t('dealerVisitForm.buttons.uploading')}</span>
                        )}
                        {!photoUploading && (
                          <button type="button" onClick={() => { setCompetitorPhoto(null); setCompetitorPhotoUrl(''); setCompetitorPhotoKey(''); }} style={{
                            position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px',
                            borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff',
                            fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>×</button>
                        )}
                      </div>
                    ) : (
                      <button type="button" onClick={() => photoRef.current?.click()} style={{ ...outlineBtn }}>
                        <Camera size={12} /> {t('dealerVisitForm.buttons.uploadPhoto')}
                      </button>
                    )}
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                    <button type="button" onClick={() => setShowCommentInput((v) => !v)} style={{ ...outlineBtn }}>
                      {showCommentInput ? t('dealerVisitForm.buttons.hideComment') : t('dealerVisitForm.buttons.addComment')}
                    </button>
                  </div>
                  {showCommentInput && (
                    <input type="text" value={competitorComment}
                      onChange={(e) => setCompetitorComment(e.target.value)}
                      placeholder={t('dealerVisitForm.placeholders.competitorActivity')}
                      style={{ ...inputStyle(!!competitorComment) }} />
                  )}
                  {!showCommentInput && competitorComment && (
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{competitorComment}"
                    </p>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          {/* 6 ─ Actions Agreed */}
          <SectionCard>
            <SectionHeader number="6" title={t('dealerVisitForm.sections.6.title')} subtitle={t('dealerVisitForm.sections.6.subtitle')} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 90px 32px' : '1fr 100px 120px 100px 32px',
              gap: '8px', marginBottom: '6px', padding: '0 2px',
            }}>
              {(isMobile
                ? [t('dealerVisitForm.actionsTable.colAction'), t('dealerVisitForm.actionsTable.colOwner'), '']
                : [t('dealerVisitForm.actionsTable.colAction'), t('dealerVisitForm.actionsTable.colOwner'), t('dealerVisitForm.actionsTable.colDueDate'), t('dealerVisitForm.actionsTable.colPriority'), '']
              ).map((h, i) => (
                <span key={i} style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {actions.map((row, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 90px 32px' : '1fr 100px 120px 100px 32px',
                gap: '8px', marginBottom: '7px', alignItems: 'center',
              }}>
                <input type="text" value={row.action} onChange={(e) => updateAction(idx, 'action', e.target.value)} placeholder={t('dealerVisitForm.placeholders.enterAction')} style={inputStyle(!!row.action)} />
                <select value={row.owner} onChange={(e) => updateAction(idx, 'owner', e.target.value)} style={{ ...inputStyle(!!row.owner), cursor: 'pointer' }}>
                  <option value="">{t('dealerVisitForm.actionsTable.ownerDefault')}</option>
                  {OWNERS.map((o) => <option key={o} value={o}>{t(`dealerVisitForm.owners.${o.toLowerCase()}`)}</option>)}
                </select>
                {!isMobile && (
                  <>
                    <input type="date" value={row.dueDate} onChange={(e) => updateAction(idx, 'dueDate', e.target.value)} style={inputStyle(!!row.dueDate)} />
                    <select value={row.priority} onChange={(e) => updateAction(idx, 'priority', e.target.value)} style={{ ...inputStyle(!!row.priority), color: priorityColor(row.priority), cursor: 'pointer' }}>
                      <option value="">{t('dealerVisitForm.actionsTable.priorityDefault')}</option>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{t(`dealerVisitForm.priorities.${p.toLowerCase()}`)}</option>)}
                    </select>
                  </>
                )}
                <button type="button" onClick={() => removeAction(idx)} disabled={actions.length === 1} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#EF4444', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: actions.length === 1 ? 0.25 : 1,
                }}><Trash2 size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={addAction} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', color: '#A100FF',
              fontSize: '12px', fontWeight: '500', cursor: 'pointer',
              fontFamily: 'inherit', padding: '4px 0', marginTop: '2px',
            }}>
              <Plus size={13} /> {t('dealerVisitForm.buttons.addAnotherAction')}
            </button>
          </SectionCard>

          {/* 7 ─ Overall Visit Status */}
          <SectionCard>
            <SectionHeader number="7" title={t('dealerVisitForm.sections.7.title')} subtitle={t('dealerVisitForm.sections.7.subtitle')} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {STATUS_OPTIONS.map(({ value, label, Icon: StatusIcon, color, bg }) => (
                <button key={value} type="button"
                  onClick={() => setOverallStatus(overallStatus === value ? '' : value)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    border: `1.5px solid ${overallStatus === value ? color : 'var(--border)'}`,
                    background: overallStatus === value ? bg : 'var(--surface-raised)',
                    color: overallStatus === value ? color : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                  <StatusIcon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ══ RIGHT: PDF Preview Panel ══════════════════════════════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          position: isMobile ? 'static' : 'sticky', top: '16px',
          alignSelf: 'stretch',
          height: isMobile ? 'auto' : 'calc(100vh - 110px)',
          border: '1px solid var(--border)', borderRadius: '10px',
          overflow: 'hidden',
        }}>

          {/* Panel header with tabs */}
          <div style={{ background: 'var(--surface)', padding: '12px 14px 0', flexShrink: 0 }}>
            <h2 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {t('dealerVisitForm.pdfPanel.title')}
            </h2>
            <p style={{ margin: '0 0 8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              {t('dealerVisitForm.pdfPanel.subtitle')}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', gap: '2px' }}>
              {/* Preview tab — always active */}
              <button type="button" style={{
                padding: '5px 10px', border: 'none', background: 'none',
                borderBottom: '2px solid #A100FF', color: '#A100FF',
                fontSize: '11px', fontWeight: '600', cursor: 'default',
                fontFamily: 'inherit', marginBottom: '-1px',
              }}>{t('dealerVisitForm.pdfPanel.preview')}</button>

              {/* Download PDF */}
              <button type="button" onClick={handleDownloadPdf} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', border: 'none', background: 'none',
                borderBottom: '2px solid transparent', color: 'var(--text-secondary)',
                fontSize: '11px', fontWeight: '400', cursor: 'pointer',
                fontFamily: 'inherit', marginBottom: '-1px',
              }}>{t('dealerVisitForm.pdfPanel.downloadPdf')}</button>

              {/* Print */}
              <button type="button" onClick={handlePrint} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', border: 'none', background: 'none',
                borderBottom: '2px solid transparent', color: 'var(--text-secondary)',
                fontSize: '11px', fontWeight: '400', cursor: 'pointer',
                fontFamily: 'inherit', marginBottom: '-1px',
              }}>{t('dealerVisitForm.pdfPanel.print')}</button>
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
                    ['Dealer Name',     dealerName],
                    ['Visit Type',      'Sales Call'],
                    ['Customer Code',   dealerCode],
                    ['Visit Date',      new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })],
                    ['Dealer Category', dealerLocation !== '—' ? dealerLocation : 'A - Highest'],
                    ['Visit Time',      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
                    ['IAM Status',      'Registered & Active'],
                    ['Contact Met',     contactDisplay],
                    ['Servicing Dealer', dealerName],
                    ['Representative',  api.getUser()?.name || api.getUser()?.email?.split('@')[0] || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', gap: '5px' }}>
                      <span style={{ color: '#777', flexShrink: 0, minWidth: '90px' }}>{label}</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. TOPICS DISCUSSED */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  2. Topics Discussed
                </div>
                <span style={{ color: '#333' }}>
                  {topicLabelsForSummary.length ? topicLabelsForSummary.join('  ·  ') : '—'}
                </span>
              </div>

              {/* 3. VISIT NOTES */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Visit Notes
                </div>
                <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>{visitNotes || '—'}</p>
              </div>

              {/* 4. COMPETITOR ACTIVITY */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  4. Competitor Activity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: competitorMode === 'Observed' ? '8px' : '0' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '5px', fontWeight: '600', fontSize: '9px',
                    background: competitorMode === 'Observed' ? '#fee2e2' : '#dcfce7',
                    color: competitorMode === 'Observed' ? '#dc2626' : '#16a34a',
                  }}>{competitorMode}</span>
                  {competitorMode === 'Observed' && competitorComment && (
                    <span style={{ color: '#555' }}>— {competitorComment}</span>
                  )}
                </div>
                {competitorMode === 'Observed' && competitorPhoto && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '8px', color: '#777', marginBottom: '3px' }}>Evidence Photo</div>
                    <img src={competitorPhoto} alt="Competitor evidence" style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                )}
              </div>

              {/* 5 + 6 — Challenge & Opportunity side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* 5. BIGGEST CHALLENGE */}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#fff0f0', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #EF4444', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#c0392b' }}>
                    5. Biggest Challenge
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#EF4444', fontSize: '10px' }}>⚠</span>
                    <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{challenge || '—'}</span>
                  </div>
                </div>

                {/* 6. BIGGEST OPPORTUNITY */}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '9px', background: '#f0fff4', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #22C55E', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#166534' }}>
                    6. Biggest Opportunity
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#22C55E', fontSize: '10px' }}>↗</span>
                    <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{opportunity || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 7. ACTIONS AGREED */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '700', fontSize: '9px', background: '#f5f5f5', padding: '4px 7px', marginBottom: '8px', borderLeft: '3px solid #1c69d4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  7. Actions Agreed
                </div>
                {actions.filter((a) => a.action).length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: '16px' }}>
                    {actions.filter((a) => a.action).map((a, i) => (
                      <li key={i} style={{ marginBottom: '5px', color: '#333' }}>
                        {a.action}
                        {a.owner && <span style={{ color: '#777' }}> – {a.owner}</span>}
                        {a.dueDate && (
                          <span style={{ color: '#777' }}>
                            {' – '}{new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
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
                  padding: '5px 12px', borderRadius: '6px',
                  background: overallStatus === 'Good' ? '#dcfce7'
                    : overallStatus === 'Monitor' ? '#fef9c3'
                    : overallStatus === 'Needs Support' ? '#fee2e2'
                    : '#f5f5f5',
                  color: overallStatus === 'Good' ? '#16a34a'
                    : overallStatus === 'Monitor' ? '#d97706'
                    : overallStatus === 'Needs Support' ? '#dc2626'
                    : '#999',
                  fontWeight: '700', fontSize: '10px',
                }}>
                  {overallStatus || 'Not set'}
                </div>
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
