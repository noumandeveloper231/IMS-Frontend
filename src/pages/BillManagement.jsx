import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Field, FieldLabel } from "@/components/UI/field";
import { Combobox } from "@/components/UI/combobox";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";


const BillCreate = () => {
  const [vendors, setVendors] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedReceive, setSelectedReceive] = useState("");
  const [billItems, setBillItems] = useState([]);
  const [total, setTotal] = useState(0);

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/vendors/getall");
      const data = res.data;
      return data?.vendors ?? data ?? [];
    },
  });

  // 🔹 Vendor change → us vendor ke receives fetch
  const handleVendorChange = async (vendorId) => {
    setSelectedVendor(vendorId);
    setSelectedReceive("");
    setBillItems([]);
    setTotal(0);

    if (vendorId) {
      const res = await api.get(
        `/purchase-receives/by-vendor/${vendorId}`
      );
      const data = res.data;
      console.log("data", data);
      setVendorOrders(data?.purchaseReceives ?? data ?? []);
    }
  };

  // 🔹 Receive select → items bill me load karo
  const handleReceiveChange = async (receiveId) => {
    setSelectedReceive(receiveId);

    console.log("vendorOrders", vendorOrders);

    const receive = vendorOrders?.find((r) => r._id === receiveId);
    if (receive) {
      const items = receive.items.map((i) => ({
        productName: i.product?.title || "N/A",
        description: i.product?.description || "-",
        quantity: i.receivedQty,
        unitPrice: i.purchasePrice,
        total: i.receivedQty * i.purchasePrice,
      }));
      setBillItems(items);
      setTotal(items.reduce((acc, item) => acc + item.total, 0));
    }
  };


  // 🔹 Invoice Download
  const downloadInvoice = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Invoice", 14, 15);

    // Vendor Info
    const vendor = vendors.find((v) => v._id === selectedVendor);
    if (vendor) {
      doc.setFontSize(10);
      doc.text(`Vendor: ${vendor.name}`, 14, 25);
    }

    // Table data
    const tableData = billItems.map((item) => [
      item.productName,
      item.description,
      item.quantity,
      item.unitPrice,
      item.total,
    ]);

    // ✅ Use autoTable like this
    autoTable(doc, {
      startY: 35,
      head: [["Product", "Description", "Qty", "Unit Price", "Total"]],
      body: tableData,
    });

    // ✅ Safe finalY access
    const finalY = doc.lastAutoTable?.finalY || 40;
    doc.text(`Grand Total: ${total}`, 14, finalY + 10);

    doc.save("invoice.pdf");
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">
          Create Bill
        </h2>

        {/* Vendor Select */}
        <div className="mb-4">
          <Field>
            <FieldLabel className="block mb-1 font-medium">Select Vendor</FieldLabel>
            <Combobox
              options={vendorsData?.map((v) => ({
                label: v.name,
                value: v._id,
              }))}
              value={selectedVendor?._id}
              onChange={(value) => handleVendorChange(value)}
              className="w-full"
              placeholder="Select Vendor"
            />
          </Field>
        </div>

        {/* Purchase Receive Select */}
        {selectedVendor && (
          <div className="mb-4">
            <Field>
              <FieldLabel>
                Select Purchase Receive
              </FieldLabel>
              <Combobox
                options={vendorOrders?.map((r) => ({
                  label: `${r.purchaseOrder?.orderNo || "PO"} - ${new Date(r.receiveDate).toLocaleDateString()}`,
                  value: r._id,
                }))}
                value={selectedReceive?._id}
                onChange={(value) => handleReceiveChange(value)}
                className="w-full"
                placeholder="Select Purchase Receive"
              />
            </Field>
          </div>
        )}

        {/* Bill Table */}
        {billItems.length > 0 && (
          <div className="mt-6">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Product</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Qty</th>
                  <th className="border p-2">Unit Price</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {billItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border p-2">{item.productName}</td>
                    <td className="border p-2">{item.description}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2">{item.unitPrice}</td>
                    <td className="border p-2">{item.total}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="border p-2 text-right" colSpan="4">
                    Grand Total
                  </td>
                  <td className="border p-2">{total}</td>
                </tr>
              </tbody>
            </table>

            {/* Invoice Download Button */}
            <div className="mt-6 text-right">
              <button
                onClick={downloadInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md"
              >
                Download Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillCreate;