import React, { useState, useEffect } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { DataTable } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/UI/tooltip";
import { useSearchParams } from "react-router-dom";

const PurchaseReceiveList = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReceive, setSelectedReceive] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedReceiveId, setHighlightedReceiveId] = useState(null);

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
          (item.product?.sku || item.product?.asin || "")
            .toLowerCase()
            .includes(searchLower),
      );
    const matchesStatus =
      statusFilter === "all" ? true : rec.status === statusFilter;
    const receiveDate = new Date(rec.receiveDate || 0);
    const matchesDate =
      (!startDate || receiveDate >= new Date(startDate)) &&
      (!endDate || receiveDate <= new Date(endDate));
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Handle highlight parameter from search
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && !isLoading && receives.length > 0) {
      const highlightedReceive = receives.find((r) => r._id === highlightId);
      if (highlightedReceive) {
        setHighlightedReceiveId(highlightedReceive._id);
        requestAnimationFrame(() => {
          const rowEl = document.querySelector(
            `[data-highlight-target="${highlightedReceive._id}"]`,
          );
          rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        // Clear the highlight parameter from URL
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("highlight");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [searchParams, isLoading, receives, setSearchParams]);

  useEffect(() => {
    if (!highlightedReceiveId) return;
    const timer = setTimeout(() => setHighlightedReceiveId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedReceiveId]);

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
          doc.internal.pageSize.height - 10,
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
    0,
  );
  const grandTotal = items.reduce(
    (acc, item) => acc + (Number(item.total) || 0),
    0,
  );

  const listColumns = React.useMemo(
    () => [
      {
        id: "receiveNo",
        header: "Receive No",
        meta: { label: "Receive No" },
        cell: ({ row }) => {
          const rec = row.original;
          return <span className="font-medium">{rec.receiveNo}</span>;
        },
      },
      {
        id: "purchaseOrder",
        header: "Purchase Order",
        meta: { label: "Purchase Order" },
        cell: ({ row }) => {
          const rec = row.original;
          return <span>{rec.purchaseOrder?.orderNo}</span>;
        },
      },
      {
        id: "vendor",
        header: "Vendor",
        meta: { label: "Vendor" },
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <span>
              {rec.vendor?.name}
              {rec.vendor?.companyName ? ` (${rec.vendor.companyName})` : ""}
            </span>
          );
        },
      },
      {
        id: "receiveDate",
        header: "Receive Date",
        meta: { label: "Receive Date" },
        cell: ({ row }) => {
          const rec = row.original;
          return <span>{new Date(rec.receiveDate).toLocaleDateString()}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => {
          const rec = row.original;
          const isCompleted = rec.status === "completed";
          return (
            <span
              className={`inline-flex px-2 py-1 text-xs rounded ${
                isCompleted
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {rec.status}
            </span>
          );
        },
      },
      {
        id: "totalAmount",
        header: "Total Amount",
        meta: { label: "Total Amount" },
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <span className="text-center block">
              Rs {Number(rec.totalAmount || 0).toLocaleString()}
            </span>
          );
        },
      },
      {
        id: "action",
        header: "Action",
        meta: { label: "Action" },
        cell: ({ row }) => {
          const rec = row.original;
          return (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedReceive(rec);
                  setDetailOpen(true);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Eye className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Button>
            </div>
          );
        },
      },
      {
        id: "notes",
        header: "Notes",
        meta: { label: "Notes" },
        cell: ({ row }) => {
          const rec = row.original;
          return <span>{rec.notes || "-"}</span>;
        },
      },
    ],
    [],
  );

  const itemColumns = React.useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        meta: { label: "Product" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="font-medium">
              {item.product?.title || item.title || "N/A"}
            </span>
          );
        },
      },
      {
        id: "asin",
        header: "ASIN",
        meta: { label: "ASIN" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span>{item.product?.asin || item.product?.sku || "N/A"}</span>
          );
        },
      },
      {
        id: "quantity",
        header: "Quantity",
        meta: { label: "Quantity" },
        cell: ({ row }) => {
          const item = row.original;
          return <span className="text-center block">{item.receivedQty}</span>;
        },
      },
      {
        id: "purchasePrice",
        header: "Purchase Price",
        meta: { label: "Purchase Price" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="text-center block">
              {Number(item.purchasePrice || 0).toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "salePrice",
        header: "Sale Price",
        meta: { label: "Sale Price" },
        cell: ({ row }) => {
          const item = row.original;
          const sale = item.salePrice ?? item.product?.salePrice ?? 0;
          return (
            <span className="text-center block">{Number(sale).toFixed(2)}</span>
          );
        },
      },
      {
        id: "total",
        header: "Total (Rs)",
        meta: { label: "Total (Rs)" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="text-center font-medium block">
              {Number(item.total || 0).toFixed(2)}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900 border-b border-gray-300 pb-2">
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
                <SelectGroup>
                  <SelectLabel>Select Status</SelectLabel>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="partially">Partially</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectGroup>
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

        <DataTable
          columns={listColumns}
          data={filteredReceives}
          isLoading={isLoading}
          addPagination={false}
          enableSelection={false}
          enableHeaderContextMenu={false}
          getRowProps={(row) => ({
            "data-highlight-target": row.original?._id,
            className:
              row.original?._id === highlightedReceiveId
                ? "search-highlight-row"
                : "",
          })}
          // containerClassName="overflow-x-auto rounded-lg border border-gray-300"
        />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl border-b border-gray-300 pb-2">
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
              {/* <div className="overflow-y-auto max-h-[50vh] border rounded-lg border-gray-300"> */}
              <DataTable
                columns={itemColumns}
                data={items}
                addPagination={false}
                enableSelection={false}
                enableHeaderContextMenu={false}
                containerClassName="flex flex-col overflow-hidden border rounded-lg border-gray-300 bg-background min-h-[200px] max-h-[320px]"
              />
              {/* </div> */}

              <div className="mt-4 pt-4 border-t border-gray-300 flex flex-col items-end space-y-1">
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
