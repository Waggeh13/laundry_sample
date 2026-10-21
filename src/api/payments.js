import { apiRequest } from './client';

// Initialize a Moolre payment. The customer is taken from the authenticated
// session, so only the order and amount are sent. The backend returns an
// `authorization_url` (Moolre checkout) and an `externalref` used to poll the
// payment status afterwards.
export async function initializePayment({ orderId, amount, callbackUrl }) {
  const body = {
    order_id: Number(orderId),
    amount: Number(amount),
  };
  if (callbackUrl) body.callback_url = callbackUrl;

  return apiRequest('/api/payments/initialize/', {
    method: 'POST',
    body,
  });
}

// Pull the checkout redirect URL out of an initialize response.
export function extractAuthorizationUrl(result) {
  return (
    result?.authorization_url ||
    result?.data?.authorization_url ||
    result?.url ||
    result?.data?.url ||
    null
  );
}

// Pull the payment reference out of the initialize response. Moolre returns
// `externalref`; older/other responses may use `reference`.
export function extractReference(result) {
  return (
    result?.externalref ||
    result?.data?.externalref ||
    result?.reference ||
    result?.data?.reference ||
    null
  );
}

// Poll the status of a payment: GET /api/payments/{externalref}/ returns
// { status: "PENDING" | "PAID" | "FAILED" }. Moolre confirms payment via a
// server-side webhook, so the frontend polls this until it settles.
export async function getPaymentStatus(externalref) {
  return apiRequest(`/api/payments/${encodeURIComponent(externalref)}/`);
}

// Normalize the status field from a payment-status response to upper case.
export function extractPaymentStatus(result) {
  const raw = result?.status ?? result?.data?.status ?? '';
  return String(raw).toUpperCase();
}

// The checkout redirect leaves the app, so we stash the pending payment (its
// externalref + order label) in sessionStorage before leaving. The callback
// page reads it back to poll the payment status.
const PENDING_PAYMENT_KEY = 'pendingPayment';

export function storePendingPayment(payment) {
  try {
    sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payment));
  } catch {
    // sessionStorage may be unavailable; the callback can still read query params.
  }
}

export function readPendingPayment() {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);
  } catch {
    // ignore
  }
}

// Staff-only cash payment. Accepting staff is taken from the JWT — do not send
// a separate acceptor field. `paidAt` must be an ISO date/datetime string.
export async function recordCashPayment({ orderId, amount, paidAt }) {
  return apiRequest('/api/payments/cash/', {
    method: 'POST',
    body: {
      order_id: Number(orderId),
      amount: Number(amount),
      paid_at: paidAt,
    },
  });
}

// Pull updated money fields from a cash-payment success payload (201).
export function extractOrderMoneyFromCashResult(result) {
  const candidates = [
    result?.order,
    result?.data?.order,
    result?.data,
    result,
  ].filter((item) => item && typeof item === 'object');

  for (const source of candidates) {
    const hasMoney =
      source.amount_paid != null ||
      source.balance != null ||
      source.payment_status != null;
    if (!hasMoney) continue;

    return {
      amountPaid:
        source.amount_paid != null ? String(source.amount_paid) : undefined,
      balance: source.balance != null ? String(source.balance) : undefined,
      paymentStatus: source.payment_status
        ? String(source.payment_status).toLowerCase()
        : undefined,
      totalAmount:
        source.total_amount != null ? String(source.total_amount) : undefined,
    };
  }

  return null;
}

export function mergeOrderMoney(orderRow, money) {
  if (!orderRow || !money) return orderRow;
  return {
    ...orderRow,
    ...(money.amountPaid != null ? { amountPaid: money.amountPaid } : {}),
    ...(money.balance != null ? { balance: money.balance } : {}),
    ...(money.paymentStatus != null
      ? { paymentStatus: money.paymentStatus }
      : {}),
    ...(money.totalAmount != null ? { totalAmount: money.totalAmount } : {}),
  };
}

// Customer checkout: initialize → stash externalref → redirect to Moolre.
// SMS / in_progress updates happen server-side after the webhook confirms pay.
export async function startCustomerCheckout({
  orderId,
  orderNumber,
  amount,
  callbackUrl,
}) {
  const redirect =
    callbackUrl || `${window.location.origin}/payment/callback`;
  const result = await initializePayment({
    orderId,
    amount,
    callbackUrl: redirect,
  });

  const externalref = extractReference(result);
  if (externalref) {
    storePendingPayment({
      externalref,
      orderNumber: orderNumber || '',
      amount,
    });
  }

  const authorizationUrl = extractAuthorizationUrl(result);
  if (!authorizationUrl) {
    throw new Error('Could not start the payment. Please try again.');
  }

  window.location.href = authorizationUrl;
  return result;
}
