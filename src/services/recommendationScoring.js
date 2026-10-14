// ── Recommendation scoring ────────────────────────────────────────────────────
// Single source of truth for ranking a rep's dealers against the manager's
// selected KPIs. A selected KPI that is in a bad state counts as "critical".
// ABC segment A is treated as critical (top-tier — protect & grow), matching
// the agreed rule in table_structures/recommendation-tracking-analysis.txt.
//
// Dealers are ranked by:
//   1. number of selected KPIs that are critical (desc)
//   2. combined severity across the selected KPIs (desc)
//   3. dealer sales (desc) as a stable tie-breaker
// The top 3 are returned, each annotated with `rank` and `dealer_sales`.

const SELECTABLE_KPIS = ['purchaseRevVsTarget', 'custMoM', 'revYoY', 'abc'];

export function isCriticalForKpi(kpi, dealer) {
  switch (kpi) {
    case 'purchaseRevVsTarget': return dealer.revenueVsTarget != null && dealer.revenueVsTarget < 0;
    case 'revYoY':              return dealer.yoyGrowth != null && dealer.yoyGrowth < 0;
    case 'custMoM':             return dealer.customerMoM != null && dealer.customerMoM < 0;
    case 'abc':                 return dealer.abcSegment === 'A';
    default:                    return false;
  }
}

// 0–100 severity for one KPI (higher = more urgent). 0 when not critical.
function severityForKpi(kpi, dealer) {
  if (!isCriticalForKpi(kpi, dealer)) return 0;
  switch (kpi) {
    case 'purchaseRevVsTarget': return Math.min(100, Math.abs(dealer.revenueVsTarget));
    case 'revYoY':              return Math.min(100, Math.abs(dealer.yoyGrowth) * 2);
    case 'custMoM':             return Math.min(100, Math.abs(dealer.customerMoM) * 2);
    case 'abc':                 return 100; // segment A is a flat high-priority flag
    default:                    return 0;
  }
}

export function dealerSalesOf(dealer) {
  return dealer.ytdSalesEur
      ?? dealer.revenueActual
      ?? dealer.saleRevenueActual
      ?? 0;
}

// selectedKpis: Set | Array of KPI keys (1–2 expected).
// Returns up to `limit` dealers sorted by priority, each with { rank, dealer_sales }.
export function rankTopDealers(dealers, selectedKpis, limit = 3) {
  const kpis = [...(selectedKpis || [])].filter((k) => SELECTABLE_KPIS.includes(k));
  if (kpis.length === 0 || !Array.isArray(dealers)) return [];

  const scored = dealers.map((d) => {
    const criticalCount = kpis.reduce((n, k) => n + (isCriticalForKpi(k, d) ? 1 : 0), 0);
    const severity      = kpis.reduce((s, k) => s + severityForKpi(k, d), 0);
    return { dealer: d, criticalCount, severity, sales: dealerSalesOf(d) };
  });

  return scored
    .sort((a, b) =>
      b.criticalCount - a.criticalCount
      || b.severity - a.severity
      || b.sales - a.sales
    )
    .slice(0, limit)
    .map((s, i) => ({ ...s.dealer, rank: i + 1, dealer_sales: s.sales }));
}
