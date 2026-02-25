import React, { useState, useRef } from "react";
import api from "../utils/api";
import { Edit, Trash2, User, Phone, Mail, DollarSign, Shield, Calendar } from "lucide-react";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
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

const Employees = () => {
  const queryClient = useQueryClient();
  const nameInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "salesman",
    salary: 0,
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return Array.isArray(res.data) ? res.data : res.data?.employees ?? [];
    },
  });
  const employees = employeesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post("/employees", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee created successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Something went wrong ❌"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/employees/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee updated successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Something went wrong ❌"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/employees/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Employee has been deleted successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Failed to delete employee ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "salary" ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Employee name is required ❌");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    setFormData({
      name: "",
      phone: "",
      email: "",
      role: "salesman",
      salary: 0,
      status: "active",
    });
    setEditingId(null);
  };

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name,
      phone: employee.phone || "",
      email: employee.email || "",
      role: employee.role,
      salary: employee.salary || 0,
      status: employee.status,
    });
    setEditingId(employee._id);
    toast.info(`Editing employee: ${employee.name}`);
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

  const handleClear = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      role: "salesman",
      salary: 0,
      status: "active",
    });
    setEditingId(null);
  };

  const filteredEmployees = (employees || []).filter(
    (emp) =>
      (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone || "").includes(searchTerm) ||
      (emp.role || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "");
    }
    if (sortField === "salary") {
      return sortOrder === "asc"
        ? (a.salary ?? 0) - (b.salary ?? 0)
        : (b.salary ?? 0) - (a.salary ?? 0);
    }
    if (sortField === "joinedAt") {
      return sortOrder === "asc"
        ? new Date(a.joinedAt) - new Date(b.joinedAt)
        : new Date(b.joinedAt) - new Date(a.joinedAt);
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentEmployees = sortedEmployees.slice(indexOfFirst, indexOfLast);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExport = () => {
    const exportData = filteredEmployees.map((emp) => ({
      Name: emp.name,
      Phone: emp.phone || "",
      Email: emp.email || "",
      Role: emp.role,
      Salary: emp.salary,
      Status: emp.status,
      "Joined Date": new Date(emp.joinedAt).toLocaleDateString(),
      "Created At": new Date(emp.createdAt).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees.xlsx");
    toast.success("Employees exported to Excel ✅");
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
        let successCount = 0;
        let errorCount = 0;
        for (const item of jsonData) {
          try {
            if (item.Name) {
              await api.post("/employees", {
                name: item.Name,
                phone: item.Phone || "",
                email: item.Email || "",
                role: item.Role || "salesman",
                salary: Number(item.Salary) || 0,
                status: item.Status || "active",
              });
              successCount++;
            }
          } catch {
            errorCount++;
          }
        }
        toast.success(`Import complete! ${successCount} employees imported, ${errorCount} errors ✅`);
        queryClient.invalidateQueries({ queryKey: ["employees"] });
      } catch {
        toast.error("Import failed ❌");
      }
    };
    reader.readAsBinaryString(file);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "manager": return "bg-purple-100 text-purple-800";
      case "cashier": return "bg-blue-100 text-blue-800";
      case "salesman": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status) =>
    status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Employee" : "Add New Employee"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Field><FieldLabel><User className="inline w-4 h-4 mr-1" /> Employee Name *</FieldLabel></Field>
                <Input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  placeholder="Enter employee name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Field><FieldLabel><Phone className="inline w-4 h-4 mr-1" /> Phone</FieldLabel></Field>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Field><FieldLabel><Mail className="inline w-4 h-4 mr-1" /> Email</FieldLabel></Field>
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Field><FieldLabel><Shield className="inline w-4 h-4 mr-1" /> Role</FieldLabel></Field>
                <Select value={formData.role} onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Role</SelectLabel>
                      <SelectItem value="salesman">Salesman</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Field><FieldLabel><DollarSign className="inline w-4 h-4 mr-1" /> Salary</FieldLabel></Field>
                <Input
                  type="number"
                  name="salary"
                  min="0"
                  placeholder="Enter salary"
                  value={formData.salary || ""}
                  onChange={handleInputChange}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <Field><FieldLabel>Status</FieldLabel></Field>
                <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status</SelectLabel>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <Button type="submit" variant="default" disabled={loading}>
                {loading ? "Please wait..." : editingId ? "Update Employee" : "Add Employee"}
              </Button>
              <Label
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 cursor-pointer"
                onClick={() => document.getElementById("employees-import-input")?.click()}
              >
                <Input
                  id="employees-import-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                  className="hidden"
                />
                Import Excel
              </Label>
              <Button
                variant="success"
                onClick={handleExport}
                className="bg-green-600 text-white shadow hover:bg-green-600/90 px-4 py-3 rounded-md"
              >
                Export Excel
              </Button>
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
            <h2 className="w-full text-2xl font-semibold text-gray-700">
              Employees List ({filteredEmployees.length})
            </h2>
            <div className="w-full flex gap-4 items-center">
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search employees..."
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
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {employeesLoading ? (
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
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Name
                          {sortField === "name" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead><Phone className="inline w-4 h-4 mr-1" /> Phone</TableHead>
                      <TableHead><Mail className="inline w-4 h-4 mr-1" /> Email</TableHead>
                      <TableHead><Shield className="inline w-4 h-4 mr-1" /> Role</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("salary")}
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Salary
                          {sortField === "salary" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp01 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDown01 className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("joinedAt")}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Joined Date
                          {sortField === "joinedAt" &&
                            (sortOrder === "asc" ? (
                              <ArrowUp01 className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDown01 className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEmployees.map((emp, index) => (
                      <TableRow key={emp._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell className="text-sm text-gray-900">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-sm text-gray-500">{emp.phone || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">{emp.email || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(emp.role)}`}>
                            {(emp.role || "").charAt(0).toUpperCase() + (emp.role || "").slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {emp.salary != null ? `$${Number(emp.salary).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(emp.status)}`}>
                            {(emp.status || "").charAt(0).toUpperCase() + (emp.status || "").slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(emp)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(emp._id)}
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
              {currentEmployees.length === 0 && (
                <p className="text-gray-500 text-center py-6">No employees found</p>
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
              <AlertDialogTitle>Delete employee?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected employee.
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

export default Employees;
