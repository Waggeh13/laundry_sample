import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from './CustomerLayout';
import { apiOrderToRow, extractOrders, listOrdersRequest } from '../../api/orders';
import { startCustomerCheckout } from '../../api/payments';
import PaymentModal from './PaymentModal';
import {
  canCollectPayment,
  formatPaymentStatus,
  formatStatusLabel,
  paymentStatusBadgeClass,
} from '../dashboard/ordersData';
import './CustomerDashboard.css';

function toNumber(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `GHS ${toNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payTarget, setPayTarget] = useState(null);

  const loadOrders = () =>
    listOrdersRequest({ pageSize: 100 }).then((result) =>
      setOrders(extractOrders(result).map(apiOrderToRow))
    );

  const handlePayment = async ({ amount }) => {
    if (!payTarget) return;
    await startCustomerCheckout({
      orderId: payTarget.id,
      orderNumber: payTarget.orderNumber,
      amount,
    });
    // MoMo may confirm async; refresh so Partial/Paid badges update when possible.
    try {
      await loadOrders();
    } catch {
      // Non-fatal if checkout already redirected.
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    loadOrders()
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load your orders.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CustomerLayout>
      <div className="customer-dashboard">
        <div className="customer-orders-card">
          <div className="customer-orders-header">
            <div>
              <h2 className="customer-orders-title">All Orders</h2>
              <p className="customer-orders-subtitle">
                {orders.length} order{orders.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          <div className="customer-orders-table-wrap">
            <table className="customer-orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="customer-orders-empty">
                      Loading orders…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="customer-orders-empty">
                      {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="customer-orders-empty">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="customer-order-number">{order.orderNumber}</td>
                      <td className="customer-order-amount">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="customer-order-amount">
                        {formatCurrency(order.amountPaid)}
                      </td>
                      <td className="customer-order-amount">
                        {formatCurrency(order.balance)}
                      </td>
                      <td>
                        <span
                          className={`customer-status-badge customer-status-${paymentStatusBadgeClass(
                            order.paymentStatus
                          )}`}
                        >
                          {formatPaymentStatus(order.paymentStatus)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`customer-status-badge customer-status-${(
                            order.orderStatus || 'pending'
                          ).toLowerCase()}`}
                        >
                          {formatStatusLabel(order.orderStatus)}
                        </span>
                      </td>
                      <td>{order.createdOn || '—'}</td>
                      <td>
                        <div className="customer-order-actions">
                          <button
                            type="button"
                            className="customer-view-link"
                            onClick={() => navigate(`/customer/orders/${order.id}`)}
                          >
                            View
                          </button>
                          {canCollectPayment(order) ? (
                            <button
                              type="button"
                              className="customer-pay-btn"
                              onClick={() =>
                                setPayTarget({
                                  id: order.id,
                                  orderNumber: order.orderNumber,
                                  balance: order.balance,
                                })
                              }
                            >
                              Pay
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
        </div>
      </div>

      <PaymentModal
        isOpen={!!payTarget}
        order={payTarget}
        onClose={() => setPayTarget(null)}
        onSubmit={handlePayment}
      />
    </CustomerLayout>
  );
}

export default CustomerOrders;
