import { apiRequest } from './client';

export async function listServicesRequest() {
  return apiRequest('/api/services/list/');
}

export async function getServiceByIdRequest(id) {
  return apiRequest(`/api/services/${id}/`);
}

export async function createServiceRequest({
  name,
  description,
  category,
  status = 'active',
}) {
  return apiRequest('/api/services/create/', {
    method: 'POST',
    body: {
      name,
      description,
      category,
      status: String(status).toLowerCase(),
    },
  });
}

export async function updateServiceRequest(
  id,
  { name, description, category, status }
) {
  return apiRequest(`/api/services/${id}/update/`, {
    method: 'PATCH',
    body: {
      name,
      description,
      category,
      status: String(status).toLowerCase(),
    },
  });
}

// Map the slim API service shape to the row shape used by the services table.
export function apiServiceToRow(service) {
  const rawStatus = String(service?.status || 'active').toLowerCase();
  return {
    id: String(service?.id ?? Date.now()),
    name: service?.name || '',
    category: service?.category || 'General',
    status: rawStatus === 'inactive' ? 'INACTIVE' : 'ACTIVE',
    description: service?.description || '',
  };
}
