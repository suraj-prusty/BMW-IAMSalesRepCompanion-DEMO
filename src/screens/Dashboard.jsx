import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayLong, getISOWeek, getWeekRangeLabel, getWeekDays } from '../utils/dateUtils';
import {
  Map, ChevronDown, ChevronUp, X, ArrowRight,
  AlertTriangle, Zap, ClipboardList, TrendingDown, Users,
  Activity, CheckSquare, Target, BarChart2,
} from 'lucide-react';
import { plannedDealers, otherDealers, kpiColor } from '../data/dealers';
import { dataService } from '../data/dataService';

// ── KPI Strip ──────────────────────────────────────────────
const kpis = [
  { label: 'My Dealers', value: '18', sub: '4 need attention', subColor: '#F59E0B', icon: <Users size={24} color="#A100FF" /> },
  { label: 'Open Actions', value: '11', sub: '3 overdue', subColor: '#EF4444', icon: <CheckSquare size={24} color="#A100FF" /> },
  { label: 'Sales vs Target', value: '78%', sub: '-4% vs last month', subColor: '#F59E0B', icon: <Target size={24} color="#A100FF" /> },
  { label: 'PL24 Adoption', value: '72%', sub: 'Target 80%', subColor: '#F59E0B', icon: <BarChart2 size={24} color="#A100FF" /> },
  { label: 'AOS Adoption', value: '65%', sub: 'Target 75%', subColor: '#F59E0B', icon: <Activity size={24} color="#A100FF" /> },
];

// ── Dealer Card ────────────────────────────────────────────
function DealerCard({ dealer, onVisit, isPlanned }) {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/dealer/${dealer.id}`);

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '10px',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
    >
      {/* Priority indicator */}
      <div
        style={{
          width: '4px',
          height: '52px',
          borderRadius: '2px',
          flexShrink: 0,
          background:
            dealer.priority === 'HIGH'
              ? '#EF4444'
              : dealer.priority === 'MED'
              ? '#F59E0B'
              : '#22C55E',
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', marginBottom: '3px' }}>
          {dealer.name}
        </div>
        <div style={{ fontSize: '12px', color: '#A0A0A0' }}>
          {dealer.location} · Last visit: {dealer.lastVisit}
        </div>
      </div>

      {/* KPI pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', flexShrink: 0 }}>
        {[
          { label: 'Sales', value: dealer.salesVsTarget, metric: 'salesVsTarget' },
          { label: 'PL24', value: dealer.pl24Adoption, metric: 'pl24Adoption' },
          { label: 'AOS', value: dealer.aosAdoption, metric: 'aosAdoption' },
          { label: 'DB%', value: dealer.dbMargin, metric: 'dbMargin' },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-pill">
            <span style={{ color: '#A0A0A0' }}>{kpi.label}</span>
            <span style={{ color: kpiColor(kpi.metric, kpi.value), fontWeight: '600' }}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Action button */}
      <button
        onClick={handleClick}
        className={isPlanned ? 'btn-primary' : 'btn-secondary'}
        style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '13px' }}
      >
        {isPlanned ? 'Start Visit →' : 'View Dealership'}
      </button>
    </div>
  );
}

// ── This Week's Plan Modal ─────────────────────────────────
// Today's dealers — always placed on whichever weekday is "today"
const TODAY_DEALERS = ['Alpha Garage GmbH', 'Bavaria Motors AG', 'Rhein Auto GmbH'];

// The 4 remaining non-today days get these dealer sets (in order Mon→Fri, skipping today)
const OTHER_DEALERS = [
  ['Cologne Car Hub', 'Omega Garage', 'Delta Autohaus'],
  ['Bavaria Motors AG', 'Munich Drive Center', 'Alpen Auto Group'],
  ['Stuttgart Auto Works', 'Black Forest Garage', 'Swabian Motors'],
  ['Nord Parts KG — Assessment', 'Hamburg Auto Parts', 'Baltic Car Supply'],
];

function buildWeekVisits() {
  // getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // Mon-Fri map to index 0-4; on weekends default to Mon (0)
  const dow = new Date().getDay();
  const todayIdx = (dow >= 1 && dow <= 5) ? dow - 1 : 0;
  let slot = 0;
  return Array.from({ length: 5 }, (_, i) =>
    i === todayIdx ? TODAY_DEALERS : OTHER_DEALERS[slot++]
  );
}

function WeekPlanModal({ onClose }) {
  const todayDate = new Date().getDate();
  const weekVisits = buildWeekVisits();
  const days = getWeekDays().map((d, i) => ({
    ...d,
    visits:  weekVisits[i],
    isToday: d.date === todayDate,
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card"
        style={{ width: '520px', maxWidth: '95vw', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>
              📅 This Week's Plan
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
              Week {getISOWeek()} · {getWeekRangeLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A0A0A0', padding: '4px' }}
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
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                background: d.isToday ? 'rgba(161,0,255,0.08)' : '#1C1C1C',
                border: `1px solid ${d.isToday ? '#A100FF' : '#2A2A2A'}`,
                borderRadius: '8px',
              }}
            >
              {/* Day label + date */}
              <div style={{ minWidth: '44px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: d.isToday ? '#A100FF' : '#A0A0A0', fontWeight: '600', letterSpacing: '0.04em' }}>
                  {d.day}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: d.isToday ? '#A100FF' : '#FFFFFF', lineHeight: 1.1 }}>
                  {d.date}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', alignSelf: 'stretch', background: d.isToday ? 'rgba(161,0,255,0.3)' : '#2A2A2A' }} />

              {/* Dealer list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {d.visits.map((v) => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#A100FF', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '12px', color: '#FFFFFF' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Today badge */}
              {d.isToday && (
                <span style={{
                  fontSize: '10px', fontWeight: '700', color: '#A100FF',
                  background: 'rgba(161,0,255,0.15)', padding: '3px 10px',
                  borderRadius: '20px', whiteSpace: 'nowrap',
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
  color: '#FFFFFF',
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
          background: '#141414',
          border: '1px solid #2A2A2A',
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
          borderBottom: '1px solid #2A2A2A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(161,0,255,0.06), transparent)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🗺️ Plan My Day — Optimised Route
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
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
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#A0A0A0', padding: '4px', marginLeft: '4px' }}>
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
            borderRight: '1px solid #2A2A2A',
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
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1.2 }}>{stop.name}</div>
                        <div style={{ fontSize: '11px', color: '#A0A0A0', marginTop: '2px' }}>{stop.city}</div>
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
                      background: '#0A0A0A', borderRadius: '6px', padding: '7px 10px',
                      marginBottom: '10px',
                    }}>
                      <span style={{ fontSize: '12px', color: '#A100FF', fontWeight: '600' }}>⏰ {stop.arrive}</span>
                      <span style={{ fontSize: '11px', color: '#3A3A3A' }}>──────</span>
                      <span style={{ fontSize: '11px', color: '#A0A0A0' }}>{stop.duration}</span>
                      <span style={{ fontSize: '11px', color: '#3A3A3A' }}>──────</span>
                      <span style={{ fontSize: '12px', color: '#A0A0A0', fontWeight: '500' }}>🔔 {stop.depart}</span>
                    </div>

                    {/* Focus */}
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Today's Focus  </span>
                      <span style={{ fontSize: '12px', color: '#FFFFFF' }}>{stop.focus}</span>
                    </div>

                    {/* KPI pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {stop.kpis.map((k) => (
                        <div key={k.label} className="kpi-pill" style={{ padding: '3px 8px', fontSize: '11px' }}>
                          <span style={{ color: '#A0A0A0' }}>{k.label} </span>
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
                          <div style={{ fontSize: '12px', color: '#A0A0A0', fontWeight: '500' }}>
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
              <span style={{ fontSize: '12px', color: '#A0A0A0' }}>All stops complete · Return to base</span>
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
            background: '#0A0A0A',
            position: 'relative',
          }}>
            {/* Map label */}
            <div style={{
              position: 'absolute', top: '14px', left: '16px', zIndex: 2,
              fontSize: '11px', color: '#A0A0A0', fontWeight: '600',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              background: 'rgba(10,10,10,0.8)', padding: '4px 10px', borderRadius: '4px',
              border: '1px solid #2A2A2A',
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
                  background: 'rgba(20,20,20,0.92)', border: '1px solid #2A2A2A',
                  borderRadius: '6px', padding: '6px 12px', textAlign: 'center',
                  backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ fontSize: '10px', color: '#A0A0A0' }}>{s.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>{s.value}</div>
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
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: '#A0A0A0', lineHeight: 1.5 }}>{desc}</div>
      {expanded && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#1C1C1C',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#A0A0A0',
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

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dealers');
  const [showWeekPlan, setShowWeekPlan] = useState(false);
  const [showPlanDay, setShowPlanDay] = useState(false);

  const tabs = [
    { id: 'dealers', label: 'My Dealers' },
    { id: 'actions', label: 'Open Actions' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: '24px' }}>
      {/* Modals */}
      {showWeekPlan && <WeekPlanModal onClose={() => setShowWeekPlan(false)} />}
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
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>
            Good Morning, Marcus 👋
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#A0A0A0' }}>
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
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="card"
            style={{ textAlign: 'left' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#A0A0A0', fontWeight: '500' }}>{kpi.label}</span>
              {kpi.icon}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: kpi.subColor, marginTop: '6px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Section 3 — Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #2A2A2A', marginBottom: '24px' }}>
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
          {/* Planned Today */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#A0A0A0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderLeft: '3px solid #A100FF',
                paddingLeft: '10px',
                marginBottom: '12px',
              }}
            >
              Planned for Today
            </div>
            {plannedDealers.map((d) => (
              <DealerCard key={d.id} dealer={d} isPlanned={true} />
            ))}
          </div>

          <div style={{ borderTop: '1px solid #2A2A2A', margin: '20px 0' }} />

          {/* My Dealerships */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#A0A0A0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderLeft: '3px solid #2A2A2A',
                paddingLeft: '10px',
                marginBottom: '12px',
              }}
            >
              My Dealerships
            </div>
            {otherDealers.map((d) => (
              <DealerCard key={d.id} dealer={d} isPlanned={false} />
            ))}
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {activeTab === 'actions' && (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '48px', color: '#A0A0A0' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF' }}>Coming soon</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            This section is under development. Check back soon.
          </div>
        </div>
      )}

      {/* Section 5 — AI Suggestions */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>
            AI Suggestions
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#A0A0A0' }}>
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
