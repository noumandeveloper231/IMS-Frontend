import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { MediaUpload } from "./MediaUpload";
import { MediaGrid } from "./MediaGrid";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/UI/pagination";
import { mediaApi } from "@/api/media";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";

const MEDIA_QUERY_KEY = ["media"];

export function MediaGalleryModal({
  open,
  onOpenChange,
  onConfirm,
  multiple = false,
  title = "Select image",
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [selectedUrlsMap, setSelectedUrlsMap] = React.useState({}); // id -> url for confirm
  const limit = 30;

  React.useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: [...MEDIA_QUERY_KEY, page, limit, searchDebounced],
    queryFn: () => mediaApi.list({ page, limit, search: searchDebounced || undefined }),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData) => mediaApi.upload(formData),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
      toast.success("Images uploaded");
      if (Array.isArray(created) && created.length) {
        const ids = created.map((m) => m._id);
        setSelectedUrlsMap((prev) => {
          const next = { ...prev };
          created.forEach((m) => { next[m._id] = m.url; });
          return next;
        });
        setSelectedIds((prev) => [...prev, ...ids]);
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Upload failed");
    },
  });

  const handleUpload = (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    uploadMutation.mutate(formData);
  };

  const handleSelect = (ids) => {
    setSelectedIds(ids);
    setSelectedUrlsMap((prev) => {
      const next = { ...prev };
      (data?.items ?? []).forEach((m) => {
        if (ids.includes(m._id)) next[m._id] = m.url;
      });
      return next;
    });
  };

  const handleConfirm = () => {
    const result = selectedIds.map((id) => ({ _id: id, url: selectedUrlsMap[id] })).filter((r) => r.url);
    if (multiple) {
      onConfirm?.(result.length ? result : null);
    } else {
      onConfirm?.(result[0] || null);
    }
    setSelectedIds([]);
    setSelectedUrlsMap({});
    onOpenChange?.(false);
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-2">
            <MediaUpload
              onFilesSelect={handleUpload}
              disabled={uploadMutation.isPending}
              label="Upload"
            />
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MediaGrid
              items={items}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              multiple={multiple}
              className="flex-1"
            />
          )}
          {pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        onClick={() => setPage(p)}
                        isActive={page === p}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className={page >= pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Select {multiple && selectedIds.length ? `(${selectedIds.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
