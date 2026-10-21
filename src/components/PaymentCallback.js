import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  clearPendingPayment,
  extractPaymentStatus,
  getPaymentStatus,
  readPendingPayment,
} from '../api/payments';
import './PaymentCallback.css';

// How often and how many times to poll the payment status. Moolre confirms via
// a server-side webhook, which can lag a few seconds behind the redirect.
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 12; // ~36s

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `GHS ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Landing/redirect screen after checkout. It polls the payment status by its
// externalref and shows a success (or failed / still-processing) screen.
function PaymentCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const handled = useRef(false);
  const pollTimer = useRef(null);

  // 'verifying' | 'success' | 'failed' | 'pending'
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [amount, setAmount] = useState('');

  const goToOrders = useCallback(
    () => navigate('/customer/orders', { replace: true }),
    [navigate]
  );
  const goToDashboard = useCallback(
    () => navigate('/customer/dashboard', { replace: true }),
    [navigate]
  );

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const pending = readPendingPayment();
    if (pending?.orderNumber) setOrderNumber(pending.orderNumber);
    if (pending?.amount) setAmount(pending.amount);

    const externalref =
      params.get('externalref') ||
      params.get('reference') ||
      params.get('trxref') ||
      pending?.externalref ||
      null;

    const finish = (nextStatus, nextMessage) => {
      clearPendingPayment();
      setStatus(nextStatus);
      setMessage(nextMessage || '');
    };

    // Backend may redirect here with an explicit outcome instead of a ref.
    const explicitStatus = params.get('success') || params.get('status');
    if (!externalref && explicitStatus != null) {
      const raw = explicitStatus.toString().toLowerCase();
      const isFailure =
        raw === 'false' ||
        raw === 'failed' ||
        raw === 'failure' ||
        raw === 'cancelled';
      finish(
        isFailure ? 'failed' : 'success',
        params.get('message') ||
          (isFailure
            ? 'Your payment could not be completed.'
            : 'Your payment has been received successfully.')
      );
      return;
    }

    if (!externalref) {
      goToOrders();
      return;
    }

    let attempts = 0;
    const poll = () => {
      getPaymentStatus(externalref)
        .then((res) => {
          const s = extractPaymentStatus(res);
          if (s === 'PAID' || s === 'SUCCESS' || s === 'SUCCESSFUL') {
            finish('success', 'Your payment has been received successfully.');
            return;
          }
          if (s === 'FAILED' || s === 'FAILURE' || s === 'CANCELLED') {
            finish('failed', 'Your payment could not be completed. Please try again.');
            return;
          }
          attempts += 1;
          if (attempts >= MAX_POLLS) {
            finish(
              'pending',
              'Your payment is being confirmed. Your order will update automatically once it clears.'
            );
            return;
          }
          pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch(() => {
          attempts += 1;
          if (attempts >= MAX_POLLS) {
            finish(
              'pending',
              'We could not confirm your payment yet. Your order will update automatically once it clears.'
            );
            return;
          }
          pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        });
    };
    poll();
  }, [params, goToOrders]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const isVerifying = status === 'verifying';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  const iconClass = isSuccess
    ? 'pay-result-icon-success'
    : isFailed
    ? 'pay-result-icon-failed'
    : 'pay-result-icon-pending';

  const title = isVerifying
    ? 'Confirming your payment…'
    : isSuccess
    ? 'Payment Successful!'
    : isFailed
    ? 'Payment Failed'
    : 'Payment Processing';

  return (
    <div className="pay-result">
      <div className="pay-result-card">
        <div className={`pay-result-icon ${isVerifying ? 'pay-result-icon-pending' : iconClass}`}>
          {isVerifying ? (
            <span className="pay-spinner" />
          ) : (
            <svg
              className={isSuccess ? 'pay-check' : undefined}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isSuccess ? (
                <path d="M20 6 9 17l-5-5" />
              ) : isFailed ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 7v5l3 2" />
                </>
              )}
            </svg>
          )}
        </div>

        <h1 className="pay-result-title">{title}</h1>

        {isSuccess && amount ? (
          <p className="pay-result-amount">{formatCurrency(amount)}</p>
        ) : null}

        <p className="pay-result-message">
          {isVerifying
            ? 'Please wait while we confirm your payment. This only takes a moment.'
            : message}
        </p>

        {orderNumber ? (
          <span className="pay-result-order">Order {orderNumber}</span>
        ) : null}

        {!isVerifying && (
          <div className="pay-result-actions">
            <button
              type="button"
              className="pay-result-btn pay-result-btn-primary"
              onClick={goToOrders}
            >
              View My Orders
            </button>
            <button
              type="button"
              className="pay-result-btn pay-result-btn-secondary"
              onClick={goToDashboard}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {isSuccess && (
          <p className="pay-result-note">
            You'll receive an SMS when your order moves to in progress and when
            it's ready for pickup or delivery.
          </p>
        )}
      </div>
    </div>
  );
}

export default PaymentCallback;
