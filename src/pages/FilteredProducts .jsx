import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { API_HOST } from "../config/api";

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
          const res = await api.get(`/products/filter/stock/${stockStatus}`);
          setProducts(res.data?.products || []);
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

  const displayStatus = status || (type === "stock" ? id : null);

  const filteredProducts = products.filter((item) => {
    const term = searchTerm.toLowerCase();

    return (
      item.title?.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term) ||
      item.modelno?.toLowerCase().includes(term) ||
      item.brands?.some((b) => b.name?.toLowerCase().includes(term)) ||
      item.categories?.some((c) => c.name?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8 sm:p-12 max-w-full">
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
        {/* ✅ Dynamic Heading */}
        <h1 className="text-2xl font-bold mb-4">
          {displayStatus === "in-stock"
            ? "In Stock Products"
            : displayStatus === "out-of-stock"
            ? "Out of Stock Products"
            : "Products"}
        </h1>
        {/* 🔎 Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-1/2 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((item, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-200 cursor-pointer"
              >
                {/* Image */}
                <div className="w-full h-56 p-4 flex items-center justify-center bg-white">
                  {item.image && item.image.length > 0 ? (
                    <img
                      src={item.image ? `${API_HOST}${item.image}` : undefined}
                      alt="Product"
                      className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-gray-400 italic">No Image</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col space-y-2">
                  <h3 className="text-gray-800 font-semibold text-lg line-clamp-2">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 line-through text-sm">
                      AED {item.purchasePrice}
                    </span>
                    <span className="text-indigo-600 font-bold text-xl">
                      AED {item.salePrice}
                    </span>
                  </div>

                  {/* Extra Details */}
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      <span className="font-medium text-gray-700">SKU:</span>{" "}
                      {item.sku}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Model No:
                      </span>{" "}
                      {item.modelno}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Brand:</span>{" "}
                      {item.brands.map((b) => b.name).join(", ")}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Category:
                      </span>{" "}
                      {item.categories.map((c) => c.name).join(", ")}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        Condition:
                      </span>{" "}
                      {item.conditions.map((c) => c.name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 text-lg">
              No products found 🚫
            </p>
          )}
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

// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import axios from "axios";

// const FilteredProducts = () => {
//   const { type, id } = useParams(); // ✅ brand/category/condition + id
//   const [products, setProducts] = useState([]);

//   useEffect(() => {
//     const fetchProducts = async () => {
//       try {
//         const res = await axios.get(
//           `http://localhost:5000/api/products/filter/${type}/${id}`
//         );
//         console.log(res);
//         setProducts(res.data.products);
//       } catch (error) {
//         console.error("Error fetching products:", error);
//       }
//     };
//     fetchProducts();
//   }, [type, id]);

//   return (
//     <>
//       <div className="min-h-screen bg-gray-100 p-8 sm:p-12 max-w-full ml-16 md:ml-56">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {products.map((item, index) => (
//             <div
//               key={index}
//               className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-200 cursor-pointer"
//             >
//               {/* Image */}
//               <div className="w-full h-56 p-4 flex items-center justify-center bg-gray-50">
//                 {item.images && item.images.length > 0 ? (
//                   <img
//                     src={`http://localhost:5000${item.images[0]}`}
//                     alt="Product"
//                     className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
//                   />
//                 ) : (
//                   <span className="text-gray-400 italic">No Image</span>
//                 )}
//               </div>

//               {/* Content */}
//               <div className="p-4 flex flex-col space-y-2">
//                 <h3 className="text-gray-800 font-semibold text-lg line-clamp-2">
//                   {item.title}
//                 </h3>

//                 <div className="flex items-center gap-2">
//                   <span className="text-gray-400 line-through text-sm">
//                     AED {item.purchasePrice}
//                   </span>
//                   <span className="text-indigo-600 font-bold text-xl">
//                     AED {item.salePrice}
//                   </span>
//                 </div>

//                 <div className="text-sm text-gray-500 space-y-1">
//                   <p>
//                     <span className="font-medium text-gray-700">SKU:</span>{" "}
//                     {item.sku}
//                   </p>
//                   <p>
//                     <span className="font-medium text-gray-700">Model No:</span>{" "}
//                     {item.modelno}
//                   </p>
//                   <p>
//                     <span className="font-medium text-gray-700">Brand:</span>{" "}
//                     {item.brands.map((b) => b.name).join(", ")}
//                   </p>
//                   <p>
//                     <span className="font-medium text-gray-700">Category:</span>{" "}
//                     {item.categories.map((c) => c.name).join(", ")}
//                   </p>
//                   <p>
//                     <span className="font-medium text-gray-700">
//                       Condition:
//                     </span>{" "}
//                     {item.conditions.map((c) => c.name).join(", ")}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </>
//   );
// };

// export default FilteredProducts;
