# Intelligent IAM Copilot

A proof-of-concept React application for BMW IAM field sales teams. It supports dealer planning and briefing, dealer and independent-repairer (IR) visit capture, manager team views, and AI-assisted sales workflows. The UI and app flow are being stabilized before connecting the application to its real data source.

## Stack

- React 18, Vite 5, and React Router 6
- Express for AI, media, and production static-file routes
- API integrations for dealer, insight, planning, and visit data; production data-source integration is pending
- AWS Bedrock for generated content, Azure OpenAI for the general chat route, and AWS Transcribe/S3 for voice notes and photos
- CSV-backed local sample data, `i18next` localization, and Lucide icons

## Application Flow

```text
Login
  ├─ Sales representative → Dashboard → Dealer briefing → Dealer visit capture
  └─ Manager              → Team view → Representative dashboard

IR visit capture is available at /ir-visit-capture/:id.
```

The main routes are:

| Route | Purpose |
|---|---|
| `/login` | Demo sign-in |
| `/team` | Manager view of representative KPIs and team documents |
| `/dashboard` | Territory dashboard, account prioritization, and visit planning |
| `/dealer/:id` | Dealer data, insights, and AI-generated briefing content |
| `/visit-capture/:id` | Current dealer visit form |
| `/ir-visit-capture/:id` | Current IR visit form |
| `/visit/:id` | Compatibility route that renders the current dealer visit form |
| `/submit/:id` | Older review-and-submit screen |
| `/success` | Older submission confirmation screen |

The newer dealer and IR forms save drafts or submitted visits through the data API. They also support notes, agreed actions, photos, PDF export/printing, and voice transcription. Their submit action currently saves the form in place; it does not continue to the older review or success screens. Those older screens remain routed in the app but are not part of the current briefing-to-visit path.

## Source Map

```text
src/
├── App.jsx                    # Theme context, routes, guards, and shared layout
├── main.jsx                   # React entry point; loads global CSS and i18n
├── i18n.js                    # Registers English, German, and French translations
├── index.css                  # Global theme and shared styles
├── components/                # Navbar, progress, chatbot, team documents, voice player, etc.
├── screens/                   # Login, dashboard, briefing, team, visits, and result screens
├── services/
│   ├── api.js                 # Client-side auth and HTTP clients for the API services
│   └── dealerScoring.js       # KPI scoring, filtering, and prioritization
├── data/
│   ├── dataService.js         # Parses local CSV data and exposes sample-data helpers
│   ├── csvLoader.js           # CSV parser
│   ├── teamReps.js            # Mock manager-view representative metrics
│   ├── teamDocuments.js       # Mock manager document dataset
│   ├── ragKnowledge.js        # Legacy IAM knowledge content
│   └── */                     # Dealer CSVs, planning KPIs, parts growth, and campaigns
├── hooks/useVoiceRecorder.js  # Browser recording and transcription workflow
├── config/kpiWeights.config.js # Seasonal KPI scoring weights
├── locales/                   # English, German, French, plus an unregistered Chinese file
└── utils/dateUtils.js         # Date and week formatting helpers
```

The application is still a demo: many displayed values are hardcoded, and local CSVs and mock datasets are used throughout the UI. `dataService.js` supplies sample dealer records and planning/campaign data; manager metrics and team documents are mock data. Some screens call existing API endpoints, but the real data source will be connected after the UI and app flow are finalized. Until then, treat displayed business data as illustrative rather than authoritative.

Weekly recommendation and visit-capture rows are saved locally as JSON table mirrors in `table_structures/recommendation.json` and `table_structures/visit_capture.json`. They are shared by the manager and sales-rep sessions through the local Express service, and are intended to remain in Git as working reference data until the schema is finalized. No AWS connection is needed for this local recommendation/visit workflow.

## Backend Boundaries

The browser has two main API paths:

- `VITE_API_URL` points to the currently wired data API endpoints for dealer lookups, insights, ABC segmentation, and visit draft/save/search. These endpoints do not mean the production data-source integration is complete. When unset, the client uses `/api`; Vite proxies that prefix to `http://localhost:8080` by default.
- `/local-api` is the file-backed local CRUD service. Vite always proxies it to the local Express server (`http://localhost:8080` by default), independently of `VITE_API_URL`.
- `VITE_AI_URL` points to the Express service for `/api/ai/*`, photo upload, and signed media URLs. For local development, set it to `http://localhost:8080`.

The Express server in `server.js` handles:

- `/api/ai/chat` with Azure OpenAI
- `/api/ai/generate` with AWS Bedrock
- `/api/ai/transcribe` with AWS Transcribe and S3 audio storage
- `/api/upload-photo` and `/api/photo-url` with S3
- Static serving of `dist/` and history fallback in production

The typed Parts and Dealer Transactions chatbot calls a separately configured AWS API Gateway URL directly from `src/services/api.js`. The Promotion & Campaign chat mode is a placeholder.

### Storage backend: debug mode (local files) or AWS

One flag decides where **recommendations and visit capture** are saved. Set it in `.env` and **restart `npm run dev`**:

```
VITE_DEBUG_MODE=true    # default: local JSON files in table_structures/ (needs npm run dev:server)
VITE_DEBUG_MODE=false   # AWS: Lambda + DynamoDB through the two HTTP APIs below
VITE_VISIT_CAPTURE_API_URL=https://<visit-api-id>.execute-api.eu-central-1.amazonaws.com
VITE_RECOMMENDATION_API_URL=https://<recommendation-api-id>.execute-api.eu-central-1.amazonaws.com
```

- Vite only exposes `VITE_`-prefixed variables to the browser, hence `VITE_DEBUG_MODE`. Unset or any value other than `false` means debug mode (local).
- Leave `VITE_API_URL` alone; it belongs to the dealer data API.
- With debug mode off, the browser calls the APIs directly, so each API's CORS settings must allow the app's origin (currently `http://localhost:5173`). The recommendation API must have CORS enabled before this works.
- Local and AWS data are separate; switching modes does not copy anything across. Local mode links a submitted visit to its recommendation on the server; AWS mode looks up the rep's current-week recommendation for that dealer when the visit is saved, and saves the visit unlinked if the lookup fails.
- AWS has no delete or batch-create route for recommendations, so each manager Save writes a new batch (one POST per row) and the app reads only the newest batch for a rep and week. Older batches stay in the table; a reconciliation job must ignore them.
- Both AWS APIs are **unauthenticated** and `sales_rep_id` is only a filter that can be spoofed. Use AWS mode for controlled POC testing only; data goes to shared DynamoDB tables.
- Client tests (fetch is mocked, no AWS calls): `npm run test:client`.

## Local Development

Requirements: Node.js 18 or later and npm. The recommendation and visit-capture workflow uses local files and works without AWS. Credentials/access are only needed for external data or AI/media features.

```powershell
npm install
Copy-Item .env.example .env
```

Configure `.env` only for features that need external services. `VITE_LOCAL_API_URL` is optional; it defaults to the local Express server. `VITE_API_URL` is only needed for the existing remote dealer data API. `VITE_AI_URL`, AWS credentials and `S3_BUCKET`, Azure OpenAI values, and Bedrock access are only needed for AI, transcription, photo, and media features. Do not commit `.env` or put provider secrets in `VITE_*` variables.

Run each command in its own terminal:

Terminal 1, frontend:

```sh
npm run dev
```

Terminal 2, Express API/media service:

```sh
npm run dev:server
```

Vite prints the frontend URL (normally `http://localhost:5173`). To build and serve the frontend through Express:

```powershell
npm run build
npm start
```

`SETUP.bat` installs dependencies and starts only Vite; it does not start the Express service.

## Demo Limitations

- Authentication is demo-only and implemented in the browser with hardcoded demo profiles. Route guards are not production authorization.
- Many UI values are hardcoded or come from local CSV/mock data. The real data source will be integrated after the UI and app flow are fixed; current business values are illustrative. The local CSV has no customer-MoM field, so recommendation demo scoring temporarily uses monthly sales growth as that KPI's proxy.
- AI providers are split across services. The typed chat endpoint is hardcoded in the client, and the campaign assistant is not implemented.
- English, German, and French are registered with i18next. A Chinese locale file exists but is not currently enabled.
- The `/submit` and `/success` experience is an older path and is not reached by the current dealer or IR form submit actions.
- This is a demo, not a production-ready secure or offline-capable field application.