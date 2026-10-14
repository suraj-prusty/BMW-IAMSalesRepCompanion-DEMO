import path from "path";
import { fileURLToPath } from "url";
import { mkdir, readFile, writeFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TABLES_DIR = process.env.LOCAL_TABLES_DIR || path.join(__dirname, "table_structures");
const DATA_FILE = path.join(TABLES_DIR, "visit_capture.json");

async function readAll() {
  try {
    const text = await readFile(DATA_FILE, "utf8");
    if (!text.trim()) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(rows) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function periodForDate(dateText) {
  const date = new Date(`${dateText || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date - firstDay) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

async function findRecommendation({ dealer_id, sales_rep_id, visit_date }) {
  if (!dealer_id || !sales_rep_id) return null;
  const recommendationsPath = path.join(TABLES_DIR, "recommendation.json");
  try {
    const text = await readFile(recommendationsPath, "utf8");
    const rows = text.trim() ? JSON.parse(text) : [];
    const period = periodForDate(visit_date);
    return rows.find((r) =>
      String(r.dealer_id) === String(dealer_id)
      && r.sales_rep_id === sales_rep_id
      && r.planning_period_label === period
    )?.recommendation_id || null;
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export const visitCaptureStore = {
  async getDraft(dealerId, formType) {
    const rows = await readAll();
    const draft = rows
      .filter((r) => String(r.dealer_id) === String(dealerId)
        && r.form_type === formType
        && r.status === "draft")
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
    return draft || null;
  },

  async save(dealerId, visitId, payload) {
    const rows = await readAll();
    const formData = payload.form_data || {};
    const record = {
      visit_id:           visitId,
      dealer_id:          String(dealerId),
      sales_rep_id:       payload.sales_rep_id || payload.submitted_by || "unknown",
      form_type:          payload.form_type || "dealer",
      status:             payload.status || "draft",
      visit_date:         payload.visit_date || new Date().toISOString().slice(0, 10),
      form_data:          formData,
      submitted_by:       payload.submitted_by || "",
      updated_at:         payload.updated_at || new Date().toISOString(),
      recommendation_id:  payload.recommendation_id || await findRecommendation({
        dealer_id: String(dealerId),
        sales_rep_id: payload.sales_rep_id || payload.submitted_by,
        visit_date: payload.visit_date,
      }),
    };
    const index = rows.findIndex((r) => r.visit_id === visitId);
    if (index >= 0) rows[index] = { ...rows[index], ...record };
    else rows.push(record);
    await writeAll(rows);
    return record;
  },

  async getByDate(dealerId, formType, visitDate) {
    const rows = await readAll();
    return rows.find((r) => String(r.dealer_id) === String(dealerId)
      && r.form_type === formType
      && r.visit_date === visitDate) || null;
  },

  async list({ sales_rep_id, start_date, end_date } = {}) {
    const rows = await readAll();
    return rows.filter((r) => {
      if (sales_rep_id && r.sales_rep_id !== sales_rep_id) return false;
      if (start_date && r.visit_date < start_date) return false;
      if (end_date && r.visit_date > end_date) return false;
      return true;
    });
  },
};
