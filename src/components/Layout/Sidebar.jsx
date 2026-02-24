import React, { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Tag,
  Layers,
  ClipboardList,
  Users,
  Settings,
  ShoppingCart,
  BarChart3,
  Store,
  LogOut,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import assets from "@/assets/assets";

const navItemClasses = (isActive, collapsed) =>
  `w-full rounded-md text-sm font-medium transition-all ${
    collapsed ? "justify-center p-2" : "justify-start gap-3 px-3 py-2"
  } ${isActive ? "font-semibold" : "font-normal"}`;

const subItemClasses = (isActive) =>
  `block rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "bg-black text-white"
      : "text-slate-700 hover:bg-slate-100"
  }`;

const purchasePaths = [
  "/vendors",
  "/purchase-orders",
  "/purchaseorderslist",
  "/purchase-receives",
  "/purchasereceiveslist",
  "/bills",
];

const isPurchaseActive = (pathname) =>
  purchasePaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

const Sidebar = () => {
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);

  const isActive = (to, exact = false) =>
    exact ? pathname === to : pathname.startsWith(to);

  const { logout } = useContext(AuthContext);
  const handleLogout = () => {
    setIsCollapsed(false);
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`hidden sm:flex h-screen flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ${
        isCollapsed ? "w-18" : "w-68"
      }`}
    >
      {/* Header: logo + brand (or logo only when collapsed) */}
      <div
        className={`flex items-center border-b border-gray-100 shrink-0 ${
          isCollapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4"
        }`}
      >
        <img src={assets.logo} alt="logo" className="w-7 h-7 shrink-0" />
        {!isCollapsed && (
          <h1 className="text-xl font-semibold truncate">Al Ramil</h1>
        )}
      </div>

      <ScrollArea className={`flex-1 py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-1">
          <div className="font-medium space-y-1">
            <Link to="/">
              <Button
                variant={isActive("/", true) ? "default" : "ghost"}
                className={navItemClasses(isActive("/", true), isCollapsed)}
                title={isCollapsed ? "Dashboard" : undefined}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Dashboard</span>}
              </Button>
            </Link>

            <Link to="/categories">
              <Button
                variant={isActive("/categories") ? "default" : "ghost"}
                className={navItemClasses(isActive("/categories"), isCollapsed)}
                title={isCollapsed ? "Categories" : undefined}
              >
                <Tag className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Categories</span>}
              </Button>
            </Link>

            <Link to="/subcategories">
              <Button
                variant={isActive("/subcategories") ? "default" : "ghost"}
                className={navItemClasses(isActive("/subcategories"), isCollapsed)}
                title={isCollapsed ? "Subcategories" : undefined}
              >
                <Layers className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Subcategories</span>}
              </Button>
            </Link>

            <Link to="/brands">
              <Button
                variant={isActive("/brands") ? "default" : "ghost"}
                className={navItemClasses(isActive("/brands"), isCollapsed)}
                title={isCollapsed ? "Brands" : undefined}
              >
                <ClipboardList className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Brands</span>}
              </Button>
            </Link>

            <Link to="/conditions">
              <Button
                variant={isActive("/conditions") ? "default" : "ghost"}
                className={navItemClasses(isActive("/conditions"), isCollapsed)}
                title={isCollapsed ? "Conditions" : undefined}
              >
                <ShoppingBasket className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Conditions</span>}
              </Button>
            </Link>

            <Link to="/products">
              <Button
                variant={isActive("/products") ? "default" : "ghost"}
                className={navItemClasses(isActive("/products"), isCollapsed)}
                title={isCollapsed ? "Products" : undefined}
              >
                <Package className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Products</span>}
              </Button>
            </Link>

            <Link to="/employees">
              <Button
                variant={isActive("/employees") ? "default" : "ghost"}
                className={navItemClasses(isActive("/employees"), isCollapsed)}
                title={isCollapsed ? "Employees" : undefined}
              >
                <Users className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Employees</span>}
              </Button>
            </Link>

            <Link to="/sales">
              <Button
                variant={isActive("/sales") ? "default" : "ghost"}
                className={navItemClasses(isActive("/sales"), isCollapsed)}
                title={isCollapsed ? "POS" : undefined}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>POS</span>}
              </Button>
            </Link>

            <Link to="/orders">
              <Button
                variant={isActive("/orders") ? "default" : "ghost"}
                className={navItemClasses(isActive("/orders"), isCollapsed)}
                title={isCollapsed ? "Orders" : undefined}
              >
                <ClipboardList className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Orders</span>}
              </Button>
            </Link>

            {/* Purchases: when collapsed show icon-only link to /vendors; when expanded show full collapsible */}
            {isCollapsed ? (
              <Link to="/vendors">
                <Button
                  variant={isPurchaseActive(pathname) ? "default" : "ghost"}
                  className={navItemClasses(isPurchaseActive(pathname), true)}
                  title="Purchases"
                >
                  <ShoppingBasket className="h-4 w-4 shrink-0" />
                </Button>
              </Link>
            ) : (
              <Collapsible open={purchaseOpen} onOpenChange={setPurchaseOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant={isPurchaseActive(pathname) ? "default" : "ghost"}
                    className={`${navItemClasses(isPurchaseActive(pathname), false)} justify-between`}
                  >
                    <span className="flex items-center gap-3">
                      <ShoppingBasket className="h-4 w-4 shrink-0" />
                      <span>Purchases</span>
                    </span>
                    {purchaseOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-8 mt-1 space-y-1">
                  <Link to="/vendors">
                    <span className={subItemClasses(isActive("/vendors", true))}>
                      Vendors
                    </span>
                  </Link>
                  <Collapsible open={poOpen} onOpenChange={setPoOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex w-full items-center justify-between px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100 rounded-md"
                      >
                        <span>PO</span>
                        {poOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4 mt-1 space-y-1">
                      <Link to="/purchase-orders">
                        <span className={subItemClasses(isActive("/purchase-orders", true))}>
                          Add PO
                        </span>
                      </Link>
                      <Link to="/purchaseorderslist">
                        <span className={subItemClasses(isActive("/purchaseorderslist", true))}>
                          List of PO
                        </span>
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible open={prOpen} onOpenChange={setPrOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex w-full items-center justify-between px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100 rounded-md"
                      >
                        <span>PR</span>
                        {prOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4 mt-1 space-y-1">
                      <Link to="/purchase-receives">
                        <span className={subItemClasses(isActive("/purchase-receives", true))}>
                          Add PR
                        </span>
                      </Link>
                      <Link to="/purchasereceiveslist">
                        <span className={subItemClasses(isActive("/purchasereceiveslist", true))}>
                          List of PR
                        </span>
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                  <Link to="/bills">
                    <span className={subItemClasses(isActive("/bills", true))}>Bills</span>
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Link to="/reports">
              <Button
                variant={isActive("/reports") ? "default" : "ghost"}
                className={navItemClasses(isActive("/reports"), isCollapsed)}
                title={isCollapsed ? "Reports" : undefined}
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Reports</span>}
              </Button>
            </Link>
          </div>
        </nav>
      </ScrollArea>

      {/* Footer: toggle + logout */}
      <div className={`border-t border-gray-200 shrink-0 ${isCollapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full py-2 ${isCollapsed ? "justify-center px-0" : "gap-2 justify-start"}`}
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </Button>
          <Button
            variant={isCollapsed ? "ghost" : "default"}
            className={`w-full py-3 ${isCollapsed ? "justify-center px-0" : "gap-2 justify-start"}`}
            title={isCollapsed ? "Logout" : undefined}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
