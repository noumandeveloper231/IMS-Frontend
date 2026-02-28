import React, { useState, useRef, useMemo } from "react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/UI/drawer";
import {
  Select as UiSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import { DataTable } from "@/components/UI/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
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
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { useImageModal } from "@/context/ImageModalContext";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

const TEMPLATE_COLUMNS = ["Name"];

const normalizeBrandName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const Brands = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const navigate = useNavigate();
  const { openImageModal } = useImageModal();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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
        setBrandDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Failed to create ❌");
      }
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        const trimmedName = name.trim();
        toast.error(
          trimmedName
            ? `Brand "${trimmedName}" already exists ❌`
            : "Brand already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create brand. Please try again ❌");
      }
    },
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
        setBrandDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Failed to update ❌");
      }
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        const trimmedName = name.trim();
        toast.error(
          trimmedName
            ? `Brand "${trimmedName}" already exists ❌`
            : "Brand already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update brand. Please try again ❌");
      }
    },
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
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (error?.response?.status === 409) {
        toast.error(
          messageFromServer ||
            "Cannot delete brand because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to delete brand. Please try again ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleClick = (id) => {
    navigate(`/products/filter/brand/${id}`);
  };

  const handleClearForm = () => {
    setName("");
    setImage(null);
    setPreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Brand name is required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Brand name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Brand name must be at most 50 characters ❌");
      return;
    }

    const normalizedNewName = normalizeBrandName(trimmedName);

    const hasDuplicateOnCreate =
      !editingId &&
      brands.some(
        (b) => normalizeBrandName(b.name) === normalizedNewName,
      );

    if (hasDuplicateOnCreate) {
      toast.error(`Brand "${trimmedName}" already exists ❌`);
      return;
    }

    if (editingId) {
      const hasDuplicateOnUpdate = brands.some(
        (b) =>
          b._id !== editingId &&
          normalizeBrandName(b.name) === normalizedNewName,
      );

      if (hasDuplicateOnUpdate) {
        toast.error(
          `Another brand with name "${trimmedName}" already exists ❌`,
        );
        return;
      }
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    if (image) formData.append("image", image);
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (brand) => {
    setName(brand.name);
    setEditingId(brand._id);
    setPreview(brand.image ? resolveImageUrl(brand.image) : null);
    setImage(null);
    setBrandDrawerOpen(true);
    toast.info(`Editing brand: ${brand.name}`);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleDropFile = (file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file ❌");
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeInMB} MB ❌`);
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file ❌");
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxSizeInMB} MB ❌`);
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const filteredBrands = (brands || []).filter((b) =>
    (b.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    let valid = 0;
    let errors = 0;
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => ["name"].includes(normalizeKey(k))) ?? null;
      const name = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const fieldErrors = {};
      if (!name) {
        fieldErrors[nameKey || "Name"] = "Required";
        errors += 1;
      } else {
        valid += 1;
      }
      return {
        ...row,
        __name: name,
        __errors: fieldErrors,
        __status: Object.keys(fieldErrors).length > 0 ? "error" : "valid",
      };
    });
    setImportStats({ total: rows.length, valid, errors });
    return validated;
  };

  const handleImportFileSelected = async (fileOrFiles) => {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" });
      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0 });
        return;
      }
      const validatedRows = validateImportedRows(rows);
      setImportRows(validatedRows);
      setImportColumns(Object.keys(rows[0] || {}));
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
      console.error("Import parse error:", err);
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Unable to read file: ${messageFromServer} ❌`
          : "Unable to read file ❌",
      );
    }
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }
    setImportLoading(true);
    try {
      const payload = validRows.map(({ __errors, __status, __name, ...rest }) => ({
        ...rest,
        name: __name,
      }));
      await api.post("/brands/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(`Imported ${payload.length} brands ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0 });
    } catch (err) {
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Bulk import failed: ${messageFromServer} ❌`
          : "Bulk import failed ❌",
      );
      console.error("Bulk import error:", err?.response?.data || err?.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    setImportRows([Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]))]);
    setImportStats({ total: 1, valid: 0, errors: 0 });
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "brands-import-template.xlsx");
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredBrands.map((b) => ({
        "Name": b.name,
        "Product Count": b.productCount ?? 0,
        "Created At": b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "",
        "Updated At": b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Brands");
    XLSX.writeFile(workbook, "brands.xlsx");
  };

  const brandColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "image",
        header: "Image",
        accessorKey: "image",
        cell: ({ row }) => {
          const brand = row.original;
          if (!brand.image) {
            return <span className="text-gray-400 italic">No Image</span>;
          }
          return (
            <img
              src={resolveImageUrl(brand.image)}
              alt={brand.name}
              onClick={() => openImageModal(resolveImageUrl(brand.image))}
              className="w-24 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
            />
          );
        },
      },
      {
        id: "name",
        header: "Brand Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "productCount",
        header: "Product Count",
        accessorKey: "productCount",
        cell: ({ row }) => {
          const brand = row.original;
          return (
            <button
              type="button"
              onClick={() => handleClick(brand._id)}
              className="text-center font-medium text-blue-600 hover:underline"
            >
              {brand.productCount ?? 0}
            </button>
          );
        },
      },
      {
        id: "createdAt",
        header: "Created At",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: "Updated At",
        accessorKey: "updatedAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const brand = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEdit(brand)}>
                  Edit brand
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => confirmDelete(brand._id)}
                >
                  Delete brand
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [openImageModal],
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        <div className="">
          <Drawer
            direction="right"
            open={brandDrawerOpen}
            onOpenChange={setBrandDrawerOpen}
          >
            <div className="flex justify-between items-center">
              <h2 className="flex-4 text-2xl font-semibold text-gray-700">
                Brands List ({filteredBrands.length})
              </h2>
              <div className="flex gap-4 items-center">
                <Drawer
                  open={importDrawerOpen}
                  onOpenChange={setImportDrawerOpen}
                >
                  <DrawerTrigger asChild>
                    <Label
                      variant="light"
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer"
                    >
                      Import Excel
                    </Label>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <DrawerTitle>Bulk Brand Import</DrawerTitle>
                          <DrawerDescription>
                            Upload CSV or Excel file to create multiple brands.
                          </DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                          <Button variant="outline" size="icon">
                            ✕
                          </Button>
                        </DrawerClose>
                      </div>
                    </DrawerHeader>
                    <div className="no-scrollbar overflow-y-auto px-6 py-4 space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="button" variant="outline" onClick={handleViewTemplate}>
                          View Template
                        </Button>
                        <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
                          Download Template
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: <span className="font-medium">.csv, .xlsx</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload file</p>
                        <ImageUploadDropzone
                          accept=".csv,.xlsx"
                          type="excel"
                          label="Drag & Drop Excel or CSV File"
                          description="Upload bulk brand file"
                          maxSize={10 * 1024 * 1024}
                          onFileSelect={handleImportFileSelected}
                        />
                      </div>
                      {importRows.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Preview ({importStats.total} rows)</p>
                            <p className="text-xs text-muted-foreground">
                              Valid: {importStats.valid} | Errors: {importStats.errors}
                            </p>
                          </div>
                          <div className="border w-full rounded-md max-h-80 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>Name</TableHead>
                                  {importColumns.map((col) => (
                                    <TableHead className="whitespace-nowrap w-auto" key={col}>{col}</TableHead>
                                  ))}
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importRows.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    <TableCell className="text-xs text-muted-foreground">{rowIndex + 1}</TableCell>
                                    <TableCell className="text-xs">{row.__name ?? row.Name ?? row.name ?? "—"}</TableCell>
                                    {importColumns.map((col) => (
                                      <TableCell key={col} className="text-xs">{String(row[col] ?? "")}</TableCell>
                                    ))}
                                    <TableCell>
                                      <span
                                        className={
                                          row.__status === "valid"
                                            ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                                            : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                                        }
                                      >
                                        {row.__status === "valid" ? "Valid" : "Error"}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                    <DrawerFooter className="border-t">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-muted-foreground">✔ Valid: <span className="font-semibold text-emerald-700">{importStats.valid}</span></span>
                          <span className="text-muted-foreground">⚠ Errors: <span className="font-semibold text-red-700">{importStats.errors}</span></span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Button type="button" variant="default" onClick={handleImportValidSubmit} disabled={!importStats.valid || importLoading}>
                            {importLoading ? "Importing..." : "Import Valid Only"}
                          </Button>
                          <DrawerClose asChild>
                            <Button type="button" variant="ghost">Cancel</Button>
                          </DrawerClose>
                        </div>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <Label variant="success" onClick={handleExport} className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md cursor-pointer">
                  Export Excel
                </Label>
                <DrawerTrigger asChild>
                  <Button variant="default" onClick={() => { if (!editingId) handleClearForm(); }}>
                    {editingId ? "Edit Brand" : "Add New Brand"}
                  </Button>
                </DrawerTrigger>
              </div>
            </div>
            <DrawerContent className="ml-auto h-full max-w-3xl">
              <DrawerHeader>
                <DrawerTitle>{editingId ? "Edit Brand" : "Add New Brand"}</DrawerTitle>
                <DrawerDescription>
                  {editingId ? "Update the brand details." : "Fill in the details below to add a new brand."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <Field>
                    <FieldLabel htmlFor="brand-name">Name</FieldLabel>
                    <Input id="brand-name" type="text" placeholder="Brand Name" ref={nameInputRef} value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
                  </Field>
                  <Field>
                    <FieldLabel>Image</FieldLabel>
                    <ImageUploadDropzone onFileSelect={handleDropFile} previewUrl={preview} className="mt-1" accept="image/*" />
                    {preview && (
                      <div className="mt-2">
                        <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border" />
                      </div>
                    )}
                  </Field>
                  <div className="flex gap-4 items-center flex-wrap">
                    <Button type="submit" variant="default" disabled={loading}>
                      {loading ? "Please wait..." : editingId ? "Update Brand" : "Add Brand"}
                    </Button>
                    <Button type="button" variant="danger" onClick={handleClearForm} className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md">
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="ml-auto">Cancel</Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        <div className="">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="w-full flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-3 w-full">
                <Input type="text" placeholder="Search brands..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <UiSelect value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>
          {brandsLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={brandColumns} data={filteredBrands} pageSize={itemsPerPage} />
            </div>
          )}
        </div>
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
  );
};

export default Brands;
