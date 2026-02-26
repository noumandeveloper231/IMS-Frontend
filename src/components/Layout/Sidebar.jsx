import React, { useState, useRef, useEffect, useContext } from "react";
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
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/UI/scroll-area";
import { Button } from "@/components/UI/button";
import { AuthContext } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
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
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [purchasesAnchorRect, setPurchasesAnchorRect] = useState(null);
  const [poOpen, setPoOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const purchasesAnchorRef = useRef(null);
  const purchasesMenuRef = useRef(null);

  const isActive = (to, exact = false) =>
    exact ? pathname === to : pathname.startsWith(to);

  const { logout } = useContext(AuthContext);
  const handleLogout = () => {
    setIsCollapsed(false);
    logout();
    navigate("/login");
  };

  const togglePurchasesMenu = () => {
    if (purchasesAnchorRef.current) {
      const rect = purchasesAnchorRef.current.getBoundingClientRect();
      setPurchasesAnchorRect(rect);
    }
    setPurchasesOpen((prev) => {
      const next = !prev;
      if (!next) {
        setPoOpen(false);
        setPrOpen(false);
      }
      return next;
    });
  };

  useEffect(() => {
    // Close purchases and nested menus on route change
    setPurchasesOpen(false);
    setPoOpen(false);
    setPrOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const anchorEl = purchasesAnchorRef.current;
      const menuEl = purchasesMenuRef.current;

      if (
        !purchasesOpen ||
        !event.target ||
        (anchorEl && anchorEl.contains(event.target)) ||
        (menuEl && menuEl.contains(event.target))
      ) {
        return;
      }

      setPurchasesOpen(false);
      setPoOpen(false);
      setPrOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [purchasesOpen]);

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

            {/* Purchases: hover with portal-based floating menu */}
            <div ref={purchasesAnchorRef}>
              {isCollapsed ? (
                <Button
                  variant={isPurchaseActive(pathname) ? "default" : "ghost"}
                  className={navItemClasses(isPurchaseActive(pathname), true)}
                  title="Purchases"
                  onClick={togglePurchasesMenu}
                >
                  <ShoppingBasket className="h-4 w-4 shrink-0" />
                </Button>
              ) : (
                <Button
                  variant={isPurchaseActive(pathname) ? "default" : "ghost"}
                  className={`${navItemClasses(isPurchaseActive(pathname), false)} justify-between`}
                  onClick={togglePurchasesMenu}
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBasket className="h-4 w-4 shrink-0" />
                    <span>Purchases</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </Button>
              )}
            </div>

            {purchasesOpen && purchasesAnchorRect &&
              createPortal(
                <div
                  ref={purchasesMenuRef}
                  className="fixed z-50"
                  style={{
                    top: purchasesAnchorRect.top,
                    left: purchasesAnchorRect.right + 2,
                  }}
                >
                  <div className="w-52 rounded-md border bg-white p-2 shadow-lg space-y-2">
                    <Link to="/vendors">
                      <span className={subItemClasses(isActive("/vendors", true))}>
                        Vendors
                      </span>
                    </Link>

                    <div className="relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setPoOpen((open) => !open);
                          setPrOpen(false);
                        }}
                      >
                        <span>PO</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {poOpen && (
                        <div className="absolute left-full top-0 ml-3 z-50">
                          <div className="w-52 rounded-md border bg-white p-2 shadow-lg space-y-2">
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
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setPrOpen((open) => !open);
                          setPoOpen(false);
                        }}
                      >
                        <span>PR</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {prOpen && (
                        <div className="absolute left-full top-0 ml-2 z-50">
                          <div className="w-52 rounded-md border bg-white p-2 shadow-lg space-y-2">
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
                          </div>
                        </div>
                      )}
                    </div>

                    <Link to="/bills">
                      <span className={subItemClasses(isActive("/bills", true))}>Bills</span>
                    </Link>
                  </div>
                </div>,
                document.body
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
