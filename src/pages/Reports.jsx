import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";
import api from "../utils/api";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [period, setPeriod] = useState("month");
  const [salesReport, setSalesReport] = useState(null);
  const [plReport, setPlReport] = useState(null);
  const [invReport, setInvReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/sales", { params: { period } });
      setSalesReport(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPLReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/profit-loss");
      setPlReport(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvReport = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/inventory");
      setInvReport(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "sales") fetchSalesReport();
    else if (activeTab === "pl") fetchPLReport();
    else if (activeTab === "inventory") fetchInvReport();
  }, [activeTab, period]);

  return (
    <div className="min-h-screen bg-gray-100 p-8 max-w-full  ">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Reports</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "sales" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setActiveTab("pl")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "pl" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === "inventory" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
            }`}
          >
            Inventory
          </button>
        </div>

        {activeTab === "sales" && (
          <div className="mb-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "sales" && salesReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-10 h-10 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Sales</p>
                        <p className="text-2xl font-bold">AED {salesReport.summary?.totalSales?.toFixed(2) || "0.00"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-10 h-10 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Profit</p>
                        <p className="text-2xl font-bold">AED {salesReport.summary?.totalProfit?.toFixed(2) || "0.00"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <p className="text-sm text-gray-500">COGS</p>
                    <p className="text-2xl font-bold">AED {salesReport.summary?.totalCOGS?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <p className="text-sm text-gray-500">Transactions</p>
                    <p className="text-2xl font-bold">{salesReport.summary?.count || 0}</p>
                  </div>
                </div>
                {salesReport.byChannel?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow">
                    <h3 className="font-semibold mb-4">By Channel</h3>
                    <div className="space-y-2">
                      {salesReport.byChannel.map((ch) => (
                        <div key={ch._id} className="flex justify-between">
                          <span className="capitalize">{ch._id}</span>
                          <span>AED {ch.total?.toFixed(2)} ({ch.count} sales)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "pl" && plReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold mb-4">Profit & Loss Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-medium text-green-600">AED {plReport.revenue?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">COGS</span>
                      <span className="font-medium text-red-600">- AED {plReport.cogs?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Gross Profit</span>
                      <span className="font-medium">AED {plReport.grossProfit?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expenses</span>
                      <span className="font-medium text-red-600">- AED {plReport.totalExpenses?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Net Profit</span>
                      <span className={plReport.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                        AED {plReport.netProfit?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "inventory" && invReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow">
                    <Package className="w-10 h-10 text-blue-600 mb-2" />
                    <p className="text-sm text-gray-500">Total Products</p>
                    <p className="text-2xl font-bold">{invReport.totalProducts}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <p className="text-sm text-gray-500">Total Stock Value</p>
                    <p className="text-2xl font-bold">AED {invReport.totalValue?.toFixed(2)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <p className="text-sm text-gray-500">Low Stock (≤5)</p>
                    <p className="text-2xl font-bold text-amber-600">{invReport.lowStock}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow">
                    <p className="text-sm text-gray-500">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{invReport.outOfStock}</p>
                  </div>
                </div>
                {invReport.lowStockItems?.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow">
                    <h3 className="font-semibold mb-4">Low Stock Items</h3>
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Product</th>
                          <th className="text-left py-2">SKU</th>
                          <th className="text-left py-2">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invReport.lowStockItems.map((p) => (
                          <tr key={p._id} className="border-b">
                            <td className="py-2">{p.title}</td>
                            <td className="py-2">{p.sku}</td>
                            <td className="py-2 text-amber-600">{p.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
