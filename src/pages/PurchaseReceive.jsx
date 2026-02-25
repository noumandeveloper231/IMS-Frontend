import React, { useState } from "react";
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
} from "@/components/UI/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";

const PurchaseReceive = () => {
  const queryClient = useQueryClient();
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState({
    purchaseOrder: "",
    vendor: "",
    items: [],
    receiveDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [extraItems, setExtraItems] = useState([]);

  const { data: poList = [] } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await api.get("/purchase-orders");
      const list = res.data ?? [];
      return list.filter(
        (po) =>
          po.status === "approved" ||
          po.status === "partially" ||
          po.status === "processing"
      );
    },
  });
  const purchaseOrders = Array.isArray(poList) ? poList : [];

  const { data: conditionsData } = useQuery({
    queryKey: ["conditions"],
    queryFn: async () => {
      const res = await api.get("/conditions/getall");
      return res.data?.conditions ?? [];
    },
  });
  const conditions = Array.isArray(conditionsData) ? conditionsData : [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await api.get("/brands/getall");
      return res.data?.brands ?? [];
    },
  });
  const brands = Array.isArray(brandsData) ? brandsData : [];

  const createReceiveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/purchase-receives", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      toast.success("Purchase Receive created ✅");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-receives"] });
      setExtraItems([]);
      if (formData.purchaseOrder) {
        try {
          const res = await api.get(
            `/purchase-orders/${formData.purchaseOrder}`
          );
          const freshPO = res.data;
          if (freshPO) {
            setSelectedPO(freshPO);
            setFormData((prev) => ({
              ...prev,
              items: freshPO.items.map((item) => ({
                itemId: item._id,
                title: item.title,
                asin: item.asin,
                orderedQty: item.orderedQty,
                receivedQty: 0,
                alreadyReceived: item.receivedQty || 0,
                purchasePrice: item.purchasePrice,
                condition: "",
                brand: "",
                total: 0,
              })),
              receiveDate: new Date().toISOString().split("T")[0],
              notes: "",
            }));
          }
        } catch {
          setSelectedPO(null);
        }
      } else {
        setSelectedPO(null);
      }
    },
    onError: () => toast.error("Failed to create receive ❌"),
  });

  const handlePOChange = (poId) => {
    const po = purchaseOrders.find((p) => p._id === poId);
    setSelectedPO(po);
    if (!po) {
      setFormData((prev) => ({
        ...prev,
        purchaseOrder: "",
        vendor: "",
        items: [],
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      purchaseOrder: po._id,
      vendor: po.vendor?._id || "",
      items: (po.items || []).map((item) => ({
        itemId: item._id,
        title: item.title,
        asin: item.asin,
        orderedQty: item.orderedQty,
        receivedQty: 0,
        alreadyReceived: item.receivedQty || 0,
        purchasePrice: item.purchasePrice,
        condition: "",
        brand: "",
        total: 0,
      })),
    }));
  };

  const filteredItems = (selectedPO?.items || []).filter((item) => {
    const alreadyReceived = Number(item.receivedQty || 0);
    const remaining = Math.max(
      0,
      Number(item.orderedQty || 0) - alreadyReceived
    );
    const matchesSearch =
      (item.title || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (item.asin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.purchasePrice || "").includes(searchQuery) ||
      String(remaining).includes(searchQuery);
    const matchesFilter =
      filterType === "all" ||
      (filterType === "not-received" && remaining > 0) ||
      (filterType === "received" && remaining === 0);
    return matchesSearch && matchesFilter;
  });

  const handleAddExtra = () => {
    setExtraItems((prev) => [
      ...prev,
      {
        asin: "",
        title: "",
        quantity: 1,
        price: 0,
        salePrice: 0,
        condition: "",
        brand: "",
        isExtra: true,
      },
    ]);
  };

  const handleItemQtyChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], receivedQty: Number(value) };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleConditionChange = (index, conditionId) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], condition: conditionId };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleBrandChange = (index, brandId) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], brand: brandId };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const regularItems = formData.items.filter((item) => Number(item.receivedQty) > 0);
    const extraItemsFormatted = extraItems
      .filter((item) => item.asin && item.title && item.quantity > 0)
      .map((item) => ({
        title: item.title,
        asin: item.asin,
        orderedQty: 0,
        receivedQty: item.quantity,
        purchasePrice: item.price,
        salePrice: item.salePrice || 0,
        condition: item.condition,
        brand: item.brand || "",
      }));
    const allItems = [...regularItems, ...extraItemsFormatted];
    if (allItems.length === 0) {
      toast.warning("Please add at least one item to receive");
      return;
    }
    const payload = { ...formData, items: allItems };
    createReceiveMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 sm:p-8 max-w-full">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create Purchase Receive
        </h2>

        <Field className="mb-6">
          <FieldLabel>Select Purchase Order</FieldLabel>
          <Select
            value={formData.purchaseOrder}
            onValueChange={handlePOChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="-- Select PO --" />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders.map((po) => (
                <SelectItem key={po._id} value={po._id}>
                  {po.orderNo || po.poNo || po._id} - {po.vendor?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selectedPO && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <Input
                type="text"
                placeholder="Search by Product, ASIN, Remaining, Price..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="not-received">Not Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>ASIN</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Receive Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => {
                    const alreadyReceived = Number(item.receivedQty || 0);
                    const remaining = Math.max(
                      0,
                      Number(item.orderedQty || 0) - alreadyReceived
                    );
                    const actualIndex = formData.items.findIndex(
                      (fi) => fi.itemId === item._id
                    );
                    if (actualIndex < 0) return null;
                    const formItem = formData.items[actualIndex];
                    return (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.asin || "N/A"}</TableCell>
                        <TableCell>{remaining}</TableCell>
                        <TableCell>{item.purchasePrice}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-24"
                            placeholder="Sale Price"
                            value={formItem?.salePrice ?? ""}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[actualIndex] = {
                                ...newItems[actualIndex],
                                salePrice: Number(e.target.value),
                              };
                              setFormData((prev) => ({ ...prev, items: newItems }));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={formItem?.condition || ""}
                            onValueChange={(v) =>
                              handleConditionChange(actualIndex, v)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                              {conditions.map((c) => (
                                <SelectItem key={c._id} value={c._id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {remaining > 0 ? (
                              <Input
                                type="number"
                                min={0}
                                max={remaining}
                                className="w-20"
                                value={formItem?.receivedQty ?? ""}
                                onChange={(e) =>
                                  handleItemQtyChange(actualIndex, e.target.value)
                                }
                              />
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Fully Received
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {extraItems.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-lg mb-2">
                  Extra Products (Not in PO)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-amber-200 bg-amber-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-100">
                        <TableHead className="w-12">S.No</TableHead>
                        <TableHead>ASIN</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-28">Purchase Price</TableHead>
                        <TableHead className="w-28">Sale Price</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extraItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>
                            <Input
                              className="w-32"
                              placeholder="ASIN"
                              value={item.asin}
                              onChange={(e) => {
                                const next = [...extraItems];
                                next[idx] = { ...next[idx], asin: e.target.value };
                                setExtraItems(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="min-w-[200px]"
                              placeholder="Title"
                              value={item.title}
                              onChange={(e) => {
                                const next = [...extraItems];
                                next[idx] = { ...next[idx], title: e.target.value };
                                setExtraItems(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={item.quantity}
                              onChange={(e) => {
                                const next = [...extraItems];
                                next[idx] = {
                                  ...next[idx],
                                  quantity: Number(e.target.value),
                                };
                                setExtraItems(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="w-24"
                              value={item.price}
                              onChange={(e) => {
                                const next = [...extraItems];
                                next[idx] = {
                                  ...next[idx],
                                  price: Number(e.target.value),
                                };
                                setExtraItems(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="w-24"
                              placeholder="Sale"
                              value={item.salePrice ?? ""}
                              onChange={(e) => {
                                const next = [...extraItems];
                                next[idx] = {
                                  ...next[idx],
                                  salePrice: Number(e.target.value),
                                };
                                setExtraItems(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.condition}
                              onValueChange={(v) => {
                                const next = [...extraItems];
                                next[idx] = { ...next[idx], condition: v };
                                setExtraItems(next);
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Condition" />
                              </SelectTrigger>
                              <SelectContent>
                                {conditions.map((c) => (
                                  <SelectItem key={c._id} value={c._id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.brand}
                              onValueChange={(v) => {
                                const next = [...extraItems];
                                next[idx] = { ...next[idx], brand: v };
                                setExtraItems(next);
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {brands.map((b) => (
                                  <SelectItem key={b._id} value={b._id}>
                                    {b.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() =>
                                setExtraItems((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {filteredItems.length > 0 && (
              <div className="mt-4 p-4 border border-gray-200 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap justify-end gap-6 text-sm font-medium text-gray-700 mb-2">
                  <span>
                    Total Ordered:{" "}
                    {filteredItems.reduce(
                      (s, i) => s + Number(i.orderedQty || 0),
                      0
                    )}
                  </span>
                  <span className="text-green-700">
                    Received:{" "}
                    {filteredItems.reduce(
                      (s, i) => s + Number(i.receivedQty || 0),
                      0
                    )}
                  </span>
                  <span className="text-red-700">
                    Remaining:{" "}
                    {filteredItems.reduce(
                      (s, i) =>
                        s +
                        Math.max(
                          0,
                          Number(i.orderedQty || 0) - Number(i.receivedQty || 0)
                        ),
                      0
                    )}
                  </span>
                </div>
                <hr className="my-3 border-gray-200" />
                <div className="text-right text-sm text-gray-700 space-y-1">
                  <p>
                    Total Purchase Price (Ordered): Rs{" "}
                    {filteredItems
                      .reduce(
                        (s, i) =>
                          s +
                          Number(i.orderedQty || 0) * Number(i.purchasePrice || 0),
                        0
                      )
                      .toFixed(2)}
                  </p>
                  <p className="text-green-700">
                    Received Purchase Price: Rs{" "}
                    {filteredItems
                      .reduce(
                        (s, i) =>
                          s +
                          Number(i.receivedQty || 0) * Number(i.purchasePrice || 0),
                        0
                      )
                      .toFixed(2)}
                  </p>
                  <p className="text-red-700">
                    Remaining Purchase Price: Rs{" "}
                    {filteredItems
                      .reduce(
                        (s, i) =>
                          s +
                          Math.max(
                            0,
                            Number(i.orderedQty || 0) - Number(i.receivedQty || 0)
                          ) * Number(i.purchasePrice || 0),
                        0
                      )
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Field>
            <FieldLabel>Receive Date</FieldLabel>
            <Input
              type="date"
              value={formData.receiveDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  receiveDate: e.target.value,
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Input
              type="text"
              placeholder="Optional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddExtra}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            + Add Extra Product
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReceiveMutation.isPending}
          >
            {createReceiveMutation.isPending ? "Saving..." : "Save Receive"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseReceive;
