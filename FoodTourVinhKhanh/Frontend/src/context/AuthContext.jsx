import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  
  const fetchUser = async () => {
    
    try {
      const res = await api.get("/auth/currentUser");

      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

const logout = async () => {
  try {
    const res = await api.post("/auth/logout");
    
    if (res.status === 200) {
      setUser(null);
      return { success: true, message: "Đăng xuất thành công!" };
    } else {
      return { success: false, message: "Có lỗi xảy ra khi đăng xuất" };
    }
  } catch (err) {
    console.error("Logout error:", err);
    return { success: false, message: "Không thể kết nối đến server" };
  }
};

  useEffect(() => {
    fetchUser()
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);