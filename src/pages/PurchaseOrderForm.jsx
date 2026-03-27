import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/UI/select";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { DataTable } from "@/components/DataTable";
import { Check, X, Trash2, Edit2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/UI/tooltip";
import { Combobox } from "@/components/UI/combobox";
import { Textarea } from "@/components/UI/textarea";

const TEMPLATE_COLUMNS = ["SKU", "Quantity", "Purchase Price"];

const PurchaseOrderForm = () => {
  const queryClient = useQueryClient();
  const [vendors, setVendorsState] = useState([]);
  const [items, setItems] = useState([
    { vendor: null, product: null, receivedQty: 0, orderedQty: 1, purchasePrice: 0, total: 0 },
  ]);
  const [vendor, setVendor] = useState(null);
  const [expectedDelivery, setExpectedDelivery] = useState(null);
  const [paymentTerm, setPaymentTerm] = useState("advance");
  const [notes, setNotes] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
    duplicates: 0,
  });
  const [importLoading, setImportLoading] = useState(false);

  // Open Import Excel drawer when a file is dragged over the page; close when drag leaves
  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setImportDrawerOpen(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (e.relatedTarget != null && document.body.contains(e.relatedTarget)) return;
      setImportDrawerOpen(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
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

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors/getall");
      return res.data ?? [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      const data = res.data;
      return data?.products ?? data ?? [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];

  useEffect(() => {
    setVendorsState(Array.isArray(vendorsData) ? vendorsData : []);
  }, [vendorsData]);

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/purchase-orders", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Purchase Order saved ✅");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setItems([{ vendor: '', product: '', receivedQty: 0, orderedQty: 1, purchasePrice: 0, total: 0 }]);
      setVendor('');
      setExpectedDelivery('');
      setNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Error saving purchase order ❌");
    },
  });

  const normalizeKey = (key) =>
    key?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const validateFileColumns = (rows) => {
    if (!rows.length) return { ok: false, message: "File is empty." };
    const first = rows[0];
    const keys = Object.keys(first || {});
    const normalized = keys.map((k) => normalizeKey(k));
    const hasSku = normalized.some((n) => n === "sku");
    const hasQuantity = normalized.some((n) => n === "quantity" || n === "qty");
    const hasPurchasePrice = normalized.some((n) => n === "purchaseprice" || n === "price");
    if (!hasSku) {
      return { ok: false, message: "File does not contain the required column 'SKU'. Please use the template." };
    }
    if (!hasQuantity) {
      return { ok: false, message: "File does not contain the required column 'Quantity'. Please use the template." };
    }
    if (!hasPurchasePrice) {
      return { ok: false, message: "File does not contain the required column 'Purchase Price'. Please use the template." };
    }
    return { ok: true };
  };

  const normalizeRowToTemplate = (row) => {
    const keys = Object.keys(row || {});
    const skuKey = keys.find((k) => normalizeKey(k) === "sku");
    const qtyKey = keys.find((k) => normalizeKey(k) === "quantity" || normalizeKey(k) === "qty");
    const priceKey = keys.find((k) => normalizeKey(k) === "purchaseprice" || normalizeKey(k) === "price");
    return {
      SKU: skuKey ? String(row[skuKey] ?? "").trim() : "",
      Quantity: qtyKey ? String(row[qtyKey] ?? "").trim() : "",
      "Purchase Price": priceKey ? String(row[priceKey] ?? "").trim() : "",
    };
  };

  const validateImportedRows = useCallback(
    (rows, setStats = true) => {
      if (!rows.length) {
        if (setStats) setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return [];
      }
      const validated = rows.map((row, idx) => {
        const sku = (row.SKU ?? "").toString().trim();
        const qtyStr = (row.Quantity ?? "").toString().trim();
        const priceStr = (row["Purchase Price"] ?? "").toString().trim();
        const quantity = parseInt(qtyStr, 10);
        const purchasePrice = parseFloat(priceStr);
        const fieldErrors = {};
        let statusMessage = "";

        if (!sku) {
          fieldErrors.SKU = "Required";
          statusMessage = statusMessage || "SKU required";
        }

        let productMatch = null;
        if (sku) {
          const skuLower = sku.toLowerCase();
          productMatch =
            products.find(
              (p) => (p.sku ?? "").toString().trim().toLowerCase() === skuLower
            ) ?? null;
          if (!productMatch) {
            fieldErrors.SKU = "SKU not found";
            statusMessage = statusMessage || "SKU not found";
          }
        }

        if (qtyStr === "" || isNaN(quantity) || quantity < 1) {
          fieldErrors.Quantity = qtyStr === "" ? "Required" : "Must be ≥ 1";
          statusMessage = statusMessage || "Invalid quantity";
        }
        if (priceStr === "" || isNaN(purchasePrice) || purchasePrice < 0) {
          fieldErrors["Purchase Price"] = priceStr === "" ? "Required" : "Must be ≥ 0";
          statusMessage = statusMessage || "Invalid price";
        }

        const hasErrors = Object.keys(fieldErrors).length > 0;
        const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
        return {
          ...row,
          __sku: sku,
          __quantity: hasErrors ? 0 : quantity,
          __price: hasErrors ? 0 : purchasePrice,
          __total: hasErrors ? 0 : quantity * purchasePrice,
          __product: productMatch,
          __errors: fieldErrors,
          __status: hasErrors ? "error" : "valid",
          __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
          id: row.id ?? idx,
        };
      });
      const valid = validated.filter((r) => r.__status === "valid").length;
      const errors = validated.filter((r) => r.__status === "error").length;
      const duplicates = 0;
      if (setStats) setImportStats({ total: rows.length, valid, errors, duplicates });
      return validated;
    },
    [products]
  );

  const handleImportCellChange = useCallback((rowIndex, columnKey, value) => {
    setImportRows((prev) => {
      const next = prev.map((r, i) =>
        i === rowIndex ? { ...r, [columnKey]: value } : r
      );
      return validateImportedRows(next);
    });
  }, [validateImportedRows]);

  const handleRemoveImportRow = useCallback((rowIndex) => {
    setImportRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (!next.length) {
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return [];
      }
      return validateImportedRows(next);
    });
  }, [validateImportedRows]);

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

  const handleImportFileSelected = useCallback(async (fileOrFiles) => {
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
  }, [validateImportedRows]);

  const handleImportValidSubmit = () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }

    const newItems = validRows
      .map((r) => {
        const product = r.__product;
        if (!product) return null;
        const quantity = r.__quantity;
        const price = r.__price;
        return {
          product,
          productId: product._id,
          title: product.title || product.sku || "",
          asin: product.asin || "",
          sku: product.sku || r.__sku,
          orderedQty: quantity,
          purchasePrice: price,
          total: quantity * price,
        };
      })
      .filter(Boolean);

    if (!newItems.length) {
      toast.error("No valid products to import ❌");
      return;
    }

    setItems((prev) => {
      const base =
        prev.length === 1 &&
          !prev[0].title &&
          prev[0].orderedQty === 1 &&
          !prev[0].purchasePrice
          ? []
          : prev;
      return [...base, ...newItems];
    });
    toast.success(`Imported ${newItems.length} items ✅`);
    setImportDrawerOpen(false);
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    const templateRow = [Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]))];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Purchase-Order-Items-import-template.xlsx");
  };

  useEffect(() => {
    const total = items.reduce((acc, item) => acc + (item.total || 0), 0);
    setGrandTotal(total);
  }, [items]);

  const updateItem = React.useCallback((index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "orderedQty" || field === "purchasePrice") {
        updated[index].total =
          (Number(updated[index].orderedQty) || 0) *
          (Number(updated[index].purchasePrice) || 0);
      }
      return updated;
    });
  }, []);

  const setItemFromProduct = React.useCallback((index, product) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product, // store full product details
        productId: product._id,
        title: product.title || product.sku || "",
        asin: product.asin ?? updated[index].asin,
        sku: product.sku ?? updated[index].sku,
        purchasePrice:
          Number(product.purchasePrice) ||
          updated[index].purchasePrice ||
          0,
      };
      updated[index].total =
        (Number(updated[index].orderedQty) || 0) *
        (Number(updated[index].purchasePrice) || 0);
      return updated;
    });
  }, []);

  const addItem = React.useCallback(() => {
    setItems((prev) => [
      ...prev,
      { title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 },
    ]);
  }, []);

  const removeItem = React.useCallback((index) => {
    setItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length
        ? updated
        : [{ title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 }];
    });
  }, []);

  const handleSubmit = () => {
    if (!vendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (!items.some((i) => (i.title || "").trim() || i.orderedQty > 0)) {
      toast.error("Add at least one item");
      return;
    }

    const payload = {
      vendor,
      expectedDelivery: expectedDelivery || undefined,
      paymentTerm,
      notes,
      totalAmount: grandTotal,
      items: items.map((i) => ({
        title: i.title,
        sku: i.sku,
        productId: i.productId,
        product: i.product,
        asin: i.asin,
        orderedQty: Number(i.orderedQty) || 0,
        purchasePrice: Number(i.purchasePrice) || 0,
        total: Number(i.total) || 0,
      })),
    };
    createMutation.mutate(payload);
  };

  const itemColumns = React.useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        meta: { label: "Product" },
        cell: ({ row }) => {
          const index = row.index;
          const item = row.original;
          return (
            <Combobox
              options={products.map((product) => ({
                label:
                  product.title +
                  " - " +
                  product.sku,
                value: product._id,
                qrcode: product.image,
              }))}
              value={item.productId || ""}
              onChange={(value) => {
                updateItem(index, "productId", value);
                const product = products.find((p) => p._id === value);
                if (product) {
                  setItemFromProduct(index, product);
                }
              }}
              placeholder="Enter Product Title"
              className="min-w-[200px]"
            />
          );
        },
      },
      {
        id: "orderedQty",
        header: "Quantity",
        meta: { label: "Quantity" },
        cell: ({ row }) => {
          const index = row.index;
          const item = row.original;
          return (
            <Input
              type="number"
              min={1}
              value={item.orderedQty}
              onChange={(e) =>
                updateItem(index, "orderedQty", Number(e.target.value))
              }
            />
          );
        },
      },
      {
        id: "purchasePrice",
        header: "Purchase Price",
        meta: { label: "Purchase Price" },
        cell: ({ row }) => {
          const index = row.index;
          const item = row.original;
          return (
            <Input
              type="number"
              min={0}
              value={item.purchasePrice}
              onChange={(e) =>
                updateItem(index, "purchasePrice", Number(e.target.value))
              }
            />
          );
        },
      },
      {
        id: "total",
        header: "Total",
        meta: { label: "Total" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="font-medium">
              AED {Number(item.total || 0).toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        meta: { label: "Action" },
        cell: ({ row }) => {
          const index = row.index;
          return (
            <button
              type="button"
              className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
              onClick={() => removeItem(index)}
            >
              <Trash2 size={18} />
            </button>
          );
        },
      },
    ],
    [products, updateItem, setItemFromProduct, removeItem]
  );

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
    const dynamicCols = (importColumns.length ? importColumns : TEMPLATE_COLUMNS).map((col) => {
      const isQty = normalizeKey(col) === "quantity";
      const isPrice = normalizeKey(col) === "purchaseprice" || normalizeKey(col) === "price";
      return {
        id: col,
        header: col,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rowIndex = Number(row.id);
          const rowData = row.original;
          const val = (rowData[col] ?? "").toString();
          const err = rowData.__errors?.[col];
          const fulfilled = !err;
          const errorMsg = err || "Required";
          return (
            <div className="flex items-center gap-2 min-w-0" onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()}>
              <Input
                type={isQty || isPrice ? "number" : "text"}
                min={isQty ? 1 : isPrice ? 0 : undefined}
                value={val}
                onChange={(e) =>
                  handleImportCellChange(rowIndex, col, isQty || isPrice ? e.target.value : e.target.value)
                }
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                className="h-8 text-xs flex-1 min-w-0"
                placeholder={col}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${fulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                      aria-hidden
                    >
                      {fulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    {fulfilled ? "OK" : errorMsg}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
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
                {r.__status === "valid" ? "Ready to import" : (r.__statusMessage || "Validation error")}
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
  }, [importColumns, handleImportCellChange, handleRemoveImportRow]);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          Create Purchase Order
        </h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Field>
            <FieldLabel>Vendor</FieldLabel>
            <Combobox
              options={vendors.map((vendor) => ({
                label: vendor.name,
                value: vendor._id,
              }))}
              value={vendor}
              onChange={(value) => setVendor(value)}
              onSelectProduct={(product) => setVendor(product._id)}
              placeholder="Select Vendor"
              className="min-w-[200px]"
            />
          </Field>
          <Field>
            <FieldLabel>Expected Delivery</FieldLabel>
            <Input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="h-10"
            />
          </Field>
          <Field>
            <FieldLabel>Payment Term</FieldLabel>
            <Select value={paymentTerm} onValueChange={setPaymentTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="item-aligned">
                <SelectGroup>
                  <SelectLabel>Select a Payment Term</SelectLabel>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="net15">Net 15</SelectItem>
                  <SelectItem value="net30">Net 30</SelectItem>
                  <SelectItem value="net45">Net 45</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={addItem}>
                + Add Item
              </Button>
              <Drawer open={importDrawerOpen} onOpenChange={setImportDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button type="button" variant="outline" className="whitespace-nowrap">
                    Import Excel
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh] w-full max-w-[100vw]">
                  <DrawerHeader className="border-b px-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <DrawerTitle>Bulk Purchase Order Items Import</DrawerTitle>
                        <DrawerDescription>
                          Upload CSV or Excel file to add multiple order items. Use the template columns: Title, ASIN, Quantity, Purchase Price.
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
                        accept=".csv,.xlsx,.xls"
                        type="excel"
                        label="Drag & Drop Excel or CSV File"
                        description="Upload bulk order items file"
                        maxSize={10 * 1024 * 1024}
                        onFileSelect={handleImportFileSelected}
                      />
                    </div>
                    {importRows.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Preview ({importStats.total} rows)</p>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddImportRow}>
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
                          ✔ Valid: <span className="font-semibold text-emerald-700">{importStats.valid}</span>
                        </span>
                        <span className="text-muted-foreground">
                          ⚠ Errors: <span className="font-semibold text-red-700">{importStats.errors}</span>
                        </span>
                        {importStats.duplicates > 0 && (
                          <span className="text-muted-foreground">
                            ✖ Duplicates: <span className="font-semibold text-orange-700">{importStats.duplicates}</span>
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
          </div>
          <DataTable
            columns={itemColumns}
            data={items}
            fixedHeight={false}
            addPagination={false}
            enableSelection={false}
            enableHeaderContextMenu={false}
            containerClassName="overflow-x-auto rounded-md border border-gray-300"
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(value) => setNotes(value)}
              className="h-24"
            />
          </Field>
          <div className="space-y-3 flex flex-col items-end">
            <div className="flex justify-between items-center text-lg font-bold border-t pt-4 w-full max-w-sm">
              <span>Grand Total:</span>
              <span>AED {grandTotal.toFixed(2)}</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="w-full max-w-sm"
            >
              {createMutation.isPending ? "Saving..." : "Save Purchase Order"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
