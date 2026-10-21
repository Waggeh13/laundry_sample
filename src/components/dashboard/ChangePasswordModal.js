import { useEffect, useMemo, useState } from 'react';
import './ServiceModal.css';
import './ChangePasswordModal.css';

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const requirements = [
  { id: 'length', label: 'At least 8 characters long', test: (value) => value.length >= 8 },
  {
    id: 'uppercase',
    label: 'Contains at least one uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'Contains at least one lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  { id: 'number', label: 'Contains at least one number', test: (value) => /\d/.test(value) },
];

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.41 14.59L6.7 12.7l1.41-1.42L10.59 14l5.3-5.29 1.41 1.41-6.7 6.7z" />
    </svg>
  );
}

function IconCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" />
    </svg>
  );
}

function IconEye({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A10.94 10.94 0 0112 5c7 0 10 7 10 7a13.16 13.16 0 01-1.67 2.68"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.61 6.61A13.52 13.52 0 002 12s3 7 10 7a9.74 9.74 0 005.39-1.61"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PasswordField({ id, label, placeholder, value, visible, onChange, onToggleVisibility }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={onToggleVisibility}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <IconEye visible={visible} />
        </button>
      </div>
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [visibility, setVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setVisibility({ current: false, new: false, confirm: false });
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

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

  const requirementStatus = useMemo(
    () => requirements.map((rule) => ({ ...rule, met: rule.test(form.newPassword) })),
    [form.newPassword]
  );

  const allRequirementsMet = requirementStatus.every((rule) => rule.met);
  const passwordsMatch = form.newPassword === form.confirmPassword && form.confirmPassword !== '';

  if (!isOpen) {
    return null;
  }

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const toggleVisibility = (field) => {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!allRequirementsMet || !passwordsMatch) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit?.(form);
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to change your password. Please try again.');
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
        className="service-modal change-password-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="change-password-title" className="modal-title">
              Change Password
            </h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="service-modal-body change-password-body" onSubmit={handleSubmit}>
          <PasswordField
            id="current-password"
            label="Current Password"
            placeholder="Enter current password"
            value={form.currentPassword}
            visible={visibility.current}
            onChange={handleChange('currentPassword')}
            onToggleVisibility={() => toggleVisibility('current')}
          />

          <PasswordField
            id="new-password"
            label="New Password"
            placeholder="Enter new password"
            value={form.newPassword}
            visible={visibility.new}
            onChange={handleChange('newPassword')}
            onToggleVisibility={() => toggleVisibility('new')}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            placeholder="Confirm new password"
            value={form.confirmPassword}
            visible={visibility.confirm}
            onChange={handleChange('confirmPassword')}
            onToggleVisibility={() => toggleVisibility('confirm')}
          />

          <div className="password-requirements-box">
            <div className="password-requirements-header">
              <IconInfo />
              <span>Password Requirements</span>
            </div>
            <ul className="password-requirements-list">
              {requirementStatus.map((rule) => (
                <li
                  key={rule.id}
                  className={`password-requirement${rule.met ? ' met' : ''}`}
                >
                  <span className="password-requirement-icon" aria-hidden="true">
                    {rule.met ? <IconCheck /> : <IconCircle />}
                  </span>
                  <span>{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {error && <p className="staff-modal-error">{error}</p>}

          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={
                submitting ||
                !allRequirementsMet ||
                !passwordsMatch ||
                !form.currentPassword
              }
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
