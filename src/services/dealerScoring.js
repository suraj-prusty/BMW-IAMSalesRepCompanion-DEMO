/**
 * Dealer Scoring and Filtering Logic
 * Uses weighted KPI metrics to rank dealers by urgency/opportunity
 */

/**
 * Check if a KPI is in critical state (red or amber, not green)
 */
export const isCriticalKpi = (kpiName, dealer) => {
  switch (kpiName) {
    case 'purchaseRevVsTarget':
      // Red/Amber: < 0% (below target)
      return dealer.revenueVsTarget != null && dealer.revenueVsTarget < 0;

    case 'revYoY':
      // Red/Amber: < 0% (declining)
      return dealer.yoyGrowth != null && dealer.yoyGrowth < 0;

    case 'custMoM':
      // Red: < 0% (customer loss)
      return dealer.customerMoM != null && dealer.customerMoM < 0;

    case 'abc':
      // Red/Amber: B or C (not A)
      return dealer.abcSegment !== 'A';

    default:
      return false;
  }
};

/**
 * Count how many dealers are in critical state for a given KPI
 */
export const countCriticalDealers = (dealers, kpiName) => {
  return dealers.filter(d => isCriticalKpi(kpiName, d)).length;
};

/**
 * Calculate a single dealer's match score against selected KPIs
 *
 * Score ranges 0–100, weighted by importance of each KPI
 * Higher score = more urgent/better match for recommended action
 */
export const calculateDealerScore = (dealer, selectedKpis, weights) => {
  if (!selectedKpis || selectedKpis.size === 0) return 0;

  let score = 0;

  // Revenue impact (typically 25–50% weight)
  if (selectedKpis.has('purchaseRevVsTarget') && dealer.revenueVsTarget != null) {
    // Scale: 0% (target met) = 0 points, -50% = 100 points
    const gap = Math.min(50, Math.abs(dealer.revenueVsTarget));
    score += (gap / 50) * 100 * weights.purchaseRevVsTarget;
  }

  // Customer momentum (typically 15–40% weight)
  if (selectedKpis.has('custMoM') && dealer.customerMoM != null) {
    // Scale: 0% (flat) = 0 points, -20% = 100 points
    const loss = Math.min(20, Math.abs(Math.min(0, dealer.customerMoM)));
    score += (loss / 20) * 100 * weights.custMoM;
  }

  // YoY growth trend (typically 15–30% weight)
  if (selectedKpis.has('revYoY') && dealer.yoyGrowth != null) {
    // Scale: 0% (flat) = 0 points, -20% decline = 100 points
    const decline = Math.min(20, Math.abs(Math.min(0, dealer.yoyGrowth)));
    score += (decline / 20) * 100 * weights.revYoY;
  }

  // ABC segmentation (typically 10–15% weight)
  if (selectedKpis.has('abc')) {
    const abcScore = {
      'C': 100,  // Highest urgency for C dealers
      'B': 50,   // Medium urgency for B dealers
      'A': 0,    // No urgency for A dealers
    };
    score += (abcScore[dealer.abcSegment] || 0) * weights.abc;
  }

  return Math.round(score);
};

/**
 * Filter dealers to only those having data for ALL selected KPIs
 * Then rank by match score (descending)
 * NOTE: No longer requires dealers to be "critical" — they just need data
 */
export const filterAndRankDealers = (dealers, selectedKpis, weights) => {
  if (!selectedKpis || selectedKpis.size === 0) return [];

  const hasDataForKpi = (dealer, kpiName) => {
    switch (kpiName) {
      case 'purchaseRevVsTarget':
        return dealer.revenueVsTarget != null;
      case 'revYoY':
        return dealer.yoyGrowth != null;
      case 'custMoM':
        return dealer.customerMoM != null;
      case 'abc':
        return dealer.abcSegment != null;
      default:
        return true;
    }
  };

  const filtered = dealers
    .filter(dealer => {
      // Must have data for ALL selected KPIs
      return Array.from(selectedKpis).every(kpi => hasDataForKpi(dealer, kpi));
    })
    .map(dealer => ({
      ...dealer,
      matchScore: calculateDealerScore(dealer, selectedKpis, weights),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return filtered; // Return all matching dealers (not just top 3)
};
