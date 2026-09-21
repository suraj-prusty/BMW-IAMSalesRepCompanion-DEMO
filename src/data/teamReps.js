// ── Mock Sales Representative dataset (Manager View) ──────────────────────────
// Demo/mock data only — no backend currently supplies per-rep, dealer, or
// IR-workshop data, and there is no reliable rep-to-dealer mapping in the
// dealer CSVs. Shape is structured (not label/value pairs) so a future API
// response (e.g. api.getTeamReps()) can replace this array without any
// changes to TeamSelect.jsx.
//
// Exactly 9 KPIs per representative:
//   Dealer (5):       totalDealers, tasksThisWeek, tasksOverdue, salesVsTarget, purchaseVsTarget
//   IR Workshops (4): totalWorkshops, tasksThisWeek, tasksOverdue, purchaseDeviation (+ comparison label)

export const TEAM_REPS = [
  {
    id: 'marcus-schmidt',
    name: 'Marcus Schmidt',
    initials: 'MS',
    role: 'Authorized Sales Representative',
    region: 'Central Europe',
    dealerKpis: {
      totalDealers: 18,
      tasksThisWeek: 12,
      tasksOverdue: 1,
      salesVsTarget: 104.2,
      purchaseVsTarget: 96.5,
    },
    irWorkshopKpis: {
      totalWorkshops: 24,
      tasksThisWeek: 9,
      tasksOverdue: 1,
      purchaseDeviation: -8000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'sofia-keller',
    name: 'Sofia Keller',
    initials: 'SK',
    role: 'Authorized Sales Representative',
    region: 'Central Europe',
    dealerKpis: {
      totalDealers: 14,
      tasksThisWeek: 10,
      tasksOverdue: 2,
      salesVsTarget: 89.6,
      purchaseVsTarget: 91.8,
    },
    irWorkshopKpis: {
      totalWorkshops: 20,
      tasksThisWeek: 7,
      tasksOverdue: 2,
      purchaseDeviation: 4000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'jonas-bauer',
    name: 'Jonas Bauer',
    initials: 'JB',
    role: 'Authorized Sales Representative',
    region: 'South Germany',
    dealerKpis: {
      totalDealers: 10,
      tasksThisWeek: 9,
      tasksOverdue: 1,
      salesVsTarget: 71.8,
      purchaseVsTarget: 84.2,
    },
    irWorkshopKpis: {
      totalWorkshops: 16,
      tasksThisWeek: 6,
      tasksOverdue: 1,
      purchaseDeviation: -12000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'anna-weber',
    name: 'Anna Weber',
    initials: 'AW',
    role: 'Authorized Sales Representative',
    region: 'Central Europe',
    dealerKpis: {
      totalDealers: 16,
      tasksThisWeek: 11,
      tasksOverdue: 0,
      salesVsTarget: 98.4,
      purchaseVsTarget: 102.1,
    },
    irWorkshopKpis: {
      totalWorkshops: 22,
      tasksThisWeek: 8,
      tasksOverdue: 0,
      purchaseDeviation: 6000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'lukas-meyer',
    name: 'Lukas Meyer',
    initials: 'LM',
    role: 'Authorized Sales Representative',
    region: 'North Germany',
    dealerKpis: {
      totalDealers: 20,
      tasksThisWeek: 13,
      tasksOverdue: 3,
      salesVsTarget: 92.7,
      purchaseVsTarget: 88.9,
    },
    irWorkshopKpis: {
      totalWorkshops: 18,
      tasksThisWeek: 5,
      tasksOverdue: 2,
      purchaseDeviation: -5000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'nina-vogel',
    name: 'Nina Vogel',
    initials: 'NV',
    role: 'Authorized Sales Representative',
    region: 'Benelux',
    dealerKpis: {
      totalDealers: 12,
      tasksThisWeek: 8,
      tasksOverdue: 0,
      salesVsTarget: 111.3,
      purchaseVsTarget: 105.6,
    },
    irWorkshopKpis: {
      totalWorkshops: 14,
      tasksThisWeek: 4,
      tasksOverdue: 0,
      purchaseDeviation: 9000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
  {
    id: 'felix-wagner',
    name: 'Felix Wagner',
    initials: 'FW',
    role: 'Authorized Sales Representative',
    region: 'Alpine Region',
    dealerKpis: {
      totalDealers: 15,
      tasksThisWeek: 7,
      tasksOverdue: 2,
      salesVsTarget: 78.4,
      purchaseVsTarget: 82.3,
    },
    irWorkshopKpis: {
      totalWorkshops: 19,
      tasksThisWeek: 6,
      tasksOverdue: 1,
      purchaseDeviation: -3000,
      purchaseDeviationComparison: 'Aug 2026 vs Aug 2025',
    },
  },
];
