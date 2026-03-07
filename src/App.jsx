import { useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import { ScannerProvider } from "./context/ScannerContext";
import { ImageModalProvider } from "./context/ImageModalContext";
import { UploadQueueProvider, UploadQueueToast } from "./context/UploadQueueContext";
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
import UserManagement from "./pages/UserManagement";
import ConnectedDevices from "./pages/ConnectedDevices";
import Settings from "./pages/Settings";
import Gallery from "./pages/Gallery";
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
                            <Route path="/ecom" element={<EcommerceStore />} />
                            <Route path="/categories" element={<ProtectedRoute permission="category.manage"><Categories /></ProtectedRoute>} />
                            <Route path="/categories/page/:page" element={<ProtectedRoute permission="category.manage"><Categories /></ProtectedRoute>} />
                            <Route path="/subcategories" element={<ProtectedRoute permission="subcategory.manage"><Subcategories /></ProtectedRoute>} />
                            <Route path="/subcategories/page/:page" element={<ProtectedRoute permission="subcategory.manage"><Subcategories /></ProtectedRoute>} />
                            <Route path="/brands" element={<ProtectedRoute permission="brand.manage"><Brands /></ProtectedRoute>} />
                            <Route path="/brands/page/:page" element={<ProtectedRoute permission="brand.manage"><Brands /></ProtectedRoute>} />
                            <Route path="/conditions" element={<ProtectedRoute permission="condition.manage"><Conditions /></ProtectedRoute>} />
                            <Route path="/conditions/page/:page" element={<ProtectedRoute permission="condition.manage"><Conditions /></ProtectedRoute>} />
                            <Route path="/vendors" element={<ProtectedRoute permission="vendor.manage"><Vendors /></ProtectedRoute>} />
                            <Route path="/expenses" element={<ProtectedRoute permission="expense.manage"><Expenses /></ProtectedRoute>} />
                            <Route path="/expensecategories" element={<ProtectedRoute permission="expense.manage"><ExpenseCategories /></ProtectedRoute>} />
                            <Route path="/products" element={<ProtectedRoute permission="product.read"><Products /></ProtectedRoute>} />
                            <Route path="/products/page/:page" element={<ProtectedRoute permission="product.read"><Products /></ProtectedRoute>} />
                            <Route path="/products/:id" element={<ProtectedRoute permission="product.read"><ProductDetail /></ProtectedRoute>} />
                            <Route path="/purchase-orders" element={<ProtectedRoute permission="purchase.manage"><PurchaseOrderForm /></ProtectedRoute>} />
                            <Route path="/purchaseorderslist" element={<ProtectedRoute permission="purchase.manage"><PurchaseOrderList /></ProtectedRoute>} />
                            <Route path="/purchasereceiveslist" element={<ProtectedRoute permission="purchase.manage"><PurchaseReceiveList /></ProtectedRoute>} />
                            <Route path="/purchase-receives" element={<ProtectedRoute permission="purchase.manage"><PurchaseReceive /></ProtectedRoute>} />
                            <Route path="/bills" element={<ProtectedRoute permission="purchase.manage"><BillManagement /></ProtectedRoute>} />
                            <Route path="/sales" element={<ProtectedRoute permission="order.create"><Sales /></ProtectedRoute>} />
                            <Route path="/orders" element={<ProtectedRoute permission="order.read"><Orders /></ProtectedRoute>} />
                            <Route path="/orders/page/:page" element={<ProtectedRoute permission="order.read"><Orders /></ProtectedRoute>} />
                            <Route path="/employees" element={<ProtectedRoute permission="employee.manage"><Employees /></ProtectedRoute>} />
                            <Route path="/employees/page/:page" element={<ProtectedRoute permission="employee.manage"><Employees /></ProtectedRoute>} />
                            <Route path="/customers" element={<ProtectedRoute permission="customer.manage"><Customers /></ProtectedRoute>} />
                            <Route path="/customers/page/:page" element={<ProtectedRoute permission="customer.manage"><Customers /></ProtectedRoute>} />
                            <Route path="/users" element={<ProtectedRoute permission="user.manage"><UserManagement /></ProtectedRoute>} />
                            <Route path="/users/page/:page" element={<ProtectedRoute permission="user.manage"><UserManagement /></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute permission="report.read"><Reports /></ProtectedRoute>} />
                            <Route path="/connected-devices" element={<ProtectedRoute permission="device.manage"><ConnectedDevices /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute permission="settings.manage"><Settings /></ProtectedRoute>} />
                            <Route path="/gallery" element={<Gallery />} />
                            <Route path="/products/list" element={<ProtectedRoute permission="product.read"><ProductList /></ProtectedRoute>} />
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
                            <Route path="/categories" element={<ProtectedRoute permission="category.manage"><Categories /></ProtectedRoute>} />
                            <Route path="/categories/page/:page" element={<ProtectedRoute permission="category.manage"><Categories /></ProtectedRoute>} />
                            <Route path="/subcategories" element={<ProtectedRoute permission="subcategory.manage"><Subcategories /></ProtectedRoute>} />
                            <Route path="/subcategories/page/:page" element={<ProtectedRoute permission="subcategory.manage"><Subcategories /></ProtectedRoute>} />
                            <Route path="/brands" element={<ProtectedRoute permission="brand.manage"><Brands /></ProtectedRoute>} />
                            <Route path="/brands/page/:page" element={<ProtectedRoute permission="brand.manage"><Brands /></ProtectedRoute>} />
                            <Route path="/conditions" element={<ProtectedRoute permission="condition.manage"><Conditions /></ProtectedRoute>} />
                            <Route path="/conditions/page/:page" element={<ProtectedRoute permission="condition.manage"><Conditions /></ProtectedRoute>} />
                            <Route path="/vendors" element={<ProtectedRoute permission="vendor.manage"><Vendors /></ProtectedRoute>} />
                            <Route path="/expenses" element={<ProtectedRoute permission="expense.manage"><Expenses /></ProtectedRoute>} />
                            <Route path="/expensecategories" element={<ProtectedRoute permission="expense.manage"><ExpenseCategories /></ProtectedRoute>} />
                            <Route path="/products" element={<ProtectedRoute permission="product.read"><Products /></ProtectedRoute>} />
                            <Route path="/products/page/:page" element={<ProtectedRoute permission="product.read"><Products /></ProtectedRoute>} />
                            <Route path="/products/:id" element={<ProtectedRoute permission="product.read"><ProductDetail /></ProtectedRoute>} />
                            <Route path="/purchase-orders" element={<ProtectedRoute permission="purchase.manage"><PurchaseOrderForm /></ProtectedRoute>} />
                            <Route path="/purchaseorderslist" element={<ProtectedRoute permission="purchase.manage"><PurchaseOrderList /></ProtectedRoute>} />
                            <Route path="/purchasereceiveslist" element={<ProtectedRoute permission="purchase.manage"><PurchaseReceiveList /></ProtectedRoute>} />
                            <Route path="/purchase-receives" element={<ProtectedRoute permission="purchase.manage"><PurchaseReceive /></ProtectedRoute>} />
                            <Route path="/bills" element={<ProtectedRoute permission="purchase.manage"><BillManagement /></ProtectedRoute>} />
                            <Route path="/sales" element={<ProtectedRoute permission="order.create"><Sales /></ProtectedRoute>} />
                            <Route path="/orders" element={<ProtectedRoute permission="order.read"><Orders /></ProtectedRoute>} />
                            <Route path="/orders/page/:page" element={<ProtectedRoute permission="order.read"><Orders /></ProtectedRoute>} />
                            <Route path="/employees" element={<ProtectedRoute permission="employee.manage"><Employees /></ProtectedRoute>} />
                            <Route path="/employees/page/:page" element={<ProtectedRoute permission="employee.manage"><Employees /></ProtectedRoute>} />
                            <Route path="/customers" element={<ProtectedRoute permission="customer.manage"><Customers /></ProtectedRoute>} />
                            <Route path="/customers/page/:page" element={<ProtectedRoute permission="customer.manage"><Customers /></ProtectedRoute>} />
                            <Route path="/users" element={<ProtectedRoute permission="user.manage"><UserManagement /></ProtectedRoute>} />
                            <Route path="/users/page/:page" element={<ProtectedRoute permission="user.manage"><UserManagement /></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute permission="report.read"><Reports /></ProtectedRoute>} />
                            <Route path="/connected-devices" element={<ProtectedRoute permission="device.manage"><ConnectedDevices /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute permission="settings.manage"><Settings /></ProtectedRoute>} />
                            <Route path="/gallery" element={<Gallery />} />
                            <Route path="/products/list" element={<ProtectedRoute permission="product.read"><ProductList /></ProtectedRoute>} />
                            <Route path="/products/filter/:type/:id" element={<ProtectedRoute permission="product.read"><ProductList /></ProtectedRoute>} />
                            <Route path="/products/stock/:status" element={<ProtectedRoute permission="product.read"><ProductList /></ProtectedRoute>} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                          </ScrollArea>
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    )}
                  </div>
                  </UploadQueueProvider>
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
