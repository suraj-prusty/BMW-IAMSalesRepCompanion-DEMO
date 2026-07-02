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

const API_BASE = "/api";

// ── Internal: generic fetch wrapper ────────────────────────────────────────
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      // Attach auth token if available (for future JWT use)
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

// ── Public API ─────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      sessionStorage.setItem("authToken", data.token);
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
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

  // ── AI: Chat (for ChatBot component) ─────────────────────────────────────
  async chat(messages, systemContext) {
    const data = await request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages, systemContext }),
    });
    return data.reply;
  },

  // ── AI: Generate (pitch, summary, email) ─────────────────────────────────
  async generate({ systemPrompt, userPrompt, maxTokens = 350, temperature = 0.7 }) {
    const data = await request("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens, temperature }),
    });
    return data.reply;
  },
};
