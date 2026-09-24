// ── IR Mock Data ─────────────────────────────────────────────────────────────
//
// PURPOSE:
//   Temporary mock backing for the IR view while the backend (/irs endpoints)
//   is out of scope. Shapes mirror the API contract in Section 6 of the
//   IR View Frontend Build Spec exactly, so swapping mock → live `request()`
//   in api.js requires NO changes to IRBriefing.jsx.
//
//   - IR_DETAIL   → GET /irs/:irCode          (Section 6.3)
//   - IR_INSIGHTS → GET /irs/:irCode/insights  (Section 6.4)
//
// Field names are the canonical spec names. Numeric fields may be null and must
// render as an em dash. Placeholder fields (abc_tier, aos_status, pl24_status)
// are always null in this release.
// ────────────────────────────────────────────────────────────────────────────

// Keyed by ir_code. Detail response (Section 6.3 = all list fields + extras).
export const IR_DETAIL = {
  // High value, quiet — the canonical spec example.
  '4471829': {
    ir_code: '4471829',
    customer_name: 'Garage Muller',
    dealer_city: 'Lyon',
    country: 'FR',
    turnover: 350120,
    avg_turnover: 228400,
    high_turnover: true,
    low_activity: true,
    high_turnover_low_activity_flag: true,
    invoice_count: 1,
    recency_days: 40,
    last_purchase_date: '2026-08-12',
    decline_count: 2,
    volume_trend: 'Negative',
    abc_tier: null,
    aos_status: null,
    pl24_status: null,
    volume: 1840,
    avg_volume: 2110,
    categories_with_decline_pct: 'Maintenance: 22.4%, Wear: 18.1%',
    categories_with_decline_pct_volume: 'Maintenance: 19.0%, Wear: 15.2%',
    categories_with_trend_summary: 'Maintenance: -22.4% Negative, Wear: -18.1% Negative',
    categories_with_trend_summary_volume: 'Maintenance: -19.0% Negative, Wear: -15.2% Negative',
    yoy_value_pct: -12.4,
    yoy_volume_pct: -9.1,
    top_declining_categories: 'Maintenance, Wear, Repair',
    dealer_share: [
      { dealer_code: '102', dealer_name: 'Dealer A', value: 200000, share_pct: 57.1, is_owner: true },
      { dealer_code: '318', dealer_name: 'Dealer B', value: 150120, share_pct: 42.9, is_owner: false },
    ],
    open_actions_count: 0,
    last_visit: null,
    run_date: '2026-09-22',
  },

  // High value, active — healthy engagement.
  '4471830': {
    ir_code: '4471830',
    customer_name: 'AutoTech Rhone',
    dealer_city: 'Grenoble',
    country: 'FR',
    turnover: 412800,
    avg_turnover: 231500,
    high_turnover: true,
    low_activity: false,
    high_turnover_low_activity_flag: false,
    invoice_count: 6,
    recency_days: 8,
    last_purchase_date: '2026-09-15',
    decline_count: 1,
    volume_trend: 'Positive',
    abc_tier: null,
    aos_status: null,
    pl24_status: null,
    volume: 2560,
    avg_volume: 2180,
    categories_with_decline_pct: 'Electrical: 9.7%',
    categories_with_decline_pct_volume: 'Electrical: 7.4%',
    categories_with_trend_summary: 'Engine: +14.2% Positive, Electrical: -9.7% Negative',
    categories_with_trend_summary_volume: 'Engine: +11.8% Positive, Electrical: -7.4% Negative',
    yoy_value_pct: 8.6,
    yoy_volume_pct: 5.3,
    top_declining_categories: 'Electrical',
    dealer_share: [
      { dealer_code: '102', dealer_name: 'Dealer A', value: 260000, share_pct: 63.0, is_owner: true },
      { dealer_code: '447', dealer_name: 'Dealer C', value: 152800, share_pct: 37.0, is_owner: false },
    ],
    open_actions_count: 2,
    last_visit: null,
    run_date: '2026-09-22',
  },

  // Low value, quiet — single-dealer sourcing, no declining categories.
  '4471831': {
    ir_code: '4471831',
    customer_name: 'Petit Atelier Dupont',
    dealer_city: 'Dijon',
    country: 'FR',
    turnover: 48250,
    avg_turnover: 132900,
    high_turnover: false,
    low_activity: true,
    high_turnover_low_activity_flag: false,
    invoice_count: 1,
    recency_days: 62,
    last_purchase_date: '2026-07-21',
    decline_count: 0,
    volume_trend: 'Flat',
    abc_tier: null,
    aos_status: null,
    pl24_status: null,
    volume: 410,
    avg_volume: 980,
    categories_with_decline_pct: 'None',
    categories_with_decline_pct_volume: 'None',
    categories_with_trend_summary: 'None',
    categories_with_trend_summary_volume: 'None',
    yoy_value_pct: -3.2,
    yoy_volume_pct: -1.1,
    top_declining_categories: 'None',
    dealer_share: [
      { dealer_code: '318', dealer_name: 'Dealer B', value: 48250, share_pct: 100.0, is_owner: true },
    ],
    open_actions_count: 0,
    last_visit: null,
    run_date: '2026-09-22',
  },

  // Optional numerics null — exercises the empty-state / em-dash rendering.
  '4471832': {
    ir_code: '4471832',
    customer_name: 'Carrosserie Nouvelle',
    dealer_city: 'Nancy',
    country: 'FR',
    turnover: null,
    avg_turnover: null,
    high_turnover: false,
    low_activity: true,
    high_turnover_low_activity_flag: false,
    invoice_count: null,
    recency_days: null,
    last_purchase_date: null,
    decline_count: null,
    volume_trend: 'Flat',
    abc_tier: null,
    aos_status: null,
    pl24_status: null,
    volume: null,
    avg_volume: null,
    categories_with_decline_pct: '',
    categories_with_decline_pct_volume: '',
    categories_with_trend_summary: '',
    categories_with_trend_summary_volume: '',
    yoy_value_pct: null,
    yoy_volume_pct: null,
    top_declining_categories: '',
    dealer_share: [],
    open_actions_count: 0,
    last_visit: null,
    run_date: '2026-09-22',
  },

  '4471833': {
    ir_code: '4471833', customer_name: 'Garage des Alpes', dealer_city: 'Chambery', country: 'FR',
    turnover: 285600, avg_turnover: 214200, high_turnover: true, low_activity: false,
    high_turnover_low_activity_flag: false, invoice_count: 4, recency_days: 14, last_purchase_date: '2026-09-09',
    decline_count: 3, volume_trend: 'Negative', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 1620, avg_volume: 1980, categories_with_decline_pct: 'Brakes: 16.8%, Filters: 13.2%, Wear: 10.4%',
    categories_with_decline_pct_volume: 'Brakes: 14.1%, Filters: 11.5%, Wear: 8.7%',
    categories_with_trend_summary: 'Brakes: -16.8% Negative, Filters: -13.2% Negative, Wear: -10.4% Negative',
    categories_with_trend_summary_volume: 'Brakes: -14.1% Negative, Filters: -11.5% Negative, Wear: -8.7% Negative',
    yoy_value_pct: -6.8, yoy_volume_pct: -5.2, top_declining_categories: 'Brakes, Filters, Wear', dealer_share: [],
    open_actions_count: 1, last_visit: null, run_date: '2026-09-22',
  },

  '4471834': {
    ir_code: '4471834', customer_name: 'Mecanique Centre', dealer_city: 'Clermont-Ferrand', country: 'FR',
    turnover: 118900, avg_turnover: 152400, high_turnover: false, low_activity: false,
    high_turnover_low_activity_flag: false, invoice_count: 3, recency_days: 21, last_purchase_date: '2026-09-02',
    decline_count: 0, volume_trend: 'Positive', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 1050, avg_volume: 1120, categories_with_decline_pct: 'None', categories_with_decline_pct_volume: 'None',
    categories_with_trend_summary: 'Engine: +8.2% Positive, Electrical: +4.1% Positive',
    categories_with_trend_summary_volume: 'Engine: +6.3% Positive, Electrical: +2.7% Positive',
    yoy_value_pct: 5.1, yoy_volume_pct: 3.8, top_declining_categories: 'None', dealer_share: [],
    open_actions_count: 0, last_visit: null, run_date: '2026-09-22',
  },

  '4471835': {
    ir_code: '4471835', customer_name: 'Atelier Saint Martin', dealer_city: 'Reims', country: 'FR',
    turnover: 224700, avg_turnover: 189300, high_turnover: true, low_activity: true,
    high_turnover_low_activity_flag: true, invoice_count: 1, recency_days: 51, last_purchase_date: '2026-08-01',
    decline_count: 1, volume_trend: 'Flat', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 1490, avg_volume: 1330, categories_with_decline_pct: 'Suspension: 12.6%', categories_with_decline_pct_volume: 'Suspension: 10.9%',
    categories_with_trend_summary: 'Suspension: -12.6% Negative, Engine: +2.1% Positive',
    categories_with_trend_summary_volume: 'Suspension: -10.9% Negative, Engine: +1.3% Positive',
    yoy_value_pct: -4.7, yoy_volume_pct: -3.4, top_declining_categories: 'Suspension', dealer_share: [],
    open_actions_count: 3, last_visit: null, run_date: '2026-09-22',
  },

  '4471836': {
    ir_code: '4471836', customer_name: 'Garage de la Gare', dealer_city: 'Tours', country: 'FR',
    turnover: 76400, avg_turnover: 108700, high_turnover: false, low_activity: true,
    high_turnover_low_activity_flag: false, invoice_count: 0, recency_days: 75, last_purchase_date: '2026-07-08',
    decline_count: 2, volume_trend: 'Negative', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 560, avg_volume: 820, categories_with_decline_pct: 'Maintenance: 18.9%, Electrical: 14.3%',
    categories_with_decline_pct_volume: 'Maintenance: 16.0%, Electrical: 12.8%',
    categories_with_trend_summary: 'Maintenance: -18.9% Negative, Electrical: -14.3% Negative',
    categories_with_trend_summary_volume: 'Maintenance: -16.0% Negative, Electrical: -12.8% Negative',
    yoy_value_pct: -15.2, yoy_volume_pct: -12.0, top_declining_categories: 'Maintenance, Electrical', dealer_share: [],
    open_actions_count: 0, last_visit: null, run_date: '2026-09-22',
  },

  '4471837': {
    ir_code: '4471837', customer_name: 'Auto Service Provence', dealer_city: 'Avignon', country: 'FR',
    turnover: 176300, avg_turnover: 165500, high_turnover: false, low_activity: false,
    high_turnover_low_activity_flag: false, invoice_count: 5, recency_days: 5, last_purchase_date: '2026-09-18',
    decline_count: 1, volume_trend: 'Positive', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 1370, avg_volume: 1210, categories_with_decline_pct: 'Cooling: 6.4%', categories_with_decline_pct_volume: 'Cooling: 5.7%',
    categories_with_trend_summary: 'Engine: +9.1% Positive, Cooling: -6.4% Negative',
    categories_with_trend_summary_volume: 'Engine: +7.8% Positive, Cooling: -5.7% Negative',
    yoy_value_pct: 7.4, yoy_volume_pct: 6.0, top_declining_categories: 'Cooling', dealer_share: [],
    open_actions_count: 1, last_visit: null, run_date: '2026-09-22',
  },

  '4471838': {
    ir_code: '4471838', customer_name: 'Bordeaux Auto Plus', dealer_city: 'Bordeaux', country: 'FR',
    turnover: 196800, avg_turnover: 178000, high_turnover: true, low_activity: false,
    high_turnover_low_activity_flag: false, invoice_count: 2, recency_days: 29, last_purchase_date: '2026-08-25',
    decline_count: 0, volume_trend: 'Flat', abc_tier: null, aos_status: null, pl24_status: null,
    volume: 1280, avg_volume: 1260, categories_with_decline_pct: 'None', categories_with_decline_pct_volume: 'None',
    categories_with_trend_summary: 'None', categories_with_trend_summary_volume: 'None',
    yoy_value_pct: 1.2, yoy_volume_pct: 0.4, top_declining_categories: 'None', dealer_share: [],
    open_actions_count: 0, last_visit: null, run_date: '2026-09-22',
  },
};

// GET /irs list response (Section 6.2). Detail-only fields are deliberately omitted.
export const IR_LIST = Object.values(IR_DETAIL).map(({
  ir_code, customer_name, dealer_city, country, turnover, avg_turnover, high_turnover,
  low_activity, high_turnover_low_activity_flag, invoice_count, recency_days,
  last_purchase_date, decline_count, volume_trend, abc_tier, aos_status, pl24_status,
}) => ({
  ir_code, customer_name, dealer_city, country, turnover, avg_turnover, high_turnover,
  low_activity, high_turnover_low_activity_flag, invoice_count, recency_days,
  last_purchase_date, decline_count, volume_trend, abc_tier, aos_status, pl24_status,
}));

// Keyed by ir_code. Insights response (Section 6.4 — same shape as dealer insights).
export const IR_INSIGHTS = {
  '4471829': {
    run_date: '2026-09-22',
    top_issues: [
      {
        num: 1,
        title: 'High-value account gone quiet — 40 days since last purchase',
        root_cause: 'Only 1 invoice in the last 3 months despite turnover 53% above peer average. Ordering has slowed with no re-engagement contact logged.',
        impact: 'Recovering cadence to peer average could protect ~€120K annualised turnover at risk.',
      },
      {
        num: 2,
        title: 'Maintenance & Wear categories declining in value and volume',
        root_cause: 'Maintenance down 22.4% and Wear down 18.1% year-on-year; volume declines confirm this is lost demand, not pricing.',
        impact: 'Reversing the two declining families targets ~€60K of recoverable category revenue.',
      },
    ],
    summary:
      'Garage Muller (Lyon) is a high-value IR with turnover of €350K, 53% above the peer average, but engagement has stalled with only one invoice in the last three months and 40 days since the last purchase. Maintenance (-22.4%) and Wear (-18.1%) are declining in both value and volume, and overall purchase value is down 12.4% year-on-year. Volume trend is negative, reinforcing that this is lost demand rather than a pricing effect. The priority for today is to re-establish ordering cadence and recover the two declining categories. No open actions are currently carried forward.',
    pitch: [
      {
        issue: 'Engagement & Recency Risk',
        data: 'Turnover €350K (+53% vs peer) but only 1 invoice / 40 days since last order',
        action: 'Open by acknowledging their strong historical value, then ask what has changed in their ordering rhythm over the last quarter and how we can make reordering effortless.',
      },
      {
        issue: 'Maintenance Category Decline',
        data: 'Maintenance -22.4% value, -19.0% volume YoY',
        action: 'Propose a targeted Maintenance basket review this visit and offer a restocking plan for the most-dropped SKUs.',
      },
      {
        issue: 'Wear Category Decline',
        data: 'Wear -18.1% value, -15.2% volume YoY',
        action: 'Ask whether Wear demand has shifted to a competitor and position our availability and turnaround as the reason to consolidate back.',
      },
    ],
  },
  '4471830': {
    run_date: '2026-09-22',
    top_issues: [
      {
        num: 1,
        title: 'Electrical category slipping against otherwise strong growth',
        root_cause: 'Electrical down 9.7% value while Engine grows +14.2%; a single soft category is dragging an otherwise healthy portfolio.',
        impact: 'Stabilising Electrical protects ~€25K and keeps the account on its positive YoY trajectory.',
      },
    ],
    summary:
      'AutoTech Rhone (Grenoble) is a high-value, actively engaged IR with turnover of €413K and six invoices in the last three months. Purchase value is up 8.6% year-on-year with a positive volume trend, led by Engine (+14.2%). The one soft spot is Electrical, down 9.7% in value. Today\'s priority is to reinforce the growth relationship and address the single declining category. Two open actions are carried forward.',
    pitch: [
      {
        issue: 'Sustain Growth Momentum',
        data: 'Turnover €413K, +8.6% YoY, 6 invoices / 8 days recency',
        action: 'Recognise their strong momentum and explore expanding the Engine range that is already driving growth.',
      },
      {
        issue: 'Electrical Category Softness',
        data: 'Electrical -9.7% value, -7.4% volume YoY',
        action: 'Ask what is behind the Electrical dip and offer a focused availability check on their top Electrical lines.',
      },
    ],
  },
  '4471831': {
    run_date: '2026-09-22',
    top_issues: [
      {
        num: 1,
        title: 'Low engagement and below-peer turnover',
        root_cause: 'Turnover €48K sits well below the €133K peer average with only one invoice in three months and 62 days since last purchase.',
        impact: 'Lifting this IR toward peer cadence represents meaningful incremental upside from a low base.',
      },
    ],
    summary:
      'Petit Atelier Dupont (Dijon) is a lower-value IR sourcing entirely from a single dealer, with turnover of €48K against a peer average of €133K. There are no declining categories and the volume trend is flat, but engagement is low with one invoice and 62 days since the last purchase. The focus for today is basic re-engagement and understanding their sourcing constraints. No open actions are carried forward.',
    pitch: [
      {
        issue: 'Re-engagement from a Low Base',
        data: 'Turnover €48K vs €133K peer, 62 days recency, 1 invoice',
        action: 'Lead with a simple check-in on their current workload and identify one easy category to rebuild a regular ordering habit.',
      },
    ],
  },
  '4471832': {
    run_date: '2026-09-22',
    top_issues: [],
    summary: '',
    pitch: [],
  },
};

export const irMockData = { IR_LIST, IR_DETAIL, IR_INSIGHTS };
