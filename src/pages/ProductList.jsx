import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link, Router, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ChevronDown } from "lucide-react";
import api from "../utils/api";
import { Field } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Label } from "@/components/UI/label";
import { Checkbox } from "@/components/UI/checkbox";
import { Slider } from "@/components/UI/slider";
import { Card } from "@/components/UI/card";
import ProductCard from "@/components/ProductCard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/UI/collapsible";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator } from "@/components/UI/breadcrumb";
import { BreadcrumbLink } from "@/components/UI/breadcrumb";

const getRefName = (ref) => (ref && typeof ref === "object" ? ref.name : ref);

const PRODUCTS_PAGE_SIZE = 10;

const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PAGE_SIZE);
  const loadMoreRef = useRef(null);

  // Filter state
  const [filterStock, setFilterStock] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [filterCategoryIds, setFilterCategoryIds] = useState([]);
  const [filterSubcategoryIds, setFilterSubcategoryIds] = useState([]);
  const [filterBrandIds, setFilterBrandIds] = useState([]);
  const [filterConditionIds, setFilterConditionIds] = useState([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [conditionSearch, setConditionSearch] = useState("");

  // TanStack Query: fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorDetail,
  } = useQuery({
    queryKey: ["product-list"],
    queryFn: async () => {
      const res = await api.get("/products/getall");
      return res.data?.products ?? res.data ?? [];
    },
  });
  const products = productsData ?? [];

  // TanStack Query: filter options
  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await api.get("/categories/getall");
      return res.data?.categories ?? res.data ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const { data: subcategoriesData } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const res = await api.get("/subcategories/getall");
      return res.data?.subcategories ?? res.data ?? [];
    },
  });
  const subcategories = subcategoriesData ?? [];

  const { data: brandsData } = useQuery({
    queryKey: ["brands-list"],
    queryFn: async () => {
      const res = await api.get("/brands/getall");
      return res.data?.brands ?? res.data ?? [];
    },
  });
  const brands = brandsData ?? [];

  const { data: conditionsData } = useQuery({
    queryKey: ["conditions-list"],
    queryFn: async () => {
      const res = await api.get("/conditions/getall");
      return res.data?.conditions ?? res.data ?? [];
    },
  });
  const conditions = conditionsData ?? [];

  // Sync initial filters from URL query params: ?filterType=availability&filter=in-stock etc.
  useEffect(() => {
    const filterType = searchParams.get("filterType");
    const filter = searchParams.get("filter");
    if (!filterType || filter == null || filter === "") return;

    switch (filterType.toLowerCase()) {
      case "availability":
        if (filter === "in-stock") setFilterStock("in-stock");
        else if (filter === "out-of-stock" || filter === "out-stock") setFilterStock("out-of-stock");
        break;
      case "category":
        setFilterCategoryIds([filter]);
        break;
      case "subcategory":
        setFilterSubcategoryIds([filter]);
        break;
      case "brand":
        setFilterBrandIds([filter]);
        break;
      case "condition":
        setFilterConditionIds([filter]);
        break;
      default:
        break;
    }
  }, [searchParams]);

  // Price bounds from products
  const priceBounds = useMemo(() => {
    const prices = products
      .map((p) => Number(p.salePrice))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    if (prices.length === 0) return { min: 0, max: 100000 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  useEffect(() => {
    if (products.length > 0 && priceBounds.max > priceBounds.min) {
      setPriceRange((prev) => {
        if (prev[0] === 0 && prev[1] === 100000) return [priceBounds.min, priceBounds.max];
        return prev;
      });
    }
  }, [products.length, priceBounds.min, priceBounds.max]);

  // Reset visible count when filters change so infinite scroll restarts
  useEffect(() => {
    setVisibleCount(PRODUCTS_PAGE_SIZE);
  }, [filterStock, priceRange, filterCategoryIds, filterSubcategoryIds, filterBrandIds, filterConditionIds, searchTerm]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Stock
    if (filterStock === "in-stock") result = result.filter((p) => (p.quantity ?? 0) > 0);
    else if (filterStock === "out-of-stock") result = result.filter((p) => (p.quantity ?? 0) === 0);

    // Price
    const [pMin, pMax] = priceRange;
    result = result.filter((p) => {
      const price = Number(p.salePrice);
      if (Number.isNaN(price)) return false;
      return price >= pMin && price <= pMax;
    });

    // Category (multi)
    if (filterCategoryIds.length > 0) {
      result = result.filter((p) => {
        const catId = p.category?._id ?? p.category;
        return catId != null && filterCategoryIds.includes(String(catId));
      });
    }

    // Subcategory (multi)
    if (filterSubcategoryIds.length > 0) {
      result = result.filter((p) => {
        const subId = p.subcategory?._id ?? p.subcategory;
        return subId != null && filterSubcategoryIds.includes(String(subId));
      });
    }

    // Brand (multi)
    if (filterBrandIds.length > 0) {
      result = result.filter((p) => {
        const bId = p.brand?._id ?? p.brand;
        return bId != null && filterBrandIds.includes(String(bId));
      });
    }

    // Condition (multi)
    if (filterConditionIds.length > 0) {
      result = result.filter((p) => {
        const cId = p.condition?._id ?? p.condition;
        return cId != null && filterConditionIds.includes(String(cId));
      });
    }

    // Search
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter((item) => {
        const brandName = getRefName(item.brand);
        const categoryName = getRefName(item.category);
        const subName = getRefName(item.subcategory);
        return (
          item.title?.toLowerCase().includes(term) ||
          item.sku?.toLowerCase().includes(term) ||
          item.modelno?.toLowerCase().includes(term) ||
          (brandName && brandName.toLowerCase().includes(term)) ||
          (categoryName && categoryName.toLowerCase().includes(term)) ||
          (subName && subName.toLowerCase().includes(term))
        );
      });
    }

    return result;
  }, [
    products,
    searchTerm,
    filterStock,
    priceRange,
    filterCategoryIds,
    filterSubcategoryIds,
    filterBrandIds,
    filterConditionIds,
  ]);

  // Infinite scroll: show first visibleCount items
  const productsToShow = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );
  const hasMore = visibleCount < filteredProducts.length;

  // IntersectionObserver to load more when sentinel is in view
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleCount((prev) => prev + PRODUCTS_PAGE_SIZE);
  }, [hasMore]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "100px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const navigate = useNavigate();

  // Counts for filter options (from full product list)
  const {
    inStockCount,
    outStockCount,
    categoryCounts,
    subcategoryCounts,
    brandCounts,
    conditionCounts,
  } =
    useMemo(() => {
      const inStock = products.filter((p) => (p.quantity ?? 0) > 0).length;
      const outStock = products.filter((p) => (p.quantity ?? 0) === 0).length;
      const catCounts = {};
      const subcatCounts = {};
      const bCounts = {};
      const condCounts = {};
      products.forEach((p) => {
        const cid = p.category?._id ?? p.category;
        if (cid) catCounts[cid] = (catCounts[cid] || 0) + 1;
        const sid = p.subcategory?._id ?? p.subcategory;
        if (sid) subcatCounts[sid] = (subcatCounts[sid] || 0) + 1;
        const bid = p.brand?._id ?? p.brand;
        if (bid) bCounts[bid] = (bCounts[bid] || 0) + 1;
        const condId = p.condition?._id ?? p.condition;
        if (condId) condCounts[condId] = (condCounts[condId] || 0) + 1;
      });
      return {
        inStockCount: inStock,
        outStockCount: outStock,
        categoryCounts: catCounts,
        subcategoryCounts: subcatCounts,
        brandCounts: bCounts,
        conditionCounts: condCounts,
      };
    }, [products]);

  const hasActiveFilters =
    filterStock !== "all" ||
    priceRange[0] !== priceBounds.min ||
    priceRange[1] !== priceBounds.max ||
    filterCategoryIds.length > 0 ||
    filterSubcategoryIds.length > 0 ||
    filterBrandIds.length > 0 ||
    filterConditionIds.length > 0;

  const clearFilters = () => {
    setFilterStock("all");
    setPriceRange([priceBounds.min, priceBounds.max]);
    setFilterCategoryIds([]);
    setFilterSubcategoryIds([]);
    setFilterBrandIds([]);
    setFilterConditionIds([]);
    setSearchTerm("");
    setSearchParams({});
  };

  if (productsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Loading products…</p>
          <div className="mt-2 h-1 w-24 animate-pulse rounded bg-gray-200 mx-auto" />
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center text-red-700">
          <p className="font-medium">Failed to load products</p>
          <p className="mt-1 text-sm">{productsErrorDetail?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <Breadcrumb>
        <BreadcrumbList className="flex items-center gap-">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <span onClick={() => navigate(-1)} title="Go to home">
                <ArrowLeftIcon className="h-4 w-4 cursor-pointer" />
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" title="Go to home">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              Products list
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mx-auto mt-4 flex flex-col gap-6 bg-gray-50  lg:flex-row lg:items-start lg:gap-10 ">
        {/* Filter sidebar - sticky works when no ancestor has overflow (scroll is on App ScrollArea) */}
        <aside className="sticky top-4 z-10 w-full shrink-0 space-y-1 self-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:w-80 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Availability */}
          <Collapsible defaultOpen className="group border-b border-gray-100 pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-900 hover:text-gray-700">
              <span>Availability</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 hover:bg-gray-50">
                <Checkbox
                  checked={filterStock === "in-stock"}
                  onCheckedChange={(checked) => setFilterStock(checked ? "in-stock" : "all")}
                />
                <span className="text-sm text-gray-700">In stock ({inStockCount})</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 hover:bg-gray-50">
                <Checkbox
                  checked={filterStock === "out-of-stock"}
                  onCheckedChange={(checked) => setFilterStock(checked ? "out-of-stock" : "all")}
                />
                <span className="text-sm text-gray-700">Out of stock ({outStockCount})</span>
              </label>
            </CollapsibleContent>
          </Collapsible>

          {/* Price */}
          <Collapsible defaultOpen className="group border-b border-gray-100 pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-900 hover:text-gray-700">
              <span>Price</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <Slider
                min={priceBounds.min}
                max={priceBounds.max}
                step={1}
                value={priceRange}
                onValueChange={setPriceRange}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Field className="flex-1">
                  <Label className="text-xs text-gray-500">Min</Label>
                  <Input
                    type="number"
                    min={priceBounds.min}
                    max={priceRange[1]}
                    value={priceRange[0]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setPriceRange((prev) => [Math.min(v, prev[1]), prev[1]]);
                    }}
                    className="h-9 text-sm"
                  />
                </Field>
                <span className="text-gray-400">–</span>
                <Field className="flex-1">
                  <Label className="text-xs text-gray-500">Max</Label>
                  <Input
                    type="number"
                    min={priceRange[0]}
                    max={priceBounds.max}
                    value={priceRange[1]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v)) setPriceRange((prev) => [prev[0], Math.max(v, prev[0])]);
                    }}
                    className="h-9 text-sm"
                  />
                </Field>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collection / Category with nested subcategories */}
          <Collapsible defaultOpen className="group border-b border-gray-100 pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-900 hover:text-gray-700">
              <span className="w-15 sm:w-20 lg:w-25">Categories</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1 max-h-64 overflow-y-auto">
              {categories.map((c) => {
                const count = categoryCounts[c._id] ?? 0;
                if (count === 0) return null;

                const subcatsForCategory = subcategories.filter(
                  (s) => (s.category?._id ?? s.category) === c._id
                );
                const visibleSubcatsForCategory = subcatsForCategory.filter(
                  (s) => (subcategoryCounts[s._id] ?? 0) > 0
                );
                const categoryChecked = filterCategoryIds.includes(c._id);
                const anySubChecked = visibleSubcatsForCategory.some((s) =>
                  filterSubcategoryIds.includes(s._id)
                );
                const allSubChecked =
                  visibleSubcatsForCategory.length > 0 &&
                  visibleSubcatsForCategory.every((s) =>
                    filterSubcategoryIds.includes(s._id)
                  );

                const categoryCheckboxState = categoryChecked || allSubChecked
                  ? true
                  : anySubChecked
                    ? "indeterminate"
                    : false;

                return (
                  <Collapsible key={c._id} className="group/category rounded-md">
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-left text-sm font-medium text-gray-900 hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={categoryCheckboxState}
                          onCheckedChange={(checked) => {
                            setFilterCategoryIds((prev) =>
                              checked ? [...prev, c._id] : prev.filter((id) => id !== c._id)
                            );
                            const subIds = visibleSubcatsForCategory.map((s) => s._id);
                            setFilterSubcategoryIds((prev) => {
                              if (checked) {
                                const next = new Set(prev);
                                subIds.forEach((id) => next.add(id));
                                return Array.from(next);
                              }
                              return prev.filter((id) => !subIds.includes(id));
                            });
                          }}
                        />
                        <span className="text-sm text-gray-700">
                          {c.name} ({count})
                        </span>
                      </div>
                      {subcatsForCategory.length > 0 && (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform group-data-[state=open]/category:rotate-180" />
                      )}
                    </CollapsibleTrigger>
                    {visibleSubcatsForCategory.length > 0 && (
                      <CollapsibleContent className="pl-7 pr-1 pb-2 pt-1 space-y-1">
                        {visibleSubcatsForCategory.map((s) => {
                          const subCount = subcategoryCounts[s._id] ?? 0;
                          const subChecked = filterSubcategoryIds.includes(s._id);
                          return (
                            <label
                              key={s._id}
                              className="flex cursor-pointer items-center gap-2 rounded-md py-1 hover:bg-gray-50"
                            >
                              <Checkbox
                                checked={subChecked}
                                onCheckedChange={(checked) => {
                                  setFilterSubcategoryIds((prev) =>
                                    checked
                                      ? [...prev, s._id]
                                      : prev.filter((id) => id !== s._id)
                                  );
                                }}
                              />
                              <span className="text-xs text-gray-700">
                                {s.name} ({subCount})
                              </span>
                            </label>
                          );
                        })}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              })}
              {categories.length === 0 && (
                <p className="text-xs text-gray-500 py-1">No categories</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Brands */}
          <Collapsible defaultOpen className="group border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger className="flex items-center gap-2 py-2 text-left text-sm font-medium text-gray-900 hover:text-gray-700">
                <span className="w-15 sm:w-20 lg:w-25">Brands</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <Input
                type="text"
                placeholder="Search..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
            <CollapsibleContent className="pt-2 space-y-2 max-h-48 overflow-y-auto">
              {brands
                .filter((b) => {
                  const term = brandSearch.toLowerCase().trim();
                  if (!term) return true;
                  return b.name?.toLowerCase().includes(term);
                })
                .map((b) => {
                  const count = brandCounts[b._id] ?? 0;
                  const checked = filterBrandIds.includes(b._id);
                  if (count === 0) return null;
                  return (
                    <label
                      key={b._id}
                      className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(checked) => {
                          setFilterBrandIds((prev) =>
                            checked ? [...prev, b._id] : prev.filter((id) => id !== b._id)
                          );
                        }}
                      />
                      <span className="text-sm text-gray-700">{b.name} ({count})</span>
                    </label>
                  );
                })}
              {brands.length === 0 && (
                <p className="text-xs text-gray-500 py-1">No brands</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Conditions */}
          <Collapsible defaultOpen className="group pb-2">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger className="flex items-center gap-2 py-2 text-left text-sm font-medium text-gray-900 hover:text-gray-700">
                <span className="w-15 sm:w-20 lg:w-25">Condition</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <Input
                type="text"
                placeholder="Search..."
                value={conditionSearch}
                onChange={(e) => setConditionSearch(e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
            <CollapsibleContent className="pt-2 space-y-2 max-h-48 overflow-y-auto">
              {conditions
                .filter((c) => {
                  const term = conditionSearch.toLowerCase().trim();
                  if (!term) return true;
                  return c.name?.toLowerCase().includes(term);
                })
                .map((c) => {
                  const count = conditionCounts[c._id] ?? 0;
                  const checked = filterConditionIds.includes(c._id);
                  if (count === 0) return null;
                  return (
                    <label
                      key={c._id}
                      className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(checked) => {
                          setFilterConditionIds((prev) =>
                            checked ? [...prev, c._id] : prev.filter((id) => id !== c._id)
                          );
                        }}
                      />
                      <span className="text-sm text-gray-700">{c.name} ({count})</span>
                    </label>
                  );
                })}
              {conditions.length === 0 && (
                <p className="text-xs text-gray-500 py-1">No conditions</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                Product list
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                All products. Use the sidebar and search to narrow results.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                Showing {productsToShow.length} of {filteredProducts.length} products
              </span>
            </div>
          </div>

          {/* Search + grid */}
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Search by title, SKU, model, brand, or category.
              </div>
              <div className="w-full sm:w-80">
                <Field>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                  <p className="font-medium">No products found</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try changing filters or your search term.
                  </p>
                </div>
              ) : (
                <>
                  {productsToShow.map((item) => (
                    <ProductCard
                      key={item._id ?? item.id ?? item.sku}
                      item={item}
                      brandName={getRefName(item.brand)}
                      categoryName={getRefName(item.category)}
                      conditionName={getRefName(item.condition)}
                    />
                  ))}
                  {/* Sentinel for infinite scroll */}
                  {hasMore && (
                    <div
                      ref={loadMoreRef}
                      className="col-span-full flex justify-center py-6"
                      aria-hidden
                    >
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
