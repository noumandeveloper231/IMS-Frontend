import React, { useState, useMemo } from "react";
import { Eye, Trash2, MoreVertical, CalendarIcon } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
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
import { DataTable } from "@/components/UI/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
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
  const [dateRange, setDateRange] = useState(undefined);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "sales", currentPage, itemsPerPage, searchTerm, startDate, endDate],
    queryFn: async () => {
      const res = await api.get("/sales/getall", {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
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

  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate) : null;
  if (endDateObj) {
    endDateObj.setHours(23, 59, 59, 999);
  }

  const filteredOrders = orders.filter((order) => {
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    const matchesStart = !startDateObj || (createdAt && createdAt >= startDateObj);
    const matchesEnd = !endDateObj || (createdAt && createdAt <= endDateObj);
    return matchesStart && matchesEnd;
  });

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
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (error?.response?.status === 409) {
        toast.error(
          messageFromServer ||
            "Cannot delete order because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Failed to delete order ❌");
      }
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
      const res = await api.get("/sales/getall", {
        params: {
          limit: 10000,
          search: searchTerm || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
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

  const orderColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "invoiceNo",
        header: "Invoice No",
        accessorKey: "invoiceNo",
        cell: ({ row }) => (
          <span className="font-medium text-blue-600">{row.original.invoiceNo}</span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customer",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">{row.original.customer?.name ?? "—"}</span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">{row.original.customer?.phone ?? "—"}</span>
        ),
      },
      {
        id: "grandTotal",
        header: "Grand Total",
        accessorKey: "grandTotal",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            AED {Number(row.original.grandTotal).toFixed(2)}
          </span>
        ),
      },
      {
        id: "paymentMethod",
        header: "Payment",
        accessorKey: "paymentMethod",
        cell: ({ row }) => {
          const pm = row.original.paymentMethod;
          const isCash = pm === "cash" || pm === "Cash";
          return (
            <span
              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${isCash ? "bg-green-100 text-green-800" : "bg-indigo-100 text-indigo-800"
                }`}
            >
              {pm ?? "—"}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        header: "Created At",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original;
          const invoiceUrl = `${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || ""}/api/sales/${order._id}/invoice`;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                  View
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                    Invoice
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => confirmDelete(order._id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        <div className="w-full flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-700">
            Orders List ({filteredOrders.length})
          </h2>
          <Button
            variant="default"
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700"
          >
            Export to Excel
          </Button>
        </div>
        <div className="w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex-3 w-full">
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="min-w-[200px]"
            />
          </div>
          <div className="flex-1 w-full md:w-auto">
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
                  onSelect={(range) => {
                    setDateRange(range);
                    setCurrentPage(1);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 w-full md:w-auto">
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent position="item-aligned">
                <SelectGroup>
                  <SelectLabel>Per page</SelectLabel>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <DataTable columns={orderColumns} data={filteredOrders} pageSize={itemsPerPage} />
              </div>
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
