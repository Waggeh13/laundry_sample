import { useEffect, useState } from 'react';
import '../dashboard/ServiceModal.css';
import '../dashboard/UpdateProfileModal.css';

const CONTACT_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
];

function toForm(profile) {
  return {
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    whatsapp: profile?.whatsapp || '',
    address: profile?.address || '',
    preferredContact: (profile?.preferredContact || 'phone').toLowerCase(),
  };
}

function UpdateClientProfileModal({ isOpen, profile, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toForm(profile));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(profile));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, profile]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
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

  if (!isOpen) return null;

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
        aria-labelledby="client-update-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="client-update-profile-title" className="modal-title">
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
              <label htmlFor="client-first-name">First Name</label>
              <input
                id="client-first-name"
                type="text"
                value={form.firstName}
                onChange={handleChange('firstName')}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="client-last-name">Last Name</label>
              <input
                id="client-last-name"
                type="text"
                value={form.lastName}
                onChange={handleChange('lastName')}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="client-phone">Phone Number</label>
              <input
                id="client-phone"
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </div>
            <div className="form-field">
              <label htmlFor="client-whatsapp">WhatsApp Number</label>
              <input
                id="client-whatsapp"
                type="tel"
                value={form.whatsapp}
                onChange={handleChange('whatsapp')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="client-address">Address</label>
              <textarea
                id="client-address"
                rows="3"
                value={form.address}
                onChange={handleChange('address')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="client-preferred-contact">Preferred Contact</label>
              <select
                id="client-preferred-contact"
                className="modal-select"
                value={form.preferredContact}
                onChange={handleChange('preferredContact')}
              >
                {CONTACT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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

export default UpdateClientProfileModal;
