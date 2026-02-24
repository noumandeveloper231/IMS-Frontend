import React, { useEffect, useState } from "react";
import axios from "axios";
import { Eye } from "lucide-react";

const PurchaseOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/purchase-orders"
        );
        setOrders(res.data);
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ✅ Filtered Orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      order.vendor?.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === "all" ? true : order.status === status;

    const orderDate = new Date(order.orderDate);
    const matchesDate =
      (!dateFrom || orderDate >= new Date(dateFrom)) &&
      (!dateTo || orderDate <= new Date(dateTo));

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-full   bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-4">
          All Purchase Orders
        </h1>

        {/* 🔍 Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 mb-6 space-y-3 md:space-y-0">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              placeholder="Order No / Vendor"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-60 border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full md:w-40 border rounded-lg px-3 py-2"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-gray-500">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left border">Order No</th>
                  <th className="px-4 py-2 text-left border">Vendor</th>
                  <th className="px-4 py-2 text-left border">Order Date</th>
                  <th className="px-4 py-2 text-left border">
                    Expected Delivery
                  </th>
                  <th className="px-4 py-2 text-left border">Status</th>
                  <th className="px-4 py-2 text-right border">Total Amount</th>
                  <th className="px-4 py-2 text-center border">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border font-medium">
                      {order.orderNo}
                    </td>
                    <td className="px-4 py-2 border">
                      {order.vendor?.name} ({order.vendor?.companyName})
                    </td>
                    <td className="px-4 py-2 border">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border">
                      {order.expectedDelivery
                        ? new Date(order.expectedDelivery).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border text-right">
                      Rs {order.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ Updated Scrollable Modal */}
{selectedOrder && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    {/* Modal Container */}
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 relative flex flex-col max-h-[90vh]">
      
      {/* Close Button */}
      <button
        onClick={() => setSelectedOrder(null)}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 transition-colors text-2xl"
        aria-label="Close"
      >
        &times;
      </button>

      {/* Header */}
      <h2 className="text-3xl font-extrabold text-indigo-700 mb-4 border-b pb-2">
        Purchase Order Details
      </h2>

      {/* Vendor Info - Static Part */}
      <div className="mb-6 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-700">
        <p>
          <strong className="font-semibold text-gray-900">Vendor:</strong> {selectedOrder.vendor?.name} (
          {selectedOrder.vendor?.companyName})
        </p>
        <p>
          <strong className="font-semibold text-gray-900">Order No:</strong> {selectedOrder.orderNo}
        </p>
        <p>
          <strong className="font-semibold text-gray-900">Date:</strong>{" "}
          {new Date(selectedOrder.orderDate).toLocaleDateString()}
        </p>
        <p>
          <strong className="font-semibold text-gray-900">Status:</strong>{" "}
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedOrder.status === 'Completed' ? 'bg-green-100 text-green-800' :
            selectedOrder.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {selectedOrder.status}
          </span>
        </p>
      </div>

      <h3 className="text-xl font-bold mb-3 text-gray-800">Order Items</h3>

      {/* Items Table Container - Scrollable Part */}
      <div className="overflow-y-auto max-h-[50vh] border rounded-lg shadow-inner">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Table Header - sticky-top ensures it stays visible while scrolling */}
            <thead className="bg-gray-50 **sticky top-0 z-10** shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASIN</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (Rs)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Rs)</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedOrder.items.map((item, idx) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-gray-900">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-gray-900">
                    {item.title || "N/A"}
                  </td>
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-gray-900">
                    {item.asin || "N/A"} 
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {item.orderedQty}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {item.purchasePrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Fallback for no items */}
          {selectedOrder.items.length === 0 && (
            <div className="p-4 text-center text-gray-500">No items found in this order.</div>
          )}
          
        </div>
      </div>
      
      {/* Footer/Summary - Static Part */}
      <div className="mt-4 pt-4 border-t flex flex-col items-end space-y-2">
  <p className="text-xl font-bold text-gray-800">
    Total Quantity:{" "}
    {selectedOrder.items
      .reduce((acc, item) => acc + item.orderedQty, 0)}
  </p>
  <p className="text-xl font-bold text-gray-800">
    Grand Total: Rs{" "}
    {selectedOrder.items
      .reduce((acc, item) => acc + item.total, 0)
      .toFixed(2)}
  </p>
</div>

      
    </div>
  </div>
)}
    </div>
  );
};

export default PurchaseOrderList;
