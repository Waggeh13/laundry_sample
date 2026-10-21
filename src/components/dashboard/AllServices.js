import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ServiceModal from './ServiceModal';
import {
  apiServiceToRow,
  createServiceRequest,
  getServiceByIdRequest,
  listServicesRequest,
  updateServiceRequest,
} from '../../api/services';
import { showSuccessAlert } from '../../utils/alerts';
import TablePagination from './TablePagination';
import './AllServices.css';

// Module-level cache so returning to Services shows data instantly while it
// revalidates in the background instead of blanking out and refetching.
const servicesCache = { rows: null };
const PAGE_SIZE = 20;

function formToService(form, id) {
  return {
    id,
    name: form.name,
    category: form.category || 'General',
    status: form.status.toUpperCase(),
    description: form.description,
  };
}

function filterServices(services, { search, category, status }) {
  const query = search.trim().toLowerCase();

  return services.filter((service) => {
    const matchesSearch =
      !query ||
      service.name.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query);

    const matchesCategory =
      category === 'all' || service.category.toLowerCase() === category;

    const matchesStatus =
      status === 'all' || service.status.toLowerCase() === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function AllServices() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [services, setServices] = useState(() => servicesCache.rows || []);
  const [loading, setLoading] = useState(() => !servicesCache.rows);
  const [error, setError] = useState('');
  const [serviceModal, setServiceModal] = useState({
    open: false,
    mode: 'create',
    serviceId: null,
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setError('');

    // Show cached rows instantly and revalidate silently; only show the loading
    // row when we have nothing to display yet.
    if (servicesCache.rows) {
      setServices(servicesCache.rows);
      setLoading(false);
    } else {
      setLoading(true);
    }

    listServicesRequest()
      .then((result) => {
        if (!active) return;
        // The list endpoint may return data as a plain array or a paginated
        // object ({ results: [...] }). Handle both.
        const payload = result?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
          ? payload.results
          : [];
        const rows = list.map(apiServiceToRow);
        setServices(rows);
        servicesCache.rows = rows;
      })
      .catch((err) => {
        if (active && !servicesCache.rows) {
          setError(err?.message || 'Unable to load services.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Keep the cache in sync with in-place changes (create/update) so a return
  // visit reflects the latest data.
  useEffect(() => {
    if (!loading) servicesCache.rows = services;
  }, [services, loading]);

  const selectedService = services.find((s) => s.id === serviceModal.serviceId) || null;

  const filteredServices = useMemo(
    () => filterServices(services, { search, category, status }),
    [services, search, category, status]
  );

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status]);

  const handleReset = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setPage(1);
  };

  const openCreateModal = () => {
    setServiceModal({ open: true, mode: 'create', serviceId: null });
  };

  const openViewModal = (serviceId) => {
    setServiceModal({ open: true, mode: 'view', serviceId });

    // Refresh this row with the latest details from the server. Failures are
    // ignored so the modal still shows the cached row.
    getServiceByIdRequest(serviceId)
      .then((result) => {
        if (!result?.data) return;
        const fresh = { ...apiServiceToRow(result.data), id: serviceId };
        setServices((prev) =>
          prev.map((service) => (service.id === serviceId ? fresh : service))
        );
      })
      .catch(() => {});
  };

  const closeModal = () => {
    setServiceModal({ open: false, mode: 'create', serviceId: null });
  };

  const handleCreateService = async (form) => {
    const result = await createServiceRequest({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      status: form.status,
    });

    const created = result?.data
      ? apiServiceToRow(result.data)
      : formToService(form, String(Date.now()));
    setServices((prev) => [created, ...prev]);
    showSuccessAlert(
      'Service Created',
      result?.message || `${created.name} was created successfully.`
    );
  };

  const handleUpdateService = async (form) => {
    const id = serviceModal.serviceId;
    const result = await updateServiceRequest(id, {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      status: form.status,
    });

    const updated = result?.data
      ? { ...apiServiceToRow(result.data), id }
      : formToService(form, id);
    setServices((prev) =>
      prev.map((service) => (service.id === id ? updated : service))
    );
    showSuccessAlert(
      'Service Updated',
      result?.message || `${updated.name} was updated successfully.`
    );
  };

  const handleSubmit = async (form) => {
    if (serviceModal.mode === 'create') {
      await handleCreateService(form);
    } else {
      await handleUpdateService(form);
    }
  };

  return (
    <DashboardLayout pageTitle="Service Management">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">All Services</h2>
          <button type="button" className="add-service-btn" onClick={openCreateModal}>
            Add Service
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row">
            <input
              type="text"
              className="services-search-input"
              placeholder="Search by name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="services-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="washing">Washing</option>
              <option value="specialty">Specialty</option>
              <option value="ironing">Ironing</option>
            </select>

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
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && services.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      Loading services…
                    </td>
                  </tr>
                ) : error && services.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      No services have been created yet.
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      No services match your search or filters.
                    </td>
                  </tr>
                ) : (
                  pageServices.map((service) => (
                    <tr key={service.id}>
                      <td className="service-name">{service.name}</td>
                      <td>{service.category}</td>
                      <td>
                        <span
                          className={`service-status-badge ${
                            service.status === 'ACTIVE' ? 'service-active' : 'service-inactive'
                          }`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="view-service-btn"
                          onClick={() => openViewModal(service.id)}
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
              {filteredServices.length === 0
                ? `SHOWING 0 OF ${services.length} SERVICES`
                : `SHOWING ${(currentPage - 1) * PAGE_SIZE + 1} TO ${Math.min(
                    currentPage * PAGE_SIZE,
                    filteredServices.length
                  )} OF ${filteredServices.length} SERVICES`}
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

      <ServiceModal
        isOpen={serviceModal.open}
        mode={serviceModal.mode}
        service={selectedService}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onModeChange={(mode) => setServiceModal((prev) => ({ ...prev, mode }))}
      />
    </DashboardLayout>
  );
}

export default AllServices;
