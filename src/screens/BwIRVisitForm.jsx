import { useState } from 'react';

// ── Input primitives ──────────────────────────────────────────

const baseInput = {
  background: '#141414',
  border: '1px solid #2A2A2A',
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: '12px',
  padding: '7px 10px',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

function Inp({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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
  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px', borderBottom: '1px solid #1E1E1E', paddingBottom: '12px' }}>
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#A100FF' }}>{letter}.</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
        {subtitle && <span style={{ fontSize: '11px', color: '#A0A0A0', textTransform: 'none', letterSpacing: 0 }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children, style = {} }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: '12px', ...style }}>
      {children}
    </div>
  );
}

function Grid3({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px', marginBottom: '12px' }}>
      {children}
    </div>
  );
}

function Grid4({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
      {children}
    </div>
  );
}

function Fld({ label, children, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && (
        <div style={{ fontSize: '11px', color: '#A0A0A0', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
      )}
      {children}
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

// ── Section C KPIs ────────────────────────────────────────────

const C_KPIS = [
  'Total BwIR genuine parts revenue',
  'Revenue growth vs last year',
  'IAM turnover mix % of total Dealer TO',
  'Service & wear parts revenue',
  'Captive parts revenue',
  'No. of active IR ordering customers',
  'No. of new IRs recruited this month',
  'No. of IRs in database (total)',
  'PL24 online orders — volume',
  'Online ordering TO as % of BwIR TO (target 10%+)',
  'No. of outbound contact centre calls / week',
  'No. of marketing campaigns run YTD',
  'Lost sales & IR reporting gaps',
];

const D_TOOLS = [
  'BwIR Portal (admin capability)',
  'PL24 — Dealer setup',
  'AOS — promoted to IRs (Principle 7.2)',
  'DMS reporting to NSC',
  'SLA — signed with IRs',
  'BMW parts warranty',
  'Rewards / bonus scheme',
  'Accessories consignment at IRs',
  'POS material at IRs',
];

const E_METRICS = [
  'Quality of NSC target setting',
  'NSC marketing materials & campaigns',
  'BDC coaching quality',
  'BwIR programme tools (Portal, PL24, AOS)',
  'NSC reporting requirements',
  'Overall BwIR programme satisfaction',
];

const F_OBJECTIONS = [
  'The BwIR targets set by the NSC are unrealistic / too high',
  'The programme requires too much administrative effort / reporting burden',
  'We do not have enough staff dedicated to BwIRs',
  'Return on investment from the BwIR programme is unclear',
  'We cannot achieve the required stock levels within budget',
  'Delivery infrastructure cost is too high to meet the service levels',
  'The NSC marketing materials / campaigns are not relevant to our market',
  'PL24 / AOS adoption by IRs is too slow — the tools are not compelling enough',
  'IRs are resistant to signing SLAs',
  'We are losing IRs to competitor dealers or motor factors',
  'The BDC coaching is not frequent enough / not practical enough',
  'Other (specify in the response column)',
];

const initCRows = () => C_KPIS.map((kpi) => ({ kpi, target: '', actual: '', variance: '', status: '', comments: '' }));
const initDRows = () => D_TOOLS.map((tool) => ({ tool, status: '', demonstrated: '', pct: '', notes: '' }));
const initERows = () => E_METRICS.map((metric) => ({ metric, rating: '', comments: '' }));
const initFRows = () => F_OBJECTIONS.map((objection) => ({ objection, raised: false, response: '', resolved: '', followUp: '' }));
const initHRows = () => Array.from({ length: 6 }, (_, i) => ({ num: i + 1, action: '', responsible: '', byWhen: '', done: false }));
const initIRows = () => Array.from({ length: 5 }, () => ({ ir: '', route: '', value: '', status: '', issues: '' }));

// ── Component ─────────────────────────────────────────────────

export default function BwIRVisitForm({ dealer }) {
  const d = dealer || { name: '', id: '', city: '' };

  // Section A
  const [a, setA] = useState({
    visitPurpose: '', auditType: '', dealerName: d.name, dealerCode: d.id,
    visitDate: '', startTime: '', endTime: '',
    tprName: '', bdcName: '', dealerLocation: d.city || '', operatingLevel: '',
    contactMet: '', contactRole: '',
  });
  const ua = (k, v) => setA((p) => ({ ...p, [k]: v }));

  // Section B
  const [b, setB] = useState({
    managerInPlace: '', externalReps: '', internalSpecialists: '', contactCentre: '',
    stockPct: '', minRequired: '8.3%', extRequired: '12.5%', focusParts: '',
    deliveryVans: '', fteDrivers: '', deliveryOwnership: '',
    irA: '', irB: '', irC: '', irTotal: '',
    dmsSystem: '', nscReporting: '', annualTargetAgreed: '',
    toTarget: '', toGrowth: '', iamMix: '', irTarget: '',
    marketingPlanStatus: '',
  });
  const ub = (k, v) => setB((p) => ({ ...p, [k]: v }));

  // Section C
  const [cRows, setCRows] = useState(initCRows());
  const uc = (i, k, v) => setCRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [c2, setC2] = useState({ achieved: '', actual: '', target2: '', variance: '', keyDriver: '' });
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
  const [g, setG] = useState({
    competitorDealer: '', motorFactor: '', lostSales: '',
    localTrends: '', nscIntel: '', invoiceCollected: '',
  });
  const ug = (k, v) => setG((p) => ({ ...p, [k]: v }));

  // Section H
  const [hRows, setHRows] = useState(initHRows());
  const uh = (i, k, v) => setHRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [h2, setH2] = useState({ nextDate: '', nextTime: '', obj1: '', obj2: '', obj3: '', coaching: '' });
  const uh2 = (k, v) => setH2((p) => ({ ...p, [k]: v }));

  // Section I
  const [iRows, setIRows] = useState(initIRows());
  const ui = (i, k, v) => setIRows((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const [iTotal, setITotal] = useState('');
  const [iIssues, setIIssues] = useState('');

  // Section J
  const [j, setJ] = useState({
    tprName: '', tprDate: '', dealerContact: '', dealerDate: '',
    formSubmitted: '', sectionKIncluded: '',
  });
  const uj = (k, v) => setJ((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── A: Visit Identification ── */}
      <Sec letter="A" title="Visit Identification & Context">
        <Grid2>
          <Fld label="Visit Purpose">
            <Inp value={a.visitPurpose} onChange={(v) => ua('visitPurpose', v)} placeholder="e.g. Routine, Audit, Review…" />
          </Fld>
          <Fld label="Audit / Assessment Type">
            <Inp value={a.auditType} onChange={(v) => ua('auditType', v)} />
          </Fld>
          <Fld label="Dealer / Business Name">
            <Inp value={a.dealerName} onChange={(v) => ua('dealerName', v)} />
          </Fld>
          <Fld label="Dealer Code / Account No.">
            <Inp value={a.dealerCode} onChange={(v) => ua('dealerCode', v)} />
          </Fld>
          <Fld label="Visit Date">
            <Inp type="date" value={a.visitDate} onChange={(v) => ua('visitDate', v)} />
          </Fld>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Fld label="Start Time"><Inp type="time" value={a.startTime} onChange={(v) => ua('startTime', v)} /></Fld>
            <Fld label="End Time"><Inp type="time" value={a.endTime} onChange={(v) => ua('endTime', v)} /></Fld>
          </div>
          <Fld label="Representative (TPR) Name">
            <Inp value={a.tprName} onChange={(v) => ua('tprName', v)} />
          </Fld>
          <Fld label="BDC / Coach Name">
            <Inp value={a.bdcName} onChange={(v) => ua('bdcName', v)} />
          </Fld>
          <Fld label="Dealer Location">
            <Inp value={a.dealerLocation} onChange={(v) => ua('dealerLocation', v)} />
          </Fld>
          <Fld label="Operating Standards Level">
            <Inp value={a.operatingLevel} onChange={(v) => ua('operatingLevel', v)} />
          </Fld>
          <Fld label="Dealer Contact Met (name & job title)">
            <Inp value={a.contactMet} onChange={(v) => ua('contactMet', v)} />
          </Fld>
          <Fld label="Role">
            <Inp value={a.contactRole} onChange={(v) => ua('contactRole', v)} />
          </Fld>
        </Grid2>
      </Sec>

      {/* ── B: Dealer Business Profile ── */}
      <Sec letter="B" title="Dealer Business Profile" subtitle="confirm / update each visit">
        <Grid3>
          <div>
            <SubHeading>BwIR Team (Principle 1)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="BwIRs Manager in place?"><YesNo value={b.managerInPlace} onChange={(v) => ub('managerInPlace', v)} /></Fld>
              <Fld label="External sales reps (dedicated)"><Inp value={b.externalReps} onChange={(v) => ub('externalReps', v)} /></Fld>
              <Fld label="Internal BwIRs specialists"><Inp value={b.internalSpecialists} onChange={(v) => ub('internalSpecialists', v)} /></Fld>
              <Fld label="Contact Centre in place?"><YesNo value={b.contactCentre} onChange={(v) => ub('contactCentre', v)} /></Fld>
            </div>
          </div>
          <div>
            <SubHeading>Stock (Principle 2)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="Current stock % of annual target"><Inp value={b.stockPct} onChange={(v) => ub('stockPct', v)} placeholder="%" /></Fld>
              <Fld label="Minimum required (Core)"><Inp value={b.minRequired} onChange={(v) => ub('minRequired', v)} /></Fld>
              <Fld label="Extended required (Mandatory)"><Inp value={b.extRequired} onChange={(v) => ub('extRequired', v)} /></Fld>
              <Fld label="Focus Parts Basket PN coverage"><Inp value={b.focusParts} onChange={(v) => ub('focusParts', v)} /></Fld>
            </div>
          </div>
          <div>
            <SubHeading>Delivery (Principle 3)</SubHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Fld label="Number of delivery vans"><Inp value={b.deliveryVans} onChange={(v) => ub('deliveryVans', v)} /></Fld>
              <Fld label="Number of FTE drivers"><Inp value={b.fteDrivers} onChange={(v) => ub('fteDrivers', v)} /></Fld>
              <Fld label="Delivery owned or outsourced?">
                <Sel value={b.deliveryOwnership} onChange={(v) => ub('deliveryOwnership', v)} options={['Owned', 'Outsourced', 'Hybrid']} />
              </Fld>
            </div>
          </div>
        </Grid3>

        <PurpleBorder>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF', marginBottom: '10px' }}>Total no. of IRs in database</div>
          <Grid4>
            <Fld label="A IRs"><Inp value={b.irA} onChange={(v) => ub('irA', v)} /></Fld>
            <Fld label="B IRs"><Inp value={b.irB} onChange={(v) => ub('irB', v)} /></Fld>
            <Fld label="C IRs"><Inp value={b.irC} onChange={(v) => ub('irC', v)} /></Fld>
            <Fld label="A+B+C Total"><Inp value={b.irTotal} onChange={(v) => ub('irTotal', v)} /></Fld>
          </Grid4>
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
          <Grid4>
            <Fld label="TO target"><Inp value={b.toTarget} onChange={(v) => ub('toTarget', v)} /></Fld>
            <Fld label="TO growth target"><Inp value={b.toGrowth} onChange={(v) => ub('toGrowth', v)} /></Fld>
            <Fld label="IAM mix target"><Inp value={b.iamMix} onChange={(v) => ub('iamMix', v)} /></Fld>
            <Fld label="No. of IRs target"><Inp value={b.irTarget} onChange={(v) => ub('irTarget', v)} /></Fld>
          </Grid4>
        </PurpleBorder>

        <Fld label="Marketing plan status (Principle 5.3 — agreed by end of January)">
          <Inp value={b.marketingPlanStatus} onChange={(v) => ub('marketingPlanStatus', v)} />
        </Fld>
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
                  <td style={{ ...TD, minWidth: '90px' }}><Inp value={r.target} onChange={(v) => uc(i, 'target', v)} /></td>
                  <td style={{ ...TD, minWidth: '90px' }}><Inp value={r.actual} onChange={(v) => uc(i, 'actual', v)} /></td>
                  <td style={{ ...TD, minWidth: '90px' }}><Inp value={r.variance} onChange={(v) => uc(i, 'variance', v)} /></td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <Sel value={r.status} onChange={(v) => uc(i, 'status', v)} options={['On track', 'At risk', 'Behind', 'Exceeded']} />
                  </td>
                  <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.comments} onChange={(v) => uc(i, 'comments', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PurpleBorder>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px' }}>
            Visit 2 — month-end review{' '}
            <span style={{ color: '#A0A0A0', fontWeight: '400' }}>(complete on the second visit of the month)</span>
          </div>
          <Grid2>
            <Fld label="Were month-end targets achieved?"><YesNo value={c2.achieved} onChange={(v) => uc2('achieved', v)} /></Fld>
            <div />
          </Grid2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <Fld label="Final month revenue — Actual"><Inp value={c2.actual} onChange={(v) => uc2('actual', v)} /></Fld>
            <Fld label="Target"><Inp value={c2.target2} onChange={(v) => uc2('target2', v)} /></Fld>
            <Fld label="Variance"><Inp value={c2.variance} onChange={(v) => uc2('variance', v)} /></Fld>
          </div>
          <Fld label="Key driver of performance this month">
            <Txt value={c2.keyDriver} onChange={(v) => uc2('keyDriver', v)} rows={2} />
          </Fld>
        </PurpleBorder>
      </Sec>

      {/* ── D: Programme Tools ── */}
      <Sec letter="D" title="Programme Tools & Dealer Adoption">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['Tool / Programme', 'Dealer status', 'Demonstrated?', '% of IRs reached', 'Notes / actions'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '220px' }}>{r.tool}</td>
                  <td style={{ ...TD, minWidth: '120px' }}>
                    <Sel value={r.status} onChange={(v) => ud(i, 'status', v)} options={['Active', 'Inactive', 'Partial', 'Not set up']} />
                  </td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <YesNo value={r.demonstrated} onChange={(v) => ud(i, 'demonstrated', v)} />
                  </td>
                  <td style={{ ...TD, minWidth: '100px' }}>
                    <Inp value={r.pct} onChange={(v) => ud(i, 'pct', v)} placeholder="%" />
                  </td>
                  <td style={{ ...TD, minWidth: '180px' }}>
                    <Inp value={r.notes} onChange={(v) => ud(i, 'notes', v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>

      {/* ── E: NSC & Programme Support ── */}
      <Sec letter="E" title="NSC & Programme Support — Dealer Feedback" subtitle="Rate each item from the Dealer's point of view: 1 = poor → 5 = excellent">
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
          <Fld label="Specific programme concerns or NSC requests raised by the Dealer">
            <Txt value={eConcerns} onChange={setEConcerns} rows={3} />
          </Fld>
        </div>
      </Sec>

      {/* ── F: Dealer Objections ── */}
      <Sec letter="F" title="Dealer Objections & Obstacles to Programme Delivery" subtitle="Mark each objection raised, note the response, and record follow-up required">
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
              {fRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, color: '#A0A0A0', minWidth: '240px', lineHeight: '1.5' }}>{r.objection}</td>
                  <td style={{ ...TD, textAlign: 'center' }}><Chk checked={r.raised} onChange={(v) => uf(i, 'raised', v)} /></td>
                  <td style={{ ...TD, minWidth: '180px' }}><Inp value={r.response} onChange={(v) => uf(i, 'response', v)} /></td>
                  <td style={TD}><YesNo value={r.resolved} onChange={(v) => uf(i, 'resolved', v)} /></td>
                  <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.followUp} onChange={(v) => uf(i, 'followUp', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '14px' }}>
          <Fld label="Biggest single barrier to BwIR growth at this Dealer">
            <Txt value={fBarrier} onChange={setFBarrier} rows={2} />
          </Fld>
        </div>
      </Sec>

      {/* ── G: Market Intelligence ── */}
      <Sec letter="G" title="Market Intelligence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Fld label="Competitor Dealer activity (other BMW/MINI or VW Group dealers, pricing, service levels)">
            <Txt value={g.competitorDealer} onChange={(v) => ug('competitorDealer', v)} rows={2} />
          </Fld>
          <Fld label="Motor factor / IAM activity (pricing, promotions, new entrants in the AOI)">
            <Txt value={g.motorFactor} onChange={(v) => ug('motorFactor', v)} rows={2} />
          </Fld>
          <Fld label="Lost sales — IR feedback (who is buying elsewhere, what, and why)">
            <Txt value={g.lostSales} onChange={(v) => ug('lostSales', v)} rows={2} />
          </Fld>
          <Fld label="Local market trends (EV growth, parc changes, new competitor sites)">
            <Txt value={g.localTrends} onChange={(v) => ug('localTrends', v)} rows={2} />
          </Fld>
          <Fld label="Intelligence to report to the BDC / NSC">
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
                  <td style={TD}><Inp value={r.responsible} onChange={(v) => uh(i, 'responsible', v)} /></td>
                  <td style={TD}><Inp type="date" value={r.byWhen} onChange={(v) => uh(i, 'byWhen', v)} /></td>
                  <td style={{ ...TD, textAlign: 'center' }}><Chk checked={r.done} onChange={(v) => uh(i, 'done', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Grid2>
          <Fld label="Next visit date"><Inp type="date" value={h2.nextDate} onChange={(v) => uh2('nextDate', v)} /></Fld>
          <Fld label="Agreed visit time"><Inp type="time" value={h2.nextTime} onChange={(v) => uh2('nextTime', v)} /></Fld>
        </Grid2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Fld label="Next visit objective 1"><Inp value={h2.obj1} onChange={(v) => uh2('obj1', v)} /></Fld>
          <Fld label="Next visit objective 2"><Inp value={h2.obj2} onChange={(v) => uh2('obj2', v)} /></Fld>
          <Fld label="Next visit objective 3"><Inp value={h2.obj3} onChange={(v) => uh2('obj3', v)} /></Fld>
          <Fld label="Coaching / development focus for the next visit">
            <Txt value={h2.coaching} onChange={(v) => uh2('coaching', v)} rows={2} />
          </Fld>
        </div>
      </Sec>

      {/* ── I: Outbound Deliveries ── */}
      <Sec letter="I" title="Outbound Deliveries to IRs — Today's Activity Review" subtitle="Orders going out from the Dealer to IRs today">
        <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {['IR customer', 'Delivery route', 'Order value', 'Delivery status', 'Any issues?'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {iRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1E1E1E' }}>
                  <td style={{ ...TD, minWidth: '140px' }}><Inp value={r.ir} onChange={(v) => ui(i, 'ir', v)} /></td>
                  <td style={{ ...TD, minWidth: '130px' }}><Inp value={r.route} onChange={(v) => ui(i, 'route', v)} /></td>
                  <td style={{ ...TD, minWidth: '100px' }}><Inp value={r.value} onChange={(v) => ui(i, 'value', v)} placeholder="£" /></td>
                  <td style={{ ...TD, minWidth: '120px' }}>
                    <Sel value={r.status} onChange={(v) => ui(i, 'status', v)} options={['In transit', 'Delivered', 'Delayed', 'Issue']} />
                  </td>
                  <td style={{ ...TD, minWidth: '160px' }}><Inp value={r.issues} onChange={(v) => ui(i, 'issues', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Grid2>
          <Fld label="Total value of orders going out today"><Inp value={iTotal} onChange={setITotal} placeholder="£" /></Fld>
        </Grid2>
        <Fld label="Delivery issues noted"><Txt value={iIssues} onChange={setIIssues} rows={2} /></Fld>
      </Sec>

      {/* ── J: Sign-Off ── */}
      <Sec letter="J" title="Sign-Off & Declaration">
        <Grid2>
          <Fld label="Trade Parts Representative (name)"><Inp value={j.tprName} onChange={(v) => uj('tprName', v)} /></Fld>
          <Fld label="Date"><Inp type="date" value={j.tprDate} onChange={(v) => uj('tprDate', v)} /></Fld>
          <Fld label="Dealer contact (name)"><Inp value={j.dealerContact} onChange={(v) => uj('dealerContact', v)} /></Fld>
          <Fld label="Date"><Inp type="date" value={j.dealerDate} onChange={(v) => uj('dealerDate', v)} /></Fld>
          <Fld label="Form submitted to BDC / system?"><YesNo value={j.formSubmitted} onChange={(v) => uj('formSubmitted', v)} /></Fld>
          <Fld label="Section K (Principles Assessment) included?"><YesNo value={j.sectionKIncluded} onChange={(v) => uj('sectionKIncluded', v)} /></Fld>
        </Grid2>
        <div style={{ marginTop: '20px', padding: '12px 16px', background: '#141414', borderRadius: '8px', border: '1px solid #2A2A2A', fontSize: '11px', color: '#A0A0A0', textAlign: 'center' }}>
          CONFIDENTIAL — for authorised BwIR field representatives only. &nbsp; BMW &amp; MINI · BwIR Authorised Dealer Visit Form v3.0
        </div>
      </Sec>
    </div>
  );
}
