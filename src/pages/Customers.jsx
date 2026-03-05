import React, { useState, useMemo } from "react";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { DeleteModel } from "@/components/DeleteModel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/UI/data-table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/UI/drawer";

const EMPTY_ARRAY = [];

const Customers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["customers", page, limit, search],
    queryFn: async () => {
      const res = await api.get("/customers", {
        params: { page, limit, search },
      });
      const customersData = res.data.data || res.data;
      const paginationData = res.data.pagination || { total: 0, pages: 1 };
      return { customers: customersData ?? EMPTY_ARRAY, pagination: paginationData };
    },
    keepPreviousData: true,
  });

  const customers = data?.customers ?? EMPTY_ARRAY;
  const pagination = data?.pagination ?? { total: 0, pages: 1 };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post("/customers", payload);
    },
    onSuccess: () => {
      toast.success("Customer added");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerDrawerOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        notes: "",
      });
      setErrors({});
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      await api.put(`/customers/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Customer updated");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerDrawerOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        country: "",
        notes: "",
      });
      setErrors({});
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const mutationLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const tableLoading = isLoading || isFetching;

  const validate = () => {
    const e = {};
    const trimmedName = formData.name?.trim() || "";
    const trimmedPhone = formData.phone?.trim() || "";
    const trimmedEmail = formData.email?.trim() || "";

    if (!trimmedName) {
      e.name = "Name is required";
    } else if (trimmedName.length < 2) {
      e.name = "Name must be at least 2 characters long";
    } else if (trimmedName.length > 50) {
      e.name = "Name must be at most 50 characters long";
    }

    if (trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        e.email = "Enter a valid email address";
      } else {
        const existingByEmail = customers.find(
          (c) =>
            c._id !== editingId &&
            (c.email || "").toLowerCase() === trimmedEmail.toLowerCase(),
        );
        if (existingByEmail) {
          e.email = `Customer with email "${trimmedEmail}" already exists`;
        }
      }
    }

    if (trimmedPhone) {
      const existingByPhone = customers.find(
        (c) =>
          c._id !== editingId &&
          (c.phone || "").trim() === trimmedPhone,
      );
      if (existingByPhone) {
        e.phone = `Customer with phone "${trimmedPhone}" already exists`;
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...formData,
      name: formData.name?.trim() || "",
      phone: formData.phone?.trim() || "",
      email: formData.email?.trim() || "",
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setFormData({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      country: c.country || "",
      notes: c.notes || "",
    });
    setCustomerDrawerOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const customerColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.phone || "-"}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">
            {row.original.email || "-"}
          </span>
        ),
      },
      {
        id: "totalSpent",
        header: "Total Spent",
        accessorKey: "totalSpent",
        cell: ({ row }) => {
          const value = row.original.totalSpent;
          const formatted =
            typeof value === "number"
              ? value.toFixed(2)
              : value && !Number.isNaN(Number(value))
              ? Number(value).toFixed(2)
              : "0.00";
          return (
            <span className="text-sm text-gray-600">
              AED {formatted}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex justify-end gap-1">
              <button
                onClick={() => handleEdit(c)}
                className="rounded p-2 text-blue-600 hover:bg-blue-50"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleDelete(c._id)}
                className="rounded p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
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
        <Drawer
          direction="right"
          open={customerDrawerOpen}
          onOpenChange={setCustomerDrawerOpen}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate">
              Customers ({pagination.total})
            </h1>
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      name: "",
                      phone: "",
                      email: "",
                      address: "",
                      city: "",
                      country: "",
                      notes: "",
                    });
                    setErrors({});
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DrawerTrigger>
            </div>
          </div>

          <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
            <DrawerHeader className="px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <div>
                  <DrawerTitle>
                    {editingId ? "Edit Customer" : "Add Customer"}
                  </DrawerTitle>
                  <DrawerDescription>
                    {editingId
                      ? "Update the customer details."
                      : "Fill in the details below to add a new customer."}
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Close"
                  >
                    ✕
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6 sm:pb-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field>
                  <FieldLabel>Name *</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Customer name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Phone"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Address"
                  />
                </Field>
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full sm:w-auto"
                    disabled={mutationLoading}
                  >
                    {mutationLoading ? "Please wait..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setCustomerDrawerOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </DrawerContent>
        </Drawer>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {tableLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <DataTable
                  columns={customerColumns}
                  data={customers}
                  addPagination={false}
                />
              </div>
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="min-w-[96px]"
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-sm text-gray-600">
                    Page {page} of {pagination.pages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pages, p + 1))
                    }
                    disabled={page >= pagination.pages}
                    className="min-w-[96px]"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DeleteModel
        title="Delete customer?"
        description="This customer will be deleted permanently. This action cannot be undone."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDeleteConfirmed}
        loading={mutationLoading}
      />
    </div>
  );
};

export default Customers;
