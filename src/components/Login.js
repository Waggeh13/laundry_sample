import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomeRoute } from '../auth/authData';
import { fetchCsrfToken } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import EyeIcon from './EyeIcon';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Prime CSRF as soon as the login page loads.
  useEffect(() => {
    fetchCsrfToken().catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(username.trim(), password);
      if (user.requiresPasswordChange) {
        navigate('/change-password');
      } else {
        navigate(getHomeRoute(user.role));
      }
    } catch (err) {
      setError(err?.message || 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-image-panel">
          <img
            src={`${process.env.PUBLIC_URL}/images/laundry.jpg`}
            alt="Industrial laundry machines"
            className="login-image"
          />
          <div className="login-image-overlay" />
        </div>

        <div className="login-form-panel">
          <div className="login-form-header">
            <Logo />
          </div>

          <div className="login-content">
            <h1 className="login-title">Login</h1>
            <p className="login-description">
              Log in to access your laundry services, track pickups, and manage
              your orders easily.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="login-button"
                disabled={submitting}
              >
                {submitting ? 'Logging in…' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
