import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/UI/button";
import { useImageModal } from "@/context/ImageModalContext";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const SCROLL_ZOOM_STEP = 0.1;

export function ImageModal() {
  const { open, setOpen, imageSrc, closeImageModal } = useImageModal();
  const [scale, setScale] = React.useState(1);
  const imageRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const handleZoomIn = () => setScale((s) => Math.min(MAX_ZOOM, s + ZOOM_STEP));
  const handleZoomOut = () => setScale((s) => Math.max(MIN_ZOOM, s - ZOOM_STEP));


  const handleDownload = () => {
    if (!imageSrc) return;
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = imageSrc.split("/").pop() || "image";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenChange = (next) => {
    setOpen(next);
    if (!next) {
      setScale(1);
      closeImageModal();
    }
  };

  React.useEffect(() => {
    if (open) setScale(1);
  }, [open]);

  // Non-passive wheel listener so we can preventDefault and zoom instead of scroll
  React.useEffect(() => {
    if (!open) return;
    let cleanup = () => {};
    const id = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const onWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -SCROLL_ZOOM_STEP : SCROLL_ZOOM_STEP;
        setScale((s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s + delta)));
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      cleanup = () => el.removeEventListener("wheel", onWheel);
    });
    return () => {
      cancelAnimationFrame(id);
      cleanup();
    };
  }, [open]);

  if (!imageSrc) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 flex flex-col outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => handleOpenChange(false)}
        >
          {/* Toolbar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-background/90 border-b border-border backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= MIN_ZOOM}
                className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= MAX_ZOOM}
                className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDownload}
                className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground opacity-90 hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Image area - scroll to zoom */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center overflow-auto p-4 pt-16 bg-black/40"
            style={{ overscrollBehavior: "none" }}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Full size preview"
              className="max-w-full max-h-full object-contain select-none transition-transform duration-150 ease-out"
              style={{ transform: `scale(${scale})` }}
              draggable={false}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
