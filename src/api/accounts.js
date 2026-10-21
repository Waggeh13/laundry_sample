import { apiRequest } from './client';

export async function listAdminsRequest({ page = 1, pageSize = 20, search = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (search.trim()) params.set('search', search.trim());

  return apiRequest(`/api/accounts/admins/?${params.toString()}`);
}

// List superadmins (superadmin only). Non-superadmins get 403, so callers
// should handle failure gracefully (e.g. treat as an empty list).
export async function listSuperadminsRequest({ page = 1, pageSize = 20, search = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (search.trim()) params.set('search', search.trim());

  return apiRequest(`/api/accounts/superadmins/?${params.toString()}`);
}

const OWN_PROFILE_UPDATE_PATH = {
  superadmin: '/api/accounts/superadmin/update/',
  admin: '/api/accounts/admin/update/',
  employee: '/api/accounts/employee/update/',
  customer: '/api/accounts/client/update/',
  client: '/api/accounts/client/update/',
};

// Current authenticated user's full profile (includes client contact fields).
export async function getOwnProfileRequest() {
  return apiRequest('/api/accounts/user/profile/');
}

export async function updateOwnProfileRequest(
  role,
  {
    username,
    firstName,
    lastName,
    phone,
    whatsapp,
    address,
    preferredContact,
  }
) {
  const normalizedRole = String(role || '').toLowerCase();
  const path =
    OWN_PROFILE_UPDATE_PATH[normalizedRole] || OWN_PROFILE_UPDATE_PATH.admin;
  const isClient =
    normalizedRole === 'client' || normalizedRole === 'customer';

  const body = isClient
    ? {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        whatsapp_number: whatsapp,
        address,
        preferred_contact_method: (
          preferredContact || 'phone'
        ).toLowerCase(),
      }
    : {
        username,
        first_name: firstName,
        last_name: lastName,
      };

  return apiRequest(path, {
    method: 'PATCH',
    body,
  });
}

export async function listClientsRequest({ page = 1, pageSize = 50, search = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(Math.min(200, Math.max(1, Number(pageSize) || 50))));
  if (search.trim()) params.set('search', search.trim());

  return apiRequest(`/api/accounts/clients/?${params.toString()}`);
}

export async function listEmployeesRequest({ page = 1, pageSize = 20, search = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (search.trim()) params.set('search', search.trim());

  return apiRequest(`/api/accounts/employees/?${params.toString()}`);
}

export async function createAdminRequest({
  username,
  firstName,
  lastName,
  phone,
}) {
  const body = {
    username,
    first_name: firstName,
    phone_number: String(phone || '').trim(),
  };
  const trimmedLastName = String(lastName || '').trim();
  if (trimmedLastName) body.last_name = trimmedLastName;

  return apiRequest('/api/accounts/admin/create/', {
    method: 'POST',
    body,
  });
}

export async function createEmployeeRequest({
  username,
  firstName,
  lastName,
  phone,
}) {
  const body = {
    username,
    first_name: firstName,
    phone_number: String(phone || '').trim(),
  };
  const trimmedLastName = String(lastName || '').trim();
  if (trimmedLastName) body.last_name = trimmedLastName;

  return apiRequest('/api/accounts/employee/create/', {
    method: 'POST',
    body,
  });
}

export async function createSuperadminRequest({
  username,
  firstName,
  lastName,
  phone,
}) {
  const body = {
    username,
    first_name: firstName,
    phone_number: String(phone || '').trim(),
  };
  const trimmedLastName = String(lastName || '').trim();
  if (trimmedLastName) body.last_name = trimmedLastName;

  return apiRequest('/api/accounts/superadmin/create/', {
    method: 'POST',
    body,
  });
}

export async function getUserByIdRequest(userId, { isSuperadmin = true } = {}) {
  const path = isSuperadmin
    ? `/api/accounts/superadmin/user/${userId}/`
    : `/api/accounts/staff/user/${userId}/`;
  return apiRequest(path);
}

function resolveUpdatePath({ userId, targetRole, isSuperadmin }) {
  if (targetRole === 'Admin') {
    if (!isSuperadmin) {
      throw new Error('Only a super admin can update an admin.');
    }
    return `/api/accounts/superadmin/admin/${userId}/update/`;
  }

  // Employee
  return isSuperadmin
    ? `/api/accounts/superadmin/employee/${userId}/update/`
    : `/api/accounts/admin/employee/${userId}/update/`;
}

export async function updateStaffRequest({
  userId,
  targetRole,
  isSuperadmin,
  firstName,
  lastName,
  phone,
  isActive,
}) {
  // Note: username is intentionally omitted. The backend rejects username
  // changes made by other users ("Only the user themselves can change their
  // username"), so admins/superadmins can only update the fields below.
  const body = {
    first_name: firstName,
    last_name: lastName,
    is_active: isActive,
  };
  if (phone !== undefined && phone !== null && String(phone).trim()) {
    body.phone_number = String(phone).trim();
  }

  return apiRequest(resolveUpdatePath({ userId, targetRole, isSuperadmin }), {
    method: 'PATCH',
    body,
  });
}
