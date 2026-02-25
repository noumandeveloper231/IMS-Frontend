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
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files) => {
    if (!files || !files[0] || disabled) return
    onFileSelect(files[0])
  }

  const mainText = primaryLabel ?? (previewUrl ? "Change image" : "Drag & drop image")

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
        if (!disabled) handleFiles(e.dataTransfer.files)
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
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {previewUrl ? (
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
        {secondaryLabel}
      </p>
    </div>
  )
}