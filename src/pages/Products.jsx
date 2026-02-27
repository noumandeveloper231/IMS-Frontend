import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpAZ,
  ArrowDownAZ,
  ArrowUp01,
  ArrowDown01,
  ChevronDown,
  Check,
  Edit,
  Trash2,
  XCircle,
} from "lucide-react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
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
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/UI/tooltip";
import { InfoIcon } from "lucide-react";
import { useImageModal } from "@/context/ImageModalContext";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

const CONDITION_CODE_MAP = {
  "Brand New": "BN",
  "Like New": "LN",
  "Used": "US",
  "Refurbished": "RF",
  "Max": "MX",
};

const TEMPLATE_COLUMNS = [
  "Title",
  "ASIN",
  "Purchase Price",
  "Sale Price",
  "Quantity",
  "Model No.",
  "Description",
  "Categories",
  "Subcategories",
  "Brands",
  "Conditions",
  "Images",
];

function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);

  const exec = (command) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, null);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex gap-1 border-b bg-muted px-2 py-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => exec("bold")}
        >
          <span className="font-bold text-xs">B</span>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => exec("italic")}
        >
          <span className="italic text-xs">I</span>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => exec("underline")}
        >
          <span className="underline text-xs">U</span>
        </Button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[160px] px-3 py-2 text-sm focus:outline-none"
        contentEditable
        suppressContentEditableWarning
        placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value || "" }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

function ProductCombobox({
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
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
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

const Products = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionTextareaRef = useRef(null);
  const { openImageModal } = useImageModal();

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dragImageIndex, setDragImageIndex] = useState(null);
  const [stockFilter, setStockFilter] = useState("all");
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
    duplicates: 0,
  });
  const [importLoading, setImportLoading] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [descriptionModalRowIndex, setDescriptionModalRowIndex] = useState(null);
  const [descriptionModalColumn, setDescriptionModalColumn] = useState(null);
  const [descriptionModalValue, setDescriptionModalValue] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalRowIndex, setImageModalRowIndex] = useState(null);
  const [imageModalColumn, setImageModalColumn] = useState(null);
  const [imageModalValue, setImageModalValue] = useState("");
  const [importImageFiles, setImportImageFiles] = useState({});

  const [form, setForm] = useState({
    title: "",
    sku: "",
    asin: "",
    purchasePrice: "",
    salePrice: "",
    quantity: "",
    description: "",
    modelno: "",
    category: "",
    subcategory: "",
    brand: "",
    condition: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? [];

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await api.get("/categories/getall");
      return res.data?.categories ?? res.data ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const { data: subcategoriesData } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const res = await api.get("/subcategories/getall");
      return res.data?.subcategories ?? res.data ?? [];
    },
  });
  const subcategories = subcategoriesData ?? [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const res = await api.get("/brands/getall");
      return res.data?.brands ?? res.data ?? [];
    },
  });
  const brands = brandsData ?? [];

  const { data: conditionsData } = useQuery({
    queryKey: ["conditions-list"],
    queryFn: async () => {
      const res = await api.get("/conditions/getall");
      return res.data?.conditions ?? res.data ?? [];
    },
  });
  const conditions = conditionsData ?? [];

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const asin = form.asin?.trim();
    const selectedCondition = conditions.find((c) => c._id === form.condition);
    const conditionName = selectedCondition?.name;
    const conditionCode = conditionName ? CONDITION_CODE_MAP[conditionName] || "" : "";

    if (!asin) {
      setForm((prev) => (prev.sku === "" ? prev : { ...prev, sku: "" }));
      return;
    }

    const nextSku = conditionCode ? `AR-${asin}-${conditionCode}` : `AR-${asin}`;

    setForm((prev) => (prev.sku === nextSku ? prev : { ...prev, sku: nextSku }));
  }, [form.asin, form.condition, conditions]);

  // Options for searchable dropdowns
  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }));
  const brandOptions = brands.map((b) => ({ value: b._id, label: b.name }));
  const conditionOptions = conditions.map((c) => ({ value: c._id, label: c.name }));

  // Subcategory options: only those under selected category (or all if none selected)
  const subcategoryOptionsAll = (subcategories || []).map((s) => ({
    value: s._id,
    label: `${s.name} (${s.category?.name ?? ""})`,
    categoryId: s.category?._id ?? s.category,
  }));
  const subcategoryOptions = form.category
    ? subcategoryOptionsAll.filter((opt) => opt.categoryId === form.category)
    : subcategoryOptionsAll;

  const handleSingleSelect = (field, selected) => {
    const value = selected?.value ?? "";
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "category") {
        const sub = subcategories.find((s) => s._id === prev.subcategory);
        if (sub && (sub.category?._id ?? sub.category) !== value) next.subcategory = "";
      }
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/products/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Product added ✅");
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast.error(data?.message || "Error saving product ❌");
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error saving product ❌"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/products/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Product updated ✅");
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast.error(data?.message || "Error updating product ❌");
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error updating product ❌"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/products/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Product deleted ✅");
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast.error("Failed to delete ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Something went wrong ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.sku) return toast.error("Title and SKU required ❌");

    const formData = new FormData();
    const { category, subcategory, brand, condition, ...rest } = form;
    [category].filter(Boolean).forEach((v) => formData.append("categories", v));
    [subcategory].filter(Boolean).forEach((v) => formData.append("subcategories", v));
    [brand].filter(Boolean).forEach((v) => formData.append("brands", v));
    [condition].filter(Boolean).forEach((v) => formData.append("conditions", v));
    Object.entries(rest).forEach(([key, value]) => formData.append(key, value ?? ""));
    images.forEach((file) => formData.append("images", file));

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }

    setForm({
      title: "",
      sku: "",
      asin: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      description: "",
      modelno: "",
      category: "",
      subcategory: "",
      brand: "",
      condition: "",
    });
    setEditingId(null);
    imagePreviews.forEach((url) => {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (p) => {
    setForm({
      title: p.title,
      sku: p.sku,
      asin: p.asin || "",
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      quantity: p.quantity,
      description: p.description,
      modelno: p.modelno,
      category: (p.categories || [])[0]?._id ?? (p.categories || [])[0] ?? "",
      subcategory: (p.subcategories || [])[0]?._id ?? (p.subcategories || [])[0] ?? "",
      brand: (p.brands || [])[0]?._id ?? "",
      condition: (p.conditions || [])[0]?._id ?? "",
    });
    setEditingId(p._id);
    setProductDrawerOpen(true);
    setImages([]);
    const existingImages = Array.isArray(p.images) && p.images.length
      ? p.images
      : p.image
        ? [p.image]
        : [];
    const previewUrls = existingImages.map((img) => resolveImageUrl(img));
    setImagePreviews(previewUrls);

    // 🔹 Toast show
    toast.info(`Editing product: ${p.title}`);

    // 🔹 Auto-focus title input
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 100);
  };

  const filteredProducts = (products || []).filter((p) => {
    const matchesSearch = (p.title || "").toLowerCase().includes(search.toLowerCase());

    let matchesStock = true;
    if (stockFilter === "in-stock") {
      matchesStock = (p.quantity ?? 0) > 0;
    } else if (stockFilter === "out-of-stock") {
      matchesStock = (p.quantity ?? 0) === 0;
    }

    return matchesSearch && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortField === "title") {
      return sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    }
    if (sortField === "quantity") {
      return sortOrder === "asc"
        ? a.quantity - b.quantity
        : b.quantity - a.quantity;
    }
    if (sortField === "salePrice") {
      return sortOrder === "asc"
        ? a.salePrice - b.salePrice
        : b.salePrice - a.salePrice;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirst, indexOfLast);

  const handleSort = (field) => {
    if (sortField === field) {
      // same field → toggle order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // new field → reset to asc
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Export
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      products.map((p) => ({
        Title: p.title,
        SKU: p.sku,
        ASIN: p.asin || "",
        "Purchase Price": p.purchasePrice,
        "Sale Price": p.salePrice,
        Quantity: p.quantity,
        "Model No.": p.modelno,
        Description: p.description,
        Categories: (p.categories || []).map((c) => c.name).join(", "),
        Subcategories: (p.subcategories || []).map((s) => s.name).join(", "),
        Brands: (p.brands || []).map((b) => b.name).join(", "),
        Conditions: (p.conditions || []).map((c) => c.name).join(", "),
        Image: (() => {
          const primaryImage = Array.isArray(p.images) && p.images.length ? p.images[0] : p.image;
          return primaryImage ? resolveImageUrl(primaryImage) : "";
        })(),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "Products.xlsx");
  };

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const deriveSkuFromRow = (row) => {
    const asinKey = Object.keys(row).find((k) => normalizeKey(k) === "asin");
    const condKey = Object.keys(row).find((k) => {
      const nk = normalizeKey(k);
      return nk === "conditions" || nk === "condition";
    });

    const asin = asinKey ? String(row[asinKey] ?? "").trim() : "";
    const conditionName = condKey ? String(row[condKey] ?? "").trim() : "";
    const conditionCode = conditionName ? CONDITION_CODE_MAP[conditionName] || "" : "";

    if (!asin) return "";
    return conditionCode ? `AR-${asin}-${conditionCode}` : `AR-${asin}`;
  };

  const validateImportedRows = (rows) => {
    const skuCounts = {};

    rows.forEach((row) => {
      const skuKey = Object.keys(row).find((k) => normalizeKey(k) === "sku");
      const explicitSku = skuKey ? String(row[skuKey] ?? "").trim() : "";
      const derivedSku = deriveSkuFromRow(row);
      const sku = explicitSku || derivedSku;
      if (!sku) return;
      skuCounts[sku] = (skuCounts[sku] || 0) + 1;
    });

    let valid = 0;
    let errors = 0;
    let duplicates = 0;

    const validated = rows.map((row) => {
      const fieldErrors = {};

      const skuKey = Object.keys(row).find((k) => normalizeKey(k) === "sku");
      const nameKey =
        Object.keys(row).find((k) => ["name", "title"].includes(normalizeKey(k))) ?? null;
      const priceKey =
        Object.keys(row).find((k) =>
          ["price", "saleprice", "sale_price", "purchaseprice"].includes(normalizeKey(k))
        ) ?? null;
      const stockKey =
        Object.keys(row).find((k) =>
          ["stock", "qty", "quantity"].includes(normalizeKey(k))
        ) ?? null;

      const explicitSku = skuKey ? String(row[skuKey] ?? "").trim() : "";
      const derivedSku = deriveSkuFromRow(row);
      const effectiveSku = explicitSku || derivedSku;

      const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const price = priceKey != null ? Number(row[priceKey]) : NaN;
      const stock = stockKey != null ? Number(row[stockKey]) : NaN;

      if (!effectiveSku) fieldErrors[skuKey || "SKU"] = "Required";
      if (!name) fieldErrors[nameKey || "Name"] = "Required";
      if (!Number.isFinite(price) || price <= 0) {
        fieldErrors[priceKey || "Price"] = "Invalid price";
      }
      if (!Number.isFinite(stock) || stock < 0) {
        fieldErrors[stockKey || "Stock"] = "Invalid stock";
      }

      if (effectiveSku && skuCounts[effectiveSku] > 1) {
        fieldErrors[skuKey || "SKU"] = "Duplicate SKU";
        duplicates += 1;
      }

      const hasErrors = Object.keys(fieldErrors).length > 0;
      if (hasErrors) errors += 1;
      else valid += 1;

      return {
        ...row,
        __sku: effectiveSku,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
      };
    });

    setImportStats({
      total: rows.length,
      valid,
      errors,
      duplicates,
    });

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
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return;
      }

      const validatedRows = validateImportedRows(rows);
      setImportRows(validatedRows);
      const allColumns = Object.keys(rows[0] || {});
      setImportColumns(allColumns.filter((c) => normalizeKey(c) !== "sku"));
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
      console.error("Import parse error:", err);
      toast.error("Unable to read file ❌");
    }
  };

  const handleImportCellChange = (rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[rowIndex], [columnKey]: value };
      next[rowIndex] = updatedRow;
      return validateImportedRows(next);
    });
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }

    setImportLoading(true);
    try {
      const payload = validRows.map(({ __errors, __status, __sku, ...rest }) => ({
        ...rest,
        sku: __sku,
      }));
      await api.post("/products/bulk-create", payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Imported ${payload.length} products ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    } catch (err) {
      toast.error("Bulk import failed ❌");
      console.error("Bulk import error:", err.response?.data || err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    setImportRows([
      Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""])),
    ]);
    setImportStats({ total: 1, valid: 0, errors: 0, duplicates: 0 });
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "products-import-template.xlsx");
  };

  const handleOpenDescriptionModal = (rowIndex, col) => {
    setDescriptionModalRowIndex(rowIndex);
    setDescriptionModalColumn(col);
    setDescriptionModalValue(importRows[rowIndex]?.[col] ?? "");
    setDescriptionModalOpen(true);
  };

  const handleSaveDescriptionModal = () => {
    if (descriptionModalRowIndex == null || !descriptionModalColumn) {
      setDescriptionModalOpen(false);
      return;
    }
    setImportRows((prev) => {
      const next = [...prev];
      next[descriptionModalRowIndex] = {
        ...next[descriptionModalRowIndex],
        [descriptionModalColumn]: descriptionModalValue,
      };
      return validateImportedRows(next);
    });
    setDescriptionModalOpen(false);
  };

  const handleOpenImageModal = (rowIndex, col) => {
    setImageModalRowIndex(rowIndex);
    setImageModalColumn(col);
    setImageModalValue(importRows[rowIndex]?.[col] ?? "");
    setImageModalOpen(true);
  };
  const handleSaveImageModal = () => {
    if (imageModalRowIndex == null || !imageModalColumn) {
      setImageModalOpen(false);
      return;
    }
    setImportRows((prev) => {
      const next = [...prev];
      next[imageModalRowIndex] = {
        ...next[imageModalRowIndex],
        [imageModalColumn]: imageModalValue,
      };
      return validateImportedRows(next);
    });
    setImageModalOpen(false);
  };
  const handleProductImageSelect = (fileOrFiles) => {
    if (!fileOrFiles) return;

    const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (!filesArray.length) return;

    setImages((prev) => [...prev, ...filesArray]);
    const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImageAtIndex = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed && removed.startsWith("blob:")) {
        URL.revokeObjectURL(removed);
      }
      return next;
    });
  };

  const moveItem = (array, from, to) => {
    const updated = [...array];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    return updated;
  };

  const handleThumbnailDragStart = (index) => {
    setDragImageIndex(index);
  };

  const handleThumbnailDragOver = (event) => {
    event.preventDefault();
  };

  const handleThumbnailDrop = (index) => {
    if (dragImageIndex === null || dragImageIndex === index) return;

    setImages((prev) => moveItem(prev, dragImageIndex, index));
    setImagePreviews((prev) => moveItem(prev, dragImageIndex, index));
    setDragImageIndex(null);
  };
  const handleClearProductImage = () => {
    imagePreviews.forEach((url) => {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    setImages([]);
    setImagePreviews([]);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleClear = () => {
    setForm({
      title: "",
      sku: "",
      asin: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      description: "",
      modelno: "",
      category: "",
      subcategory: "",
      brand: "",
      condition: "",
    });
    setEditingId(null);
    imagePreviews.forEach((url) => {
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    setImages([]);
    setImagePreviews([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full  ">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        {/* Header + Actions */}
        <div className="">
          <Drawer
            direction="right"
            open={productDrawerOpen}
            onOpenChange={setProductDrawerOpen}
          >
            <div className="flex justify-between items-center">
              <h2 className="flex-4 text-2xl font-semibold text-gray-700">
                Products List ({filteredProducts.length})
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
                          <DrawerTitle>Bulk Product Import</DrawerTitle>
                          <DrawerDescription>
                            Upload CSV or Excel file to create multiple products.
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
                      {/* Template actions */}
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

                      {/* Upload zone */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload file</p>
                        <ImageUploadDropzone
                          accept=".csv,.xlsx"
                          type="excel"
                          label="Drag & Drop Excel or CSV File"
                          description="Upload bulk product file"
                          maxSize={10 * 1024 * 1024}
                          onFileSelect={handleImportFileSelected}
                        />
                      </div>

                      {/* Preview table */}
                      {importRows.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Preview ({importStats.total} rows)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click any cell to edit. Validation runs automatically.
                            </p>
                          </div>
                          <div className="border w-full rounded-md max-h-80 overflow-auto">
                            <div className="min-w-max">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>SKU</TableHead>
                                    {importColumns.map((col) => (
                                      <TableHead className="whitespace-nowrap w-auto" key={col}>{col}</TableHead>
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
                                      <TableCell className="text-xs">
                                        {row.__sku || (
                                          <span className="text-muted-foreground">Auto</span>
                                        )}
                                      </TableCell>
                                      {importColumns.map((col) => {
                                        const errorMessage = row.__errors?.[col];
                                        const nk = normalizeKey(col);
                                        const isDescription = nk === "description";
                                        const isImages = nk === "images" || nk === "image";
                                        const isCategory = nk === "categories";
                                        const isSubcategory = nk === "subcategories";
                                        const isBrand = nk === "brands";
                                        const isCondition = nk === "conditions";

                                        if (isDescription) {
                                          const raw = row[col] ? String(row[col]) : "";
                                          const trimmed = raw.trim();
                                          const display =
                                            trimmed.length > 0
                                              ? trimmed.slice(0, 40) +
                                              (trimmed.length > 40 ? "…" : "")
                                              : "Click to edit description";

                                          return (
                                            <TableCell key={col}>
                                              <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() =>
                                                  handleOpenDescriptionModal(rowIndex, col)
                                                }
                                                className={cn(
                                                  "w-full rounded border px-2 py-1 text-left text-xs hover:bg-muted whitespace-nowrap",
                                                  errorMessage &&
                                                  "border-red-500"
                                                )}
                                              >
                                                {display}
                                              </Button>
                                              {errorMessage && (
                                                <p className="mt-1 text-[10px] text-red-600">
                                                  {errorMessage}
                                                </p>
                                              )}
                                            </TableCell>
                                          );
                                        }

                                        if (isImages) {
                                          const rawImages = row[col] ? String(row[col]) : "";
                                          const urls = rawImages
                                            .split(",")
                                            .map((u) => u.trim())
                                            .filter(Boolean);
                                          return (
                                            <TableCell key={col}>
                                              <div className="flex items-center gap-2">
                                                <div className="flex -space-x-1">
                                                  {urls.slice(0, 3).map((u, idx) => (
                                                    <img
                                                      key={idx}
                                                      src={resolveImageUrl(u)}
                                                      alt="Preview"
                                                      className="h-8 w-8 rounded border object-cover"
                                                    />
                                                  ))}
                                                  {urls.length === 0 && (
                                                    <span className="h-8 w-8 rounded border border-dashed text-[10px] flex items-center justify-center text-muted-foreground">
                                                      N/A
                                                    </span>
                                                  )}
                                                </div>
                                                <Button
                                                  type="button"
                                                  size="xs"
                                                  variant="outline"
                                                  onClick={() =>
                                                    handleOpenImageModal(rowIndex, col)
                                                  }
                                                >
                                                  {urls.length ? "Manage Images" : "Add Images"}
                                                </Button>
                                              </div>
                                            </TableCell>
                                          );
                                        }

                                        if (isCategory) {
                                          const currentCategory =
                                            categoryOptions.find((o) => o.value === row[col]) ||
                                            categoryOptions.find((o) => o.label === row[col]);
                                          const selectedValue = currentCategory?.value ?? "";

                                          return (
                                            <TableCell key={col}>
                                              <ProductCombobox
                                                options={categoryOptions}
                                                value={selectedValue}
                                                onChange={(selected) =>
                                                  handleImportCellChange(
                                                    rowIndex,
                                                    col,
                                                    selected?.value ?? ""
                                                  )
                                                }
                                                placeholder="Select Category"
                                                clearable
                                              />
                                            </TableCell>
                                          );
                                        }

                                        if (isSubcategory) {
                                          const subOptions = subcategoryOptions.map((o) => ({
                                            value: o.value,
                                            label: o.label,
                                          }));
                                          const currentSub =
                                            subOptions.find((o) => o.value === row[col]) ||
                                            subOptions.find((o) => o.label === row[col]);
                                          const selectedValue = currentSub?.value ?? "";

                                          return (
                                            <TableCell key={col}>
                                              <ProductCombobox
                                                options={subOptions}
                                                value={selectedValue}
                                                onChange={(selected) =>
                                                  handleImportCellChange(
                                                    rowIndex,
                                                    col,
                                                    selected?.value ?? ""
                                                  )
                                                }
                                                placeholder="Select Subcategory"
                                                clearable
                                              />
                                            </TableCell>
                                          );
                                        }

                                        if (isBrand) {
                                          const currentBrand =
                                            brandOptions.find((o) => o.value === row[col]) ||
                                            brandOptions.find((o) => o.label === row[col]);
                                          const selectedValue = currentBrand?.value ?? "";

                                          return (
                                            <TableCell key={col}>
                                              <ProductCombobox
                                                options={brandOptions}
                                                value={selectedValue}
                                                onChange={(selected) =>
                                                  handleImportCellChange(
                                                    rowIndex,
                                                    col,
                                                    selected?.value ?? ""
                                                  )
                                                }
                                                placeholder="Select Brand"
                                                clearable
                                              />
                                            </TableCell>
                                          );
                                        }

                                        if (isCondition) {
                                          const currentCondition =
                                            conditionOptions.find((o) => o.value === row[col]) ||
                                            conditionOptions.find((o) => o.label === row[col]);
                                          const selectedValue = currentCondition?.value ?? "";

                                          return (
                                            <TableCell key={col}>
                                              <ProductCombobox
                                                options={conditionOptions}
                                                value={selectedValue}
                                                onChange={(selected) =>
                                                  handleImportCellChange(
                                                    rowIndex,
                                                    col,
                                                    selected?.value ?? ""
                                                  )
                                                }
                                                placeholder="Select Condition"
                                                clearable
                                              />
                                            </TableCell>
                                          );
                                        }

                                        return (
                                          <TableCell key={col}>
                                            <Input
                                              value={row[col] ?? ""}
                                              onChange={(e) =>
                                                handleImportCellChange(
                                                  rowIndex,
                                                  col,
                                                  e.target.value
                                                )
                                              }
                                              className={cn(
                                                "h-8 text-xs",
                                                errorMessage &&
                                                "border-red-500 focus-visible:ring-red-500"
                                              )}
                                            />
                                            {errorMessage && (
                                              <p className="mt-1 text-[10px] text-red-600">
                                                {errorMessage}
                                              </p>
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell>
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                            row.__status === "valid"
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-red-50 text-red-700"
                                          )}
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
                          <span className="text-muted-foreground">
                            ✖ Duplicates:{" "}
                            <span className="font-semibold text-orange-700">
                              {importStats.duplicates}
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => toast.info("Error-fixing helper not implemented yet")}
                            disabled={!importRows.length}
                          >
                            Fix Errors
                          </Button>
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
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
                >
                  Export Excel
                </Label>
                <DrawerTrigger asChild>
                  <Button variant="default">
                    {editingId ? "Edit Product" : "Add New Product"}
                  </Button>
                </DrawerTrigger>
              </div>
            </div>
            <DrawerContent className="ml-auto h-full max-w-3xl">
              <DrawerHeader>
                <DrawerTitle>{editingId ? "Edit Product" : "Add New Product"}</DrawerTitle>
                <DrawerDescription>
                  {editingId
                    ? "Update the product details."
                    : "Fill in the details below to add a new product."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Form Fields */}
                  <div className="col-span-1 md:col-span-2">
                    <Field>
                      <FieldLabel htmlFor="product-title">Product Title</FieldLabel>
                    </Field>
                    <Input
                      id="product-title"
                      type="text"
                      name="title"
                      placeholder="Product Title"
                      ref={titleInputRef}
                      value={form.title}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-asin">ASIN</FieldLabel>
                    </Field>
                    <Input
                      id="product-asin"
                      type="text"
                      name="asin"
                      placeholder="ASIN"
                      value={form.asin}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
                    </Field>
                    <Input
                      id="product-sku"
                      type="text"
                      name="sku"
                      placeholder="SKU"
                      value={form.sku}
                      className="mt-1"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-modelno">Model No.</FieldLabel>
                    </Field>
                    <Input
                      id="product-modelno"
                      type="text"
                      name="modelno"
                      placeholder="Model No."
                      value={form.modelno}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-purchasePrice">Purchase Price</FieldLabel>
                    </Field>
                    <Input
                      id="product-purchasePrice"
                      type="number"
                      min="1"
                      name="purchasePrice"
                      placeholder="Purchase Price"
                      value={form.purchasePrice}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-salePrice">Sale Price</FieldLabel>
                    </Field>
                    <Input
                      id="product-salePrice"
                      type="number"
                      min="1"
                      name="salePrice"
                      placeholder="Sale Price"
                      value={form.salePrice}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel htmlFor="product-quantity">Quantity</FieldLabel>
                    </Field>
                    <Input
                      id="product-quantity"
                      type="number"
                      min="0"
                      name="quantity"
                      placeholder="Quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Field>
                      <FieldLabel className={"mb-1"}>Category</FieldLabel>
                    </Field>
                    <ProductCombobox
                      options={categoryOptions}
                      value={form.category}
                      onChange={(selected) => handleSingleSelect("category", selected)}
                      placeholder="Select Category..."
                      clearable
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel className={"mb-1"}>Subcategory</FieldLabel>
                    </Field>
                    <div className="flex items-center gap-3">
                      <ProductCombobox
                        options={subcategoryOptions.map((o) => ({ value: o.value, label: o.label }))}
                        value={form.subcategory}
                        onChange={(selected) => handleSingleSelect("subcategory", selected)}
                        placeholder={form.category ? "Select Subcategory..." : "Select category first"}
                        disabled={!form.category}
                        clearable
                      />
                      {!form?.category && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="w-6 h-6" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-black">
                              Select a Category first to see the subcategories
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <Field>
                      <FieldLabel className={"mb-1"}>Brand</FieldLabel>
                    </Field>
                    <ProductCombobox
                      options={brandOptions}
                      value={form.brand}
                      onChange={(selected) => handleSingleSelect("brand", selected)}
                      placeholder="Select Brand..."
                      clearable
                    />
                  </div>
                  <div>
                    <Field>
                      <FieldLabel className={"mb-1"}>Condition</FieldLabel>
                    </Field>
                    <ProductCombobox
                      options={conditionOptions}
                      value={form.condition}
                      onChange={(selected) => handleSingleSelect("condition", selected)}
                      placeholder="Select Condition..."
                      clearable
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Field>
                      <FieldLabel htmlFor="product-description">Description</FieldLabel>
                    </Field>
                    <div className="mt-1">
                      <RichTextEditor
                        value={form.description}
                        onChange={(html) =>
                          setForm((prev) => ({ ...prev, description: html }))
                        }
                        placeholder="Description"
                      />
                    </div>
                  </div>
                  {/* Image Upload */}
                  <div className="col-span-1 md:col-span-2">
                    <Field>
                      <FieldLabel htmlFor="product-image">Product Image</FieldLabel>
                    </Field>
                    <ImageUploadDropzone
                      onFileSelect={handleProductImageSelect}
                      previewUrl={imagePreviews[0]}
                      accept="image/*"
                      className="mt-1"
                      multiple
                      primaryLabel="Upload product images"
                      secondaryLabel="You can select multiple images (first will show in list)"
                      onReorderFrontFromIndex={(index) => {
                        setImages((prev) => moveItem(prev, index, 0));
                        setImagePreviews((prev) => moveItem(prev, index, 0));
                      }}
                    />
                    {imagePreviews.length > 0 && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {imagePreviews.map((src, index) => (
                            <div
                              key={index}
                              className="relative w-24 h-24 rounded-md overflow-hidden border border-muted bg-muted/40 cursor-move"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/image-index", String(index));
                                handleThumbnailDragStart(index);
                              }}
                              onDragOver={handleThumbnailDragOver}
                              onDrop={() => handleThumbnailDrop(index)}
                            >
                              <img
                                src={src}
                                alt={`Selected ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImageAtIndex(index)}
                                className="absolute top-1 right-1 rounded-full bg-white/95 shadow-md text-red-500 hover:bg-red-50 p-0.5 z-10"
                                aria-label="Remove image"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleClearProductImage}
                          className="mt-2 text-sm text-muted-foreground hover:text-foreground underline block"
                        >
                          Clear all images
                        </button>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 items-center flex-wrap col-span-1 md:col-span-2">
                    <Button type="submit" variant="default" disabled={loading}>
                      {loading
                        ? "Please wait..."
                        : editingId
                          ? "Update Product"
                          : "Add Product"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleClear}
                      className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md"
                    >
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-auto"
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

        {/* Product Table */}
        <div className="">
          <div className="flex justify-between items-center mb-6 gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-4 w-full">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 w-full">
                <UiSelect
                  value={stockFilter}
                  onValueChange={(value) => {
                    setStockFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Stock filter" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Stock</SelectLabel>
                      <SelectItem value="all">All stock</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </div>
              <div className="flex-1 w-full md:w-auto">
                <UiSelect
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Items per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("title")}
                      >
                        <div className="flex items-center gap-2">
                          Title
                          {sortField === "title" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Purchase</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("salePrice")}
                      >
                        <div className="flex items-center gap-2">
                          Sale
                          {sortField === "salePrice" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp01 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDown01 className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("quantity")}
                      >
                        <div className="flex items-center gap-2">
                          Stock
                          {sortField === "quantity" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp01 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDown01 className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProducts.length > 0 ? (
                      currentProducts.map((p, i) => (
                        <TableRow
                          key={p._id}
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                          <TableCell className="text-sm text-gray-900">
                            {indexOfFirst + i + 1}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const primaryImage =
                                Array.isArray(p.images) && p.images.length
                                  ? p.images[0]
                                  : p.image;
                              if (!primaryImage) {
                                return (
                                  <span className="text-gray-400 italic">No Image</span>
                                );
                              }
                              return (
                                <img
                                  src={resolveImageUrl(primaryImage)}
                                  alt={p.title}
                                  onClick={() =>
                                    openImageModal(resolveImageUrl(primaryImage))
                                  }
                                  className="w-24 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            <div className="flex flex-col gap-1 w-80">
                              {/* Title */}
                              <h3 className="font-semibold line-clamp-2 text-gray-800">
                                <Link
                                  to={`/products/${p._id}`}
                                  className="hover:text-blue-600 hover:underline"
                                >
                                  {p.title}
                                </Link>
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded">
                                {/* Brands */}
                                {(p.brands || []).length > 0 && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium text-gray-700">
                                      Brand:
                                    </span>{" "}
                                    {(p.brands || []).map((b) => b.name).join(", ")}
                                  </p>
                                )}

                                {/* Conditions */}
                                {(p.conditions || []).length > 0 && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium text-gray-700">
                                      Condition:
                                    </span>{" "}
                                    {(p.conditions || []).map((c) => c.name).join(", ")}
                                  </p>
                                )}
                                {/* Categories */}
                                {(p.categories?.length > 0 || p.subcategories?.length > 0) && (
                                  <p className="text-xs text-gray-600 col-span-1 md:col-span-2">
                                    <span className="font-medium text-gray-700">
                                      Categories:
                                    </span>{" "}
                                    {(p.categories || []).map((c) => c.name).join(", ")}
                                    {p.subcategories?.length > 0 && (
                                      <>
                                        {" · "}
                                        <span className="font-medium text-gray-700">Sub:</span>{" "}
                                        {(p.subcategories || []).map((s) => s.name).join(", ")}
                                      </>
                                    )}
                                  </p>
                                )}

                                {/* SKU full width */}
                                <p className="text-xs text-gray-600 col-span-1 md:col-span-2">
                                  <span className="font-medium text-gray-700">
                                    SKU:
                                  </span>{" "}
                                  {p.sku}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <img
                              src={p.qrCode}
                              onClick={() => openImageModal(p.qrCode)}
                              alt="QR Code"
                              className="h-16 w-16 object-contain cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            AED {p.purchasePrice}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            AED {p.salePrice}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {p.quantity}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex  gap-2">
                              <button onClick={() => handleEdit(p)} className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200">
                                <Edit size={18} />
                              </button>
                              {/* </Button> */}
                              <button onClick={() => confirmDelete(p._id)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.max(p - 1, 1));
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
                          setCurrentPage((p) => Math.min(p + 1, totalPages));
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
      </div>

      <AlertDialog open={descriptionModalOpen} onOpenChange={setDescriptionModalOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Description</AlertDialogTitle>
            <AlertDialogDescription>
              Edit the full product description. Formatting will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <RichTextEditor
              value={descriptionModalValue}
              onChange={setDescriptionModalValue}
              placeholder="Description"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveDescriptionModal}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Image</AlertDialogTitle>
            <AlertDialogDescription>
              Provide an image URL to be used during bulk import.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={imageModalValue}
              onChange={(e) => setImageModalValue(e.target.value)}
            />
            {imageModalValue && (
              <img
                src={resolveImageUrl(imageModalValue)}
                alt="Preview"
                className="mt-2 h-24 w-24 rounded border object-cover"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveImageModal}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} disabled={loading}>
              {loading ? "Deleting..." : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
