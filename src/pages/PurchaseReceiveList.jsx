import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // yeh add karo
import { Eye } from "lucide-react";

const PurchaseReceiveList = () => {
  const [receives, setReceives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  useEffect(() => {
    const fetchReceives = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/purchase-receives"
        );
        console.log(res.data);
        setReceives(res.data);
      } catch (err) {
        console.error("Error fetching purchase receives:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReceives();
  }, []);

  // ✅ filters
  const filteredReceives = receives.filter((rec) => {
    const searchLower = search.toLowerCase();

    const matchesSearch =
      rec.receiveNo?.toLowerCase().includes(searchLower) ||
      rec.purchaseOrder?.orderNo?.toLowerCase().includes(searchLower) ||
      rec.vendor?.name?.toLowerCase().includes(searchLower) ||
      rec.vendor?.companyName?.toLowerCase().includes(searchLower) ||
      rec.items.some(
        (item) =>
          item.product?.title?.toLowerCase().includes(searchLower) ||
          item.product?.sku?.toLowerCase().includes(searchLower)
      );

    const matchesStatus =
      statusFilter === "all" ? true : rec.status === statusFilter;

    const receiveDate = new Date(rec.receiveDate);
    const matchesDate =
      (!startDate || receiveDate >= new Date(startDate)) &&
      (!endDate || receiveDate <= new Date(endDate));

    return matchesSearch && matchesStatus && matchesDate;
  });

  // ✅ Excel Export
  const exportToExcel = () => {
    const data = filteredReceives.map((rec) => ({
      "Receive No": rec.receiveNo,
      "Purchase Order": rec.purchaseOrder?.orderNo,
      Vendor: `${rec.vendor?.name} (${rec.vendor?.companyName})`,
      "Receive Date": new Date(rec.receiveDate).toLocaleDateString(),
      Status: rec.status,
      "Total Amount": rec.totalAmount,
      Notes: rec.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Receives");

    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(fileData, `purchase_receives_${Date.now()}.xlsx`);
  };

  // ✅ PDF Export
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Purchase Receives Report", 14, 15);

    // ✅ Main Table (Summary)
    const tableColumn = [
      "Receive No",
      "Purchase Order",
      "Vendor",
      "Receive Date",
      "Status",
      "Total Amount",
    ];

    const tableRows = filteredReceives.map((rec) => [
      rec.receiveNo,
      rec.purchaseOrder?.orderNo || "-",
      `${rec.vendor?.name || ""} (${rec.vendor?.companyName || ""})`,
      new Date(rec.receiveDate).toLocaleDateString(),
      rec.status,
      `Rs ${rec.totalAmount}`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 116, 166] },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.text(
          `Generated on: ${new Date().toLocaleDateString()}`,
          14,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // ✅ Items Table (per receive)
    let finalY = doc.lastAutoTable.finalY + 10; // jahan summary khatam hui
    filteredReceives.forEach((rec, index) => {
      doc.setFontSize(12);
      doc.text(`Receive No: ${rec.receiveNo}`, 14, finalY);

      const itemCols = [
        "Product",
        "SKU",
        "Ordered Qty",
        "Received Qty",
        "Price",
        "Total",
      ];

      const itemRows = rec.items.map((item) => [
        item.product?.title || "N/A",
        item.product?.sku || "N/A",
        item.orderedQty,
        item.receivedQty,
        `Rs ${item.purchasePrice}`,
        `Rs ${item.total}`,
      ]);

      autoTable(doc, {
        head: [itemCols],
        body: itemRows,
        startY: finalY + 5,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [230, 126, 34] },
      });

      finalY = doc.lastAutoTable.finalY + 10;

      // ✅ Agar page overflow ho jaye to naya page add karo
      if (
        index !== filteredReceives.length - 1 &&
        finalY > doc.internal.pageSize.height - 40
      ) {
        doc.addPage();
        finalY = 20;
      }
    });

    doc.save(`purchase_receives_${Date.now()}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-full   bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900 border-b pb-2">
            All Purchase Receives
          </h1>

          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
            >
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* 🔍 Search, Status & Date Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by Receive No, Vendor, Product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-1/3"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full md:w-1/4"
          >
            <option value="all">All Status</option>
            <option value="partially">Partially</option>
            <option value="completed">Completed</option>
          </select>

          <div className="flex gap-2 w-full md:w-1/3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 w-1/2"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 w-1/2"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading receives...</p>
        ) : filteredReceives.length === 0 ? (
          <p className="text-gray-500">No purchase receives found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left border">Receive No</th>
                  <th className="px-4 py-2 text-left border">Purchase Order</th>
                  <th className="px-4 py-2 text-left border">Vendor</th>
                  <th className="px-4 py-2 text-left border">Receive Date</th>
                  <th className="px-4 py-2 text-left border">Status</th>
                  <th className="px-4 py-2 text-right border">Total Amount</th>
                  <th className="px-4 py-2 text-left border">Items</th>
                  <th className="px-4 py-2 text-left border">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceives.map((rec) => (
                  <tr key={rec._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border font-medium">
                      {rec.receiveNo}
                    </td>
                    <td className="px-4 py-2 border">
                      {rec.purchaseOrder?.orderNo}
                    </td>
                    <td className="px-4 py-2 border">
                      {rec.vendor?.name} ({rec.vendor?.companyName})
                    </td>
                    <td className="px-4 py-2 border">
                      {new Date(rec.receiveDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          rec.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border text-right">
                      Rs {rec.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <button
                        onClick={() => setSelectedOrder(rec)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                    
                    <td className="px-4 py-2 border">{rec.notes || "-"}</td>
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
      All Purchase Receives
      </h2>

      {/* Vendor Info - Static Part */}
      <div className="mb-6 grid grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-700">
        <p>
          <strong className="font-semibold text-gray-900">Vendor:</strong> {selectedOrder.vendor?.name} (
          {selectedOrder.vendor?.companyName})
        </p>
        <p>
          <strong className="font-semibold text-gray-900">Order No:</strong> {selectedOrder.purchaseOrder?.orderNo}
        </p>
        <p>
          <strong className="font-semibold text-gray-900">Date:</strong>{" "}
          {new Date(selectedOrder.receiveDate).toLocaleDateString()}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASIN</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (Rs)</th>
              </tr>
            </thead>
            {/* Table Body */}
            
            <tbody className="bg-white divide-y divide-gray-200">
              {selectedOrder.items.map((item) => (
                
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-gray-900">
                    {item.product?.title || "N/A"}
                  </td>
                  <td className="px-6 py-3 whitespace-normal text-sm font-medium text-gray-900">
                    {item.product?.asin || "N/A"} 
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {item.receivedQty}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {item.purchasePrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {item.product?.salePrice.toFixed(2)}
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
          {selectedOrder.items.reduce((acc, item) => acc + item.orderedQty, 0)}
        </p>
        <p className="text-xl font-bold text-gray-800">
          Grand Total: Rs{" "}
          {selectedOrder.items.reduce((acc, item) => acc + item.total, 0).toFixed(2)}
        </p>
      </div>
      
    </div>
  </div>
)}
  </div>
  );

}


export default PurchaseReceiveList;

{/* <td className="px-4 py-2 border">
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {rec.items.map((item) => (
                          <li key={item._id}>
                            {item.product?.title || "N/A"} (SKU:{" "}
                            {item.product?.sku || "N/A"}) <br />
                            Ordered: {item.orderedQty}, Received:{" "}
                            {item.receivedQty} <br />
                            Price: Rs {item.purchasePrice} | Total: Rs{" "}
                            {item.total}
                          </li>
                        ))}
                      </ul>
                    </td> */}