import React, { useState, useRef, useMemo } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import { MoreVertical } from "lucide-react";

const TEMPLATE_COLUMNS = ["Name", "Company Name", "Email", "Phone", "Address", "City", "Country", "Opening Balance", "Notes", "Status"];

const Vendors = () => {
  const queryClient = useQueryClient();
  const nameInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    openingBalance: 0,
    notes: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors/getall");
      return res.data ?? [];
    },
  });
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/vendors/create", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Vendor added ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorDrawerOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/vendors/update/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Vendor updated ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorDrawerOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/vendors/delete/${id}`);
    },
    onSuccess: () => {
      toast.success("Vendor deleted ✅");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete vendor ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      openingBalance: 0,
      notes: "",
      status: "active",
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.phone?.trim()) {
      toast.error("Name & Phone required!");
      return;
    }
    if (form.email?.trim()) {
      const existing = vendors.find(
        (v) =>
          v.email?.toLowerCase() === form.email.trim().toLowerCase() &&
          v._id !== editingId
      );
      if (existing) {
        toast.error("A vendor with this email already exists.");
        return;
      }
    }
    const payload = {
      ...form,
      openingBalance: Number(form.openingBalance) || 0,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (vendor) => {
    setForm({
      name: vendor.name || "",
      companyName: vendor.companyName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || "",
      openingBalance: vendor.openingBalance ?? 0,
      notes: vendor.notes || "",
      status: vendor.status || "active",
    });
    setEditingId(vendor._id);
    setVendorDrawerOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
    toast.info(`Editing vendor: ${vendor.name}`);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const filteredVendors = vendors.filter((v) =>
    (v.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateImportedRows = (rows) => {
    let valid = 0;
    let errors = 0;
    const validated = rows.map((row) => {
      const nameKey = Object.keys(row).find((k) => normalizeKey(k) === "name") ?? null;
      const phoneKey = Object.keys(row).find((k) => normalizeKey(k) === "phone") ?? null;
      const nameVal = nameKey ? String(row[nameKey] ?? "").trim() : "";
      const phoneVal = phoneKey ? String(row[phoneKey] ?? "").trim() : "";
      const fieldErrors = {};
      if (!nameVal) fieldErrors[nameKey || "Name"] = "Required";
      if (!phoneVal) fieldErrors[phoneKey || "Phone"] = "Required";
      const isError = Object.keys(fieldErrors).length > 0;
      if (isError) errors += 1; else valid += 1;
      return {
        ...row,
        __name: nameVal,
        __phone: phoneVal,
        __errors: fieldErrors,
        __status: isError ? "error" : "valid",
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
      toast.error("Unable to read file ❌");
    }
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }
    setImportLoading(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (const row of validRows) {
        try {
          const payload = {
            name: row.__name ?? row.Name ?? row.name ?? "",
            companyName: row["Company Name"] ?? row.companyName ?? "",
            email: row.Email ?? row.email ?? "",
            phone: row.__phone ?? row.Phone ?? row.phone ?? "",
            address: row.Address ?? row.address ?? "",
            city: row.City ?? row.city ?? "",
            country: row.Country ?? row.country ?? "",
            openingBalance: Number(row["Opening Balance"] ?? row.openingBalance ?? 0) || 0,
            notes: row.Notes ?? row.notes ?? "",
            status: row.Status ?? row.status ?? "active",
          };
          await api.post("/vendors/create", payload);
          successCount++;
        } catch {
          errorCount++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(`Imported ${successCount} vendors, ${errorCount} errors ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0 });
    } catch (err) {
      toast.error("Import failed ❌");
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
    XLSX.writeFile(wb, "vendors-import-template.xlsx");
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredVendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
  };

  const vendorColumns = useMemo(
    () => [
      { id: "index", header: "#", cell: ({ row }) => row.index + 1 },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "companyName",
        header: "Company",
        accessorKey: "companyName",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.companyName || "—"}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.email || "—"}</span>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        accessorKey: "phone",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.phone || "—"}</span>
        ),
      },
      {
        id: "city",
        header: "City",
        accessorKey: "city",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.city || "—"}</span>
        ),
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.country || "—"}</span>
        ),
      },
      {
        id: "openingBalance",
        header: "Balance",
        accessorKey: "openingBalance",
        cell: ({ row }) => (
          <span className="text-sm text-gray-900">{row.original.openingBalance ?? "—"}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.status || "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const v = row.original;
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
                <DropdownMenuItem onClick={() => handleEdit(v)}>
                  Edit vendor
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => confirmDelete(v._id)}
                >
                  Delete vendor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 bg-white rounded-xl shadow-md p-8">
        <div className="">
          <Drawer
            direction="right"
            open={vendorDrawerOpen}
            onOpenChange={setVendorDrawerOpen}
          >
            <div className="flex justify-between items-center">
              <h2 className="flex-4 text-2xl font-semibold text-gray-700">
                Vendors List ({filteredVendors.length})
              </h2>
              <div className="flex gap-4 items-center">
                <Drawer open={importDrawerOpen} onOpenChange={setImportDrawerOpen}>
                  <DrawerTrigger asChild>
                    <Label
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
                    >
                      Import Excel
                    </Label>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[90vh]">
                    <DrawerHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <DrawerTitle>Bulk Vendor Import</DrawerTitle>
                          <DrawerDescription>
                            Upload CSV or Excel file to create multiple vendors.
                          </DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                          <Button variant="outline" size="icon">✕</Button>
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
                          description="Upload bulk vendor file"
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
                                  <TableHead>Phone</TableHead>
                                  {importColumns.filter((c) => c !== "Name" && c !== "Phone").slice(0, 4).map((col) => (
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
                                    <TableCell className="text-xs">{row.__phone ?? row.Phone ?? row.phone ?? "—"}</TableCell>
                                    {importColumns.filter((c) => c !== "Name" && c !== "Phone").slice(0, 4).map((col) => (
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
                <Button
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
                >
                  Export Excel
                </Button>
                <DrawerTrigger asChild>
                  <Button variant="default" onClick={() => { if (!editingId) resetForm(); }}>
                    {editingId ? "Edit Vendor" : "Add New Vendor"}
                  </Button>
                </DrawerTrigger>
              </div>
            </div>
            <DrawerContent className="ml-auto h-full max-w-3xl">
              <DrawerHeader>
                <DrawerTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DrawerTitle>
                <DrawerDescription>
                  {editingId ? "Update the vendor details." : "Fill in the details below to add a new vendor."}
                </DrawerDescription>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-6 pb-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Vendor Name</FieldLabel>
                    <Input
                      ref={nameInputRef}
                      type="text"
                      name="name"
                      placeholder="Vendor Name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Company Name</FieldLabel>
                    <Input
                      type="text"
                      name="companyName"
                      placeholder="Company Name"
                      value={form.companyName}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Phone</FieldLabel>
                    <Input
                      type="text"
                      name="phone"
                      placeholder="Phone"
                      value={form.phone}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel>Address</FieldLabel>
                    <Input
                      type="text"
                      name="address"
                      placeholder="Address"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>City</FieldLabel>
                    <Input
                      type="text"
                      name="city"
                      placeholder="City"
                      value={form.city}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Country</FieldLabel>
                    <Input
                      type="text"
                      name="country"
                      placeholder="Country"
                      value={form.country}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Opening Balance</FieldLabel>
                    <Input
                      type="number"
                      name="openingBalance"
                      placeholder="Opening Balance"
                      value={form.openingBalance}
                      onChange={handleChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <UiSelect
                      value={form.status}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent position="item-aligned">
                        <SelectGroup>
                          <SelectLabel>Status</SelectLabel>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel>Notes</FieldLabel>
                    <Input
                      type="text"
                      name="notes"
                      placeholder="Notes"
                      value={form.notes}
                      onChange={handleChange}
                    />
                  </Field>
                  <div className="flex gap-4 mt-4 md:col-span-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Please wait..." : editingId ? "Update Vendor" : "Add Vendor"}
                    </Button>
                    <Button type="button" variant="danger" onClick={resetForm} className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md">
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
                <Input type="text" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
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
          {vendorsLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={vendorColumns} data={filteredVendors} pageSize={itemsPerPage} />
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This vendor will be deleted permanently. This action cannot be undone.
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

export default Vendors;
