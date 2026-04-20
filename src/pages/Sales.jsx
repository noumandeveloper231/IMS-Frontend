import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import api from "../utils/api";
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
import {
  TableCell,
} from "@/components/UI/table";
import { cn } from "@/lib/utils";
import { useScanner } from "@/context/ScannerContext";
import { DataTable } from "@/components/DataTable";
import { Combobox } from "@/components/UI/combobox";
import { Textarea } from "@/components/UI/textarea";

function SalesEmployeeCombobox({
  employees = [],
  value,
  onChange,
  placeholder = "Search employee...",
}) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e._id === value) ?? null;
  const displayLabel = selected
    ? `${selected.name} (${selected.role})`
    : placeholder;

  const handleSelect = (employee) => {
    onChange(employee._id);
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
          <CommandInput placeholder="Search employee..." />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp._id}
                  value={`${emp.name} ${emp.role}`}
                  onSelect={() => handleSelect(emp)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === emp._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {emp.name} ({emp.role})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const Sales = () => {
  const queryClient = useQueryClient();
  const { registerAddToCartBySku } = useScanner();

  const [saleNote, setSaleNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [items, setItems] = useState([
    { productId: "", productName: "", stock: 0, price: 0, quantity: 1, total: 0, salesnote: "" },
  ]);
  const [customer, setCustomer] = useState({ name: "Walking Customer", phone: "" });
  const [phoneError, setPhoneError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [sellAt, setSellAt] = useState("shop");

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? [];

  console.log(products);

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return Array.isArray(res.data) ? res.data : res.data?.employees ?? [];
    },
  });
  const employees = employeesData ?? [];
  const activeEmployees = (employees || []).filter((e) => e.status === "active");

  const updateItem = useCallback((index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      if (field === "quantity") {
        const currentItem = updated[index];
        const maxQuantity = Math.max(0, Number(currentItem?.stock) || 0);
        const minQuantity = maxQuantity > 0 ? 1 : 0;
        const parsedValue = Number(value);
        const safeValue = Number.isFinite(parsedValue) ? parsedValue : minQuantity;
        value = Math.min(maxQuantity, Math.max(minQuantity, safeValue));
      }

      updated[index] = { ...updated[index], [field]: value };

      if (field === "productId") {
        const selected = products.find((p) => p._id === value);
        if (selected) {
          updated[index] = {
            ...updated[index],
            productName: selected.title,
            salesnote: selected.salesnote,
            stock: selected.quantity,
            price: selected.salePrice,
            total: selected.salePrice * updated[index].quantity,
          };
        } else {
          updated[index] = {
            productId: "",
            productName: "",
            stock: 0,
            price: 0,
            quantity: 1,
            total: 0,
            salesnote: "",
          };
        }
      }

      if (field === "quantity" || field === "price") {
        updated[index].total = updated[index].price * updated[index].quantity;
      }

      return updated;
    });
  }, [products]);

  const addItem = useCallback(() => {
    setItems((prev) => ([
      ...prev,
      { productId: "", productName: "", salesnote: "", stock: 0, price: 0, quantity: 1, total: 0 },
    ]));
  }, []);

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Barcode scans add product to cart by SKU (mobile scanner or USB keyboard wedge)
  const productsRef = useRef(products);
  productsRef.current = products;
  useEffect(() => {
    return registerAddToCartBySku((sku) => {
      const trimmed = String(sku).trim();
      const product = (productsRef.current || []).find((p) => (p.sku || "").toString().trim() === trimmed);
      if (!product) {
        toast.error(`No product found for SKU: ${trimmed}`);
        return;
      }
      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.productId === product._id);
        if (existingIndex >= 0) {
          const next = [...prev];
          const item = next[existingIndex];
          const qty = Math.min((item.quantity || 0) + 1, item.stock ?? 9999);
          next[existingIndex] = { ...item, quantity: qty, total: (item.price || 0) * qty };
          return next;
        }
        return [
          ...prev,
          {
            productId: product._id,
            productName: product.title,
            salesnote: product.salesnote || "",
            stock: product.quantity ?? 0,
            price: product.salePrice ?? 0,
            quantity: 1,
            total: (product.salePrice ?? 0) * 1,
          },
        ];
      });
      toast.success(`Added ${product.title}`);
    });
  }, [registerAddToCartBySku]);

  const subTotal = items.reduce((acc, item) => acc + item.total, 0);
  const vat = subTotal * 0.05;
  const grandTotal = subTotal + vat + Number(shipping) - Number(discount);

  const createSaleMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/sales/create", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Sale created successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setItems([{ productId: "", productName: "", stock: 0, price: 0, quantity: 1, total: 0, salesnote: "" }]);
      setCustomer({ name: "Walking Customer", phone: "" });
      setSelectedEmployee("");
      setDiscount(0);
      setShipping(0);
      setPaymentMethod("cash");
      setSellAt("shop");
      setPaymentStatus("paid");
      setSaleNote("");
    },
    onError: (err) => {
      const message = err.response?.data?.message || err.message || "Error creating sale";
      toast.error(message);
    },
  });

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!selectedEmployee) {
      toast.error("Please select a seller (employee)");
      return;
    }
    if (!customer.name?.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (validItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    const payload = {
      customer,
      items: validItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      subTotal,
      discount,
      grandTotal,
      paymentMethod,
      paymentStatus,
      shipping,
      sellAt,
      employee: selectedEmployee,
      salesnote: saleNote,
    };

    createSaleMutation.mutate(payload);
  };

  const itemColumns = useMemo(
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
              options={products
                .filter((p) => Number(p.quantity ?? 0) > 0)
                .map((p) => ({
                  value: p._id,
                  label: p.title || p.sku || "Unnamed product",
                  qrcode: p.image,
                }))}
              value={item.productId}
              onChange={(id) => updateItem(index, "productId", id)}
              placeholder="Search product..."
              className="min-w-[220px]"
            />
          );
        },
      },
      {
        id: "stock",
        header: "Stock",
        meta: { label: "Stock" },
        cell: ({ row }) => {
          const item = row.original;
          const remainingStock = Math.max(0, (item.stock || 0) - (item.quantity || 0));
          return <span className="text-sm text-gray-500">{remainingStock}</span>;
        },
      },
      {
        id: "price",
        header: "Price",
        meta: { label: "Price" },
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">AED {row.original.price}</span>
        ),
      },
      {
        id: "quantity",
        header: "Quantity",
        meta: { label: "Quantity" },
        cell: ({ row }) => {
          const index = row.index;
          const item = row.original;
          return (
            <Input
              type="number"
              min={item.stock > 0 ? 1 : 0}
              max={item.stock}
              className="w-20 h-9"
              value={item.quantity}
              onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
            />
          );
        },
      },
      {
        id: "total",
        header: "Total",
        meta: { label: "Total" },
        cell: ({ row }) => (
          <span className="font-medium">AED {row.original.total}</span>
        ),
      },
      {
        id: "action",
        header: "Action",
        filter: false,
        meta: { label: "Action" },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => removeItem(row.index)}
            className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
          >
            <Trash2 size={18} />
          </button>
        ),
      },
    ],
    [products, removeItem, updateItem],
  );

  return (
    <div className="min-h-screen bg-white p-8 sm:p-10 lg:p-12 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
            Create Sale
          </h2>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <Field><FieldLabel htmlFor="customerName">Customer Name</FieldLabel></Field>
              <Input
                id="customerName"
                type="text"
                placeholder="e.g. John Doe"
                className="mt-1"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div>
              <Field><FieldLabel htmlFor="customerPhone">Customer Phone</FieldLabel></Field>
              <Input
                id="customerPhone"
                type="text"
                placeholder="e.g. 03001234567"
                className={cn("mt-1", phoneError && "border-red-500")}
                value={customer.phone}
                onChange={(e) => {
                  let onlyNums = e.target.value.replace(/\D/g, "");
                  if (onlyNums.length > 11) onlyNums = onlyNums.slice(0, 11);
                  setCustomer({ ...customer, phone: onlyNums });
                  setPhoneError(onlyNums.length > 0 && onlyNums.length !== 11 ? "Phone must be 11 digits" : "");
                }}
              />
              {phoneError && <span className="text-red-500 text-sm mt-1">{phoneError}</span>}
            </div>
            <div>
              <Field><FieldLabel>Seller Name *</FieldLabel></Field>
              <div className="mt-1">

                <Combobox
                  options={activeEmployees.map((e) => ({
                    value: e._id,
                    label: e.name,
                  }))}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder="Select Employee"
                />
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Sale Items</h3>
            <DataTable
              columns={itemColumns}
              data={items}
              addPagination={false}
              enableSelection={false}
              enableHeaderContextMenu={false}
              fixedHeight={false}
              containerClassName="overflow-x-auto rounded-lg border border-gray-200"
            />
            <Button type="button" variant="outline" className="mt-4" onClick={addItem}>
              + Add Item
            </Button>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <Field><FieldLabel>Payment Method</FieldLabel></Field>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Select a Payment Method</SelectLabel>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Field><FieldLabel>Sold at</FieldLabel></Field>
                <Select value={sellAt} onValueChange={setSellAt}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sold at</SelectLabel>
                      <SelectItem value="shop">Shop</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="noon">Noon</SelectItem>
                      <SelectItem value="cartlow">Cartlow</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Field><FieldLabel className={"mb-1"}>Sales Note</FieldLabel></Field>
                <Textarea
                  placeholder="Sales notes"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                />
              </div>
              <div>
                <Field><FieldLabel>Payment Status</FieldLabel></Field>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col items-end">
              <div className="w-full max-w-sm space-y-3 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">AED {subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (5%)</span>
                  <span>AED {vat.toFixed(2)}</span>
                </div>
                <div className="">
                  <Field><FieldLabel>Shipping</FieldLabel></Field>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    value={shipping}
                    onChange={(e) => setShipping(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Field><FieldLabel>Discount</FieldLabel></Field>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-gray-900 pt-4 border-t-2">
                  <span>Grand Total:</span>
                  <span>AED {grandTotal.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full mt-6 bg-green-600 hover:bg-green-700"
                  size="lg"
                  disabled={createSaleMutation.isPending}
                  onClick={handleSubmit}
                >
                  {createSaleMutation.isPending ? "Saving..." : "Save Sale"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Sales;
