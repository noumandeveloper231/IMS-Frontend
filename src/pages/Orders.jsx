import React, { useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/UI/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  } from "@/components/UI/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/UI/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";

const Orders = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "sales", currentPage, itemsPerPage, searchTerm],
    queryFn: async () => {
      const res = await api.get("/sales/getall", {
        params: { page: currentPage, limit: itemsPerPage, search: searchTerm },
      });
      return res.data;
    },
  });

  const orders = (() => {
    const raw = data?.data ?? data;
    return Array.isArray(raw) ? raw : [];
  })();
  const pagination = data?.pagination ?? { total: orders.length, pages: 1 };
  const totalPages = pagination.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/sales/delete/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Order deleted ✅");
      queryClient.invalidateQueries({ queryKey: ["orders", "sales"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete order ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewOpen(true);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/sales/getall", { params: { limit: 10000 } });
      const raw = res.data?.data ?? res.data;
      const allOrders = Array.isArray(raw) ? raw : [];
      const worksheet = XLSX.utils.json_to_sheet(allOrders);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
      XLSX.writeFile(workbook, "orders.xlsx");
      toast.success("Exported to Excel ✅");
    } catch (err) {
      toast.error("Failed to export ❌");
    }
  };

  const loading = isLoading || deleteMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Order Management
          </h1>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full"
              />
            </div>
            <Button variant="default" onClick={handleExport} className="bg-green-600 hover:bg-green-700">
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-700">Orders List</h2>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Per page</SelectLabel>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>#</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow key={order._id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-900">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {order.invoiceNo}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {order.customer?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {order.customer?.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          AED {Number(order.grandTotal).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              order.paymentMethod === "cash" || order.paymentMethod === "Cash"
                                ? "bg-green-100 text-green-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {order.paymentMethod ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleViewOrder(order)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(order._id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <a
                              href={`${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || ""}/api/sales/${order._id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600"
                            >
                              Invoice
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {orders.length === 0 && (
                <p className="text-gray-500 text-center py-6">No orders found</p>
              )}

              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.max(1, p - 1));
                        }}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.min(totalPages, p + 1));
                        }}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order — {selectedOrder?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Order Info</h3>
                  <p className="text-sm">Payment: {selectedOrder.paymentMethod}</p>
                  <p className="text-sm">Sell at: {selectedOrder.sellAt ?? selectedOrder.sellat ?? "—"}</p>
                  <p className="text-sm">Discount: AED {Number(selectedOrder.discount || 0).toFixed(2)}</p>
                  <p className="text-sm">Grand Total: AED {Number(selectedOrder.grandTotal).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Customer</h3>
                  <p className="text-sm">Name: {selectedOrder.customer?.name ?? "—"}</p>
                  <p className="text-sm">Phone: {selectedOrder.customer?.phone ?? "—"}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{it.product?.title ?? "N/A"}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell>AED {Number(it.price).toFixed(2)}</TableCell>
                        <TableCell>AED {Number(it.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} disabled={loading}>
              {loading ? "Deleting..." : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Orders;
