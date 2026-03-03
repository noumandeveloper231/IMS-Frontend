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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { DataTable } from "@/components/DataTable";
import { Combobox } from "@/components/UI/combobox";
import { Textarea } from "@/components/UI/textarea";

const PurchaseReceive = () => {
  const queryClient = useQueryClient();
  const formDataRef = React.useRef(null);
  const extraItemsRef = React.useRef([]);
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
                product: item.product,
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
        product: item.product,
        itemId: item._id,
        receivedQty: 0,
        alreadyReceived: item.receivedQty || 0,
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
      (item.product.title || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (item.product.asin || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.product.purchasePrice || "").includes(searchQuery) ||
      String(remaining).includes(searchQuery);
    const matchesFilter =
      filterType === "all" ||
      (filterType === "not-received" && remaining > 0) ||
      (filterType === "received" && remaining === 0);
    return matchesSearch && matchesFilter;
  });

  formDataRef.current = formData;
  extraItemsRef.current = extraItems;

  const orderItemRows = React.useMemo(
    () =>
      filteredItems.filter((item) =>
        formData.items.some((fi) => fi.itemId === item._id)
      ),
    [filteredItems, formData.items]
  );

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      const data = res.data;
      return data?.products ?? data ?? [];
    },
  });

  const products = Array.isArray(productsData) ? productsData : [];

  const orderItemColumns = React.useMemo(
    () => [
      {
        id: "sno",
        header: "S.No",
        meta: { label: "S.No" },
        cell: ({ row }) => (
          <span className="font-medium">{row.index + 1}</span>
        ),
      },
      {
        id: "title",
        header: "Product",
        meta: { label: "Product" },
        cell: ({ row }) => {
          const item = row.original;
          return <span>{item.product.title}</span>;
        },
      },
      {
        id: "asin",
        header: "SKU",
        meta: { label: "SKU" },
        cell: ({ row }) => {
          const item = row.original;
          return <span>{item.product.sku || "N/A"}</span>;
        },
      },
      {
        id: "remaining",
        header: "Remaining",
        meta: { label: "Remaining" },
        cell: ({ row }) => {
          const item = row.original;
          const alreadyReceived = Number(item.receivedQty || 0);
          const remaining = Math.max(
            0,
            Number(item.orderedQty || 0) - alreadyReceived
          );
          return <span>{remaining}</span>;
        },
      },
      {
        id: "purchasePrice",
        header: "Purchase Price",
        meta: { label: "Purchase Price" },
        cell: ({ row }) => {
          const item = row.original;
          return <span>{item.product.purchasePrice}</span>;
        },
      },
      {
        id: "salePrice",
        header: "Sale Price",
        meta: { label: "Sale Price" },
        cell: ({ row }) => {
          const item = row.original;
          return <span>{item.product.salePrice}</span>;

        },
      },
      {
        id: "condition",
        header: "Condition",
        meta: { label: "Condition" },
        cell: ({ row }) => {
          const item = row.original;
          return <span>{item?.product?.condition?.name || "N/A"}</span>;

        },
      },
      {
        id: "receiveNow",
        header: "Receive Now",
        meta: { label: "Receive Now" },
        cell: ({ row }) => {
          const item = row.original;
          const alreadyReceived = Number(item.receivedQty || 0);
          const remaining = Math.max(
            0,
            Number(item.orderedQty || 0) - alreadyReceived
          );
          const items = formDataRef.current?.items ?? [];
          const actualIndex = items.findIndex((fi) => fi.itemId === item._id);
          if (actualIndex < 0) return null;
          const formItem = items[actualIndex];
          return (
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
          );
        },
      },
    ],
    [conditions]
  );

  const extraItemColumns = React.useMemo(
    () => [
      {
        id: "sno",
        header: "S.No",
        meta: { label: "S.No" },
        cell: ({ row }) => (
          <span className="font-medium">{row.index + 1}</span>
        ),
      },
      {
        id: "product",
        header: "Product",
        meta: { label: "Product" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Combobox
              options={products.map((p) => ({
                label: `${p.title} - ${p.sku}`,
                value: p._id,
                qrcode: p.qrCode,
              }))}
              className="min-w-[200px] w-full"
              placeholder="Search product..."
              value={item.product}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = { ...next[idx], product: e.target.value };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "quantity",
        header: "Qty",
        meta: { label: "Qty" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Input
              type="number"
              min={1}
              className="w-20"
              value={item.quantity}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = {
                  ...next[idx],
                  quantity: Number(e.target.value),
                };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "purchasePrice",
        header: "Purchase Price",
        meta: { label: "Purchase Price" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Input
              type="number"
              min={0}
              className="w-24"
              value={item.price}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = {
                  ...next[idx],
                  price: Number(e.target.value),
                };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "salePrice",
        header: "Sale Price",
        meta: { label: "Sale Price" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Input
              type="number"
              min={0}
              className="w-24"
              placeholder="Sale"
              value={item.salePrice ?? ""}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = {
                  ...next[idx],
                  salePrice: Number(e.target.value),
                };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "condition",
        header: "Condition",
        meta: { label: "Condition" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Combobox
              options={conditions.map((c) => ({
                label: c.name,
                value: c._id,
              }))}
              className="min-w-[200px] w-full"
              placeholder="Search condition..."
              value={item.condition?._id}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = { ...next[idx], condition: item.condition?._id };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "brand",
        header: "Brand",
        meta: { label: "Brand" },
        cell: ({ row }) => {
          const idx = row.index;
          const list = extraItemsRef.current;
          const item = list[idx];
          if (!item) return null;
          return (
            <Combobox
              options={brands.map((b) => ({
                label: b.name,
                value: b._id,
              }))}
              className="min-w-[200px] w-full"
              placeholder="Search brand..."
              value={item.brand?._id}
              onChange={(e) => {
                const next = [...extraItemsRef.current];
                next[idx] = { ...next[idx], brand: item.brand?._id };
                setExtraItems(next);
              }}
            />
          );
        },
      },
      {
        id: "actions",
        header: "",
        meta: { label: "" },
        cell: ({ row }) => {
          const idx = row.index;
          return (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() =>
                setExtraItems((prev) => prev.filter((_, i) => i !== idx))
              }
            >
              Remove
            </Button>
          );
        },
      },
    ],
    [conditions, brands]
  );

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
    const numeric = Number(value);
    setFormData((prev) => {
      const items = [...(prev.items || [])];
      if (!items[index]) return prev;
      items[index] = { ...items[index], receivedQty: numeric };
      return { ...prev, items };
    });
  };

  const handleConditionChange = (index, conditionId) => {
    setFormData((prev) => {
      const items = [...(prev.items || [])];
      if (!items[index]) return prev;
      items[index] = { ...items[index], condition: conditionId };
      return { ...prev, items };
    });
  };

  console.log(formData);

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
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create Purchase Receive
        </h2>

        <Field className="mb-6">
          <FieldLabel>Select Purchase Order</FieldLabel>
          <Combobox
            options={purchaseOrders.map((po) => ({
              label: `${po.orderNo || po.poNo || po._id} - ${po.vendor?.name || ""}`,
              value: po._id,
            }))}
            value={selectedPO?._id}
            onChange={(value) => handlePOChange(value)}
            placeholder="-- Select PO --"
          />
        </Field>

        {selectedPO && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Order Items</h3>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex-5">
                <Input
                  type="text"
                  placeholder="Search by Product, ASIN, Remaining, Price..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 ">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    <SelectGroup>
                      <SelectLabel>Filter by Status</SelectLabel>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="not-received">Not Received</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DataTable
              columns={orderItemColumns}
              data={orderItemRows}
              addPagination={false}
              enableSelection={false}
              enableHeaderContextMenu={false}
              containerClassName="overflow-x-auto rounded-lg border"
            />

            {extraItems.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-lg mb-2">
                  Extra Products (Not in PO)
                </h3>
                <DataTable
                  columns={extraItemColumns}
                  data={extraItems}
                  addPagination={false}
                  enableSelection={false}
                  enableHeaderContextMenu={false}
                  containerClassName="overflow-x-auto rounded-lg border border-amber-200 bg-amber-50/50"
                />
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
            <Textarea
              // type="text"
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
