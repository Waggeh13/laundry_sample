import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import './CustomerLayout.css';

function CustomerLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <div className="customer-layout">
      <header className="customer-topbar">
        <div className="customer-topbar-left">
          <Logo className="customer-logo" />
        </div>

        <nav className="customer-nav">
          <NavLink
            to="/customer/dashboard"
            className={({ isActive }) =>
              `customer-nav-link${isActive ? ' active' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/customer/orders"
            className={({ isActive }) =>
              `customer-nav-link${isActive ? ' active' : ''}`
            }
          >
            All Orders
          </NavLink>
          <NavLink
            to="/customer/profile"
            className={({ isActive }) =>
              `customer-nav-link${isActive ? ' active' : ''}`
            }
          >
            Profile
          </NavLink>
        </nav>

        <div className="customer-user-menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="customer-user-menu"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <span className="customer-user-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </span>
            <span className="customer-user-name">{user?.name || user?.email || 'Username'}</span>
            <svg
              className="customer-user-chevron"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="customer-user-dropdown">
              <button
                type="button"
                className="customer-user-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/customer/profile');
                }}
              >
                My Profile
              </button>
              <button type="button" className="customer-user-dropdown-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="customer-content">{children}</main>
    </div>
  );
}

export default CustomerLayout;
