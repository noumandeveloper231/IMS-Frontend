import { useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { ScannerProvider } from "./context/ScannerContext";
import { ImageModalProvider } from "./context/ImageModalContext";
import { ImageModal } from "./components/UI/ImageModal";
import ProtectedRoute from "./components/ProtectedRoute";
import Categories from "./pages/Categories";
import Subcategories from "./pages/Subcategories";
import Brands from "./pages/Brands";
import { BrandProvider } from "./context/BrandContext";
import Conditions from "./pages/Conditions";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";
import Sales from "./pages/Sales";
import Orders from "./pages/Orders";
import ProductList from "./pages/ProductList";
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
import ConnectedDevices from "./pages/ConnectedDevices";
import Settings from "./pages/Settings";
import Connect from "./pages/Connect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ScrollArea from "./components/UI/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/UI/resizable";

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
  { path: "/products/:id", hideSidebar: true },
  { path: "/", hideSidebar: false },
  { path: "/ecom", hideSidebar: false },
  { path: "/categories", hideSidebar: false },
  { path: "/subcategories", hideSidebar: false },
  { path: "/brands", hideSidebar: false },
  { path: "/conditions", hideSidebar: false },
  { path: "/vendors", hideSidebar: false },
  { path: "/expenses", hideSidebar: false },
  { path: "/expensecategories", hideSidebar: false },
  { path: "/products", hideSidebar: false },
  { path: "/purchase-orders", hideSidebar: false },
  { path: "/purchaseorderslist", hideSidebar: false },
  { path: "/purchasereceiveslist", hideSidebar: false },
  { path: "/purchase-receives", hideSidebar: false },
  { path: "/bills", hideSidebar: false },
  { path: "/sales", hideSidebar: false },
  { path: "/orders", hideSidebar: false },
  { path: "/employees", hideSidebar: false },
  { path: "/customers", hideSidebar: false },
  { path: "/reports", hideSidebar: false },
  { path: "/connected-devices", hideSidebar: false },
  { path: "/settings", hideSidebar: false },
];

function App() {
  const sidebarPanelRef = useRef(null);
  const location = useLocation();

  const matchedRoute = ROUTE_CONFIG.find((route) =>
    matchRoute(location.pathname, route.path),
  );
  const hideSidebar = !matchedRoute || matchedRoute.hideSidebar;

  const handleSidebarCollapseToggle = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    try {
      if (panel.isCollapsed && panel.isCollapsed()) {
        panel.expand && panel.expand();
      } else {
        panel.collapse && panel.collapse();
      }
    } catch {
      // Ignore imperative API errors
    }
  };

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/connect/:sessionId" element={<Connect />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ImageModalProvider>
                <ScannerProvider>
                  <div className="bg-[#f5f7fb]">
                    {hideSidebar ? (
                      <div className="flex w-full h-screen">
                        <ScrollArea className="flex-1 min-w-0 overflow-y-auto h-full lg:h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                          <Navbar />
                          <ImageModal />
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/ecom" element={<EcommerceStore />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/subcategories" element={<Subcategories />} />
                            <Route path="/brands" element={<Brands />} />
                            <Route path="/conditions" element={<Conditions />} />
                            <Route path="/vendors" element={<Vendors />} />
                            <Route path="/expenses" element={<Expenses />} />
                            <Route path="/expensecategories" element={<ExpenseCategories />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/products/:id" element={<ProductDetail />} />
                            <Route path="/purchase-orders" element={<PurchaseOrderForm />} />
                            <Route path="/purchaseorderslist" element={<PurchaseOrderList />} />
                            <Route path="/purchasereceiveslist" element={<PurchaseReceiveList />} />
                            <Route path="/purchase-receives" element={<PurchaseReceive />} />
                            <Route path="/bills" element={<BillManagement />} />
                            <Route path="/sales" element={<Sales />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/employees" element={<Employees />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/connected-devices" element={<ConnectedDevices />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/products/list" element={<ProductList />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </ScrollArea>
                      </div>
                    ) : (
                      <ResizablePanelGroup
                        orientation="horizontal"
                        className="flex w-full h-screen"
                      >
                        <ResizablePanel
                          defaultSize={18}
                          minSize={70}
                          maxSize={300}
                          collapsible
                          collapsedSize={70}
                          className="shrink-0"
                          panelRef={sidebarPanelRef}
                        >
                          <Sidebar onCollapseToggle={handleSidebarCollapseToggle} />
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={82} minSize={60}>
                          <ScrollArea className="flex-1 min-w-0 overflow-y-auto h-full lg:h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
                            <Navbar />
                            <ImageModal />
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/ecom" element={<EcommerceStore />} />
                              <Route path="/categories" element={<Categories />} />
                              <Route path="/subcategories" element={<Subcategories />} />
                              <Route path="/brands" element={<Brands />} />
                              <Route path="/conditions" element={<Conditions />} />
                              <Route path="/vendors" element={<Vendors />} />
                              <Route path="/expenses" element={<Expenses />} />
                              <Route path="/expensecategories" element={<ExpenseCategories />} />
                              <Route path="/products" element={<Products />} />
                              <Route path="/products/:id" element={<ProductDetail />} />
                              <Route path="/purchase-orders" element={<PurchaseOrderForm />} />
                              <Route path="/purchaseorderslist" element={<PurchaseOrderList />} />
                              <Route path="/purchasereceiveslist" element={<PurchaseReceiveList />} />
                              <Route path="/purchase-receives" element={<PurchaseReceive />} />
                              <Route path="/bills" element={<BillManagement />} />
                              <Route path="/sales" element={<Sales />} />
                              <Route path="/orders" element={<Orders />} />
                              <Route path="/employees" element={<Employees />} />
                              <Route path="/customers" element={<Customers />} />
                              <Route path="/reports" element={<Reports />} />
                              <Route path="/connected-devices" element={<ConnectedDevices />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/products/list" element={<ProductList />} />
                              <Route path="/products/filter/:type/:id" element={<ProductList />} />
                              <Route path="/products/stock/:status" element={<ProductList />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </ScrollArea>
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                  </div>
                </ScannerProvider>
              </ImageModalProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
