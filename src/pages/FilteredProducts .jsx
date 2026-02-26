import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { Field } from "@/components/UI/field";
import { Input } from "@/components/UI/input";

const getPrimaryImageUrl = (product) => {
  const primary =
    (Array.isArray(product.images) && product.images.length && product.images[0]) ||
    product.image ||
    null;

  if (!primary) return null;
  if (typeof primary === "string" && (primary.startsWith("http://") || primary.startsWith("https://"))) {
    return primary;
  }
  return `${API_HOST}${primary}`;
};

const FilteredProducts = () => {
  const { type, id, status } = useParams();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Route can be /products/filter/stock/in-stock (type=stock, id=in-stock) or /products/stock/in-stock (status=in-stock)
        const stockStatus = status || (type === "stock" && id) ? (status || id) : null;
        if (stockStatus) {
          const res = await api.get("/products/getall");
          const allProducts = res.data?.products ?? res.data ?? [];
          let filteredByStock = allProducts;

          if (stockStatus === "in-stock") {
            filteredByStock = allProducts.filter((p) => (p.quantity ?? 0) > 0);
          } else if (stockStatus === "out-stock" || stockStatus === "out-of-stock") {
            filteredByStock = allProducts.filter((p) => (p.quantity ?? 0) === 0);
          }

          setProducts(filteredByStock);
        } else if (type === "subcategory" && id) {
          // Backend currently returns category-level results, so filter by subcategory on the client
          const res = await api.get("/products/getall");
          const allProducts = res.data?.products ?? res.data ?? [];
          const filteredBySub = allProducts.filter((p) =>
            (p.subcategories || []).some((s) => (s?._id ?? s) === id)
          );
          setProducts(filteredBySub);
        } else if (type && id) {
          const res = await api.get(`/products/filter/${type}/${id}`);
          setProducts(res.data?.products || []);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      }
    };
    fetchProducts();
  }, [type, id, status]);

  const rawStatus = status || (type === "stock" ? id : null);
  const displayStatus = rawStatus === "out-stock" ? "out-of-stock" : rawStatus;

  const filteredProducts = products.filter((item) => {
    const term = searchTerm.toLowerCase();

    return (
      item.title?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.modelno?.toLowerCase().includes(term) ||
      item.brands?.some((b) => b.name?.toLowerCase().includes(term)) ||
      item.categories?.some((c) => c.name?.toLowerCase().includes(term)) ||
      item.subcategories?.some((s) => s.name?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header / summary */}
        <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {displayStatus === "in-stock"
                ? "In stock products"
                : displayStatus === "out-of-stock"
                  ? "Out of stock products"
                  : "Filtered products"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Browse products that match the selected filter and quickly search within the
              list.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {displayStatus && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${displayStatus === "in-stock"
                    ? "bg-emerald-50 text-emerald-700"
                    : displayStatus === "out-of-stock"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-gray-50 text-gray-700"
                  }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {displayStatus === "in-stock"
                  ? "In stock"
                  : displayStatus === "out-of-stock"
                    ? "Out of stock"
                    : displayStatus}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
              {filteredProducts.length} of {products.length} products
            </span>
          </div>
        </div>

        {/* Search + grid */}
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-500">
              Use the search bar to filter by title, SKU, model, brand, or category.
            </div>
            <div className="w-full sm:w-80">
              <Field>
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  // className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((item, index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Image */}
                  <div className="flex h-52 w-full items-center justify-center bg-gray-50 p-4">
                    {getPrimaryImageUrl(item) ? (
                      <img
                        src={getPrimaryImageUrl(item)}
                        alt={item.title || "Product image"}
                        className="h-full w-full rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-sm italic text-gray-400">No image</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {item.title}
                    </h3>

                    <div className="flex items-baseline gap-2 text-sm">
                      {item.purchasePrice && (
                        <span className="text-xs text-gray-400 line-through">
                          AED {item.purchasePrice}
                        </span>
                      )}
                      <span className="text-lg font-semibold text-indigo-600">
                        AED {item.salePrice}
                      </span>
                    </div>

                    <div className="mt-1 space-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-medium text-gray-700">SKU:</span>{" "}
                        {item.sku || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Model No:</span>{" "}
                        {item.modelno || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Brand:</span>{" "}
                        {item.brands?.map((b) => b.name).join(", ") || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Category:</span>{" "}
                        {item.categories?.map((c) => c.name).join(", ") || "-"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Condition:</span>{" "}
                        {item.conditions?.map((c) => c.name).join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                <p className="font-medium">No products found</p>
                <p className="mt-1 text-xs text-gray-400">
                  Try changing the filter or adjusting your search term.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    // <div className="min-h-screen bg-gray-100 p-8 sm:p-12 max-w-full ml-16 md:ml-56">
    //   <h1 className="text-2xl font-bold mb-6">
    //     {status === "in-stock"
    //       ? "In Stock Products"
    //       : status === "out-of-stock"
    //       ? "Out of Stock Products"
    //       : "Products"}
    //   </h1>

    //   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    //     {products.length > 0 ? (
    //       products.map((item, index) => (
    //         <div
    //           key={index}
    //           className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-200 cursor-pointer"
    //         >
    //           {/* Image */}
    //           <div className="w-full h-56 p-4 flex items-center justify-center bg-gray-50">
    //             {item.images?.length > 0 ? (
    //               <img
    //                 src={`http://localhost:5000${item.images[0]}`}
    //                 alt="Product"
    //                 className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
    //               />
    //             ) : (
    //               <span className="text-gray-400 italic">No Image</span>
    //             )}
    //           </div>

    //           {/* Content */}
    //           <div className="p-4 flex flex-col space-y-2">
    //             <h3 className="text-gray-800 font-semibold text-lg line-clamp-2">
    //               {item.title}
    //             </h3>
    //             <div className="flex items-center gap-2">
    //               <span className="text-gray-400 line-through text-sm">
    //                 AED {item.purchasePrice}
    //               </span>
    //               <span className="text-indigo-600 font-bold text-xl">
    //                 AED {item.salePrice}
    //               </span>
    //             </div>
    //           </div>
    //         </div>
    //       ))
    //     ) : (
    //       <p>No products found 🚫</p>
    //     )}
    //   </div>
    // </div>
  );
};

export default FilteredProducts;