// ── Shared date utilities ─────────────────────────────────────────────────────

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// "Wednesday, 18 March 2026"
export function getTodayLong(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ISO week number (Monday-based)
export function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Monday of a given week
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7; // treat Sunday as 7
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// "March 16–22, 2026"
export function getWeekRangeLabel(date = new Date()) {
  const start = getWeekStart(date);
  const end   = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth  = start.getMonth() === end.getMonth();
  const monthLabel = sameMonth
    ? MONTHS[start.getMonth()]
    : `${MONTHS[start.getMonth()]}–${MONTHS[end.getMonth()]}`;
  return `${monthLabel} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
}

// Mon–Fri for current week: [{day:'Mon', date:16}, ...]
export function getWeekDays(date = new Date()) {
  const start = getWeekStart(date);
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { day, date: d.getDate() };
  });
}

// Parse "26 Feb 2026" → Date object
export function parseDateStr(str) {
  if (!str) return null;
  const parts = String(str).trim().split(' ');
  if (parts.length !== 3) return null;
  const [day, mon, year] = parts;
  const monthIdx = SHORT_MONTHS.indexOf(mon);
  if (monthIdx === -1) return null;
  return new Date(parseInt(year), monthIdx, parseInt(day));
}

// "X days ago" relative text from "DD Mon YYYY" string
export function daysAgoText(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return dateStr || '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Yesterday';
  if (diff < 0)   return `in ${Math.abs(diff)} days`;
  return `${diff} days ago`;
}

// "18 Mar 2026"
export function formatShort(date = new Date()) {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Next N visit options as "Apr 1", "Apr 8", "Apr 15"  (today + 7, +14, +21...)
export function getNextVisitOptions(count = 3, startDays = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + startDays + i * 7);
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  });
}

// Resolve a due-date string from CSV:
//   "+14"         → today + 14 days as "02 Apr 2026"
//   "06 Mar 2026" → returned as-is
export function resolveDueDate(str) {
  if (!str) return '';
  const match = String(str).trim().match(/^\+(\d+)$/);
  if (match) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(match[1], 10));
    return formatShort(d);
  }
  return str;
}

// "10:48 AM"
export function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
