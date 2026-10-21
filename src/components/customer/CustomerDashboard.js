import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from './CustomerLayout';
import { getDashboardMetrics } from '../../api/dashboard';
import { extractOrders, listOrdersRequest } from '../../api/orders';
import './CustomerDashboard.css';

const iconBase = `${process.env.PUBLIC_URL}/images`;

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

function formatDate(value) {
  if (!value) return '—';
  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function capitalize(value) {
  const text = String(value || '').toLowerCase().replace(/_/g, ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function mapRecentOrder(order) {
  return {
    id: order?.id,
    orderNumber: order?.order_number || '',
    totalAmount: formatCurrency(order?.total_amount),
    balance: formatCurrency(order?.balance),
    status: order?.status || '',
    createdOn: formatDate(order?.created_at),
  };
}

function IconOrders() {
  return (
    <img src={`${iconBase}/icon-pending.png`} alt="" className="customer-stat-icon-img" />
  );
}

function IconPending() {
  return (
    <img src={`${iconBase}/icon-warning.png`} alt="" className="customer-stat-icon-img" />
  );
}

function IconReady() {
  return (
    <img src={`${iconBase}/icon-check.png`} alt="" className="customer-stat-icon-img" />
  );
}

// Module-level cache so returning to the dashboard renders instantly from the
// last known data while it revalidates in the background.
const customerDashboardCache = { metrics: null, readyCount: 0 };

function CustomerDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(() => customerDashboardCache.metrics);
  const [readyCount, setReadyCount] = useState(() => customerDashboardCache.readyCount);

  useEffect(() => {
    let active = true;

    getDashboardMetrics()
      .then((data) => {
        if (!active) return;
        setMetrics(data);
        customerDashboardCache.metrics = data;

        // "Ready For Pickup" reflects orders a staff member has marked ready.
        // The metrics response already includes this count, so use it directly
        // and avoid a second request. Only fall back to scanning the orders
        // list if the backend didn't provide it.
        const ready = firstDefined(data, [
          'ready_for_pickup',
          'ready_orders',
          'ready',
        ]);
        if (ready !== undefined) {
          setReadyCount(toNumber(ready));
          customerDashboardCache.readyCount = toNumber(ready);
          return;
        }

        listOrdersRequest({ pageSize: 100 })
          .then((result) => {
            if (!active) return;
            const count = extractOrders(result).filter(
              (order) => String(order?.order_status).toLowerCase() === 'ready'
            ).length;
            setReadyCount(count);
            customerDashboardCache.readyCount = count;
          })
          .catch(() => {
            // Non-fatal: leaves the ready count at zero.
          });
      })
      .catch(() => {
        // Non-fatal: cards fall back to zeros if metrics can't load.
      });

    return () => {
      active = false;
    };
  }, []);

  const recentOrders = Array.isArray(metrics?.recent_orders)
    ? metrics.recent_orders.map(mapRecentOrder)
    : [];

  const statCards = [
    {
      label: 'Total Orders',
      to: '/customer/orders',
      value: formatCount(
        firstDefined(metrics, ['total_orders', 'orders', 'order_count'])
      ),
      icon: <IconOrders />,
      iconClass: 'customer-stat-icon-blue',
    },
    {
      label: 'Pending Orders',
      to: '/customer/orders',
      value: formatCount(
        firstDefined(metrics, ['pending_orders', 'pending', 'pending_order_count'])
      ),
      icon: <IconPending />,
      iconClass: 'customer-stat-icon-yellow',
    },
    {
      label: 'Ready For Pickup',
      to: '/customer/orders',
      value: formatCount(readyCount),
      icon: <IconReady />,
      iconClass: 'customer-stat-icon-green',
    },
  ];

  return (
    <CustomerLayout>
      <div className="customer-dashboard">
        <div className="customer-stats-row">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              type="button"
              className="customer-stat-card customer-stat-card-clickable"
              onClick={() => navigate(stat.to)}
              aria-label={`View ${stat.label}`}
            >
              <div className={`customer-stat-icon ${stat.iconClass}`}>{stat.icon}</div>
              <div className="customer-stat-info">
                <span className="customer-stat-value">{stat.value}</span>
                <span className="customer-stat-label">{stat.label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="customer-orders-card">
          <div className="customer-orders-header">
            <div>
              <h2 className="customer-orders-title">Recent Orders</h2>
              <p className="customer-orders-subtitle">
                Showing last {recentOrders.length} orders
              </p>
            </div>
            <button
              type="button"
              className="customer-view-orders-link"
              onClick={() => navigate('/customer/orders')}
            >
              View Orders
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="customer-orders-table-wrap">
            <table className="customer-orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Total Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="customer-orders-empty">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, index) => (
                    <tr key={`${order.id}-${index}`}>
                      <td className="customer-order-number">{order.orderNumber}</td>
                      <td className="customer-order-amount">{order.totalAmount}</td>
                      <td className="customer-order-amount">{order.balance}</td>
                      <td>
                        <span
                          className={`customer-status-badge customer-status-${(
                            order.status || 'pending'
                          ).toLowerCase()}`}
                        >
                          {capitalize(order.status)}
                        </span>
                      </td>
                      <td>{order.createdOn}</td>
                      <td>
                        <button
                          type="button"
                          className="customer-view-link"
                          onClick={() => navigate(`/customer/orders/${order.id}`)}
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
    </CustomerLayout>
  );
}

export default CustomerDashboard;
