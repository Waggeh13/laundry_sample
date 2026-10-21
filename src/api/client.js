// Always use same-origin relative URLs (/api/...).
// - Local: CRA setupProxy.js forwards /api to the backend
// - Vercel: vercel.json rewrites /api to the Render backend
// This keeps CSRF cookies first-party (needed for login).
export const API_BASE_URL = '';

function readCsrfCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Seed from the csrf_token cookie (set by a prior /csrf/ call) so the header is
// available immediately after a page reload, before any new fetch.
let csrfToken = readCsrfCookie();

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export function getCsrfToken() {
  return csrfToken;
}

const ACCESS_TOKEN_KEY = 'kolendo_access_token';

let accessToken = null;
try {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
} catch {
  accessToken = null;
}

export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // localStorage may be unavailable (private mode); keep token in memory.
  }
}

export function getAccessToken() {
  return accessToken;
}

// A refresher (registered by the auth module) used to silently obtain a new
// access token when a request fails with 401. Kept as a hook to avoid a
// circular import between this module and the auth API module.
let tokenRefresher = null;
let refreshPromise = null;

export function setTokenRefresher(fn) {
  tokenRefresher = fn;
}

// Called when a request fails with 401 and the silent refresh also fails,
// i.e. the session is truly dead. Registered by AuthContext to clear the
// stored user and let the route guards redirect to login.
let authExpiredHandler = null;

export function setAuthExpiredHandler(fn) {
  authExpiredHandler = fn;
}

function runRefresh() {
  if (!tokenRefresher) return Promise.resolve(null);
  if (!refreshPromise) {
    refreshPromise = Promise.resolve()
      .then(() => tokenRefresher())
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// A CSRF refresher (registered by the auth module) used to fetch a fresh token
// only when a request fails CSRF validation, so the happy path avoids an extra
// round-trip per mutation.
let csrfRefresher = null;
let csrfPromise = null;

export function setCsrfRefresher(fn) {
  csrfRefresher = fn;
}

function runCsrfRefresh() {
  if (!csrfRefresher) return Promise.resolve(null);
  if (!csrfPromise) {
    csrfPromise = Promise.resolve()
      .then(() => csrfRefresher())
      .catch(() => null)
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

// Fire-and-forget ping to wake the backend (Render free tier cold-starts after
// idle). Errors are ignored; this only exists to reduce first-request latency.
export function warmUpServer() {
  try {
    fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      credentials: 'include',
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    body,
    headers = {},
    skipAuthHeader = false,
    skipAuthRefresh = false,
    _retried = false,
  } = {}
) {
  const upperMethod = method.toUpperCase();
  const requestHeaders = { Accept: 'application/json', ...headers };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Always send the CSRF token (not just on unsafe methods): when the access
  // token is expired, the backend attempts a silent refresh on any request and
  // that path requires X-CSRF-Token, otherwise it fails CSRF validation.
  if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }

  if (!skipAuthHeader && accessToken && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: upperMethod,
      credentials: 'include',
      headers: requestHeaders,
      body:
        body === undefined || body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  } catch (networkError) {
    throw new ApiError('Unable to reach the server. Please try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  const data = await parseBody(response);

  const errorCode =
    data && typeof data === 'object' ? data.error_code : undefined;

  if (
    response.status === 403 &&
    errorCode === 'CSRF_VALIDATION_FAILED' &&
    !_retried &&
    csrfRefresher
  ) {
    const freshCsrf = await runCsrfRefresh();
    if (freshCsrf) {
      return apiRequest(path, {
        method,
        body,
        headers,
        skipAuthHeader,
        skipAuthRefresh,
        _retried: true,
      });
    }
  }

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !_retried &&
    tokenRefresher
  ) {
    const newToken = await runRefresh();
    if (newToken) {
      return apiRequest(path, {
        method,
        body,
        headers,
        skipAuthHeader,
        skipAuthRefresh,
        _retried: true,
      });
    }
    // Refresh failed: the session is dead. Clear it so guards send the user to
    // login instead of leaving them stuck on a screen that can't load data.
    if (authExpiredHandler) authExpiredHandler();
  }

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(`API ${upperMethod} ${path} failed (${response.status})`, data);
    }

    const serverMessage =
      data && typeof data === 'object' && data.message ? data.message : null;
    const message =
      response.status >= 500
        ? serverMessage || 'Something went wrong on the server. Please try again.'
        : serverMessage || `Request failed with status ${response.status}`;
    const code =
      (data && typeof data === 'object' && data.error_code) || 'HTTP_ERROR';
    throw new ApiError(message, { status: response.status, code, data });
  }

  return data;
}

function filenameFromDisposition(header) {
  if (!header) return '';
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() || '';
}

// Download a non-JSON response (e.g. CSV) as a Blob. Mirrors apiRequest auth,
// CSRF, and silent refresh so exports work with the same session.
export async function apiDownload(
  path,
  {
    method = 'GET',
    headers = {},
    skipAuthHeader = false,
    skipAuthRefresh = false,
    fallbackFilename = 'download.csv',
    _retried = false,
  } = {}
) {
  const upperMethod = method.toUpperCase();
  const requestHeaders = { Accept: '*/*', ...headers };

  if (csrfToken) {
    requestHeaders['X-CSRF-Token'] = csrfToken;
  }
  if (!skipAuthHeader && accessToken && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: upperMethod,
      credentials: 'include',
      headers: requestHeaders,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  if (
    response.status === 403 &&
    !_retried &&
    csrfRefresher
  ) {
    // CSV errors may be text; only retry when we know CSRF failed via JSON.
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.clone().json().catch(() => null);
      if (data?.error_code === 'CSRF_VALIDATION_FAILED') {
        const freshCsrf = await runCsrfRefresh();
        if (freshCsrf) {
          return apiDownload(path, {
            method,
            headers,
            skipAuthHeader,
            skipAuthRefresh,
            fallbackFilename,
            _retried: true,
          });
        }
      }
    }
  }

  if (
    response.status === 401 &&
    !skipAuthRefresh &&
    !_retried &&
    tokenRefresher
  ) {
    const newToken = await runRefresh();
    if (newToken) {
      return apiDownload(path, {
        method,
        headers,
        skipAuthHeader,
        skipAuthRefresh,
        fallbackFilename,
        _retried: true,
      });
    }
    if (authExpiredHandler) authExpiredHandler();
  }

  if (!response.ok) {
    const data = await parseBody(response);
    const serverMessage =
      data && typeof data === 'object' && data.message ? data.message : null;
    throw new ApiError(
      serverMessage || `Download failed with status ${response.status}`,
      {
        status: response.status,
        code:
          (data && typeof data === 'object' && data.error_code) || 'HTTP_ERROR',
        data,
      }
    );
  }

  const blob = await response.blob();
  const filename =
    filenameFromDisposition(response.headers.get('Content-Disposition')) ||
    fallbackFilename;

  return { blob, filename };
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || 'download.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
