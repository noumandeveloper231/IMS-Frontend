import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/UI/button";
import { Download, ZoomIn, ZoomOut, X, Loader2 } from "lucide-react";
import { useImageModal } from "@/context/ImageModalContext";
import api from "@/utils/api";
import { toast } from "sonner";
import { checkImage } from "@/utils/imageUtils";

const isCloudinaryUrl = (url) =>
  typeof url === "string" && /^https:\/\/res\.cloudinary\.com\//i.test(url);

export function ImageModal() {
  const { open, setOpen, imageSrc, closeImageModal } = useImageModal();
  const [zoom, setZoom] = useState(70);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageValid, setImageValid] = useState(true);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Handle ESC + body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset everything when modal opens or src changes
  useEffect(() => {
    if (open) {
      setZoom(70);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
      setImageValid(true);

      // Check if image is valid
      if (imageSrc) {
        checkImage(imageSrc).then((isValid) => {
          setImageValid(isValid);
          if (!isValid) {
            setIsLoading(false);
            setHasError(true);
          }
        });
      }
    }
  }, [open, imageSrc]);

  const onClose = () => {
    setOpen(false);
    closeImageModal();
  };

  // Zoom via scroll
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -15 : 15;
    setZoom((prev) => Math.min(Math.max(prev + delta, 70), 150));
  };

  // Drag start
  const handleMouseDown = (e) => {
    if (zoom > 10) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  // Drag move
  const handleMouseMove = (e) => {
    if (isDragging && zoom > 10) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Download
  const handleDownload = async () => {
    if (!imageSrc || hasError) return;

    if (isCloudinaryUrl(imageSrc)) {
      setDownloading(true);
      try {
        const encoded = encodeURIComponent(imageSrc);
        const res = await api.get(`/images/download?url=${encoded}`, {
          responseType: "blob",
        });
        const disposition = res.headers["content-disposition"];
        const match = disposition?.match(/filename="?([^";\n]+)"?/);
        const filename = match ? match[1].trim() : "image.webp";
        const blob = new Blob([res.data]);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("Image downloaded");
      } catch (err) {
        let message = "Download failed";
        const data = err.response?.data;
        if (data instanceof Blob && data.type?.includes("json")) {
          try {
            const json = JSON.parse(await data.text());
            message = json.message || message;
          } catch {}
        } else if (typeof data?.message === "string") {
          message = data.message;
        }
        toast.error(message);
      } finally {
        setDownloading(false);
      }
      return;
    }

    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = imageSrc.split("/").pop() || "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const zoomIn = () => setZoom((prev) => Math.min(prev + 15, 150));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));

  const resetZoom = () => {
    setZoom(70);
    setPosition({ x: 0, y: 0 });
  };

  if (!open) return null;

  const showImage = imageSrc && !hasError && imageValid;
  const showFallback = !imageSrc || hasError || !imageValid;
  const displaySrc = showImage ? imageSrc : "/image_not_found.webp";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* TOP BAR */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={zoomOut}
            className="bg-white text-black hover:bg-gray-200"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span
            className="text-white text-sm min-w-[60px] text-center cursor-pointer"
            onClick={resetZoom}
          >
            {zoom}%
          </span>

          <Button
            size="sm"
            onClick={zoomIn}
            className="bg-white text-black hover:bg-gray-200"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-white text-sm truncate max-w-[40%]">
          {imageSrc ? "Image Preview" : "No Image"}
        </span>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!showImage || downloading}
            className="bg-white text-black hover:bg-gray-200"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Download
          </Button>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-white text-black hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* IMAGE AREA */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          onWheel={handleWheel}
        >
          {/* LOADING */}
          {isLoading && showImage && (
            <div className="text-white animate-pulse text-sm">
              Loading image...
            </div>
          )}

          {/* IMAGE */}
          {showImage && (
            <img
              ref={imageRef}
              src={displaySrc}
              alt="Image preview"
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="max-w-none transition-transform duration-100"
              style={{
                display: isLoading ? "none" : "block",
                transform: `scale(${zoom / 100}) translate(${position.x / (zoom / 100)}px, ${position.y / (zoom / 100)}px)`,
                cursor:
                  zoom > 10 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
              }}
              draggable={false}
            />
          )}

          {/* FALLBACK */}
          {showFallback && !isLoading && (
            <div className="text-white text-center">
              <p className="text-lg font-semibold">
                {imageSrc ? "Failed to load image" : "No image available"}
              </p>
              <p className="text-sm opacity-70">
                {imageSrc
                  ? "The image URL may be broken or inaccessible."
                  : "No image source was provided."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
