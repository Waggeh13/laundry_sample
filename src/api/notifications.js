import { apiRequest } from './client';
import { clampPageSize, extractPagePayload } from './pagination';

export async function getPickupPreviewRequest() {
  const response = await apiRequest('/api/notifications/pickups/preview/');
  const payload =
    response && typeof response === 'object' && 'data' in response
      ? response.data || {}
      : response || {};
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const countRaw = Number(payload?.count);
  return {
    count: Number.isFinite(countRaw) ? countRaw : results.length,
    results,
  };
}

export async function listPickupNotificationsRequest({
  page = 1,
  pageSize = 20,
} = {}) {
  const size = clampPageSize(pageSize, 20);
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(size));
  const response = await apiRequest(
    `/api/notifications/pickups/?${params.toString()}`
  );
  return extractPagePayload(response, { fallbackPageSize: size });
}

// Admin / superadmin personalized client SMS broadcast.
// Require either non-empty userIds or allActive: true.
export async function sendClientBroadcastSmsRequest({
  message,
  userIds = [],
  allActive = false,
} = {}) {
  const body = {
    message: String(message || '').trim(),
  };
  if (allActive) {
    body.all_active = true;
  } else {
    body.user_ids = (Array.isArray(userIds) ? userIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
    body.all_active = false;
  }
  return apiRequest('/api/notifications/sms/clients/', {
    method: 'POST',
    body,
  });
}
