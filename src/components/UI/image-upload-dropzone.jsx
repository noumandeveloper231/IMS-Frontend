import React, { useRef, useState, useCallback, useMemo } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

export const ImageUploadDropzone = React.memo(function ImageUploadDropzone({
  onFileSelect,
  accept = "image/*",
  className,
  previewUrl,
  showPreview = false,
  previewUrls = [],
  onRemove,
  onReorder,
  primaryLabel,
  secondaryLabel = "or click to browse",
  disabled = false,
  multiple = false,
  limit = 6,
  onReorderFrontFromIndex,
  label,
  description,
  type,
  maxSize,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragImageIndex, setDragImageIndex] = useState(null)

  // Derived state memoized
  const hasMultiplePreviews = useMemo(
    () => multiple && Array.isArray(previewUrls) && previewUrls.length > 0,
    [multiple, previewUrls]
  )
  const hasSinglePreview = useMemo(
    () => !hasMultiplePreviews && previewUrl && accept.startsWith("image"),
    [hasMultiplePreviews, previewUrl, accept]
  )
  const showPreviewsOutside = useMemo(
    () => showPreview && (hasSinglePreview || hasMultiplePreviews),
    [showPreview, hasSinglePreview, hasMultiplePreviews]
  )
  const list = useMemo(
    () => (hasMultiplePreviews ? previewUrls : hasSinglePreview ? [previewUrl] : []),
    [hasMultiplePreviews, previewUrls, hasSinglePreview, previewUrl]
  )

  // File handling
  const handleFiles = useCallback(
    (files) => {
      if (!files || disabled) return
      let fileArray = Array.from(files)
      if (!fileArray.length) return

      if (typeof maxSize === "number") {
        fileArray = fileArray.filter((f) => f.size <= maxSize)
      }
      if (!fileArray.length) return

      const capped = multiple && limit > 0 ? fileArray.slice(0, limit) : fileArray
      multiple ? onFileSelect(capped) : onFileSelect(capped[0])
    },
    [disabled, limit, maxSize, multiple, onFileSelect]
  )

  // Drag & drop
  const handleThumbnailDragOver = useCallback((e) => e.preventDefault(), [])
  const handleThumbnailDrop = useCallback(
    (dropIndex) => {
      if (dragImageIndex === null || dragImageIndex === dropIndex || !onReorder) return
      onReorder(dragImageIndex, dropIndex)
      setDragImageIndex(null)
    },
    [dragImageIndex, onReorder]
  )

  const handleDropZoneDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const draggedIndex = e.dataTransfer.getData("text/image-index")
      if (draggedIndex !== "" && draggedIndex != null && onReorderFrontFromIndex) {
        const indexNum = Number(draggedIndex)
        if (!Number.isNaN(indexNum)) {
          onReorderFrontFromIndex(indexNum)
          return
        }
      }

      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles, onReorderFrontFromIndex]
  )

  // Main texts memoized
  const mainText = useMemo(
    () =>
      primaryLabel ?? label ?? (previewUrl || list.length > 0 ? "Change image" : type === "excel" ? "Drag & drop file" : "Drag & drop image"),
    [primaryLabel, label, previewUrl, list.length, type]
  )
  const secondaryText = useMemo(() => description ?? secondaryLabel ?? "or click to browse", [description, secondaryLabel])

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropZoneDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          disabled && "pointer-events-none opacity-50",
          !disabled && "cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/50",
          className
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />

        {list.length > 0 && accept.startsWith("image") ? (
          <div className="relative inline-block mb-2">
            <img
              src={list[0]}
              alt="Primary"
              className="w-24 h-24 object-contain rounded-lg border border-[#cdcdcd] bg-white"
            />
            {hasMultiplePreviews && (
              <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 text-white text-[10px] py-0.5 text-center">
                Primary
              </span>
            )}
          </div>
        ) : !showPreviewsOutside && previewUrl && accept.startsWith("image") ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-24 h-24 object-contain rounded-lg border border-[#cdcdcd] mb-2"
          />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        )}

        <p className="text-sm font-medium">{mainText}</p>
        <p className="text-xs text-muted-foreground">{secondaryText}</p>
      </div>

      {showPreviewsOutside && list.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {list.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable={hasMultiplePreviews}
              onDragStart={(e) => {
                if (hasMultiplePreviews) {
                  e.dataTransfer.setData("text/image-index", String(index))
                  setDragImageIndex(index)
                }
              }}
              onDragEnd={() => setDragImageIndex(null)}
              onDragOver={handleThumbnailDragOver}
              onDrop={() => hasMultiplePreviews && handleThumbnailDrop(index)}
              className={cn(
                "relative w-24 h-24 flex shrink-0 rounded-lg border border-[#cdcdcd] bg-white",
                hasMultiplePreviews && "cursor-move"
              )}
            >
              <img src={url} alt={hasMultiplePreviews ? `Image ${index + 1}` : "Preview"} className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove?.(hasMultiplePreviews ? index : undefined)
                }}
                className="absolute -top-2 -right-2 z-100 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/95 text-white hover:bg-red-500"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
              {hasMultiplePreviews && index === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
