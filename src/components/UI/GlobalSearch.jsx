import * as React from "react";
import {
  Search,
  Package,
  Tag,
  Layers,
  ClipboardList,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronRight,
  X,
  Receipt,
  Truck,
  FileText,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogClose } from "@/components/UI/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/UI/input-group";
import { Kbd } from "@/components/UI/kbd";
import { cn } from "@/lib/utils";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";

const searchCategories = [
  { id: "products", label: "Products", icon: Package, color: "text-blue-600" },
  { id: "categories", label: "Categories", icon: Tag, color: "text-green-600" },
  {
    id: "subcategories",
    label: "Subcategories",
    icon: Layers,
    color: "text-purple-600",
  },
  {
    id: "brands",
    label: "Brands",
    icon: ClipboardList,
    color: "text-orange-600",
  },
  {
    id: "conditions",
    label: "Conditions",
    icon: Package,
    color: "text-cyan-600",
  },
  { id: "users", label: "Users", icon: Users, color: "text-pink-600" },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    color: "text-indigo-600",
  },
  {
    id: "vendors",
    label: "Vendors",
    icon: Truck,
    color: "text-amber-600",
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    color: "text-rose-600",
  },
  { id: "sales", label: "Sales", icon: Receipt, color: "text-emerald-600" },
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    icon: FileText,
    color: "text-blue-700",
  },
  {
    id: "purchase-receives",
    label: "Purchase Receives",
    icon: Truck,
    color: "text-teal-600",
  },
  { id: "bills", label: "Bills", icon: FileText, color: "text-violet-600" },
  {
    id: "refunds",
    label: "Refunds",
    icon: RotateCcw,
    color: "text-red-600",
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: DollarSign,
    color: "text-orange-700",
  },
  { id: "orders", label: "Orders", icon: ShoppingCart, color: "text-red-600" },
  { id: "reports", label: "Reports", icon: BarChart3, color: "text-teal-600" },
  { id: "settings", label: "Settings", icon: Settings, color: "text-gray-600" },
];

const modulePaths = {
  products: "/products/list",
  categories: "/categories",
  subcategories: "/subcategories",
  brands: "/brands",
  conditions: "/conditions",
  users: "/users",
  customers: "/customers",
  vendors: "/vendors",
  employees: "/employees",
  sales: "/orders",
  "purchase-orders": "/purchaseorderslist",
  "purchase-receives": "/purchasereceiveslist",
  bills: "/bills",
  refunds: "/orders",
  expenses: "/expenses",
  orders: "/orders",
  reports: "/reports",
  settings: "/settings",
};

const RECENT_SEARCHES_KEY = "globalSearchRecentQueries";
const RECENT_SEARCHES_LIMIT = 10;

function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentSearches, setRecentSearches] = React.useState([]);
  const [animatedPlaceholder, setAnimatedPlaceholder] = React.useState("");
  const inputRef = React.useRef(null);
  const navigate = useNavigate();

  const placeholderTips = [
    "Type / to find modules",
    "Search products, users, orders...",
    "Try /products for quick access",
    "Press Ctrl + K to open search",
    "Find anything in seconds",
  ];
  const [currentTipIndex, setCurrentTipIndex] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(RECENT_SEARCHES_KEY) || "[]",
      );
      if (Array.isArray(stored)) {
        setRecentSearches(stored.filter((s) => typeof s === "string"));
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  // Animated placeholder effect - slide up with fade
  React.useEffect(() => {
    let timeoutId;

    const cycleTips = () => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % placeholderTips.length);
        setIsVisible(true);
      }, 300);
    };

    // Initial show
    timeoutId = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Cycle every 3.5 seconds
    const intervalId = setInterval(cycleTips, 3500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + Math.max(results.length, 1)) %
            Math.max(results.length, 1),
        );
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex, onOpenChange]);

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);
    setSelectedIndex(0);

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    if (searchQuery.trim().startsWith("/")) {
      const moduleTerm = searchQuery.trim().slice(1).toLowerCase();
      const moduleMatches = searchCategories.filter((cat) =>
        moduleTerm
          ? cat.label.toLowerCase().includes(moduleTerm) ||
            cat.id.toLowerCase().includes(moduleTerm)
          : true,
      );
      setResults(
        moduleMatches.map((cat) => ({
          id: `module-${cat.id}`,
          category: cat.id,
          title: cat.label,
          description: `Open ${cat.label} module`,
          path: modulePaths[cat.id] || "/",
          noHighlight: true,
        })),
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get("/search", { params: { q: searchQuery } });
      setResults(res.data || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const persistRecentSearch = React.useCallback(
    (value) => {
      const normalized = (value || "").trim();
      if (!normalized) return;
      const next = [
        normalized,
        ...recentSearches.filter((item) => item !== normalized),
      ].slice(0, RECENT_SEARCHES_LIMIT);
      setRecentSearches(next);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    },
    [recentSearches],
  );

  const handleResultClick = (result) => {
    persistRecentSearch(query);
    onOpenChange(false);
    if (result.path) {
      const hasHighlightAlready = /[?&]highlight=/.test(result.path);
      const isDetailRoute = /^\/[^/?]+\/[^/?]+$/.test(result.path);
      const canAddHighlight =
        !hasHighlightAlready &&
        !isDetailRoute &&
        !result.noHighlight &&
        Boolean(result.id);

      const targetPath = canAddHighlight
        ? `${result.path}${result.path.includes("?") ? "&" : "?"}highlight=${result.id}`
        : result.path;

      navigate(targetPath);
    }
  };

  const groupedResults = React.useMemo(() => {
    const grouped = {};
    searchCategories.forEach((cat) => {
      grouped[cat.id] = results.filter((r) => r.category === cat.id);
    });
    return grouped;
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButton={false}
        className="fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl p-0 overflow-hidden"
      >
        <div className="flex flex-col max-h-[80vh]">
          {/* Search Header */}
          <div className="flex items-center gap-2 border-b border-gray-200 p-4 relative">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupInput
                ref={inputRef}
                placeholder=""
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="text-base"
              />
              <InputGroupAddon align="inline-end">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            {!query && (
              <div
                className={cn(
                  "absolute left-13 right-16 pointer-events-none transition-all duration-300 ease-in-out",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2",
                )}
              >
                <span className="text-gray-400 text-base">
                  {placeholderTips[currentTipIndex]}
                </span>
              </div>
            )}
            <DialogClose asChild>
              <button
                type="button"
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {!query ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-medium">
                  Search for anything
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Use keyboard shortcut <Kbd>⌘</Kbd> <Kbd>K</Kbd> to open
                </p>
                {recentSearches.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                      Recent searches
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {recentSearches.map((recent) => (
                        <button
                          key={recent}
                          type="button"
                          onClick={() => handleSearch(recent)}
                          className="px-2.5 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                        >
                          {recent}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {searchCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const queryWithSlash = `/${cat.id}`;
                          setQuery(queryWithSlash);
                          handleSearch(queryWithSlash);
                        }}
                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Icon className={cn("h-4 w-4", cat.color)} />
                        <span className="text-sm text-gray-700">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">No results found for "{query}"</p>
              </div>
            ) : (
              <div className="p-2">
                {searchCategories.map((cat) => {
                  const categoryResults = groupedResults[cat.id];
                  if (!categoryResults || categoryResults.length === 0)
                    return null;

                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="mb-4">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <Icon className={cn("h-3 w-3", cat.color)} />
                        {cat.label}
                      </div>
                      {categoryResults.map((result, idx) => (
                        <button
                          key={result.id || idx}
                          type="button"
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
                            selectedIndex === results.indexOf(result)
                              ? "bg-gray-100"
                              : "hover:bg-gray-50",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd>
                  to select
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>esc</Kbd>
                  to close
                </span>
              </div>
              {results.length > 0 && <span>{results.length} results</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { GlobalSearch };
