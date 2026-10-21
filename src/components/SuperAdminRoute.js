import { Navigate } from 'react-router-dom';
import { canAccessReports } from '../auth/authData';
import { useAuth } from '../context/AuthContext';

function SuperAdminRoute({ children }) {
  const { user } = useAuth();

  if (!canAccessReports(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SuperAdminRoute;
