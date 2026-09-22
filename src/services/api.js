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

// Data endpoints → AWS FastAPI backend
const API_BASE = import.meta.env.VITE_API_URL || "/api";
// AI endpoints → local Express server (holds Azure OpenAI key server-side)
// Dev: set VITE_AI_URL=http://localhost:8080 in .env (run `node server.js` separately)
// Prod: leave unset — empty string = same origin = Express serves everything
const AI_BASE  = import.meta.env.VITE_AI_URL  ?? "";

// Typed chat endpoint (Parts & Dealer Transactions) — AWS API Gateway
const TYPED_CHAT_URL = "https://ey60bpvzuc.execute-api.eu-central-1.amazonaws.com/chat";

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
    return request("/results/abc-segmentation");
  },

  // ── Dealers ───────────────────────────────────────────────────────────────
  async getDealers() {
    return request("/dealers");
  },

  async getDealerByCode(code) {
    return request(`/dealers/${code}`);
  },

  async getInsights(code) {
    return request(`/dealers/${code}/insights`);
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
};
