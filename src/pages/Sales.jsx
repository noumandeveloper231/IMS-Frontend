import React, { useState } from "react";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import api from "../utils/api";
import { API_HOST } from "../config/api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import { cn } from "@/lib/utils";

function SalesProductCombobox({ products = [], value, onChange, placeholder = "Search product..." }) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p._id === value) ?? null;
  const displayLabel = selected ? selected.title : placeholder;

  const handleSelect = (product) => {
    onChange(product._id);
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
          <CommandInput placeholder="Search product..." />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p._id}
                  value={p.title}
                  onSelect={() => handleSelect(p)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p._id ? "opacity-100" : "opacity-0")} />
                  <div className="flex gap-2 items-center">
                    {p.image ? (
                      <img src={`${API_HOST}${p.image}`} alt="" className="h-8 w-8 object-cover rounded border" />
                    ) : (
                      <span className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">—</span>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{p.title}</span>
                      {(p.categories?.length > 0) && (
                        <span className="text-xs text-muted-foreground">
                          {(p.categories || []).map((c) => c.name).join(", ")}
                        </span>
                      )}
                    </div>
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

const Sales = () => {
  const queryClient = useQueryClient();

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

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return Array.isArray(res.data) ? res.data : res.data?.employees ?? [];
    },
  });
  const employees = employeesData ?? [];
  const activeEmployees = (employees || []).filter((e) => e.status === "active");

  const updateItem = (index, field, value) => {
    const updated = [...items];
    if (field === "quantity") {
      value = Math.max(1, Math.min(value, updated[index].stock));
    }
    updated[index][field] = value;

    if (field === "productId") {
      const selected = products.find((p) => p._id === value);
      if (selected) {
        updated[index].productName = selected.title;
        updated[index].salesnote = selected.salesnote;
        updated[index].stock = selected.quantity;
        updated[index].price = selected.salePrice;
        updated[index].total = selected.salePrice * updated[index].quantity;
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
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      { productId: "", productName: "", salesnote: "", stock: 0, price: 0, quantity: 1, total: 0 },
    ]);
  };

  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

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

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
            Create Sale
          </h1>

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
              <Select value={selectedEmployee || undefined} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Employee</SelectLabel>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Sale Items</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="min-w-[200px]">
                        <SalesProductCombobox
                          products={products}
                          value={item.productId}
                          onChange={(id) => updateItem(index, "productId", id)}
                          placeholder="Search product..."
                        />
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{item.stock}</TableCell>
                      <TableCell className="text-sm text-gray-500">AED {item.price}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={item.stock || 9999}
                          className="w-20 h-9"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">AED {item.total}</TableCell>
                      <TableCell className="">
                        <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200">
                          <Trash2 size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                <Field><FieldLabel>Sales Note</FieldLabel></Field>
                <textarea
                  placeholder="Sales notes"
                  className="mt-1 flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
