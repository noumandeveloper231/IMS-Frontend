import React, { useEffect, useState } from "react";
import axios from "axios";

const PurchaseReceive = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [formData, setFormData] = useState({
    purchaseOrder: "",
    vendor: "",
    items: [],
    receiveDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | received | not-received
  const [extraItems, setExtraItems] = useState([]);

  // ✅ Fetch Approved Purchase Orders
  const fetchPOs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/purchase-orders");
      console.log(res.data);
      setPurchaseOrders(
        res.data.filter(
          (po) =>
            po.status === "approved" ||
            po.status === "partially" ||
            po.status === "processing"
        )
      );
    } catch (err) {
      console.error("Error fetching POs:", err);
    }
  };

  // ✅ Fetch Conditions
  const fetchConditions = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/conditions/getall"
      );
      const res2 = await axios.get("http://localhost:5000/api/brands/getall");
      setConditions(res.data.conditions || []);
      setBrands(res2.data.brands || []);
    } catch (err) {
      console.error("Error fetching conditions:", err);
      setConditions([]); // Set empty array on error
    }
  };

  useEffect(() => {
    fetchPOs();
    fetchConditions();
  }, []);

  // ✅ Fetch single PO detail (fresh after receive)
  const fetchSinglePO = async (poId) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/purchase-orders/${poId}`
      );
      return res.data;
    } catch (err) {
      console.error("Error fetching single PO:", err);
      return null;
    }
  };

  // ✅ Handle PO Select
  const handlePOChange = (poId) => {
    const po = purchaseOrders.find((p) => p._id === poId);
    setSelectedPO(po);

    setFormData({
      ...formData,
      purchaseOrder: po._id,
      vendor: po.vendor?._id || "",
      items: po.items.map((item) => ({
        itemId: item._id, // ✅ Track unique item ID
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
    });
  };
  const filteredItems = selectedPO?.items.filter((item, idx) => {
    const alreadyReceived = Number(item.receivedQty || 0);
    const remaining = Math.max(
      0,
      Number(item.orderedQty || 0) - alreadyReceived
    );

    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.purchasePrice?.toString().includes(searchQuery) ||
      remaining?.toString().includes(searchQuery);

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
    newItems[index] = {
      ...newItems[index],
      receivedQty: Number(value),
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleConditionChange = (index, conditionId) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      condition: conditionId,
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleBrandChange = (index, brandId) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      brand: brandId,
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ Filter out items with receivedQty > 0 from formData
      const regularItems = formData.items.filter(
        (item) => item.receivedQty > 0
      );

      // ✅ Convert extraItems to match the backend format
      const extraItemsFormatted = extraItems
        .filter((item) => item.asin && item.title && item.quantity > 0)
        .map((item) => ({
          title: item.title,
          asin: item.asin,
          orderedQty: 0, // Extra items don't have ordered qty
          receivedQty: item.quantity,
          purchasePrice: item.price,
          salePrice: item.salePrice || 0,
          condition: item.condition,
          brand: item.brand || "",
        }));

      // ✅ Merge both regular and extra items
      const allItems = [...regularItems, ...extraItemsFormatted];

      if (allItems.length === 0) {
        alert("⚠️ Please add at least one item to receive");
        return;
      }

      // ✅ Prepare payload with all items
      const payload = {
        ...formData,
        items: allItems,
      };

      const res = await axios.post(
        "http://localhost:5000/api/purchase-receives",
        payload
      );

      if (res.data.success) {
        alert("✅ Purchase Receive Created!");

        // ✅ Refresh PO list
        await fetchPOs();

        // ✅ Clear extra items
        setExtraItems([]);

        if (formData.purchaseOrder) {
          const freshPO = await fetchSinglePO(formData.purchaseOrder);
          if (freshPO) {
            setSelectedPO(freshPO);
            setFormData({
              ...formData,
              items: freshPO.items.map((item) => ({
                itemId: item._id, // ✅ Track unique item ID
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
            });
          }
        } else {
          setSelectedPO(null);
        }

        setFormData((prev) => ({
          ...prev,
          receiveDate: new Date().toISOString().split("T")[0],
          notes: "",
        }));
      }
    } catch (err) {
      console.error("Error creating receive:", err);
      alert("❌ Failed to create receive");
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-full   bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-4">📦 Create Purchase Receive</h2>

        {/* Select PO */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">
            Select Purchase Order
          </label>
          <select
            className="w-full border p-2 rounded"
            value={formData.purchaseOrder}
            onChange={(e) => handlePOChange(e.target.value)}
          >
            <option value="">-- Select PO --</option>
            {purchaseOrders.map((po) => (
              <option key={po._id} value={po._id}>
                {po.poNo} - {po.vendor?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items Table */}
        {selectedPO && (
          <div className="mt-4">
            <h3 className="font-semibold">Order Items</h3>
            {/* Search + Filter */}
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                placeholder="Search by Product, ASIN, Remaining, Price..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border p-2 rounded w-1/2"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="all">All Items</option>
                <option value="not-received">Not Received</option>
                <option value="received">Received</option>
              </select>
            </div>

            <table className="w-full border mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">S.No</th>
                  <th className="p-2 border">Product</th>
                  <th className="p-2 border">ASIN</th>
                  <th className="p-2 border">Remaining</th>
                  <th className="p-2 border">Purchase Price</th>
                  <th className="p-2 border">Sale Price</th>
                  <th className="p-2 border">Condition</th>
                  {/* <th className="p-2 border">Brand</th> */}
                  <th className="p-2 border">Receive Now</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const alreadyReceived = Number(item.receivedQty || 0);
                  const remaining = Math.max(
                    0,
                    Number(item.orderedQty || 0) - alreadyReceived
                  );

                  // ✅ Find actual index in formData.items by matching item._id
                  const actualIndex = formData.items.findIndex(
                    (formItem) => formItem.itemId === item._id
                  );

                  return (
                    <tr key={item._id}>
                      <td className="p-2 border font-semibold">{idx + 1}</td>{" "}
                      {/* 👈 Sr No */}
                      <td className="p-2 border">{item.title}</td>
                      <td className="p-2 border">{item.asin || "N/A"}</td>
                      <td className="p-2 border">{remaining}</td>
                      <td className="p-2 border">{item.purchasePrice}</td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          min="0"
                          value={formData.items[actualIndex]?.salePrice || ""}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[actualIndex].salePrice = Number(
                              e.target.value
                            );
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="border p-1 rounded w-24"
                          placeholder="Sale Price"
                        />
                      </td>
                      <td className="p-2 border">
                        <select
                          value={formData.items[actualIndex]?.condition || ""}
                          onChange={(e) =>
                            handleConditionChange(actualIndex, e.target.value)
                          }
                          className="border p-1 rounded w-32"
                        >
                          <option value="">Select Condition</option>
                          {conditions &&
                            conditions.length > 0 &&
                            conditions.map((condition) => (
                              <option key={condition._id} value={condition._id}>
                                {condition.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="p-2 border">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={
                              formData.items[actualIndex]?.receivedQty || ""
                            }
                            onChange={(e) =>
                              handleItemQtyChange(actualIndex, e.target.value)
                            }
                            className="border p-1 rounded w-20"
                            hidden={remaining === 0}
                            title={
                              remaining === 0
                                ? "No quantity left to receive"
                                : ""
                            }
                          />

                          {remaining === 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              ✅ Fully Received
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* ✅ Extra Products Section */}
            {extraItems.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold text-lg mb-2">
                  🟡 Extra Products (Not in PO)
                </h3>
                <table className="w-full border">
                  <thead>
                    <tr className="bg-yellow-100">
                      <th className="p-2 border">S.No</th>
                      <th className="p-2 border">ASIN</th>
                      <th className="p-2 border">Title</th>
                      <th className="p-2 border">Quantity</th>
                      <th className="p-2 border">Purchase Price</th>
                      <th className="p-2 border">Sale Price</th>
                      <th className="p-2 border">Condition</th>
                      <th className="p-2 border">Brand</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraItems.map((item, idx) => (
                      <tr key={idx} className="bg-yellow-50">
                        <td className="p-2 border font-semibold">{idx + 1}</td>
                        <td className="p-2 border">
                          <input
                            type="text"
                            value={item.asin}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].asin = e.target.value;
                              setExtraItems(newItems);
                            }}
                            placeholder="ASIN"
                            className="border p-1 rounded w-32"
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].title = e.target.value;
                              setExtraItems(newItems);
                            }}
                            placeholder="Product Title"
                            className="border p-1 rounded w-64"
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].quantity = Number(e.target.value);
                              setExtraItems(newItems);
                            }}
                            className="border p-1 rounded w-20"
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].price = Number(e.target.value);
                              setExtraItems(newItems);
                            }}
                            className="border p-1 rounded w-24"
                          />
                        </td>
                        <td className="p-2 border">
                          <input
                            type="number"
                            min="0"
                            value={item.salePrice || ""}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].salePrice = Number(e.target.value);
                              setExtraItems(newItems);
                            }}
                            className="border p-1 rounded w-24"
                            placeholder="Sale Price"
                          />
                        </td>
                        <td className="p-2 border">
                          <select
                            value={item.condition}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].condition = e.target.value;
                              setExtraItems(newItems);
                            }}
                            className="border p-1 rounded w-32"
                          >
                            <option value="">Select</option>
                            {conditions.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border">
                          <select
                            value={item.brand}
                            onChange={(e) => {
                              const newItems = [...extraItems];
                              newItems[idx].brand = e.target.value;
                              setExtraItems(newItems);
                            }}
                            className="border p-1 rounded w-32"
                          >
                            <option value="">Select</option>
                            {brands.map((b) => (
                              <option key={b._id} value={b._id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 border text-center">
                          <button
                            onClick={() => {
                              const updated = extraItems.filter(
                                (_, i) => i !== idx
                              );
                              setExtraItems(updated);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            {filteredItems.length > 0 && (
              // Added p-4 (padding), border, rounded-lg, and a light background
              <div className="mt-4 p-4 border border-gray-300 bg-gray-50 rounded-lg shadow-sm">
                {/* First Row: Quantity Totals */}
                <div className="flex justify-end space-x-6 text-sm font-semibold mb-2 text-gray-700">
                  {/* Total Ordered */}
                  <p>
                    <span className="font-bold text-gray-800">
                      Total Ordered:
                    </span>{" "}
                    {filteredItems.reduce(
                      (sum, i) => sum + Number(i.orderedQty || 0),
                      0
                    )}
                  </p>

                  {/* Total Received */}
                  <p>
                    <span className="font-bold text-green-700">Received:</span>{" "}
                    {filteredItems.reduce(
                      (sum, i) => sum + Number(i.receivedQty || 0),
                      0
                    )}
                  </p>

                  {/* Total Remaining */}
                  <p>
                    <span className="font-bold text-red-700">Remaining:</span>{" "}
                    {filteredItems.reduce(
                      (sum, i) =>
                        sum +
                        Math.max(
                          0,
                          Number(i.orderedQty || 0) - Number(i.receivedQty || 0)
                        ),
                      0
                    )}
                  </p>
                </div>

                <hr className="my-3 border-gray-300" />

                {/* Second Row: Price Totals (Kept mostly as is, with minor cleanup) */}
                <div className="text-sm font-medium text-gray-700 text-right space-y-1">
                  {/* Total Purchase Price */}
                  <p>
                    <span className="font-bold text-gray-800">
                      Total Purchase Price (Ordered):
                    </span>{" "}
                    <span className="ml-2 text-base font-semibold">
                      Rs{" "}
                      {filteredItems
                        .reduce(
                          (sum, i) =>
                            sum +
                            Number(i.orderedQty || 0) *
                              Number(i.purchasePrice || 0),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </p>

                  {/* Received Purchase Price */}
                  <p>
                    <span className="font-bold text-green-700">
                      Received Purchase Price:
                    </span>{" "}
                    <span className="ml-2 text-base font-semibold">
                      Rs{" "}
                      {filteredItems
                        .reduce(
                          (sum, i) =>
                            sum +
                            Number(i.receivedQty || 0) *
                              Number(i.purchasePrice || 0),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </p>

                  {/* Remaining Purchase Price */}
                  <p>
                    <span className="font-bold text-red-700">
                      Remaining Purchase Price:
                    </span>{" "}
                    <span className="ml-2 text-base font-semibold">
                      Rs{" "}
                      {filteredItems
                        .reduce(
                          (sum, i) =>
                            sum +
                            Math.max(
                              0,
                              Number(i.orderedQty || 0) -
                                Number(i.receivedQty || 0)
                            ) *
                              Number(i.purchasePrice || 0),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes + Date */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Receive Date</label>
            <input
              type="date"
              value={formData.receiveDate}
              onChange={(e) =>
                setFormData({ ...formData, receiveDate: e.target.value })
              }
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full border p-2 rounded"
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <button
          onClick={handleAddExtra}
          className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
        >
          + Add Extra Product
        </button>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Save Receive
        </button>
      </div>
    </div>
  );
};

export default PurchaseReceive;
