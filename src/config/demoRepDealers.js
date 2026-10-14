// ── Demo rep → dealer mapping (manager recommendation generation) ─────────────
// The demo has no real rep/dealer master data, so the two reps that have a
// dealer code set are mapped here. In production this comes from the onboarding
// template (people + dealer_assignment). `sales_rep_id` uses the people.person_id
// form so saved recommendation rows match the master-data identity.

import { dataService } from '../data/dataService';

export const DEMO_MARKET     = 'DE';
export const DEMO_MANAGER_ID = 'm.mueller';

const LOCAL_DEALER_ACCOUNTS = dataService.getPrioritizedDealers()
  .filter((account) => String(account.account_type).toUpperCase() === 'DEALER')
  .sort((a, b) => String(a.account_id).localeCompare(String(b.account_id), undefined, { numeric: true }));

// No rep assignments exist in the planning CSV. Preserve the previously saved
// W41 ownership, then balance remaining accounts deterministically for the demo.
export const MARCUS_DEALER_CODES = new Set(['D100', 'D102', 'D107']);
export const SOFIA_DEALER_CODES = new Set(['D105', 'D124', 'D106']);

LOCAL_DEALER_ACCOUNTS.forEach((account) => {
  const code = String(account.account_id);
  if (MARCUS_DEALER_CODES.has(code) || SOFIA_DEALER_CODES.has(code)) return;
  const target = MARCUS_DEALER_CODES.size <= SOFIA_DEALER_CODES.size
    ? MARCUS_DEALER_CODES
    : SOFIA_DEALER_CODES;
  target.add(code);
});

// Reps we can actually generate recommendations for in the demo.
export const DEMO_RECOMMENDATION_REPS = [
  { teamRepId: 'marcus-schmidt', salesRepId: 'marcus.schmidt', dealerCodes: MARCUS_DEALER_CODES },
  { teamRepId: 'sofia-keller',   salesRepId: 'sofia.keller',   dealerCodes: SOFIA_DEALER_CODES },
];

// TeamSelect rep id → people.person_id used on recommendation rows.
export const TEAM_REP_ID_TO_SALES_REP_ID = {
  'marcus-schmidt': 'marcus.schmidt',
  'sofia-keller':   'sofia.keller',
};

export const LOGIN_REP_ID_TO_SALES_REP_ID = {
  marcus: 'marcus.schmidt',
  sofia:  'sofia.keller',
};
