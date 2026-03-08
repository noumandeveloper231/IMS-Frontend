import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Loader2, Trash2, Eye, Copy, Scissors } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/UI/context-menu";
import { Checkbox } from "@/components/UI/checkbox";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/UI/tooltip";
/**
 * Build Cloudinary URL with optional transform (e.g. w_400,h_400,c_fill for thumbnails).
 */
export function getMediaUrl(url, transform) {
  if (!url || typeof url !== "string") return "";
  if (!transform) return url;
  const match = url.match(/^(.+\/upload\/)(v\d+\/)(.+)$/);
  if (!match) return url;
  const [, base, version, path] = match;
  return `${base}${transform}/${version}${path}`;
}

export function MediaGrid({
  items = [],
  uploadingItems = [],
  selectedIds = [],
  onSelect,
  onDelete,
  onViewImage,
  onCopy,
  onCut,
  cutIds = [],
  multiple = false,
  selectionMode = false,
  /** When true, clicking the card toggles selection (e.g. import modal). When false, only checkbox toggles (e.g. Gallery page). */
  selectOnCardClick = true,
  thumbnailTransform = "w_200,h_200,c_fill",
  columns,
  className,
}) {
  const cutSet = React.useMemo(() => new Set(cutIds || []), [cutIds]);
  const [hoveredId, setHoveredId] = React.useState(null);
  const gridStyle = columns != null && columns >= 2 && columns <= 10
    ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
    : undefined;
  const gridClass = columns == null ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6" : "";

  const toggle = (id, e) => {
    if (e) e.stopPropagation();
    if (!onSelect) return;
    if (multiple) {
      const set = new Set(selectedIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      onSelect(Array.from(set));
    } else {
      onSelect(selectedIds.includes(id) ? [] : [id]);
    }
  };

  const handleCardClick = (id, e) => {
    if (!onSelect) return;
    if (e.detail === 2) return;
    if (selectOnCardClick) toggle(id, e);
  };

  const handleCardDoubleClick = (id, e) => {
    e.preventDefault();
    if (!selectOnCardClick && onViewImage) {
      const item = items.find((i) => i._id === id);
      if (item) onViewImage(item.url || getMediaUrl(item.url, thumbnailTransform));
    }
  };

  const cardClass = cn(
    "relative aspect-square rounded-lg border-2 overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
    onDelete ? "border-transparent hover:border-muted-foreground/30" : ""
  );

  return (
    <div
      className={cn(
        "grid gap-x-2 gap-y-10 overflow-auto p-2 min-h-[200px]",
        gridClass,
        className
      )}
      style={gridStyle}
    >
      {/* Uploading cards: preview + loading overlay */}
      {uploadingItems.map((up) => {
        const src = up.status === "done" && up.media?.url
          ? getMediaUrl(up.media.url, thumbnailTransform)
          : up.previewUrl;
        return (
          <div
            key={up.key}
            className={cn(
              cardClass,
              !onSelect && "cursor-default"
            )}
          >
            <img
              src={src}
              alt="Uploading"
              className="w-full h-full object-cover"
            />
            {up.status === "uploading" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </span>
            )}
          </div>
        );
      })}
      {/* Server items */}
      {items.map((item) => {
        const id = item._id;
        const isSelected = onSelect && selectedIds.includes(id);
        const isCut = cutSet.has(id);
        const showCheckbox = onSelect && (hoveredId === id || isSelected) && (!selectOnCardClick || selectionMode);
        const src = getMediaUrl(item.url, thumbnailTransform);
        const fullUrl = item.url || src;
        const inUse = item.inUse === true;

        const card = (
          <div
            key={id}
            className={cn(
              cardClass,
              isSelected && "border-primary ring-2 ring-primary",
              isCut && "opacity-50",
              onSelect && (selectOnCardClick ? "cursor-pointer" : "cursor-default")
            )}
            onClick={(e) => handleCardClick(id, e)}
            onDoubleClick={(e) => handleCardDoubleClick(id, e)}
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img
              src={src}
              alt={item.alt || item.public_id || "Media"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Subtle black overlay only in modal (selectOnCardClick) mode */}
            {isSelected && selectOnCardClick && (
              <div className="absolute inset-0 bg-black/30 z-[1]" aria-hidden />
            )}
            {showCheckbox && (
              <div
                className="absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded border-0 bg-background/90 shadow"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(id)}
                  className="h-5 w-5 rounded border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  aria-label={isSelected ? "Deselect" : "Select"}
                />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1">
              {inUse && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"
                        title="In use by a record"
                        aria-hidden
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      In use by a record
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

              )}
              {onDelete && !onViewImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                  className="p-1.5 rounded-md bg-red-500/90 text-white hover:bg-red-600 shadow transition-colors"
                  aria-label="Delete image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Black circle tick in center when selected */}
            {isSelected && (
              <span
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white shadow-lg">
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </span>
              </span>
            )}
          </div>
        );

        if (onViewImage || onDelete || onCopy || onCut) {
          return (
            <ContextMenu key={id}>
              <ContextMenuTrigger asChild>{card}</ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                {onViewImage && (
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewImage(fullUrl);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View full size
                  </ContextMenuItem>
                )}
                {onCopy && (
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(selectedIds.includes(id) ? selectedIds : [id]);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </ContextMenuItem>
                )}
                {onCut && (
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCut(selectedIds.includes(id) ? selectedIds : [id]);
                    }}
                  >
                    <Scissors className="mr-2 h-4 w-4" />
                    Cut
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(fullUrl);
                      toast.success("Link copied to clipboard");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </ContextMenuItem>
                {onDelete && (
                  <ContextMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(id);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        }

        return card;
      })}
    </div>
  );
}
