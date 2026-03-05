import React, { useState, useMemo, useEffect } from "react";
import { Eye, Trash2, CalendarIcon, FileText } from "lucide-react";
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
  SelectSeparator,
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
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { useParams, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { DeleteModel } from "@/components/DeleteModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";

const Orders = () => {
  const queryClient = useQueryClient();
  const { page: pageParam } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [dateRange, setDateRange] = useState(undefined);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "sales", currentPage, effectiveItemsPerPage, searchTerm, startDate, endDate],
    queryFn: async () => {
      const res = await api.get("/sales/getall", {
        params: {
          page: currentPage,
          limit: effectiveItemsPerPage,
          search: searchTerm,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: viewOrderDetail, isLoading: viewOrderLoading } = useQuery({
    queryKey: ["order", selectedOrder?._id],
    queryFn: async () => {
      const res = await api.get(`/sales/getone/${selectedOrder._id}`);
      return res.data;
    },
    enabled: !!viewOpen && !!selectedOrder?._id,
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

  useEffect(() => {
    const pageNumber = parseInt(pageParam || "1", 10);
    const normalized = Number.isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    setCurrentPage((prev) => (prev === normalized ? prev : normalized));
  }, [pageParam]);

  const setPageAndNavigate = (nextPage) => {
    const normalized = Math.max(1, nextPage);
    setCurrentPage(normalized);
    if (normalized <= 1) {
      navigate("/orders", { replace: true });
    } else {
      navigate(`/orders/page/${normalized}`, { replace: true });
    }
  };

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
            <div className="flex items-center justify-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View order</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Invoice</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(order._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete order</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
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
                setPageAndNavigate(1);
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
              value={customItemsPerPage !== "" ? "custom" : (effectiveItemsPerPage <= 100 && [10, 20, 50, 100].includes(effectiveItemsPerPage) ? String(effectiveItemsPerPage) : "10")}
              onValueChange={(v) => {
                if (v === "custom") return;
                setItemsPerPage(Number(v));
                setCustomItemsPerPage("");
                setPageAndNavigate(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent
                className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]"
              >
                <SelectGroup>
                  <SelectLabel>Rows per page</SelectLabel>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                  <SelectItem value="custom" disabled>
                    Custom{customItemsPerPage ? ` (${effectiveItemsPerPage})` : ""}
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <div className="px-2 py-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Custom</p>
                  <CustomRowsPerPageInput
                    type="number"
                    min={1}
                    max={500}
                    placeholder="e.g. 25"
                    className="h-8 w-full text-sm"
                    value={customItemsPerPage}
                    onChange={setCustomItemsPerPage}
                    autoFocus
                  />
                </div>
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
                <DataTable columns={orderColumns} data={filteredOrders} pageSize={effectiveItemsPerPage} />
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPageAndNavigate(currentPage - 1);
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
                            setPageAndNavigate(i + 1);
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
                          setPageAndNavigate(currentPage + 1);
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
        <DialogContent className="max-w-4xl! max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order — {selectedOrder?.invoiceNo}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
            {viewOrderLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-10 h-10 border-4 border-blue-500 border-dashed rounded-full animate-spin rounded-full" />
              </div>
            ) : (
              <>
                {/* Top Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Order Info */}
                  <div className="lg:col-span-2 bg-white border border-gray-300 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-lg font-semibold border-b border-gray-300 pb-2">Order Details</h3>
          
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <p className="text-gray-500">Invoice</p>
                      <p className="font-medium">{selectedOrder?.invoiceNo}</p>
          
                      <p className="text-gray-500">Payment Method</p>
                      <p>{viewOrderDetail?.paymentMethod ?? selectedOrder.paymentMethod ?? "—"}</p>
          
                      <p className="text-gray-500">Sell At</p>
                      <p>{viewOrderDetail?.sellat ?? viewOrderDetail?.sellAt ?? selectedOrder.sellAt ?? selectedOrder.sellat ?? "—"}</p>
          
                      <p className="text-gray-500">Status</p>
                      <p className="capitalize">{viewOrderDetail?.status ?? selectedOrder.status ?? "—"}</p>
          
                      <p className="text-gray-500">Date</p>
                      <p>
                        {viewOrderDetail?.createdAt ?? selectedOrder.createdAt
                          ? new Date(viewOrderDetail?.createdAt ?? selectedOrder.createdAt).toLocaleString()
                          : "—"}
                      </p>
          
                      {viewOrderDetail?.employee && (
                        <>
                          <p className="text-gray-500">Sold By</p>
                          <p>{viewOrderDetail.employee?.name ?? "—"}</p>
                        </>
                      )}
                    </div>
          
                    {viewOrderDetail?.salesnote && (
                      <div className="pt-3 border-t border-gray-300">
                        <p className="text-gray-500 text-sm mb-1">Sales Note</p>
                        <p className="text-sm">{viewOrderDetail.salesnote}</p>
                      </div>
                    )}
                  </div>
          
                  {/* Customer Info */}
                  <div className="bg-white border border-gray-300 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="text-lg font-semibold border-b border-gray-300 pb-2">Customer</h3>
          
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Name</p>
                        <p className="font-medium">
                          {(viewOrderDetail?.customer ?? selectedOrder.customer)?.name ?? "—"}
                        </p>
                      </div>
          
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p>
                          {(viewOrderDetail?.customer ?? selectedOrder.customer)?.phone ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
          
                {/* Items Table */}
                <div className="bg-white border rounded-md border-gray-300">
                  <div className="p-4 border-b border-gray-300">
                    <h3 className="text-lg font-semibold">Order Items</h3>
                  </div>
          
                  <div className="overflow-x-auto">
                    <Table className="px-8">
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-gray-50 px-4!">
                          <TableHead>#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="px-4!">
                        {((viewOrderDetail?.items ?? selectedOrder.items) || []).map((it, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{it.product?.title ?? "Deleted product"}</TableCell>
                            <TableCell className="text-right">{it.quantity}</TableCell>
                            <TableCell className="text-right">
                              AED {Number(it.price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              AED {Number(it.total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
          
                {/* Totals Section */}
                <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
                  <div className="max-w-sm ml-auto space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sub Total</span>
                      <span>AED {Number(viewOrderDetail?.subTotal ?? selectedOrder.subTotal ?? 0).toFixed(2)}</span>
                    </div>
          
                    <div className="flex justify-between">
                      <span className="text-gray-500">VAT</span>
                      <span>AED {Number(viewOrderDetail?.vat ?? selectedOrder.vat ?? 0).toFixed(2)}</span>
                    </div>
          
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping</span>
                      <span>AED {Number(viewOrderDetail?.shipping ?? selectedOrder.shipping ?? 0).toFixed(2)}</span>
                    </div>
          
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount</span>
                      <span>AED {Number(viewOrderDetail?.discount ?? selectedOrder.discount ?? 0).toFixed(2)}</span>
                    </div>
          
                    <div className="flex justify-between border-t border-gray-300 pt-3 text-base font-semibold">
                      <span>Grand Total</span>
                      <span>
                        AED {Number(viewOrderDetail?.grandTotal ?? selectedOrder.grandTotal ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteModel
        title="Delete order?"
        description="This action cannot be undone. This will permanently delete the selected order."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDeleteConfirmed}
        loading={loading}
      />
    </div>
  );
};

export default Orders;
