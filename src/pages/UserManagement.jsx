import React, { useState, useMemo, useContext } from "react";
import { Plus, Search, UserX, UserCheck } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { DataTable } from "@/components/UI/data-table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/UI/drawer";
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { AuthContext } from "@/context/AuthContext";
import { Badge } from "@/components/UI/badge";

const EMPTY_ARRAY = [];

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [errors, setErrors] = useState({});

  const canCreate = currentUser?.permissions?.includes("user.manage") || currentUser?.permissions?.includes("user.create");
  const canUpdate = currentUser?.permissions?.includes("user.manage") || currentUser?.permissions?.includes("user.update");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users", page, itemsPerPage, search, statusFilter],
    queryFn: async () => {
      const params = { page, limit: itemsPerPage, search: search || undefined };
      if (statusFilter === "active" || statusFilter === "inactive") params.status = statusFilter;
      const res = await api.get("/users", { params });
      const list = res.data?.data ?? res.data ?? EMPTY_ARRAY;
      const pagination = res.data?.pagination ?? { total: list.length, pages: 1, limit: itemsPerPage };
      return { users: list, pagination };
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get("/roles");
      return res.data?.data ?? res.data ?? EMPTY_ARRAY;
    },
  });

  const users = data?.users ?? EMPTY_ARRAY;
  const pagination = data?.pagination ?? { total: 0, pages: 1 };
  const roles = Array.isArray(rolesData) ? rolesData : EMPTY_ARRAY;

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/users", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User added successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setAddUserOpen(false);
      setFormData({ name: "", email: "", password: "", role: "" });
      setErrors({});
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to add user";
      toast.error(msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/users/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "active" ? "User activated" : "User deactivated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to update status";
      toast.error(msg);
    },
  });

  const tableLoading = isLoading || isFetching;

  const validate = () => {
    const e = {};
    const name = (formData.name || "").trim();
    const email = (formData.email || "").trim().toLowerCase();
    const password = (formData.password || "").trim();
    const role = formData.role;

    if (!name) e.name = "Name is required";
    else if (name.length < 2) e.name = "Name must be at least 2 characters";

    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";

    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";

    if (!role) e.role = "Role is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
    });
  };

  const handleToggleStatus = (rowUser) => {
    const newStatus = rowUser.status === "active" ? "inactive" : "active";
    statusMutation.mutate({ id: rowUser._id, status: newStatus });
  };

  const userColumns = useMemo(
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
          <span className="font-medium text-gray-900">{row.original.name}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.email}</span>
        ),
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => {
          const r = row.original.role;
          const name = r?.name ?? (typeof r === "string" ? r : "—");
          return <span className="text-sm text-gray-600">{name}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status || "active";
          return (
            <Badge variant={s === "active" ? "default" : "secondary"}>
              {s === "active" ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      ...(canUpdate
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => {
                const u = row.original;
                const isSelf = currentUser?.id && String(u._id) === String(currentUser.id);
                const isActive = u.status === "active";
                return (
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isSelf || statusMutation.isPending}
                        title={isSelf ? "You cannot deactivate yourself" : "Deactivate user"}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleToggleStatus(u)}
                        disabled={statusMutation.isPending}
                        title="Activate user"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canUpdate, currentUser?.id, statusMutation.isPending]
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <Drawer direction="right" open={addUserOpen} onOpenChange={setAddUserOpen}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate">
              User Management ({pagination.total})
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <UiSelect
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </UiSelect>
              {canCreate && (
                <DrawerTrigger asChild>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                      setFormData({ name: "", email: "", password: "", role: "" });
                      setErrors({});
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add User
                  </Button>
                </DrawerTrigger>
              )}
            </div>
          </div>

          <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-md">
            <DrawerHeader className="px-4 sm:px-6">
              <DrawerTitle>Add User</DrawerTitle>
              <DrawerDescription>
                Create a new user account. They can sign in with the email and password you set.
              </DrawerDescription>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4" aria-label="Close">
                  ✕
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6">
              <form onSubmit={handleAddUser} className="space-y-4">
                <Field>
                  <FieldLabel>Name *</FieldLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </Field>
                <Field>
                  <FieldLabel>Email *</FieldLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </Field>
                <Field>
                  <FieldLabel>Password *</FieldLabel>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                </Field>
                <Field>
                  <FieldLabel>Role *</FieldLabel>
                  <UiSelect
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </UiSelect>
                  {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
                </Field>
                <DrawerFooter className="px-0 pb-0">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddUserOpen(false)}
                  >
                    Cancel
                  </Button>
                </DrawerFooter>
              </form>
            </div>
          </DrawerContent>
        </Drawer>

        {tableLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            columns={userColumns}
            data={users}
            addPagination={false}
            enableSelection={false}
            containerClassName="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-background min-h-[200px]"
          />
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {pagination.pages} ({pagination.total} users)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
