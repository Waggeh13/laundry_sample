import { Navigate } from 'react-router-dom';
import { ROLES } from '../auth/authData';
import { useAuth } from '../context/AuthContext';

function CustomerRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.requiresPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (user.role !== ROLES.CUSTOMER) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default CustomerRoute;
