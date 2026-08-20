import React, { useState, useCallback } from "react";
import {
  Smartphone,
  Usb,
  Wifi,
  WifiOff,
  QrCode,
  Unplug,
  Barcode,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/UI/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/UI/card";
import { useScanner } from "@/context/ScannerContext";

const DEVICE_TYPES = {
  mobile: { icon: Smartphone, label: "Mobile Scanner" },
  usb: { icon: Usb, label: "USB Scanner" },
};

/** Generate a short session ID for pairing (e.g. for QR link). */
function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

const ConnectedDevices = () => {
  const { lastScannedSku, joinSession, leaveSession, connected } = useScanner();
  const [devices, setDevices] = useState([]);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairSessionId, setPairSessionId] = useState("");

  const pairUrl = pairSessionId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/connect/${pairSessionId}`
    : "";

  const openPairDialog = useCallback(() => {
    const id = generateSessionId();
    setPairSessionId(id);
    joinSession(id);
    setPairDialogOpen(true);
  }, [joinSession]);

  const closePairDialog = useCallback(() => {
    leaveSession();
    setPairDialogOpen(false);
    setPairSessionId("");
  }, [leaveSession]);

  const handleDisconnect = useCallback((deviceId) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    toast.success("Device disconnected");
  }, []);

  const handlePairConfirm = useCallback(() => {
    const name = `Mobile Scanner ${devices.filter((d) => d.type === "mobile").length + 1}`;
    setDevices((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        type: "mobile",
        lastSku: lastScannedSku && lastScannedSku !== "—" ? lastScannedSku : "—",
      },
    ]);
    toast.success("Device paired. Scans from your phone will appear here.");
    closePairDialog();
  }, [devices, closePairDialog, lastScannedSku]);

  // When a real scan arrives from the socket, update last SKU for all mobile devices (real-time)
  React.useEffect(() => {
    if (!lastScannedSku || lastScannedSku === "—") return;
    setDevices((prev) =>
      prev.map((d) =>
        d.type === "mobile" ? { ...d, lastSku: lastScannedSku } : d
      )
    );
  }, [lastScannedSku]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Connected Devices</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage barcode scanners and mobile devices linked to your POS.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Last scanned SKU */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Barcode className="h-4 w-4" />
              Last scanned SKU
            </CardTitle>
            <CardDescription>Most recent barcode scan from any connected device</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-medium text-gray-900">{lastScannedSku}</p>
            {connected && (
              <p className="text-xs text-green-600 mt-1">Scanner connected</p>
            )}
          </CardContent>
        </Card>

        {/* Paired devices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Paired devices</CardTitle>
              <CardDescription>USB scanners and mobile scanners linked to this session</CardDescription>
            </div>
            <Button onClick={openPairDialog} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Pair new device
            </Button>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No devices paired</p>
                <p className="text-sm mt-1">Pair a USB scanner or scan the QR code to add a mobile scanner.</p>
                <Button onClick={openPairDialog} variant="outline" className="mt-4 gap-2">
                  <QrCode className="h-4 w-4" />
                  Pair new device
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last scanned SKU</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const typeInfo = DEVICE_TYPES[device.type] || {
                      icon: Smartphone,
                      label: "Scanner",
                    };
                    const Icon = typeInfo.icon;
                    // Real-time status: mobile devices are "connected" when socket is connected
                    const isConnected =
                      device.type === "usb" ? true : connected;
                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex justify-center">
                            <Icon className="h-5 w-5 text-gray-600" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>{typeInfo.label}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isConnected
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isConnected ? (
                              <>
                                <Wifi className="h-3 w-3" />
                                Connected
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-3 w-3" />
                                Offline
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{device.lastSku}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                            onClick={() => handleDisconnect(device.id)}
                          >
                            <Unplug className="h-4 w-4" />
                            Disconnect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pair new device – QR code dialog */}
      <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pair mobile scanner
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your phone to open the scanner page. Your scans will appear on this POS.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {pairUrl ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${pairUrl}`}
                alt="Pairing QR code"
                className="rounded-lg border border-gray-200"
              />
            ) : null}
            <p className="text-xs text-gray-500 font-mono break-all text-center max-w-[280px]">
              {pairUrl || "Generating…"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePairDialog}>
              Cancel
            </Button>
            <Button onClick={handlePairConfirm}>
              I’ve scanned – add device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectedDevices;
