import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
import { Button } from "@/components/UI/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/UI/table";
import { ArrowLeft } from "lucide-react";
import { useImageModal } from "@/context/ImageModalContext";
import { API_HOST } from "../config/api";

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

  const primaryImage = imageList[activeIndex] || imageList[0] || null;

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
        <div className="bg-white rounded-xl shadow-md p-8 max-w-lg w-full text-center space-y-4">
          <p className="text-lg font-semibold text-gray-800">
            Failed to load product details.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {product.title}
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">SKU:</span>{" "}
            {product.sku}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image gallery */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="group relative overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center min-h-[260px] sm:min-h-[320px]">
                {primaryImage ? (
                  <img
                    src={resolveImageUrl(primaryImage)}
                    alt={product.title}
                    className="max-h-[360px] w-auto object-contain transition-transform duration-300 group-hover:scale-110 cursor-zoom-in"
                    onClick={() =>
                      openImageModal(resolveImageUrl(primaryImage))
                    }
                  />
                ) : (
                  <span className="text-gray-400 text-sm italic">
                    No images available
                  </span>
                )}
              </div>
            </div>

            {imageList.length > 1 && (
              <div className="bg-white rounded-2xl shadow-sm p-3">
                <div className="flex gap-3 overflow-x-auto">
                  {imageList.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`relative flex-shrink-0 rounded-lg border transition-all ${
                        index === activeIndex
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <img
                        src={resolveImageUrl(img)}
                        alt={`${product.title} ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product information */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  In Stock: {product.quantity}
                </div>
                {product.asin && (
                  <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    ASIN: {product.asin}
                  </div>
                )}
                {product.modelno && (
                  <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Model: {product.modelno}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Purchase Price
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    AED {product.purchasePrice}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Sale Price
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    AED {product.salePrice}
                  </p>
                </div>
              </div>

              {product.description && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Classification
              </h2>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-40 font-medium text-gray-500">
                      Categories
                    </TableCell>
                    <TableCell className="text-sm text-gray-800">
                      {(product.categories || [])
                        .map((c) => c.name)
                        .join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="w-40 font-medium text-gray-500">
                      Subcategories
                    </TableCell>
                    <TableCell className="text-sm text-gray-800">
                      {(product.subcategories || [])
                        .map((s) => s.name)
                        .join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="w-40 font-medium text-gray-500">
                      Brands
                    </TableCell>
                    <TableCell className="text-sm text-gray-800">
                      {(product.brands || []).map((b) => b.name).join(", ") ||
                        "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="w-40 font-medium text-gray-500">
                      Conditions
                    </TableCell>
                    <TableCell className="text-sm text-gray-800">
                      {(product.conditions || [])
                        .map((c) => c.name)
                        .join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <h2 className="text-base font-semibold text-gray-900">
                  Identifiers
                </h2>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-40 font-medium text-gray-500">
                        SKU
                      </TableCell>
                      <TableCell className="text-sm text-gray-800">
                        {product.sku || "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-40 font-medium text-gray-500">
                        ASIN
                      </TableCell>
                      <TableCell className="text-sm text-gray-800">
                        {product.asin || "—"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-40 font-medium text-gray-500">
                        Model No.
                      </TableCell>
                      <TableCell className="text-sm text-gray-800">
                        {product.modelno || "—"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="w-full sm:w-48 flex flex-col items-center justify-center border rounded-xl bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  QR Code
                </p>
                {product.qrCode ? (
                  <img
                    src={product.qrCode}
                    alt="QR Code"
                    className="h-32 w-32 object-contain cursor-pointer"
                    onClick={() => openImageModal(product.qrCode)}
                  />
                ) : (
                  <span className="text-gray-400 text-xs italic">
                    No QR code
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back to previous page
          </Button>
          <Link to="/products">
            <Button variant="default">Back to products list</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

