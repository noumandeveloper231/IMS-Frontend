import React, { useState } from "react";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
} from "lucide-react";

const EcommerceStore = () => {
  const [selectedView, setSelectedView] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([68000, 0]);

  const products = [
    {
      id: 1,
      name: "Hisense 45L Toaster Oven with Functions",
      price: 219,
      originalPrice: 349,
      discount: 37,
      image: "/api/placeholder/280/280",
      badge: "BRAND NEW",
      status: "available",
    },
    {
      id: 2,
      name: "Terim TERFL710VS, 7 Kg Front Load Fully",
      price: 449,
      originalPrice: 699,
      discount: 35,
      image: "/api/placeholder/280/280",
      badge: "OPEN-BOX MAX",
      status: "sold_out",
    },
    {
      id: 3,
      name: "Kelon Single Door Refrigerator 122 Liter",
      price: 349,
      originalPrice: 449,
      discount: 22,
      image: "/api/placeholder/280/280",
      badge: "BRAND NEW",
      status: "sold_out",
    },
    {
      id: 4,
      name: "Skilltech SH45F 26-65 Inch Screen Fixed Wall",
      price: 29,
      originalPrice: 49,
      discount: 41,
      image: "/api/placeholder/280/280",
      badge: "BRAND NEW",
      status: "available",
    },
  ];

  const categories = [
    { name: "All Electronics", count: 79 },
    { name: "Books", count: 5 },
    { name: "Computer & Office Supplies", count: 22 },
    { name: "Health, Beauty & Perfumes", count: 6 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-900 to-blue-800 rounded-full flex items-center justify-center relative">
                <div className="w-6 h-6 bg-orange-500 rounded-full absolute -top-1 -right-1"></div>
                <span className="text-white font-bold text-sm">AR</span>
              </div>
              <h1 className="text-xl font-bold text-blue-900">
                AL RAMIL AL ABYAD
              </h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative flex">
                <input
                  type="text"
                  placeholder="Search for products"
                  className="w-full px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select className="px-4 py-2 border-t border-b border-gray-300 bg-white text-sm">
                  <option>SELECT CATEGORY</option>
                  <option>Electronics</option>
                  <option>Appliances</option>
                </select>
                <button className="px-6 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200">
                  <Search className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-700 hover:text-blue-600">
                LOGIN / REGISTER
              </button>
              <div className="relative">
                <Heart className="w-6 h-6 text-gray-600" />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </div>
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-600" />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </div>
              <span className="text-gray-600">د.إ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-8 h-12">
            <div className="bg-orange-600 text-white px-4 py-2 rounded flex items-center space-x-2 cursor-pointer">
              <List className="w-4 h-4" />
              <span className="font-medium">ALL CATEGORIES</span>
              <ChevronDown className="w-4 h-4" />
            </div>
            <a
              href="#"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              PRODUCTS
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              ALL APPLIANCES
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              ALL ELECTRONICS
            </a>
            <a
              href="#"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              CLEARANCE SALE
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-80 bg-white rounded-lg p-6 h-fit shadow-sm">
            {/* Price Filter */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                FILTER BY PRICE
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([parseInt(e.target.value), priceRange[1]])
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], parseInt(e.target.value)])
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer absolute top-0"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Price: {priceRange[0].toLocaleString()}.د — {priceRange[1]}
                    .د
                  </span>
                  <button className="bg-gray-800 text-white px-4 py-1 rounded text-sm hover:bg-gray-700">
                    FILTER
                  </button>
                </div>
              </div>
            </div>

            {/* Product Categories */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                PRODUCT CATEGORIES
              </h3>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <span className="text-gray-700">{category.name}</span>
                    <span className="text-gray-500 text-sm">
                      {category.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Breadcrumb & Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-500">
                Home / Products / Page 2
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>24</option>
                    <option>28</option>
                    <option>32</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedView("grid2")}
                    className={`p-2 rounded ${
                      selectedView === "grid2"
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-1 w-4 h-4">
                      <div className="bg-gray-400 rounded-sm"></div>
                      <div className="bg-gray-400 rounded-sm"></div>
                      <div className="bg-gray-400 rounded-sm"></div>
                      <div className="bg-gray-400 rounded-sm"></div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedView("grid3")}
                    className={`p-2 rounded ${
                      selectedView === "grid3"
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedView("grid4")}
                    className={`p-2 rounded ${
                      selectedView === "grid4"
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="grid grid-cols-4 gap-1 w-4 h-4">
                      {[...Array(16)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-gray-400 rounded-sm w-0.5 h-0.5"
                        ></div>
                      ))}
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group"
                >
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-blue-900 text-white px-2 py-1 rounded text-xs font-semibold">
                        -{product.discount}%
                      </span>
                    </div>
                    {product.status === "sold_out" && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3">
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          product.badge === "BRAND NEW"
                            ? "bg-orange-500 text-white"
                            : "bg-orange-600 text-white"
                        }`}
                      >
                        {product.badge}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-800 mb-2 line-clamp-2 h-12">
                      {product.name}
                    </h3>
                    <div className="flex items-center space-x-2 mb-3">
                      {product.originalPrice && (
                        <span className="text-gray-400 line-through text-sm">
                          {product.originalPrice}.د
                        </span>
                      )}
                      <span className="font-bold text-lg text-gray-800">
                        {product.price}.د
                      </span>
                      <span className="text-gray-500 text-sm">incl. VAT</span>
                    </div>
                    <button
                      className={`w-full py-2 rounded font-medium transition-colors duration-200 ${
                        product.status === "sold_out"
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      disabled={product.status === "sold_out"}
                    >
                      {product.status === "sold_out"
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <nav className="flex space-x-2">
                <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded bg-blue-600 text-white">
                  1
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  2
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  3
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default EcommerceStore;
