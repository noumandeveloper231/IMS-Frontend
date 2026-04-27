import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/UI/card";
import { API_HOST } from "../config/api";
import { useSettings } from "@/context/SettingsContext";
import ImageWithFallback from "@/components/UI/ImageWithFallback";

const getPrimaryImageUrl = (product) => {
  const primary =
    (Array.isArray(product.images) &&
      product.images.length &&
      product.images[0]) ||
    product.image ||
    null;

  if (!primary) return null;
  if (
    typeof primary === "string" &&
    (primary.startsWith("http://") || primary.startsWith("https://"))
  ) {
    return primary;
  }
  return `${API_HOST}${primary}`;
};

const ProductCard = ({ item, options = {} }) => {
  const { settings } = useSettings();
  const placeholderSrc =
    settings?.placeholderImage || "https://placehold.co/600x400/png";
  const currency = settings?.currency || "AED";

  if (!item) return null;

  const productLink = `/products/${item._id}`;

  const {
    showSKU = true,
    showModelNo = true,
    showBrand = true,
    showCategory = true,
    showCondition = true,
  } = options;

  return (
    <Link
      to={productLink}
      key={item._id ?? item.id ?? item.sku}
      className="group block h-full"
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--app-accent-border,#d1d5db)] bg-white shadow-sm transition-all duration-200 group-hover:border-[var(--app-accent,#111827)] hover:shadow-md">
        <div className="flex h-52 w-full items-center justify-center bg-gray-50 py-2">
          <ImageWithFallback
            src={getPrimaryImageUrl(item) || placeholderSrc}
            alt={item.title || "Product image"}
            className="h-full w-full object-contain transition-transform duration-200"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
            {item.title}
          </h3>
          <div className="flex items-baseline gap-2 text-sm">
            {item.purchasePrice != null && item.purchasePrice !== "" && (
              <span className="text-xs text-gray-400 line-through">
                {currency} {Number(item.purchasePrice).toFixed(2)}
              </span>
            )}
            <span className="text-lg font-bold text-red-600">
              {currency}{" "}
              {item.salePrice != null && item.salePrice !== ""
                ? Number(item.salePrice).toFixed(2)
                : "-"}
            </span>
          </div>
          <div className="mt-1 space-y-1 text-xs text-gray-600">
            {showSKU && (
              <p>
                <span className="font-medium text-gray-700">SKU:</span>{" "}
                {item.sku || "-"}
              </p>
            )}
            {showModelNo && (
              <p>
                <span className="font-medium text-gray-700">Model No:</span>{" "}
                {item.modelno || "-"}
              </p>
            )}
            {showBrand && (
              <p>
                <span className="font-medium text-gray-700">Brand:</span>{" "}
                {item?.brand?.name || "-"}
              </p>
            )}
            {showCategory && (
              <p>
                <span className="font-medium text-gray-700">Category:</span>{" "}
                {item?.category?.name || "-"}
              </p>
            )}
            {showCondition && (
              <p>
                <span className="font-medium text-gray-700">Condition:</span>{" "}
                {item?.condition?.name || "-"}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default ProductCard;
