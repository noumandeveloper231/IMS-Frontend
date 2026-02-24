import { Link } from "react-router-dom";
import {
  Package,
  Tag,
  ClipboardList,
  ShoppingBasket,
  ShoppingCart,
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
      </div>
    </div>
  );
};

export default Dashboard;
