import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import AddonModal from './AddonModal';
import {
  apiAddonToRow,
  createAddonCatalogRequest,
  deleteAddonCatalogRequest,
  listAddonCatalogRequest,
  updateAddonCatalogRequest,
} from '../../api/addonCatalog';
import { canManageAddons } from '../../auth/authData';
import { useAuth } from '../../context/AuthContext';
import { showSuccessAlert } from '../../utils/alerts';
import './AllServices.css';

const catalogCache = { rows: null };

function filterAddons(rows, { search, category, status }) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch =
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query);
    const matchesCategory =
      category === 'all' || row.category.toLowerCase() === category.toLowerCase();
    const matchesStatus =
      status === 'all' ||
      (status === 'active' && row.isActive) ||
      (status === 'inactive' && !row.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function AllAddons() {
  const { user } = useAuth();
  const canManage = canManageAddons(user);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [rows, setRows] = useState(() => catalogCache.rows || []);
  const [loading, setLoading] = useState(() => !catalogCache.rows);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({
    open: false,
    mode: 'create',
    addonId: null,
  });

  const loadCatalog = () => {
    setError('');
    return listAddonCatalogRequest({ includeInactive: true })
      .then((list) => {
        setRows(list);
        catalogCache.rows = list;
      })
      .catch((err) => {
        if (!catalogCache.rows) {
          if (err?.status === 404) {
            setError(
              'Add-on catalog API is not on the server yet (404). Deploy /api/addon-catalog/ on the backend before managing the shared catalog.'
            );
          } else {
            setError(err?.message || 'Unable to load add-on catalog.');
          }
        }
      });
  };

  useEffect(() => {
    let active = true;
    if (catalogCache.rows) {
      setRows(catalogCache.rows);
      setLoading(false);
    } else {
      setLoading(true);
    }

    loadCatalog().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) catalogCache.rows = rows;
  }, [rows, loading]);

  const selected = rows.find((r) => r.id === modal.addonId) || null;

  const filtered = useMemo(
    () => filterAddons(rows, { search, category, status }),
    [rows, search, category, status]
  );

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return [...set].sort();
  }, [rows]);

  const handleReset = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
  };

  const handleCreate = async (form) => {
    try {
      const result = await createAddonCatalogRequest(form);
      const created = result?.data || result;
      if (created?.id != null) {
        setRows((prev) =>
          [...prev, apiAddonToRow(created)].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
          )
        );
      } else {
        await loadCatalog();
      }
      showSuccessAlert(
        'Add-on Created',
        result?.message || `${form.name} was added.`
      );
    } catch (err) {
      if (err?.status === 404) {
        throw new Error(
          'Catalog create endpoint is missing on the server (404). Deploy /api/addon-catalog/create/ first.'
        );
      }
      throw err;
    }
  };

  const handleUpdate = async (form) => {
    if (!selected?.id) return;
    const result = await updateAddonCatalogRequest(selected.id, form);
    const updated = result?.data || result;
    setRows((prev) =>
      prev.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              ...(updated?.id != null ? apiAddonToRow(updated) : {}),
              name: form.name,
              category: form.category,
              sortOrder: form.sortOrder,
              isActive: form.isActive,
            }
          : row
      )
    );
    showSuccessAlert('Add-on Updated', result?.message || `${form.name} was updated.`);
  };

  const handleDeactivate = async (row) => {
    await deleteAddonCatalogRequest(row.id);
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, isActive: false } : item
      )
    );
    showSuccessAlert('Add-on Deactivated', `${row.name} is now inactive.`);
  };

  const handleReactivate = async (row) => {
    await updateAddonCatalogRequest(row.id, { isActive: true });
    setRows((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, isActive: true } : item
      )
    );
    showSuccessAlert('Add-on Reactivated', `${row.name} is active again.`);
  };

  return (
    <DashboardLayout pageTitle="Add-on Catalog">
      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">Order Sheet Add-ons</h2>
          {canManage ? (
            <button
              type="button"
              className="add-service-btn"
              onClick={() =>
                setModal({ open: true, mode: 'create', addonId: null })
              }
              disabled={Boolean(error)}
              title={error ? 'Catalog API unavailable' : undefined}
            >
              Add Catalog Item
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="services-filters-card" style={{ marginBottom: 16 }}>
            <p className="staff-modal-error" style={{ margin: 0 }}>
              {error}
            </p>
          </div>
        ) : null}

        <div className="services-filters-card">
          <div className="services-filters-row">
            <input
              type="text"
              className="services-search-input"
              placeholder="Search add-ons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="services-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
                  <th>Sort</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="services-empty">
                      Loading catalog…
                    </td>
                  </tr>
                ) : error && rows.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="services-empty">
                      No add-ons match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id}>
                      <td className="service-name">{row.name}</td>
                      <td>{row.category}</td>
                      <td>{row.sortOrder}</td>
                      <td>
                        <span
                          className={`service-status-badge ${
                            row.isActive ? 'service-active' : 'service-inactive'
                          }`}
                        >
                          {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="order-actions">
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                className="view-service-btn"
                                onClick={() =>
                                  setModal({
                                    open: true,
                                    mode: 'edit',
                                    addonId: row.id,
                                  })
                                }
                              >
                                Edit
                              </button>
                              {row.isActive ? (
                                <button
                                  type="button"
                                  className="view-service-btn order-cash-btn"
                                  onClick={() => handleDeactivate(row)}
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="view-service-btn"
                                  onClick={() => handleReactivate(row)}
                                >
                                  Reactivate
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="services-empty">View only</span>
                          )}
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
              SHOWING {filtered.length} OF {rows.length} ADD-ONS
            </span>
          </div>
        </div>
      </div>

      <AddonModal
        isOpen={modal.open}
        mode={modal.mode}
        addon={selected}
        onClose={() => setModal({ open: false, mode: 'create', addonId: null })}
        onSubmit={modal.mode === 'create' ? handleCreate : handleUpdate}
      />
    </DashboardLayout>
  );
}

export default AllAddons;
