import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  resolvePostLoginPath,
  storePostLoginNext,
} from '../auth/authData';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import './Login.css';

function WelcomeMagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { welcomeLogin } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | error
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    let active = true;
    const token = (searchParams.get('token') || '').trim();
    const next = searchParams.get('next') || '';

    if (!token) {
      setStatus('error');
      setMessage('This login link is missing a token. Please use the link from your SMS, or log in with your username and password.');
      return undefined;
    }

    (async () => {
      try {
        const user = await welcomeLogin(token);
        if (!active) return;

        if (user.requiresPasswordChange) {
          storePostLoginNext(next);
          navigate('/change-password', { replace: true });
          return;
        }

        navigate(resolvePostLoginPath(next, user.role), { replace: true });
      } catch (err) {
        if (!active) return;
        setStatus('error');
        if (err?.code === 'INVALID_TOKEN' || err?.status === 401) {
          setMessage(
            'This login link has expired or is no longer valid. Please log in with your username and temporary password from the SMS.'
          );
        } else if (err?.code === 'RATE_LIMIT_EXCEEDED' || err?.status === 429) {
          setMessage('Too many attempts. Please wait a few minutes and try again.');
        } else {
          setMessage(err?.message || 'Unable to sign you in from this link.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, welcomeLogin, navigate]);

  return (
    <div className="login-page">
      <div className="login-card welcome-login-card">
        <div className="login-form-panel welcome-login-panel">
          <div className="login-form-header">
            <Logo />
          </div>
          <div className="login-content">
            <h1 className="login-title">
              {status === 'error' ? 'Link unavailable' : 'Welcome'}
            </h1>
            <p className="login-description">{message}</p>
            {status === 'error' ? (
              <Link to="/" className="login-button welcome-login-link">
                Go to Login
              </Link>
            ) : (
              <p className="welcome-login-status">Please wait…</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeMagicLogin;
