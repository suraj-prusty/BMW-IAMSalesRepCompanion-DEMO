// ── Data Abstraction Layer ──────────────────────────────────────────────────
//
// PURPOSE:
//   Centralises ALL data access behind a clean interface.
//   Currently loads from local CSV files (via Vite's ?raw imports).
//   To switch to a database later, ONLY this file needs to change —
//   no other file in the app imports data directly.
//
// USAGE:
//   import { dataService } from '../data/dataService';
//   const dealers = dataService.getDealers();
//   const info = dataService.getDealerData('alpha-garage');
//
// FUTURE (DB migration):
//   Replace each function body with a fetch() call to the backend API:
//     const res = await fetch('/api/data/dealers');
//     return res.json();
// ────────────────────────────────────────────────────────────────────────────

import { parseCSV } from './csvLoader';
import { daysAgoText } from '../utils/dateUtils';

// ── Raw CSV imports (Vite ?raw) ────────────────────────────────────────────
import dealersRaw from './dealers.csv?raw';

import ag_kpis        from './alpha-garage/kpis.csv?raw';
import ag_issues      from './alpha-garage/issues.csv?raw';
import ag_agenda      from './alpha-garage/agenda.csv?raw';
import ag_contacts    from './alpha-garage/contacts.csv?raw';
import ag_actions     from './alpha-garage/actions.csv?raw';
import ag_lastVisit   from './alpha-garage/last_visit.csv?raw';
import ag_visitNotes  from './alpha-garage/visit_notes.csv?raw';
import ag_openActions from './alpha-garage/open_actions.csv?raw';

import bm_kpis        from './bavaria-motors/kpis.csv?raw';
import bm_issues      from './bavaria-motors/issues.csv?raw';
import bm_agenda      from './bavaria-motors/agenda.csv?raw';
import bm_contacts    from './bavaria-motors/contacts.csv?raw';
import bm_actions     from './bavaria-motors/actions.csv?raw';
import bm_lastVisit   from './bavaria-motors/last_visit.csv?raw';
import bm_visitNotes  from './bavaria-motors/visit_notes.csv?raw';
import bm_openActions from './bavaria-motors/open_actions.csv?raw';

import ra_kpis        from './rhein-auto/kpis.csv?raw';
import ra_issues      from './rhein-auto/issues.csv?raw';
import ra_agenda      from './rhein-auto/agenda.csv?raw';
import ra_contacts    from './rhein-auto/contacts.csv?raw';
import ra_actions     from './rhein-auto/actions.csv?raw';
import ra_lastVisit   from './rhein-auto/last_visit.csv?raw';
import ra_visitNotes  from './rhein-auto/visit_notes.csv?raw';
import ra_openActions from './rhein-auto/open_actions.csv?raw';

import np_kpis        from './nord-parts/kpis.csv?raw';
import np_issues      from './nord-parts/issues.csv?raw';
import np_agenda      from './nord-parts/agenda.csv?raw';
import np_contacts    from './nord-parts/contacts.csv?raw';
import np_actions     from './nord-parts/actions.csv?raw';
import np_lastVisit   from './nord-parts/last_visit.csv?raw';
import np_visitNotes  from './nord-parts/visit_notes.csv?raw';
import np_openActions from './nord-parts/open_actions.csv?raw';

import wd_kpis        from './west-drive/kpis.csv?raw';
import wd_issues      from './west-drive/issues.csv?raw';
import wd_agenda      from './west-drive/agenda.csv?raw';
import wd_contacts    from './west-drive/contacts.csv?raw';
import wd_actions     from './west-drive/actions.csv?raw';
import wd_lastVisit   from './west-drive/last_visit.csv?raw';
import wd_visitNotes  from './west-drive/visit_notes.csv?raw';
import wd_openActions from './west-drive/open_actions.csv?raw';

import ba_kpis        from './berlin-auto/kpis.csv?raw';
import ba_issues      from './berlin-auto/issues.csv?raw';
import ba_agenda      from './berlin-auto/agenda.csv?raw';
import ba_contacts    from './berlin-auto/contacts.csv?raw';
import ba_actions     from './berlin-auto/actions.csv?raw';
import ba_lastVisit   from './berlin-auto/last_visit.csv?raw';
import ba_visitNotes  from './berlin-auto/visit_notes.csv?raw';
import ba_openActions from './berlin-auto/open_actions.csv?raw';

// ── Internal: build dealer list + data map ──────────────────────────────────
const DEALER_ROWS = parseCSV(dealersRaw).map((d) => ({
  ...d,
  plannedToday: d.plannedToday === 'true',
  lastVisit: daysAgoText(d.lastVisitDate),
}));

const DEALER_DATA_MAP = {
  'alpha-garage': {
    kpis: parseCSV(ag_kpis), issues: parseCSV(ag_issues),
    agenda: parseCSV(ag_agenda), contacts: parseCSV(ag_contacts),
    actions: parseCSV(ag_actions), lastVisit: parseCSV(ag_lastVisit),
    visitNotes: parseCSV(ag_visitNotes), openActions: parseCSV(ag_openActions),
  },
  'bavaria-motors': {
    kpis: parseCSV(bm_kpis), issues: parseCSV(bm_issues),
    agenda: parseCSV(bm_agenda), contacts: parseCSV(bm_contacts),
    actions: parseCSV(bm_actions), lastVisit: parseCSV(bm_lastVisit),
    visitNotes: parseCSV(bm_visitNotes), openActions: parseCSV(bm_openActions),
  },
  'rhein-auto': {
    kpis: parseCSV(ra_kpis), issues: parseCSV(ra_issues),
    agenda: parseCSV(ra_agenda), contacts: parseCSV(ra_contacts),
    actions: parseCSV(ra_actions), lastVisit: parseCSV(ra_lastVisit),
    visitNotes: parseCSV(ra_visitNotes), openActions: parseCSV(ra_openActions),
  },
  'nord-parts': {
    kpis: parseCSV(np_kpis), issues: parseCSV(np_issues),
    agenda: parseCSV(np_agenda), contacts: parseCSV(np_contacts),
    actions: parseCSV(np_actions), lastVisit: parseCSV(np_lastVisit),
    visitNotes: parseCSV(np_visitNotes), openActions: parseCSV(np_openActions),
  },
  'west-drive': {
    kpis: parseCSV(wd_kpis), issues: parseCSV(wd_issues),
    agenda: parseCSV(wd_agenda), contacts: parseCSV(wd_contacts),
    actions: parseCSV(wd_actions), lastVisit: parseCSV(wd_lastVisit),
    visitNotes: parseCSV(wd_visitNotes), openActions: parseCSV(wd_openActions),
  },
  'berlin-auto': {
    kpis: parseCSV(ba_kpis), issues: parseCSV(ba_issues),
    agenda: parseCSV(ba_agenda), contacts: parseCSV(ba_contacts),
    actions: parseCSV(ba_actions), lastVisit: parseCSV(ba_lastVisit),
    visitNotes: parseCSV(ba_visitNotes), openActions: parseCSV(ba_openActions),
  },
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Data service — single entry point for all data access.
 *
 * When migrating to a database:
 *   1. Change each function body to call the backend API (e.g., /api/data/dealers)
 *   2. Or import from a DB client library
 *   3. No other file in the app needs to change.
 */
export const dataService = {
  /** Get all dealers (sorted: planned first, then priority) */
  getDealers() {
    const planned = DEALER_ROWS.filter((d) => d.plannedToday);
    const others = DEALER_ROWS.filter((d) => !d.plannedToday);
    return { all: DEALER_ROWS, planned, others };
  },

  /** Get a single dealer by ID */
  getDealerById(id) {
    return DEALER_ROWS.find((d) => d.id === id) || DEALER_ROWS[0];
  },

  /** Get full dealer data (KPIs, issues, contacts, agenda, actions, etc.) */
  getDealerData(id) {
    return DEALER_DATA_MAP[id] || DEALER_DATA_MAP['alpha-garage'];
  },

  /** Legacy: get raw KPI list for a specific dealer */
  getKpis(id) {
    return (DEALER_DATA_MAP[id] || DEALER_DATA_MAP['alpha-garage']).kpis;
  },

  /** Legacy: get raw issues for a specific dealer */
  getIssues(id) {
    return (DEALER_DATA_MAP[id] || DEALER_DATA_MAP['alpha-garage']).issues;
  },
};

// ── KPI color helper ────────────────────────────────────────────────────────
export function kpiColor(metric, value) {
  const num = parseFloat(value);
  if (metric === 'salesVsTarget') {
    if (num < 75) return '#EF4444';
    if (num < 85) return '#F59E0B';
    return '#22C55E';
  }
  if (metric === 'pl24Adoption') {
    if (num < 65) return '#EF4444';
    if (num < 75) return '#F59E0B';
    return '#22C55E';
  }
  if (metric === 'aosAdoption') {
    if (num < 75) return '#EF4444';
    if (num < 85) return '#F59E0B';
    return '#22C55E';
  }
  if (metric === 'dbMargin') {
    if (num < 19) return '#EF4444';
    if (num < 22) return '#F59E0B';
    return '#22C55E';
  }
  return '#A0A0A0';
}
