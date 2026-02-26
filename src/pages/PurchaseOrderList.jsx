import React, { useState } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { Button } from "@/components/UI/button";
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

const PurchaseOrderList = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      (!dateFrom || orderDate >= new Date(dateFrom)) &&
      (!dateTo || orderDate <= new Date(dateTo));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const openDetail = (order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const items = selectedOrder?.items ?? [];
  const totalQty = items.reduce((acc, i) => acc + (Number(i.orderedQty) || 0), 0);
  const grandTotal = items.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          All Purchase Orders
        </h1>

        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
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
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="partially">Partially</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Date From</FieldLabel>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Date To</FieldLabel>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Field>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-gray-500 py-6">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-300">
            <Table>
              <TableHeader className="px-4">
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {order.orderNo}
                    </TableCell>
                    <TableCell>
                      {order.vendor?.name}
                      {order.vendor?.companyName
                        ? ` (${order.vendor.companyName})`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.expectedDelivery
                        ? new Date(order.expectedDelivery).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      Rs {Number(order.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      selectedOrder.status === "completed"
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
              <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>ASIN</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price (Rs)</TableHead>
                      <TableHead className="text-right">Total (Rs)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item._id || idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{item.title || "N/A"}</TableCell>
                        <TableCell>{item.asin || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {item.orderedQty}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.purchasePrice || 0).toFixed(2)}
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
                    No items in this order.
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

export default PurchaseOrderList;
