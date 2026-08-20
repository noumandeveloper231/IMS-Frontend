import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { API_HOST } from "@/config/api";

const ScannerContext = createContext(null);

export function ScannerProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [lastScannedSku, setLastScannedSku] = useState("—");
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [connected, setConnected] = useState(false);
  const addToCartBySkuRef = useRef(null);

  useEffect(() => {
    const baseUrl = API_HOST || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
    const sock = io(baseUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));
    sock.on("scan", (data) => {
      const sku = data?.sku ?? "";
      setLastScannedSku(sku || "—");
      if (addToCartBySkuRef.current && sku) {
        try {
          addToCartBySkuRef.current(sku);
        } catch (e) {
          console.warn("Scanner addToCartBySku error:", e);
        }
      }
    });
    sock.on("session_expired", () => {
      setCurrentSessionId(null);
    });
    setSocket(sock);
    return () => {
      sock.removeAllListeners();
      sock.disconnect();
    };
  }, []);

  const joinSession = useCallback((sessionId) => {
    if (!socket || !sessionId) return;
    const id = String(sessionId).trim();
    socket.emit("join_scanner_room", id);
    setCurrentSessionId(id);
  }, [socket]);

  const leaveSession = useCallback(() => {
    if (socket && currentSessionId) {
      socket.leave(currentSessionId);
      setCurrentSessionId(null);
    }
  }, [socket, currentSessionId]);

  const registerAddToCartBySku = useCallback((callback) => {
    addToCartBySkuRef.current = callback;
    return () => { addToCartBySkuRef.current = null; };
  }, []);

  const value = {
    socket,
    connected,
    lastScannedSku,
    setLastScannedSku,
    currentSessionId,
    joinSession,
    leaveSession,
    registerAddToCartBySku,
  };

  return (
    <ScannerContext.Provider value={value}>
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const ctx = useContext(ScannerContext);
  if (!ctx) throw new Error("useScanner must be used within ScannerProvider");
  return ctx;
}
