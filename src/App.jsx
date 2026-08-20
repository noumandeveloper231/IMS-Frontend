import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import NProgress from "nprogress";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ScannerProvider } from "./context/ScannerContext";
import { ImageModalProvider } from "./context/ImageModalContext";
import { GlobalSearchProvider } from "./context/GlobalSearchContext";
import {
  UploadQueueProvider,
  UploadQueueToast,
} from "./context/UploadQueueContext";
import { ImageModal } from "./components/UI/ImageModal";
import { TooltipProvider } from "./components/UI/tooltip";
import ProtectedRoute from "./components/ProtectedRoute";
import Categories from "./pages/Categories";
import Subcategories from "./pages/Subcategories";
import Brands from "./pages/Brands";
import Conditions from "./pages/Conditions";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";
import Sales from "./pages/Sales";
import Orders from "./pages/Orders";
import ProductList from "./pages/ProductList";
import PrintProductLabels from "./pages/PrintProductLabels";
import EcommerceStore from "./components/EcommerceStore";
import Vendors from "./pages/Vendors";
import Expenses from "./pages/Expenses";
import PurchaseOrderForm from "./pages/PurchaseOrderForm";
import PurchaseReceive from "./pages/PurchaseReceive";
import BillManagement from "./pages/BillManagement";
import PurchaseOrderList from "./pages/PurchaseOrderList";
import PurchaseReceiveList from "./pages/PurchaseReceiveList";
import Employees from "./pages/Employees";
import ExpenseCategories from "./pages/ExpenseCategories";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import ConnectedDevices from "./pages/ConnectedDevices";
import Settings from "./pages/Settings";
import Gallery from "./pages/Gallery";
import Connect from "./pages/Connect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ScrollArea from "./components/UI/scroll-area";

const DEFAULT_ACCENT = "#111827";

const normalizeHexColor = (value) => {
  const raw = String(value || "").trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  const isThreeDigitHex = /^[0-9a-fA-F]{3}$/.test(hex);
  const isSixDigitHex = /^[0-9a-fA-F]{6}$/.test(hex);
  if (!isThreeDigitHex && !isSixDigitHex) return null;
  const sixDigit = isThreeDigitHex
    ? hex
        .split("")
        .map((char) => char + char)
        .join("")
    : hex;
  return `#${sixDigit.toUpperCase()}`;
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) =>
      Math.min(255, Math.max(0, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;

const mixWithWhite = (hex, weight = 0.2) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_ACCENT;
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * weight,
    g: rgb.g + (255 - rgb.g) * weight,
    b: rgb.b + (255 - rgb.b) * weight,
  });
};

const getAccessibleForeground = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  // Standard perceived luminance formula.
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
};

/** Match pathname against route path with params (e.g. :id, :type) */
const matchRoute = (pathname, routePath) => {
  const pathParts = pathname.split("/").filter(Boolean);
  const routeParts = routePath.split("/").filter(Boolean);
  if (pathParts.length !== routeParts.length) return false;
  return routeParts.every((part, index) => {
    if (part.startsWith(":")) return true;
    return part === pathParts[index];
  });
};

/** Route config: more specific paths first. Unknown paths hide sidebar. */
const ROUTE_CONFIG = [
  { path: "/products/filter/:type/:id", hideSidebar: true },
  { path: "/products/stock/:status", hideSidebar: true },
  { path: "/products/list", hideSidebar: true },
  { path: "/products/print-labels", hideSidebar: false },
  { path: "/products/:id", hideSidebar: true },
  { path: "/", hideSidebar: false },
  { path: "/ecom", hideSidebar: false },
  { path: "/categories", hideSidebar: false },
  { path: "/categories/page/:page", hideSidebar: false },
  { path: "/subcategories", hideSidebar: false },
  { path: "/subcategories/page/:page", hideSidebar: false },
  { path: "/brands", hideSidebar: false },
  { path: "/brands/page/:page", hideSidebar: false },
  { path: "/conditions", hideSidebar: false },
  { path: "/conditions/page/:page", hideSidebar: false },
  { path: "/vendors", hideSidebar: false },
  { path: "/expenses", hideSidebar: false },
  { path: "/expensecategories", hideSidebar: false },
  { path: "/products", hideSidebar: false },
  { path: "/products/page/:page", hideSidebar: false },
  { path: "/purchase-orders", hideSidebar: false },
  { path: "/purchaseorderslist", hideSidebar: false },
  { path: "/purchasereceiveslist", hideSidebar: false },
  { path: "/purchase-receives", hideSidebar: false },
  { path: "/bills", hideSidebar: false },
  { path: "/sales", hideSidebar: false },
  { path: "/orders", hideSidebar: false },
  { path: "/orders/page/:page", hideSidebar: false },
  { path: "/employees", hideSidebar: false },
  { path: "/employees/page/:page", hideSidebar: false },
  { path: "/customers", hideSidebar: false },
  { path: "/customers/page/:page", hideSidebar: false },
  { path: "/users", hideSidebar: false },
  { path: "/users/page/:page", hideSidebar: false },
  { path: "/reports", hideSidebar: false },
  { path: "/connected-devices", hideSidebar: false },
  { path: "/settings", hideSidebar: false },
  { path: "/gallery", hideSidebar: false },
];

function App() {
  const location = useLocation();
  const requestCountRef = useRef(0);

  const matchedRoute = ROUTE_CONFIG.find((route) =>
    matchRoute(location.pathname, route.path),
  );
  const hideSidebar = !matchedRoute || matchedRoute.hideSidebar;

  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickle: true,
      trickleSpeed: 120,
      minimum: 0.15,
      easing: "ease",
      speed: 280,
    });
  }, []);

  useEffect(() => {
    NProgress.start();

    const minVisibleMs = 350;
    const timer = setTimeout(() => {
      NProgress.done();
    }, minVisibleMs);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const startProgress = () => {
      requestCountRef.current += 1;
      if (requestCountRef.current === 1) NProgress.start();
    };

    const stopProgress = () => {
      requestCountRef.current = Math.max(0, requestCountRef.current - 1);
      if (requestCountRef.current === 0) NProgress.done();
    };

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        startProgress();
        return config;
      },
      (error) => {
        stopProgress();
        return Promise.reject(error);
      },
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        stopProgress();
        return response;
      },
      (error) => {
        stopProgress();
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  function SettingsSeo() {
    const { settings } = useSettings();

    useEffect(() => {
      const iconUrl = settings?.siteIcon;
      if (!iconUrl) return;

      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "icon");
        document.head.appendChild(link);
      }
      const cacheBusted = `${iconUrl}${iconUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
      link.setAttribute("href", cacheBusted);

      const lower = iconUrl.toLowerCase();
      if (lower.includes(".png")) link.setAttribute("type", "image/png");
      else if (lower.includes(".jpg") || lower.includes(".jpeg"))
        link.setAttribute("type", "image/jpeg");
      else if (lower.includes(".webp")) link.setAttribute("type", "image/webp");
      else if (lower.includes(".svg"))
        link.setAttribute("type", "image/svg+xml");
    }, [settings?.siteIcon]);

    useEffect(() => {
      const siteName = settings?.siteName;
      if (!siteName) return;
      document.title = siteName;
    }, [settings?.siteName]);

    useEffect(() => {
      const root = document.documentElement;
      const accent = normalizeHexColor(settings?.accentColor) || DEFAULT_ACCENT;
      const accentHover = mixWithWhite(accent, 0.18);
      const accentLight = mixWithWhite(accent, 0.7);
      const accentBorder = mixWithWhite(accent, 0.62);
      const accentForeground = getAccessibleForeground(accent);

      root.style.setProperty("--app-accent", accent);
      root.style.setProperty("--app-accent-hover", accentHover);
      root.style.setProperty("--app-accent-light", accentLight);
      root.style.setProperty("--app-accent-border", accentBorder);
      root.style.setProperty("--app-accent-foreground", accentForeground);
    }, [settings?.accentColor]);

    return null;
  }

  return (
    <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <GlobalSearchProvider>
            <SettingsSeo />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/connect/:sessionId" element={<Connect />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <ImageModalProvider>
                      <ScannerProvider>
                        <UploadQueueProvider>
                          <div className="bg-[#f5f7fb]">
                            <UploadQueueToast />
                            {hideSidebar ? (
                              <div className="flex w-full h-screen">
                                <ScrollArea className="flex-1 min-w-0 overflow-y-auto h-full lg:h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                                  <Navbar />
                                  <ImageModal />
                                  <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route
                                      path="/ecom"
                                      element={<EcommerceStore />}
                                    />
                                    <Route
                                      path="/categories"
                                      element={
                                        <ProtectedRoute permission="category.manage">
                                          <Categories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/categories/page/:page"
                                      element={
                                        <ProtectedRoute permission="category.manage">
                                          <Categories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/subcategories"
                                      element={
                                        <ProtectedRoute permission="subcategory.manage">
                                          <Subcategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/subcategories/page/:page"
                                      element={
                                        <ProtectedRoute permission="subcategory.manage">
                                          <Subcategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/brands"
                                      element={
                                        <ProtectedRoute permission="brand.manage">
                                          <Brands />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/brands/page/:page"
                                      element={
                                        <ProtectedRoute permission="brand.manage">
                                          <Brands />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/conditions"
                                      element={
                                        <ProtectedRoute permission="condition.manage">
                                          <Conditions />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/conditions/page/:page"
                                      element={
                                        <ProtectedRoute permission="condition.manage">
                                          <Conditions />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/vendors"
                                      element={
                                        <ProtectedRoute permission="vendor.manage">
                                          <Vendors />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/expenses"
                                      element={
                                        <ProtectedRoute permission="expense.manage">
                                          <Expenses />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/expensecategories"
                                      element={
                                        <ProtectedRoute permission="expense.manage">
                                          <ExpenseCategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <Products />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/page/:page"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <Products />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/print-labels"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <PrintProductLabels />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/:id"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductDetail />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchase-orders"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseOrderForm />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchaseorderslist"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseOrderList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchasereceiveslist"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseReceiveList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchase-receives"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseReceive />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/bills"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <BillManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/sales"
                                      element={
                                        <ProtectedRoute permission="order.create">
                                          <Sales />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/orders"
                                      element={
                                        <ProtectedRoute permission="order.read">
                                          <Orders />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/orders/page/:page"
                                      element={
                                        <ProtectedRoute permission="order.read">
                                          <Orders />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/employees"
                                      element={
                                        <ProtectedRoute permission="employee.manage">
                                          <Employees />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/employees/page/:page"
                                      element={
                                        <ProtectedRoute permission="employee.manage">
                                          <Employees />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/customers"
                                      element={
                                        <ProtectedRoute permission="customer.manage">
                                          <Customers />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/customers/page/:page"
                                      element={
                                        <ProtectedRoute permission="customer.manage">
                                          <Customers />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/users"
                                      element={
                                        <ProtectedRoute permission="user.manage">
                                          <UserManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/users/page/:page"
                                      element={
                                        <ProtectedRoute permission="user.manage">
                                          <UserManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/reports"
                                      element={
                                        <ProtectedRoute permission="report.read">
                                          <Reports />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/connected-devices"
                                      element={
                                        <ProtectedRoute permission="device.manage">
                                          <ConnectedDevices />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/settings"
                                      element={
                                        <ProtectedRoute permission="settings.manage">
                                          <Settings />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/gallery"
                                      element={<Gallery />}
                                    />
                                    <Route
                                      path="/products/list"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/filter/:type/:id"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/stock/:status"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route path="*" element={<NotFound />} />
                                  </Routes>
                                </ScrollArea>
                              </div>
                            ) : (
                              <div className="flex w-full h-screen">
                                <Sidebar />
                                <ScrollArea className="flex-1 min-w-0 overflow-y-auto h-full lg:h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                                  <Navbar />
                                  <ImageModal />
                                  <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route
                                      path="/ecom"
                                      element={<EcommerceStore />}
                                    />
                                    <Route
                                      path="/categories"
                                      element={
                                        <ProtectedRoute permission="category.manage">
                                          <Categories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/categories/page/:page"
                                      element={
                                        <ProtectedRoute permission="category.manage">
                                          <Categories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/subcategories"
                                      element={
                                        <ProtectedRoute permission="subcategory.manage">
                                          <Subcategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/subcategories/page/:page"
                                      element={
                                        <ProtectedRoute permission="subcategory.manage">
                                          <Subcategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/brands"
                                      element={
                                        <ProtectedRoute permission="brand.manage">
                                          <Brands />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/brands/page/:page"
                                      element={
                                        <ProtectedRoute permission="brand.manage">
                                          <Brands />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/conditions"
                                      element={
                                        <ProtectedRoute permission="condition.manage">
                                          <Conditions />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/conditions/page/:page"
                                      element={
                                        <ProtectedRoute permission="condition.manage">
                                          <Conditions />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/vendors"
                                      element={
                                        <ProtectedRoute permission="vendor.manage">
                                          <Vendors />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/expenses"
                                      element={
                                        <ProtectedRoute permission="expense.manage">
                                          <Expenses />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/expensecategories"
                                      element={
                                        <ProtectedRoute permission="expense.manage">
                                          <ExpenseCategories />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <Products />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/page/:page"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <Products />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/print-labels"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <PrintProductLabels />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/:id"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductDetail />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchase-orders"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseOrderForm />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchaseorderslist"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseOrderList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchasereceiveslist"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseReceiveList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/purchase-receives"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <PurchaseReceive />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/bills"
                                      element={
                                        <ProtectedRoute permission="purchase.manage">
                                          <BillManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/sales"
                                      element={
                                        <ProtectedRoute permission="order.create">
                                          <Sales />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/orders"
                                      element={
                                        <ProtectedRoute permission="order.read">
                                          <Orders />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/orders/page/:page"
                                      element={
                                        <ProtectedRoute permission="order.read">
                                          <Orders />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/employees"
                                      element={
                                        <ProtectedRoute permission="employee.manage">
                                          <Employees />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/employees/page/:page"
                                      element={
                                        <ProtectedRoute permission="employee.manage">
                                          <Employees />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/customers"
                                      element={
                                        <ProtectedRoute permission="customer.manage">
                                          <Customers />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/customers/page/:page"
                                      element={
                                        <ProtectedRoute permission="customer.manage">
                                          <Customers />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/users"
                                      element={
                                        <ProtectedRoute permission="user.manage">
                                          <UserManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/users/page/:page"
                                      element={
                                        <ProtectedRoute permission="user.manage">
                                          <UserManagement />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/reports"
                                      element={
                                        <ProtectedRoute permission="report.read">
                                          <Reports />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/connected-devices"
                                      element={
                                        <ProtectedRoute permission="device.manage">
                                          <ConnectedDevices />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/settings"
                                      element={
                                        <ProtectedRoute permission="settings.manage">
                                          <Settings />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/gallery"
                                      element={<Gallery />}
                                    />
                                    <Route
                                      path="/products/list"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/filter/:type/:id"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route
                                      path="/products/stock/:status"
                                      element={
                                        <ProtectedRoute permission="product.read">
                                          <ProductList />
                                        </ProtectedRoute>
                                      }
                                    />
                                    <Route path="*" element={<NotFound />} />
                                  </Routes>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </UploadQueueProvider>
                      </ScannerProvider>
                    </ImageModalProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </GlobalSearchProvider>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
