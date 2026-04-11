import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchPromiseRef = useRef(null); // Track pending fetch

  const fetchUser = async () => {
    // If fetch is already in progress, return the same promise
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
        return res.data;
      } catch {
        setUser(null);
        return null;
      } finally {
        setLoading(false);
        fetchPromiseRef.current = null; // Clear after done
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  };

  const logout = async () => {
    try {
      const res = await api.post("/auth/logout");

      if (res.status === 200) {
        setUser(null);
        fetchPromiseRef.current = null; // Reset để có thể fetch lại
        //localStorage.clear()
        return { success: true, message: "Đăng xuất thành công!" };
      } else {
        return { success: false, message: "Có lỗi xảy ra khi đăng xuất" };
      }
    } catch {
      console.error("Logout error:", err);
      return { success: false, message: "Không thể kết nối đến server" };
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
