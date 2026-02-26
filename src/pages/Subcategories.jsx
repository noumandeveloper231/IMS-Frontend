import React, { useState, useRef } from "react";
import api from "../utils/api";
import { ArrowUpAZ, ArrowDownAZ, Edit, Trash2, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/UI/command";
import { cn } from "@/lib/utils";
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

function ProductCombobox({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  clearable = true,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;
  const displayLabel = selected ? selected.label : placeholder;

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} className={className}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
            "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <div className="flex items-center gap-1">
            {clearable && selected && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e)}
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
                aria-label="Clear"
              >
                ×
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => handleSelect(opt)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const Subcategories = () => {
  const queryClient = useQueryClient();
  const nameInputRef = useRef(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await api.get("/categories/getall");
      return res.data?.categories ?? res.data ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const { data: subcategoriesData, isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const res = await api.get("/subcategories/getall");
      return res.data?.subcategories ?? res.data ?? [];
    },
  });
  const subcategories = subcategoriesData ?? [];

  const categoryOptions = categories.map((c) => ({
    value: c._id,
    label: c.name,
  }));

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/subcategories/create", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory created ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      } else {
        toast.error(data?.message || "Create failed ❌");
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/subcategories/update/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory updated ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      } else {
        toast.error(data?.message || "Update failed ❌");
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/subcategories/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Subcategory deleted ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      } else {
        toast.error(data?.message || "Delete failed ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Delete failed ❌");
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Subcategory name required");
    if (!categoryId) return toast.error("Please select a category");

    const payload = { name: name.trim(), category: categoryId };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
    setName("");
    setCategoryId("");
    setEditingId(null);
  };

  const handleEdit = (sub) => {
    setName(sub.name);
    setCategoryId(sub.category?._id ?? sub.category ?? "");
    setEditingId(sub._id);
    toast.info(`Editing: ${sub.name}`);
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
    setName("");
    setCategoryId("");
    setEditingId(null);
  };

  const filtered = (subcategories || []).filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? (a.name || "").localeCompare(b.name || "")
        : (b.name || "").localeCompare(a.name || "");
    }
    if (sortField === "category") {
      const aCat = a.category?.name || "";
      const bCat = b.category?.name || "";
      return sortOrder === "asc"
        ? aCat.localeCompare(bCat)
        : bCat.localeCompare(aCat);
    }
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const currentItems = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Subcategory" : "Add New Subcategory"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="input-field-subcategory-name">Name</FieldLabel>
            </Field>
            <Input
              id="input-field-subcategory-name"
              type="text"
              ref={nameInputRef}
              placeholder="Subcategory Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Field>
              <FieldLabel>Category</FieldLabel>
            </Field>
            <ProductCombobox
              options={categoryOptions}
              value={categoryId}
              onChange={(opt) => setCategoryId(opt?.value ?? "")}
              placeholder="Select Category"
              clearable
            />

            <div className="flex gap-4 items-center flex-wrap">
              <Button type="submit" variant="default" disabled={loading}>
                {loading
                  ? "Please wait..."
                  : editingId
                    ? "Update Subcategory"
                    : "Add Subcategory"}
              </Button>
              <Button
                type="button"
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
              Subcategories List
            </h2>
            <div className="w-full flex gap-4 items-center">
              <div className="flex-3">
                <Input
                  type="text"
                  placeholder="Search subcategories..."
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

          {subcategoriesLoading ? (
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
                          Subcategory Name
                          {sortField === "name" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center gap-2">
                          Category
                          {sortField === "category" &&
                            (sortOrder === "asc" ? (
                              <ArrowUpAZ className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((sub, i) => (
                      <TableRow key={sub._id} className="hover:bg-gray-50 transition-colors duration-200">
                        <TableCell>
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell className="text-gray-600">
                          {sub.category?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(sub.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex gap-2">
                              <button
                              onClick={() => handleEdit(sub)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-full transition-colors duration-200"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(sub._id)}
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

              {currentItems.length === 0 && (
                <p className="text-gray-500 text-center py-6">
                  No subcategories found
                </p>
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
              <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                selected subcategory.
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
      </div>
    </div>
  );
};

export default Subcategories;
