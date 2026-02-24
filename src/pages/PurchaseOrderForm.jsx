import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";

const PurchaseOrder = () => {
  const [vendors, setVendors] = useState([]);
  // const [products, setProducts] = useState([]);
  // const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [items, setItems] = useState([
    {title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 },
  ]);

  const [vendor, setVendor] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("advance");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");

  const [grandTotal, setGrandTotal] = useState(0);

  const fetchData = async () => {
    try {
      const vendorRes = await axios.get(
        "http://localhost:5000/api/vendors/getall"
      );
      // const productRes = await axios.get(
      //   "http://localhost:5000/api/products/getall"
      // );
      // const purchaseorderRes = await axios.get(
      //   "http://localhost:5000/api/purchase-orders/"
      // );

      setVendors(vendorRes.data);
      // setProducts(productRes.data.products || productRes.data); // ensure array
      // setPurchaseOrders(purchaseorderRes.data);
    } catch (err) {
      console.error("Error fetching:", err);
    }
  };
  // ✅ fetch vendors + products
  useEffect(() => {
    fetchData();
  }, []);

  // ✅ recalc total
  useEffect(() => {
    const total = items.reduce((acc, item) => acc + item.total, 0);
    setGrandTotal(total);
  }, [items]);

  // ✅ update item
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "orderedQty" || field === "purchasePrice") {
      updated[index].total =
        (updated[index].orderedQty || 0) * (updated[index].purchasePrice || 0);
    }
    setItems(updated);
  };

  // ✅ add new row
  const addItem = () => {
    setItems([
      ...items,
      { title: "", asin: "", orderedQty: 1, purchasePrice: 0, total: 0 },
    ]);
  };

  // ✅ remove row
  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/purchase-orders",
        {
          vendor,
          expectedDelivery,
          paymentTerm,
          notes,
          totalAmount: grandTotal,
          items: items.map((i) => ({
            title: i.title, // 👈 productId ko product me convert kardo
            asin: i.asin,
            orderedQty: i.orderedQty,
            purchasePrice: i.purchasePrice,
            total: i.total,
          })),
        }
      );
      alert("Purchase Order Saved ✅");
      console.log(res.data);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving purchase order");
    }
  };

  return (
    <>
      <div className="p-4 md:p-8 lg:p-12 max-w-full   bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-4">
            Create Purchase Order
          </h1>

          {/* Vendor & Delivery Info */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Vendor */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Vendor
              </label>
              <select
                className="border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Delivery */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Expected Delivery
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </div>

            {/* Payment Terms */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Payment Term
              </label>
              <select
                className="border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value)}
              >
                <option value="advance">Advance</option>
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net45">Net 45</option>
              </select>
            </div>
          </section>

          {/* Items Table */}
          <section className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Order Items</h3>
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    {/* Product Dropdown */}
                    {/* <td className="px-6 py-4 whitespace-nowrap relative">
                      <Combobox
                        value={item.productId || item.title} // 👈 fallback added
                        onChange={(value) => updateItem(index, "productId", value)}
                      >
                        <div className="relative">
                          <ComboboxInput
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            displayValue={(val) => {
                              if (!val) return "";
                              // 🔹 Agar val ek ObjectId hai
                              const found = products.find((p) => p._id === val);
                              if (found) return found.title;
                      
                              // 🔹 Agar val title hai (imported item case)
                              return val;
                            }}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search Product..."
                          />
                          <ComboboxOptions className="absolute mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
                            {Array.isArray(products) &&
                              products
                                .filter((p) =>
                                  p.title
                                    .toLowerCase()
                                    .includes(query.toLowerCase())
                                )
                                .map((p) => (
                                  <ComboboxOption
                                    key={p._id}
                                    value={p._id}
                                    className="cursor-pointer select-none p-2 hover:bg-blue-600 hover:text-white"
                                  >
                                    {p.title}
                                  </ComboboxOption>
                                ))}
                          </ComboboxOptions>
                        </div>
                      </Combobox>
                    </td> */}
                    {/* Product Title Input (No Reference) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.title || ""}
                            onChange={(e) => updateItem(index, "title", e.target.value)}
                            placeholder="Enter Product Title"
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="1"
                        className="w-20 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        value={item.orderedQty}
                        onChange={(e) =>
                          updateItem(index, "orderedQty", Number(e.target.value))
                        }
                      />
                    </td>

                    {/* Purchase Price */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        className="w-28 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        value={item.purchasePrice}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "purchasePrice",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    {/* Total */}
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                      AED. {item.total}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={addItem}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700"
            >
              + Add Item
            </button>
            <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Products from Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={async (e) => {
                  if (!e.target.files[0]) return;
                  
                  const formData = new FormData();
                  formData.append("file", e.target.files[0]);

                  try {
                    const res = await axios.post(
                      "http://localhost:5000/api/products/bulk-import",
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      }
                    );

                    if (res.data.success) {
                      console.log(res.data);
                      // Convert backend items format to frontend format
                      const convertedItems = res.data.items.map(item => {
                        const orderedQty = Number(item.orderedQty ?? item.quantity ?? 0);
                        const purchasePrice = Number(item.purchasePrice ?? 0);
                        const total = Number(item.total ?? orderedQty * purchasePrice);
                        return {
                          title: item.title,
                          asin: item.asin,
                          // productId: item.productId || null,
                          orderedQty,
                          purchasePrice,
                          total,
                        };
                      });
                      setItems([...items, ...convertedItems]); // table me add karo
                      
                      // Refresh products list to include newly imported products
                      fetchData();
                      
                      alert(`✅ Excel import successful! ${convertedItems.length} items added to purchase order.`);
                    }
                  } catch (error) {
                    console.error("Import error:", error);
                    alert("❌ Error importing Excel file. Please check the file format.");
                  }
                  
                  // Reset file input
                  e.target.value = '';
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload Excel file (.xlsx, .xls) to import products and add them to this purchase order
              </p>
            </div>
          </section>

          {/* Notes + Totals */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-col items-end md:col-span-2">
              <div className="space-y-3 w-full max-w-sm">
                <div className="flex justify-between items-center text-xl font-bold text-gray-900 border-t pt-4">
                  <span>Grand Total:</span>
                  <span>AED. {grandTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-md shadow-lg hover:bg-green-700 text-lg font-bold"
                >
                  Save Purchase Order
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default PurchaseOrder;
