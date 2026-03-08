import * as React from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/UI/dialog";
import { Calendar } from "@/components/UI/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/UI/context-menu";
import { DeleteModel } from "@/components/DeleteModel";
import { Button } from "@/components/UI/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/UI/breadcrumb";
import { mediaApi } from "@/api/media";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Search, Loader2, ImageIcon, CalendarIcon, Trash2, MousePointerClick, LayoutGrid, Download, FolderInput, Pencil, X, Upload, FolderPlus, FolderOpen, ChevronRight, ChevronDown, Scissors, ClipboardPaste } from "lucide-react";

const MEDIA_QUERY_KEY = ["media"];
const limit = 100;

/** Max folder depth: main folder + 3 subfolders = 4 path segments */
const MAX_FOLDER_DEPTH = 4;
function getFolderDepth(path) {
  if (!path || typeof path !== "string") return 0;
  return path.trim().split("/").filter(Boolean).length;
}
/** True if we can create a subfolder under this path (new path would have depth <= MAX_FOLDER_DEPTH) */
function canHaveSubfolder(path) {
  return getFolderDepth(path) < MAX_FOLDER_DEPTH;
}

/** Flatten tree into list of { path, name, depth } for dropdown */
function flattenFolderTree(nodes, depth = 0) {
  const out = [];
  for (const node of nodes || []) {
    out.push({ path: node.path, name: node.name, depth });
    if (node.children?.length) out.push(...flattenFolderTree(node.children, depth + 1));
  }
  return out;
}

/** Build a tree from flat folder list (path-based). Each node: { path, name, children } */
function buildFolderTree(flatFolders) {
  const byPath = new Map();
  const roots = [];
  const sorted = [...(flatFolders || [])].sort((a, b) => (a.path || "").localeCompare(b.path || ""));
  for (const f of sorted) {
    const path = (f.path || "").trim();
    if (!path) continue;
    const node = { path, name: f.name || path.split("/").pop() || path, children: [] };
    byPath.set(path, node);
    const idx = path.lastIndexOf("/");
    if (idx <= 0) {
      roots.push(node);
    } else {
      const parentPath = path.slice(0, idx);
      const parent = byPath.get(parentPath);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  return roots;
}

const IMAGE_TYPES = /^image\//;
function getImageFiles(dataTransfer) {
  if (!dataTransfer?.files?.length) return [];
  return Array.from(dataTransfer.files).filter((f) => IMAGE_TYPES.test(f.type));
}

function FolderTreeItem({ node, depth, selectedFolder, onSelectFolder, expandedPaths, onToggleExpand, onDeleteFolder, canDelete }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedFolder === node.path;
  return (
    <div className="flex flex-col gap-0.5">
      <div
        style={{ paddingLeft: depth * 12 }}
        className="flex items-center gap-0.5 min-w-0 rounded-md group"
      >
        <button
          type="button"
          aria-expanded={hasChildren ? isExpanded : undefined}
          className="w-5 h-7 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"
          onClick={() => hasChildren && onToggleExpand(node.path)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectFolder(node.path)}
          className={cn(
            "flex-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors text-left min-w-0",
            isSelected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
          )}
        >
          <FolderInput className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {canDelete && onDeleteFolder && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(node.path); }}
            className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onDeleteFolder={onDeleteFolder}
              canDelete={canDelete}
            />
          ))}
        </>
      )}
    </div>
  );
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
  const [gridColumns, setGridColumns] = React.useState(localStorage.getItem("galleryGridColumns") ? Number(localStorage.getItem("galleryGridColumns")) : 4);
  const [sortOrder, setSortOrder] = React.useState("newest");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFolder = React.useMemo(() => {
    const f = searchParams.get("folder");
    return f != null && f !== "" ? decodeURIComponent(f) : null;
  }, [searchParams]);
  const setSelectedFolder = React.useCallback(
    (path) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (path) next.set("folder", encodeURIComponent(path));
          else next.delete("folder");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [parentFolderPath, setParentFolderPath] = React.useState(""); // parent for new folder
  const [expandedPaths, setExpandedPaths] = React.useState(() => new Set()); // sidebar tree expand
  const [clipboard, setClipboard] = React.useState(null); // { action: 'copy'|'cut', mediaIds: string[] } | null
  const [folderToDelete, setFolderToDelete] = React.useState(null); // path string when open
  const loadMoreRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const dragCounterRef = React.useRef(0);
  const dropZoneRef = React.useRef(null);
  
  const handleGridColumnsChange = React.useCallback((value) => {
    setGridColumns(value);
    localStorage.setItem("galleryGridColumns", value);
  }, []);

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
    queryKey: [...MEDIA_QUERY_KEY, limit, searchDebounced, startDate, endDate, selectedFolder ?? ""],
    queryFn: ({ pageParam = 1 }) =>
      mediaApi.list({
        page: pageParam,
        limit,
        search: searchDebounced || undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
        folder: selectedFolder || undefined,
      }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage?.pagination ?? {};
      if (page != null && totalPages != null && page < totalPages) return page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });

  const { data: foldersData } = useQuery({
    queryKey: ["media", "folders"],
    queryFn: () => mediaApi.listFolders(),
  });
  const folders = foldersData ?? [];
  /** Exclude default root path "gallery" so we don't show a duplicate "Gallery" folder next to "All images" */
  const DEFAULT_ROOT_PATH = "gallery";
  const foldersFiltered = React.useMemo(
    () => folders.filter((f) => f.path !== DEFAULT_ROOT_PATH),
    [folders]
  );
  const folderTree = React.useMemo(() => buildFolderTree(foldersFiltered), [foldersFiltered]);

  /** Direct children of current view: for "All" = root nodes; for a folder = folders whose path is selectedFolder + "/something" (one level deeper) */
  const directChildFolders = React.useMemo(() => {
    if (!selectedFolder) return folderTree;
    const prefix = selectedFolder.replace(/\/$/, "") + "/";
    const depth = selectedFolder.split("/").filter(Boolean).length;
    return foldersFiltered.filter(
      (f) => f.path && f.path.startsWith(prefix) && f.path.split("/").filter(Boolean).length === depth + 1
    );
  }, [selectedFolder, folderTree, foldersFiltered]);

  /** Breadcrumb segments: "All Images" then folder names only (skip "gallery" root so shows "All Images > Categories") */
  const breadcrumbSegments = React.useMemo(() => {
    const segments = [{ path: null, label: "All Images" }];
    if (!selectedFolder) return segments;
    const pathParts = selectedFolder.split("/").filter(Boolean);
    const folderMap = new Map((folders || []).map((f) => [f.path, f.name]));
    let acc = "";
    for (let i = 0; i < pathParts.length; i++) {
      acc = acc ? `${acc}/${pathParts[i]}` : pathParts[i];
      if (acc === "gallery") continue;
      const label = folderMap.get(acc) || pathParts[i];
      segments.push({ path: acc, label });
    }
    return segments;
  }, [selectedFolder, folders]);

  const toggleExpanded = React.useCallback((path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentPath }) => mediaApi.createFolder({ name, parentPath: parentPath || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setCreateFolderOpen(false);
      setNewFolderName("");
      setParentFolderPath("");
      toast.success("Folder created. It will appear on Cloudinary when you upload the first image.");
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to create folder";
      toast.error(msg);
    },
  });

  const moveToFolderMutation = useMutation({
    mutationFn: ({ mediaIds, folder }) => mediaApi.moveToFolder(mediaIds, folder),
    onSuccess: (_, { folder }) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      setSelectedIds([]);
      toast.success(`Moved to folder`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Move failed");
    },
  });

  const copyToFolderMutation = useMutation({
    mutationFn: ({ mediaIds, folder }) => mediaApi.copyToFolder(mediaIds, folder),
    onSuccess: (_, { folder }) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      toast.success("Copied to folder");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Copy failed");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (path) => mediaApi.deleteFolder(path, true),
    onSuccess: (_, path) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setFolderToDelete(null);
      const pathNorm = (path || "").toString().trim().replace(/\/$/, "");
      const isViewingDeletedOrSub =
        selectedFolder && (selectedFolder === pathNorm || selectedFolder.startsWith(pathNorm + "/"));
      if (isViewingDeletedOrSub) {
        const parentOfDeleted =
          pathNorm.includes("/") ? pathNorm.slice(0, pathNorm.lastIndexOf("/")) : null;
        setSelectedFolder(parentOfDeleted || null);
      }
    },
    onError: () => {
      setFolderToDelete(null);
    },
  });

  const cutIds = React.useMemo(
    () => (clipboard?.action === "cut" ? clipboard.mediaIds : []),
    [clipboard]
  );

  const handleCopy = React.useCallback((ids) => {
    if (!ids?.length) return;
    setClipboard({ action: "copy", mediaIds: [...ids] });
    toast.success("Copied. Paste in another folder with Ctrl+V or right-click.");
  }, []);

  const handleCut = React.useCallback((ids) => {
    if (!ids?.length) return;
    setClipboard({ action: "cut", mediaIds: [...ids] });
    toast.success("Cut. Paste in another folder with Ctrl+V or right-click.");
  }, []);

  const handlePaste = React.useCallback(() => {
    if (!clipboard?.mediaIds?.length) return;
    const targetFolder = selectedFolder || "gallery";
    if (clipboard.action === "cut") {
      moveToFolderMutation.mutate({ mediaIds: clipboard.mediaIds, folder: targetFolder });
      setClipboard(null);
    } else {
      copyToFolderMutation.mutate({ mediaIds: clipboard.mediaIds, folder: targetFolder });
      setClipboard(null);
    }
  }, [clipboard, selectedFolder, moveToFolderMutation, copyToFolderMutation]);

  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c") {
          e.preventDefault();
          if (selectedIds.length > 0) handleCopy(selectedIds);
        } else if (e.key === "x") {
          e.preventDefault();
          if (selectedIds.length > 0) handleCut(selectedIds);
        } else if (e.key === "v") {
          e.preventDefault();
          if (clipboard?.mediaIds?.length) handlePaste();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, clipboard, handleCopy, handleCut, handlePaste]);

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
      setDeleteId(null);
    },
    onError: () => {
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
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    },
    onError: () => {
      setBulkDeleteOpen(false);
    },
  });

  const handleUpload = React.useCallback(
    (files) => {
      addUploads(files, selectedFolder || undefined);
    },
    [addUploads, selectedFolder],
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
      addUploads(files, selectedFolder || undefined);
      toast.success(`${files.length} image(s) added to upload`);
    },
    [addUploads, canUpload, isUploading, selectedFolder],
  );

  const handleDelete = React.useCallback((id) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = React.useCallback(() => {
    if (!deleteId) return;
    const msg = (err) => {
      const status = err?.response?.status;
      const m = err?.response?.data?.message || err?.message || "";
      return status === 403 || /not allowed|forbidden|permission/i.test(m)
        ? "You don't have permission to delete media."
        : (m || "Delete failed");
    };
    toast.promise(deleteMutation.mutateAsync(deleteId), {
      loading: "Deleting image...",
      success: "Image deleted",
      error: msg,
    });
  }, [deleteId, deleteMutation]);

  const confirmBulkDelete = React.useCallback(() => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const msg = (err) => {
      const status = err?.response?.status;
      const m = err?.response?.data?.message || err?.message || "";
      return status === 403 || /not allowed|forbidden|permission/i.test(m)
        ? "You don't have permission to delete media."
        : (m || "Bulk delete failed");
    };
    toast.promise(bulkDeleteMutation.mutateAsync(ids), {
      loading: `Deleting ${ids.length} image(s)...`,
      success: `${ids.length} image(s) deleted`,
      error: msg,
    });
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

        <div className="flex gap-6 flex-1">
          {/* Folder sidebar */}
          <aside className="w-56 shrink-0 flex flex-col gap-2">
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-2 space-y-0.5">
              <button
                type="button"
                onClick={() => setSelectedFolder(null)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  selectedFolder === null
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                All images
              </button>
              {folderTree.map((node) => (
                <FolderTreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  expandedPaths={expandedPaths}
                  onToggleExpand={toggleExpanded}
                  onDeleteFolder={(path) => setFolderToDelete(path)}
                  canDelete={canDelete}
                />
              ))}
            </div>

            {canUpload && canHaveSubfolder(selectedFolder) && (
              <Button
                variant="outline"
                // size="sm"
                className="w-full justify-start gap-2 "
                onClick={() => {
                  setParentFolderPath(canHaveSubfolder(selectedFolder) ? selectedFolder || "" : "");
                  setCreateFolderOpen(true);
                }}
                disabled={createFolderMutation.isPending}
              >
                <FolderPlus className="h-4 w-4" />
                New folder
              </Button>
            )}
          </aside>

          <div className="flex-1 min-w-0 flex flex-col gap-6">
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
              type="button"
              variant={selectionMode ? "default" : "outline"}
              // size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectionMode((m) => !m);
              }}
            >
              <MousePointerClick className="mr-2 h-4 w-4" />
              {selectionMode ? "Select: ON" : "Select"}
            </Button>
          </div>
          <Select
            value={String(gridColumns)}
            onValueChange={(v) => handleGridColumnsChange(Number(v))}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move to folder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
                  {folders.length === 0 ? (
                    <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                  ) : (
                    flattenFolderTree(folderTree).map(({ path, name, depth }) => (
                      <DropdownMenuItem
                        key={path}
                        onClick={() => moveToFolderMutation.mutate({ mediaIds: [...selectedIds], folder: path })}
                        disabled={moveToFolderMutation.isPending}
                        style={{ paddingLeft: 12 + depth * 16 }}
                      >
                        {name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
        ) : (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="min-h-[200px] outline-none">
          <>
            {/* Breadcrumb — always show above folder area */}
            <Breadcrumb className="mt-4">
              <BreadcrumbList>
                {breadcrumbSegments.map((seg, i) => (
                  <React.Fragment key={seg.path ?? "all"}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {i === breadcrumbSegments.length - 1 ? (
                        <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            onClick={() => setSelectedFolder(seg.path)}
                            className="font-medium"
                          >
                            {seg.label}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Folder grid + New folder — show even when folder has no images */}
            {(directChildFolders.length > 0 || (canUpload && canHaveSubfolder(selectedFolder))) && (
              <div
                className="grid gap-x-2 gap-y-10 overflow-auto p-2 min-h-[120px]"
                style={
                  gridColumns >= 2 && gridColumns <= 10
                    ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {directChildFolders.map((node) => {
                  const path = node.path || "";
                  const name = node.name || path.split("/").pop() || path;
                  return (
                    <div key={path} className="relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedFolder(path)}
                      className="flex flex-col items-center justify-center gap-1 p-2 aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring w-full"
                    >
                      <FolderInput className="h-10 w-10 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground truncate w-full px-1 text-center">
                        {name}
                      </span>
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(path); }}
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-red-500/90 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete folder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    </div>
                  );
                })}
                {canUpload && canHaveSubfolder(selectedFolder) && (
                  <button
                    type="button"
                    onClick={() => {
                      setParentFolderPath(selectedFolder || "");
                      setCreateFolderOpen(true);
                    }}
                    disabled={createFolderMutation.isPending}
                    className="flex flex-col items-center justify-center gap-1 aspect-square rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    <FolderPlus className="h-10 w-10 text-primary" />
                    <span className="text-sm font-medium text-foreground">New folder</span>
                  </button>
                )}
              </div>
            )}

            {items.length === 0 && uploadingItems.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-16 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchDebounced || startDate || endDate
                    ? "No images match your filters."
                    : selectedFolder
                      ? "This folder is empty. Use \"New folder\" above to add subfolders, or upload images here. (The folder will appear on Cloudinary when you upload your first image.)"
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
                    onCopy={handleCopy}
                    onCut={handleCut}
                    cutIds={cutIds}
                    multiple
                    selectionMode={selectionMode}
                    selectOnCardClick={selectionMode}
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
          </>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              {clipboard?.mediaIds?.length > 0 && (
                <ContextMenuItem onClick={handlePaste}>
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste {clipboard.mediaIds.length} item{clipboard.mediaIds.length !== 1 ? "s" : ""} here
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        )}

      </div>
      </div>
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
        title="Delete folder"
        description="This will permanently delete this folder, all its subfolders, and all images inside them from the gallery and from Cloudinary. This action cannot be undone."
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        onDelete={() => {
          if (!folderToDelete) return;
          const path = folderToDelete;
          toast.promise(deleteFolderMutation.mutateAsync(path), {
            loading: "Deleting folder and its contents...",
            success: "Folder and all its images deleted",
            error: (err) => err?.response?.data?.message || err?.message || "Delete folder failed",
          });
        }}
        loading={deleteFolderMutation.isPending}
        confirmLabel="Delete folder"
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

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize images (max main folder + 3 subfolders). The folder will appear on Cloudinary when you upload the first image to it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="parent-folder" className="text-sm font-medium">
                Parent folder
              </label>
              <Select
                value={canHaveSubfolder(parentFolderPath) ? (parentFolderPath || "__root__") : "__root__"}
                onValueChange={(v) => setParentFolderPath(v === "__root__" ? "" : v)}
              >
                <SelectTrigger id="parent-folder" className="w-full">
                  <SelectValue placeholder="Top level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Top level</SelectItem>
                  {folders.filter((f) => canHaveSubfolder(f.path)).map((f) => (
                    <SelectItem key={f.path} value={f.path}>
                      {f.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                Folder name
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Events, Products"
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(),
                  newFolderName.trim() &&
                    createFolderMutation.mutate({ name: newFolderName.trim(), parentPath: parentFolderPath || undefined }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const name = newFolderName.trim();
                if (name)
                  createFolderMutation.mutate({ name, parentPath: parentFolderPath || undefined });
                else toast.error("Enter a folder name");
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
