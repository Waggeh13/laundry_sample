import { Navigate } from 'react-router-dom';
import { ROLES, getHomeRoute } from '../auth/authData';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.requiresPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (user.role === ROLES.CUSTOMER) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return children;
}

export default AdminRoute;
