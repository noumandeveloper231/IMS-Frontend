import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Activity,
  Download,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import api from "../utils/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CHART_COLORS = ["#0ea5e9", "#6366f1", "#22c55e", "#eab308", "#f97316", "#ef4444"];

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

  const salesSummary = salesReport?.summary || {};
  const totalSales = Number(salesSummary.totalSales || 0);
  const totalProfit = Number(salesSummary.totalProfit || 0);
  const totalCOGS = Number(salesSummary.totalCOGS || 0);
  const salesCount = Number(salesSummary.count || 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const averageOrderValue = salesCount > 0 ? totalSales / salesCount : 0;

  const channelData = Array.isArray(salesReport?.byChannel)
    ? salesReport.byChannel.map((ch) => ({
        name: ch._id || "Channel",
        total: Number(ch.total || 0),
        count: Number(ch.count || 0),
      }))
    : [];

  const plPieData = plReport
    ? [
        { name: "Revenue", value: Number(plReport.revenue || 0) },
        { name: "COGS", value: Number(plReport.cogs || 0) },
        { name: "Expenses", value: Number(plReport.totalExpenses || 0) },
      ]
    : [];

  const lowStockChartData = Array.isArray(invReport?.lowStockItems)
    ? invReport.lowStockItems.map((item) => ({
        name: item.sku || item.title || "Item",
        quantity: Number(item.quantity || 0),
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Reports dashboard
            </h1>
            <p className="text-sm text-gray-500">
              Visualize your sales, profit &amp; loss, and inventory health in one playful,
              interactive board.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              Live overview
            </Badge>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-gray-300 bg-white/80 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:bg-white transition-all"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Export reports</DialogTitle>
                  <DialogDescription>
                    Quickly export data for sharing with your accountant or management.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2 text-sm">
                  <p className="text-gray-500">
                    Choose what you want to export. (Wire this up to your API when ready.)
                  </p>
                  <div className="space-y-2">
                    <Button className="w-full justify-between">
                      Sales report CSV
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                      Profit &amp; loss PDF
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between">
                      Inventory snapshot
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Hero summary */}
        <Card className="overflow-hidden border-none bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg">
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Business performance overview</span>
              </div>
              <p className="text-sm text-blue-100">
                Period:&nbsp;
                <span className="font-semibold uppercase tracking-wide">
                  {period === "today"
                    ? "Today"
                    : period === "week"
                    ? "Last 7 days"
                    : period === "month"
                    ? "Last month"
                    : "Last year"}
                </span>
              </p>
              <p className="max-w-xl text-sm text-blue-100/90">
                Keep an eye on revenue, profitability, and stock levels at a glance with this
                smart report board.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-white/10 px-4 py-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15">
                <p className="text-xs text-blue-100/80">Total sales</p>
                <p className="mt-1 text-lg font-semibold">
                  AED {totalSales.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15">
                <p className="text-xs text-blue-100/80">Net profit</p>
                <p className="mt-1 text-lg font-semibold">
                  AED {Number(plReport?.netProfit || totalProfit).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15">
                <p className="text-xs text-blue-100/80">Profit margin</p>
                <p className="mt-1 text-lg font-semibold">
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs + filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <TabsList className="overflow-hidden w-full justify-start overflow-x-auto rounded-full bg-white p-1 shadow-sm md:w-auto">
              <TabsTrigger
                value="sales"
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs md:text-sm"
              >
                <BarChart3 className="h-4 w-4" />
                Sales
              </TabsTrigger>
              <TabsTrigger
                value="pl"
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs md:text-sm"
              >
                <TrendingUp className="h-4 w-4" />
                Profit &amp; loss
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs md:text-sm"
              >
                <Package className="h-4 w-4" />
                Inventory
              </TabsTrigger>
            </TabsList>

            {activeTab === "sales" && (
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-1 text-xs text-gray-500 md:inline-flex">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Period</span>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-40 rounded-full border-gray-300 bg-white/80 text-xs shadow-sm">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last month</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Sales tab */}
          <TabsContent value="sales" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : !salesReport ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  No sales data found for this period.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="group overflow-hidden border border-blue-50 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-medium">Total sales</CardTitle>
                        <CardDescription>All channels combined</CardDescription>
                      </div>
                      <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                        <DollarSign className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tracking-tight">
                        AED {totalSales.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-emerald-600">
                        {profitMargin.toFixed(1)}% margin
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group overflow-hidden border border-blue-50 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-medium">Total profit</CardTitle>
                        <CardDescription>After cost of goods</CardDescription>
                      </div>
                      <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tracking-tight">
                        AED {totalProfit.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        AED {totalCOGS.toFixed(2)} COGS
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group overflow-hidden border border-blue-50 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-medium">
                          Transactions
                        </CardTitle>
                        <CardDescription>Number of sales</CardDescription>
                      </div>
                      <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                        <Activity className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold tracking-tight">
                        {salesCount}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Avg. order AED {averageOrderValue.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="group overflow-hidden border border-blue-50 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
                    <CardHeader className="space-y-1 pb-2">
                      <CardTitle className="text-sm font-medium">Insights</CardTitle>
                      <CardDescription>Smart highlights for you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs text-gray-600">
                      <p>
                        • Best channel:{" "}
                        <span className="font-medium">
                          {channelData[0]?.name || "N/A"}
                        </span>
                      </p>
                      <p>
                        • Highest ticket:{" "}
                        <span className="font-medium">
                          AED{" "}
                          {channelData.length
                            ? Math.max(
                                ...channelData.map((c) => c.total || 0)
                              ).toFixed(2)
                            : "0.00"}
                        </span>
                      </p>
                      <p>
                        • Orders / day:{" "}
                        <span className="font-medium">
                          {salesCount && period === "week"
                            ? (salesCount / 7).toFixed(1)
                            : salesCount && period === "month"
                            ? (salesCount / 30).toFixed(1)
                            : salesCount || 0}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts + table */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr),minmax(0,1.2fr)]">
                  <Card className="border bg-white shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          Sales by channel
                        </CardTitle>
                        <CardDescription>
                          See which channels are driving revenue
                        </CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            View table
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Sales by channel</DialogTitle>
                            <DialogDescription>
                              Detailed breakdown of channel performance.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="mt-4 max-h-[360px] rounded-md border">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                                    Channel
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                                    Total (AED)
                                  </th>
                                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                                    Sales count
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {channelData.map((ch) => (
                                  <tr
                                    key={ch.name}
                                    className="border-t text-xs last:border-b"
                                  >
                                    <td className="px-4 py-2 capitalize">
                                      {ch.name}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {ch.total.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {ch.count}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="h-80">
                      {channelData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                          No channel breakdown data available.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={channelData} barSize={32}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "#f9fafb" }}
                              contentStyle={{
                                borderRadius: 12,
                                borderColor: "#e5e7eb",
                                boxShadow:
                                  "0 10px 25px -5px rgba(15,23,42,0.15)",
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="total"
                              radius={[8, 8, 0, 0]}
                              animationDuration={800}
                            >
                              {channelData.map((_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border bg-white shadow-sm">
                    <CardHeader className="space-y-1 pb-3">
                      <CardTitle className="text-sm font-semibold">
                        Quick sales insights
                      </CardTitle>
                      <CardDescription>
                        Small nuggets to understand your performance.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-gray-600">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p>
                          Based on current data your{" "}
                          <span className="font-semibold">average ticket</span>{" "}
                          is{" "}
                          <span className="font-semibold">
                            AED {averageOrderValue.toFixed(2)}
                          </span>
                          .
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p>
                          Your{" "}
                          <span className="font-semibold">
                            gross margin
                          </span>{" "}
                          sits around{" "}
                          <span className="font-semibold">
                            {profitMargin.toFixed(1)}%
                          </span>
                          , which looks{" "}
                          <span className="font-semibold">
                            {profitMargin > 35
                              ? "healthy"
                              : profitMargin > 20
                              ? "okay"
                              : "low"}
                          </span>
                          .
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p>
                          Best performing channel is{" "}
                          <span className="font-semibold">
                            {channelData[0]?.name || "N/A"}
                          </span>{" "}
                          – consider pushing promotions there.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Profit & loss tab */}
          <TabsContent value="pl" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : !plReport ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  No profit &amp; loss data available.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1.2fr)]">
                <Card className="border bg-white shadow-sm">
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-sm font-semibold">
                      Profit &amp; loss summary
                    </CardTitle>
                    <CardDescription>
                      High‑level view of your income statement.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Revenue</span>
                        <span className="font-medium text-emerald-600">
                          AED {plReport.revenue?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">COGS</span>
                        <span className="font-medium text-red-600">
                          - AED {plReport.cogs?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-gray-600 font-medium">
                          Gross profit
                        </span>
                        <span className="font-semibold">
                          AED {plReport.grossProfit?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Expenses</span>
                        <span className="font-medium text-red-600">
                          - AED {plReport.totalExpenses?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="font-semibold">Net profit</span>
                        <span
                          className={
                            (plReport.netProfit || 0) >= 0
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-red-600"
                          }
                        >
                          AED {plReport.netProfit?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 text-xs text-gray-600 md:grid-cols-3">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="font-semibold">Net margin</p>
                        <p className="mt-0.5">
                          {plReport.revenue
                            ? ((plReport.netProfit / plReport.revenue) * 100).toFixed(
                                1
                              )
                            : "0.0"}
                          %
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="font-semibold">Expense ratio</p>
                        <p className="mt-0.5">
                          {plReport.revenue
                            ? (
                                (plReport.totalExpenses / plReport.revenue) *
                                100
                              ).toFixed(1)
                            : "0.0"}
                          %
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="font-semibold">COGS ratio</p>
                        <p className="mt-0.5">
                          {plReport.revenue
                            ? ((plReport.cogs / plReport.revenue) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border bg-white shadow-sm">
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-sm font-semibold">
                      P&amp;L composition
                    </CardTitle>
                    <CardDescription>
                      How your revenue splits into cost, profit, and expenses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {plPieData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">
                        No chart data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={plPieData}
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                          >
                            {plPieData.map((_, index) => (
                              <Cell
                                key={index}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              borderColor: "#e5e7eb",
                              boxShadow:
                                "0 10px 25px -5px rgba(15,23,42,0.15)",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Inventory tab */}
          <TabsContent value="inventory" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : !invReport ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-gray-500">
                  No inventory report available.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="flex items-center justify-between gap-3 py-4">
                      <div>
                        <p className="text-xs text-gray-500">Total products</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight">
                          {invReport.totalProducts}
                        </p>
                      </div>
                      <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                        <Package className="h-6 w-6" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="py-4">
                      <p className="text-xs text-gray-500">Total stock value</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">
                        AED {invReport.totalValue?.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="py-4">
                      <p className="text-xs text-gray-500">Low stock (≤5)</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-amber-600">
                        {invReport.lowStock}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardContent className="py-4">
                      <p className="text-xs text-gray-500">Out of stock</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-red-600">
                        {invReport.outOfStock}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1.2fr)]">
                  <Card className="border bg-white shadow-sm">
                    <CardHeader className="space-y-1 pb-3">
                      <CardTitle className="text-sm font-semibold">
                        Low stock items
                      </CardTitle>
                      <CardDescription>
                        Products that may need urgent replenishment.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      {lowStockChartData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                          No low stock items – great job.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={lowStockChartData}
                            layout="vertical"
                            barSize={18}
                            margin={{ left: 60 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="#e5e7eb"
                            />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              dataKey="name"
                              type="category"
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              width={80}
                            />
                            <Tooltip
                              cursor={{ fill: "#f9fafb" }}
                              contentStyle={{
                                borderRadius: 12,
                                borderColor: "#e5e7eb",
                                boxShadow:
                                  "0 10px 25px -5px rgba(15,23,42,0.15)",
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="quantity"
                              radius={[0, 8, 8, 0]}
                              animationDuration={800}
                              fill="#f59e0b"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border bg-white shadow-sm">
                    <CardHeader className="space-y-1 pb-3">
                      <CardTitle className="text-sm font-semibold">
                        Low stock list
                      </CardTitle>
                      <CardDescription>
                        Scrollable table of items below the threshold.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="mt-3 max-h-72 rounded-md border">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">
                                Product
                              </th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">
                                SKU
                              </th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {invReport.lowStockItems?.map((p) => (
                              <tr
                                key={p._id}
                                className="border-t text-[11px] last:border-b"
                              >
                                <td className="px-3 py-2">{p.title}</td>
                                <td className="px-3 py-2">{p.sku}</td>
                                <td className="px-3 py-2 text-right text-amber-600">
                                  {p.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
