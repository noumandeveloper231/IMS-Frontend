import React, { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export function ImageUploadDropzone({
  onFileSelect,
  accept = "image/*",
  className,
  previewUrl,
  primaryLabel,
  secondaryLabel = "or click to browse",
  disabled = false,
  multiple = false,
  onReorderFrontFromIndex,
  // enhanced props for non-image uploads (e.g. excel/csv)
  label,
  description,
  type,
  maxSize,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files) => {
    if (!files || disabled) return

    const fileArray = Array.from(files)
    if (!fileArray.length) return

    const limitedFiles =
      typeof maxSize === "number"
        ? fileArray.filter((file) => file.size <= maxSize)
        : fileArray

    if (!limitedFiles.length) return

    if (multiple) {
      onFileSelect(limitedFiles)
    } else {
      onFileSelect(limitedFiles[0])
    }
  }

  const mainText =
    primaryLabel ??
    label ??
    (previewUrl ? "Change image" : type === "excel" ? "Drag & drop file" : "Drag & drop image")

  const secondaryText =
    description ?? secondaryLabel ?? "or click to browse"

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
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
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        disabled && "pointer-events-none opacity-50",
        !disabled && "cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:bg-muted/50",
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

      {previewUrl && accept.startsWith("image") ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="w-24 h-24 object-cover rounded-lg border mb-2"
        />
      ) : (
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
      )}

      <p className="text-sm font-medium">
        {mainText}
      </p>
      <p className="text-xs text-muted-foreground">
        {secondaryText}
      </p>
    </div>
  )
}