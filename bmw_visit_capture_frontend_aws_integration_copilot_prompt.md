# Copilot Task: Integrate the BMW Visit-Capture Frontend with the Deployed AWS HTTP API

## Goal

Integrate the existing BMW IAM Sales Rep Companion frontend with the deployed visit-capture AWS HTTP API while preserving the current local-first workflow as the default. Keep the change focused on visit capture. Do not implement authentication in this task and do not redesign the recommendation API.

This is a coding task only. Do not make AWS Console changes, deploy AWS resources, or claim to have tested the live API unless the developer runs those tests and provides results.

## Verified AWS backend

The developer has deployed and manually tested the Python Lambda and API Gateway HTTP API.

- AWS region: `eu-central-1`
- DynamoDB table: `bmw_visit_capture-dev`
- Table primary key: `dealer_code` (HASH), `visit_id` (RANGE)
- GSI: `GSI_REP_VISITS`, partition key `sales_rep_id` (HASH), sort key `visit_date` (RANGE)
- Lambda: `bmw-visit-capture-api`
- API Gateway HTTP API: `bmw-visit-capture-http-api`
- API ID: `l2sznkisd2`
- Invoke URL: `https://l2sznkisd2.execute-api.eu-central-1.amazonaws.com`
- Stage: `$default`, automatic deployment enabled
- CORS configured on API Gateway for origin `http://localhost:5173`, methods GET/PUT/OPTIONS, headers `content-type, authorization`, max age 300, credentials disabled.
- No API Gateway authorizer is configured. Authentication is intentionally deferred.
- Verified live operations:
  - `PUT /visit-capture/{dealer_code}/{visit_id}` saves a visit.
  - `GET /visit-capture/{dealer_code}/{visit_id}` returns the saved visit.
  - `GET /visit-capture/{dealer_code}/draft?form_type=...&sales_rep_id=...` returns the matching rep's draft; another rep gets `draft: null`.
  - `GET /visit-capture/{dealer_code}/search?form_type=...&visit_date=...&sales_rep_id=...` returns the matching visit.
  - `GET /visit-capture?sales_rep_id=...&start_date=...&end_date=...` lists the rep's visits.
- API response envelopes are `{ visit }`, `{ draft }`, and `{ rows }`. Errors use `{ "error": "..." }`.
- Response visits contain `dealer_code` and a compatibility alias `dealer_id`, where `dealer_id` is derived from `dealer_code`.
- Live test record currently created for backend validation: dealer `D107`, visit ID `test-1`, rep `marcus.schmidt`, date `2026-10-12`, status `draft`. Do not hardcode this test record into application behavior. Mention that it should be cleaned up manually after validation if appropriate.

## Existing repo context to inspect first

Read the current source before editing. Key files include:
- `api.js`
- `DealerVisitFormNew.jsx`
- `IRVisitFormNew.jsx`
- `TeamSelect.jsx`
- `server.js`
- `visitCaptureStore.js`
- any existing environment/configuration files and README

Important existing behavior:
- `api.js` uses `LOCAL_API_BASE = import.meta.env.VITE_LOCAL_API_URL || "/local-api"`.
- `currentSalesRepId()` resolves the current user to a sales rep ID using the existing `LOGIN_REP_ID_TO_SALES_REP_ID` mapping, then email or `unknown`.
- `saveVisitCapture` currently uses the local route `PUT /visit-capture/:dealerCode/:visitId` and adds `sales_rep_id`.
- `getDraftVisitCapture(dealerCode, formType)` currently does not pass `sales_rep_id`.
- `searchVisitCapture` currently does not pass `sales_rep_id`.
- The dealer and IR visit forms restore draft state using `{ draft }`, save using `{ visit }`, and submit using `{ visit }`.
- `TeamSelect.jsx` reads `dealer_id` from visit rows; preserve compatibility.
- The local JSON store and Express server must remain usable for local development.
- Recommendation API routes/response shapes do not fully match the existing local client API. Do not make unrelated recommendation API changes as part of this task.
- Recommendation ID linkage is not currently passed explicitly through the form save calls. Treat this as a separate carefully scoped integration concern; do not invent or guess a recommendation ID.

## Requirements

### 1. Add configurable visit-capture backend selection

Implement an explicit configuration for visit-capture API routing.

Suggested environment variables:
- `VITE_VISIT_CAPTURE_API_MODE=local|aws` (default `local`)
- `VITE_VISIT_CAPTURE_API_URL=https://l2sznkisd2.execute-api.eu-central-1.amazonaws.com` for AWS mode

Keep current local behavior as the default so existing development workflows do not break. Do not repurpose `VITE_API_URL`, which may be used for the existing FastAPI/dealer backend. Do not hardcode the AWS URL in application logic; document it in an example env file or README.

Confirm the repo's existing Vite environment convention and naming before implementing. If the repo already has a suitable configuration pattern, reuse it rather than introducing conflicting variables.

### 2. Route visit-capture API methods through the selected backend

Keep the public API helper method names stable where possible. When mode is `local`, preserve current `/local-api` calls and behavior. When mode is `aws`, call the AWS invoke URL with the same path and query contracts.

For AWS mode, support:
- `PUT /visit-capture/{dealer_code}/{visit_id}`
- `GET /visit-capture/{dealer_code}/{visit_id}`
- `GET /visit-capture/{dealer_code}/draft?form_type=...&sales_rep_id=...`
- `GET /visit-capture/{dealer_code}/search?form_type=...&visit_date=...&sales_rep_id=...`
- `GET /visit-capture?sales_rep_id=...&start_date=...&end_date=...`

Encode path segments and query parameters safely. Avoid double slashes when joining the base URL and route. Preserve existing error handling and parse API Gateway error bodies so the UI receives useful, safe messages.

### 3. Pass `sales_rep_id` for draft and search calls

Update the API helper so draft and search requests include `currentSalesRepId()` as `sales_rep_id`. Ensure the correct sales rep ID mapping is used consistently with save/list calls.

Review all callers and update signatures minimally. Do not use a hardcoded rep ID.

### 4. Preserve the current form contract

Do not change the response envelope expected by the forms:
- Draft lookup returns `{ draft: visitOrNull }`.
- Save and submit return `{ visit }`.
- Search returns `{ visit: visitOrNull }`.
- List returns `{ rows: [...] }`.

The AWS backend's `dealer_id` alias should keep `TeamSelect.jsx` compatible. If an adapter is needed for any field-name differences, implement it in the API layer, not by scattering compatibility logic across components.

Ensure both dealer and IR forms still:
- create a visit ID,
- restore draft ID and form fields,
- save a draft,
- submit a visit,
- display errors clearly,
- keep existing navigation and UI behavior.

### 5. Recommendation ID linkage: inspect and report, do not guess

Inspect the existing recommendation selection/state flow and current recommendation API wrappers. Determine whether a reliable `recommendation_id` is already available at the point the visit is saved.

- If a stable, unambiguous recommendation ID is already available in the visit form state, pass it through `saveVisitCapture` without changing recommendation API behavior.
- If it is not reliably available, do not guess by matching only dealer, rep, or week. Do not add a fragile network lookup.
- In that case, document exactly which component/state or API contract is missing and propose a small follow-up task for recommendation linking.

The backend preserves an existing recommendation ID when the incoming value is omitted or blank.

### 6. Security and user experience

- Do not implement authentication or claim `sales_rep_id` is authorization. The API is currently unauthenticated and the query parameter can be spoofed.
- Keep the AWS mode opt-in; do not silently switch all users to AWS.
- Display useful save/load errors without logging visit notes or full form payloads.
- Do not log sensitive form data.
- Do not change API Gateway CORS or AWS resources in code.

### 7. Tests and verification

Inspect the current test setup and use the lightest suitable test approach.

Add or update tests to cover:
- default local mode uses existing `/local-api` paths,
- AWS mode uses configured base URL,
- URL/path/query encoding,
- draft and search requests include `sales_rep_id`,
- correct response envelopes for draft, search, save and list,
- non-2xx API errors are surfaced safely,
- missing/blank optional `recommendation_id` does not cause client-side regressions,
- existing dealer and IR form behavior remains intact where component tests are available.

Mock `fetch`; tests must not call the live AWS API. Run existing relevant tests/build/lint commands and report exact results. Do not claim tests passed unless actually run.

### 8. Documentation

Update README or the project's environment example with:
- local mode remains the default,
- how to opt into AWS mode locally,
- the two suggested env variables,
- restart the Vite dev server after changing env values,
- the API is currently unauthenticated and is for controlled POC testing only,
- switching to AWS should only be done by a developer who understands that visit data will be persisted to the shared AWS DynamoDB table.

Do not commit real credentials or secrets.

## Strict scope restrictions

- Do not edit `server.js` or `visitCaptureStore.js` unless an unavoidable compatibility issue is found; if so, explain it before expanding scope.
- Do not change the deployed Lambda or API Gateway.
- Do not alter the recommendation API routes/contracts in this task.
- Do not implement authentication.
- Do not hardcode test records or a sales rep ID.
- Do not change unrelated UI, form design, or business logic.
- Preserve the existing local-first workflow.

## Required Copilot completion report

At completion, provide:
1. Files changed and why.
2. The exact environment variables and how to enable local AWS mode.
3. Tests/build/lint commands run and their actual results.
4. Confirmation that local mode remains the default.
5. Whether recommendation ID linkage was safely wired or deferred, with the reason.
6. Any remaining risks or manual verification steps.
