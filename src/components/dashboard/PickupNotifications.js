import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import TablePagination from './TablePagination';
import { listPickupNotificationsRequest } from '../../api/notifications';
import {
  apiOrderToRow,
  completeOrderRequest,
} from '../../api/orders';
import { canCompleteOrder, formatStatusLabel } from './ordersData';
import { showSuccessAlert } from '../../utils/alerts';
import './AllServices.css';
import './PickupBell.css';

function kindLabel(kind) {
  if (kind === 'pickup_missed') return 'Missed';
  if (kind === 'pickup_today') return 'Today';
  return kind || 'Pickup';
}

function PickupNotifications() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listPickupNotificationsRequest({ page, pageSize: 20 })
      .then((data) => {
        if (!active) return;
        setRows(data.results || []);
        setCount(data.count || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        if (!active) return;
        setRows([]);
        setCount(0);
        setTotalPages(1);
        setError(err?.message || 'Unable to load pickup notifications.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  const handleComplete = async (row) => {
    setCompletingId(String(row.order_id));
    try {
      const result = await completeOrderRequest(row.order_id);
      const next = result?.data ? apiOrderToRow(result.data) : null;
      if (next && !canCompleteOrder(next)) {
        setRows((current) =>
          current.filter((item) => String(item.order_id) !== String(row.order_id))
        );
        setCount((value) => Math.max(0, value - 1));
      }
      showSuccessAlert(
        'Order Completed',
        result?.message || `Order ${row.order_number} was completed.`
      );
    } finally {
      setCompletingId('');
    }
  };

  const rangeStart = count === 0 ? 0 : (page - 1) * 20 + 1;
  const rangeEnd = Math.min(page * 20, count);

  return (
    <DashboardLayout pageTitle="Pickup notifications">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">Due and missed pickups</h2>
        </div>

        <div className="services-table-card">
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="services-empty">
                      Loading pickups…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="services-empty">
                      No pickup notifications.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.kind}-${row.order_id}`}>
                      <td>
                        <span
                          className={`pickup-kind pickup-kind-${
                            row.kind === 'pickup_missed' ? 'missed' : 'today'
                          }`}
                        >
                          {kindLabel(row.kind)}
                        </span>
                      </td>
                      <td className="order-number">{row.order_number || '—'}</td>
                      <td className="service-name">
                        {row.customer_name || row.customer_username || '—'}
                      </td>
                      <td>{row.phone_number || '—'}</td>
                      <td>
                        {row.delivery_date || '—'}
                        {row.delivery_time
                          ? ` · ${String(row.delivery_time).slice(0, 5)}`
                          : ''}
                      </td>
                      <td>{formatStatusLabel(row.order_status)}</td>
                      <td>
                        <div className="order-actions">
                          <button
                            type="button"
                            className="view-service-btn"
                            onClick={() => navigate(`/orders/${row.order_id}`)}
                          >
                            View
                          </button>
                          {canCompleteOrder({ orderStatus: row.order_status }) ? (
                            <button
                              type="button"
                              className="view-service-btn order-complete-btn"
                              disabled={completingId === String(row.order_id)}
                              onClick={() => handleComplete(row)}
                            >
                              {completingId === String(row.order_id)
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
              {count === 0
                ? 'SHOWING 0 PICKUPS'
                : `SHOWING ${rangeStart} TO ${rangeEnd} OF ${count} PICKUPS`}
            </span>
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PickupNotifications;
