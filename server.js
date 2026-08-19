import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Azure OpenAI config (server-side — NEVER sent to browser) ───────────────
const AZURE_CONFIG = {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o",
};

// ── Demo credentials (POC only) ────────────────────────────────────────────
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo.agenticai@corporate.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "AgenticAI@2026";
const MANAGER_EMAIL = process.env.MANAGER_EMAIL || "manager.demo@corporate.com";
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || "Manager@2026";

// ── Helper: call Azure OpenAI ──────────────────────────────────────────────
async function callAzureOpenAI({ messages, maxTokens = 500, temperature = 0.7 }) {
  const url = `${AZURE_CONFIG.endpoint}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_CONFIG.apiKey,
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OpenAI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ── API Routes ─────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth ───────────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return res.json({
      success: true,
      token: "demo-token-poc",
      user: {
        name: "Marcus Schmidt",
        role: "C1 Europe Sales Executive",
        territory: "C1 Europe",
        isManager: false,
      },
    });
  }

  if (email === MANAGER_EMAIL && password === MANAGER_PASSWORD) {
    return res.json({
      success: true,
      token: "manager-token-poc",
      user: {
        name: "Anna Weber",
        role: "Regional Sales Manager",
        territory: "C1 Europe",
        isManager: true,
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: "Invalid Username & Password",
  });
});

// ── AI: Chat (for ChatBot) ─────────────────────────────────────────────────
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, systemContext } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const allMessages = [];
    if (systemContext) {
      allMessages.push({ role: "system", content: systemContext });
    }
    allMessages.push(...messages);

    const reply = await callAzureOpenAI({
      messages: allMessages,
      maxTokens: 500,
      temperature: 0.7,
    });

    res.json({ reply });
  } catch (err) {
    console.error("[/api/ai/chat] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── AI: Generate (pitch, summary, email — general purpose) ────────────────
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { systemPrompt, userPrompt, maxTokens = 350, temperature = 0.7 } = req.body || {};

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: "systemPrompt and userPrompt are required" });
    }

    const reply = await callAzureOpenAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens,
      temperature,
    });

    res.json({ reply });
  } catch (err) {
    console.error("[/api/ai/generate] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve static files from dist (production) ──────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// React Router support — all non-API routes serve index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`   API:   http://localhost:${PORT}/api`);
});
