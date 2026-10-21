import { useEffect, useState } from 'react';
import './ServiceModal.css';

const emptyForm = {
  name: '',
  category: '',
  status: 'Active',
  description: '',
};

function serviceToForm(service) {
  if (!service) return emptyForm;

  return {
    name: service.name,
    category: service.category,
    status: service.status === 'ACTIVE' ? 'Active' : 'Inactive',
    description: service.description || '',
  };
}

function ServiceModal({
  isOpen,
  mode,
  service,
  onClose,
  onSubmit,
  onModeChange,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  useEffect(() => {
    if (isOpen) {
      setForm(isCreate ? emptyForm : serviceToForm(service));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, isCreate, service]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (isEdit && service) {
          onModeChange('view');
        } else {
          onClose();
        }
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
  }, [isOpen, isEdit, service, onClose, onModeChange]);

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
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEdit && service) {
      setForm(serviceToForm(service));
      onModeChange('view');
      return;
    }
    onClose();
  };

  const title = isCreate ? 'Create Service' : isEdit ? 'Edit Service' : 'Service Details';
  const subtitle = isCreate
    ? 'Add a new offering to your service menu'
    : isEdit
      ? 'Update the details for this service offering.'
      : 'View full details for this service offering.';

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="service-modal-title" className="modal-title">
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

        {isView ? (
          <div className="service-modal-body service-view">
            <div className="service-view-hero">
              <h3 className="service-view-name">{form.name}</h3>
              <span
                className={`service-status-badge ${
                  form.status === 'Active' ? 'service-active' : 'service-inactive'
                }`}
              >
                {form.status.toUpperCase()}
              </span>
            </div>

            <div className="service-view-grid">
              <div className="service-view-item">
                <span className="view-label">Category</span>
                <span className="view-value">{form.category}</span>
              </div>
              <div className="service-view-item">
                <span className="view-label">Status</span>
                <span className="view-value">{form.status}</span>
              </div>
            </div>

            <div className="service-view-description">
              <span className="view-label">Description</span>
              <p className="view-description">
                {form.description || 'No description provided.'}
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-outline-btn" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                onClick={() => onModeChange('edit')}
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <form className="service-modal-body" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="service-name">
                Name <span className="required">*</span>
              </label>
              <input
                id="service-name"
                type="text"
                placeholder="e.g. Wash, Dry & Fold"
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="service-category">Category</label>
                <input
                  id="service-category"
                  type="text"
                  placeholder="e.g. wash"
                  value={form.category}
                  onChange={handleChange('category')}
                />
              </div>

              <div className="form-field">
                <label htmlFor="service-status">Status</label>
                <select
                  id="service-status"
                  className="modal-select"
                  value={form.status}
                  onChange={handleChange('status')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="service-description">Description</label>
              <textarea
                id="service-description"
                rows="4"
                placeholder="Describe the specific cleaning process..."
                value={form.description}
                onChange={handleChange('description')}
              />
            </div>

            {error && <p className="staff-modal-error">{error}</p>}

            <div className="modal-footer">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="modal-submit-btn" disabled={submitting}>
                {submitting
                  ? 'Saving…'
                  : isCreate
                  ? 'Create Service'
                  : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ServiceModal;
