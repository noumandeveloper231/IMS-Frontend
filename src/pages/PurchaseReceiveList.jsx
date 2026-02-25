import React, { useState } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";

const PurchaseReceiveList = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReceive, setSelectedReceive] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: receivesData, isLoading } = useQuery({
    queryKey: ["purchase-receives"],
    queryFn: async () => {
      const res = await api.get("/purchase-receives");
      return res.data ?? [];
    },
  });

  const receives = Array.isArray(receivesData) ? receivesData : [];

  const filteredReceives = receives.filter((rec) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (rec.receiveNo || "").toLowerCase().includes(searchLower) ||
      (rec.purchaseOrder?.orderNo || "").toLowerCase().includes(searchLower) ||
      (rec.vendor?.name || "").toLowerCase().includes(searchLower) ||
      (rec.vendor?.companyName || "").toLowerCase().includes(searchLower) ||
      (rec.items || []).some(
        (item) =>
          (item.product?.title || item.title || "")
            .toLowerCase()
            .includes(searchLower) ||
          (item.product?.sku || item.product?.asin || "").toLowerCase().includes(searchLower)
      );
    const matchesStatus =
      statusFilter === "all" ? true : rec.status === statusFilter;
    const receiveDate = new Date(rec.receiveDate || 0);
    const matchesDate =
      (!startDate || receiveDate >= new Date(startDate)) &&
      (!endDate || receiveDate <= new Date(endDate));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const openDetail = (rec) => {
    setSelectedReceive(rec);
    setDetailOpen(true);
  };

  const exportToExcel = () => {
    const data = filteredReceives.map((rec) => ({
      "Receive No": rec.receiveNo,
      "Purchase Order": rec.purchaseOrder?.orderNo,
      Vendor: `${rec.vendor?.name || ""} (${rec.vendor?.companyName || ""})`,
      "Receive Date": new Date(rec.receiveDate).toLocaleDateString(),
      Status: rec.status,
      "Total Amount": rec.totalAmount,
      Notes: rec.notes || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Receives");
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(fileData, `purchase_receives_${Date.now()}.xlsx`);
    toast.success("Excel exported ✅");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Purchase Receives Report", 14, 15);
    const tableColumn = [
      "Receive No",
      "Purchase Order",
      "Vendor",
      "Receive Date",
      "Status",
      "Total Amount",
    ];
    const tableRows = filteredReceives.map((rec) => [
      rec.receiveNo,
      rec.purchaseOrder?.orderNo || "-",
      `${rec.vendor?.name || ""} (${rec.vendor?.companyName || ""})`,
      new Date(rec.receiveDate).toLocaleDateString(),
      rec.status,
      `Rs ${rec.totalAmount}`,
    ]);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 116, 166] },
      didDrawPage: () => {
        doc.setFontSize(10);
        doc.text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          14,
          doc.internal.pageSize.height - 10
        );
      },
    });
    let finalY = doc.lastAutoTable.finalY + 10;
    filteredReceives.forEach((rec, index) => {
      doc.setFontSize(12);
      doc.text(`Receive No: ${rec.receiveNo}`, 14, finalY);
      const itemCols = [
        "Product",
        "SKU",
        "Ordered Qty",
        "Received Qty",
        "Price",
        "Total",
      ];
      const itemRows = (rec.items || []).map((item) => [
        item.product?.title || item.title || "N/A",
        item.product?.sku || item.product?.asin || "N/A",
        item.orderedQty ?? "",
        item.receivedQty,
        `Rs ${item.purchasePrice}`,
        `Rs ${item.total}`,
      ]);
      autoTable(doc, {
        head: [itemCols],
        body: itemRows,
        startY: finalY + 5,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [230, 126, 34] },
      });
      finalY = doc.lastAutoTable.finalY + 10;
      if (
        index !== filteredReceives.length - 1 &&
        finalY > doc.internal.pageSize.height - 40
      ) {
        doc.addPage();
        finalY = 20;
      }
    });
    doc.save(`purchase_receives_${Date.now()}.pdf`);
    toast.success("PDF exported ✅");
  };

  const items = selectedReceive?.items ?? [];
  const totalQty = items.reduce(
    (acc, item) => acc + (Number(item.receivedQty) || 0),
    0
  );
  const grandTotal = items.reduce(
    (acc, item) => acc + (Number(item.total) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900 border-b pb-2">
            All Purchase Receives
          </h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={exportToExcel}
            >
              Export Excel
            </Button>
            <Button
              variant="secondary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={exportToPDF}
            >
              Export PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-cente gap-4 mb-6">
          <Field className="flex-1 min-w-md">
            <FieldLabel>Search</FieldLabel>
            <Input
              type="text"
              placeholder="Search by Receive No, Vendor, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="partially">Partially</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Date From</FieldLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Date To</FieldLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
          </div>
        ) : filteredReceives.length === 0 ? (
          <p className="text-gray-500 py-6">No purchase receives found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receive No</TableHead>
                  <TableHead>Purchase Order</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Receive Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceives.map((rec) => (
                  <TableRow key={rec._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {rec.receiveNo}
                    </TableCell>
                    <TableCell>{rec.purchaseOrder?.orderNo}</TableCell>
                    <TableCell>
                      {rec.vendor?.name}
                      {rec.vendor?.companyName
                        ? ` (${rec.vendor.companyName})`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {new Date(rec.receiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded ${
                          rec.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      Rs {Number(rec.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(rec)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>{rec.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl border-b pb-2">
              Purchase Receive Details
            </DialogTitle>
          </DialogHeader>
          {selectedReceive && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700 mb-4">
                <p>
                  <strong className="text-gray-900">Vendor:</strong>{" "}
                  {selectedReceive.vendor?.name}
                  {selectedReceive.vendor?.companyName
                    ? ` (${selectedReceive.vendor.companyName})`
                    : ""}
                </p>
                <p>
                  <strong className="text-gray-900">Order No:</strong>{" "}
                  {selectedReceive.purchaseOrder?.orderNo}
                </p>
                <p>
                  <strong className="text-gray-900">Date:</strong>{" "}
                  {new Date(selectedReceive.receiveDate).toLocaleDateString()}
                </p>
                <p>
                  <strong className="text-gray-900">Status:</strong>{" "}
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      selectedReceive.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedReceive.status}
                  </span>
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-2">Items</h3>
              <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <TableHead>Product</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Purchase Price</TableHead>
                      <TableHead className="text-right">Sale Price</TableHead>
                      <TableHead className="text-right">Total (Rs)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item._id || idx}>
                        <TableCell className="font-medium">
                          {item.product?.title || item.title || "N/A"}
                        </TableCell>
                        <TableCell>
                          {item.product?.asin || item.product?.sku || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.receivedQty}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.purchasePrice || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(
                            item.salePrice ?? item.product?.salePrice ?? 0
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(item.total || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {items.length === 0 && (
                  <p className="p-4 text-center text-gray-500">
                    No items in this receive.
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex flex-col items-end space-y-1">
                <p className="font-semibold text-gray-800">
                  Total Quantity: {totalQty}
                </p>
                <p className="font-semibold text-gray-800">
                  Grand Total: Rs {grandTotal.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseReceiveList;
