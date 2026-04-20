import React, { useState } from "react";
import api from "../utils/api";
import { Eye, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";
import { Calendar } from "@/components/UI/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { Button } from "@/components/UI/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import { DataTable } from "@/components/DataTable";
import { useImageModal } from "@/context/ImageModalContext";

const PurchaseOrderList = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState(undefined);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await api.get("/purchase-orders");
      return res.data ?? [];
    },
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  const filteredOrders = orders.filter((order) => {
    const orderNo = (order.orderNo || "").toLowerCase();
    const vendorName = (order.vendor?.name || "").toLowerCase();
    const matchesSearch =
      orderNo.includes(search.toLowerCase()) ||
      vendorName.includes(search.toLowerCase());
    const matchesStatus = status === "all" ? true : order.status === status;
    const orderDate = new Date(order.orderDate || 0);
    const matchesDate =
      (!startDate || orderDate >= new Date(startDate)) &&
      (!endDate || orderDate <= new Date(endDate + "T23:59:59.999"));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const openDetail = React.useCallback(async (order) => {
    try {
      const res = await api.get(`/purchase-orders/${order._id}`);
      setSelectedOrder(res.data ?? order);
    } catch {
      setSelectedOrder(order);
    }
    setDetailOpen(true);
  }, []);

  const items = selectedOrder?.items ?? [];
  const totalQty = items.reduce((acc, i) => acc + (Number(i.orderedQty) || 0), 0);
  const grandTotal = items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

  const orderColumns = React.useMemo(
    () => [
      {
        accessorKey: "orderNo",
        header: "Order No",
        meta: { label: "Order No" },
        cell: ({ row }) => (
          <span className="font-medium">{row.original.orderNo}</span>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        meta: { label: "Vendor" },
        cell: ({ row }) => {
          const vendor = row.original.vendor || {};
          return (
            <span>
              {vendor.name}
              {vendor.companyName ? ` (${vendor.companyName})` : ""}
            </span>
          );
        },
      },
      {
        id: "orderDate",
        header: "Order Date",
        meta: { label: "Order Date" },
        cell: ({ row }) =>
          row.original.orderDate
            ? new Date(row.original.orderDate).toLocaleDateString()
            : "-",
      },
      {
        id: "expectedDelivery",
        header: "Expected Delivery",
        meta: { label: "Expected Delivery" },
        cell: ({ row }) =>
          row.original.expectedDelivery
            ? new Date(row.original.expectedDelivery).toLocaleDateString()
            : "-",
      },
      {
        id: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => {
          const status = row.original.status;
          const baseClasses = "inline-flex px-2 py-1 text-xs rounded ";
          const statusClasses =
            status === "completed"
              ? "bg-green-100 text-green-700"
              : status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700";

          return (
            <span className={`${baseClasses} capitalize ${statusClasses}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: "totalAmount",
        header: "Total Amount",
        meta: { label: "Total Amount" },
        cell: ({ row }) => (
          <span className="block text-center">
            Rs {Number(row.original.totalAmount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        meta: { label: "Action" },
        enableSorting: false,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetail(order)}
                      className="text-blue-600 hover:text-blue-800 h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View order details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [openDetail]
  );

  const { openImageModal } = useImageModal();

  const detailColumns = React.useMemo(
    () => [
      {
        id: "serial",
        header: "S.No",
        meta: { label: "S.No" },
        cell: ({ row }) => (
          <span className="font-medium">{row.index + 1}</span>
        ),
      },
      {
        id: "qrCode",
        header: "QR Code",
        meta: { label: "QR Code" },
        cell: ({ row }) => (
          <img onClick={() => openImageModal(row.original.product?.qrCode)} src={row.original.product?.qrCode || "N/A"} alt="QR Code" className="w-20 h-20" />
        ),
      },
      {
        accessorKey: "title",
        header: "Product",
        meta: { label: "Product" },
        cell: ({ row }) =>
          <div className="flex items-center gap-2 whitespace-nowrap min-w-[200px]">
            {
              row.original.product?.title ||
              row.original.product?.asin ||
              "N/A"
            }
          </div>
      },
      {
        id: "sku",
        header: "SKU",
        meta: { label: "SKU" },
        cell: ({ row }) =>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {
              row.original.product?.sku ||
              row.original.product?.asin ||
              "N/A"
            }
          </div>
      },
      {
        id: "orderedQty",
        header: "Quantity",
        meta: { label: "Quantity" },
        cell: ({ row }) => (
          <span className="block text-center">
            {row.original.orderedQty}
          </span>
        ),
      },
      {
        id: "purchasePrice",
        header: "Price (Rs)",
        meta: { label: "Price (Rs)" },
        cell: ({ row }) => (
          <span className="block text-center">
            {Number(row.original.purchasePrice || 0).toFixed(2)}
          </span>
        ),
      },
      {
        id: "total",
        header: "Total (Rs)",
        meta: { label: "Total (Rs)" },
        cell: ({ row }) => (
          <span className="block text-center font-medium">
            {Number(row.original.total || 0).toFixed(2)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden h-full bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 border-b pb-4">
          All Purchase Orders
        </h1>

        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <Field>
            <FieldLabel>Search</FieldLabel>
            <Input
              type="text"
              placeholder="Order No / Vendor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-60"
            />
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="item-aligned">
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="partially">Partially</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Date range</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[260px] justify-start px-2.5 font-normal text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} – {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </Field>
        </div>

        {!isLoading && filteredOrders.length === 0 ? (
          <p className="text-gray-500 py-6">No purchase orders found.</p>
        ) : (
          <DataTable
            columns={orderColumns}
            data={filteredOrders}
            isLoading={isLoading}
            addPagination={false}
            enableSelection={false}
            containerClassName="overflow-x-auto rounded-md border border-gray-300"
          />
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl border-b border-gray-300 pb-2">
              Purchase Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700 mb-4">
                <p>
                  <strong className="text-gray-900">Vendor:</strong>{" "}
                  {selectedOrder.vendor?.name}
                  {selectedOrder.vendor?.companyName
                    ? ` (${selectedOrder.vendor.companyName})`
                    : ""}
                </p>
                <p>
                  <strong className="text-gray-900">Order No:</strong>{" "}
                  {selectedOrder.orderNo}
                </p>
                <p>
                  <strong className="text-gray-900">Date:</strong>{" "}
                  {new Date(selectedOrder.orderDate).toLocaleDateString()}
                </p>
                <p>
                  <strong className="text-gray-900">Status:</strong>{" "}
                  <span
                    className={`capitalize inline-flex px-2 py-0.5 rounded text-xs font-medium ${selectedOrder.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : selectedOrder.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                      }`}
                  >
                    {selectedOrder.status}
                  </span>
                </p>
              </div>

              <h3 className="text-lg font-semibold mb-2">Order Items</h3>
              <DataTable
                columns={detailColumns}
                data={items}
                addPagination={false}
                enableSelection={false}
                enableHeaderContextMenu={false}
                containerClassName="overflow-y-auto max-h-[50vh] border border-gray-300 rounded-lg"
              />

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

export default PurchaseOrderList;
