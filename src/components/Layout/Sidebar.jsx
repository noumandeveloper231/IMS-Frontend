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
  Smartphone,
  UsersRound
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

const productPaths = ["/products"];
const isProductsActive = (pathname) =>
  productPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

const isManageProductsActive = (pathname) =>
  pathname === "/products" ||
  (pathname.startsWith("/products/") && !pathname.startsWith("/products/list"));

// Single config object: sections with items; items can be links (to) or collapsibles (subItems)
const SIDEBAR_CONFIG = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Inventory Setup",
    items: [
      { to: "/categories", label: "Categories", icon: Tag },
      { to: "/subcategories", label: "Subcategories", icon: Layers },
      { to: "/brands", label: "Brands", icon: ClipboardList },
      { to: "/conditions", label: "Conditions", icon: ShoppingBasket },
      {
        key: "products",
        label: "Products",
        icon: Package,
        activeType: "products",
        subItems: [
          { to: "/products/list", label: "Product list", exact: true },
          { to: "/products", label: "Manage Product", activeType: "manageProducts" },
        ],
      },
    ],
  },
  {
    label: "Purchasing",
    items: [
      {
        key: "purchases",
        label: "Purchases",
        icon: ShoppingBasket,
        activeType: "purchases",
        subItems: [
          { to: "/vendors", label: "Vendors", exact: true },
          {
            key: "po",
            label: "PO",
            subItems: [
              { to: "/purchase-orders", label: "Add PO", exact: true },
              { to: "/purchaseorderslist", label: "List of PO", exact: true },
            ],
          },
          {
            key: "pr",
            label: "PR",
            subItems: [
              { to: "/purchase-receives", label: "Add PR", exact: true },
              { to: "/purchasereceiveslist", label: "List of PR", exact: true },
            ],
          },
          { to: "/bills", label: "Bills", exact: true },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/sales", label: "POS", icon: ShoppingCart },
      { to: "/orders", label: "Orders", icon: ClipboardList },
    ],
  },
  {
    label: "People / Management",
    items: [
      { to: "/employees", label: "Employees", icon: Users },
      { to: "/customers", label: "Customers", icon: UsersRound },
    ],
  },
  {
    label: "Hardware",
    items: [
      { to: "/connected-devices", label: "Connected Devices", icon: Smartphone },
    ],
  },
];

const Sidebar = ({ onCollapseToggle }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({
    products: false,
    purchases: false,
    po: false,
    pr: false,
  });
  const [anchorRects, setAnchorRects] = useState({ products: null, purchases: null });
  const anchorRefs = useRef({ products: null, purchases: null });
  const menuRefs = useRef({ products: null, purchases: null });
  const sidebarRef = useRef(null);

  const isActive = (to, exact = false) =>
    exact ? pathname === to : pathname.startsWith(to);

  const getItemActive = (item) => {
    if (item.to) {
      return item.exact ? pathname === item.to : pathname.startsWith(item.to);
    }
    if (item.activeType === "products") return isProductsActive(pathname);
    if (item.activeType === "purchases") return isPurchaseActive(pathname);
    return false;
  };

  const getSubItemActive = (sub) => {
    if (sub.to) {
      if (sub.activeType === "manageProducts") return isManageProductsActive(pathname);
      return sub.exact ? pathname === sub.to : pathname.startsWith(sub.to);
    }
    return false;
  };

  const setMenuOpen = (key, value) => {
    setOpenMenus((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "purchases" && !value) {
        next.po = false;
        next.pr = false;
      }
      return next;
    });
  };

  const { user, logout } = useContext(AuthContext);
  const handleLogout = () => {
    setIsCollapsed(false);
    logout();
    navigate("/login");
  };

  const toggleCollapsibleMenu = (key) => {
    if (isCollapsed && anchorRefs.current[key]) {
      setAnchorRects((prev) => ({
        ...prev,
        [key]: anchorRefs.current[key].getBoundingClientRect(),
      }));
    }
    setMenuOpen(key, !openMenus[key]);
  };

  useEffect(() => {
    if (isPurchaseActive(pathname)) {
      setOpenMenus((prev) => ({
        ...prev,
        purchases: true,
        po:
          pathname === "/purchase-orders" ||
          pathname === "/purchaseorderslist" ||
          pathname.startsWith("/purchase-orders/") ||
          pathname.startsWith("/purchaseorderslist/"),
        pr:
          pathname === "/purchase-receives" ||
          pathname === "/purchasereceiveslist" ||
          pathname.startsWith("/purchase-receives/") ||
          pathname.startsWith("/purchasereceiveslist/"),
      }));
    } else {
      setOpenMenus((prev) => ({ ...prev, purchases: false, po: false, pr: false }));
    }
  }, [pathname]);

  useEffect(() => {
    if (isProductsActive(pathname)) {
      setOpenMenus((prev) => ({ ...prev, products: true }));
    }
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebarEl = sidebarRef.current;
      const target = event.target;
      ["products", "purchases"].forEach((key) => {
        if (!openMenus[key]) return;
        const anchorEl = anchorRefs.current[key];
        const menuEl = menuRefs.current[key];
        if (
          target &&
          !(sidebarEl && sidebarEl.contains(target)) &&
          !(anchorEl && anchorEl.contains(target)) &&
          !(menuEl && menuEl.contains(target))
        ) {
          setMenuOpen(key, false);
          if (key === "purchases") {
            setOpenMenus((prev) => ({ ...prev, po: false, pr: false }));
          }
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [openMenus.products, openMenus.purchases]);

  useEffect(() => {
    if (!sidebarRef.current || typeof ResizeObserver === "undefined") return;
    const el = sidebarRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      setIsCollapsed((prev) => {
        if (width <= 120 && !prev) return true;
        if (width >= 180 && prev) return false;
        return prev;
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render a single sub-item: link or nested collapsible
  const renderSubItem = (sub, parentKey, isFloating = false) => {
    if (sub.to) {
      const active = getSubItemActive(sub);
      return (
        <Link
          key={sub.to}
          to={sub.to}
          onClick={() => {
            if (isFloating && parentKey) setMenuOpen(parentKey, false);
          }}
        >
          <span className={subItemClasses(active)}>{sub.label}</span>
        </Link>
      );
    }
    if (sub.subItems) {
      const subKey = sub.key;
      const isOpen = openMenus[subKey];
      const onCloseParent = () => parentKey && setMenuOpen(parentKey, false);
      return (
        <Collapsible
          key={subKey}
          open={isOpen}
          onOpenChange={(open) => setOpenMenus((prev) => ({ ...prev, [subKey]: open }))}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-normal text-slate-700 hover:bg-slate-100"
            >
              <span>{sub.label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={isFloating ? "pl-2 space-y-0.5" : "ml-6 space-y-0.5 border-l border-gray-300 pl-2"}>
              {sub.subItems.map((leaf) =>
                leaf.to ? (
                  <Link
                    key={leaf.to}
                    to={leaf.to}
                    onClick={() => {
                      if (isFloating) {
                        onCloseParent();
                        setOpenMenus((prev) => ({ ...prev, [subKey]: false }));
                      }
                    }}
                  >
                    <span className={subItemClasses(getSubItemActive(leaf))}>
                      {leaf.label}
                    </span>
                  </Link>
                ) : null
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }
    return null;
  };

  // Render sub-items block (for expanded sidebar or floating menu)
  const renderSubItemsBlock = (subItems, parentKey, isFloating = false) => (
    <div className={isFloating ? "space-y-0.5" : "ml-6 mt-1 space-y-0.5 border-l border-gray-300 pl-3 mr-5"}>
      {subItems.map((sub) =>
        sub.to ? (
          <Link
            key={sub.to}
            to={sub.to}
            onClick={() => isFloating && parentKey && setMenuOpen(parentKey, false)}
          >
            <span className={subItemClasses(getSubItemActive(sub))}>{sub.label}</span>
          </Link>
        ) : (
          renderSubItem(sub, parentKey, isFloating)
        )
      )}
    </div>
  );

  // Floating menu content for a collapsible item (products or purchases)
  const renderFloatingMenu = (item) => {
    const key = item.key;
    if (!anchorRects[key] || !openMenus[key]) return null;
    return (
      <div
        ref={(el) => (menuRefs.current[key] = el)}
        className="fixed z-50"
        style={{
          top: anchorRects[key].top,
          left: anchorRects[key].right + 2,
        }}
      >
        <div className="w-52 rounded-md border bg-white p-2 space-y-1">
          {renderSubItemsBlock(item.subItems, key, true)}
        </div>
      </div>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={`hidden sm:flex h-screen flex-col border-r border-gray-200 bg-white transition-[width] duration-200`}
    >
      <div
        className={`flex items-center border-b border-gray-100 shrink-0 ${isCollapsed ? "justify-center px-0 py-4" : "gap-3 px-4 py-4"}`}
      >
        <img src={assets.logo} alt="logo" className="w-7 h-7 shrink-0" />
        {!isCollapsed && (
          <h1 className="text-xl font-semibold truncate">Al Ramil</h1>
        )}
      </div>

      <ScrollArea className={`flex-1 py-4 overflow-y-auto no-scrollbar min-h-0 ${isCollapsed ? "px-2" : "px-3"}`}>
        <nav className="space-y-1">
          <div className="font-medium space-y-1">
            {SIDEBAR_CONFIG.map((section) => (
              <React.Fragment key={section.label}>
                <SectionLabel collapsed={isCollapsed}>{section.label}</SectionLabel>
                {section.items.map((item) => {
                  // Link item
                  if (item.to) {
                    const active = getItemActive(item);
                    const Icon = item.icon;
                    return (
                      <Link key={item.to} to={item.to}>
                        <Button
                          variant={active ? "default" : "ghost"}
                          className={navItemClasses(active, isCollapsed)}
                          title={isCollapsed ? item.label : undefined}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          {!isCollapsed && <span>{item.label}</span>}
                        </Button>
                      </Link>
                    );
                  }
                  // Collapsible item with subItems
                  if (item.subItems) {
                    const key = item.key;
                    const active = getItemActive(item);
                    const Icon = item.icon;
                    const isOpen = openMenus[key];
                    return (
                      <div key={key} ref={(el) => (anchorRefs.current[key] = el)}>
                        {isCollapsed ? (
                          <Button
                            variant={active ? "default" : "ghost"}
                            className={navItemClasses(active, true)}
                            title={item.label}
                            onClick={() => toggleCollapsibleMenu(key)}
                          >
                            {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          </Button>
                        ) : (
                          <Collapsible open={isOpen} onOpenChange={(v) => setMenuOpen(key, v)}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant={active ? "default" : "ghost"}
                                className={`${navItemClasses(active, false)} justify-between`}
                              >
                                <div className="flex items-center gap-3 justify-between w-full">
                                  <span className="flex items-center gap-3">
                                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                    <span>{item.label}</span>
                                  </span>
                                  <ChevronRight
                                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                  />
                                </div>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {renderSubItemsBlock(item.subItems, null, false)}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </React.Fragment>
            ))}

            {/* Collapsed floating menus */}
            {isCollapsed &&
              SIDEBAR_CONFIG.flatMap((section) => section.items)
                .filter((item) => item.subItems && item.key)
                .map((item) =>
                  openMenus[item.key] && anchorRects[item.key]
                    ? createPortal(renderFloatingMenu(item), document.body)
                    : null
                )}
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
            onClick={() => {
              if (onCollapseToggle) {
                onCollapseToggle();
              } else {
                setIsCollapsed((c) => !c);
              }
            }}
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
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-300!" />
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
