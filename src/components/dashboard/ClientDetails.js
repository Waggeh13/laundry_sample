import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import ClientModal from './ClientModal';
import TablePagination from './TablePagination';
import { formToClient } from './clientFormUtils';
import { getClientById } from './clientsData';
import { updateClientRequest } from '../../api/customers';
import {
  apiOrderToRow,
  completeOrderRequest,
  listStaffUserOrdersRequest,
} from '../../api/orders';
import { canAccessStaff } from '../../auth/authData';
import { useAuth } from '../../context/AuthContext';
import { showSuccessAlert } from '../../utils/alerts';
import {
  canCompleteOrder,
  formatPaymentStatus,
  formatStatusLabel,
  paymentStatusBadgeClass,
} from './ordersData';
import {
  IconBack,
  IconClock,
  IconContact,
  IconEdit,
  IconLocation,
  IconNotes,
  IconUser,
  IconWhatsApp,
} from './ClientIcons';
import './AllServices.css';
import './AllOrders.css';
import './ClientDetails.css';

const locationMapImage = `${process.env.PUBLIC_URL}/images/client-location-map.png`;

function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canViewOrders = canAccessStaff(user);
  const initialClient = location.state?.client || getClientById(id);
  const [client, setClient] = useState(initialClient);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [completingId, setCompletingId] = useState('');

  useEffect(() => {
    setClient(location.state?.client || getClientById(id));
    setOrdersPage(1);
  }, [id, location.state]);

  useEffect(() => {
    if (!canViewOrders || !id) return undefined;
    let active = true;
    setOrdersLoading(true);
    setOrdersError('');
    listStaffUserOrdersRequest(id, { page: ordersPage, pageSize: 20 })
      .then((data) => {
        if (!active) return;
        setOrders((data.results || []).map(apiOrderToRow));
        setOrdersCount(data.count || 0);
        setOrdersTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        if (!active) return;
        setOrders([]);
        setOrdersCount(0);
        setOrdersTotalPages(1);
        setOrdersError(err?.message || 'Unable to load client orders.');
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canViewOrders, id, ordersPage]);

  if (!client) {
    return (
      <DashboardLayout pageTitle="Client Management">
        <div className="client-details-page">
          <p className="client-not-found">Client not found.</p>
          <button type="button" className="client-back-link" onClick={() => navigate('/clients')}>
            Back to Clients
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = client.status === 'ACTIVE';
  const fullName =
    client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim();

  const handleUpdateClient = async (form) => {
    const result = await updateClientRequest(client.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      preferredContact: form.preferredContact,
      notes: form.notes.trim(),
    });

    setClient((prev) => {
      const merged = formToClient(form, prev);
      const user = result?.user;
      if (user) {
        const firstName = user.first_name ?? merged.firstName;
        const lastName = user.last_name ?? merged.lastName;
        return {
          ...merged,
          username: user.username || merged.username,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim() || merged.name,
          status: user.is_active === false ? 'INACTIVE' : 'ACTIVE',
        };
      }
      return merged;
    });

    showSuccessAlert(
      'Client Updated',
      result?.message || 'Client updated successfully.'
    );
  };

  const handleCompleteOrder = async (order) => {
    setCompletingId(String(order.id));
    try {
      const result = await completeOrderRequest(order.id);
      const raw = result?.data;
      setOrders((current) =>
        current.map((row) => {
          if (String(row.id) !== String(order.id)) return row;
          if (raw?.id || raw?.order_number) return apiOrderToRow(raw);
          return { ...row, orderStatus: 'COMPLETED' };
        })
      );
      showSuccessAlert(
        'Order Completed',
        result?.message || `Order ${order.orderNumber} was completed.`
      );
    } finally {
      setCompletingId('');
    }
  };

  const ordersStart = ordersCount === 0 ? 0 : (ordersPage - 1) * 20 + 1;
  const ordersEnd = Math.min(ordersPage * 20, ordersCount);

  return (
    <DashboardLayout pageTitle="Client Management">
      <div className="client-details-page">
        <button
          type="button"
          className="client-back-btn"
          onClick={() => navigate('/clients')}
          aria-label="Back to clients"
        >
          <IconBack />
        </button>

        <div className="client-details-hero">
          <div>
            <div className="client-details-name-row">
              <h2 className="client-details-name">{fullName}</h2>
              <span
                className={`client-status-pill ${
                  isActive ? 'client-status-active' : 'client-status-inactive'
                }`}
              >
                {isActive ? 'ACTIVE CLIENT' : 'INACTIVE CLIENT'}
              </span>
            </div>
          </div>
          <button type="button" className="client-edit-btn" onClick={() => setIsEditOpen(true)}>
            <IconEdit />
            Edit Client
          </button>
        </div>

        <div className="client-details-grid">
          <section className="client-detail-card">
            <div className="client-card-header">
              <span className="client-card-icon client-card-icon-purple">
                <IconUser />
              </span>
              <h3 className="client-card-title">Personal Info</h3>
            </div>
            <div className="client-card-fields">
              <div className="client-field">
                <span className="client-field-label">Username</span>
                <span className="client-field-value">{client.username || '—'}</span>
              </div>
              <div className="client-field">
                <span className="client-field-label">Full Name</span>
                <span className="client-field-value">{fullName}</span>
              </div>
            </div>
          </section>

          <section className="client-detail-card">
            <div className="client-card-header">
              <span className="client-card-icon client-card-icon-green">
                <IconContact />
              </span>
              <h3 className="client-card-title">Contact Details</h3>
            </div>
            <div className="client-card-fields client-card-fields-grid">
              <div className="client-field">
                <span className="client-field-label">Phone Number</span>
                <span className="client-field-value">{client.phone}</span>
                {client.phoneNeedsCorrection ? (
                  <span className="client-phone-warn-text">
                    Phone needs correction — orders cannot be created until updated.
                  </span>
                ) : null}
              </div>
              <div className="client-field">
                <span className="client-field-label">WhatsApp Number</span>
                <span className="client-field-value client-field-with-icon">
                  <IconWhatsApp />
                  {client.whatsapp || client.phone}
                </span>
              </div>
              <div className="client-field">
                <span className="client-field-label">Preferred Contact</span>
                <span className="client-contact-badge">
                  {(client.preferredContact || 'Phone').toUpperCase()}
                </span>
              </div>
            </div>
          </section>

          <section className="client-detail-card">
            <div className="client-card-header">
              <span className="client-card-icon client-card-icon-teal">
                <IconNotes />
              </span>
              <h3 className="client-card-title">Client Notes</h3>
            </div>
            <div className="client-field client-notes-field">
              <span className="client-field-label">Instructions &amp; Preferences</span>
              <p className="client-notes-box">
                {client.notes
                  ? `"${client.notes}"`
                  : 'No notes or preferences recorded for this client.'}
              </p>
            </div>
            {client.notesUpdated && (
              <p className="client-notes-updated">
                <IconClock />
                Last updated by Admin on {client.notesUpdated}
              </p>
            )}
          </section>

          <section className="client-detail-card">
            <div className="client-card-header">
              <span className="client-card-icon client-card-icon-blue">
                <IconLocation />
              </span>
              <h3 className="client-card-title">Primary Address</h3>
            </div>
            <div className="client-address-content">
              <div className="client-field">
                <span className="client-field-label">Service Address</span>
                <span className="client-field-value">{client.address || '—'}</span>
              </div>
              <img
                className="client-address-map"
                src={locationMapImage}
                alt=""
                aria-hidden="true"
              />
            </div>
          </section>
        </div>

        {canViewOrders ? (
          <section className="services-table-card client-orders-card">
            <div className="client-orders-header">
              <h3 className="client-card-title">Orders</h3>
              <p className="client-orders-subtitle">Newest first</p>
            </div>
            <div className="services-table-wrap">
              <table className="services-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading ? (
                    <tr>
                      <td colSpan="7" className="services-empty">
                        Loading orders…
                      </td>
                    </tr>
                  ) : ordersError ? (
                    <tr>
                      <td colSpan="7" className="services-empty">
                        {ordersError}
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="services-empty">
                        No orders for this client.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-number">{order.orderNumber}</td>
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
                            {canCompleteOrder(order) ? (
                              <button
                                type="button"
                                className="view-service-btn order-complete-btn"
                                disabled={completingId === String(order.id)}
                                onClick={() => handleCompleteOrder(order)}
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
                {ordersCount === 0
                  ? 'SHOWING 0 ORDERS'
                  : `SHOWING ${ordersStart} TO ${ordersEnd} OF ${ordersCount} ORDERS`}
              </span>
              <TablePagination
                page={ordersPage}
                totalPages={ordersTotalPages}
                onPageChange={setOrdersPage}
                disabled={ordersLoading}
              />
            </div>
          </section>
        ) : null}
      </div>

      <ClientModal
        isOpen={isEditOpen}
        mode="edit"
        client={client}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateClient}
      />
    </DashboardLayout>
  );
}

export default ClientDetails;
