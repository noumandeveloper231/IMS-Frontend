import { Link } from "react-router-dom";
import {
  Package,
  Tag,
  ClipboardList,
  ShoppingBasket,
  ShoppingCart,
  BarChart3,
  Users,
  Settings,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/card";
import api from "../utils/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const SUMMARY_COLORS = [
  "bg-slate-900",
  "bg-slate-800",
  "bg-slate-700",
  "bg-slate-600",
];

const STOCK_COLORS = ["#0f172a", "#e5e7eb"];

const Dashboard = () => {
  const {
    data: counts,
    isLoading: countsLoading,
    isError: countsError,
  } = useQuery({
    queryKey: ["dashboard", "counts"],
    queryFn: async () => {
      const res = await api.get("/counts");
      return res.data ?? {};
    },
  });

  const {
    data: stockCounts,
    isLoading: stockLoading,
    isError: stockError,
  } = useQuery({
    queryKey: ["dashboard", "stock-counts"],
    queryFn: async () => {
      const res = await api.get("/products/stock-counts");
      return res.data ?? {};
    },
  });

  const loading = countsLoading || stockLoading;
  const hasError = countsError || stockError;

  const safeCounts = {
    products: counts?.products ?? 0,
    categories: counts?.categories ?? 0,
    brands: counts?.brands ?? 0,
    conditions: counts?.conditions ?? 0,
    sale: counts?.sale ?? 0,
  };

  const safeStockCounts = {
    inStock: stockCounts?.inStock ?? 0,
    outOfStock: stockCounts?.outOfStock ?? 0,
  };

  const totalStockSlots = safeStockCounts.inStock + safeStockCounts.outOfStock;
  const inStockRatio =
    totalStockSlots > 0 ? (safeStockCounts.inStock / totalStockSlots) * 100 : 0;
  const outOfStockRatio =
    totalStockSlots > 0 ? (safeStockCounts.outOfStock / totalStockSlots) * 100 : 0;

  const summaryCards = [
    {
      label: "Products",
      icon: Package,
      value: safeCounts.products,
      to: "/products",
    },
    {
      label: "Categories",
      icon: Tag,
      value: safeCounts.categories,
      to: "/categories",
    },
    {
      label: "Brands",
      icon: ClipboardList,
      value: safeCounts.brands,
      to: "/brands",
    },
    {
      label: "Conditions",
      icon: ShoppingBasket,
      value: safeCounts.conditions,
      to: "/conditions",
    },
  ];

  const stockData = [
    { name: "In Stock", value: safeStockCounts.inStock },
    { name: "Out of Stock", value: safeStockCounts.outOfStock },
  ];

  const entityCountsData = [
    { name: "Products", value: safeCounts.products },
    { name: "Categories", value: safeCounts.categories },
    { name: "Brands", value: safeCounts.brands },
    { name: "Conditions", value: safeCounts.conditions },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="grow px-4 md:px-8 py-4 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin control center
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of your catalog, stock levels, and sales activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/reports">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                <BarChart3 className="h-4 w-4" />
                View reports
              </button>
            </Link>
            <Link to="/products">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <Package className="h-4 w-4" />
                Manage products
              </button>
            </Link>
          </div>
        </div>

        {hasError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            There was a problem loading dashboard analytics. Please try again.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <Link key={card.label} to={card.to}>
                <Card className="hover:shadow-md transition cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    {/* Left Side */}
                    <div className="space-y-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {card.label}
                      </CardTitle>
                      <div className="text-2xl font-bold">
                        {loading ? "…" : card.value}
                      </div>
                    </div>

                    {/* Right Side Icon */}
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          <Link to="/orders">
            <Card className="cursor-pointer hover:shadow-md transition">
              <CardContent className="flex items-center justify-between p-4">

                {/* Left: Label & Value */}
                <div className="space-y-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Orders
                  </CardTitle>
                  <p className="text-2xl font-semibold">
                    {loading ? "…" : safeCounts.sale}
                  </p>
                </div>

                {/* Right: Icon */}
                <div className="p-2 rounded-lg bg-muted">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                </div>

              </CardContent>
            </Card>
          </Link>

          <Link to="/orders">
            <Card className="cursor-pointer hover:shadow-md transition">
              <CardContent className="flex items-center justify-between p-4">

                {/* Left: Label & Value */}
                <div className="space-y-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Out of Stock
                  </CardTitle>
                  <p className="text-2xl font-semibold">
                    {loading ? "…" : safeStockCounts.outOfStock}
                  </p>
                </div>

                {/* Right: Icon */}
                <div className="p-2 rounded-lg bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>

              </CardContent>
            </Card>
          </Link>

          <Link to="/orders">
            <Card className="cursor-pointer hover:shadow-md transition">
              <CardContent className="flex items-center justify-between p-4">

                {/* Left: Label & Value */}
                <div className="space-y-1">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    In Stock
                  </CardTitle>
                  <p className="text-2xl font-semibold">
                    {loading ? "…" : safeStockCounts.inStock}
                  </p>
                </div>

                {/* Right: Icon */}
                <div className="p-2 rounded-lg bg-muted">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>

              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Catalog Overview</CardTitle>
              <CardDescription>Counts by entity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityCountsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Stock Distribution</CardTitle>
              <CardDescription>In stock vs out of stock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {stockData.map((entry, index) => (
                        <Cell
                          // eslint-disable-next-line react/no-array-index-key
                          key={`cell-${index}`}
                          fill={STOCK_COLORS[index % STOCK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Quick admin shortcuts</CardTitle>
              <CardDescription>
                Jump straight into the most common areas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <Link
                  to="/products"
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 hover:border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-700" />
                    <span>Products &amp; catalog</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {safeCounts.products} items
                  </span>
                </Link>

                <Link
                  to="/orders"
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 hover:border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-slate-700" />
                    <span>Sales &amp; orders</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {safeCounts.sale} total sales
                  </span>
                </Link>

                <Link
                  to="/employees"
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 hover:border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-700" />
                    <span>Employees &amp; roles</span>
                  </div>
                  <span className="text-xs text-slate-500">Manage staff</span>
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 hover:border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-700" />
                    <span>Store settings</span>
                  </div>
                  <span className="text-xs text-slate-500">Taxes, users, more</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Stock health</CardTitle>
              <CardDescription>
                High‑level view of how well your inventory is covered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>In‑stock coverage</span>
                  <span className="font-medium">
                    {inStockRatio.toFixed(1)}
                    %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${inStockRatio}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-slate-500">In stock items</p>
                  <p className="mt-1 text-lg font-semibold">
                    {safeStockCounts.inStock}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-slate-500">Out of stock</p>
                  <p className="mt-1 text-lg font-semibold">
                    {safeStockCounts.outOfStock}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <Activity className="h-4 w-4 text-emerald-600" />
                <p>
                  {outOfStockRatio > 0
                    ? `${outOfStockRatio.toFixed(
                        1,
                      )}% of tracked items are currently out of stock. Consider creating purchase orders.`
                    : "All tracked items are currently marked as in stock. Great job keeping shelves full."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
