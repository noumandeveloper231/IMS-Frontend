import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { Card, CardContent } from "@/components/UI/card";
import { Skeleton } from "@/components/UI/skeleton";
import { cn } from "@/lib/utils";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"))) {
    return src;
  }
  return `${API_HOST}${src}`;
};

const RelatedProductsByCategory = ({
  categoryId,
  currentProductId,
  title = "More in this category",
  titleClassName = "",
  limit = 8,
  className = "",
}) => {
  if (!categoryId) return null;

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products-by-category", categoryId, currentProductId, limit],
    queryFn: async () => {
      const res = await api.get(`/products/filter/category/${categoryId}`);
      const list = res.data?.products ?? res.data ?? [];
      if (!Array.isArray(list)) return [];
      const filtered = list.filter((p) => (p._id ?? p.id) !== currentProductId);
      return filtered.slice(0, limit);
    },
    enabled: Boolean(categoryId),
  });

  if (isLoading) {
    return (
      <section className={className}>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="border bg-white">
              <CardContent className="p-3 space-y-3">
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (isError || !data || data.length === 0) return null;

  return (
    <section className={className}>
      <h2 className={cn("text-lg font-semibold mb-3", titleClassName)}>{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {data.map((p) => {
          const imgSrc =
            (Array.isArray(p.images) && p.images.length && p.images[0]) || p.image;
          const productId = p._id ?? p.id;
          const price = Number(p.salePrice ?? p.purchasePrice ?? 0).toFixed(2);

          return (
            <Link
              key={productId}
              to={`/products/${productId}`}
              className="group h-full"
              title={p.title ? `View ${p.title}` : "View product"}
            >
              <Card className="h-full border bg-white transition-shadow group-hover:shadow-md hover:border-black">
                <CardContent className="p-3 flex flex-col">
                  <div className="aspect-square rounded-lg bg-muted/50 overflow-hidden mb-2">
                    {imgSrc ? (
                      <img
                        src={resolveImageUrl(imgSrc)}
                        alt={p.title || "Product image"}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2 text-gray-900 group-hover:text-primary">
                    {p.title || "Untitled product"}
                  </p>
                  <p className="text-xs text-destructive font-semibold mt-1">
                    AED {price}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedProductsByCategory;

