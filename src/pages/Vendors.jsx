import React, { useState, useRef } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Edit, Trash2 } from "lucide-react";

const Vendors = () => {
  const queryClient = useQueryClient();
  const nameInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    openingBalance: 0,
    notes: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors/getall");
      return res.data ?? [];
    },
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/vendors/create", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Vendor added ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/vendors/update/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Vendor updated ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/vendors/delete/${id}`);
    },
    onSuccess: () => {
      toast.success("Vendor deleted ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete vendor ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.phone?.trim()) {
      toast.error("Name & Phone required!");
      return;
    }
    if (form.email?.trim()) {
      const existing = vendors.find(
        (v) =>
          v.email?.toLowerCase() === form.email.trim().toLowerCase() &&
          v._id !== editingId
      );
      if (existing) {
        toast.error("A vendor with this email already exists.");
        return;
      }
    }

    const payload = {
      ...form,
      openingBalance: Number(form.openingBalance) || 0,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (vendor) => {
    setForm({
      name: vendor.name || "",
      companyName: vendor.companyName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || "",
      openingBalance: vendor.openingBalance ?? 0,
      notes: vendor.notes || "",
      status: vendor.status || "active",
    });
    setEditingId(vendor._id);
    setTimeout(() => nameInputRef.current?.focus(), 100);
    toast.info(`Editing vendor: ${vendor.name}`);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const resetForm = () => {
    setForm({
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      openingBalance: 0,
      notes: "",
      status: "active",
    });
    setEditingId(null);
  };

  const filteredVendors = vendors.filter((v) =>
    (v.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage) || 1;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentVendors = filteredVendors.slice(indexOfFirst, indexOfLast);

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredVendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Vendor" : "Add Vendor"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Vendor Name</FieldLabel>
              <Input
                ref={nameInputRef}
                type="text"
                name="name"
                placeholder="Vendor Name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Company Name</FieldLabel>
              <Input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={form.companyName}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input
                type="text"
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Address</FieldLabel>
              <Input
                type="text"
                name="address"
                placeholder="Address"
                value={form.address}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>City</FieldLabel>
              <Input
                type="text"
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>Country</FieldLabel>
              <Input
                type="text"
                name="country"
                placeholder="Country"
                value={form.country}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>Opening Balance</FieldLabel>
              <Input
                type="number"
                name="openingBalance"
                placeholder="Opening Balance"
                value={form.openingBalance}
                onChange={handleChange}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Input
                type="text"
                name="notes"
                placeholder="Notes"
                value={form.notes}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value }))
                }
              >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectGroup>
                  </SelectContent>
              </Select>
            </Field>
            <div className="flex gap-4 mt-4 md:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : editingId
                    ? "Update Vendor"
                    : "Add Vendor"}
              </Button>
              <Button type="button" variant="success" onClick={handleExport}>
                Export Excel
              </Button>
              <Button type="button" variant="danger" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">Vendors List</h2>
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {vendorsLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentVendors.map((v, i) => (
                      <TableRow key={v._id} className="hover:bg-gray-50">
                        <TableCell>
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{v.companyName}</TableCell>
                        <TableCell>{v.email}</TableCell>
                        <TableCell>{v.phone}</TableCell>
                        <TableCell>{v.city}</TableCell>
                        <TableCell>{v.country}</TableCell>
                        <TableCell>{v.openingBalance}</TableCell>
                        <TableCell>{v.status}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(v)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(v._id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {currentVendors.length === 0 && (
                <p className="text-gray-500 text-center py-6">
                  No vendors found
                </p>
              )}
              {totalPages > 1 && (
                <Pagination>
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

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
              <AlertDialogDescription>
                This vendor will be deleted permanently. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirmed}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Vendors;
