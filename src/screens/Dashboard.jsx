import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayLong, getISOWeek, getWeekRangeLabel, getWeekDays } from '../utils/dateUtils';
import {
  Map, ChevronDown, ChevronUp, X, ArrowRight,
  AlertTriangle, Zap, ClipboardList, TrendingDown, Users,
  Activity, CheckSquare, Target, BarChart2,
} from 'lucide-react';
import { kpiColor } from '../data/dealers';
import { dataService } from '../data/dataService';
import { api } from '../services/api';

// ── KPI Strip — computed inside Dashboard from real data ───

// ── Dealer Card ────────────────────────────────────────────
function DealerCard({ dealer, isPlanned, onPostpone, onPlanToday, isDraggable, canPlan, isManager }) {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/dealer/${dealer.id}`);

  const fmt = (v, decimals = 1) =>
    v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(decimals)}%`;

  const kpis = [
    {
      label: 'Purchase Rev vs Target',
      value: fmt(dealer.revenueVsTarget),
      color: dealer.revenueVsTarget == null ? '#606060'
           : dealer.revenueVsTarget >= 0    ? '#22C55E'
           : dealer.revenueVsTarget >= -20  ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'ABC',
      value: dealer.abcSegment || '—',
      color: dealer.abcSegment === 'A' ? '#22C55E'
           : dealer.abcSegment === 'B' ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'Rev YoY',
      value: fmt(dealer.yoyGrowth),
      color: dealer.yoyGrowth == null  ? '#606060'
           : dealer.yoyGrowth >= 0     ? '#22C55E'
           : dealer.yoyGrowth >= -10   ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'Cust MoM',
      value: dealer.customerMoM == null ? '—' : fmt(dealer.customerMoM),
      color: dealer.customerMoM == null ? '#606060'
           : dealer.customerMoM >= 0    ? '#22C55E' : '#EF4444',
    },
  ];

  return (
    <div
      className="card"
      draggable={isDraggable && canPlan && !isManager}
      onDragStart={isDraggable && canPlan && !isManager ? (e) => e.dataTransfer.setData('text/plain', dealer.id) : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '10px',
        transition: 'border-color 0.2s, opacity 0.2s',
        cursor: isDraggable && !isManager ? (canPlan ? 'grab' : 'not-allowed') : 'default',
        opacity: isDraggable && !canPlan && !isManager ? 0.55 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
    >
      {/* Priority bar */}
      <div style={{
        width: '4px', height: '52px', borderRadius: '2px', flexShrink: 0,
        background: dealer.priority === 'HIGH' ? '#EF4444'
                  : dealer.priority === 'MED'  ? '#F59E0B' : '#22C55E',
      }} />

      {/* Name + location */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>
          {dealer.name}
          {dealer.dealer_code && (
            <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>
              ({dealer.dealer_code})
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {dealer.location} · Last visit: {dealer.lastVisit}
        </div>
      </div>

      {/* KPI pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', flexShrink: 0 }}>
        {kpis.map((k) => (
          <div key={k.label} className="kpi-pill">
            <span style={{ color: 'var(--text-secondary)' }}>{k.label}</span>
            <span style={{ color: k.color, fontWeight: '600' }}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {isPlanned ? (
          <button
            onClick={(e) => { e.stopPropagation(); onPostpone?.(dealer.id); }}
            disabled={isManager}
            className="btn-secondary"
            style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '12px', color: isManager ? undefined : 'var(--text-secondary)' }}
          >
            Postpone ↷
          </button>
        ) : onPlanToday ? (
          <button
            onClick={(e) => { e.stopPropagation(); if (canPlan) onPlanToday?.(dealer.id); }}
            disabled={!canPlan || isManager}
            className="btn-secondary"
            title={canPlan ? '' : 'Postpone a visit above to free a slot'}
            style={{
              whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '12px',
              color: canPlan && !isManager ? '#A100FF' : 'var(--text-muted)',
              borderColor: canPlan && !isManager ? 'rgba(161,0,255,0.4)' : 'var(--border)',
              cursor: canPlan && !isManager ? 'pointer' : 'not-allowed',
              opacity: canPlan && !isManager ? 1 : 0.5,
            }}
          >
            + Plan Today
          </button>
        ) : null}
        <button
          onClick={handleClick}
          className={isPlanned ? 'btn-primary' : 'btn-secondary'}
          style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '13px' }}
        >
          {isPlanned ? 'Start Visit →' : 'View Dealership'}
        </button>
      </div>
    </div>
  );
}

// ── This Week's Plan Modal ─────────────────────────────────
const PRIORITY_DOT = { HIGH: '#EF4444', MED: '#F59E0B', LOW: '#22C55E' };

function WeekPlanModal({ onClose, plannedDealers, otherDealers }) {
  const todayDate = new Date().getDate();
  const dow       = new Date().getDay();
  const todayIdx  = (dow >= 1 && dow <= 5) ? dow - 1 : 0;

  // distribute remaining dealers across the 4 non-today weekdays
  const chunk = Math.ceil(otherDealers.length / 4) || 1;
  let slot = 0;
  const days = getWeekDays().map((d, i) => {
    const isToday = d.date === todayDate;
    if (isToday) return { ...d, isToday: true, dealers: plannedDealers };
    const slice = otherDealers.slice(slot * chunk, (slot + 1) * chunk);
    slot++;
    return { ...d, isToday: false, dealers: slice };
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card"
        style={{ width: '560px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              📅 This Week's Plan
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Week {getISOWeek()} · {getWeekRangeLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Day rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {days.map((d) => (
            <div
              key={d.day}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '12px 16px',
                background: d.isToday ? 'rgba(161,0,255,0.08)' : 'var(--surface-raised)',
                border: `1px solid ${d.isToday ? '#A100FF' : 'var(--border)'}`,
                borderRadius: '8px',
              }}
            >
              {/* Day label + date */}
              <div style={{ minWidth: '44px', textAlign: 'center', paddingTop: '2px' }}>
                <div style={{ fontSize: '11px', color: d.isToday ? '#A100FF' : 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.04em' }}>
                  {d.day}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: d.isToday ? '#A100FF' : 'var(--text-primary)', lineHeight: 1.1 }}>
                  {d.date}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', alignSelf: 'stretch', background: d.isToday ? 'rgba(161,0,255,0.3)' : 'var(--border)' }} />

              {/* Dealer list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {d.dealers.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No visits scheduled</span>
                ) : d.dealers.map((dealer) => {
                  const dotColor = PRIORITY_DOT[dealer.priority] || '#A100FF';
                  const revFmt   = dealer.revenueVsTarget == null ? null
                    : `${dealer.revenueVsTarget >= 0 ? '+' : ''}${dealer.revenueVsTarget.toFixed(1)}%`;
                  return (
                    <div key={dealer.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{dealer.name}</span>
                        {(dealer.abcSegment || revFmt) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                            {[dealer.abcSegment && `ABC-${dealer.abcSegment}`, revFmt && `Rev ${revFmt}`].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      {d.isToday && (
                        <span style={{
                          fontSize: '10px', fontWeight: '600', color: dotColor,
                          background: `${dotColor}18`, border: `1px solid ${dotColor}40`,
                          padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap',
                        }}>{dealer.priority}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today badge */}
              {d.isToday && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: '#A100FF',
                  background: 'rgba(161,0,255,0.15)', padding: '3px 10px',
                  borderRadius: '20px', whiteSpace: 'nowrap', alignSelf: 'flex-start',
                }}>
                  Today
                </span>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Germany SVG Map ────────────────────────────────────────
// viewBox 0 0 300 400 — simplified border + city coords
const GERMANY_PATH = 'M115,10 L155,8 L180,12 L237,41 L265,52 L293,62 L290,90 L283,144 L295,178 L300,210 L285,230 L263,251 L268,290 L255,315 L250,333 L240,360 L231,385 L180,392 L125,390 L80,388 L56,385 L50,370 L63,333 L42,318 L36,305 L18,278 L7,256 L10,231 L12,210 L7,185 L7,159 L18,140 L30,115 L43,87 L65,65 L99,56 Z';

// lon/lat → SVG x,y  (viewBox 300×400)
function geoToSVG(lon, lat) {
  return {
    x: ((lon - 5.9) / 9.1) * 300,
    y: ((55.1 - lat) / 7.8) * 400,
  };
}

const MAP_DEALERS = [
  { id: 'alpha-garage',  name: 'Alpha Garage GmbH', city: 'Raderthal',   lon: 6.968, lat: 50.910, priority: 'HIGH', planned: true,  stopNum: 1 },
  { id: 'rhein-auto',    name: 'Rhein Auto GmbH',    city: 'Ossendorf',   lon: 6.919, lat: 50.974, priority: 'MED',  planned: true,  stopNum: 2 },
  { id: 'bavaria-motors',name: 'Bavaria Motors AG',  city: 'Bocklemünd',  lon: 6.874, lat: 50.939, priority: 'MED',  planned: true,  stopNum: 3 },
  { id: 'nord-parts',    name: 'Nord Parts KG',      city: 'Hamburg',     lon: 10.00, lat: 53.55,  priority: 'LOW',  planned: false, stopNum: null },
  { id: 'west-drive',    name: 'West Drive GmbH',    city: 'Frankfurt',   lon: 8.68,  lat: 50.11,  priority: 'MED',  planned: false, stopNum: null },
  { id: 'berlin-auto',   name: 'Berlin Auto Gruppe', city: 'Berlin',      lon: 13.38, lat: 52.52,  priority: 'LOW',  planned: false, stopNum: null },
];

const PRIORITY_COLOR = { HIGH: '#EF4444', MED: '#F59E0B', LOW: '#22C55E' };

// ── Viewbox presets ─────────────────────────────────────────
const VB_GERMANY = { x: 0,  y: 0,   w: 300, h: 400 };  // full Germany
const VB_COLOGNE = { x: 17, y: 199, w: 30,  h: 30  };  // Köln cluster tight

function GermanyMap({ hoveredStop, setHoveredStop }) {
  const [vb, setVb]           = useState(VB_COLOGNE);
  const [dragging, setDragging] = useState(false);
  const lastMouse               = useRef(null);
  const svgRef                  = useRef(null);

  const planned = MAP_DEALERS.filter((d) => d.planned).sort((a, b) => a.stopNum - b.stopNum);
  const routePoints = planned.map((d) => { const { x, y } = geoToSVG(d.lon, d.lat); return `${x},${y}`; }).join(' ');

  // ── zoom helper ──────────────────────────────────────────
  const applyZoom = useCallback((factor, focusX, focusY) => {
    setVb((prev) => {
      const newW = Math.min(VB_GERMANY.w, Math.max(8, prev.w * factor));
      const newH = Math.min(VB_GERMANY.h, Math.max(8, prev.h * factor));
      const cx   = focusX ?? prev.x + prev.w / 2;
      const cy   = focusY ?? prev.y + prev.h / 2;
      const newX = Math.max(0, Math.min(VB_GERMANY.w - newW, cx - newW / 2));
      const newY = Math.max(0, Math.min(VB_GERMANY.h - newH, cy - newH / 2));
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, []);

  // ── scroll-wheel zoom ────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = vb.x + ((e.clientX - rect.left) / rect.width)  * vb.w;
    const fy = vb.y + ((e.clientY - rect.top)  / rect.height) * vb.h;
    applyZoom(e.deltaY > 0 ? 1.25 : 0.8, fx, fy);
  }, [vb, applyZoom]);

  // ── drag-to-pan ──────────────────────────────────────────
  const onMouseDown = (e) => { setDragging(true); lastMouse.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging || !lastMouse.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - lastMouse.current.x) / rect.width  * vb.w;
    const dy = (e.clientY - lastMouse.current.y) / rect.height * vb.h;
    setVb((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(VB_GERMANY.w - prev.w, prev.x - dx)),
      y: Math.max(0, Math.min(VB_GERMANY.h - prev.h, prev.y - dy)),
    }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { setDragging(false); lastMouse.current = null; };

  const isCologne = vb.w < 60;
  // scale = 1 at full Germany view, shrinks as you zoom in
  // multiplying SVG sizes by `scale` keeps them constant in screen-pixels at any zoom
  const scale = vb.w / 300;
  const sw    = (base) => Math.max(0.08, base * scale);   // strokeWidth helper
  const fs    = (base) => base * scale;                    // fontSize helper
  const r     = (base) => Math.max(0.05, base * scale);   // radius helper

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* ── zoom / preset controls ── */}
      <div style={{
        position: 'absolute', top: '8px', right: '10px', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <button onClick={() => applyZoom(0.7)}  title="Zoom in"  style={zoomBtnStyle}>+</button>
        <button onClick={() => applyZoom(1.4)}  title="Zoom out" style={zoomBtnStyle}>−</button>
        <button
          onClick={() => setVb(isCologne ? VB_GERMANY : VB_COLOGNE)}
          title={isCologne ? 'Show full Germany' : 'Focus on Köln'}
          style={{ ...zoomBtnStyle, fontSize: '10px', padding: '5px 6px' }}
        >{isCologne ? '🗺️' : '📍'}</button>
      </div>

      {/* ── SVG ── */}
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ width: '100%', height: '100%', display: 'block', cursor: dragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Germany fill */}
        <path d={GERMANY_PATH} fill="rgba(161,0,255,0.04)" stroke="#2A2A2A" strokeWidth={sw(1.5)} />

        {/* Route dashed line */}
        <polyline points={routePoints} fill="none" stroke="#A100FF"
          strokeWidth={sw(1.5)} strokeDasharray={`${5*scale},${4*scale}`} opacity="0.6" />

        {/* Route arrows mid-segment */}
        {planned.slice(0, -1).map((d, i) => {
          const p1 = geoToSVG(d.lon, d.lat);
          const p2 = geoToSVG(planned[i + 1].lon, planned[i + 1].lat);
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
          return (
            <text key={i} x={mx} y={my} textAnchor="middle" dominantBaseline="middle"
              fontSize={fs(10)} fill="#A100FF" opacity="0.7"
              transform={`rotate(${angle},${mx},${my})`}>›</text>
          );
        })}

        {/* Non-planned dealers */}
        {MAP_DEALERS.filter((d) => !d.planned).map((d) => {
          const { x, y } = geoToSVG(d.lon, d.lat);
          return (
            <g key={d.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredStop(d.id)}
              onMouseLeave={() => setHoveredStop(null)}>
              <circle cx={x} cy={y} r={r(5)}   fill="#1C1C1C" stroke="#3A3A3A" strokeWidth={sw(1)} />
              <circle cx={x} cy={y} r={r(2.5)} fill="#A0A0A0" opacity="0.6" />
              <text x={x + 7*scale} y={y + scale} fontSize={fs(8)} fill="#606060" dominantBaseline="middle">{d.city}</text>
            </g>
          );
        })}

        {/* Planned stop dealers */}
        {planned.map((d) => {
          const { x, y } = geoToSVG(d.lon, d.lat);
          const col   = PRIORITY_COLOR[d.priority];
          const isHov = hoveredStop === d.id;
          // In Köln view spread pins so they don't overlap; offset scales with zoom
          const clusterOffsets = [
            { dx: 0,         dy: -20 * scale },
            { dx: -17*scale, dy:  14 * scale },
            { dx:  17*scale, dy:  14 * scale },
          ];
          const off = isCologne ? clusterOffsets[d.stopNum - 1] : { dx: 0, dy: 0 };
          const px = x + off.dx;
          const py = y + off.dy;
          return (
            <g key={d.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredStop(d.id)}
              onMouseLeave={() => setHoveredStop(null)}>
              {/* Connector line from real coords to spread pin */}
              {isCologne && (
                <line x1={x} y1={y} x2={px} y2={py} stroke={col}
                  strokeWidth={sw(0.6)} strokeDasharray={`${1.5*scale},${scale}`} opacity="0.4" />
              )}
              {/* Pulse ring */}
              <circle cx={px} cy={py} r={r(isHov ? 20 : 14)} fill={col}
                opacity={isHov ? 0.12 : 0.08} style={{ transition: 'r 0.2s' }} />
              {/* Outer ring */}
              <circle cx={px} cy={py} r={r(9)}   fill="#0A0A0A" stroke={col} strokeWidth={sw(1.5)} />
              {/* Inner dot */}
              <circle cx={px} cy={py} r={r(4)}   fill={col} />
              {/* Stop number */}
              <text x={px} y={py + 0.5*scale} textAnchor="middle" dominantBaseline="middle"
                fontSize={fs(6)} fontWeight="700" fill="#FFFFFF">{d.stopNum}</text>
              {/* City label */}
              <text x={px + 13*scale} y={py + scale} fontSize={fs(9)} fontWeight="600" fill="#FFFFFF"
                dominantBaseline="middle" style={{ filter: 'drop-shadow(0 1px 2px #000)' }}>{d.city}</text>
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect x={px - 60*scale} y={py - 46*scale} width={120*scale} height={38*scale}
                    rx={5*scale} fill="#141414" stroke={col} strokeWidth={sw(1)} />
                  <text x={px} y={py - 32*scale} textAnchor="middle" fontSize={fs(8.5)} fontWeight="700" fill="#FFFFFF">{d.name}</text>
                  <text x={px} y={py - 20*scale} textAnchor="middle" fontSize={fs(7.5)} fill="#A0A0A0">Stop {d.stopNum} · {d.priority} priority</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Legend — pinned to bottom-left of viewBox, scales with zoom */}
        <g>
          <rect x={vb.x + scale} y={vb.y + vb.h - 16*scale} width={54*scale} height={13*scale}
            rx={1.5*scale} fill="#0A0A0A" stroke="#2A2A2A" strokeWidth={sw(0.4)} opacity="0.9" />
          <circle cx={vb.x + 4*scale}  cy={vb.y + vb.h - 10*scale} r={r(4)}   fill="#EF4444" />
          <text   x={vb.x + 8*scale}   y={vb.y + vb.h - 10*scale}  fontSize={fs(7.5)} fill="#A0A0A0" dominantBaseline="middle">Planned today</text>
          <circle cx={vb.x + 30*scale} cy={vb.y + vb.h - 10*scale} r={r(3)}   fill="#A0A0A0" opacity="0.5" />
          <text   x={vb.x + 34*scale}  y={vb.y + vb.h - 10*scale}  fontSize={fs(7.5)} fill="#A0A0A0" dominantBaseline="middle">Other</text>
        </g>
      </svg>
    </div>
  );
}

const zoomBtnStyle = {
  background: 'rgba(20,20,20,0.92)',
  border: '1px solid #3A3A3A',
  color: 'var(--text-primary)',
  borderRadius: '5px',
  width: '26px',
  height: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '700',
  lineHeight: 1,
  userSelect: 'none',
  backdropFilter: 'blur(4px)',
  padding: 0,
};

// ── Plan My Day Modal ──────────────────────────────────────
function PlanMyDayModal({ onClose }) {
  const [hoveredStop, setHoveredStop] = useState(null);

  const stops = [
    {
      id: 'alpha-garage',
      num: 1,
      name: 'Alpha Garage GmbH',
      city: 'Raderthalgürtel 1A, Köln',
      priority: 'HIGH',
      arrive: '9:00 AM',
      depart: '11:00 AM',
      duration: '2 hr visit',
      focus: 'PL24 credentials + AOS basket correction',
      actions: 3,
      kpis: [
        { label: 'Sales', value: '62%', metric: 'salesVsTarget' },
        { label: 'PL24',  value: '44%', metric: 'pl24Adoption' },
        { label: 'AOS',   value: '71%', metric: 'aosAdoption' },
        { label: 'DB%',   value: '18.2%', metric: 'dbMargin' },
      ],
      drive: { time: '20 min', dist: '14 km', note: null },
    },
    {
      id: 'rhein-auto',
      num: 2,
      name: 'Rhein Auto GmbH',
      city: 'Robert-Perthel-Str. 1, Köln',
      priority: 'MED',
      arrive: '11:20 AM',
      depart: '1:20 PM',
      duration: '2 hr visit',
      focus: 'Training & capability gaps + parts basket alignment',
      actions: 2,
      kpis: [
        { label: 'Sales', value: '74%', metric: 'salesVsTarget' },
        { label: 'PL24',  value: '61%', metric: 'pl24Adoption' },
        { label: 'AOS',   value: '68%', metric: 'aosAdoption' },
        { label: 'DB%',   value: '19.5%', metric: 'dbMargin' },
      ],
      drive: { time: '15 min', dist: '9 km', note: '🍽️ Lunch break recommended 1:20–2:00 PM before final stop' },
    },
    {
      id: 'bavaria-motors',
      num: 3,
      name: 'Bavaria Motors AG',
      city: 'Bayerische Allee 1, Köln',
      priority: 'MED',
      arrive: '2:15 PM',
      depart: '3:45 PM',
      duration: '1.5 hr check-in',
      focus: 'AOS adoption maintenance + IR programme review',
      actions: 1,
      kpis: [
        { label: 'Sales', value: '88%', metric: 'salesVsTarget' },
        { label: 'PL24',  value: '79%', metric: 'pl24Adoption' },
        { label: 'AOS',   value: '85%', metric: 'aosAdoption' },
        { label: 'DB%',   value: '22.1%', metric: 'dbMargin' },
      ],
      drive: null,
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '900px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(161,0,255,0.06), transparent)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🗺️ Plan My Day — Optimised Route
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {getTodayLong()} · 3 stops · ~23 km · Est. 6h 15min total (driving + visits) · All within Cologne
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Summary pills */}
            {[
              { label: '3 Planned Stops', color: '#A100FF', bg: 'rgba(161,0,255,0.1)' },
              { label: '5.5h Visits', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
              { label: '6 Open Actions', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
            ].map((p) => (
              <span key={p.label} style={{
                fontSize: '11px', fontWeight: '600', color: p.color,
                background: p.bg, border: `1px solid ${p.color}40`,
                borderRadius: '20px', padding: '3px 10px',
              }}>{p.label}</span>
            ))}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', marginLeft: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body: two panels ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT — Route timeline */}
          <div style={{
            width: '360px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '20px',
          }}>
            {/* Depart chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: '600' }}>Depart Office — 8:15 AM</span>
            </div>
            <div style={{ width: '2px', height: '12px', background: '#2A2A2A', marginLeft: '4px', marginBottom: '4px' }} />

            {stops.map((stop, i) => {
              const pColor = PRIORITY_COLOR[stop.priority];
              const isHov = hoveredStop === stop.id;
              return (
                <div key={stop.id}>
                  {/* Stop card */}
                  <div
                    onMouseEnter={() => setHoveredStop(stop.id)}
                    onMouseLeave={() => setHoveredStop(null)}
                    style={{
                      background: isHov ? '#1C1C1C' : '#181818',
                      border: `1px solid ${isHov ? pColor + '60' : '#2A2A2A'}`,
                      borderLeft: `3px solid ${pColor}`,
                      borderRadius: '8px',
                      padding: '14px',
                      transition: 'all 0.18s',
                      cursor: 'default',
                    }}
                  >
                    {/* Stop header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: `${pColor}22`, border: `1.5px solid ${pColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '700', color: pColor, flexShrink: 0,
                      }}>{stop.num}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>{stop.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{stop.city}</div>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: '700',
                        color: pColor, background: `${pColor}18`,
                        border: `1px solid ${pColor}40`,
                        borderRadius: '4px', padding: '2px 7px', flexShrink: 0,
                      }}>{stop.priority}</span>
                    </div>

                    {/* Time bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'var(--bg)', borderRadius: '6px', padding: '7px 10px',
                      marginBottom: '10px',
                    }}>
                      <span style={{ fontSize: '12px', color: '#A100FF', fontWeight: '600' }}>⏰ {stop.arrive}</span>
                      <span style={{ fontSize: '11px', color: '#3A3A3A' }}>──────</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{stop.duration}</span>
                      <span style={{ fontSize: '11px', color: '#3A3A3A' }}>──────</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>🔔 {stop.depart}</span>
                    </div>

                    {/* Focus */}
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Today's Focus  </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{stop.focus}</span>
                    </div>

                    {/* KPI pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {stop.kpis.map((k) => (
                        <div key={k.label} className="kpi-pill" style={{ padding: '3px 8px', fontSize: '11px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{k.label} </span>
                          <span style={{ color: kpiColor(k.metric, k.value), fontWeight: '700' }}>{k.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '2px 8px',
                      }}>
                        {stop.actions} open action{stop.actions !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Drive connector */}
                  {stop.drive && (
                    <div style={{ padding: '8px 0 8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px' }}>
                          <div style={{ width: '2px', height: '10px', background: '#2A2A2A' }} />
                          <span style={{ fontSize: '14px' }}>🚗</span>
                          <div style={{ width: '2px', height: '10px', background: '#2A2A2A' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {stop.drive.time} · {stop.drive.dist}
                          </div>
                          {stop.drive.note && (
                            <div style={{
                              marginTop: '5px', padding: '5px 10px',
                              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                              borderRadius: '4px', fontSize: '11px', color: '#F59E0B',
                            }}>{stop.drive.note}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* End chip */}
            <div style={{ width: '2px', height: '12px', background: '#2A2A2A', marginLeft: '4px', marginTop: '4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#A0A0A0', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All stops complete · Return to base</span>
            </div>

            {/* CTA */}
            <button onClick={onClose} className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '12px', fontSize: '14px' }}>
              Start Day — Navigate to Stop 1 →
            </button>
          </div>

          {/* RIGHT — Map */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg)',
            position: 'relative',
          }}>
            {/* Map label */}
            <div style={{
              position: 'absolute', top: '14px', left: '16px', zIndex: 2,
              fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              background: 'rgba(10,10,10,0.8)', padding: '4px 10px', borderRadius: '4px',
              border: '1px solid var(--border)',
            }}>
              Cologne / NRW · Today's Route
            </div>

            {/* Distance summary strip */}
            <div style={{
              position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 2, display: 'flex', gap: '8px',
            }}>
              {[
                { label: 'Total Distance', value: '~23 km' },
                { label: 'Drive Time', value: '~35 min' },
                { label: 'Visit Time', value: '5h 30min' },
              ].map((s) => (
                <div key={s.label} style={{
                  background: 'rgba(20,20,20,0.92)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '6px 12px', textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* SVG Map */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px 60px' }}>
              <GermanyMap hoveredStop={hoveredStop} setHoveredStop={setHoveredStop} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Suggestion Card ─────────────────────────────────────
function AISuggestionCard({ icon, title, desc, detail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.2s', flex: 1 }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#A100FF')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
    >
      <div style={{ fontSize: '22px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</div>
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--surface-raised)',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            borderLeft: '3px solid #A100FF',
          }}
        >
          {detail}
        </div>
      )}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: '#A100FF' }}>{expanded ? 'Collapse' : 'View detail'}</span>
        {expanded ? <ChevronUp size={12} color="#A100FF" /> : <ChevronDown size={12} color="#A100FF" />}
      </div>
    </div>
  );
}

// ── Priority Dealer Row ────────────────────────────────────
// target_achievement_pct = (actual−target)/target×100  → negative = under target
// dormancy_risk = derived label (HIGH/MED/LOW), dormancy_score = raw 0–100
function PriorityDealerRow({ dealer, rank }) {
  const navigate   = useNavigate();
  // 55 accounts: top 3 = red, 4-12 = amber, rest = green
  const rankColor  = rank <= 3 ? '#EF4444' : rank <= 12 ? '#F59E0B' : '#22C55E';
  const borderBase = rank <= 3 ? 'rgba(239,68,68,0.2)' : rank <= 12 ? 'rgba(245,158,11,0.12)' : '#1C1C1C';

  // "Why visit" tags — thresholds calibrated to real data ranges
  const reasons = [];
  if (dealer.target_achievement_pct < -20)
    reasons.push({ label: 'Revenue Gap',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)' });
  if (dealer.dormancy_risk === 'HIGH')
    reasons.push({ label: 'Churn Risk',    color: '#EF4444', bg: 'rgba(239,68,68,0.1)' });
  else if (dealer.dormancy_risk === 'MED')
    reasons.push({ label: 'Watch',         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' });
  if (dealer.yoy_growth_pct < -10)
    reasons.push({ label: 'Declining YoY', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' });
  if (dealer.cadence_overdue_ratio > 1)
    reasons.push({ label: 'Overdue',       color: '#A100FF', bg: 'rgba(161,0,255,0.1)' });
  if (dealer.opportunity_score > 70 && reasons.length < 2)
    reasons.push({ label: 'High Opp',      color: '#22C55E', bg: 'rgba(34,197,94,0.1)' });

  // Colour thresholds: achievement is (actual-target)/target*100 — negative means under target
  const revColor  = dealer.target_achievement_pct >= 0 ? '#22C55E' : dealer.target_achievement_pct >= -20 ? '#F59E0B' : '#EF4444';
  const yoyColor  = dealer.yoy_growth_pct >= 0 ? '#22C55E' : dealer.yoy_growth_pct >= -10 ? '#F59E0B' : '#EF4444';
  const oppColor  = dealer.opportunity_score >= 70 ? '#22C55E' : dealer.opportunity_score >= 40 ? '#F59E0B' : '#A0A0A0';
  // dayColor based on cadence overdue ratio: red ≥ 2×, amber ≥ 1.25×, green otherwise
  const dayColor  = dealer.cadence_overdue_ratio >= 2 ? '#EF4444' : dealer.cadence_overdue_ratio >= 1.25 ? '#F59E0B' : '#22C55E';
  const dormColor = dealer.dormancy_risk === 'HIGH' ? '#EF4444' : dealer.dormancy_risk === 'MED' ? '#F59E0B' : '#22C55E';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 160px 90px 70px 90px 82px 72px 72px',
        gap: '8px',
        alignItems: 'center',
        padding: '13px 16px',
        background: 'var(--surface)',
        border: `1px solid ${borderBase}`,
        borderLeft: `3px solid ${rankColor}`,
        borderRadius: '8px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onClick={() => navigate(`/dealer/${dealer.account_id}`)}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#1A1A1A'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#141414'; }}
    >
      {/* Rank badge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: `${rankColor}18`, border: `1.5px solid ${rankColor}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', color: rankColor,
        }}>{rank}</div>
      </div>

      {/* Account info */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {dealer.name}
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: '700', color: '#A100FF',
            background: 'rgba(161,0,255,0.12)', border: '1px solid rgba(161,0,255,0.25)',
            borderRadius: '3px', padding: '1px 5px',
          }}>ABC-{dealer.abc_segment}</span>
          <span style={{
            fontSize: '10px', fontWeight: '600',
            color: dealer.account_type === 'Dealer' ? '#60A5FA' : '#34D399',
            background: dealer.account_type === 'Dealer' ? 'rgba(96,165,250,0.1)' : 'rgba(52,211,153,0.1)',
            border: dealer.account_type === 'Dealer' ? '1px solid rgba(96,165,250,0.25)' : '1px solid rgba(52,211,153,0.25)',
            borderRadius: '3px', padding: '1px 5px',
          }}>{dealer.account_type}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dealer.region}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {dealer.active_clients_irs} clients</span>
          {dealer.open_actions > 0 && (
            <span style={{
              fontSize: '10px', color: '#F59E0B',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '3px', padding: '1px 5px',
            }}>{dealer.open_actions} action{dealer.open_actions !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Why visit tags */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {reasons.slice(0, 2).map((r) => (
          <span key={r.label} style={{
            fontSize: '10px', fontWeight: '600', color: r.color,
            background: r.bg, border: `1px solid ${r.color}40`,
            borderRadius: '3px', padding: '2px 7px', whiteSpace: 'nowrap',
          }}>{r.label}</span>
        ))}
      </div>

      {/* Revenue vs Target — (actual-target)/target*100; negative = under target */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: revColor }}>
          {dealer.target_achievement_pct >= 0 ? '+' : ''}{dealer.target_achievement_pct}%
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>vs target</div>
      </div>

      {/* YoY */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: yoyColor }}>
          {dealer.yoy_growth_pct >= 0 ? '+' : ''}{dealer.yoy_growth_pct}%
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>YoY</div>
      </div>

      {/* Dormancy — label + raw 0-100 score */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: dormColor }}>{dealer.dormancy_risk}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dealer.dormancy_score} / 100</div>
      </div>

      {/* Opportunity Score */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: oppColor }}>{dealer.opportunity_score}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>opp score</div>
      </div>

      {/* Days since visit + cadence adherence */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: dayColor }}>{dealer.last_visit_days}d</div>
        <div style={{ fontSize: '10px', color: dayColor }}>
          {dealer.cadence_overdue_ratio >= 2
            ? `${dealer.cadence_overdue_ratio}× overdue`
            : dealer.cadence_overdue_ratio > 1
            ? `${dealer.cadence_overdue_ratio}× cadence`
            : 'on schedule'}
        </div>
      </div>

      {/* Cadence */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{dealer.visit_cadence_per_qtr}/qtr</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>cadence</div>
      </div>
    </div>
  );
}

// ── KPI Info Tooltip ──────────────────────────────────────
function KpiInfoTooltip({ rows, columns }) {
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span style={{ cursor: 'help', fontSize: '12px', color: '#505050', marginLeft: '5px' }}>ⓘ</span>
      {open && (
        <div style={{
          position: 'absolute', top: '18px', left: '0', zIndex: 9999,
          background: 'var(--surface-raised)', border: '1px solid #3A3A3A', borderRadius: '8px',
          padding: '10px 12px', minWidth: '310px', maxHeight: '220px', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.85)', fontSize: '11px', lineHeight: 1.5,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' '),
            gap: '0 10px', color: '#555', fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            paddingBottom: '5px', borderBottom: '1px solid var(--border)', marginBottom: '4px',
          }}>
            {columns.map((c) => <div key={c.key}>{c.label}</div>)}
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: columns.map((c) => c.width || '1fr').join(' '),
              gap: '0 10px', padding: '3px 0',
              borderBottom: i < rows.length - 1 ? '1px solid #222' : 'none',
            }}>
              {columns.map((c) => (
                <div key={c.key} style={{
                  color: c.color ? c.color(row) : '#B0B0B0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.render ? c.render(row) : row[c.key]}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

// ── Prioritization View ────────────────────────────────────
function PrioritizationView({ accountFilter, showAll, setShowAll }) {
  const allDealers = dataService.getPrioritizedDealers();

  const [abcApiData,    setAbcApiData]    = useState(null);
  const [abcApiLoading, setAbcApiLoading] = useState(true);
  const [abcApiError,   setAbcApiError]   = useState(null);

  useEffect(() => {
    api.getAbcSegmentation()
      .then((data) => {
        console.log('[ABC Segmentation API] response:', data);
        setAbcApiData(data);
      })
      .catch((err) => {
        console.error('[ABC Segmentation API] error:', err);
        setAbcApiError(err.message);
      })
      .finally(() => setAbcApiLoading(false));
  }, []);

  // Filter by account type, then slice for pagination
  const filtered  = accountFilter === 'all' ? allDealers : allDealers.filter((d) => d.account_type === accountFilter);
  const displayed = showAll ? filtered : filtered.slice(0, 15);

  // Territory-level KPIs — only under-target accounts contribute to the gap
  const underTarget  = allDealers.filter((d) => d.revenue_actual < d.revenue_target);
  const totalGap     = underTarget.reduce((s, d) => s + (d.revenue_target - d.revenue_actual), 0);
  const riskCount    = allDealers.filter((d) => d.dormancy_risk !== 'LOW').length;
  const avgOpp       = Math.round(allDealers.reduce((s, d) => s + d.opportunity_score, 0) / allDealers.length);
  const overdueCount = allDealers.filter((d) => d.cadence_overdue_ratio > 1).length;

  // Currency formatter: ≥1M → €X.XM, else €XXXK
  const fmt = (n) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : `€${Math.round(n / 1000)}K`;

  // Build abcGroups: prefer live API data, fall back to CSV
  // API response shape: { processed_at, abc_segmentation: { segment_A: [...], segment_B: [...], segment_C: [...], all_dealers: [...], total_dealers: N } }
  const abcSeg     = abcApiData?.abc_segmentation;
  const abcFromApi = !abcApiLoading && !abcApiError && abcSeg != null;
  const abcGroups  = abcFromApi
    ? { A: abcSeg.segment_A || [], B: abcSeg.segment_B || [], C: abcSeg.segment_C || [] }
    : (() => {
        const g = { A: [], B: [], C: [] };
        allDealers.forEach((d) => { if (g[d.abc_segment]) g[d.abc_segment].push(d); });
        return g;
      })();

  // Revenue field: API uses ytd_sales_eur; CSV fallback uses revenue_actual
  const abcRevenue = (seg) => abcGroups[seg].reduce((s, d) => {
    const rev = d.ytd_sales_eur ?? d.revenue_actual ?? d.revenue ?? 0;
    return s + (typeof rev === 'number' ? rev : parseFloat(rev) || 0);
  }, 0);

  const abcMeta = {
    A: { color: '#22C55E', desc: 'Top revenue — protect & grow' },
    B: { color: '#F59E0B', desc: 'Mid-tier — develop & move up' },
    C: { color: '#EF4444', desc: 'Low contribution — qualify or churn' },
  };

  // ── Campaign adoption aggregation (dealer-campaigns.csv) ──
  const allCampaigns = dataService.getCampaigns();
  const activeCampsByAccount = {};
  allCampaigns
    .filter((c) => c.campaign_status === 'Active')
    .forEach((c) => {
      if (!activeCampsByAccount[c.account_id]) activeCampsByAccount[c.account_id] = [];
      activeCampsByAccount[c.account_id].push(c);
    });
  const accountsWithActiveCamps = Object.entries(activeCampsByAccount).map(([id, camps]) => {
    const kpiRow = allDealers.find((d) => d.account_id === id);
    return {
      account_id:   id,
      account_type: camps[0].account_type,
      region:       kpiRow?.region || '—',
      campaignCount: camps.length,
      avgAdoption:  Math.round(camps.reduce((s, c) => s + parseFloat(c.campaign_adoption_pct), 0) / camps.length),
      avgRoi:       Math.round(camps.reduce((s, c) => s + parseFloat(c.roi_multiplier), 0) / camps.length * 10) / 10,
    };
  });
  const lowAdoptionAccts = accountsWithActiveCamps
    .filter((a) => a.avgAdoption < 30)
    .sort((a, b) => a.avgAdoption - b.avgAdoption);

  // ── Tooltip column definitions ─────────────────────────────
  const revenueGapRows = [...underTarget]
    .sort((a, b) => (b.revenue_target - b.revenue_actual) - (a.revenue_target - a.revenue_actual));
  const dormancyRows   = allDealers
    .filter((d) => d.dormancy_risk !== 'LOW')
    .sort((a, b) => b.dormancy_score - a.dormancy_score);
  const overdueRows    = allDealers
    .filter((d) => d.cadence_overdue_ratio > 1)
    .sort((a, b) => b.cadence_overdue_ratio - a.cadence_overdue_ratio);
  const topOppRows     = [...allDealers]
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 12);

  const summaryKpis = [
    {
      label: 'Revenue Gap (Under-Target)', value: fmt(totalGap),
      sub: `${underTarget.length} of ${allDealers.length} accounts below target`, subColor: '#EF4444',
      icon: <TrendingDown size={22} color="#A100FF" />,
      tooltipRows: revenueGapRows,
      tooltipColumns: [
        { key: 'account_id',   label: 'Account', width: '65px' },
        { key: 'region',       label: 'Region',  width: '55px' },
        { key: 'account_type', label: 'Type',    width: '48px' },
        { key: '_gap', label: 'Gap', width: '68px',
          color: () => '#EF4444',
          render: (r) => fmt(r.revenue_target - r.revenue_actual) },
      ],
    },
    {
      label: 'Churn / Dormancy Risk', value: `${riskCount} Accounts`,
      sub: `${allDealers.filter((d) => d.dormancy_risk === 'HIGH').length} HIGH · ${allDealers.filter((d) => d.dormancy_risk === 'MED').length} MED`,
      subColor: '#EF4444', icon: <AlertTriangle size={22} color="#A100FF" />,
      tooltipRows: dormancyRows,
      tooltipColumns: [
        { key: 'account_id',    label: 'Account', width: '65px' },
        { key: 'region',        label: 'Region',  width: '55px' },
        { key: 'dormancy_risk', label: 'Risk',    width: '42px',
          color: (r) => r.dormancy_risk === 'HIGH' ? '#EF4444' : '#F59E0B' },
        { key: 'dormancy_score', label: 'Score',  width: '48px',
          color: (r) => r.dormancy_risk === 'HIGH' ? '#EF4444' : '#F59E0B' },
      ],
    },
    {
      label: 'Avg Opportunity Score', value: `${avgOpp} / 100`,
      sub: `Top 12 accounts shown`, subColor: '#F59E0B',
      icon: <Zap size={22} color="#A100FF" />,
      tooltipRows: topOppRows,
      tooltipColumns: [
        { key: 'account_id',      label: 'Account', width: '65px' },
        { key: 'region',          label: 'Region',  width: '55px' },
        { key: 'abc_segment',     label: 'ABC',     width: '35px' },
        { key: 'opportunity_score', label: 'Score', width: '48px',
          color: (r) => r.opportunity_score >= 70 ? '#22C55E' : '#F59E0B' },
      ],
    },
    {
      label: 'Overdue Visits', value: `${overdueCount} Accounts`,
      sub: 'Behind expected visit cadence', subColor: '#F59E0B',
      icon: <ClipboardList size={22} color="#A100FF" />,
      tooltipRows: overdueRows,
      tooltipColumns: [
        { key: 'account_id',           label: 'Account',   width: '65px' },
        { key: 'region',               label: 'Region',    width: '55px' },
        { key: 'last_visit_days',      label: 'Days',      width: '42px',
          color: () => '#F59E0B', render: (r) => `${r.last_visit_days}d` },
        { key: 'cadence_overdue_ratio', label: 'Overdue',  width: '55px',
          color: (r) => r.cadence_overdue_ratio >= 2 ? '#EF4444' : '#F59E0B',
          render: (r) => `${r.cadence_overdue_ratio}×` },
      ],
    },
    {
      label: 'Low Campaign Adoption', value: `${lowAdoptionAccts.length} Accounts`,
      sub: 'Active campaigns < 30% adoption', subColor: '#F59E0B',
      icon: <Activity size={22} color="#A100FF" />,
      tooltipRows: lowAdoptionAccts,
      tooltipColumns: [
        { key: 'account_id',   label: 'Account',  width: '65px' },
        { key: 'region',       label: 'Region',   width: '55px' },
        { key: 'avgAdoption',  label: 'Adoption', width: '58px',
          color: () => '#F59E0B', render: (r) => `${r.avgAdoption}%` },
        { key: 'avgRoi',       label: 'Avg ROI',  width: '52px',
          color: (r) => r.avgRoi >= 5 ? '#22C55E' : '#A0A0A0',
          render: (r) => `${r.avgRoi}×` },
      ],
    },
  ];

  return (
    <div>
      {/* KPI source banner */}
      <div style={{
        background: 'rgba(161,0,255,0.05)', border: '1px solid rgba(161,0,255,0.2)',
        borderRadius: '8px', padding: '11px 16px', marginBottom: '20px',
        display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '11px', color: '#A100FF', fontWeight: '700', whiteSpace: 'nowrap', paddingTop: '1px' }}>
          Intelligent Planning · Decide who to visit
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>dealer_ir_kpi_master (Excel 3):</span>
            {' '}Revenue vs Target · ABC Segment · Dormancy Risk (0–100) · Opportunity Score · Visit Cadence · Active Clients · YoY Growth
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>dealer_ir_parts_sales (Excel 2):</span>
            {' '}Parts growth YoY · Category share of wallet · Cross-sell opportunity score
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>dealer_ir_campaigns_incentives (Excel 1):</span>
            {' '}Campaign adoption · ROI multiplier · Active campaign status
          </div>
        </div>
      </div>

      {/* Territory summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {summaryKpis.map((k) => (
          <div key={k.label} className="card" style={{ textAlign: 'left', overflow: 'visible' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.4, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                {k.label}
                <KpiInfoTooltip rows={k.tooltipRows} columns={k.tooltipColumns} />
              </span>
              {k.icon}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: k.subColor, marginTop: '6px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ABC segment breakdown — counts + totals (55 accounts, names would overflow) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>ABC Segment Breakdown</span>
        {abcApiLoading && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Loading from API…</span>}
        {!abcApiLoading && abcFromApi && (
          <span style={{ fontSize: '10px', color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '3px', padding: '1px 6px' }}>
            Live · AWS API
          </span>
        )}
        {!abcApiLoading && abcApiError && (
          <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '3px', padding: '1px 6px' }}>
            Fallback · CSV ({abcApiError})
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {['A', 'B', 'C'].map((seg) => {
          const group = abcGroups[seg];
          const { color, desc } = abcMeta[seg];
          // dormancy_risk only exists in CSV data; API data won't have it
          const highCount = abcFromApi ? 0 : group.filter((d) => d.dormancy_risk === 'HIGH').length;
          // API data: show top country by dealer count
          const topCountry = abcFromApi
            ? (() => {
                const counts = {};
                group.forEach((d) => { counts[d.country] = (counts[d.country] || 0) + 1; });
                return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
              })()
            : null;
          return (
            <div key={seg} style={{
              background: 'var(--surface)', border: `1px solid ${color}25`,
              borderLeft: `3px solid ${color}`, borderRadius: '8px',
              padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '11px', color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  ABC-{seg} — {desc}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1, marginBottom: '4px' }}>
                  {group.length} accounts
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {fmt(abcRevenue(seg))} YTD revenue
                  {highCount > 0 && <span style={{ color: '#EF4444', marginLeft: '6px' }}>· {highCount} HIGH risk</span>}
                  {topCountry && <span style={{ marginLeft: '6px' }}>· top: {topCountry}</span>}
                </div>
              </div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: `${color}15`, border: `2px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '800', color, flexShrink: 0,
              }}>{seg}</div>
            </div>
          );
        })}
      </div>

      {/* Priority ranking header */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px' }}>
          Account Priority Ranking
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Score: Revenue Gap (35%) · Dormancy 0–100 (25%) · Opportunity (20%) · YoY Decline (10%) · Visit Overdue (10%)
        </div>
      </div>

      {/* Column headers — match row grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 160px 90px 70px 90px 82px 72px 72px',
        gap: '8px', padding: '0 16px 8px',
        fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: '1px solid var(--border)', marginBottom: '8px',
      }}>
        <div>Rank</div>
        <div>Account</div>
        <div>Why Visit</div>
        <div style={{ textAlign: 'center' }}>vs Target</div>
        <div style={{ textAlign: 'center' }}>YoY</div>
        <div style={{ textAlign: 'center' }}>Dormancy</div>
        <div style={{ textAlign: 'center' }}>Opp Score</div>
        <div style={{ textAlign: 'center' }}>Last Visit</div>
        <div style={{ textAlign: 'center' }}>Cadence</div>
      </div>

      {displayed.map((d, i) => <PriorityDealerRow key={d.account_id} dealer={d} rank={i + 1} />)}

      {/* Show all / collapse toggle */}
      {filtered.length > 15 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%', marginTop: '4px', padding: '10px',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: '6px', color: '#A100FF', fontSize: '13px',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
          }}
        >
          {showAll ? `Show top 15 only ▲` : `Show all ${filtered.length} accounts ▼`}
        </button>
      )}

      {/* Data source footnote */}
      <div style={{
        marginTop: '20px', padding: '10px 14px',
        background: '#0F0F0F', border: '1px solid #1C1C1C',
        borderRadius: '6px', fontSize: '11px', color: '#404040',
      }}>
        Sources: planning-kpis.csv (dealer_ir_kpi_master, Excel 3) · parts-growth.csv (dealer_ir_parts_sales, Excel 2) · dealer-campaigns.csv (Excel 1, loaded / not yet rendered here) · Scope: Slide 3 Intelligent Planning + Slide 5 Decide who to visit
      </div>
    </div>
  );
}

// ── Normalize raw API dealer to DealerCard shape ──────────
// The GET /dealers KPI structure varies per dealer:
//   - Some have abc_segmentation: { segment, ytd_sales_eur, country, quantile }
//   - Others have abc_segmentation: { M1_Target, M2_Target, M3_Target, QTD_Target } (revenue targets)
//   - revenue_vs_target may be absent (targets stored inside abc_segmentation instead)
function normalizeApiDealer(raw) {
  const kpis        = raw.kpis || {};
  const abc         = kpis.abc_segmentation           || {};
  const purchaseRvt = kpis.purchase_revenue_vs_target || {};
  const saleRvt     = kpis.sale_revenue_vs_target     || {};
  const ryoy        = kpis.revenue_yoy                || {};
  const yoyComp     = kpis.yoy_comparison             || {};
  const custTrend   = kpis.customer_trend             || {};

  // Individual achievement %s kept for the OR filter in recommendations
  const purchaseAchvPct = purchaseRvt.M2_AchvPct ?? null;
  const saleAchvPct     = saleRvt.M2_AchvPct     ?? null;

  // Revenue vs Target: purchase data only — shows — when purchase data is absent
  const rvt        = purchaseRvt;
  const targetType = 'purchase';

  const abcSegment = abc.segment || null;
  const m2Target   = rvt.M2_Target  ?? abc.M2_Target  ?? null;
  const m2Actual   = rvt.M2_Actual  ?? abc.M2_Actual  ?? null;
  const m2AchvPct  = rvt.M2_AchvPct ?? abc.M2_AchvPct ?? null;
  const qtdTarget  = rvt.QTD_Target ?? abc.QTD_Target ?? null;

  let revenueVsTarget = null;
  if (m2AchvPct != null) {
    revenueVsTarget = Math.round((m2AchvPct - 100) * 10) / 10;
  } else if (m2Actual != null && m2Target != null && m2Target !== 0) {
    revenueVsTarget = Math.round((m2Actual / m2Target - 1) * 100 * 10) / 10;
  }

  let yoyGrowth = null;
  if (ryoy.cy_revenue_eur > 0 && ryoy.ly_revenue_eur > 0) {
    yoyGrowth = Math.round((ryoy.cy_revenue_eur / ryoy.ly_revenue_eur - 1) * 100 * 10) / 10;
  }

  // Customer MoM: % change from second-to-last → last month in customer_count_apr_may_jun
  let customerMoM = null;
  const cStr = custTrend.customer_count_apr_may_jun;
  if (cStr) {
    const nums = cStr.split(',').map((v) => parseInt(v.trim(), 10)).filter((v) => !isNaN(v));
    if (nums.length >= 2) {
      const prev = nums[nums.length - 2];
      const curr = nums[nums.length - 1];
      if (prev !== 0) {
        customerMoM = Math.round((curr - prev) / prev * 100 * 10) / 10;
      } else if (curr > 0) {
        customerMoM = 100;
      }
    }
  }

  const priority  = abcSegment === 'A' ? 'LOW' : abcSegment === 'B' ? 'MED' : 'HIGH';
  const lastVisit = raw.run_date ? `Data: ${raw.run_date.slice(0, 10)}` : '—';

  return {
    id:              raw.dealer_code,
    dealer_code:     raw.dealer_code,
    name:            raw.dealer_name,
    location:        abc.country || '—',
    abcSegment,
    revenueVsTarget,
    revenueTarget:   m2Target ?? qtdTarget,
    revenueActual:   m2Actual,
    yoyGrowth,
    customerMoM,
    priority,
    lastVisit,
    targetType,
    purchaseAchvPct,
    saleAchvPct,
    lastVisitDate:   null,
    plannedToday:    false,
    visitTime:       null,
    dormancyScore:   null,
  };
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const isManager = api.isManager();
  const [activeTab,      setActiveTab]      = useState('dealers');
  const [showWeekPlan,   setShowWeekPlan]   = useState(false);
  const [showPlanDay,    setShowPlanDay]    = useState(false);
  const [accountFilter,  setAccountFilter]  = useState('all'); // 'all' | 'Dealer' | 'IR'
  const [showAll,        setShowAll]        = useState(false);
  const [apiDealers,     setApiDealers]     = useState([]);
  const [dealersLoading, setDealersLoading] = useState(true);

  // Auto-recommended: segment B dealers where M2 achievement < 60%
  // OR logic: purchase target < 60% OR sales target < 60%
  const recommendedDealers = apiDealers
    .filter((d) => {
      if (d.abcSegment !== 'B') return false;
      const purchaseUnder =
        (d.purchaseAchvPct != null && d.purchaseAchvPct < 60) ||
        (d.targetType === 'purchase' && d.revenueVsTarget != null && d.revenueVsTarget < -40);
      const salesUnder =
        (d.saleAchvPct != null && d.saleAchvPct < 60) ||
        (d.targetType === 'sales' && d.revenueVsTarget != null && d.revenueVsTarget < -40);
      return purchaseUnder || salesUnder;
    })
    .sort((a, b) => a.revenueVsTarget - b.revenueVsTarget)
    .slice(0, 3);

  useEffect(() => {
    api.getDealers()
      .then((data) => {
        console.log('[GET /dealers]', data);
        const list = Array.isArray(data) ? data : Array.isArray(data?.dealers) ? data.dealers : [];
        setApiDealers(list.map(normalizeApiDealer));
      })
      .catch((err) => console.error('[GET /dealers] error:', err))
      .finally(() => setDealersLoading(false));
  }, []);

  const [showAllDealers,  setShowAllDealers]  = useState(false);
  const [plannedIds,      setPlannedIds]      = useState([]);
  const [planInitialized, setPlanInitialized] = useState(false);
  const [dragOver,        setDragOver]        = useState(false);
  const [dealerSearch,    setDealerSearch]    = useState('');

  const DEALER_PAGE_SIZE = 50;
  const DEMO_DEALER_CODES = new Set([21125, 11380, 35955, 33400, 40477, 6057, 30864, 9118, 28965, 33160].map(String));
  const demoDealers = apiDealers.filter(d => DEMO_DEALER_CODES.has(String(d.dealer_code)));

  // Seed "Recommended for Today" from auto-recommendations once API data arrives
  useEffect(() => {
    if (!planInitialized && recommendedDealers.length > 0) {
      setPlannedIds(recommendedDealers.map(d => d.id));
      setPlanInitialized(true);
    }
  }, [apiDealers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Plan state — "Recommended for Today" capped at 3, "My Dealerships" = the rest
  const plannedDealers = apiDealers.filter(d => plannedIds.includes(d.id));
  const otherDealers   = demoDealers.filter(d => !plannedIds.includes(d.id));
  const canPlanMore    = plannedDealers.length < 3;

  const moveToPlanned = (id) => {
    if (plannedDealers.length >= 3) return;
    setPlannedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };
  const postponeDealer = (id) => setPlannedIds(prev => prev.filter(p => p !== id));

  const searchedDealers = dealerSearch.trim() === ''
    ? otherDealers
    : otherDealers.filter(d =>
        d.name?.toLowerCase().includes(dealerSearch.toLowerCase()) ||
        String(d.dealer_code).includes(dealerSearch)
      );
  const visibleDealers = showAllDealers ? searchedDealers : searchedDealers.slice(0, DEALER_PAGE_SIZE);

  // Derived metrics from real API data
  const belowTarget       = apiDealers.filter(d => d.purchaseAchvPct != null && d.purchaseAchvPct < 60).length;
  const dealersWithAchv   = apiDealers.filter(d => d.purchaseAchvPct != null);
  const avgPurchaseAchv   = dealersWithAchv.length > 0
    ? Math.round(dealersWithAchv.reduce((s, d) => s + d.purchaseAchvPct, 0) / dealersWithAchv.length * 10) / 10
    : null;
  const aboveTarget       = apiDealers.filter(d => d.purchaseAchvPct != null && d.purchaseAchvPct >= 100).length;

  const territoryKpis = [
    {
      label:    'My Dealers',
      value:    dealersLoading ? '…' : String(demoDealers.length),
      sub:      dealersLoading ? '' : `${belowTarget} below 60% purchase target`,
      subColor: '#F59E0B',
      icon:     <Users size={24} color="#A100FF" />,
    },
    {
      label:    'Open Actions',
      value:    dealersLoading ? '…' : String(belowTarget),
      sub:      dealersLoading ? '' : `${recommendedDealers.length} recommended today`,
      subColor: '#EF4444',
      icon:     <CheckSquare size={24} color="#A100FF" />,
    },
    {
      label:    'Sales vs Target',
      value:    dealersLoading ? '…' : avgPurchaseAchv != null ? `${avgPurchaseAchv}%` : '—',
      sub:      dealersLoading ? '' : avgPurchaseAchv != null ? `${aboveTarget} at or above target` : 'No purchase data',
      subColor: avgPurchaseAchv != null && avgPurchaseAchv >= 100 ? '#22C55E' : '#F59E0B',
      icon:     <Target size={24} color="#A100FF" />,
    },
    { label: 'PL24 Adoption', value: '72%', sub: 'Target 80%', subColor: '#F59E0B', icon: <BarChart2 size={24} color="#A100FF" /> },
    { label: 'AOS Adoption',  value: '65%', sub: 'Target 75%', subColor: '#F59E0B', icon: <Activity size={24} color="#A100FF" /> },
  ];

  const tabs = [
    { id: 'dealers', label: 'My Dealers' },
    { id: 'actions', label: 'Open Actions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      {/* Modals */}
      {showWeekPlan && <WeekPlanModal onClose={() => setShowWeekPlan(false)} plannedDealers={recommendedDealers} otherDealers={demoDealers} />}
      {showPlanDay && <PlanMyDayModal onClose={() => setShowPlanDay(false)} />}

      {/* Section 1 — Greeting + Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Good Morning, Marcus 👋
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {getTodayLong()} · C1 Europe · Week {getISOWeek()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowWeekPlan(true)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 16px' }}
          >
            📅 This Week's Plan
          </button>
          <button
            onClick={() => setShowPlanDay(true)}
            disabled={isManager}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 16px' }}
          >
            <Map size={14} /> Plan My Day
          </button>
        </div>
      </div>

      {/* Section 2 — KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {territoryKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="card"
            style={{ textAlign: 'left', overflow: 'visible' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500', display: 'flex', alignItems: 'center' }}>
                {kpi.label}
                <KpiInfoTooltip rows={kpi.tooltipRows} columns={kpi.tooltipColumns} />
              </span>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: kpi.subColor, marginTop: '6px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Section 3 — Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #A100FF' : '2px solid transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#A0A0A0',
              fontWeight: activeTab === tab.id ? '600' : '400',
              fontSize: '14px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: '-1px',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section 4 — Dealer List */}
      {activeTab === 'dealers' && (
        <div>
          {/* Recommended for Today — drop zone, max 3 */}
          <div
            style={{ marginBottom: '20px' }}
            onDragOver={(e) => { if (canPlanMore) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const id = e.dataTransfer.getData('text/plain');
              if (id && canPlanMore) moveToPlanned(id);
            }}
          >
            <div style={{
              fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              borderLeft: `3px solid ${dragOver ? '#A100FF' : '#A100FF'}`, paddingLeft: '10px',
              marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Recommended for Today
              {dragOver && (
                <span style={{ fontSize: '10px', color: '#A100FF', fontWeight: '500', textTransform: 'none', letterSpacing: 0 }}>
                  Drop to add →
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '13px', marginBottom: '12px' }}>
              {dealersLoading ? 'Computing recommendations…'
                : `${plannedDealers.length} of 3 slots filled · Postpone a visit to free a slot`}
            </div>
            {dealersLoading ? (
              <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Computing recommendations…
              </div>
            ) : plannedDealers.length === 0 ? (
              <div style={{
                border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px',
                textAlign: 'center', color: '#505050', fontSize: '13px',
              }}>
                Drag a dealership here to plan for today
              </div>
            ) : (
              plannedDealers.map((d) => (
                <DealerCard key={d.id} dealer={d} isPlanned={true} isManager={isManager}
                  onPostpone={postponeDealer} canPlan={canPlanMore} />
              ))
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* My Dealerships — draggable when a slot is free */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '8px', gap: '12px',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderLeft: '3px solid #2A2A2A', paddingLeft: '10px',
              }}>
                My Dealerships
              </div>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder="Search by dealer name or code…"
                  value={dealerSearch}
                  onChange={(e) => setDealerSearch(e.target.value)}
                  style={{
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '6px 28px 6px 10px',
                    width: '220px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#A100FF'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
                {dealerSearch && (
                  <button
                    onClick={() => setDealerSearch('')}
                    style={{
                      position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1, padding: 0,
                    }}
                  >×</button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: canPlanMore ? '#A100FF' : '#505050', paddingLeft: '13px', marginBottom: '12px' }}>
              {canPlanMore
                ? `${3 - plannedDealers.length} slot${3 - plannedDealers.length !== 1 ? 's' : ''} available — drag a card up or click + Plan Today`
                : 'Postpone a visit above to free a slot'}
            </div>
            {dealersLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading dealers...
              </div>
            ) : (
              <>
                {visibleDealers.map((d) => (
                  <DealerCard key={d.id} dealer={d} isPlanned={false} isManager={isManager}
                    isDraggable={true} canPlan={canPlanMore} onPlanToday={moveToPlanned} />
                ))}
                {searchedDealers.length === 0 && dealerSearch && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No dealers match "{dealerSearch}"
                  </div>
                )}
                {searchedDealers.length > DEALER_PAGE_SIZE && (
                  <button
                    onClick={() => setShowAllDealers((p) => !p)}
                    style={{
                      width: '100%', marginTop: '8px', padding: '10px',
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: '6px', color: '#A100FF', fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
                    }}
                  >
                    {showAllDealers
                      ? `Show first ${DEALER_PAGE_SIZE} only ▲`
                      : `Show all ${searchedDealers.length} dealers ▼`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {activeTab === 'actions' && (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Coming soon</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            This section is under development. Check back soon.
          </div>
        </div>
      )}

      {/* Section 5 — AI Suggestions */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            AI Suggestions
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Updated this morning based on territory data
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <AISuggestionCard
            icon="📚"
            title="West Drive GmbH — AOS Training Slot Available Next Week, Confirmation Pending"
            desc="A BMW TAK training session for AOS Basket Management is open for 18 March. Dealer has not yet confirmed attendance."
            detail="During the last visit at West Drive GmbH, Maria Bauer (Parts Manager) was identified as needing a refresher on the AOS Basket Management module — she had missed two part families (cabin filters, brake fluid) that should have been added in February. A BMW TAK training slot is available next week as part of the T22 regional cycle. Maria has not yet confirmed her booking. If the slot is not confirmed today, the next available session is not until April."
          />
          <AISuggestionCard
            icon="⚡"
            title="Omega Garage — 3 IR Queries Unanswered for 48+ Hours, Response Overdue"
            desc="Three independent repairer enquiries submitted via Partslink24 to Omega Garage have had no dealer response for over 48 hours."
            detail="Three IR parts enquiries routed to Omega Garage through the Partslink24 platform have been sitting unacknowledged for more than 48 hours. The standard BMW NSC response SLA is 2 working hours. Two of the three queries relate to brake pad availability — a category already identified as a gap in the dealer's AOS basket. The third is an oil filter pricing request. Unanswered queries at this stage risk the IRs sourcing from a competing non-OEM supplier and not returning. Marcus should raise this directly with Anna Schmidt (Parts Manager) during today's visit and establish who is responsible for monitoring the PL24 query inbox on a daily basis."
          />
          <AISuggestionCard
            icon="📞"
            title="BetaMS Garage — Next Thursday Visit Not Yet Confirmed with Rick Richter"
            desc="A follow-up visit to BetaMS Garage is due by 26 March. Rick Richter has not been notified. Given 3 prior reschedules, early confirmation is critical."
            detail="Based on the standard 14-day cadence for dealers with declining KPIs, BetaMS Garage is due for a follow-up visit by 26 March 2026. Rick Richter has rescheduled the last three visits — including today's, which required three separate rescheduling requests before confirmation. To avoid a repeat, Marcus should call Hans directly before or after today's visit to verbally confirm the 26 March slot and follow up with a calendar invite. Early verbal commitment from the Principal significantly reduces the likelihood of a last-minute reschedule. If Hans declines or deflects, this should be flagged to the NSC C1-DE team as a formal engagement risk requiring programme-level intervention."
          />
        </div>
      </div>

    </div>
  );
}
