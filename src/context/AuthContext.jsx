import { createContext, useState, useEffect } from "react";
import api from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    const u = data.user || data;
    setUser(u ? { ...u, permissions: Array.isArray(u.permissions) ? u.permissions : [] } : null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const loadUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      const u = data.user || data;
      setUser(u ? { ...u, permissions: Array.isArray(u.permissions) ? u.permissions : [] } : null);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
