import { useEffect, useState } from 'react';
import { ghanaPhoneHint, isValidGhanaPhone } from '../../utils/phone';
import './ServiceModal.css';
import './StaffModal.css';

const emptyForm = {
  username: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'Admin',
  status: 'Active',
};

function staffToForm(staff) {
  if (!staff) return emptyForm;

  const nameParts = staff.name ? staff.name.split(' ') : [];

  return {
    username: staff.username || '',
    firstName: staff.firstName || nameParts[0] || '',
    lastName: staff.lastName || nameParts.slice(1).join(' ') || '',
    phone: staff.phone || '',
    role: staff.role === 'Superadmin' ? 'Super Admin' : staff.role,
    status: staff.status === 'ACTIVE' ? 'Active' : 'Inactive',
  };
}

function StaffBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 9h5M14 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StaffModal({
  isOpen,
  mode,
  staff,
  roleOptions = ['Admin', 'Employee'],
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  // Only show the role picker when there's an actual choice (superadmins). When
  // an admin can only create employees, the single-option select is pointless.
  const showRole = roleOptions.length > 1;

  useEffect(() => {
    if (isOpen) {
      setForm(
        isCreate
          ? { ...emptyForm, role: roleOptions[0] || emptyForm.role }
          : staffToForm(staff)
      );
      setError('');
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isCreate, staff]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
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

  if (!isOpen) {
    return null;
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if ((isCreate || isEdit) && !isValidGhanaPhone(form.phone)) {
      setError(ghanaPhoneHint());
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = isCreate ? 'Create Staff' : 'Edit Staff Details';
  const subtitle = isCreate
    ? 'Create a staff account. Login details are sent by SMS.'
    : 'Update the profile information and system access levels for this staff member.';

  const modalClass = [
    'service-modal',
    isView ? 'staff-view-modal' : '',
    isEdit ? 'staff-edit-modal' : '',
    isCreate ? 'staff-create-modal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {isView ? (
          <>
            <div className="staff-view-header">
              <div className="staff-view-header-main">
                <div className="staff-view-header-icon">
                  <StaffBadgeIcon />
                </div>
                <div>
                  <h2 id="staff-modal-title" className="staff-view-title">
                    Staff Details
                  </h2>
                  <p className="staff-view-subtitle">Read-only operational profile</p>
                </div>
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

            <div className="staff-view-body">
              <div className="staff-view-grid">
                <div className="staff-view-field">
                  <span className="staff-view-label">First Name</span>
                  <div className="staff-view-value">{form.firstName}</div>
                </div>

                <div className="staff-view-field">
                  <span className="staff-view-label">Last Name</span>
                  <div className="staff-view-value">{form.lastName}</div>
                </div>

                <div className="staff-view-field">
                  <span className="staff-view-label">Username</span>
                  <div className="staff-view-value">{form.username}</div>
                </div>

                {form.phone ? (
                  <div className="staff-view-field staff-view-field-full">
                    <span className="staff-view-label">Phone</span>
                    <div className="staff-view-value">{form.phone}</div>
                  </div>
                ) : null}
              </div>

              <div className="staff-view-footer">
                <button type="button" className="staff-view-close-btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <div>
                <h2 id="staff-modal-title" className="modal-title">
                  {title}
                </h2>
                <p className="modal-subtitle">{subtitle}</p>
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

            <form
              className={`service-modal-body${isEdit ? ' staff-edit-body' : ''}`}
              onSubmit={handleSubmit}
            >
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="staff-first-name">
                    First Name<span className="required"> *</span>
                  </label>
                  <input
                    id="staff-first-name"
                    type="text"
                    placeholder="Enter first name"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="staff-last-name">
                    Last Name<span className="required"> *</span>
                  </label>
                  <input
                    id="staff-last-name"
                    type="text"
                    placeholder="Enter last name"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    required
                  />
                </div>
              </div>

              {isCreate ? (
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="staff-username">
                      Username<span className="required"> *</span>
                    </label>
                    <input
                      id="staff-username"
                      type="text"
                      placeholder="Enter username"
                      value={form.username}
                      onChange={handleChange('username')}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="staff-phone">
                      Phone Number<span className="required"> *</span>
                    </label>
                    <input
                      id="staff-phone"
                      type="tel"
                      placeholder="0502412618 or +233502412618"
                      value={form.phone}
                      onChange={handleChange('phone')}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-field form-field-full">
                    <label htmlFor="staff-phone">
                      Phone Number<span className="required"> *</span>
                    </label>
                    <input
                      id="staff-phone"
                      type="tel"
                      placeholder="0502412618 or +233502412618"
                      value={form.phone}
                      onChange={handleChange('phone')}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div
                  className={`form-field${!showRole ? ' form-field-full' : ''}`}
                >
                  <label htmlFor="staff-status">
                    Status<span className="required"> *</span>
                  </label>
                  <select
                    id="staff-status"
                    className="modal-select"
                    value={form.status}
                    onChange={handleChange('status')}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                {showRole ? (
                  <div className="form-field">
                    <label htmlFor="staff-role">
                      Role<span className="required"> *</span>
                    </label>
                    <select
                      id="staff-role"
                      className="modal-select"
                      value={form.role}
                      onChange={handleChange('role')}
                      required
                    >
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              {isCreate ? (
                <div className="staff-info-note">
                  <span className="staff-info-icon" aria-hidden="true">
                    i
                  </span>
                  <p className="staff-info-text">
                    Login credentials will be sent to this phone by SMS. The
                    temporary password is also shown once after create so you can
                    share it securely.
                  </p>
                </div>
              ) : null}

              {error ? <p className="staff-modal-error">{error}</p> : null}

              <div className={isEdit ? 'staff-edit-footer' : 'modal-footer'}>
                <button
                  type="button"
                  className={isEdit ? 'staff-edit-cancel-btn' : 'modal-cancel-btn'}
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Saving…'
                    : isCreate
                      ? 'Create Staff'
                      : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default StaffModal;
