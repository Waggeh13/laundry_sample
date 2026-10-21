import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import StaffModal from './StaffModal';
import StaffCredentialsModal from './StaffCredentialsModal';
import {
  createAdminRequest,
  createEmployeeRequest,
  createSuperadminRequest,
  listAdminsRequest,
  listEmployeesRequest,
  listSuperadminsRequest,
  updateStaffRequest,
} from '../../api/accounts';
import { fetchAllPages } from '../../api/pagination';
import { ROLES } from '../../auth/authData';
import { useAuth } from '../../context/AuthContext';
import { showSuccessAlert } from '../../utils/alerts';
import TablePagination from './TablePagination';
import './AllServices.css';
import './AllStaff.css';

const CREATE_FN_BY_ROLE = {
  'Super Admin': createSuperadminRequest,
  Admin: createAdminRequest,
  Employee: createEmployeeRequest,
};

const PAGE_SIZE = 20;
const FETCH_SIZE = 50;

// Module-level cache so navigating back to Staff shows data instantly while we
// revalidate in the background, instead of blanking out and refetching.
const staffCache = { key: null, rows: null };

function formToStaff(form, id) {
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();

  return {
    id,
    username: form.username.trim(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    phone: (form.phone || '').trim(),
    role: form.role,
    status: form.status.toUpperCase(),
  };
}

function listItemToStaff(item, role) {
  const firstName = item?.first_name || '';
  const lastName = item?.last_name || '';

  return {
    id: `${role}-${item?.id ?? Date.now()}`,
    userId: item?.id ?? null,
    username: item?.username || '',
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || item?.username || 'Unknown',
    phone: item?.phone_number || '',
    role,
    status: (item?.status || 'active').toUpperCase(),
  };
}

function apiRoleToDisplay(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'employee') return 'Employee';
  if (role === 'superadmin') return 'Super Admin';
  return role || 'Employee';
}

function apiUserToRow(user) {
  const display = apiRoleToDisplay(user?.role);
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';

  return {
    id: `${display}-${user?.id ?? Date.now()}`,
    userId: user?.id ?? null,
    username: user?.username || '',
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || user?.username || 'Unknown',
    phone: user?.phone_number || '',
    role: display,
    status: user?.is_active === false ? 'INACTIVE' : 'ACTIVE',
  };
}

function applyFilters(staffList, { roleFilter, employmentStatus }) {
  return staffList.filter((member) => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus =
      employmentStatus === 'all' || member.status.toLowerCase() === employmentStatus;
    return matchesRole && matchesStatus;
  });
}

function AllStaff() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === ROLES.SUPER_ADMIN;
  const roleOptions = isSuperadmin
    ? ['Super Admin', 'Admin', 'Employee']
    : ['Employee'];

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [employmentStatus, setEmploymentStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [staff, setStaff] = useState(() =>
    staffCache.key === '' && staffCache.rows ? staffCache.rows : []
  );
  const [loading, setLoading] = useState(
    () => !(staffCache.key === '' && staffCache.rows)
  );
  const [error, setError] = useState('');

  const [staffModal, setStaffModal] = useState({
    open: false,
    mode: 'create',
    staffId: null,
  });
  const [credentials, setCredentials] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStaff = useCallback(() => {
    let active = true;
    setError('');

    // Show cached rows for this search instantly and revalidate silently. Only
    // show the loading row when we have nothing to display yet.
    const cached = staffCache.key === debouncedSearch ? staffCache.rows : null;
    if (cached) {
      setStaff(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Update the table only once ALL lists have settled, so rows never flicker
    // (e.g. employees vanishing then reappearing when one call lands first).
    // The cached rows stay visible until the fresh data is fully ready.
    // Superadmins are only listable by a superadmin, so skip that call (treat as
    // already settled with no rows) for other roles.
    let superadminRows = isSuperadmin ? null : [];
    let adminRows = null;
    let employeeRows = null;
    const settle = () => {
      if (
        !active ||
        superadminRows === null ||
        adminRows === null ||
        employeeRows === null
      ) {
        return;
      }
      const rows = [...superadminRows, ...adminRows, ...employeeRows];
      setStaff(rows);
      staffCache.key = debouncedSearch;
      staffCache.rows = rows;
      setLoading(false);
    };

    if (isSuperadmin) {
      fetchAllPages(
        (page, pageSize) =>
          listSuperadminsRequest({ page, pageSize, search: debouncedSearch }),
        { pageSize: FETCH_SIZE }
      )
        .then(({ results }) => {
          superadminRows = results.map((item) =>
            listItemToStaff(item, 'Super Admin')
          );
        })
        .catch(() => {
          superadminRows = [];
        })
        .finally(settle);
    }

    fetchAllPages(
      (page, pageSize) =>
        listAdminsRequest({ page, pageSize, search: debouncedSearch }),
      { pageSize: FETCH_SIZE }
    )
      .then(({ results }) => {
        adminRows = results.map((item) => listItemToStaff(item, 'Admin'));
      })
      .catch((err) => {
        adminRows = [];
        if (active && !cached) setError(err?.message || 'Unable to load staff.');
      })
      .finally(settle);

    fetchAllPages(
      (page, pageSize) =>
        listEmployeesRequest({ page, pageSize, search: debouncedSearch }),
      { pageSize: FETCH_SIZE }
    )
      .then(({ results }) => {
        employeeRows = results.map((item) =>
          listItemToStaff(item, 'Employee')
        );
      })
      .catch(() => {
        employeeRows = [];
      })
      .finally(settle);

    return () => {
      active = false;
    };
  }, [debouncedSearch, isSuperadmin]);

  useEffect(() => loadStaff(), [loadStaff]);

  // Keep the cache in sync with in-place updates (create/update) so a return
  // visit reflects the latest data rather than the first load.
  useEffect(() => {
    if (!loading && staffCache.key === debouncedSearch) {
      staffCache.rows = staff;
    }
  }, [staff, loading, debouncedSearch]);

  const selectedStaff = staff.find((member) => member.id === staffModal.staffId) || null;

  const filteredStaff = useMemo(
    () => applyFilters(staff, { roleFilter, employmentStatus }),
    [staff, roleFilter, employmentStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageStaff = filteredStaff.slice(pageStart, pageStart + PAGE_SIZE);

  const handleReset = () => {
    setSearch('');
    setRoleFilter('all');
    setEmploymentStatus('all');
    setPage(1);
  };

  const openCreateModal = () => {
    setStaffModal({ open: true, mode: 'create', staffId: null });
  };

  const openViewModal = (staffId) => {
    setStaffModal({ open: true, mode: 'view', staffId });
  };

  const openEditModal = (staffId) => {
    setStaffModal({ open: true, mode: 'edit', staffId });
  };

  const closeModal = () => {
    setStaffModal({ open: false, mode: 'create', staffId: null });
  };

  const handleCreateStaff = async (form) => {
    const payload = {
      username: form.username.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
    };

    const createFn = CREATE_FN_BY_ROLE[form.role] || createEmployeeRequest;
    const result = await createFn(payload);

    const newRole = apiRoleToDisplay(result?.user?.role);
    if (result?.user && (newRole === 'Admin' || newRole === 'Employee' || newRole === 'Super Admin')) {
      setStaff((prev) => [apiUserToRow(result.user), ...prev]);
    }

    if (result?.default_password) {
      setCredentials({
        username: result.user?.username || payload.username,
        password: result.default_password,
        message: result.message || 'Staff created successfully',
        subtitle:
          'Share these credentials securely. The password is shown only once. Login details were also sent by SMS (no magic link for staff).',
        note: result.note || 'Staff must change password on first login',
      });
    } else {
      showSuccessAlert(
        'Staff Created',
        result?.message || `${form.role} created successfully. Credentials were sent by SMS.`
      );
    }
  };

  const handleUpdateStaff = async (form) => {
    const member = staff.find((m) => m.id === staffModal.staffId);

    if (!member?.userId) {
      setStaff((prev) =>
        prev.map((item) =>
          item.id === staffModal.staffId ? formToStaff(form, item.id) : item
        )
      );
      return;
    }

    const result = await updateStaffRequest({
      userId: member.userId,
      targetRole: member.role,
      isSuperadmin: user?.role === ROLES.SUPER_ADMIN,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      isActive: form.status.toUpperCase() === 'ACTIVE',
    });

    setStaff((prev) =>
      prev.map((item) => {
        if (item.id !== staffModal.staffId) return item;
        if (result?.user) {
          return { ...apiUserToRow(result.user), id: item.id };
        }
        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();
        return {
          ...item,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`.trim() || item.name,
          phone: form.phone.trim(),
          status: form.status.toUpperCase(),
        };
      })
    );

    showToast(result?.message || 'Staff updated successfully.');
  };

  const handleSubmit = async (form) => {
    if (staffModal.mode === 'create') {
      await handleCreateStaff(form);
    } else {
      await handleUpdateStaff(form);
    }
  };

  const total = filteredStaff.length;
  const rangeStart = total === 0 ? 0 : pageStart + 1;
  const rangeEnd = pageStart + pageStaff.length;

  return (
    <DashboardLayout pageTitle="Staff Management">
      {toast && (
        <div className="staff-toast" role="status">
          <span className="staff-toast-icon" aria-hidden="true">
            ✓
          </span>
          {toast}
        </div>
      )}

      <div className="services-page">
        <div className="services-page-header">
          <h2 className="services-page-title">All Staff</h2>
          <button type="button" className="add-service-btn" onClick={openCreateModal}>
            Add Staff
          </button>
        </div>

        <div className="services-filters-card">
          <div className="services-filters-row">
            <input
              type="text"
              className="services-search-input"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {isSuperadmin && (
              <select
                className="services-select"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="Super Admin">Super Admins</option>
                <option value="Admin">Admins</option>
                <option value="Employee">Employees</option>
              </select>
            )}

            <select
              className="services-select"
              value={employmentStatus}
              onChange={(e) => {
                setEmploymentStatus(e.target.value);
                setPage(1);
              }}
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
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && staff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      Loading staff…
                    </td>
                  </tr>
                ) : error && staff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      {error}
                    </td>
                  </tr>
                ) : pageStaff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="services-empty">
                      No staff match your search or filters.
                    </td>
                  </tr>
                ) : (
                  pageStaff.map((member) => (
                    <tr key={member.id}>
                      <td className="service-name">{member.name}</td>
                      <td>
                        <span
                          className={`staff-role-badge ${
                            member.role === 'Employee' ? 'staff-role-employee' : 'staff-role-admin'
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`service-status-badge ${
                            member.status === 'ACTIVE' ? 'service-active' : 'service-inactive'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td>
                        <div className="staff-actions">
                          {member.role !== 'Super Admin' && (
                            <button
                              type="button"
                              className="staff-action-btn"
                              onClick={() => openEditModal(member.id)}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="staff-action-btn"
                            onClick={() => openViewModal(member.id)}
                          >
                            View
                          </button>
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
              {total === 0
                ? 'SHOWING 0 STAFF'
                : `SHOWING ${rangeStart} TO ${rangeEnd} OF ${total} STAFF`}
            </span>
            <TablePagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      <StaffModal
        isOpen={staffModal.open}
        mode={staffModal.mode}
        staff={selectedStaff}
        roleOptions={roleOptions}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onModeChange={(mode) => setStaffModal((prev) => ({ ...prev, mode }))}
      />

      <StaffCredentialsModal
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />
    </DashboardLayout>
  );
}

export default AllStaff;
