import { apiDownload, apiRequest, triggerBlobDownload } from './client';
import { extractPagePayload } from './pagination';

// API allows page_size ≤ 50 for JSON transaction lists.
export const TRANSACTIONS_PAGE_SIZE = 50;

function buildReportParams({
  page,
  pageSize,
  startDate,
  endDate,
  period,
  date,
  year,
  month,
  paymentMethod,
  status,
  format,
} = {}) {
  const params = new URLSearchParams();
  // Always send pagination so the backend never defaults us to "page 1 only"
  // in a way we can't advance from.
  if (page != null && page !== '') params.set('page', String(page));
  if (pageSize != null && pageSize !== '') {
    params.set('page_size', String(pageSize));
  }
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (period) params.set('period', period);
  if (date) params.set('date', date);
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (status) params.set('status', status);
  if (format) params.set('format', format);
  return params;
}

function unwrapData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data || {};
  }
  return response || {};
}

export async function listTransactionsRequest({
  page = 1,
  pageSize = TRANSACTIONS_PAGE_SIZE,
  startDate,
  endDate,
  period,
  date,
  year,
  month,
  paymentMethod,
  status,
} = {}) {
  const params = buildReportParams({
    page,
    pageSize,
    startDate,
    endDate,
    period,
    date,
    year,
    month,
    paymentMethod,
    status,
  });
  const response = await apiRequest(
    `/api/reports/transactions/?${params.toString()}`
  );
  return extractPagePayload(response, { fallbackPageSize: pageSize });
}

export async function downloadTransactionsCsv(filters = {}) {
  const params = buildReportParams({ ...filters, format: 'csv' });
  const { blob, filename } = await apiDownload(
    `/api/reports/transactions/?${params.toString()}`,
    { fallbackFilename: 'transactions.csv' }
  );
  triggerBlobDownload(blob, filename);
  return { filename };
}

export async function getSummaryReportRequest({
  period,
  date,
  year,
  month,
  startDate,
  endDate,
} = {}) {
  const params = buildReportParams({
    period,
    date,
    year,
    month,
    startDate,
    endDate,
  });
  const response = await apiRequest(
    `/api/reports/summary/?${params.toString()}`
  );
  return unwrapData(response);
}

export async function downloadSummaryCsv(filters = {}) {
  const params = buildReportParams({ ...filters, format: 'csv' });
  const { blob, filename } = await apiDownload(
    `/api/reports/summary/?${params.toString()}`,
    { fallbackFilename: 'report.csv' }
  );
  triggerBlobDownload(blob, filename);
  return { filename };
}

export function apiTransactionToRow(tx) {
  return {
    id: String(tx?.id ?? ''),
    externalRef: tx?.externalref || '',
    amount: tx?.amount != null ? String(tx.amount) : '0.00',
    status: String(tx?.status || '').toLowerCase(),
    paymentMethod: String(tx?.payment_method || '').toLowerCase(),
    provider: tx?.provider || '',
    payerPhone: tx?.payer_phone || '',
    paidAt: tx?.paid_at || '',
    createdAt: tx?.created_at || '',
    createdBy: tx?.created_by_username || '',
    orderId: tx?.order_id ?? null,
    orderNumber: tx?.order_number || '',
    customerId: tx?.customer_id ?? null,
    customerName: tx?.customer_name || tx?.customer_username || '',
  };
}
