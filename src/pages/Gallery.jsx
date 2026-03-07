import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useContext } from "react";
import { Input } from "@/components/UI/input";
import { MediaUpload } from "@/components/media/MediaUpload";
import { MediaGrid } from "@/components/media/MediaGrid";
import { useUploadQueue } from "@/context/UploadQueueContext";
import { useImageModal } from "@/context/ImageModalContext";
import { AuthContext } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";
import { Calendar } from "@/components/UI/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { DeleteModel } from "@/components/DeleteModel";
import { Button } from "@/components/UI/button";
import { mediaApi } from "@/api/media";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Search, Loader2, ImageIcon, CalendarIcon, Trash2, MousePointerClick, LayoutGrid, Download, FolderInput, Pencil, X, Upload } from "lucide-react";

const MEDIA_QUERY_KEY = ["media"];
const limit = 100;

const IMAGE_TYPES = /^image\//;
function getImageFiles(dataTransfer) {
  if (!dataTransfer?.files?.length) return [];
  return Array.from(dataTransfer.files).filter((f) => IMAGE_TYPES.test(f.type));
}

export default function Gallery() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useContext(AuthContext);
  const canUpload = currentUser?.permissions?.includes("media.upload");
  const canDelete = currentUser?.permissions?.includes("media.delete");
  const { uploadingItems, addUploads } = useUploadQueue();
  const { openImageModal } = useImageModal();
  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [dateRange, setDateRange] = React.useState(undefined);
  const [deleteId, setDeleteId] = React.useState(null);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [gridColumns, setGridColumns] = React.useState(4);
  const [sortOrder, setSortOrder] = React.useState("newest");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const loadMoreRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const dragCounterRef = React.useRef(0);
  const dropZoneRef = React.useRef(null);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const monthOptions = React.useMemo(() => {
    const opts = [{ value: "all", label: "All months" }];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      opts.push({ value: key, label: format(d, "MMMM yyyy") });
    }
    return opts;
  }, []);

  React.useEffect(() => {
    if (monthFilter === "all") return;
    const [y, m] = monthFilter.split("-").map(Number);
    setDateRange({
      from: new Date(y, m - 1, 1),
      to: new Date(y, m, 0),
    });
  }, [monthFilter]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...MEDIA_QUERY_KEY, limit, searchDebounced, startDate, endDate],
    queryFn: ({ pageParam = 1 }) =>
      mediaApi.list({
        page: pageParam,
        limit,
        search: searchDebounced || undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage?.pagination ?? {};
      if (page != null && totalPages != null && page < totalPages) return page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = React.useMemo(() => {
    const list = (data?.pages ?? []).flatMap((p) => p.items ?? []);
    return sortOrder === "oldest" ? [...list].reverse() : list;
  }, [data?.pages, sortOrder]);
  const totalCount = data?.pages?.[0]?.pagination?.total;
  const isUploading = uploadingItems.length > 0;

  const deleteMutation = useMutation({
    mutationFn: (id) => mediaApi.delete(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      toast.success("Image deleted");
      setDeleteId(null);
    },
    onError: (err) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "";
      const isPermissionDenied = status === 403 || /not allowed|forbidden|permission/i.test(msg);
      toast.error(isPermissionDenied ? "You don't have permission to delete media." : (msg || "Delete failed"));
      setDeleteId(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await mediaApi.delete(id, true);
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      toast.success(`${ids.length} image(s) deleted`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: (err) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "";
      const isPermissionDenied = status === 403 || /not allowed|forbidden|permission/i.test(msg);
      toast.error(isPermissionDenied ? "You don't have permission to delete media." : (msg || "Bulk delete failed"));
      setBulkDeleteOpen(false);
    },
  });

  const handleUpload = React.useCallback(
    (files) => {
      addUploads(files);
    },
    [addUploads],
  );

  const handleDragEnter = React.useCallback((e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragCounterRef.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = React.useCallback((e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = React.useCallback((e) => {
    e.preventDefault();
    const root = dropZoneRef.current;
    const related = e.relatedTarget;
    if (root && related && typeof root.contains === "function" && root.contains(related)) return;
    dragCounterRef.current = 0;
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (!canUpload) {
        toast.error("You don't have permission to upload media.");
        return;
      }
      if (isUploading) return;
      const files = getImageFiles(e.dataTransfer);
      if (files.length === 0) {
        toast.error("No image files to upload");
        return;
      }
      addUploads(files);
      toast.success(`${files.length} image(s) added to upload`);
    },
    [addUploads, canUpload, isUploading],
  );

  const handleDelete = React.useCallback((id) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = React.useCallback(() => {
    if (deleteId) deleteMutation.mutate(deleteId);
  }, [deleteId, deleteMutation]);

  const confirmBulkDelete = React.useCallback(() => {
    if (selectedIds.length > 0) bulkDeleteMutation.mutate([...selectedIds]);
  }, [selectedIds, bulkDeleteMutation]);

  const handleDownload = React.useCallback(async () => {
    const selectedItems = items.filter((i) => i._id && selectedIds.includes(i._id));
    if (selectedItems.length === 0) {
      toast.error("No images to download");
      return;
    }
    const getFilename = (item, index) => {
      const ext = item.format || (item.url?.match(/\.(\w+)(?:\?|$)/)?.[1]) || "jpg";
      const base = item.public_id || `image-${index + 1}`;
      return `${base}.${ext}`;
    };

    const doDownload = async () => {
      if (selectedItems.length === 1) {
        const item = selectedItems[0];
        const res = await fetch(item.url, { mode: "cors" });
        if (!res.ok) throw new Error("Failed to fetch image");
        const blob = await res.blob();
        saveAs(blob, getFilename(item, 0));
        return "Download started";
      }
      const zip = new JSZip();
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const res = await fetch(item.url, { mode: "cors" });
        if (!res.ok) continue;
        const blob = await res.blob();
        zip.file(getFilename(item, i), blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "gallery-images.zip");
      return "Zip download started";
    };

    setDownloading(true);
    toast.promise(
      doDownload().finally(() => setDownloading(false)),
      {
        loading: "Preparing download...",
        success: (msg) => msg,
        error: (err) => err?.message || "Download failed",
      }
    );
  }, [items, selectedIds]);

  const itemsByMonth = React.useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const d = item.createdAt ? new Date(item.createdAt) : new Date();
      const key = format(d, "yyyy-MM");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    const sections = keys.map((key) => {
      const date = new Date(key + "-01");
      return {
        label: format(date, "MMMM yyyy"),
        key,
        items: map.get(key),
      };
    });
    if (sections.length === 0 && uploadingItems.length > 0) {
      return [{ label: "Uploading", key: "_uploading", items: [] }];
    }
    return sections;
  }, [items, uploadingItems.length]);

  return (
    <div
      ref={dropZoneRef}
      className="relative min-h-[60vh]"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-page drop zone overlay - only when user can upload */}
      {canUpload && isDragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary rounded-none"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4 rounded-xl bg-background/95 shadow-xl px-10 py-8 border-2 border-primary">
            <Upload className="h-16 w-16 text-primary" />
            <p className="text-xl font-semibold text-foreground">Drop images here</p>
            <p className="text-sm text-muted-foreground">Release to upload to gallery</p>
          </div>
        </div>
      )}

    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            Media Gallery
          </h1>
        </header>

        {/* Row 1: Upload + Search */}
        <div className="flex flex-wrap items-center gap-3">
          {canUpload && (
            <MediaUpload
              onFilesSelect={handleUpload}
              disabled={isUploading}
              label={
                isUploading
                  ? `Uploading ${uploadingItems.filter((u) => u.status === "uploading").length} of ${uploadingItems.length}…`
                  : "Upload Image"
              }
            />
          )}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Row 2: Controls — Date Range, Sort, Month (left) | Grid (right) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  // size="sm"
                  className="min-w-[200px] justify-start px-2.5 font-normal text-left"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} – {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setMonthFilter("all");
                    setDateRange(range);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[150px] md:w-[160px] lg:w-[175px] whitespace-nowrap bg-white">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] whitespace-nowrap">
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={monthFilter}
              onValueChange={(v) => setMonthFilter(v)}
            >
              <SelectTrigger className="w-[150px] md:w-[160px] lg:w-[175px] whitespace-nowrap bg-white">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] whitespace-nowrap">
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={selectionMode ? "default" : "outline"}
              // size="sm"
              onClick={() => setSelectionMode((m) => !m)}
            >
              <MousePointerClick className="mr-2 h-4 w-4" />
              {selectionMode ? "Select: ON" : "Select"}
            </Button>
          </div>
          <Select
            value={String(gridColumns)}
            onValueChange={(v) => setGridColumns(Number(v))}
          >
            <SelectTrigger className="w-[100px] md:w-[110px] lg:w-[125px] whitespace-nowrap bg-white">
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                <SelectValue placeholder="Grid" />
              </span>
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)] whitespace-nowrap">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* When Selecting: N Selected | Download, Move, Edit, Delete | Clear */}
        <div
          className={cn(
            "grid overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
            selectedIds.length > 0 ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
          aria-hidden={selectedIds.length === 0}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-300 bg-muted/30 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {selectedIds.length} Selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Move coming soon")}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Edit coming soon")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Edit coming soon")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                  title={!canDelete ? "You don't have permission to delete media" : undefined}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 && uploadingItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-16 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchDebounced || startDate || endDate
                ? "No images match your filters."
                : "No images yet. Upload some to get started."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-8">
              {itemsByMonth.map((section, idx) => (
                <section key={section.key}>
                  <div className="flex items-center justify-between gap-2 mb-3 sticky top-0 bg-[#f5f7fb] dark:bg-gray-900 py-1 px-3 z-10">
                    <h2 className="text-lg font-semibold text-foreground">
                      {section.label}
                    </h2>
                    {section.key !== "_uploading" && section.items.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const sectionIds = section.items.map((i) => i._id).filter(Boolean);
                          setSelectedIds((prev) => {
                            const set = new Set(prev);
                            const allIn = sectionIds.every((id) => set.has(id));
                            if (allIn) sectionIds.forEach((id) => set.delete(id));
                            else sectionIds.forEach((id) => set.add(id));
                            return Array.from(set);
                          });
                        }}
                      >
                        Select month
                      </Button>
                    )}
                  </div>
                  <MediaGrid
                    uploadingItems={idx === 0 ? uploadingItems : []}
                    items={section.items}
                    selectedIds={selectedIds}
                    onSelect={setSelectedIds}
                    onDelete={canDelete ? handleDelete : undefined}
                    onViewImage={openImageModal}
                    multiple
                    selectionMode={selectionMode}
                    selectOnCardClick={false}
                    columns={gridColumns}
                    className="min-h-[280px]"
                  />
                </section>
              ))}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-6">
                {isFetchingNextPage && (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteModel
        title="Delete image"
        description="This will remove the image from the gallery and from Cloudinary. This action cannot be undone."
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onDelete={confirmDelete}
        loading={deleteMutation.isPending}
        confirmLabel="Delete"
      />

      <DeleteModel
        title={`Delete ${selectedIds.length} image(s)`}
        description="This will remove the selected images from the gallery and from Cloudinary. This action cannot be undone."
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onDelete={confirmBulkDelete}
        loading={bulkDeleteMutation.isPending}
        confirmLabel="Delete all"
      />
    </div>
    </div>
  );
}
