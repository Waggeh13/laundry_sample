import { apiRequest } from './client';

export async function getDashboardMetrics() {
  const response = await apiRequest('/api/dashboard/metrics/');
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data || {};
  }
  return response || {};
}

// The revenue report requires a date range (start_date + end_date, YYYY-MM-DD)
// and an optional group_by (day | week | month). Omitting the dates makes the
// backend respond 400 MISSING_DATES, so callers must pass a range.
export async function getRevenueReport({ startDate, endDate, groupBy = 'day' } = {}) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (groupBy) params.set('group_by', groupBy);

  const response = await apiRequest(
    `/api/dashboard/revenue-report/?${params.toString()}`
  );
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data || {};
  }
  return response || {};
}
