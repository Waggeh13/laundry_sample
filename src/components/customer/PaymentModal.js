import { useEffect, useState } from 'react';
import '../dashboard/ServiceModal.css';
import './PaymentModal.css';

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

function PaymentModal({ isOpen, order, onClose, onSubmit }) {
  const balance = toNumber(order?.balance);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(balance ? balance.toFixed(2) : '');
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
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ amount: value });
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to process the payment. Please try again.');
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
        aria-labelledby="payment-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="payment-modal-title" className="modal-title">
              Make a Payment
            </h2>
            <p className="modal-subtitle">
              {order?.orderNumber ? `Order ${order.orderNumber}` : 'Pay for your order'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="service-modal-body" onSubmit={handleSubmit}>
          <div className="payment-balance-box">
            <span className="payment-balance-label">Outstanding Balance</span>
            <strong className="payment-balance-value">{formatCurrency(balance)}</strong>
          </div>

          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="payment-amount">
                Amount<span className="required"> *</span>
              </label>
              <input
                id="payment-amount"
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

          <p className="payment-hint">
            You'll complete this payment securely via Moolre (Mobile Money or card).
          </p>

          {error && <p className="staff-modal-error">{error}</p>}

          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn" disabled={submitting}>
              {submitting ? 'Processing…' : `Pay ${formatCurrency(toNumber(amount))}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;
