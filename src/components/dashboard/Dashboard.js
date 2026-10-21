import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import RevenueChart from './RevenueChart';
import { getDashboardMetrics, getRevenueReport } from '../../api/dashboard';
import { apiOrderToRow, extractOrders, listOrdersRequest } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../auth/authData';
import './Dashboard.css';

function firstDefined(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCount(value) {
  return toNumber(value).toLocaleString('en-US');
}

function formatCurrency(value) {
  return `GHS ${toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(dateString) {
  if (!dateString) return '';
  const [, month, day] = dateString.split('-').map(Number);
  if (!month || !day) return dateString;
  return `${MONTHS[month - 1]} ${day}`;
}

function buildRevenuePoints(dailyBreakdown) {
  if (!Array.isArray(dailyBreakdown)) return [];
  const byDate = new Map();
  for (const row of dailyBreakdown) {
    const date = row?.date || '';
    const amount = toNumber(row?.total_amount);
    byDate.set(date, (byDate.get(date) || 0) + amount);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ label: formatDateLabel(date), value }));
}

const iconBase = `${process.env.PUBLIC_URL}/images/cards`;

const ICONS = {
  customers: `${iconBase}/customers.png`,
  staff: `${iconBase}/staff.png`,
  orders: `${iconBase}/orders.png`,
  revenue: `${iconBase}/revenue.png`,
  today: `${iconBase}/today.png`,
  pending: `${iconBase}/pending.png`,
};

function buildStats(metrics) {
  return [
    {
      key: 'customers',
      label: 'Total Customers',
      to: '/clients',
      value: formatCount(
        firstDefined(metrics, [
          'total_customers',
          'customers',
          'total_clients',
          'clients',
          'client_count',
        ])
      ),
      icon: ICONS.customers,
      iconClass: 'stat-icon-blue',
    },
    {
      key: 'staff',
      label: 'Total Staff',
      to: '/staff',
      value: formatCount(
        firstDefined(metrics, [
          'total_staff',
          'staff',
          'total_employees',
          'employees',
          'staff_count',
          'employee_count',
        ])
      ),
      icon: ICONS.staff,
      iconClass: 'stat-icon-purple',
    },
    {
      key: 'orders',
      label: 'Total Orders',
      to: '/orders',
      value: formatCount(
        firstDefined(metrics, ['total_orders', 'orders', 'order_count', 'orders_count'])
      ),
      icon: ICONS.orders,
      iconClass: 'stat-icon-green',
    },
    {
      key: 'revenue',
      label: 'Total Revenue',
      to: '/reports',
      value: formatCurrency(
        firstDefined(metrics, [
          'total_revenue',
          'revenue',
          'total_revenue_amount',
          'grand_total',
          'total_sales',
        ])
      ),
      icon: ICONS.revenue,
      iconClass: 'stat-icon-orange',
    },
    {
      key: 'today',
      label: "Today's Orders",
      to: '/orders?today=1',
      value: formatCount(
        firstDefined(metrics, [
          'today_orders',
          'orders_today',
          'todays_orders',
          'today_order_count',
        ])
      ),
      icon: ICONS.today,
      iconClass: 'stat-icon-blue',
    },
    {
      key: 'pending',
      label: 'Pending Orders',
      to: '/orders?status=pending',
      value: formatCount(
        firstDefined(metrics, ['pending_orders', 'pending', 'pending_order_count'])
      ),
      icon: ICONS.pending,
      iconClass: 'stat-icon-yellow',
    },
  ];
}

// Admins and employees see operational cards computed from the orders list.
// Revenue / outstanding money cards are superadmin-only.
function buildAdminStats(orders) {
  let inProgress = 0;
  let ready = 0;

  for (const order of orders) {
    const status = (order.orderStatus || '').toUpperCase();
    if (status === 'PENDING' || status === 'PROCESSING' || status === 'IN_PROGRESS') {
      inProgress += 1;
    }
    if (status === 'READY') ready += 1;
  }

  return [
    {
      key: 'in_progress',
      label: 'In Progress',
      to: '/orders?status=in_progress',
      value: formatCount(inProgress),
      icon: ICONS.pending,
      iconClass: 'stat-icon-yellow',
    },
    {
      key: 'ready',
      label: 'Ready for Pickup',
      to: '/orders?status=ready',
      value: formatCount(ready),
      icon: ICONS.orders,
      iconClass: 'stat-icon-green',
    },
  ];
}

function capitalize(value) {
  const text = String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  return text ? text.replace(/\b\w/g, (ch) => ch.toUpperCase()) : '';
}

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Default revenue report window: the last 30 days up to today.
function defaultRevenueRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}

// Module-level cache so returning to the dashboard renders instantly from the
// last known data while it revalidates in the background, instead of blanking
// out and refetching every time (which is slow on the API's cold start).
const dashboardCache = { metrics: null, revenue: null, orders: null };

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperadmin = user?.role === ROLES.SUPER_ADMIN;
  // Revenue report (total revenue chart) is superadmin-only.
  const canSeeRevenue = isSuperadmin;

  const [metrics, setMetrics] = useState(() => dashboardCache.metrics);
  const [revenue, setRevenue] = useState(() => dashboardCache.revenue);
  const [orders, setOrders] = useState(() => dashboardCache.orders || []);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    // Recent orders (and, for admins/employees, the source for the summary
    // cards). Superadmins only need a handful for the Recent Orders table.
    listOrdersRequest({ pageSize: isSuperadmin ? 5 : 200 })
      .then((result) => {
        if (!active) return;
        const rows = extractOrders(result).map(apiOrderToRow);
        setOrders(rows);
        dashboardCache.orders = rows;
      })
      .catch(() => {
        // Non-fatal: the table just shows an empty state.
      });

    if (isSuperadmin) {
      getDashboardMetrics()
        .then((data) => {
          if (!active) return;
          setMetrics(data);
          dashboardCache.metrics = data;
        })
        .catch((err) => {
          if (active && !dashboardCache.metrics) {
            setError(err?.message || 'Unable to load dashboard metrics.');
          }
        });

    }

    if (canSeeRevenue) {
      getRevenueReport(defaultRevenueRange())
        .then((data) => {
          if (!active) return;
          setRevenue(data);
          dashboardCache.revenue = data;
        })
        .catch(() => {
          // Revenue report is supplementary; ignore its failure on the dashboard.
        });
    }

    return () => {
      active = false;
    };
  }, [isSuperadmin, canSeeRevenue]);

  const stats = isSuperadmin ? buildStats(metrics || {}) : buildAdminStats(orders);
  const revenueSummary = revenue?.summary || {};
  const revenuePoints = buildRevenuePoints(revenue?.daily_breakdown);
  const recentOrders = orders.slice(0, 3);

  return (
    <DashboardLayout pageTitle="Dashboard">
      {error && <div className="dashboard-error">{error}</div>}

      <div className="stats-grid">
        {stats.map((stat) => {
          const isClickable = Boolean(stat.to);
          const CardTag = isClickable ? 'button' : 'div';
          return (
            <CardTag
              key={stat.key}
              type={isClickable ? 'button' : undefined}
              className={`stat-card${isClickable ? ' stat-card-clickable' : ''}`}
              onClick={isClickable ? () => navigate(stat.to) : undefined}
              aria-label={
                isClickable ? `View ${stat.label}` : undefined
              }
            >
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
                {stat.subValue && (
                  <span className="stat-subvalue">{stat.subValue}</span>
                )}
              </div>
              <div className={`stat-icon ${stat.iconClass}`}>
                <img src={stat.icon} alt="" className="stat-icon-img" />
              </div>
            </CardTag>
          );
        })}
      </div>

      <div className={`dashboard-lower${canSeeRevenue ? ' dashboard-lower-split' : ''}`}>
      {canSeeRevenue && (
        <div className="revenue-card">
          <div className="revenue-card-header">
            <div>
              <h2 className="transactions-title">Revenue Report</h2>
              <p className="transactions-subtitle">Daily revenue breakdown</p>
            </div>
            <div className="revenue-summary">
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Total Revenue</span>
                <span className="revenue-summary-value">
                  {formatCurrency(revenueSummary.grand_total)}
                </span>
              </div>
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Transactions</span>
                <span className="revenue-summary-value">
                  {formatCount(revenueSummary.total_transactions)}
                </span>
              </div>
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Avg. Transaction</span>
                <span className="revenue-summary-value">
                  {formatCurrency(revenueSummary.average_transaction)}
                </span>
              </div>
            </div>
          </div>

          <RevenueChart points={revenuePoints} />
        </div>
      )}

      <div className="transactions-card">
        <div className="transactions-header">
          <div>
            <h2 className="transactions-title">Recent Orders</h2>
            <p className="transactions-subtitle">Showing the latest 3 orders</p>
          </div>
          <button
            type="button"
            className="view-all-link"
            onClick={() => navigate('/orders')}
          >
            View All Orders
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="transactions-table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="transactions-empty">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-number">{order.orderNumber}</td>
                    <td className="customer-name">{order.customer}</td>
                    <td className="order-amount">GHS {order.totalAmount}</td>
                    <td>
                      <span
                        className={`status-badge status-${(
                          order.orderStatus || 'pending'
                        ).toLowerCase()}`}
                      >
                        {capitalize(order.orderStatus)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="view-link"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        View
                      </button>
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

export default Dashboard;
