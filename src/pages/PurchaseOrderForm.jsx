import React, { useState, useEffect } from "react";
import api from "../utils/api";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { DataTable } from "@/components/DataTable";
import { Trash2, ChevronDown, Check } from "lucide-react";
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
import { Combobox } from "@/components/UI/combobox";

function ProductCombobox({
  products = [],
  value,
  onChange,
  onSelectProduct,
  placeholder = "Enter Product Title",
  className,
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (product) => {
    onChange(product.title || "");
    onSelectProduct?.(product);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative min-w-[200px]">
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            className={cn("min-w-[200px]", className)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p._id}
                  value={[p.title, p.sku, p.asin].filter(Boolean).join(" ")}
                  onSelect={() => handleSelect(p)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{p.title || p.sku || "—"}</span>
                    {(p.sku || p.asin) && (
                      <span className="text-xs text-muted-foreground">
                        {[p.sku, p.asin].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function VendorCombobox({
  vendors = [],
  value,
  onChange,
  placeholder = "Select Vendor",
}) {
  const [open, setOpen] = useState(false);
  const selected = vendors.find((v) => v._id === value) ?? null;
  const displayLabel = selected ? selected.name : placeholder;

  const handleSelect = (vendor) => {
    onChange(vendor._id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
            "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-80" align="start">
        <Command>
          <CommandInput placeholder="Search vendor..." />
          <CommandList>
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {vendors.map((v) => (
                <CommandItem
                  key={v._id}
                  value={v.name}
                  onSelect={() => handleSelect(v)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === v._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {v.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const PurchaseOrderForm = () => {
  const queryClient = useQueryClient();
  const [vendors, setVendorsState] = useState([]);
  const [items, setItems] = useState([
    { title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 },
  ]);
  const [vendor, setVendor] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("advance");
  const [notes, setNotes] = useState("");
  const [grandTotal, setGrandTotal] = useState(0);

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
      setItems([{ title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 }]);
      setVendor("");
      setExpectedDelivery("");
      setNotes("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Error saving purchase order ❌");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/products/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success && data?.items?.length) {
        const converted = data.items.map((item) => {
          const orderedQty = Number(item.orderedQty ?? item.quantity ?? 0);
          const purchasePrice = Number(item.purchasePrice ?? 0);
          const total = Number(item.total ?? orderedQty * purchasePrice);
          return {
            title: item.title,
            asin: item.asin,
            orderedQty,
            purchasePrice,
            total,
          };
        });
        setItems((prev) => [...prev, ...converted]);
        toast.success(`${converted.length} items added from Excel ✅`);
      } else {
        toast.error("No valid items in file ❌");
      }
    },
    onError: () => {
      toast.error("Error importing Excel. Check file format ❌");
    },
  });

  useEffect(() => {
    const total = items.reduce((acc, item) => acc + (item.total || 0), 0);
    setGrandTotal(total);
  }, [items]);

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "orderedQty" || field === "purchasePrice") {
      updated[index].total =
        (Number(updated[index].orderedQty) || 0) *
        (Number(updated[index].purchasePrice) || 0);
    }
    setItems(updated);
  };

  const setItemFromProduct = (index, product) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      title: product.title || product.sku || "",
      asin: product.asin ?? updated[index].asin,
      purchasePrice: Number(product.purchasePrice) || updated[index].purchasePrice || 0,
    };
    updated[index].total =
      (Number(updated[index].orderedQty) || 0) *
      (Number(updated[index].purchasePrice) || 0);
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      { title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 },
    ]);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length ? updated : [{ title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 }]);
  };

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
        asin: i.asin,
        orderedQty: Number(i.orderedQty) || 0,
        purchasePrice: Number(i.purchasePrice) || 0,
        total: Number(i.total) || 0,
      })),
    };
    createMutation.mutate(payload);
  };

  const handleExcelImport = (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    bulkImportMutation.mutate(formData);
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
                  product.sku +
                  " - " +
                  product.asin,
                value: product._id,
                qrcode: product.qrCode,
              }))}
              value={item.productId || ""}
              onChange={(value) => updateItem(index, "productId", value)}
              onSelectProduct={(product) => setItemFromProduct(index, product)}
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

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          Create Purchase Order
        </h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Field>
            <FieldLabel>Vendor</FieldLabel>
            <VendorCombobox
              vendors={vendors}
              value={vendor}
              onChange={setVendor}
              placeholder="Select Vendor"
            />
          </Field>
          <Field>
            <FieldLabel>Expected Delivery</FieldLabel>
            <Input
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Payment Term</FieldLabel>
            <Select value={paymentTerm} onValueChange={setPaymentTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
          <h3 className="text-lg font-semibold mb-4">Order Items</h3>
          <DataTable
            columns={itemColumns}
            data={items}
            addPagination={false}
            enableSelection={false}
            enableHeaderContextMenu={false}
            containerClassName="overflow-x-auto rounded-md border border-gray-300"
          />

          <div className="flex flex-wrap gap-4 mt-4">
            <Button type="button" onClick={addItem}>
              + Add Item
            </Button>
            <div className="flex-1 min-w-[200px]">
              <ImageUploadDropzone
                accept=".xlsx,.xls"
                onFileSelect={handleExcelImport}
                disabled={bulkImportMutation.isPending}
                primaryLabel="Drag & drop Excel file"
                secondaryLabel="or click to browse (.xlsx, .xls)"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <Input
              type="text"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
