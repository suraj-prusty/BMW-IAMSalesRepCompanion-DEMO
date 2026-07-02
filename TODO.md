# TODO — BMW IAM Agentic Field Intelligence Platform

> Prioritised implementation backlog derived from gap analysis of the existing POC against the BMW BWIR Tender (44 work packages) and the Accenture Agentic Solution Proposal.
>
> **Last updated**: 30 June 2026 — Post security/architecture upgrade.

---

## ✅ RECENTLY COMPLETED (June 2026 Upgrade)

- [x] **Remove hardcoded Azure API key** — Moved from `src/data/dealers.js` to `.env` (server-side only)
- [x] **Build real backend API layer** — Express with `/api/auth`, `/api/ai/chat`, `/api/ai/generate` endpoints
- [x] **Move AI calls server-side** — ChatBot, DealerBriefing, ReviewSubmit all use backend API proxy
- [x] **Create data abstraction layer** — `src/data/dataService.js` (single entry point, DB-ready)
- [x] **Create centralized API client** — `src/services/api.js` (auth, chat, generate)
- [x] **Move auth to backend** — Login calls `/api/auth/login`, credentials in `.env`
- [x] **Add `.env` / `.env.example` / `.gitignore`** — Secrets management
- [x] **Add Vite dev proxy** — `/api` → `http://localhost:8080` for seamless dev
- [x] **Add `dev:server` script** — `npm run dev:server` for backend
- [x] **Update Navbar logout** — Uses `api.logout()`
- [x] **Remove `AZURE_CONFIG` from client bundle** — Zero secrets in browser code (verified via grep)

---

## 🔴 CRITICAL — Security & Foundation (Remaining)

- [ ] **Implement proper authentication (Azure AD / Entra ID)**
  - Current: demo credentials validated against `.env` by Express backend.
  - Target: Azure AD / Entra ID SSO with JWT tokens.
  - Add role-based access: Field Rep, NSC Manager, Admin.
  - JWT token management with refresh.

- [ ] **Add HTTPS and production security headers**
  - CSP headers, CORS restriction (currently allows all origins), rate limiting.
  - Helmet.js middleware for Express.

---

## 🔴 CRITICAL — Data Layer (Remaining)

- [ ] **Set up PostgreSQL database**
  - Replace static CSV files with a proper database.
  - Design schema per the proposed architecture ERD.
  - The `dataService.js` abstraction is ready — change its function bodies from CSV reads to DB queries.

- [ ] **Migrate dummy CSV data to PostgreSQL**
  - Write seed scripts for 6 existing dealers + their KPIs, issues, contacts, etc.
  - Add database migrations framework (e.g., Knex.js, Prisma, Alembic).

- [ ] **Implement real RAG with vector database**
  - Replace `src/data/ragKnowledge.js` (hardcoded string) with pgvector or Pinecone.
  - Ingestion pipeline: chunk documents → embed → store vectors.
  - Documents to ingest:
    - BWIR Tender Document (53 pages)
    - Accenture Offer Document
    - BMW IAM Program documentation
    - PL24 user guides
    - AOS training materials
    - Health Check protocols
    - BMW IAM Principles documentation

---

## 🟠 HIGH — Core Features Missing From POC

### Agentic Orchestration
- [ ] **Build Agent Orchestrator**
  - Multi-step AI workflow engine (pre-visit → in-visit → post-visit).
  - Tool-augmented agents (fetch dealer data, query RAG, generate structured output).
  - State management for long-running agent tasks.

- [ ] **Implement LLM Gateway with model tiering**
  - Route complex tasks to Claude Sonnet / GPT-4o
  - Route simple tasks (summarisation, classification) to GPT-4o-mini / Claude Haiku
  - Token usage tracking and cost monitoring per user/market

### IR (Independent Repairer) Support
- [ ] **Build IR data model and UI**
  - IR master data: name, location, linked dealer, status (active/dormant/inactive), turnover.
  - IR visit workflow (separate from dealer visits).
  - IR-specific KPIs: purchase frequency, PL24 adoption, AOS usage.
  - The Dealer/IR toggle in Navbar already exists — needs data and screens.

### Visit Persistence
- [ ] **Save captured visit data to database**
  - Currently visit data is held in React state and lost on navigation.
  - Save as draft during capture, final on submit.
  - Visit history view per dealer/IR.

### Multi-Market Support
- [ ] **Implement market/territory data model**
  - Market: language, currency, NSC portal URL, KPI thresholds.
  - Territory: assigned reps, dealers, IRs.
  - User ↔ Territory assignment.

- [ ] **Add i18n / multi-language support**
  - Tender requires German, English, and native market languages.
  - UI translation layer (react-i18next).
  - AI prompt and report generation in market language.

### NSC-Aligned Report Generation
- [ ] **Build structured report templates per WP 13 (Dealer Report)**
  - Executive Summary, Performance Review, Portfolio Assessment, Training Gap Analysis, Action Plan.
  - Output as structured data + formatted PDF.
  - NSC portal upload (when integration is available).

### Field Force Orchestration (Management View)
- [ ] **Build Management Dashboard**
  - Territory-level KPI aggregation across all dealers.
  - Rep performance tracking (visits completed, actions closed, adoption uplift).
  - FTE optimisation analytics (as proposed in Accenture deck).
  - Programme effectiveness reports (WP 43).

### Offline Support
- [ ] **Add PWA capabilities**
  - Service workers for offline data access.
  - Local IndexedDB cache for dealer data, visit forms.
  - Sync queue: queue visit submissions when offline, push when online.
  - Critical because field reps visit dealers in areas with poor connectivity.

---

## 🟡 MEDIUM — Extended Features

### Route Planning
- [ ] **Build route optimisation engine**
  - TSP/VRP solver for multi-stop visit planning.
  - Integration with mapping API (Google Maps, GraphHopper, OSRM).
  - Weekly/monthly auto-scheduling with priority weighting.
  - Travel time estimation with real traffic data.

### Training & Certification Module
- [ ] **Training session management** (WP 22-23)
  - Schedule training sessions at dealers or BMW training centres.
  - Track attendance and completion.
  - Certification expiry alerts.

- [ ] **Training gap analysis** (part of dealer assessment WP 14)
  - Identify staff who need PL24/AOS refresher training.
  - Flag uncertified counter staff.
  - Recommend training based on adoption metrics.

### Bonus & Incentive Module
- [ ] **Bonus concept builder** (WP 19)
  - Define bonus architecture: qualitative vs quantitative streams.
  - KPI target matrix with weights and thresholds.
  - Payout calculation and NSC approval workflow.

- [ ] **Incentive programme management** (WP 20)
  - Incentive planning, communication, goal monitoring.
  - Participant invitation and tracking.
  - Tax documentation (LUKS integration).

### AOS/PL24 Onboarding Workflow
- [ ] **IR account creation tracking** (WP 21)
  - Track PL24/AOS account creation status per IR.
  - Dealer readiness checklist (discount matrix, stock flag).
  - First digital order milestone tracking.

### Parts Basket Localization Tool
- [ ] **Car park analysis module** (WP 25)
  - Vehicle mix, age, common service operations per market.
  - Family code coverage gap analysis.
  - Basket recommendation engine.

### Dealer Maturity Model Tracking
- [ ] **Implement 4-stage maturity tracking**
  - Foundation → Developing → Performing → Leading.
  - Automatic stage calculation from KPIs.
  - Stage-based recommended actions.
  - The RAG knowledge base already has the maturity model defined — just needs data integration.

---

## 🟢 LOW — Advanced / Long-Term

### Collision Programme (WP 41-44)
- [ ] **Proactive Total Loss Avoidance** (WP 41)
  - Flag estimates with high total loss likelihood.
  - Quote generation within 1 working day SLA.
  - BMW fund utilisation tracking.

- [ ] **National Account Compliance — MSO** (WP 42)
  - MSO identification and loyalty tracking.
  - National pricing agreement management.
  - Quote-to-order ratio monitoring.

- [ ] **Bodyshop & Paint Programme** (WP 44)
  - Bodyshop network analysis.
  - Accreditation and audit tracking.
  - Annual global standards audit management.

### Programme Analysis Suite (WP 43)
- [ ] **NSC Reporting Suite**
  - Dealer rebate calculation and ROI at DNP level.
  - Programme effectiveness dashboards.
  - Consistent methodology across all reports.

### AI-Powered Coaching
- [ ] **Dealer coaching plan generator** (WP 15-16)
  - Auto-generate individual dealer development plans.
  - Monthly target agreement tracking.
  - Progress monitoring against milestones.

---

## 📊 Data & Dummy Data Improvements

### Current Data Issues
- [ ] **Expand dealer dataset**: 6 dummy dealers → at least 18-20 (realistic territory size).
- [ ] **Add dealer tier classification**: Map each dealer to maturity stage (1-4).
- [ ] **Add IR data**: Create 25-30 dummy IRs with linked dealers, turnover, PL24 status.
- [ ] **Add historical visit data**: At least 3-4 past visits per dealer with full notes.
- [ ] **Add training records**: Staff training completion, certification expiry dates.
- [ ] **Add market data**: Multi-market setup (at minimum: Germany, UK, France).
- [ ] **Add DNP-level data**: Aggregated NSC-level KPIs for management dashboard.
- [ ] **Align KPI thresholds precisely with tender**: 
  - Sales vs Target: Red <75%, Amber 75-85%, Green >85% ✅ (already correct)
  - PL24 Adoption: Red <65%, Amber 65-75%, Green >75% ✅ (already correct)
  - AOS Adoption: Red <75%, Amber 75-85%, Green >85% ✅ (already correct)
  - DB Margin: Red <19%, Amber 19-22%, Green >22% ✅ (already correct)
- [ ] **Add missing KPIs per tender**: Bonus Achievement, IAM Revenue, Peer Rank are in CSV but not in UI KPI strip.

### Additional Data Needed (from Tender)
- [ ] **Family code / portfolio coverage data** — for parts basket localization.
- [ ] **Order channel split data** — PL24 vs phone/fax per dealer.
- [ ] **IR response time metrics** — query resolution speed.
- [ ] **Collision programme data** — total loss estimates, quotes, outcomes.
- [ ] **MSO / Garage Chain data** — multi-site operators with compliance tracking.

---

## 🛠 Technical Debt in POC

- [ ] **Extract inline styles to CSS modules or Tailwind classes**
  - Most components use inline `style={{}}` objects. This works for a POC but won't scale.
  - Move to Tailwind utility classes or CSS modules.

- [ ] **Add TypeScript**
  - The app uses plain JSX. TypeScript would catch data shape errors early.
  - Especially important as the data model grows complex.

- [ ] **Add error boundaries**
  - No error boundaries exist. A single component crash takes down the whole app.

- [ ] **Add loading states and skeleton screens**
  - Some screens have loading states for AI generation, but not for data loading.
  - Add proper loading/empty/error states for all data-dependent views.

- [ ] **Add unit and integration tests**
  - No tests exist. At minimum: date utils, CSV parser, KPI color thresholds.

- [ ] **Add API request retry logic and circuit breakers**
  - Azure OpenAI calls have no retry or fallback.

- [ ] **Add logging and monitoring**
  - No structured logging. Need request tracing, error tracking, AI cost monitoring.

- [ ] **Audit AI-generated content storage**
  - All AI pitches, summaries, and emails should be logged for NSC audit.

---

## 📝 Documentation Needed

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Deployment guide (AWS/Azure)
- [ ] NSC integration guide (when APIs are confirmed)
- [ ] User manual for field reps
- [ ] User manual for NSC managers
- [ ] Security architecture document (for TISAX audit)

---

## 🗂 Summary of What the Accenture PPTX Proposal Covers That the POC Doesn't

| Accenture Proposal Feature | POC Status | Priority |
|---------------------------|------------|----------|
| Agentic Sales Companion (Intelligent Planner) | ⚠️ Partial — hardcoded weekly plan only | HIGH |
| Structured Visit Capture & Reporting | ⚠️ Partial — capture yes, NSC-aligned reports no | HIGH |
| Dynamic Knowledge Assistant (RAG) | ⚠️ Partial — hardcoded string, no vector DB | CRITICAL |
| Supporting Operational Activities (emails, nudges) | ⚠️ Partial — email generation only | MEDIUM |
| Field Force Orchestration | ❌ Not implemented | HIGH |
| Intelligent Route Planning | ❌ Not implemented | MEDIUM |
| ~40% efficiency gain tracking | ❌ No baseline/metrics tracking | MEDIUM |
| FTE reduction analytics | ❌ Not implemented | LOW |
| Multi-market / cluster rollout | ❌ Single territory only | HIGH |
| PWA / offline support | ❌ Not implemented | HIGH |

---

## 🎯 Immediate Next Steps (This Week)

1. ~~Remove the hardcoded API key~~ ✅ Done — moved to `.env`
2. ~~Set up the backend project~~ ✅ Done — Express API with 4 endpoints
3. ~~Create data abstraction layer~~ ✅ Done — `dataService.js`
4. ~~Create centralized API client~~ ✅ Done — `src/services/api.js`
5. **Set up PostgreSQL** — local dev, schema design, seed data from CSV
6. **Implement real RAG** — pgvector + document chunking pipeline
7. **Add Helmet.js security headers** to Express server
8. **Decide on cloud provider** — Azure (existing relationship) vs AWS (proposal)
9. **Confirm NSC system access** — ask BMW team about API availability for NSC portal
10. **Schedule architecture review** — walk through proposed architecture with the team
