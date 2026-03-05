import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }) => (
  <TooltipPrimitive.Provider delayDuration={0}>
    {children}
  </TooltipPrimitive.Provider>
)

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side="top"
        align="center"
        sideOffset={sideOffset}
        className={cn(
          "relative z-50 w-max",
          "bg-black text-white text-xs",
          "rounded px-4 py-1.5 shadow-lg",
          "whitespace-nowrap border-none!",
          // Animation
          "data-[state=delayed-open]:animate-in",
          "data-[state=closed]:animate-out",
          "data-[state=delayed-open]:fade-in-0",
          "data-[state=closed]:fade-out-0",
          "data-[state=delayed-open]:slide-in-from-bottom-2",
          "data-[state=closed]:slide-out-to-bottom-2",
          "duration-100! ease-out",

          className
        )}
        {...props}
      >
        {props.children}

        <TooltipPrimitive.Arrow
          className="fill-gray-800"
          width={10}
          height={6}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
)

TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }