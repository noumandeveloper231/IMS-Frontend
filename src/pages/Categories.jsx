import React, { useState, useRef } from "react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldDescription, FieldLabel } from "@/components/UI/field"
import { Input } from "@/components/UI/input"
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone"

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/UI/pagination";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/UI/alert-dialog";
import { useImageModal } from "@/context/ImageModalContext";


const Categories = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleDropFile = (file) => {
    handleFileChange({ target: { files: [file] } });
    setPreview(URL.createObjectURL(file));
  };
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleClick = (id) => {
    navigate(`/products/filter/category/${id}`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories/getallcount");
      return res.data?.categories ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/categories/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category created successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } else {
        toast.error("Failed to create category ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/categories/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category updated successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } else {
        toast.error("Failed to update category ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/categories/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Category has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } else {
        toast.error("Failed to delete category ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Something went wrong ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append("name", name);
    if (image) formData.append("image", image);

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }

    setName("");
    setImage(null);
    setPreview(null);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  // Edit Category
  const handleEdit = (cat) => {
    setName(cat.name);
    setEditingId(cat._id);
    setPreview(cat.image ? resolveImageUrl(cat.image) : null);
    toast.info(`Editing Category: ${cat.name}`);
    // 🔹 input auto focus
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  };

  // 🔹 File change handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file)); // nayi image preview
    }
  };

  const filteredCategories = (categories || []).filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "");
    }
    return sortOrder === "asc"
      ? (a.productCount ?? 0) - (b.productCount ?? 0)
      : (b.productCount ?? 0) - (a.productCount ?? 0);
  });

  // Pagination
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

  // Export Excel
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredCategories);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
    XLSX.writeFile(workbook, "categories.xlsx");
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      try {
        await api.post("/categories/createbulk", jsonData);
        toast.success("Import complete ✅");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      } catch (err) {
        console.error("Bulk import error:", err);
        toast.error("Import failed");
      }
    };
    reader.readAsBinaryString(file);
  };
  // Import Excel/CSV
  // const handleImport = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;
  //   const reader = new FileReader();
  //   reader.onload = async (evt) => {
  //     const data = evt.target.result;
  //     const workbook = XLSX.read(data, { type: "binary" });
  //     const sheetName = workbook.SheetNames[0];
  //     const worksheet = workbook.Sheets[sheetName];
  //     const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //     for (let item of jsonData) {
  //       try {
  //         if (item.name && !categories.some((c) => c.name === item.name)) {
  //           await axios.post("http://localhost:5000/api/categories/create", {
  //             name: item.name,
  //           });
  //         }
  //       } catch (err) {
  //         console.error("Import error:", item.name);
  //       }
  //     }
  //     fetchCategories();
  //     toast.success("Import complete ✅");
  //   };
  //   reader.readAsBinaryString(file);
  // };

  const { openImageModal } = useImageModal()

  const handleClear = () => {
    setName("");
    setImage(null);
    setPreview(null);
    setEditingId(null);

    // ✅ file input bhi reset karna hoga
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        {/* Form section with enhanced styling */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Category" : "Add New Category"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="input-field-category">Name</FieldLabel>
            </Field>
            <Input
              type="text"
              placeholder="Category Name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              // className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              required
            />
            <ImageUploadDropzone
              onFileSelect={handleDropFile}
              previewUrl={preview}
            />
            {/* Image Preview */}
            {preview && (
              <div className="mt-2">
                <img
                  src={preview}
                  alt="Categories Preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              </div>
            )}

            <div className="flex gap-4 items-center flex-wrap">
              <Button
                variant="default"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : editingId
                    ? "Update Category"
                    : "Add Category"}
              </Button>
              <Label
                variant="light"
                onClick={handleImport}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer "
              >
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
                Import Excel
              </Label>
              <Label
                variant="success"
                onClick={handleExport}
                className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
              >
                Export Excel
              </Label>
              <Button
                variant="danger"
                onClick={handleClear}
                className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5! rounded-md"
              >
                Clear
              </Button>
            </div>
          </form>
        </div>

        {/* Table section with a more subtle card design */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="w-full text-2xl font-semibold text-gray-700">
              Categories List
            </h2>
            <div className="w-full flex gap-4 items-center">
              {/* Search - takes more space */}
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Select - smaller */}
              <div className="flex-1">
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Items per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {categoriesLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead onClick={() => handleSort("name")}>
                        <div className="flex items-center gap-2">
                          Category Name
                          {sortField === "name" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => handleSort("productCount")}>
                        <div className="flex items-center gap-2">
                          Product Count
                          {sortField === "productCount" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp01 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDown01 className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {currentCategories.map((cat, index) => (
                      <TableRow key={cat._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          {cat.image ? (
                            <img
                              src={cat.image ? resolveImageUrl(cat.image) : undefined}
                              alt={cat.name}
                              onClick={() => openImageModal(resolveImageUrl(cat.image))}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-300 shadow-sm active:shadow cursor-pointer"
                            />
                          ) : (
                            <span className="text-gray-400 italic">No Image</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-center font-medium" onClick={() => handleClick(cat._id)}>
                          {cat.productCount || 0}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(cat.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(cat.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(cat)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(cat._id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {currentCategories.length === 0 && (
                <p className="text-gray-500 text-center py-6">
                  No categories found
                </p>
              )}

              {/* Pagination with a cleaner look */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    {/* Previous Button */}
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.max(p - 1, 1));
                        }}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>

                    {/* Page Numbers */}
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {/* Next Button */}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((p) => Math.min(p + 1, totalPages));
                        }}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete category?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                selected category.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirmed}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div >
    </div >
  );
};

export default Categories;