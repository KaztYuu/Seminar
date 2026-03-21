import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  
  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:8000/auth/currentUser", {
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setUser(data);
      return data;
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser()
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);