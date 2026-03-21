import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;