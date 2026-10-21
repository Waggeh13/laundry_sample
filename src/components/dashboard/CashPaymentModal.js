import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ServiceModal.css';
import '../customer/PaymentModal.css';

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

function toDatetimeLocalValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function CashPaymentModal({ isOpen, order, onClose, onSubmit }) {
  const { user } = useAuth();
  const balance = toNumber(order?.balance);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(balance > 0 ? balance.toFixed(2) : '');
      setPaidAt(toDatetimeLocalValue());
      setError('');
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const recorder =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    'You';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = toNumber(amount);
    if (value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (value > balance) {
      setError(`Amount cannot exceed the balance of ${formatCurrency(balance)}.`);
      return;
    }
    const paidAtIso = datetimeLocalToIso(paidAt);
    if (!paidAtIso) {
      setError('Enter a valid payment date and time.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        orderId: order.id,
        amount: value,
        paidAt: paidAtIso,
      });
      onClose();
    } catch (err) {
      if (err?.code === 'AMOUNT_EXCEEDS_BALANCE') {
        setError(
          err?.message ||
            `Amount cannot exceed the balance of ${formatCurrency(balance)}.`
        );
      } else {
        setError(err?.message || 'Unable to record the cash payment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="service-modal payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-payment-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="cash-payment-modal-title" className="modal-title">
              Record Cash Payment
            </h2>
            <p className="modal-subtitle">
              {order?.orderNumber
                ? `Order ${order.orderNumber} · ${order.customer || 'Customer'}`
                : 'Cash payment for an order'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="service-modal-body" onSubmit={handleSubmit}>
          <div className="payment-balance-box">
            <span className="payment-balance-label">Outstanding Balance</span>
            <strong className="payment-balance-value">
              {formatCurrency(balance)}
            </strong>
          </div>

          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="cash-payment-amount">
                Amount<span className="required"> *</span>
              </label>
              <input
                id="cash-payment-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="cash-payment-paid-at">
                Payment date<span className="required"> *</span>
              </label>
              <input
                id="cash-payment-paid-at"
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="payment-hint">
            Recorded by <strong>{recorder}</strong> (from your signed-in
            session). No separate acceptor field is sent.
          </p>

          {error ? <p className="staff-modal-error">{error}</p> : null}

          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={submitting || balance <= 0}
            >
              {submitting
                ? 'Recording…'
                : `Record ${formatCurrency(toNumber(amount))}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CashPaymentModal;
