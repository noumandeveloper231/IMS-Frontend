import React, { useState, useRef } from "react";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01, ChevronDown, Check, Edit, Trash2 } from "lucide-react";
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
  const { openImageModal } = useImageModal();

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
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
    if (image) formData.append("image", image);

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
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit (create/update)
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!form.title || !form.sku)
  //     return toast.error("Title and SKU required ❌");

  //   setLoading(true);
  //   try {
  //     const formData = new FormData();
  //     Object.entries(form).forEach(([key, value]) => {
  //       if (Array.isArray(value)) {
  //         value.forEach((v) => formData.append(key, v));
  //       } else {
  //         formData.append(key, value);
  //       }
  //     });

  //     // Append images
  //     images.forEach((img) => formData.append("images", img));

  //     if (editingId) {
  //       const res = await axios.put(
  //         `http://localhost:5000/api/products/update/${editingId}`,
  //         formData,
  //         { headers: { "Content-Type": "multipart/form-data" } }
  //       );
  //       res.data.success
  //         ? toast.success("Product updated ✅")
  //         : toast.error(res.data.message);
  //     } else {
  //       const res = await axios.post(
  //         "http://localhost:5000/api/products/create",
  //         formData,
  //         { headers: { "Content-Type": "multipart/form-data" } }
  //       );
  //       res.data.success
  //         ? toast.success("Product added ✅")
  //         : toast.error(res.data.message);
  //     }

  //     setForm({
  //       title: "",
  //       sku: "",
  //       purchasePrice: "",
  //       salePrice: "",
  //       quantity: "",
  //       description: "",
  //       modelno: "",
  //       categories: [],
  //       brands: [],
  //       conditions: [],
  //     });
  //     setEditingId(null);
  //     setImages([]);
  //     setImagePreviews([]);
  //     fetchAll();
  //   } catch (err) {
  //     // ✅ Backend ka message show karo
  //     const errorMessage =
  //       err.response?.data?.message || "Error saving product ❌";
  //     toast.error(errorMessage);
  //   } finally {
  //     setLoading(false);
  //   }
  //   // ✅ File input reset karo
  //   if (fileInputRef.current) {
  //     fileInputRef.current.value = "";
  //   }
  // };

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
    setPreview(p.image ? resolveImageUrl(p.image) : null);

    // 🔹 Toast show
    toast.info(`Editing product: ${p.title}`);

    // 🔹 Auto-focus title input
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        // Agar pura text select karna ho:
        // titleInputRef.current.select();
      }
    }, 100);
  };

  // Edit
  // const handleEdit = (p) => {
  //   setForm({
  //     title: p.title,
  //     sku: p.sku,
  //     purchasePrice: p.purchasePrice,
  //     salePrice: p.salePrice,
  //     quantity: p.quantity,
  //     description: p.description,
  //     modelno: p.modelno,
  //     categories: p.categories.map((c) => c._id),
  //     brands: p.brands.map((b) => b._id),
  //     conditions: p.conditions.map((c) => c._id),
  //   });
  //   setEditingId(p._id);
  //   setImagePreviews(p.images || []);
  // };

  const filteredProducts = (products || []).filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

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
        title: p.title,
        sku: p.sku,
        asin: p.asin || "",
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        quantity: p.quantity,
        modelno: p.modelno,
        description: p.description,
        categories: (p.categories || []).map((c) => c.name).join(", "),
        subcategories: (p.subcategories || []).map((s) => s.name).join(", "),
        brands: (p.brands || []).map((b) => b.name).join(", "),
        conditions: (p.conditions || []).map((c) => c.name).join(", "),
        image: p.image ? `${window.location.origin}${p.image}` : "", // ✅ image ka full URL
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "products.xlsx");
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const workbook = XLSX.read(evt.target.result, { type: "binary" });
      const sheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

      try {
        await api.post("/products/bulk-create", data);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("Bulk import complete ✅");
      } catch (err) {
        toast.error("Bulk import failed ❌");
        console.error("Import error:", err.response?.data || err.message);
      }
    };

    reader.readAsBinaryString(file);
  };
  const handleProductImageSelect = (file) => {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const handleClearProductImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    setPreviewImage(null);
  };
  // Import
  // const handleImport = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;
  //   const reader = new FileReader();
  //   reader.onload = async (evt) => {
  //     const workbook = XLSX.read(evt.target.result, { type: "binary" });
  //     const sheet = workbook.SheetNames[0];
  //     const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

  //     for (let item of data) {
  //       try {
  //         if (item.title && !products.some((p) => p.sku === item.sku)) {
  //           await axios.post("http://localhost:5000/api/products/create", item);
  //         }
  //       } catch (err) {
  //         console.error("Import error", item.title);
  //       }
  //     }
  //     fetchAll();
  //     toast.success("Import complete ✅");
  //   };
  //   reader.readAsBinaryString(file);
  // };

  // Delete
  // const handleDelete = async (id) => {
  //   if (!window.confirm("Delete this product?")) return;

  //   try {
  //     const res = await axios.delete(
  //       `http://localhost:5000/api/products/delete/${id}`
  //     );

  //     if (res.data.success) toast.success("Deleted ✅");
  //     fetchAll();
  //   } catch {
  //     toast.error("Failed to delete ❌");
  //   }
  // };
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
    setImage(null);
    setPreview(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full  ">
      <div className="max-w-7xl mx-auto">
        {/* Product Form */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>
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
                onChange={handleChange}
                className="mt-1"
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
              // className="mt-1"
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
                {
                  !form?.category && (
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
                  )
                }
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
              <textarea
                id="product-description"
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
                className="mt-1 flex min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y col-span-1 md:col-span-2"
              />
            </div>
            {/* Image Upload */}
            <div className="col-span-1 md:col-span-2">
              <Field>
                <FieldLabel htmlFor="product-image">Product Image</FieldLabel>
              </Field>
              <ImageUploadDropzone
                onFileSelect={handleProductImageSelect}
                previewUrl={preview}
                accept="image/*"
                className="mt-1"
              />
              {preview && (
                <button
                  type="button"
                  onClick={handleClearProductImage}
                  className="mt-2 text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Clear image
                </button>
              )}
            </div>

            {/* Image Upload */}
            {/* <div className="col-span-1 md:col-span-2">
              <label className="block mb-2 font-medium text-gray-700">
                Product Images
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className="p-2 border border-gray-300 rounded-xl"
              />
              {preview && (
                <div className="mt-2">
                  <img
                    src={preview}
                    alt="Product Preview"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div> */}

            {/* Action Buttons */}
            <div className="flex gap-4 items-center flex-wrap col-span-1 md:col-span-2">
              <Button type="submit" variant="default" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : editingId
                    ? "Update Product"
                    : "Add Product"}
              </Button>
              <Label
                variant="light"
                onClick={handleImport}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer"
              >
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
                Import Excel
              </Label>
              <Label
                variant="success"
                onClick={handleExport}
                className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
              >
                Export Excel
              </Label>
              <Button
                variant="danger"
                onClick={handleClear}
                className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md"
              >
                Clear
              </Button>
            </div>
          </form>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="w-full text-2xl font-semibold text-gray-700">Products List</h2>
            <div className="w-full flex gap-4 items-center">
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
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
                            {p.image ? (
                              <img
                                src={resolveImageUrl(p.image)}
                                alt={p.title}
                                onClick={() => openImageModal(resolveImageUrl(p.image))}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-300 shadow cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-400 italic">No Image</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            <div className="flex flex-col gap-1 w-80">
                              {/* Title */}
                              <h3 className="font-semibold line-clamp-2 text-gray-800">
                                {p.title}
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

                                {/* Model No */}
                                {/* <p className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700">
                                Model No:
                              </span>{" "}
                              {p.modelno}
                            </p> */}

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

  // return (
  //   <div className="max-w-full md:max-w-7xl ml-16 md:ml-64 p-6">
  //     {/* Form */}
  //     <div className="bg-white p-6 rounded-xl shadow mb-6">
  //       <h2 className="text-xl font-semibold mb-4">
  //         {editingId ? "Edit Product" : "Add Product"}
  //       </h2>
  //       <form
  //         onSubmit={handleSubmit}
  //         className="grid grid-cols-1 md:grid-cols-2 gap-4"
  //       >
  //         <input
  //           type="text"
  //           name="title"
  //           placeholder="Product Title"
  //           value={form.title}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg h-11 col-span-2"
  //           required
  //         />
  //         <input
  //           type="text"
  //           name="sku"
  //           placeholder="SKU"
  //           value={form.sku}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg h-11"
  //           required
  //         />
  //         <input
  //           type="number"
  //           name="purchasePrice"
  //           placeholder="Purchase Price"
  //           value={form.purchasePrice}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg h-11"
  //           required
  //         />
  //         <input
  //           type="number"
  //           name="salePrice"
  //           placeholder="Sale Price"
  //           value={form.salePrice}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg h-11"
  //           required
  //         />
  //         <input
  //           type="number"
  //           name="quantity"
  //           placeholder="Quantity"
  //           value={form.quantity}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg h-11"
  //           required
  //         />
  //         <textarea
  //           name="description"
  //           placeholder="Description"
  //           value={form.description}
  //           onChange={handleChange}
  //           className="p-3 border rounded-lg col-span-2"
  //         />
  //         <select
  //           value={form.categories}
  //           onChange={(e) => handleMultiSelect(e, "categories")}
  //           className="p-3 border rounded-lg h-11"
  //         >
  //           {categories.map((c) => (
  //             <option key={c._id} value={c._id}>
  //               {c.name}
  //             </option>
  //           ))}
  //         </select>
  //         <select
  //           value={form.brands}
  //           onChange={(e) => handleMultiSelect(e, "brands")}
  //           className="p-3 border rounded-lg h-11"
  //         >
  //           {brands.map((b) => (
  //             <option key={b._id} value={b._id}>
  //               {b.name}
  //             </option>
  //           ))}
  //         </select>
  //         <select
  //           value={form.conditions}
  //           onChange={(e) => handleMultiSelect(e, "conditions")}
  //           className="p-3 border rounded-lg h-11"
  //         >
  //           {conditions.map((c) => (
  //             <option key={c._id} value={c._id}>
  //               {c.name}
  //             </option>
  //           ))}
  //         </select>
  //         <div className="flex gap-2">
  //           <button
  //             type="submit"
  //             disabled={loading}
  //             className="px-4 py-2 bg-blue-600 text-white rounded-lg"
  //           >
  //             {editingId ? "Update" : "Add"}
  //           </button>
  //           <input
  //             type="file"
  //             accept=".xlsx,.xls"
  //             onChange={handleImport}
  //             className="border p-2 rounded-lg"
  //           />
  //           <button
  //             type="button"
  //             onClick={handleExport}
  //             className="px-4 py-2 bg-green-600 text-white rounded-lg"
  //           >
  //             Export
  //           </button>
  //         </div>
  //       </form>
  //     </div>

  //     {/* Table */}
  //     <div className="bg-white p-6 rounded-xl shadow">
  //       <div className="flex justify-between mb-4">
  //         <input
  //           type="text"
  //           placeholder="Search product..."
  //           value={search}
  //           onChange={(e) => setSearch(e.target.value)}
  //           className="p-3 border rounded-lg h-11"
  //         />
  //         <select
  //           value={itemsPerPage}
  //           onChange={(e) => {
  //             setItemsPerPage(Number(e.target.value));
  //             setCurrentPage(1);
  //           }}
  //           className="p-3 border rounded-lg h-11"
  //         >
  //           <option value={5}>5 / page</option>
  //           <option value={10}>10 / page</option>
  //           <option value={20}>20 / page</option>
  //         </select>
  //       </div>

  //       <table className="w-full border">
  //         <thead className="bg-gray-100">
  //           <tr>
  //             <th className="p-2 border">#</th>
  //             <th className="p-2 border">Title</th>
  //             <th className="p-2 border">QR</th>
  //             <th className="p-2 border">SKU</th>
  //             <th className="p-2 border">Purchase</th>
  //             <th className="p-2 border">Sale</th>
  //             <th className="p-2 border">Qty</th>
  //             <th className="p-2 border">Categories</th>
  //             <th className="p-2 border">Brands</th>
  //             <th className="p-2 border">Conditions</th>
  //             <th className="p-2 border">Actions</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           {currentProducts.map((p, i) => (
  //             <tr key={p._id}>
  //               <td className="p-2 border">{indexOfFirst + i + 1}</td>
  //               <td className="p-2 border">{p.title}</td>
  //               <td className="p-2 border">
  //                 <img src={p.qrCode} alt="QR Code" />
  //               </td>

  //               <td className="p-2 border">{p.sku}</td>
  //               <td className="p-2 border">${p.purchasePrice}</td>
  //               <td className="p-2 border">${p.salePrice}</td>
  //               <td className="p-2 border">{p.quantity}</td>
  //               <td className="p-2 border">
  //                 {p.categories.map((c) => c.name).join(", ")}
  //               </td>
  //               <td className="p-2 border">
  //                 {p.brands.map((b) => b.name).join(", ")}
  //               </td>
  //               <td className="p-2 border">
  //                 {p.conditions.map((c) => c.name).join(", ")}
  //               </td>
  //               <td className="p-2 border flex gap-2">
  //                 <button
  //                   onClick={() => handleEdit(p)}
  //                   className="p-2 text-blue-600"
  //                 >
  //                   <Edit size={18} />
  //                 </button>
  //                 <button
  //                   onClick={() => handleDelete(p._id)}
  //                   className="p-2 text-red-600"
  //                 >
  //                   <Trash2 size={18} />
  //                 </button>
  //               </td>
  //             </tr>
  //           ))}
  //           {currentProducts.length === 0 && (
  //             <tr>
  //               <td colSpan="10" className="text-center py-4 text-gray-500">
  //                 No products found
  //               </td>
  //             </tr>
  //           )}
  //         </tbody>
  //       </table>

  //       {/* Pagination */}
  //       {totalPages > 1 && (
  //         <div className="flex justify-center gap-2 mt-4">
  //           <button
  //             onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
  //             className="px-3 py-1 border rounded-lg"
  //           >
  //             Prev
  //           </button>
  //           {[...Array(totalPages)].map((_, i) => (
  //             <button
  //               key={i}
  //               onClick={() => setCurrentPage(i + 1)}
  //               className={`px-3 py-1 border rounded-lg ${
  //                 currentPage === i + 1 ? "bg-blue-200" : ""
  //               }`}
  //             >
  //               {i + 1}
  //             </button>
  //           ))}
  //           <button
  //             onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
  //             className="px-3 py-1 border rounded-lg"
  //           >
  //             Next
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // );
};

export default Products;
