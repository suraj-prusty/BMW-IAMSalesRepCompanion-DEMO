import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecommendationClient, isoWeekLabel, RecommendationError } from './recommendationClient.js';

const AWS_URL = 'https://rec123.execute-api.eu-central-1.amazonaws.com';

function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    return handler(url, init, calls.length);
  };
  fn.calls = calls;
  return fn;
}

const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const badJson = (status) => ({ ok: status < 400, status, json: async () => { throw new SyntaxError('bad'); } });

const make = (overrides = {}) => {
  let counter = 0;
  const fetchImpl = overrides.fetchImpl ?? mockFetch(() => reply({}));
  return {
    fetchImpl,
    api: createRecommendationClient({
      fetchImpl,
      newId: () => `id-${++counter}`,
      now: () => new Date('2026-10-13T14:16:06.730Z'),
      ...overrides,
    }),
  };
};

const batch = () => ({
  market: 'DE',
  manager_id: 'm.mueller',
  planning_period_label: '2026-W42',
  planning_period_start: '2026-10-12',
  planning_period_end: '2026-10-18',
  selected_kpis_json: { abc: { selected: true, status: 'critical' } },
  rows: [
    { sales_rep_id: 'marcus.schmidt', dealer_id: 'D107', account_type: 'DEALER', rank: 1, dealer_sales: 158351.5, carry_over_count: 0 },
    { sales_rep_id: 'sofia.keller', dealer_id: 105, rank: 2, dealer_sales: '130814', carry_over_count: 1 },
  ],
});

test('local mode keeps the existing /local-api routes and methods', async () => {
  const fetchImpl = mockFetch((url) => reply(url.includes('/save') ? { save_batch_id: 'sb', count: 2 } : { rows: [{ recommendation_id: 'r1' }], recommendation: {} }));
  const { api } = make({ fetchImpl });

  await api.save(batch());
  assert.equal(fetchImpl.calls[0].url, '/local-api/recommendations/save');
  assert.equal(fetchImpl.calls[0].init.method, 'POST');
  assert.equal(fetchImpl.calls[0].body.rows.length, 2);

  assert.deepEqual(await api.list('marcus.schmidt', '2026-W42'), [{ recommendation_id: 'r1' }]);
  assert.equal(fetchImpl.calls[1].url, '/local-api/recommendations?sales_rep_id=marcus.schmidt&planning_period_label=2026-W42');

  await api.getBatch('sb-DE-2026W42');
  assert.equal(fetchImpl.calls[2].url, '/local-api/recommendations/batch/sb-DE-2026W42');

  await api.updateAction('r1', 'ACCEPTED', null);
  assert.equal(fetchImpl.calls[3].url, '/local-api/recommendations/r1');
  assert.equal(fetchImpl.calls[3].init.method, 'PATCH');
  assert.deepEqual(fetchImpl.calls[3].body, { rep_action: 'ACCEPTED', action_by: null });
});

test('aws save POSTs one complete row per recommendation under a new timestamped batch id', async () => {
  const fetchImpl = mockFetch(() => reply({ message: 'Recommendation created' }, 201));
  const { api } = make({ mode: 'aws', awsUrl: `${AWS_URL}/`, fetchImpl });
  const result = await api.save(batch());

  assert.deepEqual(result, { save_batch_id: 'sb-DE-2026W42-20261013T141606Z', count: 2, backend: 'aws' });
  assert.equal(fetchImpl.calls.length, 2);
  assert.ok(fetchImpl.calls.every((c) => c.url === `${AWS_URL}/recommendations` && c.init.method === 'POST'));

  const [first, second] = fetchImpl.calls.map((c) => c.body);
  assert.deepEqual(first, {
    recommendation_id: 'id-1',
    save_batch_id: 'sb-DE-2026W42-20261013T141606Z',
    market: 'DE',
    manager_id: 'm.mueller',
    sales_rep_id: 'marcus.schmidt',
    planning_period_label: '2026-W42',
    planning_period_start: '2026-10-12',
    planning_period_end: '2026-10-18',
    selected_kpis_json: { abc: { selected: true, status: 'critical' } },
    generated_at: '2026-10-13T14:16:06.730Z',
    dealer_id: 'D107',
    account_type: 'DEALER',
    rank: 1,
    dealer_sales: 158351.5,
    carry_over_count: 0,
    rep_action: 'RECOMMENDED',
    action_at: null,
    action_by: null,
  });
  assert.ok(!('rep_period' in first));
  assert.equal(second.dealer_id, '105');
  assert.equal(second.dealer_sales, 130814);
  assert.equal(second.account_type, 'DEALER');
  assert.equal(second.carry_over_count, 1);
});

test('aws save reports a partial save so the manager can save again', async () => {
  const fetchImpl = mockFetch((url, init, n) => (n === 2 ? reply({ message: 'DynamoDB operation failed' }, 500) : reply({}, 201)));
  const { api } = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl });

  await assert.rejects(api.save(batch()), (err) => {
    assert.ok(err instanceof RecommendationError);
    assert.match(err.message, /Couldn't save the recommendations\. The recommendation service hit a problem/);
    assert.match(err.message, /Only 1 of 2 recommendations were saved; click Save again/);
    assert.doesNotMatch(err.message, /DynamoDB/);
    return true;
  });
});

test('aws list encodes rep_period, reads items, and returns only the newest batch in rank order', async () => {
  const fetchImpl = mockFetch(() => reply({
    rep_period: 'marcus.schmidt#2026-W42',
    count: 5,
    items: [
      { recommendation_id: 'old-1', save_batch_id: 'sb-A', generated_at: '2026-10-12T08:00:00.000Z', rank: 1 },
      { recommendation_id: 'new-2', save_batch_id: 'sb-B', generated_at: '2026-10-13T14:16:06.730Z', rank: 2 },
      { recommendation_id: 'old-2', save_batch_id: 'sb-A', generated_at: '2026-10-12T08:00:00.000Z', rank: 2 },
      { recommendation_id: 'new-1', save_batch_id: 'sb-B', generated_at: '2026-10-13T14:16:06.730Z', rank: 1 },
      { recommendation_id: 'new-3', save_batch_id: 'sb-B', generated_at: '2026-10-13T14:16:06.730Z', rank: 3 },
    ],
  }));
  const { api } = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl });
  const rows = await api.list('marcus.schmidt', '2026-W42');

  assert.equal(fetchImpl.calls[0].url, `${AWS_URL}/recommendations/rep/marcus.schmidt%232026-W42`);
  assert.equal(fetchImpl.calls[0].init.headers, undefined);
  assert.deepEqual(rows.map((r) => r.recommendation_id), ['new-1', 'new-2', 'new-3']);
});

test('aws list handles an empty week, bare arrays, and rejects a missing period', async () => {
  const empty = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply({ rep_period: 'x#y', count: 0, items: [] })) });
  assert.deepEqual(await empty.api.list('marcus.schmidt', '2026-W42'), []);

  const bare = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply([{ recommendation_id: 'a', save_batch_id: 's', rank: 1 }])) });
  assert.equal((await bare.api.list('marcus.schmidt', '2026-W42')).length, 1);

  await assert.rejects(empty.api.list('marcus.schmidt', undefined), /planning period are required/);
  await assert.rejects(empty.api.list('', '2026-W42'), /planning period are required/);
});

test('aws update uses PUT with an allowed-fields body and omits a blank action_by', async () => {
  const fetchImpl = mockFetch(() => reply({ recommendation_id: 'r1', rep_action: 'ACCEPTED' }));
  const { api } = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl });

  const withActor = await api.updateAction('r 1', 'ACCEPTED', 'm.mueller');
  assert.equal(fetchImpl.calls[0].url, `${AWS_URL}/recommendations/r%201`);
  assert.equal(fetchImpl.calls[0].init.method, 'PUT');
  assert.deepEqual(fetchImpl.calls[0].body, { rep_action: 'ACCEPTED', action_at: '2026-10-13T14:16:06.730Z', action_by: 'm.mueller' });
  assert.equal(withActor.recommendation.rep_action, 'ACCEPTED');

  await api.updateAction('r1', 'POSTPONED', null);
  assert.ok(!('action_by' in fetchImpl.calls[1].body));
});

test('aws batch read uses the batch route and sorts by rank', async () => {
  const fetchImpl = mockFetch(() => reply({ count: 2, items: [{ rank: 2 }, { rank: 1 }] }));
  const { api } = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl });

  assert.deepEqual((await api.getBatch('sb-DE-2026W42-X')).map((r) => r.rank), [1, 2]);
  assert.equal(fetchImpl.calls[0].url, `${AWS_URL}/recommendations/batch/sb-DE-2026W42-X`);
});

test('findForVisit matches the exact rep, week and dealer in AWS mode only', async () => {
  const fetchImpl = mockFetch(() => reply({ items: [
    { recommendation_id: 'rec-107', dealer_id: 'D107', save_batch_id: 's', rank: 1 },
    { recommendation_id: 'rec-102', dealer_id: 'D102', save_batch_id: 's', rank: 2 },
  ] }));
  const { api } = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl });

  assert.equal(await api.findForVisit({ salesRepId: 'marcus.schmidt', dealerId: 'D102', visitDate: '2026-10-13' }), 'rec-102');
  assert.equal(fetchImpl.calls[0].url, `${AWS_URL}/recommendations/rep/marcus.schmidt%232026-W42`);
  assert.equal(await api.findForVisit({ salesRepId: 'marcus.schmidt', dealerId: 'D999', visitDate: '2026-10-13' }), undefined);

  const before = fetchImpl.calls.length;
  for (const input of [
    { salesRepId: '', dealerId: 'D107', visitDate: '2026-10-13' },
    { salesRepId: 'marcus.schmidt', dealerId: '', visitDate: '2026-10-13' },
    { salesRepId: 'marcus.schmidt', dealerId: 'D107', visitDate: 'not-a-date' },
    { salesRepId: 'marcus.schmidt', dealerId: 'D107' },
  ]) {
    assert.equal(await api.findForVisit(input), undefined);
  }
  assert.equal(fetchImpl.calls.length, before);

  const local = make({ fetchImpl: mockFetch(() => reply({})) });
  assert.equal(await local.api.findForVisit({ salesRepId: 'marcus.schmidt', dealerId: 'D107', visitDate: '2026-10-13' }), undefined);
  assert.equal(local.fetchImpl.calls.length, 0);
});

test('isoWeekLabel follows ISO weeks across year boundaries', () => {
  assert.equal(isoWeekLabel('2026-10-13'), '2026-W42');
  assert.equal(isoWeekLabel('2026-10-12'), '2026-W42');
  assert.equal(isoWeekLabel('2026-10-18'), '2026-W42');
  assert.equal(isoWeekLabel('2026-10-19'), '2026-W43');
  assert.equal(isoWeekLabel('2026-01-01'), '2026-W01');
  assert.equal(isoWeekLabel('2027-01-01'), '2026-W53');
});

test('errors are friendly: CORS/network, 4xx message, 5xx hidden, missing URL', async () => {
  const down = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => { throw new TypeError('Failed to fetch secret'); }) });
  await assert.rejects(down.api.list('marcus.schmidt', '2026-W42'), /Couldn't load your recommendations\. The AWS recommendation service can't be reached.*CORS/);

  const rejected = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply({ message: 'Invalid JSON request body' }, 400)) });
  await assert.rejects(rejected.api.updateAction('r1', 'X', null), /Couldn't update the recommendation\. Invalid JSON request body\./);

  const noRoute = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply({ message: 'Route not supported' }, 404)) });
  await assert.rejects(noRoute.api.getBatch('x'), /Route not supported\./);

  const leaky = make({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply({ message: 'arn:aws:dynamodb secret' }, 500)) });
  await assert.rejects(leaky.api.getBatch('x'), (err) => {
    assert.doesNotMatch(err.message, /arn:aws|secret/);
    return true;
  });

  for (const awsUrl of ['', undefined, 'nope']) {
    const unconfigured = make({ mode: 'aws', awsUrl });
    await assert.rejects(unconfigured.api.list('marcus.schmidt', '2026-W42'), (err) => {
      assert.equal(err.kind, 'config');
      assert.match(err.message, /VITE_RECOMMENDATION_API_URL/);
      return true;
    });
    assert.equal(unconfigured.fetchImpl.calls.length, 0);
  }

  const proxyDown = make({ fetchImpl: mockFetch(() => badJson(500)) });
  await assert.rejects(proxyDown.api.list('marcus.schmidt', '2026-W42'), /local API isn't running.*npm run dev:server/);
});
