import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import api from "../utils/api";
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
  SelectSeparator,
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
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Textarea } from "@/components/UI/textarea";
import Loader from "@/components/Loader";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/UI/input-group";
import { useSettings } from "@/context/SettingsContext";

const TEMPLATE_COLUMNS = ["Name", "Company Name", "Email", "Phone", "Address", "City", "Country", "Opening Balance", "Notes", "Status"];

/** Stable empty array for query data default (avoids remount/focus issues). */
const EMPTY_ARRAY = [];

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
  const { settings } = useSettings();
  const currency = settings?.currency || "AED";
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0, duplicates: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const vendorsRef = useRef(EMPTY_ARRAY);
  const vendorDrawerOpenRef = useRef(vendorDrawerOpen);

  useEffect(() => {
    vendorDrawerOpenRef.current = vendorDrawerOpen;
  }, [vendorDrawerOpen]);

  // Open Import Excel drawer when a file is dragged over the page (not when Add/Edit Vendor drawer is open); close when drag leaves
  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      if (vendorDrawerOpenRef.current) return;
      e.preventDefault();
      setImportDrawerOpen(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      if (vendorDrawerOpenRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (vendorDrawerOpenRef.current) return;
      if (e.relatedTarget != null && document.body.contains(e.relatedTarget)) return;
      setImportDrawerOpen(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      if (vendorDrawerOpenRef.current) return;
      e.preventDefault();
    };
    document.addEventListener("dragenter", onDragEnter, false);
    document.addEventListener("dragover", onDragOver, false);
    document.addEventListener("dragleave", onDragLeave, false);
    document.addEventListener("drop", onDrop, false);
    return () => {
      document.removeEventListener("dragenter", onDragEnter, false);
      document.removeEventListener("dragover", onDragOver, false);
      document.removeEventListener("dragleave", onDragLeave, false);
      document.removeEventListener("drop", onDrop, false);
    };
  }, []);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors/getall");
      return res.data ?? [];
    },
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : EMPTY_ARRAY;
  vendorsRef.current = vendors;

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/vendors/create", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Vendor added ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorDrawerOpen(false);
      resetForm();
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
        const email = form.email?.trim();
        const name = form.name?.trim();
        if (email) {
          toast.error(
            `Vendor with email "${email}" already exists ❌`,
          );
        } else if (name) {
          toast.error(`Vendor "${name}" already exists ❌`);
        } else {
          toast.error("Vendor already exists ❌");
        }
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create vendor. Please try again ❌");
      }
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
      setVendorDrawerOpen(false);
      resetForm();
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
        const email = form.email?.trim();
        const name = form.name?.trim();
        if (email) {
          toast.error(
            `Vendor with email "${email}" already exists ❌`,
          );
        } else if (name) {
          toast.error(`Vendor "${name}" already exists ❌`);
        } else {
          toast.error("Vendor already exists ❌");
        }
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update vendor. Please try again ❌");
      }
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
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (error?.response?.status === 409) {
        toast.error(
          messageFromServer ||
          "Cannot delete vendor because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Failed to delete vendor ❌");
      }
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = form.name?.trim() || "";
    const trimmedPhone = form.phone?.trim() || "";
    const trimmedEmail = form.email?.trim() || "";

    if (!trimmedName || !trimmedPhone) {
      toast.error("Vendor name and phone are required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Vendor name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        toast.error("Please enter a valid email address ❌");
        return;
      }
      const existingByEmail = vendors.find(
        (v) =>
          (v.email || "").toLowerCase() === trimmedEmail.toLowerCase() &&
          v._id !== editingId,
      );
      if (existingByEmail) {
        toast.error(
          `Vendor with email "${trimmedEmail}" already exists ❌`,
        );
        return;
      }
    }

    const existingByNamePhone = vendors.find(
      (v) =>
        v._id !== editingId &&
        (v.name || "").trim().toLowerCase() === trimmedName.toLowerCase() &&
        (v.phone || "").trim() === trimmedPhone,
    );
    if (existingByNamePhone) {
      toast.error(
        `Vendor "${trimmedName}" with phone "${trimmedPhone}" already exists ❌`,
      );
      return;
    }

    const payload = {
      ...form,
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
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
    setVendorDrawerOpen(true);
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

  const handleBulkDeleteConfirmed = async () => {
    if (!selectedVendorIds.length) return;
    setBulkDeleteLoading(true);
    try {
      for (const id of selectedVendorIds) {
        await api.delete(`/vendors/delete/${id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(`Deleted ${selectedVendorIds.length} vendor(s) ✅`);
      setBulkDeleteOpen(false);
      setSelectedVendorIds([]);
      setTableRowSelection({});
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      toast.error(msg || "Bulk delete failed ❌");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const filteredVendors = vendors.filter((v) =>
    (v.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }
    const seenInFile = new Set();
    const seenEmailsInFile = new Set();
    const validated = rows.map((row) => {
      const nameKey = Object.keys(row).find((k) => normalizeKey(k) === "name") ?? null;
      const phoneKey = Object.keys(row).find((k) => normalizeKey(k) === "phone") ?? null;
      const emailKey = Object.keys(row).find((k) => normalizeKey(k) === "email") ?? null;
      const nameVal = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const phoneVal = phoneKey ? String(row[phoneKey] ?? "").trim() : "";
      const emailVal = emailKey ? String(row[emailKey] ?? "").trim() : "";
      const fieldErrors = {};
      let statusMessage = "";
      if (!nameVal) {
        fieldErrors[nameKey || "Name"] = "Required";
        statusMessage = "Name required";
      }
      if (!phoneVal) {
        fieldErrors[phoneKey || "Phone"] = "Required";
        statusMessage = statusMessage || "Phone required";
      }
      if (emailVal) {
        const emailLower = emailVal.toLowerCase();
        if (seenEmailsInFile.has(emailLower)) {
          fieldErrors[emailKey || "Email"] = "Duplicate email in file";
          statusMessage = statusMessage || "Duplicate email in file";
        } else {
          seenEmailsInFile.add(emailLower);
        }
        const existsInDbByEmail = (vendorsRef.current || []).some(
          (v) => (v.email || "").trim().toLowerCase() === emailLower
        );
        if (existsInDbByEmail && !fieldErrors[emailKey || "Email"]) {
          fieldErrors[emailKey || "Email"] = "Email already in DB";
          statusMessage = statusMessage || "Email already in database";
        }
      }
      if (nameVal && phoneVal) {
        const key = `${nameVal.toLowerCase()}|${phoneVal}`;
        if (seenInFile.has(key)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = statusMessage || "Duplicate in file";
        } else {
          seenInFile.add(key);
        }
        const existsInDb = (vendorsRef.current || []).some(
          (v) =>
            (v.name || "").trim().toLowerCase() === nameVal.toLowerCase() &&
            (v.phone || "").trim() === phoneVal
        );
        if (existsInDb && !fieldErrors[nameKey || "Name"]) {
          fieldErrors[nameKey || "Name"] = "Already exists in DB";
          statusMessage = statusMessage || "Already in database";
        }
      }
      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
      return {
        ...row,
        __name: nameVal,
        __phone: phoneVal,
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
        (r.__statusMessage === "Duplicate in file" ||
          r.__statusMessage === "Already in database" ||
          r.__statusMessage === "Duplicate email in file" ||
          r.__statusMessage === "Email already in database")
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

  const handleAddImportRow = () => {
    const newRow = Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
  };

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleRemoveImportRow = useCallback((rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  }, []);

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
      const payload = validRows.map((row) => ({
        name: row.__name ?? row.Name ?? row.name ?? "",
        companyName: row["Company Name"] ?? row.companyName ?? "",
        email: row.Email ?? row.email ?? "",
        phone: row.__phone ?? row.Phone ?? row.phone ?? "",
        address: row.Address ?? row.address ?? "",
        city: row.City ?? row.city ?? "",
        country: row.Country ?? row.country ?? "",
        openingBalance: Number(row["Opening Balance"] ?? row.openingBalance ?? 0) || 0,
        notes: row.Notes ?? row.notes ?? "",
        status: row.Status ?? row.status ?? "active",
      }));
      const res = await api.post("/vendors/createbulk", payload);
      const successCount = res.data?.createdCount ?? 0;
      const errorCount = res.data?.errorCount ?? 0;
      const errorDetails = res.data?.errors ?? [];
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (successCount === 0) {
        toast.error(
          errorCount > 0
            ? `Import failed: 0 vendors imported, ${errorCount} errors ❌`
            : "Import failed ❌",
        );
      } else if (errorCount > 0) {
        const detail = errorDetails.length ? ` (${errorDetails.map((e) => `row ${e.index}: ${e.message}`).join("; ")})` : "";
        toast.warning(`Imported ${successCount} vendors, ${errorCount} errors${detail}`);
      } else {
        toast.success(`Imported ${successCount} vendors ✅`);
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
    const templateRow = [Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]))];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "vendors-import-template.xlsx");
  };

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{Number(row.id) + 1}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    };
    const dynamicCols = (importColumns || []).map((col) => {
      const isNameCol = normalizeKey(col) === "name";
      const isPhoneCol = normalizeKey(col) === "phone";
      const isEmailCol = normalizeKey(col) === "email";
      return {
        id: col,
        header: col,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rowIndex = Number(row.id);
          const rowData = row.original;
          if (isNameCol) {
            const nameVal = (rowData[col] ?? "").toString().trim();
            const nameErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "name");
            const nameError = Boolean(nameErrorKey);
            const nameFulfilled = nameVal.length > 0 && !nameError;
            const nameErrorMsg = nameErrorKey
              ? (rowData.__errors[nameErrorKey] === "Already exists in DB"
                ? "Name already exists"
                : rowData.__errors[nameErrorKey] === "Duplicate in file"
                  ? "Duplicate in file"
                  : rowData.__errors[nameErrorKey] === "Required"
                    ? "Field is required"
                    : rowData.__errors[nameErrorKey])
              : "Field is required";
            return (
              <div
                className="flex items-center gap-1.5 min-w-[120px]"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${nameFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        aria-hidden
                      >
                        {nameFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {nameFulfilled ? "Field fulfilled" : nameErrorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  value={rowData[col] ?? ""}
                  onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder="Vendor name"
                />
              </div>
            );
          }
          if (isPhoneCol) {
            const phoneVal = (rowData[col] ?? "").toString().trim();
            const phoneErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "phone");
            const phoneError = Boolean(phoneErrorKey);
            const phoneFulfilled = phoneVal.length > 0 && !phoneError;
            const phoneErrorMsg = phoneErrorKey
              ? (rowData.__errors[phoneErrorKey] === "Required" ? "Field is required" : rowData.__errors[phoneErrorKey])
              : "Field is required";
            return (
              <div
                className="flex items-center gap-1.5 min-w-[100px]"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${phoneFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        aria-hidden
                      >
                        {phoneFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {phoneFulfilled ? "Field fulfilled" : phoneErrorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  value={rowData[col] ?? ""}
                  onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder="Phone"
                />
              </div>
            );
          }
          if (isEmailCol) {
            const emailVal = (rowData[col] ?? "").toString().trim();
            const emailErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "email");
            const emailError = Boolean(emailErrorKey);
            const emailFulfilled = !emailError;
            const emailErrorMsg = emailErrorKey
              ? (rowData.__errors[emailErrorKey] === "Duplicate email in file"
                ? "Duplicate email in file"
                : rowData.__errors[emailErrorKey] === "Email already in DB"
                  ? "Email already in database"
                  : rowData.__errors[emailErrorKey])
              : "";
            return (
              <div
                className="flex items-center gap-1.5 min-w-[100px]"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                {emailError ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
                          aria-hidden
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        {emailErrorMsg}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : emailVal ? (
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
                <Input
                  type="email"
                  value={rowData[col] ?? ""}
                  onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder="name@example.com"
                />
              </div>
            );
          }
          return (
            <Input
              value={rowData[col] ?? ""}
              onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              className="h-8 text-xs w-full min-w-0 max-w-[180px]"
              placeholder={col}
            />
          );
        },
      };
    });
    const statusCol = {
      id: "__status",
      header: "Status",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={
                    r.__status === "valid"
                      ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                      : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                  }
                >
                  {r.__status === "valid" ? "Valid" : "Error"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                {r.__status === "valid"
                  ? "Ready to import"
                  : (r.__statusMessage || "Validation error")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    };
    const actionsCol = {
      id: "__actions",
      header: "Actions",
      className: "w-[80px]",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleRemoveImportRow(Number(row.id))}
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    };
    return [indexCol, ...dynamicCols, statusCol, actionsCol];
  }, [importColumns, handleImportCellChange, handleRemoveImportRow]);

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredVendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
  };

  const vendorColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "companyName",
        header: "Company",
        accessorKey: "companyName",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.companyName || "—"}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.email || "—"}</span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.phone || "—"}</span>
        ),
      },
      {
        id: "city",
        header: "City",
        accessorKey: "city",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.city || "—"}</span>
        ),
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.country || "—"}</span>
        ),
      },
      {
        id: "openingBalance",
        header: "Balance",
        accessorKey: "openingBalance",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">{row.original.openingBalance ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.status || "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const v = row.original;
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
                      onClick={() => handleEdit(v)}
                      aria-label="Edit vendor"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit vendor</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(v._id)}
                      aria-label="Delete vendor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete vendor</TooltipContent>
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
    <div className="min-h-screen max-w-full overflow-x-hidden">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <div className="min-w-0">
          <Drawer
            direction="right"
            open={vendorDrawerOpen}
            onOpenChange={setVendorDrawerOpen}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0">
                Vendors List ({filteredVendors.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                {selectedVendorIds.length > 0 && (
                  <div className="w-full sm:w-auto min-w-0">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") {
                          if (selectedVendorIds.length === 1) {
                            confirmDelete(selectedVendorIds[0]);
                          } else {
                            setBulkDeleteOpen(true);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[170px] whitespace-nowrap">
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
                        className="px-3 sm:px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer whitespace-nowrap text-sm sm:text-base"
                      >
                        Import Excel
                      </Label>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh] w-full max-w-[100vw]">
                      <DrawerHeader className="border-b px-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <DrawerTitle>Bulk Vendor Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple vendors.
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
                            description="Upload bulk vendor file"
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
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddImportRow}
                                >
                                  Add row
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Valid: {importStats.valid} | Errors: {importStats.errors}
                                {importStats.duplicates > 0 && ` | Duplicates: ${importStats.duplicates}`}
                              </p>
                            </div>
                            <div className="border w-full rounded-md max-h-80 overflow-auto">
                              <DataTable
                                columns={importTableColumns}
                                data={importRows}
                                enableSelection={false}
                                addPagination={false}
                                pageSize={5}
                                getRowId={(row, index) => String(index)}
                                containerClassName="flex flex-col overflow-hidden rounded-none border-0 bg-background min-h-[200px] max-h-[320px]"
                                enableHeaderContextMenu={false}
                              />
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
                  <Label
                    variant="success"
                    onClick={handleExport}
                    className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                  >
                    Export Excel
                  </Label>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                      if (!editingId) resetForm();
                      setVendorDrawerOpen(true);
                    }}
                  // className="bg-black text-white shadow hover:bg-black/90 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                  >
                    Add New Vendor
                  </Button>
                </div>
              </div>
            </div>
            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div>
                    <DrawerTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DrawerTitle>
                    <DrawerDescription>
                      {editingId ? "Update the vendor details." : "Fill in the details below to add a new vendor."}
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
                      ✕
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6 sm:pb-8">
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
                      placeholder="name@example.com"
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
                  <Field className="md:col-span-2">
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
                    <InputGroup>
                      <InputGroupInput
                        type="number"
                        name="openingBalance"
                        placeholder="Opening Balance"
                        value={form.openingBalance}
                        onChange={handleChange}
                      />
                      <InputGroupAddon>
                        <span className="text-sm font-medium text-black">
                          {currency}
                        </span>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <UiSelect
                      value={form.status}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
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
                    </UiSelect>
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea
                      name="notes"
                      placeholder="Notes"
                      value={form.notes}
                      onChange={handleChange}
                      className="h-24"
                    />
                  </Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center flex-wrap md:col-span-2">
                    <Button type="submit" variant="default" disabled={loading} className="w-full sm:w-auto">
                      {loading ? "Please wait..." : editingId ? "Update Vendor" : "Add Vendor"}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={resetForm}
                      className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md w-full sm:w-auto"
                    >
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="w-full sm:w-auto sm:ml-auto">Cancel</Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="w-full min-w-0 flex-5">
                <Input
                  type="text"
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto min-w-0 sm:min-0 flex-1">
                <UiSelect
                  value={customItemsPerPage !== "" ? "custom" : (effectiveItemsPerPage <= 100 && [10, 20, 50, 100].includes(effectiveItemsPerPage) ? String(effectiveItemsPerPage) : "10")}
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                  className="w-full"
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
                </UiSelect>
              </div>
            </div>
          </div>

          {vendorsLoading ? (
            <div className="flex justify-center items-center py-10"><Loader /></div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={vendorColumns}
                data={filteredVendors}
                pageSize={effectiveItemsPerPage}
                getRowId={(row) => row._id}
                rowSelection={tableRowSelection}
                onRowSelectionChange={setTableRowSelection}
                onSelectionChange={(rows) => setSelectedVendorIds(rows.map((r) => r._id))}
              />
            </div>
          )}
        </div>
      </div>
      <DeleteModel
        title="Delete vendor?"
        description="This vendor will be deleted permanently. This action cannot be undone."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDeleteConfirmed}
        loading={loading}
      />
      <DeleteModel
        title="Delete selected vendors?"
        description={`This will permanently delete ${selectedVendorIds.length} vendor(s). This action cannot be undone.`}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={handleBulkDeleteConfirmed}
        loading={bulkDeleteLoading}
      />
    </div>
  );
};

export default Vendors;
