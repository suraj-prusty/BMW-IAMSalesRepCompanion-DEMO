import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  getActivePreset,
} from '../config/kpiWeights.config';
import {
  countCriticalDealers,
} from '../services/dealerScoring';

/**
 * Compact KPI Filter Bar with minimal space usage
 */
export default function KpiFilterBar({
  dealers = [],
  selectedKpis = new Set(),
  onKpiToggle = () => {},
  onWeightsChange = () => {},
  currentWeights = {},
}) {
  const isMobile = window.innerWidth < 640;
  const [showWeights, setShowWeights] = useState(!isMobile); // Collapsed on mobile by default

  const preset = getActivePreset();

  // KPI definitions
  const kpiDefs = [
    {
      name: 'purchaseRevVsTarget',
      label: 'Revenue',
      icon: '💰',
    },
    {
      name: 'custMoM',
      label: 'Cust MoM',
      icon: '👥',
    },
    {
      name: 'revYoY',
      label: 'YoY',
      icon: '📈',
    },
    {
      name: 'abc',
      label: 'ABC',
      icon: '🎯',
    },
  ];

  const normalizeWeights = (weights) => {
    const selectedWeights = {};
    let sum = 0;

    Array.from(selectedKpis).forEach((kpi) => {
      const w = weights[kpi] || 25;
      selectedWeights[kpi] = w;
      sum += w;
    });

    if (sum > 0) {
      Object.keys(selectedWeights).forEach((kpi) => {
        selectedWeights[kpi] = Math.round((selectedWeights[kpi] / sum) * 100);
      });
    }

    return selectedWeights;
  };

  const normalizedWeights = useMemo(
    () => normalizeWeights(currentWeights),
    [selectedKpis, currentWeights]
  );

  const handleWeightChange = (kpiName, newValue) => {
    const updated = { ...currentWeights, [kpiName]: newValue };
    onWeightsChange(updated);
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Compact header - season + toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          gap: '8px',
          fontSize: isMobile ? '11px' : '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <span style={{ color: '#A100FF', fontWeight: '600' }}>📅</span>
          <span style={{ color: '#A100FF', fontWeight: '600' }}>{preset.season}</span>
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <span style={{ color: 'var(--text-muted)' }}>{preset.name}</span>
        </div>

        {selectedKpis.size >= 2 && (
          <button
            onClick={() => setShowWeights(!showWeights)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: isMobile ? '11px' : '12px',
              color: '#A100FF',
              fontWeight: '600',
              padding: '0',
              whiteSpace: 'nowrap',
            }}
          >
            ⚖️
            <ChevronDown size={12} style={{ transform: showWeights ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {/* KPI Pills - compact 2x2 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
          marginBottom: showWeights && selectedKpis.size >= 2 ? '10px' : '0',
        }}
      >
        {kpiDefs.map((kpi) => {
          const isSelected = selectedKpis.has(kpi.name);

          return (
            <button
              key={kpi.name}
              onClick={() => onKpiToggle(kpi.name)}
              style={{
                padding: '10px 6px',
                borderRadius: '6px',
                border: isSelected ? '2px solid #A100FF' : '2px solid #4A4A4A',
                background: isSelected ? 'rgba(161, 0, 255, 0.15)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                minHeight: '42px',
              }}
              title={isSelected ? 'Deselect KPI' : 'Select KPI'}
            >
              <span style={{ fontSize: '14px' }}>{kpi.icon}</span>
              <span>{kpi.label}</span>
              {isSelected && <span style={{ fontSize: '9px' }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Status line */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          marginBottom: showWeights && selectedKpis.size >= 2 ? '8px' : '0',
          marginTop: selectedKpis.size < 2 ? '6px' : '0',
        }}
      >
        {selectedKpis.size < 2 ? (
          <span style={{ color: '#F59E0B' }}>⚠️ Select ≥2 KPIs</span>
        ) : (
          <span style={{ color: '#22C55E' }}>✓ {selectedKpis.size} KPI selected</span>
        )}
      </div>

      {/* Compact Weightage Panel - only show when expanded */}
      {showWeights && selectedKpis.size >= 2 && (
        <div
          style={{
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid #2A2A2A',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from(selectedKpis).map((kpiName) => {
              const kpi = kpiDefs.find((k) => k.name === kpiName);
              const weight = currentWeights[kpiName] || 25;

              return (
                <div key={kpiName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', minWidth: '55px' }}>
                    {kpi.icon} {kpi.label}
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weight}
                    onChange={(e) => handleWeightChange(kpiName, Number(e.target.value))}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      height: '5px',
                      borderRadius: '2px',
                      background: '#2A2A2A',
                      outline: 'none',
                    }}
                  />

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#A100FF',
                      minWidth: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {normalizedWeights[kpiName] || 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
