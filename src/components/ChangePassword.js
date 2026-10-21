import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getHomeRoute,
  resolvePostLoginPath,
  takePostLoginNext,
} from '../auth/authData';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import EyeIcon from './EyeIcon';
import './Login.css';
import './ChangePassword.css';

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibility, setVisibility] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleVisibility = (field) =>
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();

  const forced = Boolean(user?.requiresPasswordChange);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword, confirmPassword);
      const next = takePostLoginNext();
      navigate(resolvePostLoginPath(next, user?.role) || getHomeRoute(user?.role));
    } catch (err) {
      setError(err?.message || 'Unable to change password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-header">
          <Logo />
        </div>

        <h1 className="login-title">Change Password</h1>
        <p className="login-description">
          {forced
            ? 'For your security, please set a new password before continuing.'
            : 'Update your account password below.'}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="old-password">Current Password</label>
            <div className="password-input-wrap">
              <input
                id="old-password"
                type={visibility.old ? 'text' : 'password'}
                placeholder="Enter your current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => toggleVisibility('old')}
                aria-label={visibility.old ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon visible={visibility.old} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="password-input-wrap">
              <input
                id="new-password"
                type={visibility.new ? 'text' : 'password'}
                placeholder="Enter a new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => toggleVisibility('new')}
                aria-label={visibility.new ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon visible={visibility.new} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <div className="password-input-wrap">
              <input
                id="confirm-password"
                type={visibility.confirm ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => toggleVisibility('confirm')}
                aria-label={visibility.confirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon visible={visibility.confirm} />
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={submitting}>
            {submitting ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
