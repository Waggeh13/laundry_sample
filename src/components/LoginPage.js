import { useState } from 'react';
import Logo from './Logo';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-image-panel">
          <img
            src={`${process.env.PUBLIC_URL}/laundry-hero.png`}
            alt="Industrial laundry machines"
            className="login-hero-image"
          />
          <div className="login-image-overlay" />
        </div>

        <div className="login-form-panel">
          <Logo />

          <div className="login-content">
            <h1 className="login-title">Login</h1>
            <p className="login-description">
              Log in to access your laundry services, track pickups, and manage
              your orders easily.
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
