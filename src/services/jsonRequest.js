// Shared JSON-over-fetch helper for the local Express API and the AWS HTTP APIs.
// Free of Vite/browser-only imports so the clients built on it can be unit-tested with `node --test`.

export class ApiClientError extends Error {
  constructor(message, { kind, status } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind; // 'config' | 'network' | 'http' | 'response'
    this.status = status;
  }
}

const LOCAL_UNREACHABLE =
  "The local API isn't running. Start it with `npm run dev:server` and try again.";

const trimTrailingSlashes = (value) => String(value ?? '').trim().replace(/\/+$/, '');

export function buildQuery(params) {
  return Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

// service: noun used in messages ("visit"); urlVar: env var to name when the AWS URL is missing.
export function createJsonRequester({
  isAws,
  localBase = '/local-api',
  awsUrl = '',
  urlVar,
  service,
  actions,
  fetchImpl = (...args) => globalThis.fetch(...args),
}) {
  const awsUnreachable =
    `The AWS ${service} service can't be reached. Check your internet connection and that this app's address is allowed by the API's CORS settings.`;
  const serverProblem = `The ${service} service hit a problem. Please try again in a moment.`;

  function baseUrl(action) {
    if (!isAws) return trimTrailingSlashes(localBase);
    const url = trimTrailingSlashes(awsUrl);
    if (!/^https?:\/\//i.test(url)) {
      throw new ApiClientError(
        `Couldn't ${actions[action]}. Debug mode is off, so AWS is used, but ${urlVar} is missing or invalid.`,
        { kind: 'config' },
      );
    }
    return url;
  }

  return async function request(action, path, { method = 'GET', query, body } = {}) {
    const qs = buildQuery(query);
    const url = `${baseUrl(action)}${path}${qs ? `?${qs}` : ''}`;
    // No Content-Type on bodyless requests keeps GETs "simple" so browsers skip the CORS preflight.
    const init = body === undefined
      ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };

    let response;
    try {
      response = await fetchImpl(url, init);
    } catch {
      throw new ApiClientError(
        `Couldn't ${actions[action]}. ${isAws ? awsUnreachable : LOCAL_UNREACHABLE}`,
        { kind: 'network' },
      );
    }

    if (!response.ok) {
      let detail;
      try {
        const data = await response.json();
        const message = data?.error ?? data?.message;
        if (typeof message === 'string') detail = message.slice(0, 200);
      } catch {
        // Non-JSON error body: fall back to the status text below.
      }
      // Locally, a 5xx without a JSON error is the Vite proxy reporting that Express is down.
      if (!isAws && response.status >= 500 && detail === undefined) {
        throw new ApiClientError(`Couldn't ${actions[action]}. ${LOCAL_UNREACHABLE}`, {
          kind: 'network',
          status: response.status,
        });
      }
      // 5xx details can contain internals, so only 4xx messages are shown.
      const reason = response.status >= 500
        ? serverProblem
        : (detail ? `${detail}.` : `The service rejected the request (status ${response.status}).`);
      throw new ApiClientError(`Couldn't ${actions[action]}. ${reason.replace(/\.\.$/, '.')}`, {
        kind: 'http',
        status: response.status,
      });
    }

    try {
      return await response.json();
    } catch {
      throw new ApiClientError(
        `Couldn't ${actions[action]}. The service sent an unexpected response.`,
        { kind: 'response', status: response.status },
      );
    }
  };
}
