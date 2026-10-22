// ── API Client ───────────────────────────────────────────────────────────────
//
// PURPOSE:
//   Centralised HTTP client for ALL backend API calls.
//   Every component calls this instead of fetch() directly.
//   This makes it easy to add auth headers, retry logic, error handling,
//   and switch API base URLs.
//
// USAGE:
//   import { api } from '../services/api';
//   const dealers = await api.getDealers();
// ────────────────────────────────────────────────────────────────────────────

import { dataService } from '../data/dataService';
import { createRecommendationClient } from './recommendationClient';

// Data endpoints → AWS FastAPI backend
const API_BASE = import.meta.env.VITE_API_URL || "/api";
// AI endpoints → local Express server (holds Azure OpenAI key server-side)
// Dev: set VITE_AI_URL=http://localhost:8080 in .env (run `node server.js` separately)
// Prod: leave unset — empty string = same origin = Express serves everything
const AI_BASE  = import.meta.env.VITE_AI_URL  ?? "";
const LOCAL_API_BASE = import.meta.env.VITE_LOCAL_API_URL || "/local-api";

// Typed chat endpoint (Parts & Dealer Transactions) — AWS API Gateway
const TYPED_CHAT_URL = "https://ey60bpvzuc.execute-api.eu-central-1.amazonaws.com/chat";

function localDealerRecord(dealer) {
  const accountId = String(dealer.account_id ?? dealer.dealer_code ?? dealer.id);
  const revenueVsTarget = dealer.revenueVsTarget ?? dealer.target_achievement_pct ?? null;
  const yoyGrowth = dealer.yoyGrowth ?? dealer.yoy_growth_pct ?? null;
  const customerMoM = dealer.customerMoM ?? dealer.mom_sales_growth_pct ?? null;
  const revenueActual = dealer.revenueActual ?? dealer.revenue_actual ?? null;
  const abcSegment = dealer.abcSegment ?? dealer.abc_segment ?? null;
  return {
    ...dealer,
    __localDemo: true,
    id: accountId,
    account_id: accountId,
    dealer_code: accountId,
    dealer_name: dealer.name ?? dealer.dealer_name ?? accountId,
    customerMoM,
    yoyGrowth,
    revenueVsTarget,
    abcSegment,
    revenueActual,
    ytdSalesEur: revenueActual,
    purchaseAchvPct: revenueVsTarget == null ? null : 100 + revenueVsTarget,
    saleAchvPct: null,
    targetType: 'purchase',
    account_type: dealer.account_type || 'Dealer',
    location: dealer.location || dealer.region || '—',
  };
}


// VITE_DEBUG_MODE: unset or "true" keeps recommendations and visit capture in local JSON files;
// "false" sends both to the AWS APIs.
const DEBUG_MODE = String(import.meta.env.VITE_DEBUG_MODE ?? "true").trim().toLowerCase() !== "false";
const BACKEND_MODE = DEBUG_MODE ? "local" : "aws";

const recommendationClient = createRecommendationClient({
  mode: BACKEND_MODE,
  awsUrl: import.meta.env.VITE_RECOMMENDATION_API_URL,
  localBase: LOCAL_API_BASE,
});

// ── Internal: generic fetch wrapper ────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(sessionStorage.getItem("authToken")
        ? { Authorization: `Bearer ${sessionStorage.getItem("authToken")}` }
        : {}),
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ── Demo credentials (client-side auth — no backend needed for login) ───────
// These match the values in .env. Replace with real IdP (Azure AD) in prod.
const DEMO_USERS = [
  {
    email:    "demo.agenticai@corporate.com",
    password: "AgenticAI@2026",
    user:     { name: "Demo User",    email: "demo.agenticai@corporate.com", isManager: false },
  },
  {
    email:    "manager.demo@corporate.com",
    password: "Manager@2026",
    user:     { name: "Demo Manager", email: "manager.demo@corporate.com",   isManager: true },
  },
  {
    email:    "marcus.demo@corporate.com",
    password: "Marcus@2026",
    user:     { name: "Marcus Schmidt", email: "marcus.demo@corporate.com", isManager: false, repId: "marcus" },
  },
  {
    email:    "sofia.demo@corporate.com",
    password: "Sofia@2026",
    user:     { name: "Sofia Keller", email: "sofia.demo@corporate.com", isManager: false, repId: "sofia" },
  },
];

// ── Public API ─────────────────────────────────────────────────────────────

export const api = {
  // ── Auth (client-side — no backend call needed) ──────────────────────────
  async login(email, password) {
    const match = DEMO_USERS.find(
      (u) => u.email === email.trim() && u.password === password
    );

    if (!match) {
      return { success: false, error: "Invalid email or password" };
    }

    const token = btoa(`${match.email}:${Date.now()}`);
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("isAuthenticated", "true");
    sessionStorage.setItem("user", JSON.stringify(match.user));

    return { success: true, user: match.user, token };
  },

  logout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("user");
  },

  isAuthenticated() {
    return sessionStorage.getItem("isAuthenticated") === "true";
  },

  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  },

  isManager() {
    return this.getUser()?.isManager === true;
  },

  // ── AI: Chat (for ChatBot component) ─────────────────────────────────────
  async chat(messages, systemContext) {
    const response = await fetch(`${AI_BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, systemContext }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.reply;
  },

  // ── Photo: get pre-signed view URL ───────────────────────────────────────
  async getPhotoUrl(key) {
    const response = await fetch(`${AI_BASE}/api/photo-url?key=${encodeURIComponent(key)}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to get photo URL: ${response.status}`);
    }
    const data = await response.json();
    return data.url;
  },

  // ── Audio: get pre-signed URL for playback (reuses photo-url endpoint) ────
  async getAudioUrl(key) {
    return this.getPhotoUrl(key); // same endpoint — any S3 key works
  },

  // ── Photo upload → S3 (via Express server) ──────────────────────────────
  async uploadPhoto(base64, fileName, folder = "misc") {
    const response = await fetch(`${AI_BASE}/api/upload-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, fileName, folder }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed with status ${response.status}`);
    }
    return response.json(); // { url, key }
  },

  // ── AI: Transcribe audio → text (Whisper via Azure OpenAI) + store in S3 ───
  // Accepts a Blob (audio/webm or audio/mp4) recorded by MediaRecorder.
  // Returns { transcript: string, audioKey: string | null }
  async transcribeAudio(blob, { visitId, folder = "dealer" } = {}) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const response = await fetch(`${AI_BASE}/api/ai/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64, mimeType: blob.type, visitId, folder }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Transcription failed with status ${response.status}`);
    }
    return response.json(); // { transcript, audioKey }
  },

  // ── AI: Generate (pitch, summary, email) ─────────────────────────────────
  async generate({ systemPrompt, userPrompt, maxTokens = 350, temperature = 0.7 }) {
    const response = await fetch(`${AI_BASE}/api/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens, temperature }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.reply;
  },

  // ── AI: Voice-to-Form Extractor (T067) ───────────────────────────────────
  // Turns a visit transcript into a schema-valid structured draft that maps
  // onto the dealer / IR form fields. Only extracts what the transcript states;
  // the server drops any value outside the allowed option sets.
  // Returns the `extracted` object (form_data subset) ready to populate state.
  async extractVisit({ transcript, formType = "dealer" }) {
    const response = await fetch(`${AI_BASE}/api/ai/extract-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, formType }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Extraction failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.extracted;
  },

  // ── AI: Typed chat (Parts & Dealer Transactions / Promotion & Campaign) ───
  // Sends the full payload directly to the AWS chat endpoint.
  async chatTyped(payload) {
    const response = await fetch(TYPED_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Request failed with status ${response.status}`);
    }
    return response.json();
  },

  // ── Results: ABC Segmentation ─────────────────────────────────────────────
  async getAbcSegmentation() {
    try {
      return await request("/results/abc-segmentation");
    } catch {
      const groups = { A: [], B: [], C: [] };
      dataService.getPrioritizedDealers().forEach((dealer) => {
        if (groups[dealer.abc_segment]) groups[dealer.abc_segment].push(dealer);
      });
      return {
        abc_segmentation: {
          segment_A: groups.A,
          segment_B: groups.B,
          segment_C: groups.C,
          all_dealers: Object.values(groups).flat(),
          total_dealers: Object.values(groups).reduce((sum, group) => sum + group.length, 0),
        },
      };
    }
  },

  getLocalDemoDealers() {
    return dataService.getPrioritizedDealers()
      .filter((dealer) => String(dealer.account_type).toUpperCase() === 'DEALER')
      .map(localDealerRecord);
  },

  // ── Dealers ───────────────────────────────────────────────────────────────
  async getDealers() {
    return request("/dealers");
  },

  async getDealerByCode(code) {
    return request(`/dealers/${code}`);
  },

  // Fetch KPI data for every dealer in the provided list concurrently.
  // Returns an array in the same order as dealerCodes; failed fetches yield null.
  async getAllDealerKpis(dealerCodes) {
    const results = await Promise.allSettled(
      dealerCodes.map((code) => request(`/dealers/${code}`))
    );
    return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
  },

  async getInsights(code) {
    try {
      return await request(`/dealers/${code}/insights`);
    } catch {
      return {};
    }
  },

  // ── Visit Forms (existing) ────────────────────────────────────────────────
  async getDraftVisit(dealerCode, formType) {
    return request(`/visits/${dealerCode}/draft?form_type=${formType}`);
  },

  async saveVisit(dealerCode, visitId, payload) {
    return request(`/visits/${dealerCode}/${visitId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getVisitByDate(dealerCode, formType, visitDate) {
    return request(`/visits/${dealerCode}/search?form_type=${formType}&visit_date=${visitDate}`);
  },

  // ── Visit Capture (new forms) ─────────────────────────────────────────────
  // These call the FastAPI backend (VITE_API_URL) directly via request(), which
  // routes to the visit-capture Lambdas. No dedicated client / separate URL.
  async getDraftVisitCapture(dealerCode, formType) {
    return request(`/visit-capture/${dealerCode}/draft?form_type=${formType}`);
  },

  async saveVisitCapture(dealerCode, visitId, payload) {
    return request(`/visit-capture/${dealerCode}/${visitId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async searchVisitCapture(dealerCode, formType, visitDate) {
    return request(`/visit-capture/${dealerCode}/search?form_type=${formType}&visit_date=${visitDate}`);
  },

  async getVisitCapture(dealerCode, visitId) {
    return request(`/visit-capture/${dealerCode}/${visitId}`);
  },

  async getVisitCaptures({ salesRepId, startDate, endDate } = {}) {
    const qs = new URLSearchParams();
    if (salesRepId) qs.set("sales_rep_id", salesRepId);
    if (startDate)  qs.set("start_date", startDate);
    if (endDate)    qs.set("end_date", endDate);
    const data = await request(`/visit-capture${qs.toString() ? `?${qs}` : ""}`);
    return data?.rows ?? [];
  },

  // ── Recommendations (weekly manager Save): local JSON table or AWS API ─────
  async saveRecommendationBatch(batch) {
    return recommendationClient.save(batch);
  },

  async getRecommendations(salesRepId, period) {
    return recommendationClient.list(salesRepId, period);
  },

  async getRecommendationBatch(saveBatchId) {
    return recommendationClient.getBatch(saveBatchId);
  },

  async updateRecommendationAction(recommendationId, repAction, actionBy) {
    return recommendationClient.updateAction(recommendationId, repAction, actionBy);
  },
};
