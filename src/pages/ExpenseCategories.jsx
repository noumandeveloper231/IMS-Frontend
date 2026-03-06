import React, { useMemo, useState, useCallback, useRef } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { DeleteModel } from "@/components/DeleteModel";
import { DataTable } from "@/components/UI/data-table";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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

const TEMPLATE_COLUMNS = ["Name", "Description"];
const REQUIRED_FILE_COLUMNS = ["Name"];

const normalizeKey = (key) =>
  key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const ExpenseCategories = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const nameInputRef = useRef(null);

  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
  });
  const [importLoading, setImportLoading] = useState(false);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!Number.isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["expenseCategories"],
    queryFn: async () => {
      const res = await api.get("/expense-categories/getall");
      return res.data?.categories ?? res.data ?? [];
    },
  });

  const categories = categoriesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/expense-categories/create", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || "Expense category created successfully ✅",
      );
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      handleClearForm();
      setDrawerOpen(false);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer ||
        "Unable to create expense category. Please try again ❌",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/expense-categories/update/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || "Expense category updated successfully ✅",
      );
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      handleClearForm();
      setDrawerOpen(false);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer ||
        "Unable to update expense category. Please try again ❌",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/expense-categories/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.message || "Expense category deleted successfully ✅",
      );
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer ||
        "Unable to delete expense category. Please try again ❌",
      );
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleClearForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Category name is required ❌");
      return;
    }

    const payload = {
      name: trimmedName,
      description: description.trim(),
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setName(category.name || "");
    setDescription(category.description || "");
    setDrawerOpen(true);
    toast.info(`Editing expense category: ${category.name}`);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const filteredCategories = useMemo(
    () =>
      (categories || []).filter((c) =>
        (c.name || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [categories, search],
  );

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredCategories.map((cat) => ({
        Name: cat.name || "",
        Description: cat.description || "",
        "Created At": cat.createdAt
          ? new Date(cat.createdAt).toLocaleDateString()
          : "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ExpenseCategories");
    XLSX.writeFile(workbook, "Expense-categories.xlsx");
  };

  const validateFileColumns = (rows) => {
    if (!rows.length) return { ok: false, message: "File is empty." };
    const first = rows[0];
    const keys = Object.keys(first || {});
    const normalized = keys.map((k) => normalizeKey(k));
    const hasName = normalized.includes("name");
    if (!hasName) {
      return {
        ok: false,
        message:
          "File must contain 'Name' column. Please use the template.",
      };
    }
    return { ok: true };
  };

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0 });
      return [];
    }

    const nameKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "name",
    );
    const descriptionKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "description",
    );

    const seenInFile = new Set();

    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => normalizeKey(k) === "name") ??
        nameKeyRef ??
        null;
      const descriptionKey =
        Object.keys(row).find((k) => normalizeKey(k) === "description") ??
        descriptionKeyRef ??
        null;

      const rawName = nameKey ? String(row[nameKey] ?? "") : "";
      const nameVal = rawName.trim();
      const descVal = descriptionKey ? String(row[descriptionKey] ?? "") : "";

      const fieldErrors = {};
      let statusMessage = "";

      if (!nameVal) {
        fieldErrors[nameKey || "Name"] = "Name is required";
        statusMessage = "Name is required";
      }

      if (nameVal && !fieldErrors[nameKey || "Name"]) {
        const norm = normalizeName(nameVal);
        if (seenInFile.has(norm)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = "Duplicate in file";
        } else {
          seenInFile.add(norm);
        }
        const existsInDb = categories.some(
          (c) => normalizeName(c.name) === norm,
        );
        if (existsInDb && !fieldErrors[nameKey || "Name"]) {
          fieldErrors[nameKey || "Name"] = "Already exists in DB";
          statusMessage = "Already in database";
        }
      }

      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstErrorKey = Object.keys(fieldErrors)[0];
      const firstError = firstErrorKey ? fieldErrors[firstErrorKey] : "";

      return {
        ...row,
        __name: nameVal,
        __description: descVal,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
      };
    });

    const valid = validated.filter((r) => r.__status === "valid").length;
    const errors = validated.filter((r) => r.__status === "error").length;

    setImportStats({ total: rows.length, valid, errors });
    return validated;
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
        setImportStats({ total: 0, valid: 0, errors: 0 });
        return;
      }

      const colCheck = validateFileColumns(rows);
      if (!colCheck.ok) {
        toast.error(`${colCheck.message} ❌`);
        return;
      }

      const firstRowKeys = Object.keys(rows[0] || {});
      setImportColumns(firstRowKeys);
      const validatedRows = validateImportedRows(rows);
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
    XLSX.writeFile(wb, "Expense-categories-import-template.xlsx");
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0 });
    toast.info("Import data cleared");
  };

  const handleAddImportRow = () => {
    const newRow = Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
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
        ({ __errors, __status, __name, __description }) => ({
          name: __name,
          description: __description || "",
        }),
      );
      await api.post("/expense-categories/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["expenseCategories"] });
      toast.success(`Imported ${payload.length} expense categories ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0 });
    } catch (err) {
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Bulk import failed: ${messageFromServer} ❌`
          : "Bulk import failed ❌",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r,
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleRemoveImportRow = useCallback((rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  }, []);

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {Number(row.id) + 1}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dynamicCols = (importColumns || []).map((col) => ({
      id: col,
      header: col,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const rowIndex = Number(row.id);
        const rowData = row.original;
        return (
          <Input
            value={rowData[col] ?? ""}
            onChange={(e) =>
              handleImportCellChange(rowIndex, col, e.target.value)
            }
            className="h-8 text-xs"
          />
        );
      },
    }));

    const statusCol = {
      id: "__status",
      header: "Status",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        const isValid = r.__status === "valid";
        return (
          <span
            className={
              isValid
                ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
            }
          >
            {isValid ? "Valid" : "Error"}
          </span>
        );
      },
    };

    const actionsCol = {
      id: "__actions",
      header: "Actions",
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
          ✕
        </Button>
      ),
    };

    return [indexCol, ...dynamicCols, statusCol, actionsCol];
  }, [importColumns, handleImportCellChange, handleRemoveImportRow]);

  const columns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        className: "text-center",
      },
      {
        id: "name",
        header: "Category Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        accessorKey: "description",
        cell: ({ row }) => <span>{row.original.description || "-"}</span>,
      },
      {
        id: "createdAt",
        header: "Created At",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const cat = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(cat)}
                aria-label="Edit expense category"
              >
                ✏️
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => confirmDelete(cat._id)}
                aria-label="Delete expense category"
              >
                🗑
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <div className="min-w-0">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}
            direction="right"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold truncate min-w-0">
                Expense Categories List ({filteredCategories.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center shrink-0">
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
                            <DrawerTitle>Bulk Expense Category Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple
                              expense categories.
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
                              <span className="font-medium">
                                .csv, .xlsx
                              </span>
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
                            description="Upload bulk expense category file"
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
                                Valid: {importStats.valid} | Errors:{" "}
                                {importStats.errors}
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
                                containerClassName="flex flex-col overflow-hidden rounded-none border-none bg-background min-h-[200px] max-h-[320px]"
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
                </div>
                <Label
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Export Excel
                </Label>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => {
                    handleClearForm();
                    setDrawerOpen(true);
                  }}
                  className="bg-black text-white shadow hover:bg-black/90 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Add New Expense Category
                </Button>
              </div>
            </div>

            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <DrawerTitle>
                      {editingId ? "Edit Expense Category" : "Add New Expense Category"}
                    </DrawerTitle>
                    <DrawerDescription>
                      {editingId
                        ? "Update the expense category details."
                        : "Fill in the details below to add a new expense category."}
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
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-6"
                >
                  <Field>
                    <FieldLabel htmlFor="expense-category-name">Name</FieldLabel>
                    <Input
                      id="expense-category-name"
                      type="text"
                      placeholder="Expense Category Name"
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expense-category-description">
                      Description
                    </FieldLabel>
                    <textarea
                      id="expense-category-description"
                      placeholder="Description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center flex-wrap">
                    <Button
                      type="submit"
                      variant="default"
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      {loading
                        ? "Please wait..."
                        : editingId
                          ? "Update Category"
                          : "Add Category"}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleClearForm}
                      className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md w-full sm:w-auto"
                    >
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto sm:ml-auto"
                      >
                        Cancel
                      </Button>
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
                  placeholder="Search expense categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto min-w-0 flex-1">
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
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                  className="w-full"
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
                        onChange={setCustomItemsPerPage}
                        autoFocus
                      />
                    </div>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>

          {categoriesLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <DataTable
                columns={columns}
                data={filteredCategories}
                pageSize={effectiveItemsPerPage}
              />
            </div>
          )}
        </div>
      </div>

      <DeleteModel
        title="Delete expense category?"
        description="This action cannot be undone. This will permanently delete the selected expense category."
        onDelete={handleDeleteConfirmed}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={loading}
      />
    </div>
  );
};

export default ExpenseCategories;

