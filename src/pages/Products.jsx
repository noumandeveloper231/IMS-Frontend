import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Check,
  X,
  XCircle,
  Pencil,
  Trash2,
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
import { DeleteModel } from "@/components/DeleteModel";
import { ProductDependencyDialog } from "@/components/ProductDependencyDialog";
import { ProductBulkDependencyModal } from "@/components/ProductBulkDependencyModal";
import { useProductBulkDependencyManager } from "@/hooks/useProductBulkDependencyManager";
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
import { UploadAlert } from "@/components/UploadAlert";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { InfoIcon } from "lucide-react";
import { useImageModal } from "@/context/ImageModalContext";
import axios from "axios";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

/** Normalize URL for display/validation: prepend https:// if no protocol */
const normalizeImageUrl = (value) => {
  const v = (value ?? "").toString().trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return "https://" + v;
};

/** Returns true if the string is a valid URL (after optional https:// normalization) */
const isValidImageUrl = (value) => {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return false;
  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
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

const EMPTY_ARRAY = [];

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
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background min-w-[200px]",
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
  const [imageUploadState, setImageUploadState] = useState(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const imageUploadAbortRef = useRef(null);

  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkManagerOpen, setBulkManagerOpen] = useState(false);
  const [deleteWithDepsOpen, setDeleteWithDepsOpen] = useState(false);
  const [deleteWithDepsData, setDeleteWithDepsData] = useState(null);
  const [cascadeConfirmOpen, setCascadeConfirmOpen] = useState(false);
  const [cascadeDeleteLoading, setCascadeDeleteLoading] = useState(false);

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

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? EMPTY_ARRAY;

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
        toast.success("Product has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast.error("Failed to delete product ❌");
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
            "Cannot delete product because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to delete product. Please try again ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const productBulkManager = useProductBulkDependencyManager({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedProductIds([]);
      setTableRowSelection({});
      const count = data?.deleted?.length ?? data?.deletedCount ?? 0;
      toast.success(`Deleted ${count} product(s) successfully`);
    },
    onError: (message) => {
      toast.error(message || "Bulk delete failed");
    },
  });

  useEffect(() => {
    if (bulkManagerOpen && selectedProductIds.length > 0 && productBulkManager.status === "idle") {
      productBulkManager.startAnalysis(selectedProductIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only start when modal opens
  }, [bulkManagerOpen]);

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.sku) return toast.error("Title and SKU required ❌");

    const formData = new FormData();
    const { category, subcategory, brand, condition, ...rest } = form;
    if (category) formData.append("category", category);
    if (subcategory) formData.append("subcategory", subcategory);
    if (brand) formData.append("brand", brand);
    if (condition) formData.append("condition", condition);
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
      category: p.category?._id ?? p.category ?? "",
      subcategory: p.subcategory?._id ?? p.subcategory ?? "",
      brand: p.brand?._id ?? p.brand ?? "",
      condition: p.condition?._id ?? p.condition ?? "",
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

  const confirmDelete = async (id) => {
    try {
      const res = await api.get(`/products/dependencies/${id}`);
      const data = res.data;
      const hasDependencies = data?.hasDependencies === true;
      const product = (products || []).find((p) => p._id === id);
      const name = product?.title || product?.sku || "Product";
      if (hasDependencies) {
        setDeleteWithDepsData({
          id,
          name,
          ordersCount: data.ordersCount ?? 0,
          orders: data.orders ?? [],
        });
        setDeleteWithDepsOpen(true);
      } else {
        setDeleteId(id);
        setDeleteOpen(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error("Product not found");
        return;
      }
      toast.error(err?.response?.data?.message || "Could not check product dependencies");
    }
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleCascadeDeleteConfirmed = async () => {
    if (!deleteId) return;
    setCascadeDeleteLoading(true);
    try {
      const res = await api.delete(`/products/delete/${deleteId}?cascade=true`);
      if (res.data?.success) {
        toast.success("Product removed from orders and deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["orders", "sales"] });
      } else {
        toast.error("Failed to delete product ❌");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete product ❌");
    } finally {
      setCascadeDeleteLoading(false);
      setCascadeConfirmOpen(false);
      setDeleteId(null);
      setDeleteWithDepsOpen(false);
      setDeleteWithDepsData(null);
    }
  };


  const productColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "image",
        header: "Image",
        cell: ({ row }) => {
          const p = row.original;
          const primaryImage =
            Array.isArray(p.images) && p.images.length ? p.images[0] : p.image;
          if (!primaryImage) {
            return <span className="text-gray-400 italic">No Image</span>;
          }
          return (
            <img
              src={resolveImageUrl(primaryImage)}
              alt={p.title}
              onClick={() => openImageModal(resolveImageUrl(primaryImage))}
              className="w-24 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
            />
          );
        },
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex flex-col gap-1 w-80">
              <h3 className="font-semibold line-clamp-2 text-gray-800">
                <Link
                  to={`/products/${p._id}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {p.title}
                </Link>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-2 rounded">
                {p.brand && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-700">Brand:</span>{" "}
                    {typeof p.brand === "object" ? p.brand.name : p.brand}
                  </p>
                )}
                {p.condition && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-700">Condition:</span>{" "}
                    {typeof p.condition === "object" ? p.condition.name : p.condition}
                  </p>
                )}
                {(p.category || p.subcategory) && (
                  <p className="text-xs text-gray-600 col-span-1 md:col-span-2">
                    <span className="font-medium text-gray-700">
                      Categories:
                    </span>{" "}
                    {[p.category, p.subcategory]
                      .filter(Boolean)
                      .map((c) => (typeof c === "object" ? c.name : c))
                      .join(" · ")}
                  </p>
                )}
                <p className="text-xs text-gray-600 col-span-1 md:col-span-2">
                  <span className="font-medium text-gray-700">SKU:</span>{" "}
                  {p.sku}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "qr",
        header: "QR Code",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <img
              src={p.qrCode}
              onClick={() => openImageModal(p.qrCode)}
              alt="QR Code"
              className="h-16 w-16 object-contain cursor-pointer"
            />
          );
        },
      },
      {
        id: "purchase",
        header: "Purchase",
        cell: ({ row }) => {
          const p = row.original;
          return <span className="text-sm text-gray-500">AED {p.purchasePrice}</span>;
        },
      },
      {
        id: "sale",
        header: "Sale",
        cell: ({ row }) => {
          const p = row.original;
          return <span className="text-sm text-gray-500">AED {p.salePrice}</span>;
        },
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const p = row.original;
          return <span className="text-sm text-gray-500">{p.quantity}</span>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const p = row.original;
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
                      onClick={() => handleEdit(p)}
                      aria-label="Edit product"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit product</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(p._id)}
                      aria-label="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete product</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [openImageModal, handleEdit, confirmDelete]
  );

  // Export
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredProducts.map((p) => ({
        Title: p.title,
        SKU: p.sku,
        ASIN: p.asin || "",
        "Purchase Price": p.purchasePrice,
        "Sale Price": p.salePrice,
        Quantity: p.quantity,
        "Model No.": p.modelno,
        Description: p.description,
        Categories: p.category ? (typeof p.category === "object" ? p.category.name : p.category) : "",
        Subcategories: p.subcategory ? (typeof p.subcategory === "object" ? p.subcategory.name : p.subcategory) : "",
        Brands: p.brand ? (typeof p.brand === "object" ? p.brand.name : p.brand) : "",
        Conditions: p.condition ? (typeof p.condition === "object" ? p.condition.name : p.condition) : "",
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
    const conditionValue = condKey ? String(row[condKey] ?? "").trim() : "";
    // Resolve condition: row may have condition ID (from dropdown) or condition name (from Excel) — same as add product drawer
    let conditionName = "";
    if (conditionValue) {
      const found = (conditions || []).find(
        (c) => c._id === conditionValue || (c.name && String(c.name).trim() === conditionValue)
      );
      conditionName = found ? (found.name || "").trim() : conditionValue;
    }
    const conditionCode = conditionName ? CONDITION_CODE_MAP[conditionName] || "" : "";

    if (!asin) return "";
    return conditionCode ? `AR-${asin}-${conditionCode}` : `AR-${asin}`;
  };

  const validateImportedRows = (rows) => {
    // Count by generated SKU (derived from ASIN+Condition, or explicit from Excel) — used for duplicate-in-file check
    const skuCounts = {};
    rows.forEach((row) => {
      const skuKey = Object.keys(row).find((k) => normalizeKey(k) === "sku");
      const explicitSku = skuKey ? String(row[skuKey] ?? "").trim() : "";
      const derivedSku = deriveSkuFromRow(row);
      const sku = derivedSku || explicitSku;
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
      // Prefer derived SKU when we can compute it (so ASIN/Condition changes update immediately); otherwise use explicit from Excel
      const effectiveSku = derivedSku || explicitSku;

      const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const price = priceKey != null ? Number(row[priceKey]) : NaN;
      const stock = stockKey != null ? Number(row[stockKey]) : NaN;

      const imagesKey =
        Object.keys(row).find((k) =>
          ["images", "image"].includes(normalizeKey(k))
        ) ?? null;
      const imagesVal = imagesKey ? String(row[imagesKey] ?? "").trim() : "";
      const imageFromUpload = row.__imageUrl || "";
      const firstImageUrl = (imageFromUpload || (imagesVal ? imagesVal.split(",")[0] : "") || "").trim();
      if (imagesVal && firstImageUrl && !isValidImageUrl(normalizeImageUrl(firstImageUrl))) {
        fieldErrors[imagesKey || "Images"] = "Invalid URL";
      }
      const resolvedImageUrl = imageFromUpload || (firstImageUrl && isValidImageUrl(normalizeImageUrl(firstImageUrl)) ? firstImageUrl : "");

      if (!effectiveSku) fieldErrors[skuKey || "SKU"] = "Required";
      if (!name) fieldErrors[nameKey || "Name"] = "Required";
      if (!Number.isFinite(price) || price <= 0) {
        fieldErrors[priceKey || "Price"] = "Invalid price";
      }
      if (!Number.isFinite(stock) || stock < 0) {
        fieldErrors[stockKey || "Stock"] = "Invalid stock";
      }

      // Duplicate in file: based on generated effective SKU
      if (effectiveSku && skuCounts[effectiveSku] > 1) {
        fieldErrors[skuKey || "SKU"] = "Duplicate in file";
        duplicates += 1;
      }

      // Already in DB: compare using the same generated effective SKU we will send
      if (effectiveSku && !fieldErrors[skuKey || "SKU"]) {
        const existsInDb = (products || []).some(
          (p) => (p.sku || "").toString().trim() === effectiveSku
        );
        if (existsInDb) {
          fieldErrors[skuKey || "SKU"] = "Already in DB";
        }
      }

      const hasErrors = Object.keys(fieldErrors).length > 0;
      if (hasErrors) errors += 1;
      else valid += 1;

      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
      const statusMessage = hasErrors ? firstError : "Ready to import";

      return {
        ...row,
        __sku: effectiveSku,
        __imageUrl: resolvedImageUrl,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage,
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

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    toast.info("Import data cleared");
  };

  const handleAddImportRow = () => {
    const cols = importColumns.length ? importColumns : TEMPLATE_COLUMNS;
    const newRow = Object.fromEntries(cols.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
  };

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

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleImportImageUrlChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value, __imageUrl: value } : r
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleImportImageUpload = useCallback(async (rowIndex, file, prevImageUrl) => {
    if (!file?.type?.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    const controller = new AbortController();
    imageUploadAbortRef.current = controller;
    setImageUploadState({ rowIndex, fileName: file.name });
    setImageUploadProgress(0);
    try {
      const prevUrl = (prevImageUrl ?? "").toString().trim();
      if (prevUrl && /^https?:\/\//i.test(prevUrl)) {
        try {
          await api.post("/products/delete-image-by-url", { imageUrl: prevUrl });
        } catch (_) { }
      }
      const formData = new FormData();
      formData.append("image", file);
      const res = await api.post("/products/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        onUploadProgress: (ev) => {
          const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          setImageUploadProgress(pct);
        },
      });
      const url = res.data?.url;
      if (url) {
        setImageUploadProgress(100);
        setImportRows((prev) => {
          const next = prev.map((r, i) => {
            if (i !== rowIndex) return r;
            const col = importColumns.find((c) => normalizeKey(c) === "images" || normalizeKey(c) === "image") || "Images";
            return { ...r, [col]: url, __imageUrl: url };
          });
          return validateImportedRows(next);
        });
        toast.success("Image uploaded");
      }
      setImageUploadState(null);
      setImageUploadProgress(0);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setImageUploadState(null);
      setImageUploadProgress(0);
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      imageUploadAbortRef.current = null;
    }
  }, [importColumns]);

  const handleImportImageUrlBlur = useCallback((rowIndex, columnKey, value) => {
    const trimmed = (value ?? "").toString().trim();
    if (!trimmed) return;
    const normalized = normalizeImageUrl(trimmed);
    if (normalized === trimmed) return;
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: normalized, __imageUrl: normalized } : r
      );
      return validateImportedRows(next);
    });
  }, []);

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
    const skuCol = {
      id: "__sku",
      header: "SKU",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const rowData = row.original;
        const skuErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "sku");
        const skuFulfilled = Boolean(rowData.__sku) && !skuErrorKey;
        const skuErrorMsg = skuErrorKey ? (rowData.__errors[skuErrorKey] === "Already in DB" ? "Already in database" : rowData.__errors[skuErrorKey] === "Duplicate in file" ? "Duplicate in file" : rowData.__errors[skuErrorKey] === "Required" ? "Required" : rowData.__errors[skuErrorKey]) : "Required";
        return (
          <div className="flex items-center gap-2 py-1.5 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${skuFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`} aria-hidden>
                    {skuFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">{skuFulfilled ? "SKU valid" : skuErrorMsg}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-xs whitespace-nowrap">{rowData.__sku || "Auto"}</span>
          </div>
        );
      },
    };
    const dynamicCols = (importColumns || []).map((col) => {
      const nk = normalizeKey(col);
      const isTitle = nk === "title" || nk === "name";
      const isDescription = nk === "description";
      const isImages = nk === "images" || nk === "image";
      const isCategory = nk === "categories";
      const isSubcategory = nk === "subcategories";
      const isBrand = nk === "brands";
      const isCondition = nk === "conditions";
      const isPurchasePrice = nk === "purchaseprice";
      const isSalePrice = nk === "saleprice";
      const isQuantity = nk === "quantity" || nk === "stock" || nk === "qty";
      const isAsin = nk === "asin";
      return {
        id: col,
        header: col,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rowIndex = Number(row.id);
          const rowData = row.original;
          const errorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => col === k || normalizeKey(k) === nk);
          const hasError = Boolean(errorKey);
          const errorMsg = errorKey ? rowData.__errors[errorKey] : "";
          const val = (rowData[col] ?? "").toString().trim();
          const fulfilled = (val.length > 0 || (isCategory || isSubcategory || isBrand || isCondition ? Boolean(rowData[col]) : false)) && !hasError;
          const indicator = (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${fulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`} aria-hidden>
                    {fulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">{fulfilled ? "Field fulfilled" : errorMsg || "Required"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
          if (isTitle) {
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-[120px]" onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
                {indicator}
                <Input value={rowData[col] ?? ""} onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === " " || e.key === "Tab") { e.preventDefault(); const input = e.target; const start = input.selectionStart ?? input.value.length; const end = input.selectionEnd ?? input.value.length; const v = (rowData[col] ?? "").toString(); handleImportCellChange(rowIndex, col, v.slice(0, start) + (e.key === "Tab" ? "\t" : " ") + v.slice(end)); requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = start + 1; }); } }} onKeyUp={(e) => e.stopPropagation()} className="h-8 text-xs flex-1 min-w-0" placeholder="Title" />
              </div>
            );
          }
          if (isDescription) {
            const raw = (rowData[col] ?? "").toString().trim();
            const display = raw.length > 0 ? raw.slice(0, 40) + (raw.length > 40 ? "…" : "") : "Click to edit";
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0">
                {indicator}
                <Button type="button" size="sm" variant="outline" className="h-9 text-xs flex-1 min-w-0 justify-start" onClick={() => handleOpenDescriptionModal(rowIndex, col)}>{display}</Button>
              </div>
            );
          }
          if (isImages) {
            const imgVal = (rowData.__imageUrl ?? rowData[col] ?? "").toString().trim();
            const imgFulfilled = imgVal.length > 0 && (!rowData.__errors || !Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "images" || normalizeKey(k) === "image"));
            return (
              <div className="flex gap-2 py-1.5 min-w-[200px] items-center w-full">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${imgFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`} aria-hidden>
                          {imgFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">{imgFulfilled ? "Field fulfilled" : (rowData.__errors && (rowData.__errors["Images"] || rowData.__errors["Image"])) || "Invalid URL or required"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Input value={rowData.__imageUrl ?? rowData[col] ?? ""} onChange={(e) => handleImportImageUrlChange(rowIndex, col, e.target.value)} onBlur={(e) => handleImportImageUrlBlur(rowIndex, col, e.target.value)} onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()} className="h-8 text-xs flex-1 min-w-0" placeholder="Image URL" />
                </div>
                <input id={`import-image-product-${rowIndex}`} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportImageUpload(rowIndex, f, rowData.__imageUrl ?? rowData[col] ?? ""); e.target.value = ""; }} />
                <Button type="button" variant="outline" className="h-7 text-xs" onClick={() => document.getElementById(`import-image-product-${rowIndex}`)?.click()}>Choose from device</Button>
              </div>
            );
          }
          if (isCategory) {
            const current = categoryOptions.find((o) => o.value === rowData[col]) || categoryOptions.find((o) => o.label === rowData[col]);
            const selectedValue = current?.value ?? "";
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0">
                {indicator}
                <ProductCombobox options={categoryOptions} value={selectedValue} onChange={(opt) => handleImportCellChange(rowIndex, col, opt?.value ?? "")} placeholder="Select Category" clearable className="flex-1 min-w-0" />
              </div>
            );
          }
          if (isSubcategory) {
            const subOpts = (subcategories || []).map((s) => ({ value: s._id, label: s.name }));
            const current = subOpts.find((o) => o.value === rowData[col]) || subOpts.find((o) => o.label === rowData[col]);
            const selectedValue = current?.value ?? "";
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0">
                {indicator}
                <ProductCombobox options={subOpts} value={selectedValue} onChange={(opt) => handleImportCellChange(rowIndex, col, opt?.value ?? "")} placeholder="Select Subcategory" clearable className="flex-1 min-w-0" />
              </div>
            );
          }
          if (isBrand) {
            const current = brandOptions.find((o) => o.value === rowData[col]) || brandOptions.find((o) => o.label === rowData[col]);
            const selectedValue = current?.value ?? "";
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0">
                {indicator}
                <ProductCombobox options={brandOptions} value={selectedValue} onChange={(opt) => handleImportCellChange(rowIndex, col, opt?.value ?? "")} placeholder="Select Brand" clearable className="flex-1 min-w-0" />
              </div>
            );
          }
          if (isCondition) {
            const current = conditionOptions.find((o) => o.value === rowData[col]) || conditionOptions.find((o) => o.label === rowData[col]);
            const selectedValue = current?.value ?? "";
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0">
                {indicator}
                <ProductCombobox options={conditionOptions} value={selectedValue} onChange={(opt) => handleImportCellChange(rowIndex, col, opt?.value ?? "")} placeholder="Select Condition" clearable className="flex-1 min-w-0" />
              </div>
            );
          }
          if (isPurchasePrice || isSalePrice) {
            const numVal = rowData[col];
            const displayVal = numVal === "" || numVal == null ? "" : String(numVal);
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0" onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
                {indicator}
                <Input type="number" min={0} step={0.01} value={displayVal} onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)} className={cn("h-8 text-xs flex-1 min-w-0", hasError && "border-red-500")} placeholder={isPurchasePrice ? "0.00" : "0.00"} />
              </div>
            );
          }
          if (isQuantity) {
            const numVal = rowData[col];
            const displayVal = numVal === "" || numVal == null ? "" : String(numVal);
            return (
              <div className="flex items-center gap-2 py-1.5 min-w-0" onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
                {indicator}
                <Input type="number" min={0} step={1} value={displayVal} onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)} className={cn("h-8 text-xs flex-1 min-w-0", hasError && "border-red-500")} placeholder="0" />
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2 py-1.5 min-w-0" onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
              {indicator}
              <Input value={rowData[col] ?? ""} onChange={(e) => handleImportCellChange(rowIndex, col, e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === " " || e.key === "Tab") { e.preventDefault(); const input = e.target; const start = input.selectionStart ?? input.value.length; const end = input.selectionEnd ?? input.value.length; const v = (rowData[col] ?? "").toString(); handleImportCellChange(rowIndex, col, v.slice(0, start) + (e.key === "Tab" ? "\t" : " ") + v.slice(end)); requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = start + 1; }); } }} onKeyUp={(e) => e.stopPropagation()} className={cn("h-8 text-xs flex-1 min-w-0", hasError && "border-red-500")} />
            </div>
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
                <span className={r.__status === "valid" ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700" : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"}>{r.__status === "valid" ? "Valid" : "Error"}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">{r.__status === "valid" ? "Ready to import" : (r.__statusMessage || "Validation error")}</TooltipContent>
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
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveImportRow(Number(row.id))} aria-label="Remove row">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    };
    return [indexCol, skuCol, ...dynamicCols, statusCol, actionsCol];
  }, [importColumns, handleImportCellChange, handleImportImageUrlChange, handleImportImageUpload, handleImportImageUrlBlur, handleRemoveImportRow]);

  const handleImportImageUploadCancel = () => {
    if (imageUploadAbortRef.current) imageUploadAbortRef.current.abort();
    setImageUploadState(null);
    setImageUploadProgress(0);
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }

    setImportLoading(true);
    try {
      const payload = validRows.map(({ __errors, __status, __sku, __imageUrl, ...rest }) => {
        const title = rest.Title ?? rest.title ?? "";
        const asin = rest.ASIN ?? rest.asin ?? "";
        const purchasePrice = rest["Purchase Price"] ?? rest.purchasePrice ?? 0;
        const salePrice = rest["Sale Price"] ?? rest.salePrice ?? 0;
        const quantity = rest.Quantity ?? rest.quantity ?? 0;
        const modelno = rest["Model No."] ?? rest.modelno ?? "";
        const description = rest.Description ?? rest.description ?? "";
        const category = rest.Categories ?? rest.category ?? rest.categories;
        const subcategory = rest.Subcategories ?? rest.subcategory ?? rest.subcategories;
        const brand = rest.Brands ?? rest.brand ?? rest.brands;
        const condition = rest.Conditions ?? rest.condition ?? rest.conditions;
        return {
          title,
          sku: __sku,
          asin: asin || null,
          purchasePrice: Number(purchasePrice) || 0,
          salePrice: Number(salePrice) || 0,
          quantity: Number(quantity) || 0,
          modelno: modelno || null,
          description: description || null,
          category,
          subcategory,
          brand,
          condition,
          image: __imageUrl || rest.Images || rest.Image || "",
        };
      });
      await api.post("/products/bulk-create", payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Imported ${payload.length} products ✅`);
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
    XLSX.writeFile(wb, "Products-import-template.xlsx");
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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
        {/* Header + Actions */}
        <div className="min-w-0">
          <Drawer
            direction="right"
            open={productDrawerOpen}
            onOpenChange={setProductDrawerOpen}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0">
                Products List ({filteredProducts.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                {selectedProductIds.length > 0 && (
                  <div className="w-full sm:w-auto min-w-0">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") {
                          if (selectedProductIds.length === 1) {
                            confirmDelete(selectedProductIds[0]);
                          } else {
                            setBulkManagerOpen(true);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
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
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center shrink-0">
                  <Drawer
                    open={importDrawerOpen}
                    onOpenChange={setImportDrawerOpen}
                  >
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
                            description="Upload bulk product file"
                            maxSize={10 * 1024 * 1024}
                            onFileSelect={handleImportFileSelected}
                          />
                        </div>
                        {imageUploadState && (
                          <UploadAlert
                            isActive={true}
                            fileName={imageUploadState.fileName}
                            progress={imageUploadProgress}
                            onCancel={handleImportImageUploadCancel}
                            onClose={handleImportImageUploadCancel}
                          />
                        )}
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
                                data={importRows?.length ? importRows : EMPTY_ARRAY}
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
                    className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                  >
                    Export Excel
                  </Label>
                  <Label
                    type="button"
                    onClick={() => {
                      handleClear();
                      setProductDrawerOpen(true);
                    }}
                    className="bg-black text-white shadow hover:bg-black/90 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                  >
                    Add New Product
                  </Label>
                </div>
              </div>
            </div>
            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div>
                    <DrawerTitle>{editingId ? "Edit Product" : "Add New Product"}</DrawerTitle>
                    <DrawerDescription>
                      {editingId
                        ? "Update the product details."
                        : "Fill in the details below to add a new product."}
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <InfoIcon className="w-6 h-6" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-black text-black">
                                Select a Category first to see the subcategories
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

        {/* Table section */}
        <div className="min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="w-full min-w-0 flex-1">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto min-w-0 sm:min-w-[140px]">
                <UiSelect
                  value={stockFilter}
                  onValueChange={(value) => {
                    setStockFilter(value);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
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
              <div className="w-full sm:w-auto min-w-0 sm:min-w-[140px]">
                <UiSelect
                  value={effectiveItemsPerPage <= 100 && [5, 10, 20, 50, 100].includes(effectiveItemsPerPage) ? String(effectiveItemsPerPage) : "custom"}
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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

          {productsLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <DataTable
                columns={productColumns}
                data={filteredProducts}
                pageSize={effectiveItemsPerPage}
                rowSelection={tableRowSelection}
                onRowSelectionChange={setTableRowSelection}
                onSelectionChange={(rows) => setSelectedProductIds(rows.map((r) => r._id))}
              />
            </div>
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

      <DeleteModel
        title="Delete product?"
        description="This action cannot be undone. This will permanently delete the selected product."
        onDelete={handleDeleteConfirmed}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={loading}
      />

      <ProductDependencyDialog
        open={deleteWithDepsOpen}
        onOpenChange={setDeleteWithDepsOpen}
        title="Product has order dependencies"
        dependencyData={deleteWithDepsData}
        onChooseCascade={() => {
          setDeleteId(deleteWithDepsData?.id ?? null);
          setCascadeConfirmOpen(true);
        }}
      />

      <DeleteModel
        title="Cascade delete product?"
        description="This will remove this product from all orders and then delete it. This action cannot be undone."
        requireAcceptCheckbox
        acceptLabel="I understand that this product will be removed from all orders and permanently deleted."
        confirmLabel="Delete and remove from orders"
        open={cascadeConfirmOpen}
        onOpenChange={(open) => {
          setCascadeConfirmOpen(open);
          if (!open) setDeleteId(null);
        }}
        onDelete={handleCascadeDeleteConfirmed}
        loading={cascadeDeleteLoading}
      />

      <ProductBulkDependencyModal
        open={bulkManagerOpen}
        onOpenChange={setBulkManagerOpen}
        manager={productBulkManager}
        onComplete={() => {
          setBulkManagerOpen(false);
        }}
      />
    </div>
  );
};

export default Products;
