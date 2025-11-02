import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children, requireCreator = false }) {
  const { isAuthenticated, isCreator, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireCreator && !isCreator) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}