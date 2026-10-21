import { apiRequest } from './client';

function extractList(result) {
  const payload = result?.data ?? result;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function apiAddonToRow(item) {
  return {
    id: String(item?.id ?? ''),
    name: item?.name || '',
    category: item?.category || 'General',
    isActive: item?.is_active !== false,
    sortOrder: Number(item?.sort_order) || 0,
  };
}

// Active-only by default (order sheet checkboxes). Pass includeInactive for admin.
export async function listAddonCatalogRequest({ includeInactive = false } = {}) {
  const params = new URLSearchParams();
  if (includeInactive) params.set('include_inactive', '1');
  const query = params.toString();
  const path = query
    ? `/api/addon-catalog/list/?${query}`
    : '/api/addon-catalog/list/';
  const result = await apiRequest(path);
  return extractList(result).map(apiAddonToRow);
}

export async function createAddonCatalogRequest({
  name,
  category,
  sortOrder,
  isActive = true,
}) {
  return apiRequest('/api/addon-catalog/create/', {
    method: 'POST',
    body: {
      name: String(name || '').trim(),
      category: String(category || '').trim() || 'General',
      sort_order: Number(sortOrder) || 0,
      is_active: Boolean(isActive),
    },
  });
}

export async function updateAddonCatalogRequest(
  id,
  { name, category, sortOrder, isActive }
) {
  const body = {};
  if (name !== undefined) body.name = String(name).trim();
  if (category !== undefined) body.category = String(category).trim();
  if (sortOrder !== undefined) body.sort_order = Number(sortOrder) || 0;
  if (isActive !== undefined) body.is_active = Boolean(isActive);

  return apiRequest(`/api/addon-catalog/${id}/`, {
    method: 'PATCH',
    body,
  });
}

// Soft-delete (is_active=false) on the API.
export async function deleteAddonCatalogRequest(id) {
  return apiRequest(`/api/addon-catalog/${id}/`, {
    method: 'DELETE',
  });
}
