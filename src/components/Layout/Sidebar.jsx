import React, { useState, useRef, useEffect, useContext } from "react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Package,
  Tag,
  Layers,
  ClipboardList,
  Users,
  ShoppingCart,
  BarChart3,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeft,
  User,
  CreditCard,
  Bell,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/UI/scroll-area";
import { Button } from "@/components/UI/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/UI/collapsible";
import { AuthContext } from "@/context/AuthContext";
import { createPortal } from "react-dom";
import assets from "@/assets/assets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/UI/avatar";

const navItemClasses = (isActive, collapsed) =>
  `w-full rounded-md text-sm font-medium transition-all ${collapsed ? "justify-center p-2" : "justify-start gap-3 px-3 py-2"
  } ${isActive ? "font-semibold" : "font-normal"}`;

const subItemClasses = (isActive) =>
  `block rounded-md px-3 py-1.5 text-sm transition-colors ${isActive
    ? "bg-black text-white"
    : "text-slate-700 hover:bg-slate-100"
  }`;

const SectionLabel = ({ children, collapsed }) =>
  collapsed ? null : (
    <p className="px-3 pt-4 pb-1.5 text-[13px] font-normal text-gray-700 tracking-normal">
      {children}
    </p>
  );

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
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [purchasesAnchorRect, setPurchasesAnchorRect] = useState(null);
  const [poOpen, setPoOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const purchasesAnchorRef = useRef(null);
  const purchasesMenuRef = useRef(null);
  const sidebarRef = useRef(null);

  const isActive = (to, exact = false) =>
    exact ? pathname === to : pathname.startsWith(to);

  const { user, logout } = useContext(AuthContext);
  const handleLogout = () => {
    setIsCollapsed(false);
    logout();
    navigate("/login");
  };

  const togglePurchasesMenu = () => {
    if (isCollapsed && purchasesAnchorRef.current) {
      setPurchasesAnchorRect(purchasesAnchorRef.current.getBoundingClientRect());
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
    // Keep Purchases uncollapsed when on any purchase route; open PO/PR only when on their routes
    if (isPurchaseActive(pathname)) {
      setPurchasesOpen(true);
      const isOnPo =
        pathname === "/purchase-orders" ||
        pathname === "/purchaseorderslist" ||
        pathname.startsWith("/purchase-orders/") ||
        pathname.startsWith("/purchaseorderslist/");
      const isOnPr =
        pathname === "/purchase-receives" ||
        pathname === "/purchasereceiveslist" ||
        pathname.startsWith("/purchase-receives/") ||
        pathname.startsWith("/purchasereceiveslist/");
      setPoOpen(isOnPo);
      setPrOpen(isOnPr);
    } else {
      setPurchasesOpen(false);
      setPoOpen(false);
      setPrOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const anchorEl = purchasesAnchorRef.current;
      const menuEl = purchasesMenuRef.current;
      const sidebarEl = sidebarRef.current;

      if (
        !purchasesOpen ||
        !event.target ||
        (sidebarEl && sidebarEl.contains(event.target)) ||
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
      ref={sidebarRef}
      className={`hidden sm:flex h-screen flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ${isCollapsed ? "w-18" : "w-68"
        }`}
    >
      {/* Header: logo + brand (or logo only when collapsed) */}
      <div
        className={`flex items-center border-b border-gray-100 shrink-0 ${isCollapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4"
          }`}
      >
        <img src={assets.logo} alt="logo" className="w-7 h-7 shrink-0" />
        {!isCollapsed && (
          <h1 className="text-xl font-semibold truncate">Al Ramil</h1>
        )}
      </div>

      <ScrollArea className={`flex-1 py-4 overflow-y-auto no-scrollbar min-h-0 ${isCollapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-1">
          <div className="font-medium space-y-1">
            {/* 1. Overview */}
            <SectionLabel collapsed={isCollapsed}>Overview</SectionLabel>
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

            {/* 2. Catalog / Inventory Setup */}
            <SectionLabel collapsed={isCollapsed}>Inventory Setup</SectionLabel>
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

            {/* 3. Purchasing */}
            <SectionLabel collapsed={isCollapsed}>Purchasing</SectionLabel>
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
                <Collapsible open={purchasesOpen} onOpenChange={setPurchasesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant={isPurchaseActive(pathname) ? "default" : "ghost"}
                      className={`${navItemClasses(isPurchaseActive(pathname), false)} justify-between`}
                    >
                      <div className="flex items-center gap-3 justify-between w-full">
                        <span className="flex items-center gap-3">
                          <ShoppingBasket className="h-4 w-4 shrink-0" />
                          <span>Purchases</span>
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${purchasesOpen ? "rotate-90" : ""
                            }`}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-gray-300 pl-3 mr-5">
                      <Link to="/vendors">
                        <span
                          className={subItemClasses(isActive("/vendors", true))}
                        >
                          Vendors
                        </span>
                      </Link>

                      <Collapsible open={poOpen} onOpenChange={setPoOpen}>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                          >
                            <span>PO</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${poOpen ? "rotate-180" : ""
                                }`}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 space-y-0.5 border-l border-gray-300 pl-2">
                            <Link
                              to="/purchase-orders"
                            >
                              <span
                                className={subItemClasses(
                                  isActive("/purchase-orders", true)
                                )}
                              >
                                Add PO
                              </span>
                            </Link>
                            <Link
                              to="/purchaseorderslist"
                            >
                              <span
                                className={subItemClasses(
                                  isActive("/purchaseorderslist", true)
                                )}
                              >
                                List of PO
                              </span>
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible open={prOpen} onOpenChange={setPrOpen}>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                          >
                            <span>PR</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${prOpen ? "rotate-180" : ""
                                }`}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 space-y-0.5 border-l border-gray-300 pl-2">
                            <Link
                              to="/purchase-receives"
                            >
                              <span
                                className={subItemClasses(
                                  isActive("/purchase-receives", true)
                                )}
                              >
                                Add PR
                              </span>
                            </Link>
                            <Link
                              to="/purchasereceiveslist"
                            >
                              <span
                                className={subItemClasses(
                                  isActive("/purchasereceiveslist", true)
                                )}
                              >
                                List of PR
                              </span>
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Link to="/bills">
                        <span
                          className={subItemClasses(isActive("/bills", true))}
                        >
                          Bills
                        </span>
                      </Link>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* When sidebar is collapsed: show floating menu with Collapsible submenus */}
            {isCollapsed &&
              purchasesOpen &&
              purchasesAnchorRect &&
              createPortal(
                <div
                  ref={purchasesMenuRef}
                  className="fixed z-50"
                  style={{
                    top: purchasesAnchorRect.top,
                    left: purchasesAnchorRect.right + 2,
                  }}
                >
                  <div className="w-52 rounded-md border bg-white p-2 shadow-lg space-y-1">
                    <Link
                      to="/vendors"
                      onClick={() => {
                        setPurchasesOpen(false);
                      }}
                    >
                      <span
                        className={subItemClasses(isActive("/vendors", true))}
                      >
                        Vendors
                      </span>
                    </Link>

                    <Collapsible open={poOpen} onOpenChange={setPoOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                        >
                          <span>PO</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${poOpen ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-2 space-y-0.5">
                          <Link
                            to="/purchase-orders"
                            onClick={() => {
                              setPurchasesOpen(false);
                              setPoOpen(false);
                            }}
                          >
                            <span
                              className={subItemClasses(
                                isActive("/purchase-orders", true)
                              )}
                            >
                              Add PO
                            </span>
                          </Link>
                          <Link
                            to="/purchaseorderslist"
                            onClick={() => {
                              setPurchasesOpen(false);
                              setPoOpen(false);
                            }}
                          >
                            <span
                              className={subItemClasses(
                                isActive("/purchaseorderslist", true)
                              )}
                            >
                              List of PO
                            </span>
                          </Link>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible open={prOpen} onOpenChange={setPrOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
                        >
                          <span>PR</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${prOpen ? "rotate-180" : ""
                              }`}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-2 space-y-0.5">
                          <Link
                            to="/purchase-receives"
                            onClick={() => {
                              setPurchasesOpen(false);
                              setPrOpen(false);
                            }}
                          >
                            <span
                              className={subItemClasses(
                                isActive("/purchase-receives", true)
                              )}
                            >
                              Add PR
                            </span>
                          </Link>
                          <Link
                            to="/purchasereceiveslist"
                            onClick={() => {
                              setPurchasesOpen(false);
                              setPrOpen(false);
                            }}
                          >
                            <span
                              className={subItemClasses(
                                isActive("/purchasereceiveslist", true)
                              )}
                            >
                              List of PR
                            </span>
                          </Link>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Link
                      to="/bills"
                      onClick={() => setPurchasesOpen(false)}
                    >
                      <span
                        className={subItemClasses(isActive("/bills", true))}
                      >
                        Bills
                      </span>
                    </Link>
                  </div>
                </div>,
                document.body
              )}

            {/* 4. Sales */}
            <SectionLabel collapsed={isCollapsed}>Sales</SectionLabel>
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

            {/* 5. People / Management */}
            <SectionLabel collapsed={isCollapsed}>People / Management</SectionLabel>
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
          </div>
        </nav>
      </ScrollArea>

      {/* Footer: collapse + user profile dropdown */}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-1 text-left hover:bg-gray-100 transition-colors outline-none ${isCollapsed ? "justify-center px-2" : ""}`}
                title={isCollapsed ? "Account" : undefined}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user?.avatar || user?.image} alt="" />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                    {(user?.name || user?.username || "A").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {user?.name || user?.username || "Account"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user?.email || "—"}
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <ChevronsUpDown className="h-4 w-4 shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56 border border-gray-200 rounded-xl! shadow-lg">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user?.avatar || user?.image} alt="" />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                        {(user?.name || user?.username || "A").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">
                        {user?.name || user?.username || "Account"}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {user?.email || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-300!" />
              <DropdownMenuItem>
                <User className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-300!"  />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
