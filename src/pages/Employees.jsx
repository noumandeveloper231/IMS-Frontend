import React, { useState, useRef, useMemo } from "react";
import api from "../utils/api";
import { User, Phone, Mail, DollarSign, Shield, Calendar, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { DeleteModel } from "@/components/DeleteModel";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import { DataTable } from "@/components/UI/data-table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";

const TEMPLATE_COLUMNS = ["Name", "Phone", "Email", "Role", "Salary", "Status"];

/** Stable empty array for query data default (avoids remount/focus issues). */
const EMPTY_ARRAY = [];

const ROLES = ["salesman", "cashier", "manager", "admin"];
const STATUSES = ["active", "inactive"];

const Employees = () => {
  const queryClient = useQueryClient();
  const nameInputRef = useRef(null);

  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [employeeDrawerOpen, setEmployeeDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0, duplicates: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const employeesRef = useRef(EMPTY_ARRAY);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "salesman",
    salary: 0,
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return Array.isArray(res.data) ? res.data : res.data?.employees ?? [];
    },
  });
  const employees = employeesData ?? EMPTY_ARRAY;
  employeesRef.current = employees;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post("/employees", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee created successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEmployeeDrawerOpen(false);
      handleClearForm();
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        const email = formData.email?.trim();
        const name = formData.name?.trim();
        if (email) {
          toast.error(
            `Employee with email "${email}" already exists ❌`,
          );
        } else if (name) {
          toast.error(`Employee "${name}" already exists ❌`);
        } else {
          toast.error("Employee already exists ❌");
        }
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Something went wrong ❌");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee updated successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEmployeeDrawerOpen(false);
      handleClearForm();
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        const email = formData.email?.trim();
        const name = formData.name?.trim();
        if (email) {
          toast.error(
            `Employee with email "${email}" already exists ❌`,
          );
        } else if (name) {
          toast.error(`Employee "${name}" already exists ❌`);
        } else {
          toast.error("Employee already exists ❌");
        }
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Something went wrong ❌");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/employees/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee has been deleted successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
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
            "Cannot delete employee because they are linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Failed to delete employee ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? Number(value) || 0 : value,
    }));
  };

  const handleClearForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      role: "salesman",
      salary: 0,
      status: "active",
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName) {
      toast.error("Employee name is required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Employee name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        toast.error("Please enter a valid email address ❌");
        return;
      }
    }

    const salaryNumber = Number(formData.salary ?? 0);
    if (Number.isNaN(salaryNumber) || salaryNumber < 0) {
      toast.error("Salary must be 0 or greater ❌");
      return;
    }

    const duplicateByEmail = trimmedEmail
      ? employees.find(
          (emp) =>
            emp._id !== editingId &&
            (emp.email || "").toLowerCase() === trimmedEmail.toLowerCase(),
        )
      : null;
    if (duplicateByEmail) {
      toast.error(
        `Employee with email "${trimmedEmail}" already exists ❌`,
      );
      return;
    }

    const duplicateByNamePhone =
      trimmedPhone &&
      employees.find(
        (emp) =>
          emp._id !== editingId &&
          (emp.name || "").trim().toLowerCase() ===
            trimmedName.toLowerCase() &&
          (emp.phone || "").trim() === trimmedPhone,
      );
    if (duplicateByNamePhone) {
      toast.error(
        `Employee "${trimmedName}" with phone "${trimmedPhone}" already exists ❌`,
      );
      return;
    }

    const payload = {
      ...formData,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      salary: salaryNumber,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name,
      phone: employee.phone || "",
      email: employee.email || "",
      role: employee.role,
      salary: employee.salary || 0,
      status: employee.status,
    });
    setEditingId(employee._id);
    setEmployeeDrawerOpen(true);
    toast.info(`Editing employee: ${employee.name}`);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleBulkDeleteConfirmed = async () => {
    if (!selectedEmployeeIds.length) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of selectedEmployeeIds) {
        await api.delete(`/employees/${id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`Deleted ${selectedEmployeeIds.length} employee(s) ✅`);
      setBulkDeleteOpen(false);
      setSelectedEmployeeIds([]);
      setTableRowSelection({});
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      toast.error(msg || "Bulk delete failed ❌");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const filteredEmployees = (employees || []).filter(
    (emp) =>
      (emp.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone || "").includes(search) ||
      (emp.role || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }
    const seenInFile = new Set();
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => normalizeKey(k) === "name") ?? null;
      const nameVal = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const fieldErrors = {};
      let statusMessage = "";
      if (!nameVal) {
        fieldErrors[nameKey || "Name"] = "Required";
        statusMessage = "Name required";
      } else {
        const key = nameVal.toLowerCase();
        if (seenInFile.has(key)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = "Duplicate in file";
        } else {
          seenInFile.add(key);
        }
        const existsInDb = (employeesRef.current || []).some(
          (e) => (e.name || "").trim().toLowerCase() === key
        );
        if (existsInDb && !fieldErrors[nameKey || "Name"]) {
          fieldErrors[nameKey || "Name"] = "Already exists in DB";
          statusMessage = "Already in database";
        }
      }
      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
      return {
        ...row,
        __name: nameVal,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
      };
    });
    const valid = validated.filter((r) => r.__status === "valid").length;
    const errors = validated.filter((r) => r.__status === "error").length;
    const duplicates = validated.filter(
      (r) =>
        r.__status === "error" &&
        (r.__statusMessage === "Duplicate in file" || r.__statusMessage === "Already in database")
    ).length;
    setImportStats({ total: rows.length, valid, errors, duplicates });
    return validated;
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    toast.info("Import data cleared");
  };

  const handleImportFileSelected = async (fileOrFiles) => {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" });
      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return;
      }
      const validatedRows = validateImportedRows(rows);
      setImportRows(validatedRows);
      setImportColumns(Object.keys(rows[0] || {}));
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
      console.error("Import parse error:", err);
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Unable to read file: ${messageFromServer} ❌`
          : "Unable to read file ❌",
      );
    }
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }
    setImportLoading(true);
    try {
      const payload = validRows.map((row) => {
        const nameVal = row.__name ?? row.Name ?? row.name ?? "";
        const phoneVal = row.Phone ?? row.phone ?? "";
        const emailVal = row.Email ?? row.email ?? "";
        const roleVal = row.Role ?? row.role ?? "salesman";
        const salaryVal = Number(row.Salary ?? row.salary ?? 0) || 0;
        const statusVal = row.Status ?? row.status ?? "active";
        return {
          name: nameVal,
          phone: String(phoneVal),
          email: String(emailVal),
          role: ROLES.includes(roleVal) ? roleVal : "salesman",
          salary: salaryVal,
          status: STATUSES.includes(statusVal) ? statusVal : "active",
        };
      });
      const res = await api.post("/employees/createbulk", payload);
      const successCount = res.data?.createdCount ?? 0;
      const errorCount = res.data?.errorCount ?? 0;
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (successCount === 0) {
        toast.error(
          errorCount > 0
            ? `Import failed: 0 employees imported, ${errorCount} errors ❌`
            : "Import failed ❌",
        );
      } else if (errorCount > 0) {
        toast.warning(`Imported ${successCount} employees, ${errorCount} errors`);
      } else {
        toast.success(`Imported ${successCount} employees ✅`);
      }
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    } catch (err) {
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Import failed: ${messageFromServer} ❌`
          : "Import failed ❌",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    setImportRows([Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]))]);
    setImportStats({ total: 1, valid: 0, errors: 0, duplicates: 0 });
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "employees-import-template.xlsx");
  };

  const handleExport = () => {
    const exportData = filteredEmployees.map((emp) => ({
      Name: emp.name,
      Phone: emp.phone || "",
      Email: emp.email || "",
      Role: emp.role,
      Salary: emp.salary,
      Status: emp.status,
      "Joined Date": emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : "",
      "Created At": emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees.xlsx");
    toast.success("Employees exported to Excel ✅");
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "manager": return "bg-purple-100 text-purple-800";
      case "cashier": return "bg-blue-100 text-blue-800";
      case "salesman": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status) =>
    status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

  const employeeColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "name",
        header: () => (
          <span className="flex items-center gap-2">
            <User className="w-4 h-4" /> Name
          </span>
        ),
        accessorKey: "name",
        meta: { label: "Name" },
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "phone",
        header: () => (
          <span className="flex items-center gap-2">
            <Phone className="w-4 h-4" /> Phone
          </span>
        ),
        accessorKey: "phone",
        meta: { label: "Phone" },
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">{row.original.phone || "-"}</span>
        ),
      },
      {
        id: "email",
        header: () => (
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email
          </span>
        ),
        accessorKey: "email",
        meta: { label: "Email" },
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">{row.original.email || "-"}</span>
        ),
      },
      {
        id: "role",
        header: () => (
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role
          </span>
        ),
        accessorKey: "role",
        meta: { label: "Role" },
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(role)}`}>
              {(role || "").charAt(0).toUpperCase() + (role || "").slice(1)}
            </span>
          );
        },
      },
      {
        id: "salary",
        header: () => (
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Salary
          </span>
        ),
        accessorKey: "salary",
        meta: { label: "Salary" },
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">
            {row.original.salary != null ? `$${Number(row.original.salary).toLocaleString()}` : "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        meta: { label: "Status" },
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(status)}`}>
              {(status || "").charAt(0).toUpperCase() + (status || "").slice(1)}
            </span>
          );
        },
      },
      {
        id: "joinedAt",
        header: () => (
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Joined Date
          </span>
        ),
        accessorKey: "joinedAt",
        meta: { label: "Joined Date" },
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.joinedAt ? new Date(row.original.joinedAt).toLocaleDateString() : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const emp = row.original;
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
                      onClick={() => handleEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit employee</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(emp._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete employee</TooltipContent>
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
        <div className="">
          <Drawer
            direction="right"
            open={employeeDrawerOpen}
            onOpenChange={setEmployeeDrawerOpen}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0">
                Employees List ({filteredEmployees.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                {selectedEmployeeIds.length > 0 && (
                  <div className="w-full sm:w-auto min-w-0">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") {
                          if (selectedEmployeeIds.length === 1) {
                            confirmDelete(selectedEmployeeIds[0]);
                          } else {
                            setBulkDeleteOpen(true);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Bulk actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Bulk actions</SelectLabel>
                          <SelectItem value="bulk-delete">Bulk delete</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center shrink-0">
                <Drawer open={importDrawerOpen} onOpenChange={setImportDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Label
                      variant="light"
                      className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer whitespace-nowrap text-sm sm:text-base"
                    >
                      Import Excel
                    </Label>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[90vh] w-full max-w-[100vw]">
                    <DrawerHeader className="border-b px-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <DrawerTitle>Bulk Employee Import</DrawerTitle>
                          <DrawerDescription>
                            Upload CSV or Excel file to create multiple employees.
                          </DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                          <Button variant="outline" size="icon">
                            ✕
                          </Button>
                        </DrawerClose>
                      </div>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleViewTemplate}
                          >
                            View Template
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadTemplate}
                          >
                            Download Template
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Supported formats: <span className="font-medium">.csv, .xlsx</span>
                          </p>
                        </div>
                        {importRows.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={handleClearImportData}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload file</p>
                        <ImageUploadDropzone
                          accept=".csv,.xlsx"
                          type="excel"
                          label="Drag & Drop Excel or CSV File"
                          description="Upload bulk employee file"
                          maxSize={10 * 1024 * 1024}
                          onFileSelect={handleImportFileSelected}
                        />
                      </div>
                      {importRows.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                Preview ({importStats.total} rows)
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Valid: {importStats.valid} | Errors: {importStats.errors}
                              {importStats.duplicates > 0 && ` | Duplicates: ${importStats.duplicates}`}
                            </p>
                          </div>
                          <div className="border w-full rounded-md max-h-80 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>Name</TableHead>
                                  {importColumns.map((col) => (
                                    <TableHead className="whitespace-nowrap w-auto" key={col}>{col}</TableHead>
                                  ))}
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importRows.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    <TableCell className="text-xs text-muted-foreground">{rowIndex + 1}</TableCell>
                                    <TableCell className="text-xs">{row.__name ?? row.Name ?? row.name ?? "—"}</TableCell>
                                    {importColumns.map((col) => (
                                      <TableCell key={col} className="text-xs">{String(row[col] ?? "")}</TableCell>
                                    ))}
                                    <TableCell>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span
                                              className={
                                                row.__status === "valid"
                                                  ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                                                  : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                                              }
                                            >
                                              {row.__status === "valid" ? "Valid" : "Error"}
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[200px]">
                                            {row.__status === "valid"
                                              ? "Ready to import"
                                              : (row.__statusMessage || "Validation error")}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                    <DrawerFooter className="border-t px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            ✔ Valid:{" "}
                            <span className="font-semibold text-emerald-700">
                              {importStats.valid}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            ⚠ Errors:{" "}
                            <span className="font-semibold text-red-700">
                              {importStats.errors}
                            </span>
                          </span>
                          {importStats.duplicates > 0 && (
                            <span className="text-muted-foreground">
                              ✖ Duplicates:{" "}
                              <span className="font-semibold text-orange-700">
                                {importStats.duplicates}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="default"
                            onClick={handleImportValidSubmit}
                            disabled={!importStats.valid || importLoading}
                          >
                            {importLoading ? "Importing..." : "Import Valid Only"}
                          </Button>
                          <DrawerClose asChild>
                            <Button type="button" variant="ghost">
                              Cancel
                            </Button>
                          </DrawerClose>
                        </div>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <Button
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
                >
                  Export Excel
                </Button>
                <DrawerTrigger asChild>
                  <Button variant="default" onClick={() => { if (!editingId) handleClearForm(); }}>
                    {editingId ? "Edit Employee" : "Add New Employee"}
                  </Button>
                </DrawerTrigger>
              </div>
            </div>
            </div>
            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader>
                <DrawerTitle>{editingId ? "Edit Employee" : "Add New Employee"}</DrawerTitle>
                <DrawerDescription>
                  {editingId ? "Update the employee details." : "Fill in the details below to add a new employee."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-4">
                    <Field>
                      <FieldLabel><User className="inline w-4 h-4 mr-1" /> Employee Name *</FieldLabel>
                      <Input
                        ref={nameInputRef}
                        type="text"
                        name="name"
                        placeholder="Enter employee name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full"
                      />
                    </Field>
                    <Field>
                      <FieldLabel><Phone className="inline w-4 h-4 mr-1" /> Phone</FieldLabel>
                      <Input
                        type="tel"
                        name="phone"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="mt-1 w-full"
                      />
                    </Field>
                    <Field>
                      <FieldLabel><Mail className="inline w-4 h-4 mr-1" /> Email</FieldLabel>
                      <Input
                        type="email"
                        name="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="mt-1 w-full"
                      />
                    </Field>
                    <Field>
                      <FieldLabel><Shield className="inline w-4 h-4 mr-1" /> Role</FieldLabel>
                      <UiSelect value={formData.role} onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Role</SelectLabel>
                            <SelectItem value="salesman">Salesman</SelectItem>
                            <SelectItem value="cashier">Cashier</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </UiSelect>
                    </Field>
                    <Field>
                      <FieldLabel><DollarSign className="inline w-4 h-4 mr-1" /> Salary</FieldLabel>
                      <Input
                        type="number"
                        name="salary"
                        min="0"
                        placeholder="Enter salary"
                        value={formData.salary || ""}
                        onChange={handleInputChange}
                        className="mt-1 w-full"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <UiSelect value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Status</SelectLabel>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </UiSelect>
                    </Field>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button type="submit" variant="default" disabled={loading}>
                      {loading ? "Please wait..." : editingId ? "Update Employee" : "Add Employee"}
                    </Button>
                    <Button type="button" variant="danger" onClick={handleClearForm} className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md">
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="ml-auto">Cancel</Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <div className="">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-3 w-full">
                <Input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <UiSelect value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>
          {employeesLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={employeeColumns}
                data={filteredEmployees}
                pageSize={itemsPerPage}
                getRowId={(row) => row._id}
                rowSelection={tableRowSelection}
                onRowSelectionChange={setTableRowSelection}
                onSelectionChange={(rows) => setSelectedEmployeeIds(rows.map((r) => r._id))}
              />
            </div>
          )}
        </div>
      </div>
      <DeleteModel
        title="Delete employee?"
        description="This action cannot be undone. This will permanently delete the selected employee."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDeleteConfirmed}
        loading={loading}
      />
      <DeleteModel
        title="Delete selected employees?"
        description={`This will permanently delete ${selectedEmployeeIds.length} employee(s). This action cannot be undone.`}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={handleBulkDeleteConfirmed}
        loading={bulkDeleteLoading}
      />
    </div>
  );
};

export default Employees;
