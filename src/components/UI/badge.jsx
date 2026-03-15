import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border border-gray-300",
        success: "border-transparent bg-green-50 px-3 py-1 text-xs font-medium text-green-700",
        warning: "border-transparent bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700",
        info: "border-transparent bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700",
        danger: "border-transparent bg-red-50 px-3 py-1 text-xs font-medium text-red-700",
        light: "border-transparent bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700",
        dark: "border-transparent bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700",
        mute: "border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
