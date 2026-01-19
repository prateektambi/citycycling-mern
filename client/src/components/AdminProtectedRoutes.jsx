import { useLocation, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // 1. If not logged in, redirect to login but save the current location
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. If logged in but NOT an admin, redirect to a 'denied' or home page
  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default AdminProtectedRoute;