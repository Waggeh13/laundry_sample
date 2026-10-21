import {
  apiRequest,
  setCsrfToken,
  getCsrfToken,
  setAccessToken,
  setTokenRefresher,
  setCsrfRefresher,
  getAccessToken,
} from './client';

export async function fetchCsrfToken() {
  const data = await apiRequest('/api/accounts/csrf/');
  const token = data && typeof data === 'object' ? data.csrf_token : null;
  setCsrfToken(token);
  return token;
}

// Fetch a CSRF token only if we don't already have one. Mutating requests
// reuse the cached token and rely on the client's CSRF retry if it ever
// becomes invalid, avoiding an extra round-trip on every call.
async function ensureCsrfToken() {
  return getCsrfToken() || fetchCsrfToken();
}

export async function loginRequest(username, password) {
  // Fresh CSRF right before login so cookie + header are issued together.
  await fetchCsrfToken();
  const data = await apiRequest('/api/accounts/login/', {
    method: 'POST',
    body: { username, password },
  });

  if (data && typeof data === 'object' && data.access) {
    setAccessToken(data.access);
  }

  return data;
}

// Magic-link login for customers (CSRF only, no Bearer). Same success shape as login.
export async function welcomeLoginRequest(token) {
  await fetchCsrfToken();
  const data = await apiRequest('/api/accounts/welcome-login/', {
    method: 'POST',
    body: { token },
    skipAuthHeader: true,
    skipAuthRefresh: true,
  });

  if (data && typeof data === 'object' && data.access) {
    setAccessToken(data.access);
  }

  return data;
}

export async function logoutRequest() {
  try {
    return await apiRequest('/api/accounts/logout/', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export async function changePasswordRequest(
  oldPassword,
  newPassword,
  confirmPassword
) {
  await ensureCsrfToken();
  return apiRequest('/api/accounts/change-password/', {
    method: 'PUT',
    body: {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    },
  });
}

export async function refreshTokenRequest() {
  await ensureCsrfToken();
  const data = await apiRequest('/api/accounts/token/refresh/', {
    method: 'POST',
    // Auth is the refresh_token HttpOnly cookie + CSRF header, never a Bearer.
    skipAuthHeader: true,
    // Don't recurse into the 401 auto-refresh handler from here.
    skipAuthRefresh: true,
  });

  const access = data && typeof data === 'object' ? data.access : null;
  setAccessToken(access);
  return access;
}

export async function verifyTokenRequest(token = getAccessToken()) {
  if (!token) return false;
  try {
    await ensureCsrfToken();
    await apiRequest('/api/accounts/token/verify/', {
      method: 'POST',
      body: { token },
      skipAuthHeader: true,
      skipAuthRefresh: true,
    });
    return true;
  } catch {
    return false;
  }
}

setTokenRefresher(refreshTokenRequest);
setCsrfRefresher(fetchCsrfToken);
