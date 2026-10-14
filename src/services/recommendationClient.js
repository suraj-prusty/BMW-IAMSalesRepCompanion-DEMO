// Recommendation client for the local Express JSON store or the deployed AWS HTTP API.
// AWS has no HTTP batch-create or delete route, so a save POSTs one row at a time under a fresh,
// timestamped save_batch_id; reads then return only the newest batch for the rep and week.

import { ApiClientError, createJsonRequester } from './jsonRequest.js';

export const RecommendationError = ApiClientError;

const ACTIONS = {
  save: 'save the recommendations',
  list: 'load your recommendations',
  batch: 'load the recommendation batch',
  update: 'update the recommendation',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const unwrapList = (data) =>
  Array.isArray(data) ? data : (data?.items ?? data?.recommendations ?? data?.rows ?? []);

const byRank = (a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99);

// Re-saving a week writes a new batch, so only the newest batch is current.
function newestBatch(rows) {
  if (!rows.length) return [];
  const newest = rows.reduce((best, row) =>
    `${row.generated_at ?? ''}|${row.save_batch_id ?? ''}` > `${best.generated_at ?? ''}|${best.save_batch_id ?? ''}`
      ? row : best);
  return rows.filter((row) => row.save_batch_id === newest.save_batch_id).sort(byRank);
}

export function isoWeekLabel(dateText) {
  const date = new Date(`${dateText}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date - firstDay) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function createRecommendationClient({
  mode = 'local',
  awsUrl = '',
  localBase = '/local-api',
  fetchImpl,
  newId = () => globalThis.crypto.randomUUID(),
  now = () => new Date(),
} = {}) {
  const isAws = mode === 'aws';
  const request = createJsonRequester({
    isAws,
    localBase,
    awsUrl,
    urlVar: 'VITE_RECOMMENDATION_API_URL',
    service: 'recommendation',
    actions: ACTIONS,
    fetchImpl,
  });

  async function save(batch) {
    if (!isAws) return request('save', '/recommendations/save', { method: 'POST', body: batch });

    const generatedAt = now().toISOString();
    const stamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const saveBatchId = `sb-${batch.market}-${String(batch.planning_period_label).replace(/-/g, '')}-${stamp}`;

    // rep_period is derived by the Lambda, so it is deliberately not sent.
    const rows = (batch.rows ?? []).map((row) => ({
      recommendation_id: newId(),
      save_batch_id: saveBatchId,
      market: batch.market,
      manager_id: batch.manager_id,
      sales_rep_id: row.sales_rep_id,
      planning_period_label: batch.planning_period_label,
      planning_period_start: batch.planning_period_start,
      planning_period_end: batch.planning_period_end,
      selected_kpis_json: batch.selected_kpis_json,
      generated_at: generatedAt,
      dealer_id: String(row.dealer_id),
      account_type: row.account_type || 'DEALER',
      rank: Number(row.rank),
      dealer_sales: Number(row.dealer_sales ?? 0),
      carry_over_count: Number(row.carry_over_count ?? 0),
      rep_action: 'RECOMMENDED',
      action_at: null,
      action_by: null,
    }));

    let saved = 0;
    for (const row of rows) {
      try {
        await request('save', '/recommendations', { method: 'POST', body: row });
        saved += 1;
      } catch (err) {
        const partial = saved > 0
          ? ` Only ${saved} of ${rows.length} recommendations were saved; click Save again to create a complete set.`
          : '';
        throw new ApiClientError(`${err.message}${partial}`, { kind: err.kind, status: err.status });
      }
    }
    return { save_batch_id: saveBatchId, count: saved, backend: 'aws' };
  }

  async function list(salesRepId, period) {
    if (!isAws) {
      const data = await request('list', '/recommendations', {
        query: { sales_rep_id: salesRepId, planning_period_label: period },
      });
      return data?.rows ?? [];
    }
    if (!salesRepId || !period) {
      throw new ApiClientError("Couldn't load your recommendations. A sales rep and planning period are required.", { kind: 'config' });
    }
    // rep_period contains '#', which must be URL-encoded.
    const data = await request('list', `/recommendations/rep/${encodeURIComponent(`${salesRepId}#${period}`)}`);
    return newestBatch(unwrapList(data));
  }

  async function getBatch(saveBatchId) {
    const data = await request('batch', `/recommendations/batch/${encodeURIComponent(saveBatchId)}`);
    return isAws ? unwrapList(data).sort(byRank) : (data?.rows ?? []);
  }

  async function updateAction(recommendationId, repAction, actionBy) {
    const path = `/recommendations/${encodeURIComponent(recommendationId)}`;
    if (!isAws) {
      return request('update', path, { method: 'PATCH', body: { rep_action: repAction, action_by: actionBy } });
    }
    const body = { rep_action: repAction, action_at: now().toISOString() };
    if (actionBy) body.action_by = actionBy;
    const data = await request('update', path, { method: 'PUT', body });
    return { recommendation: data?.recommendation ?? data?.item ?? data };
  }

  // Local mode links visits to recommendations on the server, so only AWS needs this lookup.
  async function findForVisit({ salesRepId, dealerId, visitDate }) {
    if (!isAws || !salesRepId || !dealerId || !DATE_PATTERN.test(visitDate ?? '')) return undefined;
    const rows = await list(salesRepId, isoWeekLabel(visitDate));
    return rows.find((row) => String(row.dealer_id) === String(dealerId))?.recommendation_id;
  }

  return { save, list, getBatch, updateAction, findForVisit };
}
