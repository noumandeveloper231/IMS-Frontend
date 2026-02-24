import React, { useState, useRef } from "react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { ImageUploadDropzone } from "@/components/ui/image-upload-dropzone";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const Brands = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const handleClick = (id) => {
    navigate(`/products/filter/brand/${id}`);
  };

  const handleDropFile = (file) => {
    handleFileChange({ target: { files: [file] } });
    setPreview(URL.createObjectURL(file));
  };

  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands/getallcount");
      return res.data?.brands ?? [];
    },
  });
  const brands = brandsData ?? [];

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/brands/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Brand created ✅");
        queryClient.invalidateQueries({ queryKey: ["brands"] });
      } else {
        toast.error(data?.message || "Failed to create ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/brands/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Brand updated ✅");
        queryClient.invalidateQueries({ queryKey: ["brands"] });
      } else {
        toast.error(data?.message || "Failed to update ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/brands/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Brand has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["brands"] });
      } else {
        toast.error("Failed to delete brand ❌");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleEdit = (brand) => {
    setName(brand.name);
    setEditingId(brand._id);
    setPreview(brand.image ? `${API_HOST}${brand.image}` : null);
    toast.info(`Editing brand: ${brand.name}`);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const filteredBrands = (brands || []).filter((b) =>
    (b.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedBrands = [...filteredBrands].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "");
    }
    return sortOrder === "asc"
      ? (a.productCount ?? 0) - (b.productCount ?? 0)
      : (b.productCount ?? 0) - (a.productCount ?? 0);
  });

  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentBrands = sortedBrands.slice(indexOfFirst, indexOfLast);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredBrands);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Brands");
    XLSX.writeFile(workbook, "brands.xlsx");
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
        await api.post("/brands/createbulk", jsonData);
        toast.success("Import complete ✅");
        queryClient.invalidateQueries({ queryKey: ["brands"] });
      } catch (err) {
        console.error("Bulk import error:", err);
        toast.error("Import failed");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClear = () => {
    setName("");
    setImage(null);
    setPreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Brand" : "Add New Brand"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="input-field-brand">Name</FieldLabel>
            </Field>
            <Input
              id="input-field-brand"
              type="text"
              placeholder="Brand Name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <ImageUploadDropzone onFileSelect={handleDropFile} previewUrl={preview} />
            {preview && (
              <div className="mt-2">
                <img
                  src={preview}
                  alt="Brand Preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="flex gap-4 items-center flex-wrap">
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? "Please wait..." : editingId ? "Update Brand" : "Add Brand"}
              </Button>
              <Label
                variant="light"
                onClick={handleImport}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer"
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
                className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md"
              >
                Clear
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="w-full text-2xl font-semibold text-gray-700">Brands List</h2>
            <div className="w-full flex gap-4 items-center">
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search brands..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
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
                  <SelectContent>
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

          {brandsLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
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
                          Brand Name
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
                    {currentBrands.map((brand, index) => (
                      <TableRow key={brand._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          {brand.image ? (
                            <img
                              src={`${API_HOST}${brand.image}`}
                              alt={brand.name}
                              className="w-12 h-12 object-cover rounded-lg border"
                            />
                          ) : (
                            <span className="text-gray-400 italic">No Image</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell
                          className="text-center font-medium cursor-pointer"
                          onClick={() => handleClick(brand._id)}
                        >
                          {brand.productCount ?? 0}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(brand.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(brand.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(brand)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            />
                            <button
                              onClick={() => confirmDelete(brand._id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
                              title="Delete"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {currentBrands.length === 0 && (
                <p className="text-gray-500 text-center py-6">No brands found</p>
              )}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
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
              <AlertDialogTitle>Delete brand?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected brand.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirmed} disabled={loading}>
                {loading ? "Deleting..." : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Brands;
