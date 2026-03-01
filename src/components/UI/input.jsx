import * as React from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  // Define default widths for different input types
  const widthClass = (() => {
    switch (type) {
      case "text":
        return "min-w-xs w-full";
      case "email":
      case "password":
      case "search":
        return "min-w-md"; // full width
      case "number":
        return "min-w-xs w-full"; // small numeric input
      case "checkbox":
      case "radio":
        return "min-w-xs"; // tiny square
      case "file":
        return "min-w-xs"; // file input usually full width
      case "date":
      case "time":
      case "datetime-local":
        return "min-w-xs"; // medium width
      default:
        return "min-w-xs"; // fallback to full width
    }
  })();

  return (
    <input
      type={type}
      className={cn(
        "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        widthClass,
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };