import { useState } from 'react';
import './ServiceModal.css';
import './StaffCredentialsModal.css';

function StaffCredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!credentials) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentials.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
        className="service-modal credentials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credentials-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="credentials-header">
          <div className="credentials-check" aria-hidden="true">
            ✓
          </div>
          <h2 id="credentials-title" className="credentials-title">
            {credentials.message || 'Admin created successfully'}
          </h2>
          <p className="credentials-subtitle">
            {credentials.subtitle ||
              'Share these credentials securely. The password is shown only once.'}
          </p>
        </div>

        <div className="credentials-body">
          <div className="credentials-field">
            <span className="credentials-label">Username</span>
            <span className="credentials-value">{credentials.username}</span>
          </div>

          <div className="credentials-field">
            <span className="credentials-label">Temporary Password</span>
            <div className="credentials-password-row">
              <code className="credentials-password">{credentials.password}</code>
              <button type="button" className="credentials-copy-btn" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {credentials.note && (
            <p className="credentials-note">{credentials.note}</p>
          )}
        </div>

        <div className="credentials-footer">
          <button type="button" className="modal-submit-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffCredentialsModal;
