import React, { useState, useRef, useMemo } from "react";
import api from "../utils/api";
import { ChevronDown, Check, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/UI/command";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
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
import { cn } from "@/lib/utils";

function CategoryCombobox({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  clearable = true,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;
  const displayLabel = selected ? selected.label : placeholder;

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} className={className}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
            "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <div className="flex items-center gap-1">
            {clearable && selected && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e)}
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
                aria-label="Clear"
              >
                ×
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList className="h-50 overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => handleSelect(opt)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const TEMPLATE_COLUMNS = ["Name", "Category"];

const normalizeSubcategoryName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const Subcategories = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameInputRef = useRef(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subcategoryDrawerOpen, setSubcategoryDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await api.get("/categories/getall");
      return res.data?.categories ?? res.data ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const { data: subcategoriesData, isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const res = await api.get("/subcategories/getall");
      return res.data?.subcategories ?? res.data ?? [];
    },
  });
  const subcategories = subcategoriesData ?? [];

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? [];

  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }));

  const productCountBySubcategoryId = useMemo(() => {
    const counts = {};
    (products || []).forEach((p) => {
      (p.subcategories || []).forEach((s) => {
        const id = s?._id ?? s;
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [products]);

  const subcategoriesWithCounts = (subcategories || []).map((s) => ({
    ...s,
    productCount: productCountBySubcategoryId[s._id] ?? 0,
  }));

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/subcategories/create", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory created ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
        setSubcategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Create failed ❌");
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
        const categoryName =
          categories.find((c) => c._id === categoryId)?.name || "";
        const label = categoryName
          ? `"${trimmedName}" in category "${categoryName}"`
          : `"${trimmedName}"`;
        toast.error(
          trimmedName
            ? `Subcategory ${label} already exists ❌`
            : "Subcategory already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create subcategory. Please try again ❌");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/subcategories/update/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory updated ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
        setSubcategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Update failed ❌");
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
        const categoryName =
          categories.find((c) => c._id === categoryId)?.name || "";
        const label = categoryName
          ? `"${trimmedName}" in category "${categoryName}"`
          : `"${trimmedName}"`;
        toast.error(
          trimmedName
            ? `Subcategory ${label} already exists ❌`
            : "Subcategory already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update subcategory. Please try again ❌");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/subcategories/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory deleted ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      } else {
        toast.error(data?.message || "Delete failed ❌");
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
            "Cannot delete subcategory because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Delete failed ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleClearForm = () => {
    setName("");
    setCategoryId("");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Subcategory name is required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Subcategory name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Subcategory name must be at most 50 characters ❌");
      return;
    }

    if (!categoryId) {
      toast.error("Please select a category ❌");
      return;
    }

    const normalizedNewName = normalizeSubcategoryName(trimmedName);

    const hasDuplicate = (subcategories || []).some(
      (s) =>
        (!editingId || s._id !== editingId) &&
        normalizeSubcategoryName(s.name) === normalizedNewName &&
        (s.category?._id ?? s.category) === categoryId,
    );

    if (hasDuplicate) {
      const categoryName =
        categories.find((c) => c._id === categoryId)?.name || "";
      toast.error(
        categoryName
          ? `Subcategory "${trimmedName}" already exists in category "${categoryName}" ❌`
          : `Subcategory "${trimmedName}" already exists ❌`,
      );
      return;
    }

    const payload = { name: trimmedName, category: categoryId };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (sub) => {
    setName(sub.name);
    setCategoryId(sub.category?._id ?? sub.category ?? "");
    setEditingId(sub._id);
    setSubcategoryDrawerOpen(true);
    toast.info(`Editing: ${sub.name}`);
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

  const handleProductsClick = (id) => {
    navigate(`/products/filter/subcategory/${id}`);
  };

  const filtered = (subcategoriesWithCounts || []).filter(
    (s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    let valid = 0;
    let errors = 0;
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => normalizeKey(k) === "name") ?? null;
      const catKey =
        Object.keys(row).find((k) => normalizeKey(k) === "category") ?? null;
      const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const categoryName = catKey ? String(row[catKey] ?? "").trim() : "";
      const category = categories.find(
        (c) =>
          (c.name || "").toLowerCase() === categoryName.toLowerCase()
      );
      const fieldErrors = {};
      if (!name) {
        fieldErrors[nameKey || "Name"] = "Required";
        errors += 1;
      } else if (!categoryName || !category?._id) {
        fieldErrors[catKey || "Category"] = "Required / must match";
        errors += 1;
      } else {
        valid += 1;
      }
      const hasErrors = Object.keys(fieldErrors).length > 0;
      return {
        ...row,
        __name: name,
        __categoryId: category?._id ?? "",
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
      };
    });
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
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" });
      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0 });
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
        name: row.__name,
        category: row.__categoryId,
      }));
      await api.post("/subcategories/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success(`Imported ${payload.length} subcategories ✅`);
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
      console.error("Bulk import error:", err?.response?.data || err?.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    setImportRows([
      Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""])),
    ]);
    setImportStats({ total: 1, valid: 0, errors: 0 });
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "subcategories-import-template.xlsx");
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filtered.map((s) => ({
        "Name": s.name,
        "Category": s.category?.name ?? "",
        "Product Count": s.productCount ?? 0,
        "Created At": s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
        "Updated At": s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subcategories");
    XLSX.writeFile(workbook, "subcategories.xlsx");
  };

  const subcategoryColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "name",
        header: "Subcategory Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        cell: ({ row }) => (
          <span className="text-gray-600">
            {row.original.category?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "productCount",
        header: "Product Count",
        accessorKey: "productCount",
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <button
              type="button"
              onClick={() => handleProductsClick(sub._id)}
              className="text-center font-medium text-blue-600 hover:underline"
            >
              {sub.productCount ?? 0}
            </button>
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
          const sub = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEdit(sub)}>
                  Edit subcategory
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => confirmDelete(sub._id)}
                >
                  Delete subcategory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        <div className="">
          <Drawer
            direction="right"
            open={subcategoryDrawerOpen}
            onOpenChange={setSubcategoryDrawerOpen}
          >
            <div className="flex justify-between items-center">
              <h2 className="flex-4 text-2xl font-semibold text-gray-700">
                Subcategories List ({filtered.length})
              </h2>
              <div className="flex gap-4 items-center">
                <Drawer
                  open={importDrawerOpen}
                  onOpenChange={setImportDrawerOpen}
                >
                  <DrawerTrigger asChild>
                    <Label
                      variant="light"
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer"
                    >
                      Import Excel
                    </Label>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <DrawerTitle>Bulk Subcategory Import</DrawerTitle>
                          <DrawerDescription>
                            Upload CSV or Excel file to create multiple subcategories. Include Name and Category columns.
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
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload file</p>
                        <ImageUploadDropzone
                          accept=".csv,.xlsx"
                          type="excel"
                          label="Drag & Drop Excel or CSV File"
                          description="Upload bulk subcategory file"
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
                            </p>
                          </div>
                          <div className="border w-full rounded-md max-h-80 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importRows.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {rowIndex + 1}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {row.__name ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {categoryOptions.find((c) => c.value === row.__categoryId)?.label ?? row.Category ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={
                                          row.__status === "valid"
                                            ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                                            : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                                        }
                                      >
                                        {row.__status === "valid" ? "Valid" : "Error"}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
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
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md cursor-pointer"
                >
                  Export Excel
                </Label>
                <DrawerTrigger asChild>
                  <Button
                    variant="default"
                    onClick={() => {
                      if (!editingId) handleClearForm();
                    }}
                  >
                    {editingId ? "Edit Subcategory" : "Add New Subcategory"}
                  </Button>
                </DrawerTrigger>
              </div>
            </div>

            <DrawerContent className="ml-auto h-full max-w-3xl">
              <DrawerHeader>
                <DrawerTitle>
                  {editingId ? "Edit Subcategory" : "Add New Subcategory"}
                </DrawerTitle>
                <DrawerDescription>
                  {editingId
                    ? "Update the subcategory details."
                    : "Fill in the details below to add a new subcategory."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <Field>
                    <FieldLabel htmlFor="subcategory-name">Name</FieldLabel>
                    <Input
                      id="subcategory-name"
                      type="text"
                      placeholder="Subcategory Name"
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <CategoryCombobox
                      options={categoryOptions}
                      value={categoryId}
                      onChange={(opt) => setCategoryId(opt?.value ?? "")}
                      placeholder="Select Category"
                      clearable
                      className="mt-1"
                    />
                  </Field>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button type="submit" variant="default" disabled={loading}>
                      {loading
                        ? "Please wait..."
                        : editingId
                          ? "Update Subcategory"
                          : "Add Subcategory"}
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

        <div className="">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-3 w-full">
                <Input
                  type="text"
                  placeholder="Search subcategories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <UiSelect
                  value={String(itemsPerPage)}
                  onValueChange={(value) => setItemsPerPage(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>

          {subcategoriesLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={subcategoryColumns}
                data={filtered}
                pageSize={itemsPerPage}
              />
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected subcategory.
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
  );
};

export default Subcategories;
