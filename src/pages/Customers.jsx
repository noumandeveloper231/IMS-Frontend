import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Edit, Trash2, Plus, Search, Check, X } from "lucide-react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { DeleteModel } from "@/components/DeleteModel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/UI/data-table";
import { Label } from "@/components/UI/label";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/UI/tooltip";
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
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
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
import { useSearchParams } from "react-router-dom";

const TEMPLATE_COLUMNS = [
  "Name",
  "Phone",
  "Email",
  "Address",
  "City",
  "Country",
  "Notes",
];

const EMPTY_ARRAY = [];

const Customers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
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
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
    duplicates: 0,
  });
  const [importLoading, setImportLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedCustomerId, setHighlightedCustomerId] = useState(null);

  const customersRef = useRef(EMPTY_ARRAY);
  const customerDrawerOpenRef = useRef(customerDrawerOpen);

  const queryClient = useQueryClient();

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!Number.isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["customers", page, effectiveItemsPerPage, search],
    queryFn: async () => {
      const res = await api.get("/customers", {
        params: { page, limit: effectiveItemsPerPage, search },
      });
      const customersData = res.data.data || res.data;
      const paginationData = res.data.pagination || { total: 0, pages: 1 };
      return { customers: customersData ?? EMPTY_ARRAY, pagination: paginationData };
    },
    keepPreviousData: true,
  });

  const customers = data?.customers ?? EMPTY_ARRAY;
  const pagination = data?.pagination ?? { total: 0, pages: 1 };
  customersRef.current = customers;

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId || isLoading || isFetching || customers.length === 0) return;
    const highlightedCustomer = customers.find((c) => c._id === highlightId);
    if (!highlightedCustomer) return;

    setHighlightedCustomerId(highlightedCustomer._id);
    requestAnimationFrame(() => {
      const rowEl = document.querySelector(
        `[data-highlight-target="${highlightedCustomer._id}"]`,
      );
      rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("highlight");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, isLoading, isFetching, customers]);

  useEffect(() => {
    if (!highlightedCustomerId) return;
    const timer = setTimeout(() => setHighlightedCustomerId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedCustomerId]);

  useEffect(() => {
    customerDrawerOpenRef.current = customerDrawerOpen;
  }, [customerDrawerOpen]);

  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      if (customerDrawerOpenRef.current) return;
      e.preventDefault();
      setImportDrawerOpen(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      if (customerDrawerOpenRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (customerDrawerOpenRef.current) return;
      if (e.relatedTarget != null && document.body.contains(e.relatedTarget)) return;
      setImportDrawerOpen(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      if (customerDrawerOpenRef.current) return;
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

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateFileColumns = (rows) => {
    if (!rows.length) {
      return { ok: false, message: "File is empty." };
    }
    const first = rows[0] || {};
    const keys = Object.keys(first);
    const normalized = keys.map((k) => normalizeKey(k));
    if (!normalized.includes("name")) {
      return {
        ok: false,
        message:
          "File does not contain the required column 'Name'. Please use the template.",
      };
    }
    return { ok: true };
  };

  const normalizeRowToTemplate = (row) => {
    const keys = Object.keys(row || {});
    const findVal = (target) => {
      const key = keys.find((k) => normalizeKey(k) === target);
      return key ? String(row[key] ?? "").trim() : "";
    };
    return {
      Name: findVal("name"),
      Phone: findVal("phone"),
      Email: findVal("email"),
      Address: findVal("address"),
      City: findVal("city"),
      Country: findVal("country"),
      Notes: findVal("notes"),
    };
  };

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }

    const seenInFile = new Set();
    const validated = rows.map((row) => {
      const name = String(row.Name ?? "").trim();
      const phone = String(row.Phone ?? "").trim();
      const email = String(row.Email ?? "").trim();

      const fieldErrors = {};
      let statusMessage = "";

      if (!name) {
        fieldErrors.Name = "Required";
        statusMessage = "Name required";
      } else if (name.length < 2) {
        fieldErrors.Name = "Name must be at least 2 characters long";
        statusMessage = "Name too short";
      }

      if (email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          fieldErrors.Email = "Invalid email";
          statusMessage = statusMessage || "Invalid email";
        } else {
          const emailLower = email.toLowerCase();
          const existsInDbByEmail = (customersRef.current || []).some(
            (c) => (c.email || "").toLowerCase() === emailLower,
          );
          if (existsInDbByEmail) {
            fieldErrors.Email = "Email already exists in database";
            statusMessage = statusMessage || "Email already in database";
          }
        }
      }

      if (name && phone) {
        const key = `${name.toLowerCase()}|${phone}`;
        if (seenInFile.has(key)) {
          fieldErrors.Phone = "Duplicate Name + Phone in file";
          statusMessage = statusMessage || "Duplicate in file";
        } else {
          seenInFile.add(key);
        }

        const existsInDbByNamePhone = (customersRef.current || []).some(
          (c) =>
            (c.name || "").trim().toLowerCase() === name.toLowerCase() &&
            (c.phone || "").trim() === phone,
        );
        if (existsInDbByNamePhone && !fieldErrors.Phone) {
          fieldErrors.Phone = "Name + Phone already exists in database";
          statusMessage = statusMessage || "Already in database";
        }
      }

      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";

      return {
        ...row,
        __name: name,
        __phone: phone,
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
          r.__statusMessage === "Email already in database"),
    ).length;

    setImportStats({
      total: rows.length,
      valid,
      errors,
      duplicates,
    });
    return validated;
  };

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r,
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleRemoveImportRow = (rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    toast.info("Import data cleared");
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    const templateRow = [
      Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""])),
    ];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "customers-import-template.xlsx");
  };

  const handleImportFileSelected = async (fileOrFiles) => {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        defval: "",
      });
      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return;
      }
      const colCheck = validateFileColumns(rows);
      if (!colCheck.ok) {
        toast.error(`${colCheck.message} ❌`);
        return;
      }
      const normalizedRows = rows.map((r) => normalizeRowToTemplate(r));
      setImportColumns(TEMPLATE_COLUMNS);
      const validatedRows = validateImportedRows(normalizedRows);
      setImportRows(validatedRows);
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
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
      const payload = validRows.map(
        ({ __errors, __status, __statusMessage, __name, __phone, ...rest }) => ({
          name: __name,
          phone: __phone || rest.Phone || "",
          email: rest.Email || "",
          address: rest.Address || "",
          city: rest.City || "",
          country: rest.Country || "",
          notes: rest.Notes || "",
        }),
      );
      await api.post("/customers/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Imported ${payload.length} customers ✅`);
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

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      (customers || []).map((c) => {
        const rawTotal = c.totalSpent;
        const formattedTotal =
          typeof rawTotal === "number"
            ? rawTotal.toFixed(2)
            : rawTotal && !Number.isNaN(Number(rawTotal))
              ? Number(rawTotal).toFixed(2)
              : "0.00";
        return {
          Name: c.name,
          Phone: c.phone || "",
          Email: c.email || "",
          Address: c.address || "",
          City: c.city || "",
          Country: c.country || "",
          "Total Spent (AED)": formattedTotal,
          "Created At": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
          "Updated At": c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "",
        };
      }),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "Customers.xlsx");
  };

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {Number(row.id) + 1}
        </span>
      ),
    };

    const dynamicCols = (importColumns.length ? importColumns : TEMPLATE_COLUMNS).map(
      (col) => {
        const isNameCol = normalizeKey(col) === "name";
        return {
          id: col,
          header: col,
          cell: ({ row }) => {
            const rowIndex = Number(row.id);
            const rowData = row.original;

            if (isNameCol) {
              const nameVal = (rowData[col] ?? "").toString().trim();
              const nameErrorKey =
                rowData.__errors &&
                Object.keys(rowData.__errors).find(
                  (k) => normalizeKey(k) === "name",
                );
              const nameError = Boolean(nameErrorKey);
              const nameFulfilled = nameVal.length > 0 && !nameError;
              const nameErrorMsg = nameErrorKey
                ? rowData.__errors[nameErrorKey] === "Already exists in DB"
                  ? "Name already exists"
                  : rowData.__errors[nameErrorKey] === "Duplicate in file"
                    ? "Duplicate in file"
                    : rowData.__errors[nameErrorKey] === "Required"
                      ? "Field is required"
                      : rowData.__errors[nameErrorKey]
                : "Field is required";

              return (
                <div
                  className="flex items-center gap-2 min-w-0"
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                >
                  <Input
                    value={rowData[col] ?? ""}
                    onChange={(e) =>
                      handleImportCellChange(rowIndex, col, e.target.value)
                    }
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === " " || e.key === "Tab") {
                        e.preventDefault();
                        const input = e.target;
                        const start = input.selectionStart ?? input.value.length;
                        const end = input.selectionEnd ?? input.value.length;
                        const v = (rowData[col] ?? "").toString();
                        const insert = e.key === "Tab" ? "\t" : " ";
                        const newValue = v.slice(0, start) + insert + v.slice(end);
                        handleImportCellChange(rowIndex, col, newValue);
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            const pos = start + insert.length;
                            input.selectionStart = pos;
                            input.selectionEnd = pos;
                          });
                        });
                      }
                    }}
                    onKeyUp={(e) => e.stopPropagation()}
                    className="h-8 text-xs flex-1 min-w-0"
                    placeholder="Customer name"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${nameFulfilled
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-red-100 text-red-600"
                            }`}
                          aria-hidden
                        >
                          {nameFulfilled ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        {nameFulfilled ? "Field fulfilled" : nameErrorMsg}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            }

            const value = (rowData[col] ?? "").toString();
            const error = rowData.__errors?.[col];
            const fulfilled = value.trim().length > 0 && !error;
            const errorMsg = error || "Field is required";
            return (
              <div className="flex items-center gap-2 min-w-0">
                <Input
                  value={rowData[col] ?? ""}
                  onChange={(e) =>
                    handleImportCellChange(rowIndex, col, e.target.value)
                  }
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder={col}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${fulfilled
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600"
                          }`}
                        aria-hidden
                      >
                        {fulfilled ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {fulfilled ? "Field fulfilled" : errorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          },
        };
      },
    );

    const statusCol = {
      id: "__status",
      header: "Status",
      cell: ({ row }) => {
        const r = row.original;
        const isValid = r.__status === "valid";
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={
                    isValid
                      ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                      : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                  }
                >
                  {isValid ? "Valid" : "Error"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                {isValid
                  ? "Ready to import"
                  : r.__statusMessage || "Validation error"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    };

    const actionsCol = {
      id: "__actions",
      header: "Actions",
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
  }, [importColumns, handleImportCellChange]);

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
              <Drawer
                open={importDrawerOpen}
                onOpenChange={setImportDrawerOpen}
              >
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
                        <DrawerTitle>Bulk Customer Import</DrawerTitle>
                        <DrawerDescription>
                          Upload CSV or Excel file to create multiple customers.
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
                          Supported formats:{" "}
                          <span className="font-medium">.csv, .xlsx</span>
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
                        description="Upload bulk customer file"
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
                            Valid: {importStats.valid} | Errors:{" "}
                            {importStats.errors}
                            {importStats.duplicates > 0 &&
                              ` | Duplicates: ${importStats.duplicates}`}
                          </p>
                        </div>
                        <div className="border w-full rounded-md max-h-80 overflow-auto">
                          <DataTable
                            columns={importTableColumns}
                            data={importRows}
                            enableSelection={false}
                            addPagination={false}
                            pageSize={5}
                            getRowId={(_row, index) => String(index)}
                            containerClassName="flex flex-col overflow-hidden rounded-none border-none bg-background min-h-[200px] max-h-[320px]"
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
                          {importLoading
                            ? "Importing..."
                            : "Import Valid Only"}
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

          {/* Customers table controls (rows per page selector) */}
          <div className="mt-4 w-full">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="relative w-full flex-5">
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
              <div className="w-full sm:w-auto min-w-0 flex-1 sm:justify-end sm:flex">
                <UiSelect
                  value={
                    customItemsPerPage !== ""
                      ? "custom"
                      : effectiveItemsPerPage <= 100 &&
                        [10, 20, 50, 100].includes(effectiveItemsPerPage)
                        ? String(effectiveItemsPerPage)
                        : "10"
                  }
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    const next = Number(value);
                    setItemsPerPage(next);
                    setCustomItemsPerPage("");
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="custom" disabled>
                        Custom
                        {customItemsPerPage
                          ? ` (${effectiveItemsPerPage})`
                          : ""}
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <div
                      className="px-2 py-2"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                        Custom
                      </p>
                      <CustomRowsPerPageInput
                        type="number"
                        min={1}
                        max={500}
                        placeholder="e.g. 25"
                        className="h-8 w-full text-sm"
                        value={customItemsPerPage}
                        onChange={(value) => {
                          setCustomItemsPerPage(value);
                          setPage(1);
                        }}
                        autoFocus
                      />
                    </div>
                  </SelectContent>
                </UiSelect>
              </div>
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

        <DataTable
          columns={customerColumns}
          data={customers}
          isLoading={tableLoading}
          addPagination={false}
          getRowProps={(row) => ({
            "data-highlight-target": row.original?._id,
            className:
              row.original?._id === highlightedCustomerId
                ? "search-highlight-row"
                : "",
          })}
        />
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
