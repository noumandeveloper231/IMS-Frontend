import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import { ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const ExpenseCategories = () => {
  const nameInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/expense-categories/getall");
      setCategories(res.data?.categories ?? res.data ?? []);
    } catch (err) {
      toast.error("Failed to fetch expense categories ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const categoryData = {
        name: name.trim(),
        description: description.trim(),
      };

      if (editingId) {
        const response = await api.put(
          `/expense-categories/update/${editingId}`,
          categoryData
        );
        if (response.data.success) {
          toast.success(response.data.message || "Expense Category updated ✅");
        } else {
          toast.error(response.data.message || "Failed to update ❌");
        }
      } else {
        const response = await api.post(
          "/expense-categories/create",
          categoryData
        );
        if (response.data.success) {
          toast.success(response.data.message || "Expense Category created ✅");
        } else {
          toast.error(response.data.message || "Failed to create ❌");
        }
      }

      handleClear();
      fetchCategories();
    } catch (err) {
      toast.error("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  // Delete Category with SweetAlert2
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Do you really want to delete this expense category?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return; // User cancelled

      setLoading(true);

      const response = await api.delete(
        `/expense-categories/delete/${id}`
      );

      if (response.data.success) {
        await Swal.fire({
          title: "Deleted!",
          text: "Expense Category has been deleted successfully.",
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
        fetchCategories(); // Refresh categories list
      }
    } catch (err) {
      console.error("Error deleting expense category:", err);
      Swal.fire({
        title: "Error!",
        text: "Failed to delete expense category. Please try again.",
        icon: "error",
        confirmButtonColor: "#3085d6",
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit Category
  const handleEdit = (category) => {
    setName(category.name);
    setDescription(category.description || "");
    setEditingId(category._id);
    toast.info(`Editing expense category: ${category.name}`);
    // Auto focus on name input
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  // Search filter
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting logic
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortField === "createdAt") {
      return sortOrder === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCategories = sortedCategories.slice(indexOfFirst, indexOfLast);

  const handleSort = (field) => {
    if (sortField === field) {
      // same field → toggle order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // new field → reset to asc
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Export to Excel
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredCategories);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ExpenseCategories");
    XLSX.writeFile(workbook, "expense-categories.xlsx");
  };

  const handleClear = () => {
    setName("");
    setDescription("");
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 sm:p-12 max-w-full  ">
      <div className="max-w-7xl mx-auto">
        {/* Form section with enhanced styling */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Expense Category" : "Add New Expense Category"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Category Name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              required
            />
            <textarea
              placeholder="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              rows="3"
            />
            <div className="flex gap-4 items-center flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:transform-none"
              >
                {loading
                  ? "Please wait..."
                  : editingId
                  ? "Update Category"
                  : "Add Category"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-colors duration-300 transform hover:scale-105 active:scale-95"
              >
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-3 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-colors duration-300 transform hover:scale-105 active:scale-95"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Table section with a more subtle card design */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-700">
              Expense Categories List
            </h2>
            <div className="flex gap-4 items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-2 border border-gray-300 rounded-xl bg-white text-gray-700"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th
                        className="p-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Category Name
                          {sortField === "name" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </th>
                      <th className="p-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th
                        className="p-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-2">
                          Created At
                          {sortField === "createdAt" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </th>
                      <th className="p-4 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentCategories.map((category, index) => (
                      <tr
                        key={category._id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="p-4 whitespace-nowrap text-sm text-gray-900">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="p-4 whitespace-nowrap font-medium text-gray-900">
                          {category.name}
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                          {category.description || "-"}
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(category.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(category._id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
                              title="Delete"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.82 11.23A2 2 0 0116.18 20H7.82a2 2 0 01-1.99-1.77L5 7m4 0v12"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 11v6m4-6v6"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 7V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v3"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {currentCategories.length === 0 && (
                <p className="text-gray-500 text-center py-6">
                  No expense categories found
                </p>
              )}

              {/* Pagination with a cleaner look */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 border border-gray-300 rounded-lg transition-colors ${
                          currentPage === i + 1
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseCategories;
