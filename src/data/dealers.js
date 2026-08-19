import { parseCSV } from './csvLoader';
import { daysAgoText } from '../utils/dateUtils';

// ── Dealers list ──────────────────────────────────────────────────────────────
import dealersRaw        from './dealers.csv?raw';
import planningKpisRaw   from './planning-kpis.csv?raw';
import partsGrowthRaw    from './parts-growth.csv?raw';

// ── alpha-garage ──────────────────────────────────────────────────────────────
import ag_kpis        from './alpha-garage/kpis.csv?raw';
import ag_issues      from './alpha-garage/issues.csv?raw';
import ag_agenda      from './alpha-garage/agenda.csv?raw';
import ag_contacts    from './alpha-garage/contacts.csv?raw';
import ag_actions     from './alpha-garage/actions.csv?raw';
import ag_lastVisit   from './alpha-garage/last_visit.csv?raw';
import ag_visitNotes  from './alpha-garage/visit_notes.csv?raw';
import ag_openActions from './alpha-garage/open_actions.csv?raw';

// ── bavaria-motors ────────────────────────────────────────────────────────────
import bm_kpis        from './bavaria-motors/kpis.csv?raw';
import bm_issues      from './bavaria-motors/issues.csv?raw';
import bm_agenda      from './bavaria-motors/agenda.csv?raw';
import bm_contacts    from './bavaria-motors/contacts.csv?raw';
import bm_actions     from './bavaria-motors/actions.csv?raw';
import bm_lastVisit   from './bavaria-motors/last_visit.csv?raw';
import bm_visitNotes  from './bavaria-motors/visit_notes.csv?raw';
import bm_openActions from './bavaria-motors/open_actions.csv?raw';

// ── rhein-auto ────────────────────────────────────────────────────────────────
import ra_kpis        from './rhein-auto/kpis.csv?raw';
import ra_issues      from './rhein-auto/issues.csv?raw';
import ra_agenda      from './rhein-auto/agenda.csv?raw';
import ra_contacts    from './rhein-auto/contacts.csv?raw';
import ra_actions     from './rhein-auto/actions.csv?raw';
import ra_lastVisit   from './rhein-auto/last_visit.csv?raw';
import ra_visitNotes  from './rhein-auto/visit_notes.csv?raw';
import ra_openActions from './rhein-auto/open_actions.csv?raw';

// ── nord-parts ────────────────────────────────────────────────────────────────
import np_kpis        from './nord-parts/kpis.csv?raw';
import np_issues      from './nord-parts/issues.csv?raw';
import np_agenda      from './nord-parts/agenda.csv?raw';
import np_contacts    from './nord-parts/contacts.csv?raw';
import np_actions     from './nord-parts/actions.csv?raw';
import np_lastVisit   from './nord-parts/last_visit.csv?raw';
import np_visitNotes  from './nord-parts/visit_notes.csv?raw';
import np_openActions from './nord-parts/open_actions.csv?raw';

// ── west-drive ────────────────────────────────────────────────────────────────
import wd_kpis        from './west-drive/kpis.csv?raw';
import wd_issues      from './west-drive/issues.csv?raw';
import wd_agenda      from './west-drive/agenda.csv?raw';
import wd_contacts    from './west-drive/contacts.csv?raw';
import wd_actions     from './west-drive/actions.csv?raw';
import wd_lastVisit   from './west-drive/last_visit.csv?raw';
import wd_visitNotes  from './west-drive/visit_notes.csv?raw';
import wd_openActions from './west-drive/open_actions.csv?raw';

// ── berlin-auto ───────────────────────────────────────────────────────────────
import ba_kpis        from './berlin-auto/kpis.csv?raw';
import ba_issues      from './berlin-auto/issues.csv?raw';
import ba_agenda      from './berlin-auto/agenda.csv?raw';
import ba_contacts    from './berlin-auto/contacts.csv?raw';
import ba_actions     from './berlin-auto/actions.csv?raw';
import ba_lastVisit   from './berlin-auto/last_visit.csv?raw';
import ba_visitNotes  from './berlin-auto/visit_notes.csv?raw';
import ba_openActions from './berlin-auto/open_actions.csv?raw';

// ── Dealers list ──────────────────────────────────────────────────────────────
const dealerRows = parseCSV(dealersRaw);
const kpiMaster  = parseCSV(planningKpisRaw);
const partsGrowth = parseCSV(partsGrowthRaw);

// Group parts by account_id for fast lookup
const partsMap = {};
partsGrowth.forEach((p) => {
  if (!partsMap[p.account_id]) partsMap[p.account_id] = [];
  partsMap[p.account_id].push(p);
});

export const dealers = dealerRows.map((d) => {
  const kpi          = kpiMaster.find((k) => k.account_id === d.account_id) || {};
  const accountParts = partsMap[d.account_id] || [];

  // Aggregate parts YoY (multiple rows per account)
  const totalCur  = accountParts.reduce((s, p) => s + parseFloat(p.current_year_sales  || 0), 0);
  const totalPrev = accountParts.reduce((s, p) => s + parseFloat(p.last_year_sales || 0), 0);
  const partsYoY  = totalPrev > 0
    ? Math.round(((totalCur / totalPrev) - 1) * 100 * 10) / 10
    : null;

  return {
    ...d,
    plannedToday:     d.plannedToday === 'true',
    lastVisit:        daysAgoText(d.lastVisitDate),
    // KPIs from planning-kpis.csv (Excel 3)
    revenueVsTarget:  kpi.target_achievement_pct != null ? parseFloat(kpi.target_achievement_pct) : null,
    abcSegment:       kpi.abc_segment  || null,
    yoyGrowth:        kpi.yoy_growth_pct  != null ? parseFloat(kpi.yoy_growth_pct)  : null,
    dormancyScore:    kpi.dormancy_risk   != null ? parseFloat(kpi.dormancy_risk)    : null,
    activeClientsIrs: kpi.active_clients_irs != null ? parseInt(kpi.active_clients_irs, 10) : null,
    // Parts YoY from parts-growth.csv (Excel 2)
    partsYoY,
  };
});

export const plannedDealers = dealers.filter((d) => d.plannedToday);
export const otherDealers   = dealers.filter((d) => !d.plannedToday);

// ── Legacy named exports (used by ReviewSubmit / VisitCapture) ────────────────
export const alphaKpis        = parseCSV(ag_kpis);
export const alphaIssues      = parseCSV(ag_issues);
export const alphaAgenda      = parseCSV(ag_agenda);
export const alphaContacts    = parseCSV(ag_contacts);
export const alphaActions     = parseCSV(ag_actions);
export const alphaLastVisit   = parseCSV(ag_lastVisit);
export const alphaOpenActions = parseCSV(ag_openActions);

// ── DEALER_DATA map — keyed by dealer id ──────────────────────────────────────
export const DEALER_DATA = {
  'alpha-garage': {
    kpis:        parseCSV(ag_kpis),
    issues:      parseCSV(ag_issues),
    agenda:      parseCSV(ag_agenda),
    contacts:    parseCSV(ag_contacts),
    actions:     parseCSV(ag_actions),
    lastVisit:   parseCSV(ag_lastVisit),
    visitNotes:  parseCSV(ag_visitNotes),
    openActions: parseCSV(ag_openActions),
  },
  'bavaria-motors': {
    kpis:        parseCSV(bm_kpis),
    issues:      parseCSV(bm_issues),
    agenda:      parseCSV(bm_agenda),
    contacts:    parseCSV(bm_contacts),
    actions:     parseCSV(bm_actions),
    lastVisit:   parseCSV(bm_lastVisit),
    visitNotes:  parseCSV(bm_visitNotes),
    openActions: parseCSV(bm_openActions),
  },
  'rhein-auto': {
    kpis:        parseCSV(ra_kpis),
    issues:      parseCSV(ra_issues),
    agenda:      parseCSV(ra_agenda),
    contacts:    parseCSV(ra_contacts),
    actions:     parseCSV(ra_actions),
    lastVisit:   parseCSV(ra_lastVisit),
    visitNotes:  parseCSV(ra_visitNotes),
    openActions: parseCSV(ra_openActions),
  },
  'nord-parts': {
    kpis:        parseCSV(np_kpis),
    issues:      parseCSV(np_issues),
    agenda:      parseCSV(np_agenda),
    contacts:    parseCSV(np_contacts),
    actions:     parseCSV(np_actions),
    lastVisit:   parseCSV(np_lastVisit),
    visitNotes:  parseCSV(np_visitNotes),
    openActions: parseCSV(np_openActions),
  },
  'west-drive': {
    kpis:        parseCSV(wd_kpis),
    issues:      parseCSV(wd_issues),
    agenda:      parseCSV(wd_agenda),
    contacts:    parseCSV(wd_contacts),
    actions:     parseCSV(wd_actions),
    lastVisit:   parseCSV(wd_lastVisit),
    visitNotes:  parseCSV(wd_visitNotes),
    openActions: parseCSV(wd_openActions),
  },
  'berlin-auto': {
    kpis:        parseCSV(ba_kpis),
    issues:      parseCSV(ba_issues),
    agenda:      parseCSV(ba_agenda),
    contacts:    parseCSV(ba_contacts),
    actions:     parseCSV(ba_actions),
    lastVisit:   parseCSV(ba_lastVisit),
    visitNotes:  parseCSV(ba_visitNotes),
    openActions: parseCSV(ba_openActions),
  },
};

// ── Screen context prompts (used by ChatBot) ──────────────────────────────────
// NOTE: Azure OpenAI config is now SERVER-SIDE only (see server.js + .env).
//       The API key is NEVER exposed to the browser anymore.
export const SCREEN_CONTEXT = {
  dashboard: `You are Intelligent IAM Copilot AI assistant. Context: Marcus Schmidt, C1 Europe Sales Executive.
Territory stats: 18 dealers, 11 Open Actions (3 overdue), 78% Sales vs Target, 72% PL24 Adoption, 65% AOS Adoption.
Today's planned visits: Alpha Garage GmbH (HIGH priority, Cologne), Bavaria Motors AG (Munich), Rhein Auto GmbH (Düsseldorf).
Key issues: Alpha Garage - 14 days since last contact, 3 open actions, PL24 44%, Rhein Auto overdue assessment.
Respond concisely and helpfully to sales executive queries.`,

  dealerBriefing: `You are Intelligent IAM Copilot AI assistant helping Marcus Schmidt prepare for dealer visits in C1 Europe territory.
Respond concisely to help Marcus prepare for his visit.`,

  visitCapture: `You are Intelligent IAM Copilot AI assistant. Context: Live visit capture in progress.
Help Marcus capture quality visit data and answer on-site queries.`,
};

// ── Backward-compat: re-export dataService symbols so existing imports don't break
export { dataService, kpiColor } from './dataService';
