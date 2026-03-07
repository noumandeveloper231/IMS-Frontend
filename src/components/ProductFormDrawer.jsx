import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, XCircle, Wand2 } from "lucide-react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/UI/drawer";
import { Switch } from "@/components/UI/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { InfoIcon } from "lucide-react";
import { Combobox } from "@/components/UI/combobox";
import { RichTextEditor } from "@/components/UI/RichTextEditor";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { MediaGalleryModal } from "@/components/media";

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

const INITIAL_FORM = {
  title: "",
  sku: "",
  asin: "",
  purchasePrice: "",
  salePrice: "",
  quantity: "",
  description: "",
  specification: "",
  competitors: [],
  ourMarketplace: [],
  modelno: "",
  category: "",
  subcategory: "",
  brand: "",
  condition: "",
  refundable: true,
};

function normalizeCompetitorsFromProduct(p) {
  if (!p || !p.competitors) return [];
  if (Array.isArray(p.competitors)) return p.competitors;
  if (typeof p.competitors === "string") {
    try {
      const parsed = JSON.parse(p.competitors);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Object.entries(p.competitors)
    .filter(([_, value]) => typeof value === "string" && value)
    .map(([key, value]) => ({ label: key, url: value }));
}

function normalizeOurMarketplaceFromProduct(p) {
  if (!p || !p.ourMarketplace) return [];
  if (Array.isArray(p.ourMarketplace)) return p.ourMarketplace.slice(0, 6);
  if (typeof p.ourMarketplace === "string") {
    try {
      const parsed = JSON.parse(p.ourMarketplace);
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  }
  return Object.entries(p.ourMarketplace)
    .filter(([_, value]) => typeof value === "string" && value)
    .map(([key, value]) => ({ label: key, url: value }))
    .slice(0, 6);
}

const moveItem = (array, from, to) => {
  const updated = [...array];
  const [item] = updated.splice(from, 1);
  updated.splice(to, 0, item);
  return updated;
};

export function ProductFormDrawer({
  open,
  onOpenChange,
  editingProduct,
  categories = [],
  subcategories = [],
  brands = [],
  conditions = [],
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const titleInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [productImages, setProductImages] = useState([]);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [dragImageIndex, setDragImageIndex] = useState(null);
  const [generateAsinLoading, setGenerateAsinLoading] = useState(false);

  const categoryOptions = (categories || []).map((c) => ({
    value: c._id ?? c.id,
    label: c.name ?? "",
  }));
  const brandOptions = (brands || []).map((b) => ({ value: b._id, label: b.name }));
  const conditionOptions = (conditions || []).map((c) => ({ value: c._id, label: c.name }));
  const subcategoryOptionsAll = (subcategories || []).map((s) => ({
    value: s._id,
    label: `${s.name} (${s.category?.name ?? ""})`,
    categoryId: s.category?._id ?? s.category,
  }));
  const subcategoryOptions = form.category
    ? subcategoryOptionsAll.filter((opt) => opt.categoryId === form.category)
    : subcategoryOptionsAll;

  // Sync form when opening for add or edit
  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      const p = editingProduct;
      setForm({
        title: p.title,
        sku: p.sku,
        asin: p.asin || "",
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        quantity: p.quantity,
        description: p.description,
        specification: p.specification || "",
        competitors: normalizeCompetitorsFromProduct(p),
        ourMarketplace: normalizeOurMarketplaceFromProduct(p),
        modelno: p.modelno,
        category: p.category?._id ?? p.category ?? "",
        subcategory: p.subcategory?._id ?? p.subcategory ?? "",
        brand: p.brand?._id ?? p.brand ?? "",
        condition: p.condition?._id ?? p.condition ?? "",
        refundable: p.refundable !== false,
      });
      const existingImages = Array.isArray(p.images) && p.images.length
        ? p.images
        : p.image ? [p.image] : [];
      setProductImages(
        existingImages.map((img, index) => ({
          id: `existing-${p._id}-${index}`,
          isNew: false,
          url: img,
          previewUrl: resolveImageUrl(img),
        }))
      );
      toast.info(`Editing product: ${p.title}`);
    } else {
      setForm(INITIAL_FORM);
      setProductImages([]);
    }
    setTimeout(() => titleInputRef.current?.focus(), 100);
  }, [open, editingProduct?._id]);

  // SKU from ASIN + condition
  useEffect(() => {
    const asin = form.asin?.trim();
    const selectedCondition = conditions.find((c) => c._id === form.condition);
    const conditionName = selectedCondition?.name;
    const conditionCode = conditionName ? (CONDITION_CODE_MAP[conditionName] || "") : "";
    if (!asin) {
      setForm((prev) => (prev.sku === "" ? prev : { ...prev, sku: "" }));
      return;
    }
    const nextSku = conditionCode ? `AR-${asin}-${conditionCode}` : `AR-${asin}`;
    setForm((prev) => (prev.sku === nextSku ? prev : { ...prev, sku: nextSku }));
  }, [form.asin, form.condition, conditions]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setCompetitorField = useCallback((idx, field, value) => {
    setForm((prev) => {
      const next = [...(prev.competitors || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, competitors: next };
    });
  }, []);
  const removeCompetitor = useCallback((idx) => {
    setForm((prev) => ({
      ...prev,
      competitors: (prev.competitors || []).filter((_, i) => i !== idx),
    }));
  }, []);
  const addCompetitor = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      competitors: [...(prev.competitors || []), { label: "", url: "" }],
    }));
  }, []);

  const setOurMarketplaceField = useCallback((idx, field, value) => {
    setForm((prev) => {
      const next = [...(prev.ourMarketplace || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, ourMarketplace: next };
    });
  }, []);
  const removeOurMarketplace = useCallback((idx) => {
    setForm((prev) => ({
      ...prev,
      ourMarketplace: (prev.ourMarketplace || []).filter((_, i) => i !== idx),
    }));
  }, []);
  const addOurMarketplace = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      ourMarketplace: [...(prev.ourMarketplace || []), { label: "", url: "" }],
    }));
  }, []);

  const handleDescriptionChange = useCallback((html) => {
    setForm((prev) => ({ ...prev, description: html }));
  }, []);
  const handleSpecificationChange = useCallback((html) => {
    setForm((prev) => ({ ...prev, specification: html }));
  }, []);
  const handleRefundableChange = useCallback((checked) => {
    setForm((prev) => ({ ...prev, refundable: !!checked }));
  }, []);
  const handleAsinChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, asin: e.target.value.toUpperCase() }));
  }, []);

  const handleSingleSelect = useCallback((field, selected, subcategoriesList) => {
    const value = selected?.value ?? "";
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "category") {
        const sub = subcategoriesList.find((s) => s._id === prev.subcategory);
        if (sub && (sub.category?._id ?? sub.category) !== value) next.subcategory = "";
      }
      return next;
    });
  }, []);

  const handleGenerateAsin = useCallback(async () => {
    setGenerateAsinLoading(true);
    try {
      const res = await api.get("/products/generate-asin");
      const asin = res.data?.asin;
      if (asin) {
        setForm((prev) => ({ ...prev, asin }));
        toast.success("ASIN generated");
      } else {
        toast.error(res.data?.message || "Could not generate ASIN");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to generate ASIN");
    } finally {
      setGenerateAsinLoading(false);
    }
  }, []);

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
        onSuccess?.();
        onOpenChange?.(false);
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
        onSuccess?.();
        onOpenChange?.(false);
      } else {
        toast.error(data?.message || "Error updating product ❌");
      }
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Error updating product ❌"),
  });

  const loading = createMutation.isPending || updateMutation.isPending;
  const editingId = editingProduct?._id ?? null;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!form.title || !form.sku) return toast.error("Title and SKU required ❌");

      const formData = new FormData();
      const { category, subcategory, brand, condition, competitors, ourMarketplace, ...rest } = form;
      if (category) formData.append("category", category);
      if (subcategory) formData.append("subcategory", subcategory);
      if (brand) formData.append("brand", brand);
      if (condition) formData.append("condition", condition);
      const normalizedCompetitors = (competitors || [])
        .filter((c) => c && c.label && c.url)
        .slice(0, 8)
        .map((c) => ({ label: c.label.trim(), url: c.url.trim() }));
      if (normalizedCompetitors.length) formData.append("competitors", JSON.stringify(normalizedCompetitors));
      const normalizedOurMarketplace = (ourMarketplace || [])
        .filter((c) => c && c.label && c.url)
        .slice(0, 6)
        .map((c) => ({ label: c.label.trim(), url: c.url.trim() }));
      if (normalizedOurMarketplace.length) formData.append("ourMarketplace", JSON.stringify(normalizedOurMarketplace));
      Object.entries(rest).forEach(([key, value]) => formData.append(key, value ?? ""));

      const existingImages = productImages.filter((img) => !img.isNew && img.url).map((img) => img.url);
      const newImageFiles = productImages.filter((img) => img.isNew && img.file).map((img) => img.file);
      if (existingImages.length) formData.append("existingImages", JSON.stringify(existingImages));
      newImageFiles.forEach((file) => formData.append("images", file));

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

      setForm(INITIAL_FORM);
      setProductImages((prev) => {
        prev.forEach((img) => {
          if (img.isNew && img.previewUrl && img.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
        return [];
      });
    },
    [form, productImages, editingId, updateMutation, createMutation]
  );

  const handleClear = useCallback(() => {
    setForm(INITIAL_FORM);
    setProductImages((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.previewUrl && img.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const handleProductImageSelect = useCallback((fileOrFiles) => {
    const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (!filesArray.length) return;
    const newItems = filesArray.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      isNew: true,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setProductImages((prev) => [...prev, ...newItems]);
  }, []);

  const handleRemoveImageAtIndex = useCallback((index) => {
    setProductImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed?.isNew && removed.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  }, []);

  const handleThumbnailDragStart = useCallback((index) => setDragImageIndex(index), []);
  const handleThumbnailDragOver = useCallback((e) => e.preventDefault(), []);
  const handleThumbnailDrop = useCallback((index) => {
    if (dragImageIndex === null || dragImageIndex === index) return;
    setProductImages((prev) => moveItem(prev, dragImageIndex, index));
    setDragImageIndex(null);
  }, [dragImageIndex]);

  const handleClearProductImage = useCallback(() => {
    setProductImages((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(img.previewUrl);
      });
      return [];
    });
  }, []);

  const handleGallerySelect = useCallback((selected) => {
    if (selected && selected.length) {
      const newItems = selected.map((m) => ({
        id: m._id,
        isNew: false,
        url: m.url,
        previewUrl: resolveImageUrl(m.url),
      }));
      setProductImages((prev) => [...prev, ...newItems]);
    }
    setMediaGalleryOpen(false);
  }, []);

  if (!open) return null;

  return (
    <DrawerContent
      className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl"
      onInteractOutside={(e) => {
        if (e.target instanceof Element && e.target.closest(".tox-dialog")) e.preventDefault();
      }}
      onPointerDownOutside={(e) => {
        if (e.target instanceof Element && e.target.closest(".tox-dialog")) e.preventDefault();
      }}
    >
      <DrawerHeader className="px-4 sm:px-6">
        <div className="flex items-start justify-between">
          <div>
            <DrawerTitle>{editingId ? "Edit Product" : "Add New Product"}</DrawerTitle>
            <DrawerDescription>
              {editingId ? "Update the product details." : "Fill in the details below to add a new product."}
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 w-full">
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
              className="mt-1 w-full"
              required
            />
          </div>

          <div>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="product-asin">ASIN</FieldLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-3 h-3 pr-1 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={handleGenerateAsin}
                        disabled={generateAsinLoading}
                        aria-label="Auto generate ASIN"
                      >
                        {generateAsinLoading ? <span className="text-xs">...</span> : <Wand2 className="h-2 w-2" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Auto generate</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Field>
            <Input
              id="product-asin"
              type="text"
              name="asin"
              maxLength={10}
              placeholder="e.g. Bxxxxxxx"
              value={form.asin}
              onChange={handleAsinChange}
              className="mt-1 w-full"
              required
            />
          </div>
          <div>
            <Field><FieldLabel htmlFor="product-sku">SKU</FieldLabel></Field>
            <Input id="product-sku" type="text" name="sku" placeholder="SKU" value={form.sku} className="mt-1 w-full" readOnly disabled />
          </div>
          <div>
            <Field><FieldLabel htmlFor="product-modelno">Model No.</FieldLabel></Field>
            <Input id="product-modelno" type="text" name="modelno" placeholder="Model No." value={form.modelno} onChange={handleChange} className="mt-1 w-full" required />
          </div>
          <div>
            <Field><FieldLabel htmlFor="product-purchasePrice">Purchase Price</FieldLabel></Field>
            <Input id="product-purchasePrice" type="number" min="1" name="purchasePrice" placeholder="Purchase Price" value={form.purchasePrice} onChange={handleChange} className="mt-1 w-full" required />
          </div>
          <div>
            <Field><FieldLabel htmlFor="product-salePrice">Sale Price</FieldLabel></Field>
            <Input id="product-salePrice" type="number" min="1" name="salePrice" placeholder="Sale Price" value={form.salePrice} onChange={handleChange} className="mt-1 w-full" required />
          </div>
          <div>
            <Field><FieldLabel htmlFor="product-quantity">Quantity</FieldLabel></Field>
            <Input id="product-quantity" type="number" min="0" name="quantity" placeholder="Quantity" value={form.quantity} onChange={handleChange} className="mt-1 w-full" required />
          </div>

          <div>
            <Field><FieldLabel className="mb-1">Category</FieldLabel></Field>
            <Combobox
              options={categoryOptions}
              value={form.category}
              onChange={(value) => handleSingleSelect("category", categoryOptions.find((o) => o.value === value) || null, subcategories)}
              placeholder="Select Category..."
            />
          </div>
          <div>
            <Field><FieldLabel className="mb-1">Subcategory</FieldLabel></Field>
            <div className="flex items-center gap-3">
              <Combobox
                options={subcategoryOptions}
                value={form.subcategory}
                onChange={(value) => handleSingleSelect("subcategory", subcategoryOptions.find((o) => o.value === value) || null, subcategories)}
                placeholder={form.category ? "Select Subcategory..." : "Select category first"}
                disabled={!form.category}
              />
              {!form?.category && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild><InfoIcon className="w-6 h-6" /></TooltipTrigger>
                    <TooltipContent>Select a Category first to see the subcategories</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <div>
            <Field><FieldLabel className="mb-1">Brand</FieldLabel></Field>
            <Combobox
              options={brandOptions}
              value={form.brand}
              onChange={(value) => handleSingleSelect("brand", brandOptions.find((o) => o.value === value) || null, subcategories)}
              placeholder="Select Brand..."
            />
          </div>
          <div>
            <Field><FieldLabel className="mb-1">Condition</FieldLabel></Field>
            <Combobox
              options={conditionOptions}
              value={form.condition}
              onChange={(value) => handleSingleSelect("condition", conditionOptions.find((o) => o.value === value) || null, subcategories)}
              placeholder="Select Condition..."
            />
          </div>

          <div className="col-span-1 md:col-span-2 flex items-center gap-3">
            <Field><FieldLabel htmlFor="product-refundable" className="mb-0">Refundable</FieldLabel></Field>
            <Switch id="product-refundable" checked={form.refundable} onCheckedChange={handleRefundableChange} />
            <span className="text-sm text-muted-foreground">{form.refundable ? "Yes" : "No"}</span>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Field><FieldLabel htmlFor="product-description">Description</FieldLabel></Field>
            <div className="mt-1">
              <RichTextEditor value={form.description} onChange={handleDescriptionChange} placeholder="Description" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Field><FieldLabel htmlFor="product-specification">Specification</FieldLabel></Field>
            <div className="mt-1">
              <RichTextEditor value={form.specification} onChange={handleSpecificationChange} placeholder="Specification" />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Field><FieldLabel>Competitors (max 8)</FieldLabel></Field>
            <div className="mt-1 space-y-2">
              {(form.competitors || []).map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input type="text" placeholder="Label (e.g. Amazon)" value={c.label || ""} onChange={(e) => setCompetitorField(idx, "label", e.target.value)} />
                  <Input type="url" placeholder="https://..." value={c.url || ""} onChange={(e) => setCompetitorField(idx, "url", e.target.value)} />
                  <Button type="button" variant="ghost" className="text-red-600 w-10 h-10 hover:text-red-700 hover:bg-red-50" onClick={() => removeCompetitor(idx)} aria-label="Remove competitor">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!form.competitors || form.competitors.length < 8) && (
                <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>Add competitor</Button>
              )}
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <Field><FieldLabel>Our marketplace (max 6)</FieldLabel></Field>
            <div className="mt-1 space-y-2">
              {(form.ourMarketplace || []).map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input type="text" placeholder="Label (e.g. Shopify)" value={c.label || ""} onChange={(e) => setOurMarketplaceField(idx, "label", e.target.value)} />
                  <Input type="url" placeholder="https://..." value={c.url || ""} onChange={(e) => setOurMarketplaceField(idx, "url", e.target.value)} />
                  <Button type="button" variant="ghost" className="text-red-600 w-10 h-10 hover:text-red-700 hover:bg-red-50" onClick={() => removeOurMarketplace(idx)} aria-label="Remove marketplace">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!form.ourMarketplace || form.ourMarketplace.length < 6) && (
                <Button type="button" variant="outline" size="sm" onClick={addOurMarketplace}>Add marketplace</Button>
              )}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Field><FieldLabel htmlFor="product-image">Product Image</FieldLabel></Field>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaGalleryOpen(true)}
              >
                Select from gallery
              </Button>
            </div>
            <ImageUploadDropzone
              onFileSelect={handleProductImageSelect}
              previewUrl={productImages[0]?.previewUrl}
              accept="image/*"
              className="mt-1"
              multiple
              primaryLabel="Upload product images"
              secondaryLabel="You can select multiple images (first will show in list)"
              onReorderFrontFromIndex={(index) => setProductImages((prev) => moveItem(prev, index, 0))}
            />
            {productImages.length > 0 && (
              <>
                <div className="mt-3 flex flex-wrap gap-3">
                  {productImages.map((img, index) => (
                    <div
                      key={img.id ?? index}
                      className="relative w-24 h-24 rounded-md overflow-hidden border border-muted bg-muted/40 cursor-move"
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/image-index", String(index)); handleThumbnailDragStart(index); }}
                      onDragOver={handleThumbnailDragOver}
                      onDrop={() => handleThumbnailDrop(index)}
                    >
                      <img src={img.previewUrl} alt={`Selected ${index + 1}`} className="w-full h-full object-contain" />
                      <button type="button" onClick={() => handleRemoveImageAtIndex(index)} className="absolute top-1 right-1 rounded-full bg-white text-red-500 hover:bg-red-50 p-0.5 z-10" aria-label="Remove image">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleClearProductImage} className="mt-2 text-sm text-muted-foreground hover:text-foreground underline block">Clear all images</button>
              </>
            )}
            <MediaGalleryModal
              open={mediaGalleryOpen}
              onOpenChange={setMediaGalleryOpen}
              multiple={true}
              title="Select product images"
              onConfirm={handleGallerySelect}
            />
          </div>

          <div className="flex gap-4 items-center flex-wrap col-span-1 md:col-span-2">
            <Button type="submit" variant="default" disabled={loading}>
              {loading ? "Please wait..." : editingId ? "Update Product" : "Add Product"}
            </Button>
            <Button variant="danger" onClick={handleClear} className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md">Clear</Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="ml-auto">Cancel</Button>
            </DrawerClose>
          </div>
        </form>
      </div>
    </DrawerContent>
  );
}
