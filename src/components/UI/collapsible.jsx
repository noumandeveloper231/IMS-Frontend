import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <CollapsiblePrimitive.CollapsibleContent
      ref={ref}
      className={cn(
        "overflow-hidden",
        "transition-[opacity,transform] duration-200 ease-out",
        "data-[state=open]:opacity-100 data-[state=open]:translate-y-0",
        "data-[state=closed]:opacity-0 data-[state=closed]:-translate-y-1",
        className
      )}
      {...props}
    />
  )
);
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
