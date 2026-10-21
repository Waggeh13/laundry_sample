import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import ClientModal from './ClientModal';
import { listClientsRequest } from '../../api/accounts';
import { fetchAllPages } from '../../api/pagination';
import { apiClientToRow, createCustomerRequest } from '../../api/customers';
import { showSuccessAlert } from '../../utils/alerts';
import TablePagination from './TablePagination';
import './AllServices.css';
import './AllClients.css';

// Module-level cache so returning to Clients shows data instantly while it
// revalidates in the background instead of blanking out and refetching.
const clientsCache = { rows: null };
const PAGE_SIZE = 20;

function filterClients(clients, { search, status }) {
  const query = search.trim().toLowerCase();

  return clients.filter((client) => {
    const matchesSearch =
      !query ||
      client.name.toLowerCase().includes(query) ||
      client.username?.toLowerCase().includes(query) ||
      client.phone.toLowerCase().includes(query);

    const matchesStatus = status === 'all' || client.status.toLowerCase() === status;

    return matchesSearch && matchesStatus;
  });
}

function AllClients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [clients, setClients] = useState(() => clientsCache.rows || []);
  const [loading, setLoading] = useState(() => !clientsCache.rows);
  const [error, setError] = useState('');
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setError('');

    // Show cached rows instantly and revalidate silently; only show the loading
    // row when we have nothing to display yet.
    if (clientsCache.rows) {
      setClients(clientsCache.rows);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Backend page_size is capped. Pull every page so later rows are not dropped.
    fetchAllPages(
      (page, pageSize) => listClientsRequest({ page, pageSize }),
      { pageSize: 50 }
    )
      .then(({ results }) => {
        if (!active) return;
        const rows = results.map(apiClientToRow);
        setClients(rows);
        clientsCache.rows = rows;
      })
      .catch((err) => {
        if (active && !clientsCache.rows) {
          setError(err?.message || 'Unable to load clients.');
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
    if (!loading) clientsCache.rows = clients;
  }, [clients, loading]);

  const filteredClients = useMemo(
    () => filterClients(clients, { search, status }),
    [clients, search, status]
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const openCreateModal = () => {
    setClientModalOpen(true);
  };

  const closeModal = () => {
    setClientModalOpen(false);
  };

  const handleCreateClient = async (form) => {
    const result = await createCustomerRequest({
      username: form.username.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      preferredContact: form.preferredContact,
    });

    const user = result?.user;
    if (user) {
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      setClients((prev) => [
        {
          id: String(user.id),
          customerId: result?.customer?.id ?? null,
          username: user.username || form.username.trim(),
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim() || user.username || 'Unknown',
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          address: form.address.trim(),
          preferredContact: form.preferredContact,
          status: user.is_active === false ? 'INACTIVE' : 'ACTIVE',
          totalOrders: 0,
          totalSpent: '0.00',
        },
        ...prev,
      ]);
    }

    // Credentials are sent by SMS only — the API does not return default_password.
    const username = user?.username || form.username.trim();
    showSuccessAlert(
      'Client Created',
      result?.message ||
        `Customer ${username} was created. Login credentials were sent by SMS.`
    );
  };

  return (
    <DashboardLayout pageTitle="Client Management">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">All Clients</h2>
          <button type="button" className="add-service-btn" onClick={openCreateModal}>
            Add Client
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row">
            <input
              type="text"
              className="services-search-input"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="services-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button type="button" className="services-reset-btn" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>

        <div className="services-table-card">
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Total Orders</th>
                  <th>Total Spent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="services-empty">
                      Loading clients…
                    </td>
                  </tr>
                ) : error && clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="services-empty">
                      No clients have been created yet.
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="services-empty">
                      No clients match your search or filters.
                    </td>
                  </tr>
                ) : (
                  pageClients.map((client) => (
                    <tr key={client.id}>
                      <td className="service-name">{client.name}</td>
                      <td className="client-phone">{client.phone}</td>
                      <td>
                        <div className="client-status-stack">
                          <span
                            className={`service-status-badge ${
                              client.status === 'ACTIVE' ? 'service-active' : 'service-inactive'
                            }`}
                          >
                            {client.status}
                          </span>
                          {client.phoneNeedsCorrection ? (
                            <span className="service-status-badge client-phone-warn">
                              PHONE NEEDS FIX
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>{client.totalOrders}</td>
                      <td className="service-price">GHS {client.totalSpent}</td>
                      <td>
                        <button
                          type="button"
                          className="view-service-btn"
                          onClick={() => navigate(`/clients/${client.id}`, { state: { client } })}
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

          <div className="services-table-footer">
            <span className="services-count">
              {filteredClients.length === 0
                ? `SHOWING 0 OF ${clients.length} CLIENTS`
                : `SHOWING ${(currentPage - 1) * PAGE_SIZE + 1} TO ${Math.min(
                    currentPage * PAGE_SIZE,
                    filteredClients.length
                  )} OF ${filteredClients.length} CLIENTS`}
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

      <ClientModal
        isOpen={clientModalOpen}
        mode="create"
        onClose={closeModal}
        onSubmit={handleCreateClient}
      />
    </DashboardLayout>
  );
}

export default AllClients;
