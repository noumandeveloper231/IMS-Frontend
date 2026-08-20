import * as React from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function MediaUpload({
  onFilesSelect,
  disabled = false,
  multiple = true,
  className,
  label = "Upload images",
}) {
  const inputRef = React.useRef(null);

  const handleFiles = (files) => {
    if (!files || disabled || !onFilesSelect) return;
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length) onFilesSelect(fileArray);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer bg-white",
        disabled && "pointer-events-none opacity-50 ",
        className
      )}
    >
      <Upload className="h-4 w-4" />
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
