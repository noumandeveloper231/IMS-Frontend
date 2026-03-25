import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { AuthContext } from "./AuthContext";

export const SettingsContext = createContext({
  settings: {},
  loading: false,
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get("/settings/get");
      setSettings(res.data?.settings ?? {});
    } catch (err) {
      console.error("Failed to load settings", err);
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
    }),
    [settings, loading, refreshSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

