import React, { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/utils"

export function ImageUploadDropzone({
  onFileSelect,
  accept = "image/*",
  className,
  previewUrl,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files) => {
    if (!files || !files[0]) return
    onFileSelect(files[0])
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
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
        {previewUrl ? "Change image" : "Drag & drop image"}
      </p>
      <p className="text-xs text-muted-foreground">
        or click to browse
      </p>
    </div>
  )
}