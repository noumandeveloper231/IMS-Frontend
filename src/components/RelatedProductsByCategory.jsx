import React from "react";
// import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
// import { API_HOST } from "../config/api";
import { Card, CardContent } from "@/components/UI/card";
import { Skeleton } from "@/components/UI/skeleton";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";
import { Button } from "./UI/button";
import { useNavigate } from "react-router-dom";

const RelatedProductsByCategory = ({
  categoryId,
  currentProductId,
  title = "More in this category",
  titleClassName = "",
  limit = 8,
  className = "",
}) => {
  const navigate = useNavigate();

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
          return (
            <ProductCard options={{
              showSKU: false,
              showModelNo: false,
              showBrand: false,
              showCategory: false,
              showCondition: false,
            }} key={p._id ?? p.id ?? p.sku} item={p} />
          );
        })}
      </div>

      <Button
        variant="ghost"
        className="w-full hover:underline text-lg mt-4"
        onClick={() => {
          navigate(`/products/list?filterType=category&filter=${categoryId}`);
        }}
      >
        View all
      </Button>
    </section>
  );
};

export default RelatedProductsByCategory;

