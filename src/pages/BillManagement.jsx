import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Field, FieldLabel } from "@/components/UI/field";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem, SelectLabel } from "@/components/UI/select";
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
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function VendorCombobox({
  vendors = [],
  value,
  onChange,
  placeholder = "Select Vendor",
}) {
  const [open, setOpen] = useState(false);
  const selected = vendors.find((v) => v._id === value) ?? null;
  const displayLabel = selected ? selected.name : placeholder;

  const handleSelect = (vendor) => {
    onChange(vendor._id);
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
          <CommandInput placeholder="Search vendor..." />
          <CommandList>
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {vendors.map((v) => (
                <CommandItem
                  key={v._id}
                  value={v.name}
                  onSelect={() => handleSelect(v)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === v._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {v.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const BillCreate = () => {
  const [vendors, setVendors] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedReceive, setSelectedReceive] = useState("");
  const [billItems, setBillItems] = useState([]);
  const [total, setTotal] = useState(0);

  // 🔹 Vendors fetch
  useEffect(() => {
    const fetchVendors = async () => {
      const res = await fetch("http://localhost:5000/api/vendors/getall");
      const data = await res.json();
      setVendors(data);
    };
    fetchVendors();
  }, []);

  // 🔹 Vendor change → us vendor ke receives fetch
  const handleVendorChange = async (vendorId) => {
    setSelectedVendor(vendorId);
    setSelectedReceive("");
    setBillItems([]);
    setTotal(0);

    if (vendorId) {
      const res = await fetch(
        `http://localhost:5000/api/purchase-receives/by-vendor/${vendorId}`
      );
      const data = await res.json();
      setVendorOrders(data);
    } else {
      setVendorOrders([]);
    }
  };


  // 🔹 Receive select → items bill me load karo
  const handleReceiveChange = (e) => {
    const receiveId = e.target.value;
    setSelectedReceive(receiveId);

    const receive = vendorOrders.find((r) => r._id === receiveId);
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
    <div className="p-4 md:p-6 lg:p-8 max-w-full bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-md shadow-md p-6 md:p-8">
        <h2 className="text-xl font-bold mb-4">Create Bill</h2>

        {/* Vendor Select */}
        <div className="mb-4">
            <Field>
              <FieldLabel className="block mb-1 font-medium">Select Vendor</FieldLabel>
              <VendorCombobox
                vendors={vendors}
                value={selectedVendor}
                onChange={handleVendorChange}
                placeholder="Select Vendor"
              />
            </Field>
        </div>

        {/* Purchase Receive Select */}
        {selectedVendor && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">
              Select Purchase Receive
            </label>
            <select
              value={selectedReceive}
              onChange={handleReceiveChange}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Select Receive --</option>
              {vendorOrders.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.purchaseOrder?.orderNo || "PO"} -{" "}
                  {new Date(r.receiveDate).toLocaleDateString()}
                </option>
              ))}
            </select>
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

// import React, { useEffect, useState } from "react";

// const BillCreate = () => {
//   const [vendors, setVendors] = useState([]);
//   const [vendorOrders, setVendorOrders] = useState([]); // ab ye receives honge
//   const [selectedVendor, setSelectedVendor] = useState("");
//   const [selectedReceive, setSelectedReceive] = useState("");
//   const [billItems, setBillItems] = useState([]);
//   const [total, setTotal] = useState(0);

//   // 🔹 Vendors fetch
//   useEffect(() => {
//     const fetchVendors = async () => {
//       const res = await fetch("http://localhost:5000/api/vendors/getall");
//       const data = await res.json();
//       setVendors(data);
//     };
//     fetchVendors();
//   }, []);

//   // 🔹 Vendor change → us vendor ke receives fetch
//   const handleVendorChange = async (e) => {
//     const vendorId = e.target.value;
//     setSelectedVendor(vendorId);
//     setSelectedReceive("");
//     setBillItems([]);
//     setTotal(0);

//     if (vendorId) {
//       const res = await fetch(
//         `http://localhost:5000/api/purchase-receives/by-vendor/${vendorId}`
//       );
//       const data = await res.json();
//       setVendorOrders(data);
//     } else {
//       setVendorOrders([]);
//     }
//   };

//   // 🔹 Receive select → items bill me load karo
//   const handleReceiveChange = (e) => {
//     const receiveId = e.target.value;
//     setSelectedReceive(receiveId);

//     const receive = vendorOrders.find((r) => r._id === receiveId);
//     if (receive) {
//       const items = receive.items.map((i) => ({
//         description: i.product?.name || "",
//         quantity: i.receivedQty,
//         unitPrice: i.purchasePrice,
//         total: i.receivedQty * i.purchasePrice,
//       }));
//       setBillItems(items);
//       setTotal(items.reduce((acc, item) => acc + item.total, 0));
//     }
//   };

//   return (
//     <div className="p-4 md:p-8 lg:p-12 max-w-full ml-16 md:ml-52 bg-gray-50 min-h-screen">
//       <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
//         <h2 className="text-xl font-bold mb-4">Create Bill</h2>

//         {/* Vendor Select */}
//         <div className="mb-4">
//           <label className="block mb-1 font-medium">Select Vendor</label>
//           <select
//             value={selectedVendor}
//             onChange={handleVendorChange}
//             className="border p-2 rounded w-full"
//           >
//             <option value="">-- Select Vendor --</option>
//             {vendors.map((v) => (
//               <option key={v._id} value={v._id}>
//                 {v.name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Purchase Receive Select */}
//         {selectedVendor && (
//           <div className="mb-4">
//             <label className="block mb-1 font-medium">
//               Select Purchase Receive
//             </label>
//             <select
//               value={selectedReceive}
//               onChange={handleReceiveChange}
//               className="border p-2 rounded w-full"
//             >
//               <option value="">-- Select Receive --</option>
//               {vendorOrders.map((r) => (
//                 <option key={r._id} value={r._id}>
//                   {r.purchaseOrder?.orderNo || "PO"} -{" "}
//                   {new Date(r.date).toLocaleDateString()}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {/* Bill Table */}
//         {billItems.length > 0 && (
//           <div className="mt-6">
//             <table className="w-full border-collapse border">
//               <thead>
//                 <tr className="bg-gray-200">
//                   <th className="border p-2">Description</th>
//                   <th className="border p-2">Qty</th>
//                   <th className="border p-2">Unit Price</th>
//                   <th className="border p-2">Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {billItems.map((item, idx) => (
//                   <tr key={idx}>
//                     <td className="border p-2">{item.description}</td>
//                     <td className="border p-2">{item.quantity}</td>
//                     <td className="border p-2">{item.unitPrice}</td>
//                     <td className="border p-2">{item.total}</td>
//                   </tr>
//                 ))}
//                 <tr className="font-bold bg-gray-100">
//                   <td className="border p-2 text-right" colSpan="3">
//                     Grand Total
//                   </td>
//                   <td className="border p-2">{total}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default BillCreate;

// import React, { useEffect, useState } from "react";

// const BillCreate = () => {
//   const [vendors, setVendors] = useState([]);
//   const [vendorOrders, setVendorOrders] = useState([]);
//   const [selectedVendor, setSelectedVendor] = useState("");
//   const [selectedPO, setSelectedPO] = useState("");
//   const [billItems, setBillItems] = useState([]);
//   const [subTotal, setSubTotal] = useState(0);
//   const [tax, setTax] = useState(0);
//   const [notes, setNotes] = useState("");

//   // ✅ Vendors fetch
//   useEffect(() => {
//     const fetchVendors = async () => {
//       const res = await fetch("http://localhost:5000/api/vendors/getall");
//       const data = await res.json();
//       setVendors(data);
//     };
//     fetchVendors();
//   }, []);

//   // ✅ Vendor change → Receives fetch
//   const handleVendorChange = async (e) => {
//     const vendorId = e.target.value;
//     setSelectedVendor(vendorId);
//     setSelectedPO("");
//     setBillItems([]);

//     if (vendorId) {
//       const res = await fetch(
//         `http://localhost:5000/api/purchase-receives/by-vendor/${vendorId}`
//       );
//       const data = await res.json();
//       setVendorOrders(data); // ab ye actually "receives" hain
//     } else {
//       setVendorOrders([]);
//     }
//   };

//   // ✅ Receive select → items bill me dalo
//   const handlePOChange = (e) => {
//     const receiveId = e.target.value;
//     setSelectedPO(receiveId);
//     const receive = vendorOrders.find((r) => r._id === receiveId);

//     if (receive) {
//       const items = receive.items.map((i) => ({
//         description: i.product.name,
//         quantity: i.receivedQty,
//         unitPrice: i.purchasePrice,
//         total: i.receivedQty * i.purchasePrice,
//       }));
//       setBillItems(items);
//     }
//   };

//   // ✅ Subtotal calculate
//   useEffect(() => {
//     const total = billItems.reduce((acc, i) => acc + i.total, 0);
//     setSubTotal(total);
//   }, [billItems]);

//   // ✅ Submit Bill
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const billData = {
//       vendor: selectedVendor,
//       purchaseOrder: selectedPO,
//       items: billItems,
//       subTotal,
//       tax,
//       totalAmount: subTotal + Number(tax),
//       notes,
//     };

//     const res = await fetch("http://localhost:5000/api/bills", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(billData),
//     });

//     if (res.ok) {
//       alert("✅ Bill created successfully!");
//       setSelectedVendor("");
//       setSelectedPO("");
//       setBillItems([]);
//       setSubTotal(0);
//       setTax(0);
//       setNotes("");
//     } else {
//       alert("❌ Error creating bill");
//     }
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded">
//       <h2 className="text-xl font-bold mb-4">Create Bill</h2>

//       {/* Vendor */}
//       <label className="block mb-2 font-medium">Select Vendor</label>
//       <select
//         value={selectedVendor}
//         onChange={handleVendorChange}
//         className="border p-2 rounded w-full mb-4"
//       >
//         <option value="">-- Select Vendor --</option>
//         {vendors.map((v) => (
//           <option key={v._id} value={v._id}>
//             {v.name}
//           </option>
//         ))}
//       </select>

//       {/* Purchase Orders */}
//       {vendorOrders.length > 0 && (
//         <>
//           <label className="block mb-2 font-medium">
//             Select Purchase Order
//           </label>
//           <select
//             value={selectedPO}
//             onChange={handlePOChange}
//             className="border p-2 rounded w-full mb-4"
//           >
//             <option value="">-- Select PO --</option>
//             {vendorOrders.map((po) => (
//               <option key={po._id} value={po._id}>
//                 {po.orderNo}
//               </option>
//             ))}
//           </select>
//         </>
//       )}

//       {/* Items Table */}
//       {billItems.length > 0 && (
//         <table className="w-full border mb-4">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="p-2 border">Description</th>
//               <th className="p-2 border">Qty</th>
//               <th className="p-2 border">Unit Price</th>
//               <th className="p-2 border">Total</th>
//             </tr>
//           </thead>
//           <tbody>
//             {billItems.map((item, idx) => (
//               <tr key={idx}>
//                 <td className="p-2 border">{item.description}</td>
//                 <td className="p-2 border">{item.quantity}</td>
//                 <td className="p-2 border">{item.unitPrice}</td>
//                 <td className="p-2 border">{item.total}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//       {/* Totals */}
//       <div className="flex justify-end gap-4 mb-4">
//         <div>
//           <p>Subtotal: {subTotal}</p>
//           <p>
//             Tax:{" "}
//             <input
//               type="number"
//               value={tax}
//               onChange={(e) => setTax(Number(e.target.value))}
//               className="border p-1 w-20"
//             />
//           </p>
//           <p className="font-bold">Total: {subTotal + Number(tax)}</p>
//         </div>
//       </div>

//       {/* Notes */}
//       <textarea
//         placeholder="Notes..."
//         value={notes}
//         onChange={(e) => setNotes(e.target.value)}
//         className="border p-2 w-full mb-4"
//       />

//       {/* Submit */}
//       <button
//         onClick={handleSubmit}
//         className="bg-blue-600 text-white px-4 py-2 rounded"
//       >
//         Save Bill
//       </button>
//     </div>
//   );
// };

// export default BillCreate;

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// const BillManagement = () => {
//   const [bills, setBills] = useState([]);
//   const [vendors, setVendors] = useState([]);
//   const [purchaseOrders, setPurchaseOrders] = useState([]);

//   const [formData, setFormData] = useState({
//     vendor: "",
//     purchaseOrder: "",
//     billDate: new Date().toISOString().split("T")[0],
//     dueDate: "",
//     items: [{ description: "", quantity: 0, unitPrice: 0, total: 0 }],
//     subTotal: 0,
//     tax: 0,
//     totalAmount: 0,
//     notes: "",
//   });

//   // 🔹 Fetch Bills + Vendors + POs
//   useEffect(() => {
//     fetchBills();
//     fetchVendors();
//     fetchPOs();
//   }, []);

//   const fetchBills = async () => {
//     const res = await axios.get("http://localhost:5000/api/bills");
//     setBills(res.data);
//   };

//   const fetchVendors = async () => {
//     const res = await axios.get("http://localhost:5000/api/vendors/getall");
//     setVendors(res.data);
//   };

//   const fetchPOs = async () => {
//     const res = await axios.get("http://localhost:5000/api/purchase-orders");
//     setPurchaseOrders(res.data);
//   };

//   // 🔹 Handle Item Change
//   const handleItemChange = (index, field, value) => {
//     const newItems = [...formData.items];
//     newItems[index][field] = value;

//     if (field === "quantity" || field === "unitPrice") {
//       newItems[index].total =
//         (Number(newItems[index].quantity) || 0) *
//         (Number(newItems[index].unitPrice) || 0);
//     }

//     const subTotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);

//     setFormData({
//       ...formData,
//       items: newItems,
//       subTotal,
//       totalAmount: subTotal + Number(formData.tax),
//     });
//   };

//   const addItemRow = () => {
//     setFormData({
//       ...formData,
//       items: [
//         ...formData.items,
//         { description: "", quantity: 0, unitPrice: 0, total: 0 },
//       ],
//     });
//   };

//   // 🔹 Submit Bill
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post("http://localhost:5000/api/bills", formData);
//       alert("✅ Bill Created!");
//       fetchBills();
//       setFormData({
//         vendor: "",
//         purchaseOrder: "",
//         billDate: new Date().toISOString().split("T")[0],
//         dueDate: "",
//         items: [{ description: "", quantity: 0, unitPrice: 0, total: 0 }],
//         subTotal: 0,
//         tax: 0,
//         totalAmount: 0,
//         notes: "",
//       });
//     } catch (err) {
//       console.error("Error creating bill:", err);
//       alert("❌ Failed to create bill");
//     }
//   };

//   const handleDownloadPDF = (bill) => {
//     const doc = new jsPDF();

//     doc.text("Bill Invoice", 14, 10);
//     doc.text(`Vendor: ${bill.vendor?.name}`, 14, 20);
//     doc.text(
//       `Bill Date: ${new Date(bill.billDate).toLocaleDateString()}`,
//       14,
//       30
//     );
//     doc.text(`Total Amount: ${bill.totalAmount}`, 14, 40);

//     const tableData = bill.items.map((item) => [
//       item.description,
//       item.quantity,
//       item.unitPrice,
//       item.total,
//     ]);

//     // ✅ autoTable ko direct call karo
//     autoTable(doc, {
//       startY: 65,
//       head: [["Description", "Qty", "Unit Price", "Total"]],
//       body: tableData,
//     });

//     doc.save(`Bill-${bill._id}.pdf`);
//   };

//   // 🔹 Download PDF
//   // const downloadPDF = (bill) => {
//   //   const doc = new jsPDF();

//   //   doc.setFontSize(16);
//   //   doc.text("INVOICE / BILL", 14, 20);

//   //   doc.setFontSize(12);
//   //   doc.text(`Vendor: ${bill.vendor?.name || ""}`, 14, 35);
//   //   doc.text(`PO: ${bill.purchaseOrder?.poNo || "-"}`, 14, 42);
//   //   doc.text(`Date: ${new Date(bill.billDate).toLocaleDateString()}`, 14, 49);
//   //   doc.text(`Status: ${bill.status}`, 14, 56);

//   //   const tableData = bill.items.map((item) => [
//   //     item.description,
//   //     item.quantity,
//   //     item.unitPrice,
//   //     item.total,
//   //   ]);

//   //   doc.autoTable({
//   //     startY: 65,
//   //     head: [["Description", "Qty", "Unit Price", "Total"]],
//   //     body: tableData,
//   //   });

//   //   let finalY = doc.lastAutoTable.finalY || 70;
//   //   doc.text(`Subtotal: ${bill.subTotal}`, 14, finalY + 10);
//   //   doc.text(`Tax: ${bill.tax}`, 14, finalY + 16);
//   //   doc.text(`Total Amount: ${bill.totalAmount}`, 14, finalY + 22);

//   //   if (bill.notes) {
//   //     doc.text(`Notes: ${bill.notes}`, 14, finalY + 32);
//   //   }

//   //   doc.save(`Bill_${bill._id}.pdf`);
//   // };

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h2 className="text-2xl font-bold mb-4">📑 Bill Management</h2>

//       {/* 🔹 Bill Form */}
//       <form onSubmit={handleSubmit} className="mb-8">
//         {/* Vendor & PO */}
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div>
//             <label className="block mb-1 font-semibold">Vendor</label>
//             <select
//               className="w-full border p-2 rounded"
//               value={formData.vendor}
//               onChange={(e) =>
//                 setFormData({ ...formData, vendor: e.target.value })
//               }
//             >
//               <option value="">-- Select Vendor --</option>
//               {vendors.map((v) => (
//                 <option key={v._id} value={v._id}>
//                   {v.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block mb-1 font-semibold">Purchase Order</label>
//             <select
//               className="w-full border p-2 rounded"
//               value={formData.purchaseOrder}
//               onChange={(e) =>
//                 setFormData({ ...formData, purchaseOrder: e.target.value })
//               }
//             >
//               <option value="">-- Select PO --</option>
//               {purchaseOrders.map((po) => (
//                 <option key={po._id} value={po._id}>
//                   {po.poNo}
//                   {console.log("PO Item:", po)}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* Items */}
//         <h3 className="font-semibold mt-4 mb-2">Bill Items</h3>
//         <table className="w-full border mb-3">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="p-2 border">Description</th>
//               <th className="p-2 border">Qty</th>
//               <th className="p-2 border">Unit Price</th>
//               <th className="p-2 border">Total</th>
//             </tr>
//           </thead>
//           <tbody>
//             {formData.items.map((item, idx) => (
//               <tr key={idx}>
//                 <td className="p-2 border">
//                   <input
//                     type="text"
//                     className="w-full border p-1 rounded"
//                     value={item.description}
//                     onChange={(e) =>
//                       handleItemChange(idx, "description", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">
//                   <input
//                     type="number"
//                     className="w-full border p-1 rounded"
//                     value={item.quantity}
//                     onChange={(e) =>
//                       handleItemChange(idx, "quantity", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">
//                   <input
//                     type="number"
//                     className="w-full border p-1 rounded"
//                     value={item.unitPrice}
//                     onChange={(e) =>
//                       handleItemChange(idx, "unitPrice", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">{item.total}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         <button
//           type="button"
//           onClick={addItemRow}
//           className="bg-gray-600 text-white px-3 py-1 rounded"
//         >
//           + Add Item
//         </button>

//         {/* Totals */}
//         <div className="mt-4">
//           <div className="flex justify-between">
//             <span>Subtotal:</span>
//             <span>{formData.subTotal}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Tax:</span>
//             <input
//               type="number"
//               value={formData.tax}
//               onChange={(e) =>
//                 setFormData({
//                   ...formData,
//                   tax: Number(e.target.value),
//                   totalAmount: formData.subTotal + Number(e.target.value),
//                 })
//               }
//               className="border p-1 rounded w-20"
//             />
//           </div>
//           <div className="flex justify-between font-bold">
//             <span>Total:</span>
//             <span>{formData.totalAmount}</span>
//           </div>
//         </div>

//         <button
//           type="submit"
//           className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//         >
//           Save Bill
//         </button>
//       </form>

//       {/* 🔹 Bills List */}
//       <h3 className="text-xl font-bold mb-2">📋 All Bills</h3>
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Vendor</th>
//             <th className="p-2 border">PO</th>
//             <th className="p-2 border">Total</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Date</th>
//             <th className="p-2 border">Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bills.map((bill) => (
//             <tr key={bill._id}>
//               <td className="p-2 border">{bill.vendor?.name}</td>
//               <td className="p-2 border">{bill.purchaseOrder?.poNo}</td>
//               <td className="p-2 border">{bill.totalAmount}</td>
//               <td className="p-2 border">{bill.status}</td>
//               <td className="p-2 border">
//                 {new Date(bill.billDate).toLocaleDateString()}
//               </td>
//               <td className="p-2 border">
//                 <button
//                   onClick={() => handleDownloadPDF(bill)}
//                   className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
//                 >
//                   Download PDF
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default BillManagement;

// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const BillManagement = () => {
//   const [bills, setBills] = useState([]);
//   const [vendors, setVendors] = useState([]);
//   const [purchaseOrders, setPurchaseOrders] = useState([]);

//   const [formData, setFormData] = useState({
//     vendor: "",
//     purchaseOrder: "",
//     billDate: new Date().toISOString().split("T")[0],
//     dueDate: "",
//     items: [{ description: "", quantity: 0, unitPrice: 0, total: 0 }],
//     subTotal: 0,
//     tax: 0,
//     totalAmount: 0,
//     notes: "",
//   });

//   // 🔹 Fetch Bills + Vendors + Purchase Orders
//   useEffect(() => {
//     fetchBills();
//     fetchVendors();
//     fetchPOs();
//   }, []);

//   const fetchBills = async () => {
//     const res = await axios.get("http://localhost:5000/api/bills");
//     setBills(res.data);
//   };

//   const fetchVendors = async () => {
//     const res = await axios.get("http://localhost:5000/api/vendors/getall");
//     setVendors(res.data);
//   };

//   const fetchPOs = async () => {
//     const res = await axios.get("http://localhost:5000/api/purchase-orders");
//     setPurchaseOrders(res.data);
//   };

//   console.log("Vendors:", vendors);
//   console.log("Purchase Orders:", purchaseOrders);

//   // 🔹 Handle Item Change
//   const handleItemChange = (index, field, value) => {
//     const newItems = [...formData.items];
//     newItems[index][field] = value;

//     // calculate total for that row
//     if (field === "quantity" || field === "unitPrice") {
//       newItems[index].total =
//         (Number(newItems[index].quantity) || 0) *
//         (Number(newItems[index].unitPrice) || 0);
//     }

//     // calculate subtotal
//     const subTotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);

//     setFormData({
//       ...formData,
//       items: newItems,
//       subTotal,
//       totalAmount: subTotal + Number(formData.tax),
//     });
//   };

//   const addItemRow = () => {
//     setFormData({
//       ...formData,
//       items: [
//         ...formData.items,
//         { description: "", quantity: 0, unitPrice: 0, total: 0 },
//       ],
//     });
//   };

//   // 🔹 Submit Bill
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post("http://localhost:5000/api/bills", formData);
//       alert("✅ Bill Created!");
//       fetchBills();
//       // reset
//       setFormData({
//         vendor: "",
//         purchaseOrder: "",
//         billDate: new Date().toISOString().split("T")[0],
//         dueDate: "",
//         items: [{ description: "", quantity: 0, unitPrice: 0, total: 0 }],
//         subTotal: 0,
//         tax: 0,
//         totalAmount: 0,
//         notes: "",
//       });
//     } catch (err) {
//       console.error("Error creating bill:", err);
//       alert("❌ Failed to create bill");
//     }
//   };

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h2 className="text-2xl font-bold mb-4">📑 Bill Management</h2>

//       {/* Bill Form */}
//       <form onSubmit={handleSubmit} className="mb-8">
//         <div className="grid grid-cols-2 gap-4 mb-4">
//           <div>
//             <label className="block mb-1 font-semibold">Vendor</label>
//             <select
//               className="w-full border p-2 rounded"
//               value={formData.vendor}
//               onChange={(e) =>
//                 setFormData({ ...formData, vendor: e.target.value })
//               }
//             >
//               <option value="">-- Select Vendor --</option>
//               {vendors.map((v) => (
//                 <option key={v._id} value={v._id}>
//                   {v.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block mb-1 font-semibold">Purchase Order</label>
//             <select
//               className="w-full border p-2 rounded"
//               value={formData.purchaseOrder}
//               onChange={(e) =>
//                 setFormData({ ...formData, purchaseOrder: e.target.value })
//               }
//             >
//               <option value="">-- Select PO --</option>
//               {purchaseOrders.map((po) => (
//                 <option key={po._id} value={po._id}>
//                   {po.poNo}
//                   {console.log("PO Item:", po)}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* Items */}
//         <h3 className="font-semibold mt-4 mb-2">Bill Items</h3>
//         <table className="w-full border mb-3">
//           <thead>
//             <tr className="bg-gray-100">
//               <th className="p-2 border">Description</th>
//               <th className="p-2 border">Qty</th>
//               <th className="p-2 border">Unit Price</th>
//               <th className="p-2 border">Total</th>
//             </tr>
//           </thead>
//           <tbody>
//             {formData.items.map((item, idx) => (
//               <tr key={idx}>
//                 <td className="p-2 border">
//                   <input
//                     type="text"
//                     className="w-full border p-1 rounded"
//                     value={item.description}
//                     onChange={(e) =>
//                       handleItemChange(idx, "description", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">
//                   <input
//                     type="number"
//                     className="w-full border p-1 rounded"
//                     value={item.quantity}
//                     onChange={(e) =>
//                       handleItemChange(idx, "quantity", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">
//                   <input
//                     type="number"
//                     className="w-full border p-1 rounded"
//                     value={item.unitPrice}
//                     onChange={(e) =>
//                       handleItemChange(idx, "unitPrice", e.target.value)
//                     }
//                   />
//                 </td>
//                 <td className="p-2 border">{item.total}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         <button
//           type="button"
//           onClick={addItemRow}
//           className="bg-gray-600 text-white px-3 py-1 rounded"
//         >
//           + Add Item
//         </button>

//         {/* Totals */}
//         <div className="mt-4">
//           <div className="flex justify-between">
//             <span>Subtotal:</span>
//             <span>{formData.subTotal}</span>
//           </div>
//           <div className="flex justify-between">
//             <span>Tax:</span>
//             <input
//               type="number"
//               value={formData.tax}
//               onChange={(e) =>
//                 setFormData({
//                   ...formData,
//                   tax: Number(e.target.value),
//                   totalAmount: formData.subTotal + Number(e.target.value),
//                 })
//               }
//               className="border p-1 rounded w-20"
//             />
//           </div>
//           <div className="flex justify-between font-bold">
//             <span>Total:</span>
//             <span>{formData.totalAmount}</span>
//           </div>
//         </div>

//         {/* Notes */}
//         <div className="mt-3">
//           <label className="block mb-1 font-semibold">Notes</label>
//           <input
//             type="text"
//             value={formData.notes}
//             onChange={(e) =>
//               setFormData({ ...formData, notes: e.target.value })
//             }
//             className="w-full border p-2 rounded"
//           />
//         </div>

//         <button
//           type="submit"
//           className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
//         >
//           Save Bill
//         </button>
//       </form>

//       {/* Bills List */}
//       <h3 className="text-xl font-bold mb-2">📋 All Bills</h3>
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Vendor</th>
//             <th className="p-2 border">PO</th>
//             <th className="p-2 border">Total</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Date</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bills.map((bill) => (
//             <tr key={bill._id}>
//               <td className="p-2 border">{bill.vendor?.name}</td>
//               <td className="p-2 border">{bill.purchaseOrder?.poNo}</td>
//               <td className="p-2 border">{bill.totalAmount}</td>
//               <td className="p-2 border">{bill.status}</td>
//               <td className="p-2 border">
//                 {new Date(bill.billDate).toLocaleDateString()}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default BillManagement;
