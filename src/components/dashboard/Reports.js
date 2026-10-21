import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import {
  downloadSummaryCsv,
  getSummaryReportRequest,
} from '../../api/reports';
import './AllServices.css';
import './Reports.css';

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMoney(value) {
  const n = Number(value);
  return `GHS ${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function buildQuery(mode, { date, year, month, startDate, endDate }) {
  if (mode === 'daily') {
    return { period: 'daily', date };
  }
  if (mode === 'monthly') {
    return { period: 'monthly', year: Number(year), month: Number(month) };
  }
  if (mode === 'yearly') {
    return { period: 'yearly', year: Number(year) };
  }
  return { startDate, endDate };
}

function Reports() {
  const now = new Date();
  const [mode, setMode] = useState('monthly');
  const [date, setDate] = useState(toDateInput(now));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [startDate, setStartDate] = useState(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return toDateInput(start);
  });
  const [endDate, setEndDate] = useState(toDateInput(now));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const query = buildQuery(mode, { date, year, month, startDate, endDate });
    getSummaryReportRequest(query)
      .then((data) => {
        if (active) setReport(data || null);
      })
      .catch((err) => {
        if (!active) return;
        setReport(null);
        setError(err?.message || 'Unable to load report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode, date, year, month, startDate, endDate]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadSummaryCsv(
        buildQuery(mode, { date, year, month, startDate, endDate })
      );
    } catch (err) {
      setError(err?.message || 'Unable to download CSV.');
    } finally {
      setDownloading(false);
    }
  };

  const byMethod = report?.revenue_by_method || {};
  const periodLabel = report?.period
    ? `${report.period.start || '—'} → ${report.period.end || '—'}`
    : '—';

  const metricCards = [
    {
      key: 'new_customers',
      label: 'New Customers',
      value: formatCount(report?.new_customers),
    },
    {
      key: 'revenue',
      label: 'Revenue',
      value: formatMoney(report?.revenue),
    },
    {
      key: 'transactions',
      label: 'Paid Transactions',
      value: formatCount(report?.transaction_count),
    },
    {
      key: 'owed',
      label: 'Amount Owed',
      value: formatMoney(report?.owed),
    },
    {
      key: 'orders_with_balance',
      label: 'Orders With Balance',
      value: formatCount(report?.orders_with_balance),
    },
  ];

  const yearOptions = Array.from({ length: 6 }, (_, i) =>
    String(now.getFullYear() - i)
  );

  return (
    <DashboardLayout pageTitle="Reports">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">Summary Report</h2>
          <button
            type="button"
            className="add-service-btn"
            onClick={handleDownload}
            disabled={downloading || loading}
          >
            {downloading ? 'Downloading…' : 'Download CSV'}
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row reports-filters-row">
            <select
              className="services-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              aria-label="Report period"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom range</option>
            </select>

            {mode === 'daily' ? (
              <label className="reports-date-field">
                <span>Date</span>
                <input
                  type="date"
                  className="services-search-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            ) : null}

            {mode === 'monthly' ? (
              <>
                <select
                  className="services-select"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  aria-label="Month"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i, 1).toLocaleString('en-US', {
                        month: 'long',
                      })}
                    </option>
                  ))}
                </select>
                <select
                  className="services-select"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  aria-label="Year"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {mode === 'yearly' ? (
              <select
                className="services-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label="Year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            ) : null}

            {mode === 'custom' ? (
              <>
                <label className="reports-date-field">
                  <span>From</span>
                  <input
                    type="date"
                    className="services-search-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="reports-date-field">
                  <span>To</span>
                  <input
                    type="date"
                    className="services-search-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        {error ? <div className="reports-error">{error}</div> : null}

        <p className="reports-period-label">
          {loading ? 'Loading report…' : `Period: ${periodLabel}`}
        </p>

        <div className="reports-metrics-grid">
          {metricCards.map((card) => (
            <div key={card.key} className="reports-metric-card">
              <span className="reports-metric-label">{card.label}</span>
              <span className="reports-metric-value">
                {loading ? '—' : card.value}
              </span>
            </div>
          ))}
        </div>

        <div className="services-table-card reports-method-card">
          <div className="reports-method-header">
            <h3 className="reports-method-title">Revenue by method</h3>
            <p className="reports-method-subtitle">
              Paid payments only (cash, MoMo, USSD)
            </p>
          </div>
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" className="services-empty">
                      Loading…
                    </td>
                  </tr>
                ) : (
                  [
                    ['cash', 'Cash'],
                    ['moolre', 'MoMo'],
                    ['ussd', 'USSD'],
                  ].map(([key, label]) => (
                    <tr key={key}>
                      <td className="service-name">{label}</td>
                      <td className="service-price">
                        {formatMoney(byMethod[key])}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Reports;
