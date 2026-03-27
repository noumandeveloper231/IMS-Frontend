import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded border border-[#cdcdcd] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent-light,#d1d5db)] focus-visible:border-[var(--app-accent-border,#d1d5db)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--app-accent,#111827)] data-[state=checked]:bg-[var(--app-accent,#111827)] data-[state=checked]:text-[var(--app-accent-foreground,#ffffff)] data-[state=indeterminate]:border-[var(--app-accent,#111827)] data-[state=indeterminate]:bg-transparent data-[state=indeterminate]:text-[var(--app-accent,#111827)]",
      className
    )}
    {...props}>
    <CheckboxPrimitive.Indicator className={cn("grid place-content-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
