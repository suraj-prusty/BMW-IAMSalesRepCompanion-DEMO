import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVisitCaptureClient, VisitCaptureError } from './visitCaptureClient.js';

const AWS_URL = 'https://abc123.execute-api.eu-central-1.amazonaws.com';

function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  fn.calls = calls;
  return fn;
}

const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const replyWithBadJson = (status) => ({ ok: status < 400, status, json: async () => { throw new SyntaxError('bad'); } });

function client(overrides = {}) {
  const fetchImpl = overrides.fetchImpl ?? mockFetch(() => reply({}));
  return {
    fetchImpl,
    api: createVisitCaptureClient({ getSalesRepId: () => 'marcus.schmidt', fetchImpl, ...overrides }),
  };
}

test('defaults to local mode and the existing /local-api paths', async () => {
  const { api, fetchImpl } = client({ fetchImpl: mockFetch(() => reply({ visit: null, draft: null, rows: [] })) });
  await api.getDraft('D107', 'dealer');
  await api.save('D107', 'v-1', { status: 'draft' });
  await api.search('D107', 'dealer', '2026-10-12');
  await api.list({ salesRepId: 'marcus.schmidt' });

  assert.deepEqual(fetchImpl.calls.map((c) => c.url), [
    '/local-api/visit-capture/D107/draft?form_type=dealer&sales_rep_id=marcus.schmidt',
    '/local-api/visit-capture/D107/v-1',
    '/local-api/visit-capture/D107/search?form_type=dealer&visit_date=2026-10-12&sales_rep_id=marcus.schmidt',
    '/local-api/visit-capture?sales_rep_id=marcus.schmidt',
  ]);
});

test('an unknown mode value falls back to local', async () => {
  const { api, fetchImpl } = client({ mode: 'cloud', awsUrl: AWS_URL, fetchImpl: mockFetch(() => reply({ draft: null })) });
  await api.getDraft('D107', 'dealer');
  assert.ok(fetchImpl.calls[0].url.startsWith('/local-api/'));
});

test('aws mode calls the configured URL without double slashes', async () => {
  const { api, fetchImpl } = client({ mode: 'aws', awsUrl: `${AWS_URL}//`, fetchImpl: mockFetch(() => reply({ visit: null, rows: [] })) });
  await api.get('D107', 'v-1');
  await api.list({ salesRepId: 'marcus.schmidt', startDate: '2026-10-01', endDate: '2026-10-31' });

  assert.deepEqual(fetchImpl.calls.map((c) => c.url), [
    `${AWS_URL}/visit-capture/D107/v-1`,
    `${AWS_URL}/visit-capture?sales_rep_id=marcus.schmidt&start_date=2026-10-01&end_date=2026-10-31`,
  ]);
});

test('path segments and query values are encoded', async () => {
  const { api, fetchImpl } = client({
    mode: 'aws',
    awsUrl: AWS_URL,
    getSalesRepId: () => 'a b&c=d',
    fetchImpl: mockFetch(() => reply({ draft: null, visit: null })),
  });
  await api.getDraft('D 1/07', 'dealer');
  await api.save('D 1/07', 'v/1 2', {});

  assert.equal(fetchImpl.calls[0].url, `${AWS_URL}/visit-capture/D%201%2F07/draft?form_type=dealer&sales_rep_id=a%20b%26c%3Dd`);
  assert.equal(fetchImpl.calls[1].url, `${AWS_URL}/visit-capture/D%201%2F07/v%2F1%202`);
});

test('draft and search always send the current sales_rep_id', async () => {
  let rep = 'marcus.schmidt';
  const { api, fetchImpl } = client({ getSalesRepId: () => rep, fetchImpl: mockFetch(() => reply({ draft: null, visit: null })) });
  await api.getDraft('D107', 'ir');
  rep = 'sofia.keller';
  await api.search('D107', 'ir', '2026-10-12');

  assert.match(fetchImpl.calls[0].url, /sales_rep_id=marcus\.schmidt/);
  assert.match(fetchImpl.calls[1].url, /sales_rep_id=sofia\.keller/);
});

test('GET requests carry no Content-Type header while PUT does', async () => {
  const { api, fetchImpl } = client({ fetchImpl: mockFetch(() => reply({ draft: null, visit: {} })) });
  await api.getDraft('D107', 'dealer');
  await api.save('D107', 'v-1', { status: 'draft' });

  assert.equal(fetchImpl.calls[0].init.headers, undefined);
  assert.equal(fetchImpl.calls[1].init.method, 'PUT');
  assert.equal(fetchImpl.calls[1].init.headers['Content-Type'], 'application/json');
});

test('response envelopes are preserved and dealer_id is added from dealer_code', async () => {
  const visit = { dealer_code: 'D107', visit_id: 'v-1', status: 'draft' };
  const { api } = client({
    fetchImpl: mockFetch((url) => {
      if (url.includes('/draft')) return reply({ draft: visit });
      if (url.includes('/search')) return reply({ visit: null });
      if (url.includes('/visit-capture?')) return reply({ rows: [visit, { dealer_id: 'D1', dealer_code: 'D9' }] });
      return reply({ visit });
    }),
  });

  assert.equal((await api.getDraft('D107', 'dealer')).draft.dealer_id, 'D107');
  assert.equal((await api.search('D107', 'dealer', '2026-10-12')).visit, null);
  assert.equal((await api.save('D107', 'v-1', {})).visit.visit_id, 'v-1');
  assert.equal((await api.get('D107', 'v-1')).visit.dealer_id, 'D107');
  const { rows } = await api.list({ salesRepId: 'r' });
  assert.deepEqual(rows.map((r) => r.dealer_id), ['D107', 'D1']);
});

test('a missing draft stays null and a missing rows list becomes an empty array', async () => {
  const { api } = client({ fetchImpl: mockFetch((url) => reply(url.includes('/draft') ? {} : {})) });
  assert.equal((await api.getDraft('D107', 'dealer')).draft, null);
  assert.deepEqual((await api.list({ salesRepId: 'r' })).rows, []);
});

test('save sends sales_rep_id from the client and keeps the payload fields', async () => {
  const { api, fetchImpl } = client({ fetchImpl: mockFetch(() => reply({ visit: {} })) });
  await api.save('D107', 'v-1', { status: 'submitted', sales_rep_id: 'spoofed', form_data: { visit_notes: 'x' } });

  const body = JSON.parse(fetchImpl.calls[0].init.body);
  assert.equal(body.sales_rep_id, 'marcus.schmidt');
  assert.equal(body.status, 'submitted');
  assert.deepEqual(body.form_data, { visit_notes: 'x' });
});

test('missing or blank recommendation_id is not sent, and a real one is trimmed', async () => {
  const { api, fetchImpl } = client({ fetchImpl: mockFetch(() => reply({ visit: {} })) });
  for (const value of [undefined, null, '', '   ', 42]) {
    await api.save('D107', 'v-1', { status: 'draft', recommendation_id: value });
  }
  await api.save('D107', 'v-1', { status: 'draft', recommendation_id: ' rec-1 ' });

  const bodies = fetchImpl.calls.map((c) => JSON.parse(c.init.body));
  assert.ok(bodies.slice(0, 5).every((b) => !('recommendation_id' in b)));
  assert.equal(bodies[5].recommendation_id, 'rec-1');
});

test('4xx errors surface the API message safely', async () => {
  const { api } = client({
    mode: 'aws',
    awsUrl: AWS_URL,
    fetchImpl: mockFetch(() => reply({ error: 'A submitted visit cannot be saved as a draft' }, 409)),
  });
  await assert.rejects(api.save('D107', 'v-1', {}), (err) => {
    assert.ok(err instanceof VisitCaptureError);
    assert.equal(err.status, 409);
    assert.equal(err.message, "Couldn't save the visit. A submitted visit cannot be saved as a draft.");
    return true;
  });
});

test('5xx details and non-JSON error bodies are never shown', async () => {
  const leaky = client({ fetchImpl: mockFetch(() => reply({ error: 'ProvisionedThroughputExceeded arn:aws:dynamodb secret' }, 500)) });
  await assert.rejects(leaky.api.list({ salesRepId: 'r' }), (err) => {
    assert.doesNotMatch(err.message, /arn:aws|secret|Provisioned/);
    assert.match(err.message, /Couldn't load visits\. The visit service hit a problem/);
    return true;
  });

  const html = client({ fetchImpl: mockFetch(() => replyWithBadJson(403)) });
  await assert.rejects(html.api.get('D107', 'v-1'), /Couldn't load the visit\. The service rejected the request \(status 403\)\./);
});

test('local mode: a bodyless 5xx (dev proxy with Express down) says the API is not running', async () => {
  const proxyDown = client({ fetchImpl: mockFetch(() => replyWithBadJson(500)) });
  await assert.rejects(proxyDown.api.save('D107', 'v-1', {}), (err) => {
    assert.equal(err.kind, 'network');
    assert.match(err.message, /Couldn't save the visit\. The local API isn't running.*npm run dev:server/);
    return true;
  });

  const realError = client({ fetchImpl: mockFetch(() => reply({ error: 'disk full' }, 500)) });
  await assert.rejects(realError.api.save('D107', 'v-1', {}), /The visit service hit a problem/);

  const aws = client({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: mockFetch(() => replyWithBadJson(500)) });
  await assert.rejects(aws.api.save('D107', 'v-1', {}), /The visit service hit a problem/);
});

test('network failures give a mode-specific friendly message without leaking the payload', async () => {
  const failing = () => mockFetch(() => { throw new TypeError('Failed to fetch https://secret-host?visit_notes=private'); });

  const aws = client({ mode: 'aws', awsUrl: AWS_URL, fetchImpl: failing() });
  await assert.rejects(aws.api.save('D107', 'v-1', { form_data: { visit_notes: 'private' } }), (err) => {
    assert.equal(err.kind, 'network');
    assert.match(err.message, /AWS visit service can't be reached.*CORS/);
    assert.doesNotMatch(err.message, /private|secret-host/);
    return true;
  });

  const local = client({ fetchImpl: failing() });
  await assert.rejects(local.api.getDraft('D107', 'dealer'), /local API isn't running.*npm run dev:server/);
});

test('aws mode without a valid URL fails with a clear configuration message', async () => {
  for (const awsUrl of ['', undefined, 'not-a-url']) {
    const { api, fetchImpl } = client({ mode: 'aws', awsUrl });
    await assert.rejects(api.getDraft('D107', 'dealer'), (err) => {
      assert.equal(err.kind, 'config');
      assert.match(err.message, /VITE_VISIT_CAPTURE_API_URL/);
      return true;
    });
    assert.equal(fetchImpl.calls.length, 0);
  }
});

test('an unreadable success body is reported as an unexpected response', async () => {
  const { api } = client({ fetchImpl: mockFetch(() => replyWithBadJson(200)) });
  await assert.rejects(api.getDraft('D107', 'dealer'), /Couldn't load your saved draft\. The service sent an unexpected response\./);
});
