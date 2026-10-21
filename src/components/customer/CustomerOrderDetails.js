import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomerLayout from './CustomerLayout';
import { apiOrderToRow, getOrderByIdRequest } from '../../api/orders';
import { startCustomerCheckout } from '../../api/payments';
import PaymentModal from './PaymentModal';
import {
  canCollectPayment,
  formatPaymentStatus,
  formatStatusLabel,
  paymentStatusBadgeClass,
} from '../dashboard/ordersData';
import './CustomerDashboard.css';
import './CustomerOrderDetails.css';

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

function itemQuantity(item) {
  const dirty = toNumber(item?.dirtyQuantity);
  const clean = toNumber(item?.cleanQuantity);
  return dirty || clean || toNumber(item?.quantity) || 0;
}

function CustomerOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  const refreshOrder = () =>
    getOrderByIdRequest(id).then((result) => {
      if (result?.data) {
        setOrder(apiOrderToRow(result.data));
      }
    });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getOrderByIdRequest(id)
      .then((result) => {
        if (!active) return;
        if (result?.data) {
          setOrder(apiOrderToRow(result.data));
        } else {
          setError('Order not found.');
        }
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Unable to load this order.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="customer-dashboard">
          <p className="customer-order-details-message">Loading order…</p>
        </div>
      </CustomerLayout>
    );
  }

  if (error || !order) {
    return (
      <CustomerLayout>
        <div className="customer-dashboard">
          <p className="customer-order-details-message">{error || 'Order not found.'}</p>
          <button
            type="button"
            className="customer-order-back-btn"
            onClick={() => navigate('/customer/orders')}
          >
            Back to Orders
          </button>
        </div>
      </CustomerLayout>
    );
  }

  const statusClass = `customer-status-${(
    order.orderStatus || 'pending'
  ).toLowerCase()}`;
  const paymentStatusClass = `customer-status-${paymentStatusBadgeClass(
    order.paymentStatus
  )}`;
  const balance = toNumber(order.balance);
  const subtotal = order.items.reduce(
    (sum, item) => sum + toNumber(item.subtotal),
    0
  );
  const discount = toNumber(order.discount);

  const handlePayment = async ({ amount }) => {
    await startCustomerCheckout({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount,
    });
    try {
      await refreshOrder();
    } catch {
      // Non-fatal if checkout already redirected.
    }
  };

  return (
    <CustomerLayout>
      <div className="customer-dashboard">
        <div className="customer-order-details-header">
          <div>
            <h2 className="customer-orders-title">Order {order.orderNumber}</h2>
            <p className="customer-orders-subtitle">
              {order.createdOn ? `Created on ${order.createdOn}` : 'Order details'}
            </p>
          </div>
          <div className="customer-order-header-actions">
            {canCollectPayment(order) ? (
              <button
                type="button"
                className="customer-pay-btn customer-pay-btn-lg"
                onClick={() => setPayOpen(true)}
              >
                Make Payment
              </button>
            ) : null}
            <button
              type="button"
              className="customer-order-back-btn"
              onClick={() => navigate('/customer/orders')}
            >
              Back to Orders
            </button>
          </div>
        </div>

        <div className="customer-order-summary-cards">
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Order Status</span>
            <span className={`customer-status-badge ${statusClass}`}>
              {formatStatusLabel(order.orderStatus)}
            </span>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Payment Status</span>
            <span className={`customer-status-badge ${paymentStatusClass}`}>
              {formatPaymentStatus(order.paymentStatus)}
            </span>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Total Amount</span>
            <strong className="customer-order-detail-value">
              {formatCurrency(order.totalAmount)}
            </strong>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Amount Paid</span>
            <strong className="customer-order-detail-value">
              {formatCurrency(order.amountPaid)}
            </strong>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Balance</span>
            <strong className="customer-order-detail-value">
              {formatCurrency(balance)}
            </strong>
          </div>
        </div>

        <div className="customer-orders-card">
          <div className="customer-orders-header">
            <div>
              <h2 className="customer-orders-title">Order Items</h2>
              <p className="customer-orders-subtitle">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="customer-orders-table-wrap">
            <table className="customer-orders-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="customer-orders-empty">
                      No items on this order.
                    </td>
                  </tr>
                ) : (
                  order.items.map((item, index) => (
                    <tr key={`${item.itemName || item.name}-${index}`}>
                      <td>{item.itemName || item.name || '—'}</td>
                      <td>{itemQuantity(item)}</td>
                      <td className="customer-order-amount">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="customer-order-amount">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="customer-order-totals">
            <div className="customer-order-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="customer-order-total-row">
              <span>Discount</span>
              <span>{formatCurrency(discount)}</span>
            </div>
            <div className="customer-order-total-row customer-order-total-row-final">
              <span>Total</span>
              <strong>{formatCurrency(order.totalAmount)}</strong>
            </div>
            <div className="customer-order-total-row">
              <span>Amount Paid</span>
              <span>{formatCurrency(order.amountPaid)}</span>
            </div>
            <div className="customer-order-total-row customer-order-total-row-final">
              <span>Balance</span>
              <strong>{formatCurrency(order.balance)}</strong>
            </div>
          </div>
        </div>

        <div className="customer-order-info-grid">
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Pickup Date</span>
            <strong className="customer-order-detail-value">
              {order.pickupDate || '—'}
            </strong>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Delivery Date</span>
            <strong className="customer-order-detail-value">
              {order.deliveryDate || '—'}
            </strong>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Estimated Completion</span>
            <strong className="customer-order-detail-value">
              {order.estimatedCompletion || '—'}
            </strong>
          </div>
        </div>

        <div className="customer-order-notes-grid">
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Delivery Notes</span>
            <p className="customer-order-note">
              {order.deliveryNotes || 'No delivery notes.'}
            </p>
          </div>
          <div className="customer-order-detail-card">
            <span className="customer-order-detail-label">Special Instructions</span>
            <p className="customer-order-note">
              {order.specialInstructions || 'No special instructions.'}
            </p>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={payOpen}
        order={{
          id: order.id,
          orderNumber: order.orderNumber,
          balance: order.balance,
        }}
        onClose={() => setPayOpen(false)}
        onSubmit={handlePayment}
      />
    </CustomerLayout>
  );
}

export default CustomerOrderDetails;
