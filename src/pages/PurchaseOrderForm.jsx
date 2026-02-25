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
import { Trash2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          Create Purchase Order
        </h1>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Field>
            <FieldLabel>Vendor</FieldLabel>
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger>
                <SelectValue placeholder="Select Vendor" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectLabel>Select a Vendor</SelectLabel>
                  {vendors.length > 0 ? (
                    vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-vendors" disabled>
                      No Vendors Found
                    </SelectItem>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
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
          <div className="overflow-x-auto rounded-md border border-gray-300">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-28">Quantity</TableHead>
                  <TableHead className="w-32">Purchase Price</TableHead>
                  <TableHead className="w-24">Total</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Enter Product Title"
                        value={item.title || ""}
                        onChange={(e) =>
                          updateItem(index, "title", e.target.value)
                        }
                        className="min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.orderedQty}
                        onChange={(e) =>
                          updateItem(index, "orderedQty", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.purchasePrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "purchasePrice",
                            Number(e.target.value)
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      AED {Number(item.total || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-full transition-colors duration-200"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
