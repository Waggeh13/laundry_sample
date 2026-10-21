import { Navigate } from 'react-router-dom';
import { canAccessStaff } from '../auth/authData';
import { useAuth } from '../context/AuthContext';

function StaffRoute({ children }) {
  const { user } = useAuth();

  if (!canAccessStaff(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default StaffRoute;
