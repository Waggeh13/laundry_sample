import { useEffect, useState } from 'react';
import { profileToForm } from './profileFormUtils';
import './ServiceModal.css';
import './UpdateProfileModal.css';

function UpdateProfileModal({ isOpen, profile, onClose, onSubmit }) {
  const [form, setForm] = useState(() => profileToForm(profile));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(profileToForm(profile));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, profile]);

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
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to update your profile. Please try again.');
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
        className="service-modal update-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="update-profile-title" className="modal-title">
              Update Profile
            </h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="service-modal-body update-profile-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="profile-first-name">First Name</label>
              <input
                id="profile-first-name"
                type="text"
                value={form.firstName}
                onChange={handleChange('firstName')}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="profile-last-name">Last Name</label>
              <input
                id="profile-last-name"
                type="text"
                value={form.lastName}
                onChange={handleChange('lastName')}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="profile-username">Username</label>
            <input
              id="profile-username"
              type="text"
              value={form.username}
              onChange={handleChange('username')}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="profile-status">Status</label>
            <select
              id="profile-status"
              className="modal-select"
              value={form.status}
              onChange={handleChange('status')}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {error && <p className="staff-modal-error">{error}</p>}

          <div className="update-profile-footer">
            <button
              type="button"
              className="update-profile-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfileModal;
