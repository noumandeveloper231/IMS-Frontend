// src/components/InvoiceTemplate.jsx
import React from "react";

const InvoiceTemplate = ({ sale }) => {
  const grandTotal = sale.items.reduce((acc, item) => {
    const price = item.price || item.product?.salePrice || 0;
    const qty = item.quantity || 0;
    return acc + price * qty;
  }, 0);

  return (
    <div className="p-8 font-sans text-gray-800">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">Al Ramil Al Abyad</h1>
        <p className="text-gray-600">Shop# 1, Industrial Area# 6 UAE Sharjah</p>
        <p className="text-gray-600">
          Phone: +971 54 784 6521 | Email: info@ramil.ae
        </p>
      </div>

      {/* Invoice & Customer Details */}
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-blue-600">INVOICE</h2>
          <p>Invoice No: {sale.invoiceNo}</p>
          <p>Date: {new Date(sale.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h3 className="font-semibold">Bill To:</h3>
          <p>{sale.customer?.name || "N/A"}</p>
          <p>{sale.customer?.phone || "N/A"}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="p-2 text-left">Product</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => {
            const product = item.product || {};
            const price = item.price || product.salePrice || 0;
            const qty = item.quantity || 0;
            const total = price * qty;
            return (
              <tr key={index} className={index % 2 === 0 ? "bg-gray-100" : ""}>
                <td className="p-2">{product.title || "Unknown Product"}</td>
                <td className="p-2 text-center">{qty}</td>
                <td className="p-2 text-right">${price.toFixed(2)}</td>
                <td className="p-2 text-right">${total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Grand Total */}
      <div className="text-right text-xl font-bold text-blue-600">
        Grand Total: ${grandTotal.toFixed(2)}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-600">
        Thank you for your purchase!
      </div>
    </div>
  );
};

export default InvoiceTemplate;
