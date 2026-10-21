import { useEffect, useState } from 'react';
import { clientToForm, emptyClientForm } from './clientFormUtils';
import { ghanaPhoneHint, isValidGhanaPhone } from '../../utils/phone';
import './ServiceModal.css';
import './StaffModal.css';
import './ClientModal.css';

function ClientFormFields({ form, isCreate, onChange }) {
  const createRequired = new Set([
    'username',
    'firstName',
    'phone',
    'whatsapp',
    'address',
    'preferredContact',
  ]);
  const requiredMark = (field) =>
    isCreate && createRequired.has(field) ? <span className="required"> *</span> : null;
  const isRequired = (field) => isCreate && createRequired.has(field);

  return (
    <>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="client-username">Username{requiredMark('username')}</label>
          <input
            id="client-username"
            type="text"
            placeholder="e.g. johndoe"
            value={form.username}
            onChange={onChange('username')}
            required={isRequired('username')}
          />
        </div>

        <div className="form-field">
          <label htmlFor="client-first-name">First Name{requiredMark('firstName')}</label>
          <input
            id="client-first-name"
            type="text"
            placeholder="First Name"
            value={form.firstName}
            onChange={onChange('firstName')}
            required={isRequired('firstName')}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="client-last-name">Last Name{requiredMark('lastName')}</label>
          <input
            id="client-last-name"
            type="text"
            placeholder="Last Name"
            value={form.lastName}
            onChange={onChange('lastName')}
            required={isRequired('lastName')}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="client-phone">Phone Number{requiredMark('phone')}</label>
          <input
            id="client-phone"
            type="tel"
            placeholder="0XXXXXXXXX or +233XXXXXXXXX"
            value={form.phone}
            onChange={onChange('phone')}
            required={isRequired('phone')}
          />
        </div>

        <div className="form-field">
          <label htmlFor="client-whatsapp">WhatsApp Number{requiredMark('whatsapp')}</label>
          <input
            id="client-whatsapp"
            type="tel"
            placeholder="0XXXXXXXXX or +233XXXXXXXXX"
            value={form.whatsapp}
            onChange={onChange('whatsapp')}
            required={isRequired('whatsapp')}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="client-address">Address{requiredMark('address')}</label>
        <input
          id="client-address"
          type="text"
          placeholder="Street Address, City, State, ZIP"
          value={form.address}
          onChange={onChange('address')}
          required={isRequired('address')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="client-preferred-contact">
          Preferred Contact Method{requiredMark('preferredContact')}
        </label>
        <select
          id="client-preferred-contact"
          className="modal-select"
          value={form.preferredContact}
          onChange={onChange('preferredContact')}
          required={isRequired('preferredContact')}
        >
          <option value="Phone">Phone</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Email">Email</option>
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="client-notes">Notes</label>
        <textarea
          id="client-notes"
          rows="4"
          placeholder="Add any specific instructions or client preferences here..."
          value={form.notes}
          onChange={onChange('notes')}
        />
      </div>
    </>
  );
}

function ClientModal({ isOpen, mode = 'create', client, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyClientForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isOpen) {
      setForm(isCreate ? emptyClientForm : clientToForm(client));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, isCreate, client]);

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

    if (!isValidGhanaPhone(form.phone)) {
      setError(`Phone: ${ghanaPhoneHint()}`);
      return;
    }
    if (form.whatsapp && !isValidGhanaPhone(form.whatsapp)) {
      setError(`WhatsApp: ${ghanaPhoneHint()}`);
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

  const title = isCreate ? 'Create Client' : 'Edit Client';
  const subtitle = isCreate
    ? 'Create a client account. A welcome SMS with a magic login link will be sent.'
    : 'Update the profile information and contact details for this client.';

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`service-modal client-create-modal${isEdit ? ' client-edit-modal' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="client-modal-title" className="modal-title">
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
          className={`service-modal-body${isEdit ? ' client-edit-body' : ''}`}
          onSubmit={handleSubmit}
        >
          <ClientFormFields form={form} isCreate={isCreate} onChange={handleChange} />

          {isCreate && (
            <div className="staff-info-note">
              <span className="staff-info-icon" aria-hidden="true">
                i
              </span>
              <p className="staff-info-text">
                Login credentials are sent by SMS with a magic link (valid ~30 days).
                The customer should change their password after first login.
              </p>
            </div>
          )}

          {error && <p className="staff-modal-error">{error}</p>}

          <div className={isEdit ? 'client-edit-footer' : 'modal-footer'}>
            <button
              type="button"
              className={isEdit ? 'client-edit-cancel-btn' : 'modal-cancel-btn'}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn" disabled={submitting}>
              {submitting
                ? 'Saving…'
                : isCreate
                ? 'Create Client'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientModal;
