import { apiRequest } from './client';
import { clampPageSize, extractPagePayload } from './pagination';

export async function listOrdersRequest({
  page = 1,
  pageSize = 50,
  search = '',
  orderStatus = '',
  paymentStatus = '',
} = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(clampPageSize(pageSize, 50)));
  if (search.trim()) params.set('search', search.trim());
  if (orderStatus) params.set('order_status', orderStatus);
  if (paymentStatus) params.set('payment_status', paymentStatus);

  return apiRequest(`/api/orders/list/?${params.toString()}`);
}

export async function getOrderByIdRequest(id) {
  return apiRequest(`/api/orders/${id}/`);
}

// One-click complete. Empty body — never send order_status.
export async function completeOrderRequest(id) {
  return apiRequest(`/api/orders/${id}/complete/`, {
    method: 'POST',
    body: {},
  });
}

export async function listStaffUserOrdersRequest(
  userId,
  { page = 1, pageSize = 20 } = {}
) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(clampPageSize(pageSize, 20)));
  const response = await apiRequest(
    `/api/accounts/staff/user/${userId}/orders/?${params.toString()}`
  );
  return extractPagePayload(response, {
    fallbackPageSize: clampPageSize(pageSize, 20),
  });
}

// Normalize a sheet item row (camelCase) into the API's order_items_data shape.
// Rows with no dirty/clean quantity are skipped by the caller.
function toApiItem(item) {
  return {
    item_name: item.itemName,
    dirty_quantity: Number(item.dirtyQuantity) || 0,
    clean_quantity: Number(item.cleanQuantity) || 0,
    unit_price: Number(item.unitPrice) || 0,
    notes: item.notes || '',
  };
}

export async function updateOrderRequest(id, fields) {
  // Only include fields that were actually provided so we never overwrite
  // server values with blanks. Arrays and booleans (e.g. picked_up=false,
  // service_ids=[]) are meaningful, so they are always forwarded when present.
  const body = {};

  // Never send payment_status — the server recomputes it from Payment rows.
  const scalarMap = {
    assignedTo: 'assigned_to',
    orderStatus: 'order_status',
    discountAmount: 'discount_amount',
    deliveryDate: 'delivery_date',
    deliveryTime: 'delivery_time',
    estimatedCompletionDate: 'estimated_completion_date',
    pickupDate: 'pickup_date',
  };

  Object.entries(scalarMap).forEach(([key, apiKey]) => {
    const value = fields[key];
    if (value !== undefined && value !== null && value !== '') {
      body[apiKey] = value;
    }
  });

  // service_ids: full replace of the order's services when provided.
  if (Array.isArray(fields.serviceIds)) {
    body.service_ids = fields.serviceIds.map(Number);
  }

  // order_items_data: full replace of line items when provided.
  if (Array.isArray(fields.items)) {
    body.order_items_data = fields.items.map(toApiItem);
  }

  // picked_up is a boolean toggle; forward it whenever explicitly set.
  if (typeof fields.pickedUp === 'boolean') {
    body.picked_up = fields.pickedUp;
  }

  return apiRequest(`/api/orders/${id}/update/`, {
    method: 'PUT',
    body,
  });
}

export async function createOrderRequest({
  customerId,
  serviceIds,
  items,
  assignedTo,
  discountAmount,
  deliveryDate,
  deliveryTime,
  estimatedCompletionDate,
  pickupDate,
  orderStatus,
}) {
  const body = {
    customer_id: Number(customerId),
    service_ids: (Array.isArray(serviceIds) ? serviceIds : []).map(Number),
    order_items_data: (Array.isArray(items) ? items : []).map(toApiItem),
  };

  if (assignedTo) body.assigned_to = Number(assignedTo);
  if (
    discountAmount !== undefined &&
    discountAmount !== null &&
    discountAmount !== ''
  ) {
    body.discount_amount = Number(discountAmount);
  }
  if (deliveryDate) body.delivery_date = deliveryDate;
  if (deliveryTime) body.delivery_time = deliveryTime;
  if (estimatedCompletionDate) {
    body.estimated_completion_date = estimatedCompletionDate;
  }
  if (pickupDate) body.pickup_date = pickupDate;
  if (orderStatus) body.order_status = orderStatus;
  // Never send payment_status — the server owns payment state.

  return apiRequest('/api/orders/create/', {
    method: 'POST',
    body,
  });
}

// Format an API date (YYYY-MM-DD or full ISO) as DD/MM/YYYY for display. This
// matches what the sheet forms expect (they parse DD/MM/YYYY back to an input).
function toDisplayDate(value) {
  if (!value) return '';
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

// Format an API time (HH:MM or HH:MM:SS) down to HH:MM for <input type="time">.
function toInputTime(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

// Canonical order statuses from the API. Map older "processing" → IN_PROGRESS
// so list/detail/filters match the payment ≥30% auto-transition.
function normalizeOrderStatus(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!value) return '';
  if (value === 'processing') return 'IN_PROGRESS';
  return value.toUpperCase();
}

// Pull the list of service ids from either service_ids or a nested services[].
function extractServiceIds(order) {
  if (Array.isArray(order?.service_ids)) {
    return order.service_ids.map((v) => String(v));
  }
  if (Array.isArray(order?.services)) {
    return order.services
      .map((s) => (s?.id != null ? String(s.id) : null))
      .filter(Boolean);
  }
  return [];
}

// Phone/address may sit on the order or on a nested customer object, depending
// on the endpoint version. Prefer top-level fields, then nested ones.
function extractCustomerContact(order) {
  const nested =
    order?.customer && typeof order.customer === 'object' && !Array.isArray(order.customer)
      ? order.customer
      : {};
  return {
    phone:
      order?.customer_phone ||
      order?.customer_phone_number ||
      nested.phone_number ||
      nested.phone ||
      '',
    address: order?.customer_address || nested.address || '',
  };
}

// Map the API order shape to the row shape used by the orders table/details.
export function apiOrderToRow(order) {
  const contact = extractCustomerContact(order);
  return {
    id: String(order?.id ?? Date.now()),
    orderNumber: order?.order_number || '',
    customer:
      order?.customer_name || order?.customer_username || 'Unknown',
    assignedTo:
      order?.assigned_to_username ||
      (order?.assigned_to ? `#${order.assigned_to}` : 'Unassigned'),
    assignedToId: order?.assigned_to ?? null,
    customerId: order?.customer_id ?? null,
    customerPhone: contact.phone,
    customerAddress: contact.address,
    totalAmount: order?.total_amount != null ? String(order.total_amount) : '0.00',
    amountPaid: order?.amount_paid != null ? String(order.amount_paid) : '0.00',
    // Prefer the server-computed balance; fall back only for older payloads.
    balance:
      order?.balance != null
        ? String(order.balance)
        : String(
            Math.max(
              0,
              (Number(order?.total_amount) || 0) - (Number(order?.amount_paid) || 0)
            ).toFixed(2)
          ),
    discount: order?.discount_amount != null ? String(order.discount_amount) : '0.00',
    paymentStatus: (order?.payment_status || '').toLowerCase(),
    // Backend uses in_progress (≥30% paid). Treat legacy "processing" the same.
    orderStatus: normalizeOrderStatus(order?.order_status),
    serviceIds: extractServiceIds(order),
    services: Array.isArray(order?.services) ? order.services : [],
    pickupDate: toDisplayDate(order?.pickup_date),
    deliveryDate: toDisplayDate(order?.delivery_date),
    deliveryTime: toInputTime(order?.delivery_time),
    estimatedCompletion: toDisplayDate(order?.estimated_completion_date),
    createdOn: toDisplayDate(order?.created_at),
    createdAtRaw: order?.created_at || '',
    pickedUp: !!order?.picked_up,
    pickedUpAt: order?.picked_up_at || '',
    completedAt: order?.completed_at || '',
    items: (Array.isArray(order?.order_items) ? order.order_items : []).map(
      (item) => ({
        itemName: item?.item_name || '',
        dirtyQuantity: item?.dirty_quantity ?? 0,
        cleanQuantity: item?.clean_quantity ?? 0,
        unitPrice: item?.unit_price != null ? String(item.unit_price) : '0.00',
        subtotal: item?.subtotal != null ? String(item.subtotal) : '0.00',
        notes: item?.notes || '',
      })
    ),
  };
}

// Pull the orders array out of either a paginated object or a plain array.
export function extractOrders(result) {
  const payload = result?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
