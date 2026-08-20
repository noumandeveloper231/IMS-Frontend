import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { DeleteModel } from "@/components/DeleteModel";
import { DataTable } from "@/components/UI/data-table";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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

const TEMPLATE_COLUMNS = [
  "Title",
  "Category",
  "Amount",
  "Payment Method",
  "Date",
  "Status",
  "Notes",
];
const REQUIRED_FILE_COLUMNS = ["Title", "Amount"];

const normalizeKey = (key) =>
  key
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeCategoryName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const Expenses = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");

  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [expenseDate, setExpenseDate] = useState("");
  const [status, setStatus] = useState("paid");
  const [notes, setNotes] = useState("");
  const [highlightedExpenseId, setHighlightedExpenseId] = useState(null);

  const titleInputRef = useRef(null);

  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
  });
  const [importLoading, setImportLoading] = useState(false);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!Number.isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await api.get("/expenses/getall");
      return res.data?.expenses ?? res.data ?? [];
    },
  });

  const { data: expenseCategoriesData, isLoading: expenseCategoriesLoading } =
    useQuery({
      queryKey: ["expenseCategories"],
      queryFn: async () => {
        const res = await api.get("/expense-categories/getall");
        return res.data?.categories ?? res.data ?? [];
      },
    });

  const expenses = expensesData ?? [];
  const expenseCategories = expenseCategoriesData ?? [];

  // Handle highlight parameter from search
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && !expensesLoading && expenses.length > 0) {
      const highlightedExpense = expenses.find((e) => e._id === highlightId);
      if (highlightedExpense) {
        setHighlightedExpenseId(highlightedExpense._id);
        requestAnimationFrame(() => {
          const rowEl = document.querySelector(
            `[data-highlight-target="${highlightedExpense._id}"]`,
          );
          rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        // Clear the highlight parameter from URL
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("highlight");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [searchParams, expensesLoading, expenses, setSearchParams]);

  useEffect(() => {
    if (!highlightedExpenseId) return;
    const timer = setTimeout(() => setHighlightedExpenseId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedExpenseId]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/expenses/create", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Expense added successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleClearForm();
      setExpenseDrawerOpen(false);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer || "Unable to create expense. Please try again ❌",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/expenses/update/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Expense updated successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      handleClearForm();
      setExpenseDrawerOpen(false);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer || "Unable to update expense. Please try again ❌",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/expenses/delete/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Expense deleted successfully ✅");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(
        messageFromServer || "Unable to delete expense. Please try again ❌",
      );
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleClearForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("");
    setAmount("");
    setPaymentMethod("cash");
    setExpenseDate("");
    setStatus("paid");
    setNotes("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required ❌");
      return;
    }

    if (!category) {
      toast.error("Category is required ❌");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Amount must be greater than 0 ❌");
      return;
    }

    const payload = {
      title: trimmedTitle,
      category,
      amount: numericAmount,
      paymentMethod,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      status,
      notes: notes?.trim() || undefined,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense._id);
    setTitle(expense.title || "");
    setCategory(expense.category?._id ?? expense.category ?? "");
    setAmount(expense.amount != null ? String(expense.amount) : "");
    setPaymentMethod(expense.paymentMethod || "cash");
    setExpenseDate(
      expense.expenseDate
        ? new Date(expense.expenseDate).toISOString().split("T")[0]
        : "",
    );
    setStatus(expense.status || "paid");
    setNotes(expense.notes || "");
    setExpenseDrawerOpen(true);
    toast.info(`Editing expense: ${expense.title}`);
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 100);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirmed = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const filteredExpenses = useMemo(
    () =>
      (expenses || []).filter((e) =>
        (e.title || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [expenses, search],
  );

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map((exp) => ({
        Title: exp.title || "",
        Category:
          expenseCategories.find(
            (c) => c._id === (exp.category?._id ?? exp.category),
          )?.name ??
          exp.category?.name ??
          exp.category ??
          "",
        Amount: exp.amount ?? 0,
        "Payment Method": exp.paymentMethod || "",
        Status: exp.status || "",
        Date: exp.expenseDate
          ? new Date(exp.expenseDate).toLocaleDateString()
          : "",
        Notes: exp.notes || "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "Expenses.xlsx");
  };

  const validateFileColumns = (rows) => {
    if (!rows.length) return { ok: false, message: "File is empty." };
    const first = rows[0];
    const keys = Object.keys(first || {});
    const normalized = keys.map((k) => normalizeKey(k));
    const hasTitle = normalized.includes("title");
    const hasAmount = normalized.includes("amount");
    if (!hasTitle || !hasAmount) {
      return {
        ok: false,
        message:
          "File must contain at least 'Title' and 'Amount' columns. Please use the template.",
      };
    }
    return { ok: true };
  };

  const validateImportedRows = (rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0 });
      return [];
    }

    const titleKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "title",
    );
    const amountKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "amount",
    );
    const categoryKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "category",
    );
    const paymentMethodKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "paymentmethod",
    );
    const dateKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "date",
    );
    const statusKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "status",
    );
    const notesKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "notes",
    );

    const validated = rows.map((row) => {
      const titleKey =
        Object.keys(row).find((k) => normalizeKey(k) === "title") ??
        titleKeyRef ??
        null;
      const amountKey =
        Object.keys(row).find((k) => normalizeKey(k) === "amount") ??
        amountKeyRef ??
        null;
      const categoryKey =
        Object.keys(row).find((k) => normalizeKey(k) === "category") ??
        categoryKeyRef ??
        null;
      const paymentMethodKey =
        Object.keys(row).find((k) => normalizeKey(k) === "paymentmethod") ??
        paymentMethodKeyRef ??
        null;
      const dateKey =
        Object.keys(row).find((k) => normalizeKey(k) === "date") ??
        dateKeyRef ??
        null;
      const statusKey =
        Object.keys(row).find((k) => normalizeKey(k) === "status") ??
        statusKeyRef ??
        null;
      const notesKey =
        Object.keys(row).find((k) => normalizeKey(k) === "notes") ??
        notesKeyRef ??
        null;

      const rawTitle = titleKey ? String(row[titleKey] ?? "") : "";
      const titleVal = rawTitle.trim();

      const rawAmountVal = amountKey ? row[amountKey] : null;
      const numericAmount = Number(rawAmountVal);

      const categoryName = categoryKey ? String(row[categoryKey] ?? "") : "";
      const paymentMethodVal = paymentMethodKey
        ? String(row[paymentMethodKey] ?? "")
        : "";
      const dateVal = dateKey ? String(row[dateKey] ?? "") : "";
      const statusVal = statusKey ? String(row[statusKey] ?? "") : "";
      const notesVal = notesKey ? String(row[notesKey] ?? "") : "";

      const fieldErrors = {};
      let statusMessage = "";

      if (!titleVal) {
        fieldErrors[titleKey || "Title"] = "Title is required";
        statusMessage = "Title is required";
      }

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        fieldErrors[amountKey || "Amount"] = "Amount must be greater than 0";
        statusMessage = statusMessage || "Invalid amount";
      }

      if (categoryName) {
        const norm = normalizeCategoryName(categoryName);
        const existsInCategories = expenseCategories.some(
          (c) => normalizeCategoryName(c.name) === norm,
        );
        if (!existsInCategories) {
          fieldErrors[categoryKey || "Category"] = "Category not found";
          statusMessage = statusMessage || "Category not found";
        }
      }

      if (dateVal) {
        const parsed = new Date(dateVal);
        if (Number.isNaN(parsed.getTime())) {
          fieldErrors[dateKey || "Date"] = "Invalid date";
          statusMessage = statusMessage || "Invalid date";
        }
      }

      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstErrorKey = Object.keys(fieldErrors)[0];
      const firstError = firstErrorKey ? fieldErrors[firstErrorKey] : "";

      return {
        ...row,
        __title: titleVal,
        __amount: numericAmount,
        __categoryName: categoryName,
        __paymentMethod: paymentMethodVal,
        __date: dateVal,
        __statusValue: statusVal,
        __notes: notesVal,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
      };
    });

    const valid = validated.filter((r) => r.__status === "valid").length;
    const errors = validated.filter((r) => r.__status === "error").length;

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
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        defval: "",
      });

      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0 });
        return;
      }

      const colCheck = validateFileColumns(rows);
      if (!colCheck.ok) {
        toast.error(`${colCheck.message} ❌`);
        return;
      }

      const firstRowKeys = Object.keys(rows[0] || {});
      setImportColumns(firstRowKeys);
      const validatedRows = validateImportedRows(rows);
      setImportRows(validatedRows);
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
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

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    const templateRow = [
      Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""])),
    ];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Expenses-import-template.xlsx");
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0 });
    toast.info("Import data cleared");
  };

  const handleAddImportRow = () => {
    const newRow = Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
  };

  const findCategoryIdByName = useCallback(
    (name) => {
      const norm = normalizeCategoryName(name);
      const match = expenseCategories.find(
        (c) => normalizeCategoryName(c.name) === norm,
      );
      return match?._id || null;
    },
    [expenseCategories],
  );

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }
    setImportLoading(true);
    try {
      for (const row of validRows) {
        const categoryId = row.__categoryName
          ? findCategoryIdByName(row.__categoryName)
          : null;
        const payload = {
          title: row.__title,
          category: categoryId || undefined,
          amount: row.__amount,
          paymentMethod:
            row.__paymentMethod?.toString().toLowerCase() || "cash",
          expenseDate: row.__date ? new Date(row.__date) : new Date(),
          status: row.__statusValue?.toString().toLowerCase() || "paid",
          notes: row.__notes || undefined,
        };
        await api.post("/expenses/create", payload);
      }
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`Imported ${validRows.length} expenses ✅`);
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
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r,
      );
      return validateImportedRows(next);
    });
  }, []);

  const handleRemoveImportRow = useCallback((rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  }, []);

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {Number(row.id) + 1}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dynamicCols = (importColumns || []).map((col) => ({
      id: col,
      header: col,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const rowIndex = Number(row.id);
        const rowData = row.original;
        return (
          <Input
            value={rowData[col] ?? ""}
            onChange={(e) =>
              handleImportCellChange(rowIndex, col, e.target.value)
            }
            className="h-8 text-xs"
          />
        );
      },
    }));

    const statusCol = {
      id: "__status",
      header: "Status",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        const isValid = r.__status === "valid";
        return (
          <span
            className={
              isValid
                ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
            }
          >
            {isValid ? "Valid" : "Error"}
          </span>
        );
      },
    };

    const actionsCol = {
      id: "__actions",
      header: "Actions",
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
          ✕
        </Button>
      ),
    };

    return [indexCol, ...dynamicCols, statusCol, actionsCol];
  }, [importColumns, handleImportCellChange, handleRemoveImportRow]);

  const expenseColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        className: "text-center",
      },
      {
        id: "title",
        header: "Title",
        accessorKey: "title",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">
            {row.original.title}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const exp = row.original;
          const name =
            expenseCategories.find(
              (c) => c._id === (exp.category?._id ?? exp.category),
            )?.name ??
            exp.category?.name ??
            exp.category ??
            "-";
          return <span>{name}</span>;
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.amount != null ? row.original.amount : ""}
          </span>
        ),
      },
      {
        id: "paymentMethod",
        header: "Method",
        accessorKey: "paymentMethod",
        cell: ({ row }) => <span>{row.original.paymentMethod}</span>,
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <span>{row.original.status}</span>,
      },
      {
        id: "date",
        header: "Date",
        accessorKey: "expenseDate",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.expenseDate
              ? new Date(row.original.expenseDate).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "notes",
        header: "Notes",
        accessorKey: "notes",
        cell: ({ row }) => <span>{row.original.notes || "-"}</span>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const exp = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(exp)}
                aria-label="Edit expense"
              >
                ✏️
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => confirmDelete(exp._id)}
                aria-label="Delete expense"
              >
                🗑
              </Button>
            </div>
          );
        },
      },
    ],
    [expenseCategories],
  );

  return (
    <div className="max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <div className="min-w-0">
          <Drawer open={expenseDrawerOpen} onOpenChange={setExpenseDrawerOpen}>
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold truncate min-w-0">
                Expenses List ({filteredExpenses.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
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
                            <DrawerTitle>Bulk Expense Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple
                              expenses.
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
                              Supported formats:{" "}
                              <span className="font-medium">.csv, .xlsx</span>
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
                            description="Upload bulk expense file"
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
                                Valid: {importStats.valid} | Errors:{" "}
                                {importStats.errors}
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
                                containerClassName="flex flex-col overflow-hidden rounded-none border-none bg-background min-h-[200px] max-h-[320px]"
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
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handleImportValidSubmit}
                              disabled={!importStats.valid || importLoading}
                            >
                              {importLoading
                                ? "Importing..."
                                : "Import Valid Only"}
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
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Export Excel
                </Label>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => {
                    handleClearForm();
                    setExpenseDrawerOpen(true);
                  }}
                  className="bg-black text-white shadow hover:bg-black/90 px-3 sm:px-4 py-2.5 sm:py-3 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Add New Expense
                </Button>
              </div>
            </div>

            <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
              <DrawerHeader className="px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <DrawerTitle>
                      {editingId ? "Edit Expense" : "Add New Expense"}
                    </DrawerTitle>
                    <DrawerDescription>
                      {editingId
                        ? "Update the expense details."
                        : "Fill in the details below to add a new expense."}
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Close"
                    >
                      ✕
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerHeader>
              <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6 sm:pb-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <Field>
                    <FieldLabel htmlFor="expense-title">Title</FieldLabel>
                    <Input
                      id="expense-title"
                      type="text"
                      placeholder="Expense Title"
                      ref={titleInputRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expense-category">Category</FieldLabel>
                    <select
                      id="expense-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Category</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
                      <Input
                        id="expense-amount"
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="expense-payment-method">
                        Payment Method
                      </FieldLabel>
                      <select
                        id="expense-payment-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>
                        <option value="credit">Credit</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="expense-date">Date</FieldLabel>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="mt-1"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="expense-status">Status</FieldLabel>
                      <select
                        id="expense-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="expense-notes">Notes</FieldLabel>
                    <textarea
                      id="expense-notes"
                      placeholder="Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </Field>
                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center flex-wrap">
                    <Button
                      type="submit"
                      variant="default"
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      {loading
                        ? "Please wait..."
                        : editingId
                          ? "Update Expense"
                          : "Add Expense"}
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
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto sm:ml-auto"
                      >
                        Cancel
                      </Button>
                    </DrawerClose>
                  </div>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="w-full min-w-0 flex-5">
                <Input
                  type="text"
                  placeholder="Search expenses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto min-w-0 flex-1">
                <UiSelect
                  value={
                    customItemsPerPage !== ""
                      ? "custom"
                      : effectiveItemsPerPage <= 100 &&
                          [10, 20, 50, 100].includes(effectiveItemsPerPage)
                        ? String(effectiveItemsPerPage)
                        : "10"
                  }
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                  className="w-full"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="custom" disabled>
                        Custom
                        {customItemsPerPage
                          ? ` (${effectiveItemsPerPage})`
                          : ""}
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <div
                      className="px-2 py-2"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                        Custom
                      </p>
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

          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <DataTable
              columns={expenseColumns}
              data={filteredExpenses}
              isLoading={expensesLoading || expenseCategoriesLoading}
              pageSize={effectiveItemsPerPage}
              getRowProps={(row) => ({
                "data-highlight-target": row.original?._id,
                className:
                  row.original?._id === highlightedExpenseId
                    ? "search-highlight-row"
                    : "",
              })}
            />
          </div>
        </div>
      </div>

      <DeleteModel
        title="Delete expense?"
        description="This action cannot be undone. This will permanently delete the selected expense."
        onDelete={handleDeleteConfirmed}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={loading}
      />
    </div>
  );
};

export default Expenses;
