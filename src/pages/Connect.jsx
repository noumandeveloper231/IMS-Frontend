import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Html5Qrcode } from "html5-qrcode";
import { API_HOST } from "@/config/api";

const Connect = () => {
  const { sessionId } = useParams();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const socketRef = useRef(null);
  const scannerRef = useRef(null);
  const scannerDivId = "mobile-scanner-mount";

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session ID");
      setStatus("error");
      return;
    }

    // On mobile (or when opened via LAN IP), localhost points to the phone – use same host as this page so we reach the PC running the backend
    let baseUrl = API_HOST || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
      if (!isLocalhost && (!API_HOST || API_HOST.includes("localhost") || API_HOST.includes("127.0.0.1"))) {
        baseUrl = `${window.location.protocol}//${hostname}:8000`;
      }
    }

    const sock = io(baseUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    sock.on("connect", () => {
      sock.emit("join_scanner_room", sessionId.trim());
      setStatus("ready");
    });
    sock.on("connect_error", (err) => {
      console.warn("Socket connect_error", err?.message);
      setError(
        "Could not connect to the server. On mobile: (1) Use the same Wi‑Fi as the computer running the POS. (2) Open this app using the computer's IP in the browser (e.g. http://COMPUTER_IP:5173), not localhost. (3) Ensure the backend is running on that computer. (4) If it still fails, add that URL to the backend CORS_ORIGINS env (e.g. http://COMPUTER_IP:5173)."
      );
      setStatus("error");
    });
    sock.on("session_expired", () => {
      setError("Session expired");
      setStatus("error");
    });

    socketRef.current = sock;
    return () => {
      sock.removeAllListeners();
      sock.disconnect();
    };
  }, [sessionId]);

  // Start camera only after user tap (required on mobile – permission must be in response to user gesture)
  const handleStartCamera = () => {
    if (status !== "ready" || cameraStarted || cameraStarting) return;

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Camera requires a secure connection (HTTPS). On mobile, open this page using https:// (e.g. a tunnel like ngrok), or test on the same computer at http://localhost:5173."
      );
      setStatus("error");
      return;
    }

    setCameraStarting(true);
    const scanner = new Html5Qrcode(scannerDivId);
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 150 },
      aspectRatio: 1,
    };
    const cameraConfig = { facingMode: "environment" };

    scanner
      .start(cameraConfig, config, (decodedText) => {
        setLastScanned(decodedText);
        socketRef.current?.emit("scan", { sku: decodedText });
      }, () => {})
      .then(() => {
        setCameraStarted(true);
        setCameraStarting(false);
      })
      .catch((err) => {
        setCameraStarting(false);
        const msg = err?.message || "Camera access failed";
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setError(
            "Camera requires HTTPS on this device. Use https:// to open this page (e.g. ngrok or similar), or use the scanner on the same computer at http://localhost:5173."
          );
        } else {
          setError(
            msg +
              " Make sure you allowed camera access when prompted. If you blocked it, enable it in the browser site settings and refresh."
          );
        }
        setStatus("error");
      });
  };

  useEffect(() => {
    if (!cameraStarted) return;
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [cameraStarted]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Close this page and scan the QR code again from the POS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <header className="p-4 text-center border-b border-gray-700">
        <h1 className="text-lg font-semibold">POS Scanner</h1>
        <p className="text-sm text-gray-400">
          {cameraStarted ? "Point at a barcode to scan" : "Tap the button below to start the camera"}
        </p>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          id={scannerDivId}
          className="w-full max-w-md rounded-xl overflow-hidden bg-black"
          style={{ minHeight: cameraStarted ? 280 : 200 }}
        />
        {!cameraStarted ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-md mt-4">
            <button
              type="button"
              onClick={handleStartCamera}
              disabled={status !== "ready" || cameraStarting}
              className="w-full py-4 px-6 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white transition-colors"
            >
              {cameraStarting ? "Starting camera…" : "Allow camera access"}
            </button>
            <p className="text-xs text-gray-500 text-center">
              You’ll be asked to allow camera access. Tap Allow so the scanner can work.
            </p>
          </div>
        ) : (
          lastScanned && (
            <p className="mt-4 text-green-400 font-mono text-sm">Sent: {lastScanned}</p>
          )
        )}
      </div>
    </div>
  );
};

export default Connect;
