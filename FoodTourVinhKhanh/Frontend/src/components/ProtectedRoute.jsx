import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  // ⏳ đang check login
  if (loading) return <div>Loading...</div>;

  // ❌ chưa login
  if (!user) return <Navigate to="/login" />;

  // ❌ sai role
  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" />;
  }

  // ✅ hợp lệ
  return children;
};

export default ProtectedRoute;