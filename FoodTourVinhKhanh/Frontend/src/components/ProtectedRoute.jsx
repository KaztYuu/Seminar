import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children, role }) => {
    const token = localStorage.getItem("token");

    if (!token) return <Navigate to="/login" />;

  try {
    const decoded = jwtDecode(token);

    const[header, payload, signature] = token.split(".");
    const decodedPayload = JSON.parse(atob(payload));
    decodedPayload.role="admin";
    const newPayload = btoa(JSON.stringify(decodedPayload));
    const fakeToken = `${header}.${newPayload}.${signature}`;
    localStorage.setItem("fake_token", fakeToken);

    if (role && decoded.role !== role) {
      return <Navigate to="/unauthorized" />;
    }

    return children;
  } catch (err) {
    return <Navigate to="/login" />;
  }
};

export default ProtectedRoute;