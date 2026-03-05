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

              <CardContent className="space-y-4">

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

              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Classification
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

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

                {/* Condition */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Condition</span>
                  <Badge variant="outline">
                    {product.condition
                      ? (typeof product.condition === "object"
                        ? product.condition.name
                        : product.condition)
                      : "—"}
                  </Badge>
                </div>

                <Separator />

                {/* Refundable */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Refundable</span>
                  <Badge variant={product.refundable !== false ? "success" : "secondary"}>
                    {product.refundable !== false ? "Yes" : "No"}
                  </Badge>
                </div>

              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Identifiers
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col lg:flex-row gap-8">

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
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
              Description
            </p>
            <div
              className="tiptap text-gray-700 text-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
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
    </div>
  );
};

export default ProductDetail;

