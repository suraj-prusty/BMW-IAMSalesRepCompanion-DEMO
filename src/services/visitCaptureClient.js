// Visit-capture HTTP client for the local Express API or the deployed AWS HTTP API.
// sales_rep_id is a caller-supplied filter, NOT authentication.

import { ApiClientError, createJsonRequester } from './jsonRequest.js';

export const VisitCaptureError = ApiClientError;

const ACTIONS = {
  save: 'save the visit',
  draft: 'load your saved draft',
  search: 'look up the visit',
  get: 'load the visit',
  list: 'load visits',
};

// The AWS API adds dealer_id as an alias of dealer_code; add it here if a backend omits it.
function withDealerId(item) {
  if (item && typeof item === 'object' && item.dealer_code != null && item.dealer_id == null) {
    return { ...item, dealer_id: item.dealer_code };
  }
  return item;
}

export function createVisitCaptureClient({
  mode = 'local',
  awsUrl = '',
  localBase = '/local-api',
  getSalesRepId = () => 'unknown',
  fetchImpl,
} = {}) {
  const request = createJsonRequester({
    isAws: mode === 'aws',
    localBase,
    awsUrl,
    urlVar: 'VITE_VISIT_CAPTURE_API_URL',
    service: 'visit',
    actions: ACTIONS,
    fetchImpl,
  });
  const root = '/visit-capture';
  const dealerPath = (dealerCode) => `${root}/${encodeURIComponent(dealerCode)}`;

  return {
    async getDraft(dealerCode, formType) {
      const data = await request('draft', `${dealerPath(dealerCode)}/draft`, {
        query: { form_type: formType, sales_rep_id: getSalesRepId() },
      });
      return { ...data, draft: withDealerId(data?.draft ?? null) };
    },

    async save(dealerCode, visitId, payload) {
      // A blank recommendation_id is dropped so it can never overwrite an existing link.
      const { recommendation_id: recommendationId, ...rest } = payload ?? {};
      const body = { ...rest, sales_rep_id: getSalesRepId() };
      if (typeof recommendationId === 'string' && recommendationId.trim()) {
        body.recommendation_id = recommendationId.trim();
      }
      const data = await request('save', `${dealerPath(dealerCode)}/${encodeURIComponent(visitId)}`, {
        method: 'PUT',
        body,
      });
      return { ...data, visit: withDealerId(data?.visit ?? null) };
    },

    async search(dealerCode, formType, visitDate) {
      const data = await request('search', `${dealerPath(dealerCode)}/search`, {
        query: { form_type: formType, visit_date: visitDate, sales_rep_id: getSalesRepId() },
      });
      return { ...data, visit: withDealerId(data?.visit ?? null) };
    },

    async get(dealerCode, visitId) {
      const data = await request('get', `${dealerPath(dealerCode)}/${encodeURIComponent(visitId)}`);
      return { ...data, visit: withDealerId(data?.visit ?? null) };
    },

    async list({ salesRepId, startDate, endDate } = {}) {
      const data = await request('list', root, {
        query: { sales_rep_id: salesRepId, start_date: startDate, end_date: endDate },
      });
      return { ...data, rows: (data?.rows ?? []).map(withDealerId) };
    },
  };
}
