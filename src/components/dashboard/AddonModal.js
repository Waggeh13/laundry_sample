import { useEffect, useState } from 'react';
import './ServiceModal.css';

const emptyForm = {
  name: '',
  category: 'Garments',
  sortOrder: '0',
  status: 'Active',
};

const CATEGORY_OPTIONS = [
  'Undergarments',
  'Bedding extras',
  'Garments',
  'Specialty',
  'General',
];

function addonToForm(addon) {
  if (!addon) return emptyForm;
  return {
    name: addon.name || '',
    category: addon.category || 'General',
    sortOrder: String(addon.sortOrder ?? 0),
    status: addon.isActive === false ? 'Inactive' : 'Active',
  };
}

function AddonModal({ isOpen, mode, addon, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (isOpen) {
      setForm(isCreate ? emptyForm : addonToForm(addon));
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, isCreate, addon]);

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
    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        category: form.category.trim() || 'General',
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.status === 'Active',
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to save this add-on.');
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
        className="service-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addon-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="addon-modal-title" className="modal-title">
              {isCreate ? 'Add Catalog Item' : 'Edit Catalog Item'}
            </h2>
            <p className="modal-subtitle">
              These names appear as optional rows on the order sheet.
            </p>
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

        <form className="service-modal-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field form-field-full">
              <label htmlFor="addon-name">
                Name<span className="required"> *</span>
              </label>
              <input
                id="addon-name"
                type="text"
                placeholder="e.g. GRADUATION GOWN"
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="addon-category">Category</label>
              <select
                id="addon-category"
                className="modal-select"
                value={form.category}
                onChange={handleChange('category')}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="addon-sort">Sort order</label>
              <input
                id="addon-sort"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={handleChange('sortOrder')}
              />
            </div>
          </div>

          {isEdit ? (
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="addon-status">Status</label>
                <select
                  id="addon-status"
                  className="modal-select"
                  value={form.status}
                  onChange={handleChange('status')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          ) : null}

          {error ? <p className="staff-modal-error">{error}</p> : null}

          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit-btn" disabled={submitting}>
              {submitting ? 'Saving…' : isCreate ? 'Create Add-on' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddonModal;
