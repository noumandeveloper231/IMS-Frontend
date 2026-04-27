import { createContext, useState, useEffect } from "react";
import api from "../utils/api";
import { useContext } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const normalizeUser = (incomingUser, previousUser = null) => {
    const u = incomingUser?.user || incomingUser;
    if (!u) return null;

    return {
      ...(previousUser || {}),
      ...u,
      permissions: Array.isArray(u.permissions)
        ? u.permissions
        : Array.isArray(previousUser?.permissions)
          ? previousUser.permissions
          : [],
    };
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser((prev) => normalizeUser(data, prev));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => normalizeUser(updatedUser, prev));
  };

  const loadUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser((prev) => normalizeUser(data, prev));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
