import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPickupPreviewRequest } from '../../api/notifications';
import './PickupBell.css';

function kindLabel(kind) {
  if (kind === 'pickup_missed') return 'Missed';
  if (kind === 'pickup_today') return 'Today';
  return kind || 'Pickup';
}

function formatDelivery(date, time) {
  const datePart = date || '';
  const timePart = time ? String(time).slice(0, 5) : '';
  if (datePart && timePart) return `${datePart} · ${timePart}`;
  return datePart || timePart || '—';
}

function PickupBell() {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let active = true;
    getPickupPreviewRequest()
      .then((data) => {
        if (!active) return;
        setCount(data.count || 0);
        setResults(Array.isArray(data.results) ? data.results.slice(0, 5) : []);
      })
      .catch(() => {
        // Bell is supplementary; a failed preview should not block the app.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const openOrder = (orderId) => {
    setOpen(false);
    if (orderId != null) navigate(`/orders/${orderId}`);
  };

  return (
    <div className="pickup-bell" ref={wrapRef}>
      <button
        type="button"
        className="pickup-bell-btn"
        aria-label="Pickup notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
        </svg>
        {count > 0 ? (
          <span className="pickup-bell-badge">{count > 99 ? '99+' : count}</span>
        ) : null}
      </button>

      {open ? (
        <div className="pickup-bell-dropdown" role="menu">
          <div className="pickup-bell-header">
            <span>Pickups</span>
            <span className="pickup-bell-count">{count}</span>
          </div>
          {results.length === 0 ? (
            <p className="pickup-bell-empty">No pickups due.</p>
          ) : (
            results.map((row) => (
              <button
                key={`${row.kind}-${row.order_id}`}
                type="button"
                className="pickup-bell-item"
                onClick={() => openOrder(row.order_id)}
              >
                <span
                  className={`pickup-kind pickup-kind-${
                    row.kind === 'pickup_missed' ? 'missed' : 'today'
                  }`}
                >
                  {kindLabel(row.kind)}
                </span>
                <span className="pickup-bell-item-main">
                  <strong>{row.order_number || `Order #${row.order_id}`}</strong>
                  <span>{row.customer_name || row.customer_username || '—'}</span>
                </span>
                <span className="pickup-bell-item-meta">
                  {formatDelivery(row.delivery_date, row.delivery_time)}
                </span>
              </button>
            ))
          )}
          <button
            type="button"
            className="pickup-bell-view-all"
            onClick={() => {
              setOpen(false);
              navigate('/notifications/pickups');
            }}
          >
            View all
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default PickupBell;
