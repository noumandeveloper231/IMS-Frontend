import * as React from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Input = React.forwardRef(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // Base
          "w-full h-10 rounded-xl px-4 text-sm",
          
          // Background & Border
          "border border-gray-300",
          
          // Remove shadow
          "shadow-none",
          
          // Placeholder
          "placeholder:text-gray-500",
          
          // Focus styles
          "focus:outline-none focus:ring-3 focus:ring-gray-300 focus:border-gray-500",
          // Disabled
          "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };