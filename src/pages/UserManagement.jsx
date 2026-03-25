import React, { useState, useMemo, useContext } from "react";
import { Plus, Search, UserX, UserCheck, Eye, EyeOff, Pencil, Trash2, Shield } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { DataTable } from "@/components/UI/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/UI/tabs";
import { Checkbox } from "@/components/UI/checkbox";
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
import Loader from "@/components/Loader";

const EMPTY_ARRAY = [];

/** Format role name: replace _ with space and capitalize each word (e.g. inventory_manager → Inventory Manager) */
const formatRoleName = (name) => {
  if (!name || typeof name !== "string") return name ?? "—";
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/** Add implied read permissions for any write permission in the list (for display in role form). */
function getEffectivePermissionsForDisplay(permissions, permissionByValue) {
  if (!Array.isArray(permissions)) return [];
  const set = new Set(permissions);
  permissions.forEach((value) => {
    const p = permissionByValue?.[value];
    if (p && p.isWrite && p.readPermission) set.add(p.readPermission);
  });
  return Array.from(set);
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "active",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});

  const [activeTab, setActiveTab] = useState("users");
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", permissions: [] });
  const [roleFormErrors, setRoleFormErrors] = useState({});
  const [deleteRoleId, setDeleteRoleId] = useState(null);

  const canCreate = currentUser?.permissions?.includes("user.manage") || currentUser?.permissions?.includes("user.create");
  const canUpdate = currentUser?.permissions?.includes("user.manage") || currentUser?.permissions?.includes("user.update");
  const canManageRoles = currentUser?.permissions?.includes("user.manage");

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

  const { data: permissionsData } = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: async () => {
      const res = await api.get("/roles/permissions");
      return res.data?.data ?? EMPTY_ARRAY;
    },
    enabled: !!canManageRoles && (activeTab === "roles" || roleDrawerOpen),
  });

  const permissionsList = Array.isArray(permissionsData) ? permissionsData : EMPTY_ARRAY;
  const permissionsByModule = useMemo(() => {
    const map = {};
    permissionsList.forEach((p) => {
      const m = p.module || "other";
      if (!map[m]) map[m] = [];
      map[m].push(p);
    });
    Object.keys(map).forEach((m) => map[m].sort((a, b) => (a.label || "").localeCompare(b.label || "")));
    return map;
  }, [permissionsList]);

  const permissionByValue = useMemo(() => {
    const map = {};
    permissionsList.forEach((p) => { map[p.value] = p; });
    return map;
  }, [permissionsList]);

  const perModuleWriteValues = useMemo(() => {
    const map = {};
    permissionsList.forEach((p) => {
      if (p.isWrite) {
        const m = p.module || "other";
        if (!map[m]) map[m] = [];
        map[m].push(p.value);
      }
    });
    return map;
  }, [permissionsList]);

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
      setFormData({ name: "", email: "", password: "", confirmPassword: "", role: "" });
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditUserOpen(false);
      setEditingUserId(null);
      setEditFormData({ name: "", email: "", role: "", status: "active", password: "", confirmPassword: "" });
      setEditFormErrors({});
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to update user";
      toast.error(msg);
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/roles", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setRoleDrawerOpen(false);
      setEditingRoleId(null);
      setRoleForm({ name: "", permissions: [] });
      setRoleFormErrors({});
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to create role");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await api.put(`/roles/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setRoleDrawerOpen(false);
      setEditingRoleId(null);
      setRoleForm({ name: "", permissions: [] });
      setRoleFormErrors({});
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/roles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteRoleId(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete role");
    },
  });

  const tableLoading = isLoading || isFetching;

  const validate = () => {
    const e = {};
    const name = (formData.name || "").trim();
    const email = (formData.email || "").trim().toLowerCase();
    const password = (formData.password || "").trim();
    const confirmPassword = (formData.confirmPassword || "").trim();
    const role = formData.role;

    if (!name) e.name = "Name is required";
    else if (name.length < 2) e.name = "Name must be at least 2 characters";

    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";

    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";

    if (!confirmPassword) e.confirmPassword = "Confirm password is required";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";

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

  const validateEdit = () => {
    const e = {};
    const name = (editFormData.name || "").trim();
    const email = (editFormData.email || "").trim().toLowerCase();
    const password = (editFormData.password || "").trim();
    const confirmPassword = (editFormData.confirmPassword || "").trim();
    const role = editFormData.role;

    if (!name) e.name = "Name is required";
    else if (name.length < 2) e.name = "Name must be at least 2 characters";

    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";

    if (password || confirmPassword) {
      if (password.length < 6) e.password = "Password must be at least 6 characters";
      else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    }

    if (!role) e.role = "Role is required";

    setEditFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEditUser = (e) => {
    e.preventDefault();
    if (!validateEdit()) return;
    const payload = {
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      role: editFormData.role,
      status: editFormData.status || "active",
    };
    if ((editFormData.password || "").trim()) payload.password = editFormData.password.trim();
    updateUserMutation.mutate({ id: editingUserId, ...payload });
  };

  const openEditUser = (user) => {
    const roleId = user.role?._id ?? user.role ?? "";
    setEditingUserId(user._id);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      role: roleId,
      status: user.status || "active",
      password: "",
      confirmPassword: "",
    });
    setEditFormErrors({});
    setEditUserOpen(true);
  };

  const handleToggleStatus = (rowUser) => {
    const newStatus = rowUser.status === "active" ? "inactive" : "active";
    statusMutation.mutate({ id: rowUser._id, status: newStatus });
  };

  const openRoleDrawerForCreate = () => {
    setEditingRoleId(null);
    setRoleForm({ name: "", permissions: [] });
    setRoleFormErrors({});
    setRoleDrawerOpen(true);
  };

  const openRoleDrawerForEdit = (role) => {
    setEditingRoleId(role._id);
    const raw = Array.isArray(role.permissions) ? role.permissions : [];
    setRoleForm({
      name: role.name || "",
      permissions: getEffectivePermissionsForDisplay(raw, permissionByValue),
    });
    setRoleFormErrors({});
    setRoleDrawerOpen(true);
  };

  const toggleRolePermission = (value) => {
    setRoleForm((prev) => {
      const set = new Set(prev.permissions);
      const perm = permissionByValue[value];
      const isCurrentlyChecked = set.has(value);

      if (isCurrentlyChecked) {
        set.delete(value);
        if (perm && perm.action === "read" && perm.module) {
          const writeValues = perModuleWriteValues[perm.module] || [];
          writeValues.forEach((v) => set.delete(v));
        }
      } else {
        set.add(value);
        if (perm && perm.isWrite && perm.readPermission) set.add(perm.readPermission);
      }
      return { ...prev, permissions: Array.from(set) };
    });
  };

  const validateRoleForm = () => {
    const e = {};
    const name = (roleForm.name || "").trim().replace(/\s+/g, "_").toLowerCase();
    if (!name) e.name = "Role name is required";
    setRoleFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRoleSubmit = (e) => {
    e.preventDefault();
    if (!validateRoleForm()) return;
    const name = roleForm.name.trim().replace(/\s+/g, "_").toLowerCase();
    const payload = { name, permissions: roleForm.permissions };
    if (editingRoleId) {
      updateRoleMutation.mutate({ id: editingRoleId, ...payload });
    } else {
      createRoleMutation.mutate(payload);
    }
  };

  const roleColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "name",
        header: "Role name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900">{formatRoleName(row.original.name)}</span>
        ),
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.permissions?.length ?? 0} permissions</span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={row.original.isSystem ? "secondary" : "outline"}>
            {row.original.isSystem ? "System" : "Custom"}
          </Badge>
        ),
      },
      ...(canManageRoles
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }) => {
                const r = row.original;
                return (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openRoleDrawerForEdit(r)}
                      title="Edit role"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!r.isSystem && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteRoleId(r._id)}
                        title="Delete role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canManageRoles]
  );

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
          return <span className="text-sm text-gray-600">{formatRoleName(name)}</span>;
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={() => openEditUser(u)}
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate">
              User Management
            </h1>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="users">Users ({pagination.total})</TabsTrigger>
              <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="mt-4 space-y-4">
        <Drawer direction="right" open={addUserOpen} onOpenChange={setAddUserOpen}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-lg font-medium text-gray-700">Users</span>
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
                      setFormData({ name: "", email: "", password: "", confirmPassword: "", role: "" });
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                </Field>
                <Field>
                  <FieldLabel>Confirm Password *</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
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
                          {formatRoleName(r.name)}
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

        <Drawer direction="right" open={editUserOpen} onOpenChange={setEditUserOpen}>
          <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-md">
            <DrawerHeader className="px-4 sm:px-6">
              <DrawerTitle>Edit User</DrawerTitle>
              <DrawerDescription>
                Update user details. Leave password fields blank to keep the current password.
              </DrawerDescription>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4" aria-label="Close">
                  ✕
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6">
              <form onSubmit={handleEditUser} className="space-y-4">
                <Field>
                  <FieldLabel>Name *</FieldLabel>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Full name"
                  />
                  {editFormErrors.name && <p className="mt-1 text-sm text-red-500">{editFormErrors.name}</p>}
                </Field>
                <Field>
                  <FieldLabel>Email *</FieldLabel>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                  {editFormErrors.email && <p className="mt-1 text-sm text-red-500">{editFormErrors.email}</p>}
                </Field>
                <Field>
                  <FieldLabel>Role *</FieldLabel>
                  <UiSelect
                    value={editFormData.role}
                    onValueChange={(v) => setEditFormData({ ...editFormData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {formatRoleName(r.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </UiSelect>
                  {editFormErrors.role && <p className="mt-1 text-sm text-red-500">{editFormErrors.role}</p>}
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <UiSelect
                    value={editFormData.status}
                    onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </UiSelect>
                </Field>
                <Field>
                  <FieldLabel>New password (optional)</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showEditPassword ? "text" : "password"}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={showEditPassword ? "Hide password" : "Show password"}
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {editFormErrors.password && <p className="mt-1 text-sm text-red-500">{editFormErrors.password}</p>}
                </Field>
                <Field>
                  <FieldLabel>Confirm new password</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showEditConfirmPassword ? "text" : "password"}
                      value={editFormData.confirmPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
                      placeholder="Re-enter if changing password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditConfirmPassword((p) => !p)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label={showEditConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showEditConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {editFormErrors.confirmPassword && <p className="mt-1 text-sm text-red-500">{editFormErrors.confirmPassword}</p>}
                </Field>
                <DrawerFooter className="px-0 pb-0">
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditUserOpen(false)}
                  >
                    Cancel
                  </Button>
                </DrawerFooter>
              </form>
            </div>
          </DrawerContent>
        </Drawer>

        {tableLoading ? (
          <div className="flex justify-center items-center py-10"><Loader /></div>
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
          </TabsContent>

          <TabsContent value="roles" className="mt-4 space-y-4">
            {canManageRoles && (
              <div className="flex justify-end">
                <Button type="button" variant="default" onClick={openRoleDrawerForCreate} className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Create custom role
                </Button>
              </div>
            )}
            <DataTable
              columns={roleColumns}
              data={roles}
              addPagination={false}
              enableSelection={false}
              containerClassName="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-background min-h-[200px]"
            />
          </TabsContent>
        </Tabs>

        <Drawer direction="right" open={roleDrawerOpen} onOpenChange={setRoleDrawerOpen}>
          <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-lg">
            <DrawerHeader className="px-4 sm:px-6">
              <DrawerTitle>{editingRoleId ? "Edit role" : "Create custom role"}</DrawerTitle>
              <DrawerDescription>
                {editingRoleId
                  ? "Update role name and permissions. Users with this role will get the new permissions after they log in again."
                  : "Give the role a name and select which permissions it has. You can then assign this role to users."}
              </DrawerDescription>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="absolute right-4 top-4" aria-label="Close">✕</Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6">
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <Field>
                  <FieldLabel>Role name *</FieldLabel>
                  <Input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Warehouse staff"
                  />
                  {roleFormErrors.name && <p className="mt-1 text-sm text-red-500">{roleFormErrors.name}</p>}
                </Field>
                <Field>
                  <FieldLabel>Permissions</FieldLabel>
                  <p className="text-sm text-muted-foreground mb-2">Select the permissions this role can have. Write (create, update, manage, etc.) automatically includes read for that module. Unchecking Read will remove all write permissions for that module.</p>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {Object.entries(permissionsByModule).map(([moduleKey, perms]) => (
                      <div key={moduleKey} className="space-y-2">
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {moduleKey.replace(/_/g, " ")}
                        </p>
                        <div className="grid gap-2 pl-2">
                          {perms.map((p) => (
                            <label
                              key={p.value}
                              className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                            >
                              <Checkbox
                                checked={roleForm.permissions.includes(p.value)}
                                onCheckedChange={() => toggleRolePermission(p.value)}
                              />
                              <span>{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
                <DrawerFooter className="px-0 pb-0">
                  <Button
                    type="submit"
                    disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                  >
                    {editingRoleId ? (updateRoleMutation.isPending ? "Saving..." : "Save role") : (createRoleMutation.isPending ? "Creating..." : "Create role")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setRoleDrawerOpen(false)}>
                    Cancel
                  </Button>
                </DrawerFooter>
              </form>
            </div>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={!!deleteRoleId} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove this custom role. Users with this role will need to be assigned a different role first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteRoleId && deleteRoleMutation.mutate(deleteRoleId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default UserManagement;
