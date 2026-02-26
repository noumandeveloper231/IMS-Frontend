import React, { useState, useRef } from "react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";

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

const Conditions = () => {
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
    navigate(`/products/filter/condition/${id}`);
  };

  const handleDropFile = (file) => {
    handleFileChange({ target: { files: [file] } });
    setPreview(URL.createObjectURL(file));
  };

  const { data: conditionsData, isLoading: conditionsLoading } = useQuery({
    queryKey: ["conditions"],
    queryFn: async () => {
      const res = await api.get("/conditions/getallcount");
      return res.data?.conditions ?? [];
    },
  });
  const conditions = conditionsData ?? [];

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/conditions/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Condition created ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
      } else {
        toast.error(data?.message || "Failed to create ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/conditions/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Condition updated ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
      } else {
        toast.error(data?.message || "Failed to update ❌");
      }
    },
    onError: () => toast.error("Something went wrong ❌"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/conditions/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Condition has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
      } else {
        toast.error("Failed to delete condition ❌");
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

  const handleEdit = (cond) => {
    setName(cond.name);
    setEditingId(cond._id);
    setPreview(cond.image ? resolveImageUrl(cond.image) : null);
    toast.info(`Editing condition: ${cond.name}`);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const filteredConditions = (conditions || []).filter((c) =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConditions = [...filteredConditions].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "");
    }
    return sortOrder === "asc"
      ? (a.productCount ?? 0) - (b.productCount ?? 0)
      : (b.productCount ?? 0) - (a.productCount ?? 0);
  });

  const totalPages = Math.ceil(filteredConditions.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentConditions = sortedConditions.slice(indexOfFirst, indexOfLast);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredConditions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conditions");
    XLSX.writeFile(workbook, "conditions.xlsx");
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
        await api.post("/conditions/createbulk", jsonData);
        toast.success("Import complete ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
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

  const { openImageModal } = useImageModal();
  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Condition" : "Add New Condition"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="input-field-condition">Name</FieldLabel>
            </Field>
            <Input
              id="input-field-condition"
              type="text"
              placeholder="Condition Name"
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
                  alt="Condition Preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="flex gap-4 items-center flex-wrap">
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? "Please wait..." : editingId ? "Update Condition" : "Add Condition"}
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
            <h2 className="w-full text-2xl font-semibold text-gray-700">Conditions List</h2>
            <div className="w-full flex gap-4 items-center">
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search conditions..."
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

          {conditionsLoading ? (
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
                          Condition Name
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
                    {currentConditions.map((cond, index) => (
                      <TableRow key={cond._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell>
                          {cond.image ? (
                            <img
                              src={resolveImageUrl(cond.image)}
                              alt={cond.name}
                              onClick={() => openImageModal(resolveImageUrl(cond.image))}
                              className="w-30 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
                            />
                          ) : (
                            <span className="text-gray-400 italic">No Image</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{cond.name}</TableCell>
                        <TableCell
                          className="text-center font-medium cursor-pointer"
                          onClick={() => handleClick(cond._id)}
                        >
                          {cond.productCount ?? 0}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(cond.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(cond.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(cond)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(cond._id)}
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
              {currentConditions.length === 0 && (
                <p className="text-gray-500 text-center py-6">No conditions found</p>
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
              <AlertDialogTitle>Delete condition?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected condition.
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

export default Conditions;
