# Intelligent IAM Copilot — POC Application

## Overview

A proof-of-concept field intelligence application built for BMW's **Global IAM (Independent Aftermarket) 2026+** program. The app serves as a digital companion for IAM field sales executives (e.g., Marcus Schmidt — C1 Europe territory) to plan, execute, and report on dealer visits.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | React Router v6 |
| Icons | Lucide React |
| Backend | Express.js with REST API endpoints |
| AI/LLM | Azure OpenAI (GPT-4o), **server-side proxy only** |
| Data | Static CSV → `dataService.js` abstraction layer (DB-ready) |
| Auth | Backend `/api/auth/login` endpoint with session token |
| Config | `.env` file (server-side secrets, never bundled) |

## Project Structure

```
Intelligent_IAM_Copilot/
├── index.html                  # Entry HTML
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite bundler + API proxy config
├── tailwind.config.js          # Tailwind config
├── postcss.config.js           # PostCSS config
├── server.js                   # Express API backend + static file server
├── .env                        # Server-side secrets (NEVER committed)
├── .env.example                # Template for new developers
├── .gitignore                  # Excludes .env, node_modules, dist/
├── BMW_logo.png                # BMW branding asset
├── BMW.png                     # BMW branding asset
├── SETUP.bat                   # Windows setup script
│
├── RAG_Docs/
│   ├── BWIR_Tenderdocument.pdf          # BMW tender document (53 pages, 44 work packages)
│   ├── 20260220_Accenture GmbH_BWIR_Offer_Global_IAM2026+.pdf  # Accenture offer document
│   └── Initial Stage Overview.xlsx      # Initial stage planning
│
├── BMW Global IAM - Agentic Solution Overview 1.pptx  # Accenture proposal deck
│
├── proposed-architecture.md    # Production architecture proposal
├── TODO.md                     # Prioritised implementation backlog
│
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Root component + routing + guards
    ├── index.css                # Global styles (Tailwind + custom)
    │
    ├── services/
    │   └── api.js               # Centralised API client (auth, chat, generate)
    │
    ├── components/
    │   ├── Navbar.jsx           # Top navigation bar (logo, dealer/IR toggle, user menu)
    │   ├── StepProgress.jsx     # Visit workflow step indicator (Briefing → Capture → Review)
    │   ├── BackButton.jsx       # Reusable back navigation
    │   └── ChatBot.jsx          # RAG-powered AI chatbot (via backend API)
    │
    ├── screens/
    │   ├── Login.jsx            # Login page (authenticates via backend API)
    │   ├── Dashboard.jsx        # Main dashboard: KPIs, dealer cards, weekly plan
    │   ├── DealerBriefing.jsx   # Pre-visit briefing: AI pitch, AI summary, KPIs, issues, agenda
    │   ├── VisitCapture.jsx     # On-site visit data capture form
    │   ├── ReviewSubmit.jsx     # Post-visit: AI summary, follow-up email, action plan
    │   └── Success.jsx          # Visit submission confirmation with confetti
    │
    ├── data/
    │   ├── dealers.csv          # Master dealer list (6 dealers)
    │   ├── dealers.js           # Re-exports from dataService + SCREEN_CONTEXT
    │   ├── dataService.js       # 🆕 Data Abstraction Layer (swap CSV → DB here)
    │   ├── csvLoader.js         # Generic CSV → JSON parser
    │   ├── ragKnowledge.js      # Hardcoded RAG knowledge base (BMW IAM documentation)
    │   │
    │   ├── alpha-garage/        # Per-dealer CSV data folders (6 total)
    │   │   ├── kpis.csv         # KPI metrics (8 KPIs)
    │   │   ├── issues.csv       # Known issues (3 per dealer)
    │   │   ├── agenda.csv       # Visit agenda items (5 per dealer)
    │   │   ├── contacts.csv     # Key contacts (5-6 roles)
    │   │   ├── actions.csv      # All actions
    │   │   ├── last_visit.csv   # Last visit metadata (date + attendees)
    │   │   ├── visit_notes.csv  # Previous visit notes
    │   │   └── open_actions.csv # Open/pending actions (3 per dealer)
    │   ├── bavaria-motors/
    │   ├── rhein-auto/
    │   ├── nord-parts/
    │   ├── west-drive/
    │   └── berlin-auto/
    │
    └── utils/
        └── dateUtils.js         # Date formatting, ISO week, "X days ago", etc.
```

## Architecture

### Security Model
```
Browser (React SPA)  ──→  Express API (/api/*)  ──→  Azure OpenAI
     ↑                         ↑
  0 secrets              .env (API key)
  in bundle              server-side only
```

All AI calls go through the Express backend. The Azure OpenAI API key lives in `.env` and is **never exposed to the browser**. The frontend uses `src/services/api.js` as a centralized HTTP client.

### Data Abstraction Layer
`src/data/dataService.js` is the single entry point for all data access. Currently it reads from CSV files. To migrate to a database, **only this file** needs to change — no other component touches data directly.

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | Authenticate user, returns token |
| `/api/ai/chat` | POST | ChatBot messages with system context |
| `/api/ai/generate` | POST | General-purpose AI generation (pitch, summary, email) |

## Application Flow

```
Login (API auth) → Dashboard → Dealer Briefing → Visit Capture → Review & Submit → Success
     ↑                ↑                ↑                   ↑               ↑
  /api/auth        dataService      api.generate         dataService    api.generate
  /login           getDealers()     (pitch/summary)      getDealerData() (summary/email)
```

1. **Login** (`/login`): Authenticates via `POST /api/auth/login`. Credentials live in `.env` server-side. Sets auth token + user in session.

2. **Dashboard** (`/dashboard`): KPI summary strip (5 KPIs), planned dealer list for today, other dealers in territory, and a weekly plan modal. Dealer/IR toggle exists in navbar but no IR data is implemented yet.

3. **Dealer Briefing** (`/dealer/:id`): Pre-visit intelligence. Shows KPI bar, expandable KPI table, **AI Summary** (pre-visit intelligence brief), **AI Opening Pitch** (personalised sales pitch for the visit) — both generated via `POST /api/ai/generate`. Also shows known issues, visit agenda, open actions, and last visit notes from `dataService`.

4. **Visit Capture** (`/visit/:id`): Structured form for on-site visit data. Covers contact confirmation, KPI snapshot, issues confirmation (mark as confirmed / N/A / add to action plan), agenda completion, custom issues capture, and general notes.

5. **Review & Submit** (`/submit/:id`): Post-visit consolidation. Shows captured data, AI-generated post-visit meeting summary, AI-generated follow-up email draft — both via `POST /api/ai/generate`. Agreed actions with owners and due dates, and next visit scheduling.

6. **Success** (`/success`): Confirmation with confetti animation and key submission details.

7. **ChatBot**: Floating chat widget on Dashboard, Dealer Briefing, and Visit Capture screens. Uses `POST /api/ai/chat` with RAG knowledge base injected server-side. Context-aware based on current screen.

## Data Model

### Dealers (`dealers.csv`)
| Field | Description |
|-------|-------------|
| id | Unique dealer identifier (slug) |
| name | Display name |
| location | Address/city |
| lastVisitDate | Date of last visit (DD Mon YYYY) |
| visitTime | Scheduled visit time |
| salesVsTarget | Sales achievement % |
| pl24Adoption | PL24 digital adoption % |
| aosAdoption | AOS basket adoption % |
| dbMargin | Dealer contribution margin % |
| priority | HIGH / MED / LOW |
| plannedToday | Is visit planned for today? |

### Per-Dealer KPIs (`kpis.csv`)
| Field | Description |
|-------|-------------|
| metric | KPI name |
| actual | Current value |
| target | Target value |
| color | Display color (hex) |
| note | Contextual note |

### Issues, Agenda, Contacts, Actions, Visit Notes, Open Actions
Each dealer folder contains the same 8 CSV files with dealer-specific data. The app loads them at build time via Vite's `?raw` import, parses them with `csvLoader.js`, and exposes them through the `DEALER_DATA` map in `dealers.js`.

## Key Limitations (POC-specific)

1. **No database** — All data is static CSV, no CRUD operations, no persistence of visit data. The `dataService.js` abstraction layer is ready for DB swap.
2. **Demo auth only** — Backend validates against `.env` credentials with a demo token. Needs Azure AD/Entra ID SSO for production.
3. **Client-side RAG** — Knowledge base is a 300+ line hardcoded JS string, not a real vector retrieval system.
4. **Single territory** — Hardcoded to C1 Europe (Marcus Schmidt), no multi-market support.
5. **6 dummy dealers** — Not representative of real scale (tender covers hundreds across multiple markets).
6. **No IR data** — Despite the Dealer/IR toggle in Navbar, no Independent Repairer data exists.
7. **No persistence** — Visit data captured but not stored or retrievable across sessions.
8. **No NSC integration** — Cannot upload/download reports from BMW NSC portal/SharePoint.
9. **No multi-language support** — Tender requires German, English, and native market languages.
10. **No Field Force Orchestration** — Only the field rep's view exists, no management oversight.
11. **No Route Planning** — Visit scheduling is hardcoded, no optimization.
12. **No Collision Programme / Total Loss Avoidance** — WPs 41-44 from tender not addressed.

## Getting Started

```bash
# 1. Install dependencies
npm install


# 2. Set up environment (copy the template)
copy .env.example .env
# Edit .env with your Azure OpenAI credentials

# 3. Development — two terminals:
#    Terminal 1: Start backend API (port 8080)
npm run dev:server
#    Terminal 2: Start Vite dev server (port 5173, proxies /api → 8080)
npm run dev

# 4. Production build + serve (single terminal, port 8080)
npm run build
npm start

# Or use the batch file
SETUP.bat
```

