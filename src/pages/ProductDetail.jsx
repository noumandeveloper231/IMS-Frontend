import React, { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/UI/button";
import { Badge } from "@/components/UI/badge";
import { useImageModal } from "@/context/ImageModalContext";
import { API_HOST } from "../config/api";
import RelatedProductsByCategory from "@/components/RelatedProductsByCategory";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/UI/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/card";
import DOMPurify from "dompurify";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/UI/carousel";
import { Separator } from "@/components/UI/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { Check, ExternalLink, Store } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/UI/sheet";


const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openImageModal } = useImageModal();
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState(null);
  const [conditionSheetOpen, setConditionSheetOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const res = await api.get(`/products/getone/${id}`);
      return res.data?.product ?? res.data;
    },
  });

  const product = data;

  const categoryId = useMemo(() => {
    if (!product?.category) return null;
    return typeof product.category === "object" ? product.category._id : product.category;
  }, [product]);

  const imageList = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length) {
      return product.images;
    }
    if (product.image) {
      return [product.image];
    }
    return [];
  }, [product]);

  const conditionName = product?.condition
    ? (typeof product.condition === "object" ? product.condition.name : product.condition)
    : null;

  const conditionDetail = useMemo(() => {
    const c = product?.condition;
    if (!c || typeof c !== "object") return null;
    return {
      name: c.name ?? conditionName ?? "Condition",
      description: c.description ?? "",
      tags: Array.isArray(c.tags) ? c.tags : [],
      exampleProductImages: Array.isArray(c.exampleProductImages) ? c.exampleProductImages : [],
    };
  }, [product?.condition, conditionName]);

  const ourMarketplaceList = useMemo(() => {
    const p = product;
    if (!p?.ourMarketplace) return [];
    if (Array.isArray(p.ourMarketplace)) {
      return p.ourMarketplace
        .filter((c) => c && (c.url || c.label || typeof c === "string"))
        .map((c) => {
          if (typeof c === "object" && c !== null) {
            return { label: c.label || "Marketplace", url: c.url || "" };
          }
          return { label: "Link", url: String(c) };
        })
        .filter((item) => item.url);
    }
    if (typeof p.ourMarketplace === "object") {
      return Object.entries(p.ourMarketplace)
        .filter(([, v]) => typeof v === "string" && v)
        .map(([label, url]) => ({ label, url }));
    }
    return [];
  }, [product]);

  const competitorsList = useMemo(() => {
    const p = product;
    if (!p?.competitors) return [];
    if (Array.isArray(p.competitors)) {
      return p.competitors
        .filter((c) => c && (c.url || c.label || typeof c === "string"))
        .map((c) => {
          if (typeof c === "object" && c !== null) {
            return { label: c.label || "Competitor", url: c.url || "" };
          }
          return { label: "Link", url: String(c) };
        })
        .filter((item) => item.url);
    }
    if (typeof p.competitors === "object") {
      return Object.entries(p.competitors)
        .filter(([, v]) => typeof v === "string" && v)
        .map(([label, url]) => ({ label, url }));
    }
    return [];
  }, [product]);

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const selected = carouselApi.selectedScrollSnap
        ? carouselApi.selectedScrollSnap()
        : 0;
      setActiveIndex(selected);
    };

    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);

    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 sm:p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 sm:p-8 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-lg w-full text-center space-y-4">
          <p className="text-lg font-semibold text-gray-800">
            Failed to load product details.
          </p>
          <Button onClick={() => navigate(-1)} title="Go back to previous page">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumb className="mb-2 text-xs sm:text-sm">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" title="Go to dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/products" title="Go to products list">Products</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/products/category/${categoryId}`} title="Go to category">{product?.category?.name || "Category"}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {product?.title || "Product detail"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 sm:mt-4 lg:mt-6 ">
          {/* Image gallery with carousel */}
          <div className="space-y-4 relative">
            <div className="max-h-screen flex flex-col sticky top-4 z-10 ">
              {imageList.length > 0 ? (
                <div className="flex gap-4">
                  <div className="flex-1 relative rounded-3xl bg-white p-[22px]">
                    <Carousel
                      className="w-full max-w-full"
                      opts={{ loop: true }}
                      setApi={setCarouselApi}
                    >
                      <CarouselContent>
                        {imageList.map((img, index) => (
                          <CarouselItem key={index}>
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardContent className="flex items-center justify-center p-0">
                                <img
                                  src={resolveImageUrl(img)}
                                  alt={`${product.title} ${index + 1}`}
                                  className="w-full max-h-[500px] object-contain cursor-zoom-in"
                                  title="Click to enlarge"
                                  onClick={() =>
                                    openImageModal(resolveImageUrl(img))
                                  }
                                />
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious
                        className="w-10 h-10 hidden sm:flex bg-white/90 shadow absolute top-1/2 left-5 -translate-y-1/2"
                        aria-label="Previous image"
                        title="Previous image"
                      />
                      <CarouselNext
                        className="w-10 h-10 hidden sm:flex bg-white/90 shadow absolute top-1/2 right-5 -translate-y-1/2"
                        aria-label="Next image"
                        title="Next image"
                      />
                    </Carousel>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[260px] sm:min-h-[320px] rounded-xl bg-gray-50">
                  <span className="text-gray-400 text-sm italic">
                    No images available
                  </span>
                </div>
              )}
              <div className="flex gap-2 overflow-y-auto p-3">
                {imageList.map((img, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            if (carouselApi?.scrollTo) {
                              carouselApi.scrollTo(index);
                            }
                          }}
                          title={`View image ${index + 1} of ${imageList.length}`}
                          aria-label={`Select image ${index + 1}`}
                          className={`relative rounded-xl border transition-all ${index === activeIndex
                            ? "border-black ring-3 ring-black"
                            : "border-gray-200 hover:border-black"
                            }`}
                        >
                          <img
                            src={resolveImageUrl(img)}
                            alt={`${product.title} ${index + 1}`}
                            className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-xl"
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Image {index + 1} of {imageList.length}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>

          {/* Product information */}
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <h1 className="text-lg sm:text-xl font-semibold">
                  {product.title}
                </h1>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Top: badges + prices */}
                <div className="space-y-4">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={product.quantity > 0 ? "success" : "danger"}>
                      {product.quantity > 0 ? "In Stock" : "Out of Stock"}: {product.quantity}
                    </Badge>

                    {product.asin && (
                      <Badge variant="light">
                        ASIN: <span className="text-gray-500 ml-1">{product.asin}</span>
                      </Badge>
                    )}

                    {product.modelno && (
                      <Badge variant="info">
                        Model: <span className="text-blue-500 ml-1">{product.modelno}</span>
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Price Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Sale Price
                      </p>
                      <p className="text-2xl font-semibold text-destructive">
                        AED {Number(product.salePrice).toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Purchase Price
                      </p>
                      <p className="text-xl font-semibold text-primary">
                        AED {Number(product.purchasePrice).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Condition section (screenshot style) */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">Condition:</span>
                      <span className="text-sm font-medium">{conditionName || "—"}</span>
                      {conditionDetail && (
                        <button
                          type="button"
                          onClick={() => setConditionSheetOpen(true)}
                          className="text-sm underline decoration-primary underline-offset-2 text-primary cursor-pointer hover:no-underline"
                          aria-label={`View details for ${conditionName}`}
                        >
                          Details
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                        <Check className="h-4 w-4" aria-hidden />
                        Phone Check
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-left min-w-[140px] transition-colors hover:bg-emerald-100"
                        aria-pressed="true"
                        aria-label={`Selected condition: ${conditionName}`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{conditionName || "—"}</p>
                        <p className="text-base font-semibold text-emerald-700 mt-0.5">
                          AED {Number(product.salePrice).toFixed(2)}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Our marketplace – grid cards */}
                  {ourMarketplaceList.length > 0 && (
                    <div className="space-y-3">
                      <h1 className="text-lg font-semibold">Our marketplace</h1>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ourMarketplaceList.map((item, idx) => (
                          <a
                            key={idx}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-1 shadow-sm hover:border-primary hover:shadow-md transition-all"
                          >
                            <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                            <span className="text-xs text-muted-foreground truncate" title={item.url}>
                              {item.url}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-1" aria-hidden />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Classification section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Classification
                    </CardTitle>
                  </div>

                  {/* Category */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="info">
                      {product.category
                        ? (typeof product.category === "object"
                          ? product.category.name
                          : product.category)
                        : "—"}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Subcategory */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subcategory</span>
                    <span className="text-sm font-medium">
                      {product.subcategory
                        ? (typeof product.subcategory === "object"
                          ? product.subcategory.name
                          : product.subcategory)
                        : "—"}
                    </span>
                  </div>

                  <Separator />

                  {/* Brand */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Brand</span>
                    <span className="text-sm font-medium">
                      {product.brand
                        ? (typeof product.brand === "object"
                          ? product.brand.name
                          : product.brand)
                        : "—"}
                    </span>
                  </div>

                  <Separator />

                  {/* Returnable */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Returnable</span>
                    <Badge variant={product.returnable !== false ? "success" : "secondary"}>
                      {product.returnable !== false ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Competitors – two-column grid cards */}
                {competitorsList.length > 0 && (
                  <div className="space-y-3">
                    <h1 className="text-lg font-semibold">Competitors</h1>
                    <div className="grid grid-cols-2 gap-3">
                      {competitorsList.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 flex items-center gap-3 shadow-sm hover:border-gray-300 hover:bg-gray-100 transition-all"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-600">
                            <Store className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Identifiers section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Identifiers
                    </CardTitle>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* LEFT SIDE — IDENTIFIER DETAILS */}
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SKU</span>
                        <span className="text-sm font-medium">{product.sku || "—"}</span>
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">ASIN</span>
                        <span className="text-sm font-medium">{product.asin || "—"}</span>
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Model No.</span>
                        <span className="text-sm font-medium">{product.modelno || "—"}</span>
                      </div>
                    </div>

                    {/* RIGHT SIDE — QR CODE PANEL */}
                    <div className="w-full lg:w-64 border rounded-xl p-4 flex flex-col items-center gap-4 bg-muted/40">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        QR Code
                      </p>

                      {product.qrCode ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group p-3 bg-white rounded-xl shadow-sm cursor-pointer w-fit">
                                <img
                                  src={product.qrCode}
                                  alt="QR Code"
                                  onClick={() => openImageModal(product.qrCode)}
                                  className="h-32 w-32 object-contain"
                                  title="Click to view full size"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              Click to view full size
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          No QR code available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {product.description && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="tinymce text-gray-700 text-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </CardContent>
          </Card>
        )}
        {product.specification && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Specification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="tinymce text-gray-700 text-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.specification }}
              />
            </CardContent>
          </Card>
        )}

        <RelatedProductsByCategory
          categoryId={categoryId}
          currentProductId={id}
          title="More in this category"
          limit={4}
          titleClassName="text-xl font-semibold text-center"
        />
      </div>

      {/* Condition details sheet */}
      <Sheet open={conditionSheetOpen} onOpenChange={setConditionSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto rounded-tl-2xl rounded-bl-2xl p-0 flex flex-col"
        >
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <SheetHeader className="text-left space-y-1 pr-8">
              <SheetTitle className="text-xl sm:text-2xl font-bold text-foreground">
                {conditionDetail?.name ?? "Condition"}
              </SheetTitle>
            </SheetHeader>

            {conditionDetail?.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {conditionDetail.description}
              </p>
            )}

            {conditionDetail?.tags && conditionDetail.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conditionDetail.tags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {conditionDetail?.exampleProductImages && conditionDetail.exampleProductImages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Example product images</p>
                <div className="grid grid-cols-2 gap-3">
                  {conditionDetail.exampleProductImages.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openImageModal(resolveImageUrl(url))}
                      className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 hover:opacity-95 transition-opacity"
                    >
                      <img
                        src={resolveImageUrl(url)}
                        alt={`Example ${idx + 1}`}
                        className="w-full h-full object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!conditionDetail?.description &&
              (!conditionDetail?.tags || conditionDetail.tags.length === 0) &&
              (!conditionDetail?.exampleProductImages || conditionDetail.exampleProductImages.length === 0) && (
                <p className="text-sm text-muted-foreground">No additional details for this condition.</p>
              )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProductDetail;

