import { NavLink, useNavigate } from 'react-router-dom';
import { canAccessReports, canAccessStaff } from '../../auth/authData';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';
import './Sidebar.css';

const iconBase = `${process.env.PUBLIC_URL}/images/sidebar`;

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: `${iconBase}/dashboard.png`,
  },
  {
    label: 'All Services',
    path: '/services',
    icon: `${iconBase}/services.png`,
  },
  {
    label: 'Add-ons',
    path: '/addons',
    icon: `${iconBase}/services.png`,
  },
  {
    label: 'All Orders',
    path: '/orders',
    icon: `${iconBase}/orders.png`,
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: `${iconBase}/orders.png`,
    superadminOnly: true,
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: `${iconBase}/dashboard.png`,
    superadminOnly: true,
  },
  {
    label: 'Mass SMS',
    path: '/notifications/mass',
    icon: `${iconBase}/clients.png`,
    staffManagerOnly: true,
  },
  {
    label: 'All Staff',
    path: '/staff',
    icon: `${iconBase}/staff.png`,
    staffManagerOnly: true,
  },
  {
    label: 'All Clients',
    path: '/clients',
    icon: `${iconBase}/clients.png`,
  },
  {
    label: 'My Profile',
    path: '/profile',
    icon: `${iconBase}/profile.png`,
  },
];

function Sidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const visibleNavItems = navItems.filter((item) => {
    if (item.superadminOnly && !canAccessReports(user)) return false;
    if (item.staffManagerOnly && !canAccessStaff(user)) return false;
    return true;
  });

  const handleNavigate = (path) => {
    onClose?.();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose?.();
    await logout();
    navigate('/');
  };

  return (
    <aside className={`sidebar${isOpen ? ' is-open' : ''}`}>
      <div className="sidebar-logo">
        <Logo className="sidebar-logo-img" />
      </div>

      <button
        type="button"
        className="create-order-btn"
        onClick={() => handleNavigate('/orders/new')}
      >
        Create Order
        <span className="create-order-icon">+</span>
      </button>

      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            onClick={() => onClose?.()}
          >
            <span
              className="sidebar-nav-icon"
              style={{
                WebkitMaskImage: `url(${item.icon})`,
                maskImage: `url(${item.icon})`,
              }}
              aria-hidden="true"
            />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
        <svg
          className="sidebar-logout-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
