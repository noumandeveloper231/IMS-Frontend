import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import api from "../utils/api";
import { API_BASE_URL } from "../config/api";
import axios from "axios";
import { ChevronDown, Check, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { DeleteModel } from "@/components/DeleteModel";
import { Combobox } from "@/components/UI/combobox";
import { BulkDependencyManagerModal } from "@/components/BulkDependencyManagerModal";
import { useSubcategoryBulkDependencyManager } from "@/hooks/useSubcategoryBulkDependencyManager";
import {
  ResolveDependenciesDialog,
  TransferDependenciesDialog,
} from "@/components/ResolveDependenciesDialog";
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
  SelectSeparator,
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
import { DataTable } from "@/components/UI/data-table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { cn } from "@/lib/utils";
import Loader from "@/components/Loader";

const TEMPLATE_COLUMNS = ["Name", "Category"];
const REQUIRED_FILE_COLUMNS = ["Name", "Category"];

/** Stable empty array so categories/subcategories don't get new ref when data is undefined (avoids column remount). */
const EMPTY_ARRAY = [];

const normalizeSubcategoryName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const Subcategories = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { page: pageParam } = useParams();
  const nameInputRef = useRef(null);
  /** Refs to keep import callbacks stable so columns useMemo does not change every render (prevents input focus loss). */
  const categoriesRef = useRef(EMPTY_ARRAY);
  const subcategoriesRef = useRef(EMPTY_ARRAY);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subcategoryDrawerOpen, setSubcategoryDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0, duplicates: 0 });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState([]);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkManagerOpen, setBulkManagerOpen] = useState(false);
  const [deleteWithDepsOpen, setDeleteWithDepsOpen] = useState(false);
  const [deleteWithDepsData, setDeleteWithDepsData] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [cascadeConfirmOpen, setCascadeConfirmOpen] = useState(false);
  const [cascadeDeleteLoading, setCascadeDeleteLoading] = useState(false);

  const subcategoryDrawerOpenRef = useRef(subcategoryDrawerOpen);
  useEffect(() => {
    subcategoryDrawerOpenRef.current = subcategoryDrawerOpen;
  }, [subcategoryDrawerOpen]);

  const initialPageIndex = useMemo(() => {
    const pageNumber = parseInt(pageParam || "1", 10);
    if (Number.isNaN(pageNumber) || pageNumber < 1) return 0;
    return pageNumber - 1;
  }, [pageParam]);

  const handlePageChange = useCallback(
    (pageIndex) => {
      const pageNumber = pageIndex + 1;
      if (pageNumber <= 1) {
        navigate("/subcategories", { replace: true });
      } else {
        navigate(`/subcategories/page/${pageNumber}`, { replace: true });
      }
    },
    [navigate],
  );

  // Open Import Excel drawer when a file is dragged over the page (not when Add/Edit Subcategory drawer is open); close when drag leaves
  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      if (subcategoryDrawerOpenRef.current) return;
      e.preventDefault();
      setImportDrawerOpen(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      if (subcategoryDrawerOpenRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (subcategoryDrawerOpenRef.current) return;
      if (e.relatedTarget != null && document.body.contains(e.relatedTarget)) return;
      setImportDrawerOpen(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      if (subcategoryDrawerOpenRef.current) return;
      e.preventDefault();
    };
    document.addEventListener("dragenter", onDragEnter, false);
    document.addEventListener("dragover", onDragOver, false);
    document.addEventListener("dragleave", onDragLeave, false);
    document.addEventListener("drop", onDrop, false);
    return () => {
      document.removeEventListener("dragenter", onDragEnter, false);
      document.removeEventListener("dragover", onDragOver, false);
      document.removeEventListener("dragleave", onDragLeave, false);
      document.removeEventListener("drop", onDrop, false);
    };
  }, []);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories/getallcount");
      const raw = res.data?.categories ?? res.data?.data ?? res.data;
      return Array.isArray(raw) ? raw : [];
    },
  });
  const categories = categoriesData ?? EMPTY_ARRAY;

  const { data: subcategoriesData, isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const res = await api.get("/subcategories/getall");
      return res.data?.subcategories ?? res.data ?? [];
    },
  });
  const subcategories = subcategoriesData ?? EMPTY_ARRAY;
  categoriesRef.current = categories;
  subcategoriesRef.current = subcategories;

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? [];

  const bulkManager = useSubcategoryBulkDependencyManager({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setSelectedSubcategoryIds([]);
      setTableRowSelection({});
      const count = data?.deleted?.length ?? 0;
      toast.success(`Deleted ${count} subcategories successfully`);
    },
    onError: (message) => {
      toast.error(message || "Bulk delete failed");
    },
  });

  useEffect(() => {
    if (
      bulkManagerOpen &&
      selectedSubcategoryIds.length > 0 &&
      bulkManager.status === "idle"
    ) {
      bulkManager.startAnalysis(selectedSubcategoryIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkManagerOpen]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c._id ?? c.id, label: c.name ?? "" })),
    [categories]
  );

  const productCountBySubcategoryId = useMemo(() => {
    const counts = {};
    (products || []).forEach((p) => {
      const subId = p.subcategory?._id ?? p.subcategory;
      if (subId) counts[subId] = (counts[subId] || 0) + 1;
    });
    return counts;
  }, [products]);

  const subcategoriesWithCounts = (subcategories || []).map((s) => ({
    ...s,
    productCount: productCountBySubcategoryId[s._id] ?? 0,
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
        setSubcategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Create failed ❌");
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
        const categoryName =
          categories.find((c) => c._id === categoryId)?.name || "";
        const label = categoryName
          ? `"${trimmedName}" in category "${categoryName}"`
          : `"${trimmedName}"`;
        toast.error(
          trimmedName
            ? `Subcategory ${label} already exists ❌`
            : "Subcategory already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create subcategory. Please try again ❌");
      }
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
        setSubcategoryDrawerOpen(false);
        handleClearForm();
      } else {
        toast.error(data?.message || "Update failed ❌");
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
        const categoryName =
          categories.find((c) => c._id === categoryId)?.name || "";
        const label = categoryName
          ? `"${trimmedName}" in category "${categoryName}"`
          : `"${trimmedName}"`;
        toast.error(
          trimmedName
            ? `Subcategory ${label} already exists ❌`
            : "Subcategory already exists ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update subcategory. Please try again ❌");
      }
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
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (error?.response?.status === 409) {
        toast.error(
          messageFromServer ||
          "Cannot delete subcategory because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Delete failed ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleClearForm = () => {
    setName("");
    setCategoryId("");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Subcategory name is required ❌");
      return;
    }

    if (trimmedName.length < 2) {
      toast.error("Subcategory name must be at least 2 characters long ❌");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Subcategory name must be at most 50 characters ❌");
      return;
    }

    if (!categoryId) {
      toast.error("Please select a category ❌");
      return;
    }

    const normalizedNewName = normalizeSubcategoryName(trimmedName);

    const hasDuplicate = (subcategories || []).some(
      (s) =>
        (!editingId || s._id !== editingId) &&
        normalizeSubcategoryName(s.name) === normalizedNewName &&
        (s.category?._id ?? s.category) === categoryId,
    );

    if (hasDuplicate) {
      const categoryName =
        categories.find((c) => c._id === categoryId)?.name || "";
      toast.error(
        categoryName
          ? `Subcategory "${trimmedName}" already exists in category "${categoryName}" ❌`
          : `Subcategory "${trimmedName}" already exists ❌`,
      );
      return;
    }

    const payload = { name: trimmedName, category: categoryId };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (sub) => {
    setName(sub.name);
    setCategoryId(sub.category?._id ?? sub.category ?? "");
    setEditingId(sub._id);
    setSubcategoryDrawerOpen(true);
    toast.info(`Editing: ${sub.name}`);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const confirmDelete = async (id) => {
    try {
      const res = await api.get(`/subcategories/dependencies/${id}`);
      const data = res.data;
      const hasDependencies = data?.hasDependencies === true;
      const name = (subcategories || []).find((s) => s._id === id)?.name ?? "Subcategory";
      if (hasDependencies) {
        setDeleteWithDepsData({
          id,
          name,
          subcategoriesCount: 0,
          productsCount: data.productsCount ?? 0,
        });
        setDeleteWithDepsOpen(true);
        setTransferTargetId("");
      } else {
        setDeleteId(id);
        setDeleteOpen(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error("Subcategory not found");
        return;
      }
      toast.error(err?.response?.data?.message || "Could not check subcategory dependencies");
    }
  };

  const handleCascadeDeleteConfirmed = async () => {
    if (!deleteId) return;
    setCascadeDeleteLoading(true);
    try {
      const res = await api.delete(`/subcategories/delete/${deleteId}?cascade=true`);
      if (res.data?.success) {
        toast.success("Subcategory and its product links have been updated successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      } else {
        toast.error("Failed to delete subcategory ❌");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete subcategory ❌");
    } finally {
      setCascadeDeleteLoading(false);
      setCascadeConfirmOpen(false);
      setDeleteId(null);
      setDeleteWithDepsOpen(false);
      setDeleteWithDepsData(null);
    }
  };

  const handleTransferProceed = async () => {
    if (!deleteWithDepsData?.id || !transferTargetId) {
      toast.error("Please select a subcategory to transfer to");
      return;
    }
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/subcategories/transfer/${deleteWithDepsData.id}`,
        { transferToSubcategoryId: transferTargetId },
        { headers: { "Content-Type": "application/json" } }
      );
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ["subcategories"] });
        toast.success("Dependencies transferred and subcategory deleted successfully");
        setDeleteWithDepsOpen(false);
        setTransferDialogOpen(false);
        setDeleteWithDepsData(null);
        setTransferTargetId("");
      } else {
        toast.error(data?.message || "Transfer failed");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        "Transfer failed";
      toast.error(msg);
    }
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const handleBulkDeleteConfirmed = async () => {
    if (!selectedSubcategoryIds.length) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkDeleteOpen(false);
    for (const id of selectedSubcategoryIds) {
      try {
        await api.delete(`/subcategories/delete/${id}`);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message;
        toast.error(`Failed to delete one subcategory: ${msg}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    const count = selectedSubcategoryIds.length;
    setSelectedSubcategoryIds([]);
    setTableRowSelection({});
    toast.success(`Deleted ${count} subcategories`);
  };

  const handleProductsClick = (id) => {
    navigate(`/products/list?filterType=subcategory&filter=${id}`);
  };

  const filtered = (subcategoriesWithCounts || []).filter(
    (s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateFileColumns = (rows) => {
    if (!rows.length) return { ok: false, message: "File is empty." };
    const first = rows[0];
    const keys = Object.keys(first || {});
    const normalized = keys.map((k) => normalizeKey(k));
    const hasName = normalized.includes("name");
    const hasCategory = normalized.includes("category");
    if (!hasName) {
      return { ok: false, message: "File does not contain the required column 'Name'. Please use the template." };
    }
    if (!hasCategory) {
      return { ok: false, message: "File does not contain the required column 'Category'. Please use the template." };
    }
    return { ok: true };
  };

  const normalizeRowToTemplate = (row) => {
    const nameKey = Object.keys(row || {}).find((k) => normalizeKey(k) === "name");
    const catKey = Object.keys(row || {}).find((k) => normalizeKey(k) === "category");
    return {
      Name: nameKey ? String(row[nameKey] ?? "").trim() : "",
      Category: catKey ? String(row[catKey] ?? "").trim() : "",
    };
  };

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }
    const nameKeyRef = Object.keys(rows[0] || {}).find((k) => normalizeKey(k) === "name");
    const catKeyRef = Object.keys(rows[0] || {}).find((k) => normalizeKey(k) === "category");
    const seenInFile = new Set();
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => normalizeKey(k) === "name") ?? nameKeyRef ?? null;
      const catKey =
        Object.keys(row).find((k) => normalizeKey(k) === "category") ?? catKeyRef ?? null;
      const rawName = nameKey ? String(row[nameKey] ?? "") : "";
      const name = rawName.trim();
      const categoryName = catKey ? String(row[catKey] ?? "").trim() : "";
      let category = categoriesRef.current.find(
        (c) => (c.name || "").toLowerCase() === categoryName.toLowerCase()
      );
      if (!category && row.__categoryId) {
        category = categoriesRef.current.find((c) => c._id === row.__categoryId) ?? null;
      }
      const fieldErrors = {};
      let statusMessage = "";
      if (!name) {
        fieldErrors[nameKey || "Name"] = "Required";
        statusMessage = "Name required";
      }
      if (!categoryName || !category?._id) {
        fieldErrors[catKey || "Category"] = "Required / must match";
        statusMessage = statusMessage || "Category required or must match";
      }
      if (name && category?._id && !fieldErrors[nameKey || "Name"]) {
        const key = `${normalizeSubcategoryName(name)}::${category._id}`;
        if (seenInFile.has(key)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = "Duplicate in file";
        } else {
          seenInFile.add(key);
        }
        const existsInDb = (subcategoriesRef.current || []).some(
          (s) =>
            normalizeSubcategoryName(s.name) === normalizeSubcategoryName(name) &&
            (s.category?._id ?? s.category) === category._id
        );
        if (existsInDb && !fieldErrors[nameKey || "Name"]) {
          fieldErrors[nameKey || "Name"] = "Already exists in DB";
          statusMessage = "Already in database";
        }
      }
      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
      return {
        ...row,
        Name: rawName,
        Category: categoryName,
        __name: name,
        __categoryId: category?._id ?? "",
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
      };
    });
    const valid = validated.filter((r) => r.__status === "valid").length;
    const errors = validated.filter((r) => r.__status === "error").length;
    const duplicates = validated.filter(
      (r) =>
        r.__status === "error" &&
        (r.__statusMessage === "Duplicate in file" || r.__statusMessage === "Already in database")
    ).length;
    setImportStats({ total: rows.length, valid, errors, duplicates });
    return validated;
  };

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) => {
        if (i !== rowIndex) return r;
        if (columnKey === "Name") return { ...r, Name: value, [columnKey]: value, __name: value.trim() };
        if (columnKey === "Category") {
          const category = categoriesRef.current.find((c) => c._id === value);
          return {
            ...r,
            Category: category?.name ?? value,
            [columnKey]: category?.name ?? value,
            __categoryId: value ?? "",
          };
        }
        return { ...r, [columnKey]: value };
      });
      return validateImportedRows(next);
    });
  }, []);

  const handleRemoveImportRow = useCallback((rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  }, []);

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
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return;
      }
      const colCheck = validateFileColumns(rows);
      if (!colCheck.ok) {
        toast.error(colCheck.message + " ❌");
        return;
      }
      const normalizedRows = rows.map((r) => normalizeRowToTemplate(r));
      setImportColumns(TEMPLATE_COLUMNS);
      const validatedRows = validateImportedRows(normalizedRows);
      setImportRows(validatedRows);
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
      const payload = validRows.map((row) => ({
        name: row.__name,
        category: row.__categoryId,
      }));
      await api.post("/subcategories/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success(`Imported ${payload.length} subcategories ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
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
    const templateRow = [Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]))];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleAddImportRow = () => {
    const newRow = Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    toast.info("Import data cleared");
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "subcategories-import-template.xlsx");
  };

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{Number(row.id) + 1}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    };
    const dynamicCols = (importColumns || []).map((col) => {
      const isNameCol = normalizeKey(col) === "name";
      const isCategoryCol = normalizeKey(col) === "category";
      return {
        id: col,
        header: col,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rowIndex = Number(row.id);
          const rowData = row.original;
          if (isNameCol) {
            const nameVal = (rowData[col] ?? "").toString().trim();
            const nameErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "name");
            const nameError = Boolean(nameErrorKey);
            const nameFulfilled = nameVal.length > 0 && !nameError;
            const nameErrorMsg = nameErrorKey
              ? (rowData.__errors[nameErrorKey] === "Already exists in DB"
                ? "Name already exists"
                : rowData.__errors[nameErrorKey] === "Duplicate in file"
                  ? "Duplicate in file"
                  : rowData.__errors[nameErrorKey] === "Required"
                    ? "Field is required"
                    : rowData.__errors[nameErrorKey])
              : "Field is required";
            return (
              <div
                className="flex items-center gap-2 min-w-0"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <Input
                  value={rowData[col] ?? ""}
                  onChange={(e) =>
                    handleImportCellChange(rowIndex, col, e.target.value)
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Tab") {
                      e.preventDefault();
                      const input = e.target;
                      const start = input.selectionStart ?? input.value.length;
                      const end = input.selectionEnd ?? input.value.length;
                      const v = (rowData[col] ?? "").toString();
                      const insert = e.key === "Tab" ? "\t" : " ";
                      const newValue = v.slice(0, start) + insert + v.slice(end);
                      handleImportCellChange(rowIndex, col, newValue);
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          const pos = start + insert.length;
                          input.selectionStart = pos;
                          input.selectionEnd = pos;
                        });
                      });
                    }
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder="Subcategory name"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${nameFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        aria-hidden
                      >
                        {nameFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {nameFulfilled ? "Field fulfilled" : nameErrorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          }
          if (isCategoryCol) {
            const catErrorKey = rowData.__errors && Object.keys(rowData.__errors).find((k) => normalizeKey(k) === "category");
            const catError = Boolean(catErrorKey);
            const catFulfilled = Boolean(rowData.__categoryId);
            const showFulfilled = catFulfilled && !catError;
            const catErrorMsg = catErrorKey
              ? (rowData.__errors[catErrorKey] === "Required / must match"
                ? "Category required or must match"
                : rowData.__errors[catErrorKey])
              : "Field is required";
            return (
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0 max-w-full">
                  <Combobox
                    options={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
                    value={rowData.__categoryId || ""}
                    onChange={(val) => handleImportCellChange(rowIndex, col, val ?? "")}
                    placeholder="Select Category"
                    className="max-w-full"
                  />
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${showFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        aria-hidden
                      >
                        {showFulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {showFulfilled ? "Field fulfilled" : catErrorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          }
        },
      };
    });
    const statusCol = {
      id: "__status",
      header: "Status",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={
                    r.__status === "valid"
                      ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                      : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                  }
                >
                  {r.__status === "valid" ? "Valid" : "Error"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                {r.__status === "valid"
                  ? "Ready to import"
                  : (r.__statusMessage || "Validation error")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    };
    const actionsCol = {
      id: "__actions",
      header: "Actions",
      className: "w-[80px]",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleRemoveImportRow(Number(row.id))}
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    };
    return [indexCol, ...dynamicCols, statusCol, actionsCol];
  }, [importColumns, categoryOptions, handleImportCellChange, handleRemoveImportRow]);

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filtered.map((s) => ({
        "Name": s.name,
        "Category": s.category?.name ?? "",
        "Product Count": s.productCount ?? 0,
        "Created At": s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
        "Updated At": s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subcategories");
    XLSX.writeFile(workbook, "Subcategories.xlsx");
  };

  const subcategoryColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        className: "text-center",
      },
      {
        id: "name",
        header: "Subcategory Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        cell: ({ row }) => (
          <span className="text-gray-600">
            {row.original.category?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "productCount",
        header: "Product Count",
        accessorKey: "productCount",
        cell: ({ row }) => {
          const sub = row.original;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleProductsClick(sub._id)}
                    onKeyDown={(e) => e.key === "Enter" && handleProductsClick(sub._id)}
                    className="w-full h-full min-h-[40px] flex items-center justify-center font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    {sub.productCount ?? 0}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  View products in this subcategory
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          const sub = row.original;
          return (
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(sub)}
                      aria-label="Edit subcategory"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit subcategory</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(sub._id)}
                      aria-label="Delete subcategory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete subcategory</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [handleEdit, confirmDelete, handleProductsClick]
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        {/* Header + Actions */}
        <div className="min-w-0">
          <Drawer
            direction="right"
            open={subcategoryDrawerOpen}
            onOpenChange={setSubcategoryDrawerOpen}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0">
                Subcategories List ({filtered.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                {selectedSubcategoryIds.length > 0 && (
                  <div className="w-full sm:w-auto min-w-0">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") {
                          if (selectedSubcategoryIds.length === 1) {
                            confirmDelete(selectedSubcategoryIds[0]);
                          } else {
                            setBulkManagerOpen(true);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[170px] whitespace-nowrap">
                        <SelectValue placeholder="Bulk actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Select action</SelectLabel>
                          <SelectItem value="bulk-delete">Bulk delete</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center shrink-0">
                  <Drawer
                    open={importDrawerOpen}
                    onOpenChange={setImportDrawerOpen}
                  >
                    <DrawerTrigger asChild>
                      <Label
                        variant="light"
                        className="px-3 sm:px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer whitespace-nowrap text-sm sm:text-base"
                      >
                        Import Excel
                      </Label>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh] w-full max-w-[100vw]">
                      <DrawerHeader className="border-b px-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <DrawerTitle>Bulk Subcategory Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple subcategories. Include Name and Category columns.
                            </DrawerDescription>
                          </div>
                          <DrawerClose asChild>
                            <Button variant="outline" size="icon">
                              ✕
                            </Button>
                          </DrawerClose>
                        </div>
                      </DrawerHeader>
                      <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleViewTemplate}
                            >
                              View Template
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleDownloadTemplate}
                            >
                              Download Template
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Supported formats: <span className="font-medium">.csv, .xlsx</span>
                            </p>
                          </div>
                          {importRows.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={handleClearImportData}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Upload file</p>
                          <ImageUploadDropzone
                            accept=".csv,.xlsx"
                            type="excel"
                            label="Drag & Drop Excel or CSV File"
                            description="Upload bulk subcategory file"
                            maxSize={10 * 1024 * 1024}
                            onFileSelect={handleImportFileSelected}
                          />
                        </div>
                        {importRows.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  Preview ({importStats.total} rows)
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddImportRow}
                                >
                                  Add row
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Valid: {importStats.valid} | Errors: {importStats.errors}
                                {importStats.duplicates > 0 && ` | Duplicates: ${importStats.duplicates}`}
                              </p>
                            </div>
                            <div className="border w-full rounded-md max-h-80 overflow-auto">
                              <DataTable
                                columns={importTableColumns}
                                data={importRows}
                                enableSelection={false}
                                addPagination={false}
                                pageSize={5}
                                getRowId={(row, index) => String(index)}
                                containerClassName="flex flex-col overflow-hidden rounded-none border-0 bg-background min-h-[200px] max-h-[320px]"
                                enableHeaderContextMenu={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <DrawerFooter className="border-t px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-muted-foreground">
                              ✔ Valid:{" "}
                              <span className="font-semibold text-emerald-700">
                                {importStats.valid}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              ⚠ Errors:{" "}
                              <span className="font-semibold text-red-700">
                                {importStats.errors}
                              </span>
                            </span>
                            {importStats.duplicates > 0 && (
                              <span className="text-muted-foreground">
                                ✖ Duplicates:{" "}
                                <span className="font-semibold text-orange-700">
                                  {importStats.duplicates}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handleImportValidSubmit}
                              disabled={!importStats.valid || importLoading}
                            >
                              {importLoading ? "Importing..." : "Import Valid Only"}
                            </Button>
                            <DrawerClose asChild>
                              <Button type="button" variant="ghost">
                                Cancel
                              </Button>
                            </DrawerClose>
                          </div>
                        </div>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </div>
                <Label
                  type="button"
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Export Excel
                </Label>
                <DrawerTrigger asChild>
                  <Button
                    type="button"
                    variant="success"
                    className="bg-black text-white shadow hover:bg-black px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"

                    onClick={() => {
                      handleClearForm();
                      setSubcategoryDrawerOpen(true);
                    }}
                  >
                    Add New Subcategory
                  </Button>
                </DrawerTrigger>
              </div>
            </div>

            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div>
                    <DrawerTitle>
                      {editingId ? "Edit Subcategory" : "Add New Subcategory"}
                    </DrawerTitle>
                    <DrawerDescription>
                      {editingId
                        ? "Update the subcategory details."
                        : "Fill in the details below to add a new subcategory."}
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
                      ✕
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6 sm:pb-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <Field>
                    <FieldLabel htmlFor="subcategory-name">Name</FieldLabel>
                    <Input
                      id="subcategory-name"
                      type="text"
                      placeholder="Subcategory Name"
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <Combobox
                      options={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
                      value={categoryId}
                      onChange={(val) => setCategoryId(val ?? "")}
                      placeholder="Select Category"
                      className="mt-1"
                    />
                  </Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center flex-wrap">
                    <Button type="submit" variant="default" disabled={loading} className="w-full sm:w-auto">
                      {loading
                        ? "Please wait..."
                        : editingId
                          ? "Update Subcategory"
                          : "Add Subcategory"}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleClearForm}
                      className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md w-full sm:w-auto"
                    >
                      Clear
                    </Button>
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="w-full sm:w-auto sm:ml-auto">
                        Cancel
                      </Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Table section */}
        <div className="min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="w-full min-w-0 flex-5">
                <Input
                  type="text"
                  placeholder="Search subcategories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full  min-w-0 flex-1">
                <UiSelect
                  value={customItemsPerPage !== "" ? "custom" : (effectiveItemsPerPage <= 100 && [10, 20, 50, 100].includes(effectiveItemsPerPage) ? String(effectiveItemsPerPage) : "custom")}
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--radix-select-trigger-width)">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="custom" disabled>
                        Custom{customItemsPerPage ? ` (${effectiveItemsPerPage})` : ""}
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <div className="px-2 py-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Custom</p>
                      <CustomRowsPerPageInput
                        type="number"
                        min={1}
                        max={500}
                        placeholder="e.g. 25"
                        className="h-8 w-full text-sm"
                        value={customItemsPerPage}
                        onChange={setCustomItemsPerPage}
                        autoFocus
                      />
                    </div>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>

          {subcategoriesLoading ? (
            <div className="flex justify-center items-center py-10"><Loader /></div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <DataTable
                columns={subcategoryColumns}
                data={filtered}
                pageSize={effectiveItemsPerPage}
                initialPageIndex={initialPageIndex}
                onPageChange={handlePageChange}
                rowSelection={tableRowSelection}
                onRowSelectionChange={setTableRowSelection}
                onSelectionChange={(rows) => setSelectedSubcategoryIds(rows.map((r) => r._id))}
              />
            </div>
          )}
        </div>
      </div>

      <DeleteModel
        title="Delete subcategory?"
        description="This action cannot be undone. This will permanently delete the selected subcategory."
        onDelete={handleDeleteConfirmed}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={loading}
      />

      <ResolveDependenciesDialog
        open={deleteWithDepsOpen}
        onOpenChange={setDeleteWithDepsOpen}
        title="Resolve Subcategory Dependencies"
        dependencyData={deleteWithDepsData}
        childLabel=""
        linkedLabel="linked products"
        transferDescription="Move all product links to another subcategory before deleting this one."
        cascadeDescription="This will permanently unlink this subcategory from all products and delete the subcategory. This action cannot be undone."
        onChooseTransfer={() => setTransferDialogOpen(true)}
        onChooseCascade={() => {
          setDeleteId(deleteWithDepsData?.id ?? null);
          setCascadeConfirmOpen(true);
        }}
      />

      <TransferDependenciesDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        title="Transfer Subcategory Dependencies"
        description="Select the target subcategory to move all product links to, then confirm."
        targetOptions={(subcategories || [])
          .filter((s) => s._id !== deleteWithDepsData?.id)
          .map((s) => ({ value: s._id, label: s.name }))}
        value={transferTargetId}
        onValueChange={setTransferTargetId}
        onSubmit={handleTransferProceed}
        submitLabel="Transfer & Delete"
      />

      <DeleteModel
        title="Cascade delete subcategory?"
        description="This will permanently unlink the subcategory from all products and delete the subcategory. This action cannot be undone."
        requireAcceptCheckbox
        acceptLabel="I understand that this subcategory will be unlinked from all products and permanently deleted."
        confirmLabel="Delete all"
        open={cascadeConfirmOpen}
        onOpenChange={(open) => {
          setCascadeConfirmOpen(open);
          if (!open) setDeleteId(null);
        }}
        onDelete={handleCascadeDeleteConfirmed}
        loading={cascadeDeleteLoading}
      />

      <DeleteModel
        title="Delete subcategories?"
        description="This action cannot be undone. This will permanently delete the selected subcategories."
        onDelete={handleBulkDeleteConfirmed}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        loading={loading}
      />

      <BulkDependencyManagerModal
        open={bulkManagerOpen}
        onOpenChange={setBulkManagerOpen}
        manager={bulkManager}
        itemsSource={subcategories}
        mode="subcategory"
        onComplete={() => {
          setBulkManagerOpen(false);
        }}
      />
    </div>
  );
};

export default Subcategories;
