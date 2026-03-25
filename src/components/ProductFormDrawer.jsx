import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Wand2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/UI/tooltip";
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
  Used: "US",
  Refurbished: "RF",
  Max: "MX",
};

const getConditionCodeFromName = (name) => {
  const trimmed = (name ?? "").toString().trim();
  if (!trimmed) return "";
  const mapped = CONDITION_CODE_MAP[trimmed];
  if (mapped) return mapped;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const INITIAL_FORM = {
  title: "",
  sku: "",
  skuPrefix: "AR",
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
  returnable: true,
};

const normalizeSkuPrefix = (value) =>
  (value ?? "")
    .toString()
    .trim()
    // Prevent breaking the SKU separator: we generate `PREFIX-<body>`
    .replace(/[\s-]/g, "")
    .slice(0, 5)
    .toUpperCase();

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
  skuPrefixDefault = "AR",
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const titleInputRef = useRef(null);

  const [form, setForm] = useState(INITIAL_FORM);
  const [productImages, setProductImages] = useState([]);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [generateAsinLoading, setGenerateAsinLoading] = useState(false);

  const categoryOptions = (categories || []).map((c) => ({
    value: c._id ?? c.id,
    label: c.name ?? "",
  }));
  const brandOptions = (brands || []).map((b) => ({
    value: b._id,
    label: b.name,
  }));
  const conditionOptions = (conditions || []).map((c) => ({
    value: c._id,
    label: c.name,
  }));
  const subcategoryOptionsAll = (subcategories || []).map((s) => ({
    value: s._id,
    label: `${s.name} (${s.category?.name ?? ""})`,
    categoryId: s.category?._id ?? s.category,
  }));
  const subcategoryOptions = form.category
    ? subcategoryOptionsAll.filter((opt) => opt.categoryId === form.category)
    : subcategoryOptionsAll;

  const selectedCondition = conditions.find((c) => c._id === form.condition);
  const conditionName = selectedCondition?.name;
  const conditionCode = getConditionCodeFromName(conditionName);
  const asinTrimmed = form.asin?.trim() ?? "";
  const skuBody = asinTrimmed
    ? conditionCode
      ? `${asinTrimmed}-${conditionCode}`
      : asinTrimmed
    : "";

  // Sync form when opening for add or edit
  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      const p = editingProduct;
      const existingSkuPrefix = (() => {
        const s = p?.sku ?? "";
        if (typeof s !== "string") return "";
        const parts = s.split("-").filter(Boolean);
        return parts[0] ?? "";
      })();
      setForm({
        title: p.title,
        sku: p.sku,
        skuPrefix:
          normalizeSkuPrefix(existingSkuPrefix) ||
          normalizeSkuPrefix(skuPrefixDefault) ||
          "AR",
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
        returnable: p.returnable !== false,
      });
      const existingImages =
        Array.isArray(p.images) && p.images.length
          ? p.images
          : p.image
            ? [p.image]
            : [];
      setProductImages(
        existingImages.map((img, index) => ({
          id: `existing-${p._id}-${index}`,
          isNew: false,
          url: img,
          previewUrl: resolveImageUrl(img),
        })),
      );
      toast.info(`Editing product: ${p.title}`);
    } else {
      setForm({
        ...INITIAL_FORM,
        skuPrefix: normalizeSkuPrefix(skuPrefixDefault) || "AR",
      });
      setProductImages([]);
    }
    setTimeout(() => titleInputRef.current?.focus(), 100);
  }, [open, editingProduct?._id, skuPrefixDefault]);

  // SKU from ASIN + condition
  useEffect(() => {
    const asin = form.asin?.trim();
    const selectedCondition = conditions.find((c) => c._id === form.condition);
    const conditionName = selectedCondition?.name;
    const conditionCode = getConditionCodeFromName(conditionName);
    const prefix = normalizeSkuPrefix(form.skuPrefix) || normalizeSkuPrefix(skuPrefixDefault) || "AR";

    if (!asin) {
      setForm((prev) => (prev.sku === "" ? prev : { ...prev, sku: "" }));
      return;
    }

    const nextSku = conditionCode ? `${prefix}-${asin}-${conditionCode}` : `${prefix}-${asin}`;
    setForm((prev) => (prev.sku === nextSku ? prev : { ...prev, sku: nextSku }));
  }, [form.asin, form.condition, form.skuPrefix, conditions, skuPrefixDefault]);

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
  const handleReturnableChange = useCallback((checked) => {
    setForm((prev) => ({ ...prev, returnable: !!checked }));
  }, []);
  const handleAsinChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, asin: e.target.value.toUpperCase() }));
  }, []);

  const handleSingleSelect = useCallback(
    (field, selected, subcategoriesList) => {
      const value = selected?.value ?? "";
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "category") {
          const sub = subcategoriesList.find((s) => s._id === prev.subcategory);
          if (sub && (sub.category?._id ?? sub.category) !== value)
            next.subcategory = "";
        }
        return next;
      });
    },
    [],
  );

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
      if (!form.title || !form.sku)
        return toast.error("Title and SKU required ❌");

      const formData = new FormData();
      const {
        category,
        subcategory,
        brand,
        condition,
        competitors,
        ourMarketplace,
        skuPrefix,
        ...rest
      } = form;
      if (category) formData.append("category", category);
      if (subcategory) formData.append("subcategory", subcategory);
      if (brand) formData.append("brand", brand);
      if (condition) formData.append("condition", condition);
      const normalizedCompetitors = (competitors || [])
        .filter((c) => c && c.label && c.url)
        .slice(0, 8)
        .map((c) => ({ label: c.label.trim(), url: c.url.trim() }));
      if (normalizedCompetitors.length)
        formData.append("competitors", JSON.stringify(normalizedCompetitors));
      const normalizedOurMarketplace = (ourMarketplace || [])
        .filter((c) => c && c.label && c.url)
        .slice(0, 6)
        .map((c) => ({ label: c.label.trim(), url: c.url.trim() }));
      if (normalizedOurMarketplace.length)
        formData.append(
          "ourMarketplace",
          JSON.stringify(normalizedOurMarketplace),
        );
      Object.entries(rest).forEach(([key, value]) =>
        formData.append(key, value ?? ""),
      );

      const existingImages = productImages
        .filter((img) => !img.isNew && img.url)
        .map((img) => img.url);
      const newImageFiles = productImages
        .filter((img) => img.isNew && img.file)
        .map((img) => img.file);
      // Always send existingImages when updating so backend replaces (not appends); empty array = remove all then add new
      if (editingId)
        formData.append("existingImages", JSON.stringify(existingImages));
      newImageFiles.forEach((file) => formData.append("images", file));

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

      setForm({
        ...INITIAL_FORM,
        skuPrefix: normalizeSkuPrefix(skuPrefixDefault) || "AR",
      });
      setProductImages((prev) => {
        prev.forEach((img) => {
          if (
            img.isNew &&
            img.previewUrl &&
            img.previewUrl.startsWith("blob:")
          ) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
        return [];
      });
    },
    [form, productImages, editingId, updateMutation, createMutation, skuPrefixDefault],
  );

  const handleClear = useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      skuPrefix: normalizeSkuPrefix(skuPrefixDefault) || "AR",
    });
    setProductImages((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.previewUrl && img.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      return [];
    });
  }, [skuPrefixDefault]);

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

  const handleClearProductImage = useCallback(() => {
    setProductImages((prev) => {
      prev.forEach((img) => {
        if (img.isNew && img.previewUrl?.startsWith("blob:"))
          URL.revokeObjectURL(img.previewUrl);
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
        if (e.target instanceof Element && e.target.closest(".tox-dialog"))
          e.preventDefault();
      }}
      onPointerDownOutside={(e) => {
        if (e.target instanceof Element && e.target.closest(".tox-dialog"))
          e.preventDefault();
      }}
    >
      <DrawerHeader className="px-4 sm:px-6">
        <div className="flex items-start justify-between">
          <div>
            <DrawerTitle>
              {editingId ? "Edit Product" : "Add New Product"}
            </DrawerTitle>
            <DrawerDescription>
              {editingId
                ? "Update the product details."
                : "Fill in the details below to add a new product."}
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
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* —— Basic information —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Basic information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field>
                  <FieldLabel htmlFor="product-title">Product title</FieldLabel>
                </Field>
                <Input
                  id="product-title"
                  type="text"
                  name="title"
                  placeholder="Product title"
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
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={handleGenerateAsin}
                            disabled={generateAsinLoading}
                            aria-label="Auto generate ASIN"
                          >
                            {generateAsinLoading ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Wand2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Auto generate
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </Field>
                <Input
                  id="product-asin"
                  type="text"
                  name="asin"
                  maxLength={10}
                  placeholder="e.g. B0xxxxxxx"
                  value={form.asin}
                  onChange={handleAsinChange}
                  className="mt-1 w-full"
                  required
                />
              </div>
              <div>
                <Field>
                  <FieldLabel htmlFor="product-modelno">Model no.</FieldLabel>
                </Field>
                <Input
                  id="product-modelno"
                  type="text"
                  name="modelno"
                  placeholder="Model no."
                  value={form.modelno}
                  onChange={handleChange}
                  className="mt-1 w-full"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Field>
                  <div className="flex items-center gap-2">
                    <FieldLabel htmlFor="product-sku-prefix">SKU</FieldLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>SKU is a unique identifier for the product.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </Field>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="product-sku-prefix"
                    type="text"
                    name="skuPrefix"
                    placeholder="AR"
                    value={form.skuPrefix}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        skuPrefix: normalizeSkuPrefix(e.target.value),
                      }))
                    }
                    className="w-20 bg-muted"
                    maxLength={5}
                    required
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    id="product-sku-suffix"
                    type="text"
                    value={skuBody}
                    placeholder="ASIN-CC"
                    className="flex-1 bg-muted"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
          </section>

          {/* —— Pricing & stock —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Pricing & stock
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Field>
                  <FieldLabel htmlFor="product-purchasePrice">
                    Purchase price
                  </FieldLabel>
                </Field>
                <Input
                  id="product-purchasePrice"
                  type="number"
                  min="1"
                  name="purchasePrice"
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  className="mt-1 w-full"
                  required
                />
              </div>
              <div>
                <Field>
                  <FieldLabel htmlFor="product-salePrice">
                    Sale price
                  </FieldLabel>
                </Field>
                <Input
                  id="product-salePrice"
                  type="number"
                  min="1"
                  name="salePrice"
                  placeholder="0.00"
                  value={form.salePrice}
                  onChange={handleChange}
                  className="mt-1 w-full"
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
                  placeholder="0"
                  value={form.quantity}
                  onChange={handleChange}
                  className="mt-1 w-full"
                  required
                />
              </div>
            </div>
          </section>

          {/* —— Classification —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Classification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                </Field>
                <Combobox
                  options={categoryOptions}
                  value={form.category}
                  onChange={(value) =>
                    handleSingleSelect(
                      "category",
                      categoryOptions.find((o) => o.value === value) || null,
                      subcategories,
                    )
                  }
                  placeholder="Select category..."
                  className="mt-1"
                />
              </div>
              <div>
                <Field>
                  <FieldLabel>Subcategory</FieldLabel>
                </Field>
                <div className="flex items-center gap-2 mt-1">
                  <Combobox
                    options={subcategoryOptions}
                    value={form.subcategory}
                    onChange={(value) =>
                      handleSingleSelect(
                        "subcategory",
                        subcategoryOptions.find((o) => o.value === value) ||
                          null,
                        subcategories,
                      )
                    }
                    placeholder={
                      form.category
                        ? "Select subcategory..."
                        : "Select category first"
                    }
                    disabled={!form.category}
                  />
                  {!form?.category && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>Select a category first</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div>
                <Field>
                  <FieldLabel>Brand</FieldLabel>
                </Field>
                <Combobox
                  options={brandOptions}
                  value={form.brand}
                  onChange={(value) =>
                    handleSingleSelect(
                      "brand",
                      brandOptions.find((o) => o.value === value) || null,
                      subcategories,
                    )
                  }
                  placeholder="Select brand..."
                  className="mt-1"
                />
              </div>
              <div>
                <Field>
                  <FieldLabel>Condition</FieldLabel>
                </Field>
                <Combobox
                  options={conditionOptions}
                  value={form.condition}
                  onChange={(value) =>
                    handleSingleSelect(
                      "condition",
                      conditionOptions.find((o) => o.value === value) || null,
                      subcategories,
                    )
                  }
                  placeholder="Select condition..."
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 pt-1">
                <Field>
                  <FieldLabel htmlFor="product-returnable" className="mb-0">
                    Returnable
                  </FieldLabel>
                </Field>
                <Switch
                  id="product-returnable"
                  checked={form.returnable}
                  onCheckedChange={handleReturnableChange}
                />
                <span className="text-sm text-muted-foreground">
                  {form.returnable ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </section>

          {/* —— Description & specification —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Content
            </h3>
            <div className="space-y-4">
              <div>
                <Field>
                  <FieldLabel htmlFor="product-description">
                    Description
                  </FieldLabel>
                </Field>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.description}
                    onChange={handleDescriptionChange}
                    placeholder="Product description..."
                  />
                </div>
              </div>
              <div>
                <Field>
                  <FieldLabel htmlFor="product-specification">
                    Specification
                  </FieldLabel>
                </Field>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.specification}
                    onChange={handleSpecificationChange}
                    placeholder="Product specification..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* —— Competitors & marketplace (optional) —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Competitors & marketplace{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </h3>
            <div className="space-y-4">
              <div>
                <Field>
                  <FieldLabel>Competitor links (max 8)</FieldLabel>
                </Field>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  e.g. Amazon, Noon product URLs
                </p>
                <div className="space-y-2">
                  {(form.competitors || []).map((c, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Label (e.g. Amazon)"
                        value={c.label || ""}
                        onChange={(e) =>
                          setCompetitorField(idx, "label", e.target.value)
                        }
                        className="flex-1 min-w-0"
                      />
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={c.url || ""}
                        onChange={(e) =>
                          setCompetitorField(idx, "url", e.target.value)
                        }
                        className="flex-2 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeCompetitor(idx)}
                        aria-label="Remove competitor"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!form.competitors || form.competitors.length < 8) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCompetitor}
                    >
                      Add competitor
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Field>
                  <FieldLabel>Our marketplace (max 6)</FieldLabel>
                </Field>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  e.g. Shopify, website links
                </p>
                <div className="space-y-2">
                  {(form.ourMarketplace || []).map((c, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Label (e.g. Shopify)"
                        value={c.label || ""}
                        onChange={(e) =>
                          setOurMarketplaceField(idx, "label", e.target.value)
                        }
                        className="flex-1 min-w-0"
                      />
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={c.url || ""}
                        onChange={(e) =>
                          setOurMarketplaceField(idx, "url", e.target.value)
                        }
                        className="flex-2 min-w-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeOurMarketplace(idx)}
                        aria-label="Remove marketplace"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!form.ourMarketplace || form.ourMarketplace.length < 6) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOurMarketplace}
                    >
                      Add marketplace
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* —— Product images —— */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
              Product images
            </h3>
            <div className="flex flex-wrap gap-2">
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
              previewUrls={productImages.map((img) => img.previewUrl)}
              showPreview
              accept="image/*"
              className="mt-1"
              multiple
              primaryLabel="Upload product images"
              secondaryLabel="First image is primary. Drag to reorder."
              onRemove={handleRemoveImageAtIndex}
              onReorder={(fromIndex, toIndex) =>
                setProductImages((prev) => moveItem(prev, fromIndex, toIndex))
              }
              onReorderFrontFromIndex={(index) =>
                setProductImages((prev) => moveItem(prev, index, 0))
              }
            />
            {productImages.length > 0 && (
              <button
                type="button"
                onClick={handleClearProductImage}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear all images
              </button>
            )}
            <MediaGalleryModal
              open={mediaGalleryOpen}
              onOpenChange={setMediaGalleryOpen}
              multiple={true}
              title="Select product images"
              onConfirm={handleGallerySelect}
            />
          </section>

          {/* —— Actions —— */}
          <section className="flex gap-3 items-center flex-wrap pt-2 border-t border-border">
            <Button type="submit" variant="default" disabled={loading}>
              {loading
                ? "Please wait..."
                : editingId
                  ? "Update product"
                  : "Add product"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear form
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DrawerClose>
          </section>
        </form>
      </div>
    </DrawerContent>
  );
}
