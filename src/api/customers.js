import { apiRequest } from './client';

export async function createCustomerRequest({
  username,
  firstName,
  lastName,
  phone,
  whatsapp,
  address,
  preferredContact,
}) {
  const body = {
    username,
    first_name: firstName,
    phone_number: phone,
    whatsapp_number: whatsapp,
    address,
    preferred_contact_method: (preferredContact || 'phone').toLowerCase(),
  };
  const trimmedLastName = String(lastName || '').trim();
  if (trimmedLastName) body.last_name = trimmedLastName;

  return apiRequest('/api/customers/create/', {
    method: 'POST',
    body,
  });
}

export async function updateClientRequest(
  userId,
  { firstName, lastName, phone, whatsapp, address, preferredContact, notes }
) {
  return apiRequest(`/api/accounts/staff/client/${userId}/update/`, {
    method: 'PATCH',
    body: {
      first_name: firstName,
      last_name: lastName,
      phone_number: phone,
      whatsapp_number: whatsapp,
      address,
      preferred_contact_method: (preferredContact || '').toLowerCase(),
      notes,
    },
  });
}

// Map a client list item (from /api/accounts/clients/) to the table row shape.
// The customer profile fields (address/whatsapp/preferred contact/notes) may be
// nested under `customer` or live at the top level depending on the endpoint, so
// we look in both places and keep them so the details/edit screens don't lose
// them on a refresh.
export function apiClientToRow(item) {
  const firstName = item?.first_name || '';
  const lastName = item?.last_name || '';
  const profile = item?.customer && typeof item.customer === 'object' ? item.customer : {};

  return {
    id: String(item?.id ?? Date.now()),
    customerId: item?.customer?.id ?? profile?.id ?? null,
    username: item?.username || '',
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || item?.username || 'Unknown',
    phone: item?.phone_number || profile?.phone_number || '',
    whatsapp: item?.whatsapp_number || profile?.whatsapp_number || '',
    address: item?.address || profile?.address || '',
    preferredContact:
      item?.preferred_contact_method || profile?.preferred_contact_method || '',
    notes: item?.notes || profile?.notes || '',
    status: item?.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
    phoneNeedsCorrection: Boolean(
      item?.phone_needs_correction ?? profile?.phone_needs_correction
    ),
    totalOrders: item?.total_orders ?? 0,
    totalSpent: item?.total_spent != null ? String(item.total_spent) : '0.00',
  };
}
