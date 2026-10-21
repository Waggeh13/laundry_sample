import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import CashPaymentModal from './CashPaymentModal';
import {
  canCollectPayment,
  canCompleteOrder,
  formatPaymentStatus,
  formatStatusLabel,
  paymentStatusBadgeClass,
} from './ordersData';
import { apiOrderToRow, completeOrderRequest, listOrdersRequest } from '../../api/orders';
import { fetchAllPages } from '../../api/pagination';
import {
  extractOrderMoneyFromCashResult,
  mergeOrderMoney,
  recordCashPayment,
} from '../../api/payments';
import { showSuccessAlert } from '../../utils/alerts';
import TablePagination from './TablePagination';
import './AllServices.css';
import './AllOrders.css';

// Module-level cache so returning to Orders shows data instantly while it
// revalidates in the background instead of blanking out and refetching.
const ordersCache = { rows: null };
const PAGE_SIZE = 20;

const ORDER_STATUS_FILTERS = new Set([
  'pending',
  'in_progress',
  'ready',
  'completed',
  'cancelled',
]);

const PAYMENT_STATUS_FILTERS = new Set([
  'pending',
  'partially_paid',
  'paid',
]);

function todayDisplayDate() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function filterOrders(orders, { search, paymentStatus, orderStatus, todayOnly }) {
  const query = search.trim().toLowerCase();
  const today = todayOnly ? todayDisplayDate() : '';

  return orders.filter((order) => {
    const matchesSearch =
      !query ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query);

    const matchesPayment =
      paymentStatus === 'all' ||
      order.paymentStatus === paymentStatus ||
      (paymentStatus === 'pending' && order.paymentStatus === 'unpaid');

    const matchesOrderStatus =
      orderStatus === 'all' || order.orderStatus.toLowerCase() === orderStatus;

    const matchesToday = !todayOnly || order.createdOn === today;

    return matchesSearch && matchesPayment && matchesOrderStatus && matchesToday;
  });
}

function AllOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || '';
  const initialPayment = searchParams.get('payment') || '';
  const initialToday = searchParams.get('today') === '1';

  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(
    PAYMENT_STATUS_FILTERS.has(initialPayment) ? initialPayment : 'all'
  );
  const [orderStatus, setOrderStatus] = useState(
    ORDER_STATUS_FILTERS.has(initialStatus) ? initialStatus : 'all'
  );
  const [todayOnly, setTodayOnly] = useState(initialToday);

  const [orders, setOrders] = useState(() => ordersCache.rows || []);
  const [loading, setLoading] = useState(() => !ordersCache.rows);
  const [error, setError] = useState('');
  const [cashOrder, setCashOrder] = useState(null);
  const [page, setPage] = useState(1);
  const [completingId, setCompletingId] = useState('');

  useEffect(() => {
    let active = true;
    setError('');

    // Show cached rows instantly and revalidate silently; only show the loading
    // row when we have nothing to display yet.
    if (ordersCache.rows) {
      setOrders(ordersCache.rows);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Backend page_size is capped (often ≤ 50). Walk every page so client-side
    // filters/pagination see the full set, not only the first page.
    fetchAllPages(
      (page, pageSize) => listOrdersRequest({ page, pageSize }),
      { pageSize: 50 }
    )
      .then(({ results }) => {
        if (!active) return;
        const rows = results.map(apiOrderToRow);
        setOrders(rows);
        ordersCache.rows = rows;
      })
      .catch((err) => {
        if (active && !ordersCache.rows) {
          setError(err?.message || 'Unable to load orders.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Keep the cache in sync so a return visit reflects the latest data.
  useEffect(() => {
    if (!loading) ordersCache.rows = orders;
  }, [orders, loading]);

  // Keep URL query params in sync with the active filters (from dashboard cards).
  useEffect(() => {
    const next = new URLSearchParams();
    if (orderStatus !== 'all') next.set('status', orderStatus);
    if (paymentStatus !== 'all') next.set('payment', paymentStatus);
    if (todayOnly) next.set('today', '1');
    setSearchParams(next, { replace: true });
  }, [orderStatus, paymentStatus, todayOnly, setSearchParams]);

  const filteredOrders = useMemo(
    () =>
      filterOrders(orders, {
        search,
        paymentStatus,
        orderStatus,
        todayOnly,
      }),
    [orders, search, paymentStatus, orderStatus, todayOnly]
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, paymentStatus, orderStatus, todayOnly]);

  const handleReset = () => {
    setSearch('');
    setPaymentStatus('all');
    setOrderStatus('all');
    setTodayOnly(false);
    setPage(1);
  };

  const handleCashPayment = async ({ orderId, amount, paidAt }) => {
    const result = await recordCashPayment({ orderId, amount, paidAt });
    const money = extractOrderMoneyFromCashResult(result);
    setOrders((current) => {
      const next = current.map((row) => {
        if (String(row.id) !== String(orderId)) return row;
        if (money) return mergeOrderMoney(row, money);
        const raw = result?.order || result?.data;
        if (raw?.id || raw?.order_number) return apiOrderToRow(raw);
        return row;
      });
      ordersCache.rows = next;
      return next;
    });
    showSuccessAlert(
      'Cash Payment Recorded',
      result?.message ||
        `Cash payment of GHS ${Number(amount).toFixed(2)} was recorded.`
    );
  };

  const handleComplete = async (order) => {
    setCompletingId(String(order.id));
    try {
      const result = await completeOrderRequest(order.id);
      const raw = result?.data;
      setOrders((current) => {
        const next = current.map((row) => {
          if (String(row.id) !== String(order.id)) return row;
          if (raw?.id || raw?.order_number) return apiOrderToRow(raw);
          return { ...row, orderStatus: 'COMPLETED' };
        });
        ordersCache.rows = next;
        return next;
      });
      showSuccessAlert(
        'Order Completed',
        result?.message || `Order ${order.orderNumber} was completed.`
      );
    } finally {
      setCompletingId('');
    }
  };

  return (
    <DashboardLayout pageTitle="Order Management">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">All Orders</h2>
          <button
            type="button"
            className="add-service-btn"
            onClick={() => navigate('/orders/new')}
          >
            Add New Order
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row">
            <input
              type="text"
              className="services-search-input"
              placeholder="Search orders, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="services-select"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="all">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
            </select>

            <select
              className="services-select"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              <option value="all">All Order Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button type="button" className="services-reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
          {todayOnly ? (
            <div className="services-filters-row services-filters-active">
              <span className="services-filter-chip">
                Showing today&apos;s orders
                <button
                  type="button"
                  className="services-filter-chip-clear"
                  onClick={() => setTodayOnly(false)}
                  aria-label="Clear today filter"
                >
                  ×
                </button>
              </span>
            </div>
          ) : null}
        </div>

        <div className="services-table-card">
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      Loading orders…
                    </td>
                  </tr>
                ) : error && orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      No orders have been created yet.
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="services-empty">
                      No orders match your search or filters.
                    </td>
                  </tr>
                ) : (
                  pageOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="order-number">{order.orderNumber}</td>
                      <td className="service-name">{order.customer}</td>
                      <td className="service-price">GHS {order.totalAmount}</td>
                      <td className="service-price">GHS {order.amountPaid}</td>
                      <td className="service-price">GHS {order.balance}</td>
                      <td>
                        <span
                          className={`service-status-badge payment-status-${paymentStatusBadgeClass(
                            order.paymentStatus
                          )}`}
                        >
                          {formatPaymentStatus(order.paymentStatus)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`service-status-badge order-status-${(
                            order.orderStatus || 'pending'
                          ).toLowerCase()}`}
                        >
                          {formatStatusLabel(order.orderStatus)}
                        </span>
                      </td>
                      <td>
                        <div className="order-actions">
                          <button
                            type="button"
                            className="view-service-btn"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            View
                          </button>
                          {canCollectPayment(order) ? (
                            <button
                              type="button"
                              className="view-service-btn order-cash-btn"
                              onClick={() => setCashOrder(order)}
                            >
                              Cash
                            </button>
                          ) : null}
                          {canCompleteOrder(order) ? (
                            <button
                              type="button"
                              className="view-service-btn order-complete-btn"
                              disabled={completingId === String(order.id)}
                              onClick={() => handleComplete(order)}
                            >
                              {completingId === String(order.id)
                                ? 'Completing…'
                                : 'Complete'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="services-table-footer">
            <span className="services-count">
              {filteredOrders.length === 0
                ? `SHOWING 0 OF ${orders.length} ORDERS`
                : `SHOWING ${(currentPage - 1) * PAGE_SIZE + 1} TO ${Math.min(
                    currentPage * PAGE_SIZE,
                    filteredOrders.length
                  )} OF ${filteredOrders.length} ORDERS`}
            </span>
            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <CashPaymentModal
        isOpen={Boolean(cashOrder)}
        order={cashOrder}
        onClose={() => setCashOrder(null)}
        onSubmit={handleCashPayment}
      />
    </DashboardLayout>
  );
}

export default AllOrders;
