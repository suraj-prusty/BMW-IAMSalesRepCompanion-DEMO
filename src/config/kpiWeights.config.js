// KPI Weightage Configuration — Seasonal presets for dealer prioritization

export const SEASONAL_WEIGHTS = {
  BALANCED: {
    name: 'Balanced Strategy',
    season: 'October - April',
    description: 'Balanced focus across revenue, growth, and customer retention',
    baseWeights: {
      purchaseRevVsTarget: 0.40,  // Revenue performance
      custMoM: 0.25,              // Customer momentum
      revYoY: 0.20,               // YoY growth trend
      abc: 0.15,                  // Customer segmentation
    },
  },

  SUMMER: {
    name: 'Growth Focus',
    season: 'May - September',
    description: 'Prioritize customer acquisition and volume growth',
    baseWeights: {
      purchaseRevVsTarget: 0.25,
      custMoM: 0.40,              // Customer growth is KEY
      revYoY: 0.20,
      abc: 0.15,
    },
  },

  YEAR_END: {
    name: 'Revenue Push',
    season: 'November - December',
    description: 'Aggressive focus on closing revenue gaps before year-end',
    baseWeights: {
      purchaseRevVsTarget: 0.50,  // Maximum revenue focus
      custMoM: 0.10,
      revYoY: 0.25,
      abc: 0.15,
    },
  },

  WINTER: {
    name: 'Winter Strategy',
    season: 'January - April',
    description: 'Focus on margins and service revenue during slower season',
    baseWeights: {
      purchaseRevVsTarget: 0.35,
      custMoM: 0.20,
      revYoY: 0.30,               // Growth trends more important
      abc: 0.15,
    },
  },
};

/**
 * Get current season based on today's date
 */
export const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 11 || month <= 4) return 'WINTER';
  if (month >= 5 && month <= 9) return 'SUMMER';
  return 'YEAR_END';
};

/**
 * Get the active seasonal preset
 */
export const getActivePreset = (overrideSeason = null) => {
  const season = overrideSeason || getCurrentSeason();
  return SEASONAL_WEIGHTS[season];
};

/**
 * Apply revenue aggressiveness adjustment to a preset
 *
 * aggressiveness: 0–100 scale
 *   0 = max customer focus (reduce revenue weight)
 *  50 = preset as-is
 * 100 = max revenue focus (increase revenue weight)
 */
export const applyAggressiveness = (preset, aggressiveness = 50) => {
  const normalized = (aggressiveness - 50) * 0.02; // -1 to +1 scale

  const adjusted = { ...preset.baseWeights };

  if (normalized > 0) {
    // Increase revenue, decrease customer MoM
    adjusted.purchaseRevVsTarget += normalized * 0.15;
    adjusted.custMoM -= normalized * 0.08;
  } else {
    // Increase customer growth, decrease revenue
    adjusted.purchaseRevVsTarget += normalized * 0.15;
    adjusted.custMoM -= normalized * 0.08;
  }

  // Normalize to sum = 1.0
  const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
  Object.keys(adjusted).forEach(key => {
    adjusted[key] = adjusted[key] / sum;
  });

  return adjusted;
};

/**
 * Format weights for display (to percentages)
 */
export const formatWeights = (weights) => {
  const formatted = {};
  Object.entries(weights).forEach(([key, value]) => {
    formatted[key] = Math.round(value * 100);
  });
  return formatted;
};
