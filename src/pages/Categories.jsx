import React, { useState, useRef, useMemo } from "react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
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
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { useImageModal } from "@/context/ImageModalContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

const TEMPLATE_COLUMNS = ["Name"];

const normalizeCategoryName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const Categories = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const navigate = useNavigate();
  const { openImageModal } = useImageModal();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
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
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories/getallcount");
      return res.data?.categories ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/categories/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category created successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setCategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error("Failed to create category ❌");
      }
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
        const trimmedName = name.trim();
        toast.error(
          trimmedName
            ? `Category "${trimmedName}" already exists ❌`
            : "Category already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create category. Please try again ❌");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/categories/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category updated successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setCategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error("Failed to update category ❌");
      }
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
        const trimmedName = name.trim();
        toast.error(
          trimmedName
            ? `Category "${trimmedName}" already exists ❌`
            : "Category already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update category. Please try again ❌");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/categories/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } else {
        toast.error("Failed to delete category ❌");
      }
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
          "Cannot delete category because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to delete category. Please try again ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleClick = (id) => {
    navigate(`/products/filter/category/${id}`);
  };

  const handleClearForm = () => {
    setName("");
    setImage(null);
    setPreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Category name is required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Category name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Category name must be at most 50 characters ❌");
      return;
    }

    const normalizedNewName = normalizeCategoryName(trimmedName);

    const hasDuplicateOnCreate =
      !editingId &&
      categories.some(
        (c) => normalizeCategoryName(c.name) === normalizedNewName,
      );

    if (hasDuplicateOnCreate) {
      toast.error(`Category "${trimmedName}" already exists ❌`);
      return;
    }

    if (editingId) {
      const hasDuplicateOnUpdate = categories.some(
        (c) =>
          c._id !== editingId &&
          normalizeCategoryName(c.name) === normalizedNewName,
      );

      if (hasDuplicateOnUpdate) {
        toast.error(
          `Another category with name "${trimmedName}" already exists ❌`,
        );
        return;
      }
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    if (image) formData.append("image", image);

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (cat) => {
    setName(cat.name);
    setEditingId(cat._id);
    setPreview(cat.image ? resolveImageUrl(cat.image) : null);
    setImage(null);
    setCategoryDrawerOpen(true);
    toast.info(`Editing Category: ${cat.name}`);
    setTimeout(() => {
      if (nameInputRef.current) nameInputRef.current.focus();
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

  const handleBulkDeleteConfirmed = async () => {
    if (!selectedCategoryIds.length) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkDeleteOpen(false);
    for (const id of selectedCategoryIds) {
      try {
        await api.delete(`/categories/delete/${id}`);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message;
        toast.error(`Failed to delete one category: ${msg}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    const count = selectedCategoryIds.length;
    setSelectedCategoryIds([]);
    setTableRowSelection({});
    toast.success(`Deleted ${count} categories`);
  };

  const handleDropFile = (file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file ❌");
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeInMB} MB ❌`);
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file ❌");
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeInMB} MB ❌`);
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const filteredCategories = useMemo(
    () =>
      (categories || []).filter((c) =>
        (c.name || "").toLowerCase().includes(search.toLowerCase())
      ),
    [categories, search]
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }
    const nameKeyRef = Object.keys(rows[0] || {}).find((k) =>
      ["name"].includes(normalizeKey(k))
    );
    const seenInFile = new Set();
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => ["name"].includes(normalizeKey(k))) ?? nameKeyRef ?? null;
      const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const fieldErrors = {};
      let statusMessage = "";
      if (!name) {
        fieldErrors[nameKey || "Name"] = "Required";
        statusMessage = "Name required";
      } else {
        const norm = normalizeCategoryName(name);
        if (seenInFile.has(norm)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = "Duplicate in file";
        } else {
          seenInFile.add(norm);
        }
        const existsInDb = categories.some(
          (c) => normalizeCategoryName(c.name) === norm
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
        __name: name,
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

  const handleImportCellChange = (rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r
      );
      return validateImportedRows(next);
    });
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
      const allColumns = Object.keys(rows[0] || {});
      setImportColumns(allColumns);
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
      const payload = validRows.map(({ __errors, __status, __name, ...rest }) => ({
        ...rest,
        name: __name,
      }));
      await api.post("/categories/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Imported ${payload.length} categories ✅`);
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
          ? `Bulk import failed: ${messageFromServer} ❌`
          : "Bulk import failed ❌",
      );
      console.error("Bulk import error:", err?.response?.data || err?.message);
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
    XLSX.writeFile(wb, "categories-import-template.xlsx");
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredCategories.map((c) => ({
        "Name": c.name,
        "Product Count": c.productCount ?? 0,
        "Created At": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
        "Updated At": c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
    XLSX.writeFile(workbook, "categories.xlsx");
  };

  const categoryColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        className: "text-center",
      },
      {
        id: "image",
        header: "Image",
        accessorKey: "image",
        cell: ({ row }) => {
          const cat = row.original;
          if (!cat.image) {
            return <span className="text-gray-400 italic">No Image</span>;
          }
          return (
            <div className="flex items-center justify-center">
              <img
                src={resolveImageUrl(cat.image)}
                alt={cat.name}
                onClick={() => openImageModal(resolveImageUrl(cat.image))}
                className="w-24 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
              />
            </div>
          );
        },
      },
      {
        id: "name",
        header: "Category Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "productCount",
        header: "Product Count",
        accessorKey: "productCount",
        cell: ({ row }) => {
          const cat = row.original;
          return (
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleClick(cat._id)}
              onKeyDown={(e) => e.key === "Enter" && handleClick(cat._id)}
              className="w-full h-full min-h-[40px] flex items-center justify-center font-medium text-blue-600 hover:underline cursor-pointer"
            >
              {cat.productCount ?? 0}
            </div>
          );
        },
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
        id: "updatedAt",
        header: "Updated At",
        accessorKey: "updatedAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleDateString()
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
            <div className="flex items-center justify-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(cat)}
                aria-label="Edit category"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => confirmDelete(cat._id)}
                aria-label="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [openImageModal]
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        {/* Header + Actions - same structure as Products */}
        <div className="">
          <Drawer
            direction="right"
            open={categoryDrawerOpen}
            onOpenChange={setCategoryDrawerOpen}
          >
            <div className="flex justify-between items-center">
              <h2 className="flex-2 text-2xl font-semibold text-gray-700">
                Categories List ({filteredCategories.length})
              </h2>
              <div className="flex flex-1 w-full gap-4 items-center">
                {selectedCategoryIds.length > 0 && (
                  <div className="flex-1">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") setBulkDeleteOpen(true);
                      }}

                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Bulk actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Select action</SelectLabel>
                          <SelectItem value="bulk-delete">Bulk delete</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </div>
                )}
                <div className="flex-1 flex items-center gap-2 shrink-0">
                  <Drawer
                    open={importDrawerOpen}
                    onOpenChange={setImportDrawerOpen}
                  >
                    <DrawerTrigger asChild>
                      <Label
                        variant="light"
                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer whitespace-nowrap"
                      >
                        Import Excel
                      </Label>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh]">
                      <DrawerHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <DrawerTitle>Bulk Category Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple categories.
                            </DrawerDescription>
                          </div>
                          <DrawerClose asChild>
                            <Button variant="outline" size="icon">
                              ✕
                            </Button>
                          </DrawerClose>
                        </div>
                      </DrawerHeader>
                      <div className="no-scrollbar overflow-y-auto px-6 py-4 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3">
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
                            description="Upload bulk category file"
                            maxSize={10 * 1024 * 1024}
                            onFileSelect={handleImportFileSelected}
                          />
                        </div>
                        {importRows.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                Preview ({importStats.total} rows)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Valid: {importStats.valid} | Errors: {importStats.errors}
                                {importStats.duplicates > 0 && ` | Duplicates: ${importStats.duplicates}`}
                              </p>
                            </div>
                            <div className="border w-full rounded-md max-h-80 overflow-auto">
                              <div className="min-w-max">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>#</TableHead>
                                      {/* <TableHead>Name</TableHead> */}
                                      {importColumns.map((col) => (
                                        <TableHead
                                          className="whitespace-nowrap w-auto"
                                          key={col}
                                        >
                                          {col}
                                        </TableHead>
                                      ))}
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {importRows.map((row, rowIndex) => (
                                      <TableRow key={rowIndex}>
                                        <TableCell className="text-xs text-muted-foreground">
                                          {rowIndex + 1}
                                        </TableCell>
                                        {/* <TableCell className="text-xs">
                                        {row.__name ?? row.Name ?? row.name ?? "—"}
                                      </TableCell> */}
                                        {importColumns.map((col) => {
                                          const isNameCol = normalizeKey(col) === "name";
                                          return (
                                            <TableCell key={col} className="text-xs">
                                              {isNameCol ? (
                                                <Input
                                                  value={row[col] ?? ""}
                                                  onChange={(e) =>
                                                    handleImportCellChange(rowIndex, col, e.target.value)
                                                  }
                                                  className="h-8 text-xs min-w-[120px]"
                                                  placeholder="Category name"
                                                />
                                              ) : (
                                                String(row[col] ?? "")
                                              )}
                                            </TableCell>
                                          );
                                        })}
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
                          </div>
                        )}
                      </div>
                      <DrawerFooter className="border-t">
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
                </div>
                <Label
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md cursor-pointer whitespace-nowrap "
                >
                  Export Excel
                </Label>
                <Button
                  variant="default"
                  onClick={() => {
                    handleClearForm();
                    setCategoryDrawerOpen(true);
                  }}
                >
                  Add New Category
                </Button>
              </div>
            </div>

            {/* Right-side drawer: Add/Edit Category form */}
            <DrawerContent className="ml-auto h-full max-w-3xl">
              <DrawerHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DrawerTitle>
                      {editingId ? "Edit Category" : "Add New Category"}
                    </DrawerTitle>
                    <DrawerDescription>
                      {editingId
                        ? "Update the category details."
                        : "Fill in the details below to add a new category."}
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
                      ✕
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-6"
                >
                  <Field>
                    <FieldLabel htmlFor="category-name">Name</FieldLabel>
                    <Input
                      id="category-name"
                      type="text"
                      placeholder="Category Name"
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Image</FieldLabel>
                    <ImageUploadDropzone
                      onFileSelect={handleDropFile}
                      previewUrl={preview}
                      className="mt-1"
                      accept="image/*"
                    />
                    {preview && (
                      <div className="mt-2">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </Field>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button type="submit" variant="default" disabled={loading}>
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
                      className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md"
                    >
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="ml-auto">
                        Cancel
                      </Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Table section - same layout as Products */}
        <div className="">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-3 w-full">
                <Input
                  type="text"
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <UiSelect
                  value={effectiveItemsPerPage <= 100 && [5, 10, 20, 50, 100].includes(effectiveItemsPerPage) ? String(effectiveItemsPerPage) : "custom"}
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
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
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        placeholder="e.g. 25"
                        className="h-8 w-full text-sm"
                        value={customItemsPerPage}
                        onChange={(e) => setCustomItemsPerPage(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        onKeyDown={(e) => e.stopPropagation()}
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
            <div className="overflow-x-auto">
              <DataTable
                columns={categoryColumns}
                data={filteredCategories}
                pageSize={effectiveItemsPerPage}
                rowSelection={tableRowSelection}
                onRowSelectionChange={setTableRowSelection}
                onSelectionChange={(rows) => setSelectedCategoryIds(rows.map((r) => r._id))}
              />
            </div>
          )}
        </div>
      </div>

      <DeleteModel title="Delete category?" description="This action cannot be undone. This will permanently delete the selected category." onDelete={handleDeleteConfirmed} open={deleteOpen} onOpenChange={setDeleteOpen} loading={loading} />

      <DeleteModel title="Delete categories?" description="This action cannot be undone. This will permanently delete the selected categories." onDelete={handleBulkDeleteConfirmed} open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} loading={loading} />
    </div>
  );
};

export default Categories;
