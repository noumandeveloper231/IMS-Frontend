import { useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import FilteredProducts from "./pages/FilteredProducts ";
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
import Connect from "./pages/Connect";
import Login from "./pages/Login";
import ScrollArea from "./components/UI/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/UI/resizable";

function App() {
  const sidebarPanelRef = useRef(null);

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
                            <Route path="/products/filter/:type/:id" element={<FilteredProducts />} />
                            <Route path="/products/stock/:status" element={<FilteredProducts />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </ScrollArea>
                      </ResizablePanel>
                    </ResizablePanelGroup>
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
