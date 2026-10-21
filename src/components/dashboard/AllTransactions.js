import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import {
  apiTransactionToRow,
  downloadTransactionsCsv,
  listTransactionsRequest,
  TRANSACTIONS_PAGE_SIZE,
} from '../../api/reports';
import TablePagination from './TablePagination';
import './AllServices.css';
import './Reports.css';

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

function formatMoney(value) {
  const n = Number(value);
  return `GHS ${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function labelMethod(method) {
  if (method === 'moolre') return 'MoMo';
  if (method === 'ussd') return 'USSD';
  if (method === 'cash') return 'Cash';
  return method ? method.replace(/_/g, ' ') : '—';
}

function labelStatus(status) {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function AllTransactions() {
  const navigate = useNavigate();
  const defaults = defaultDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(TRANSACTIONS_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    listTransactionsRequest({
      page,
      pageSize: TRANSACTIONS_PAGE_SIZE,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
      status: status === 'all' ? undefined : status,
    })
      .then((data) => {
        if (!active) return;
        setRows((data.results || []).map(apiTransactionToRow));
        setCount(data.count || 0);
        setPageSize(data.pageSize || TRANSACTIONS_PAGE_SIZE);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        if (!active) return;
        setRows([]);
        setCount(0);
        setTotalPages(1);
        setError(err?.message || 'Unable to load transactions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, startDate, endDate, paymentMethod, status]);

  const handleReset = () => {
    const next = defaultDateRange();
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setPaymentMethod('all');
    setStatus('all');
    setPage(1);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTransactionsCsv({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethod === 'all' ? undefined : paymentMethod,
        status: status === 'all' ? undefined : status,
      });
    } catch (err) {
      setError(err?.message || 'Unable to download CSV.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePageChange = (nextPage) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== page) setPage(clamped);
  };

  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  return (
    <DashboardLayout pageTitle="Transactions">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">All Transactions</h2>
          <button
            type="button"
            className="add-service-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Downloading…' : 'Download CSV'}
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row reports-filters-row">
            <label className="reports-date-field">
              <span>From</span>
              <input
                type="date"
                className="services-search-input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="reports-date-field">
              <span>To</span>
              <input
                type="date"
                className="services-search-input"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <select
              className="services-select"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="moolre">MoMo</option>
              <option value="ussd">USSD</option>
            </select>
            <select
              className="services-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <button type="button" className="services-reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>

        <div className="services-table-card">
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Paid At</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      Loading transactions…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td className="order-number">{row.externalRef || '—'}</td>
                      <td>
                        {row.orderId ? (
                          <button
                            type="button"
                            className="view-service-btn"
                            onClick={() => navigate(`/orders/${row.orderId}`)}
                          >
                            {row.orderNumber || `#${row.orderId}`}
                          </button>
                        ) : (
                          row.orderNumber || '—'
                        )}
                      </td>
                      <td className="service-name">{row.customerName || '—'}</td>
                      <td className="service-price">{formatMoney(row.amount)}</td>
                      <td>
                        <span
                          className={`service-status-badge tx-method-${
                            row.paymentMethod || 'unknown'
                          }`}
                        >
                          {labelMethod(row.paymentMethod)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`service-status-badge tx-status-${
                            row.status || 'unknown'
                          }`}
                        >
                          {labelStatus(row.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(row.paidAt || row.createdAt)}</td>
                      <td>{row.createdBy || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="services-table-footer">
            <span className="services-count">
              {count === 0
                ? 'SHOWING 0 TRANSACTIONS'
                : `SHOWING ${rangeStart} TO ${rangeEnd} OF ${count} TRANSACTIONS`}
            </span>
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AllTransactions;
