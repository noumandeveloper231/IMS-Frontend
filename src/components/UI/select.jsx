import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectCloseOnScrollContext = React.createContext(null);

function Select({ open: openProp, onOpenChange: onOpenChangeProp, ...props }) {
  const [openInternal, setOpenInternal] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;

  const onOpenChange = React.useCallback(
    (value) => {
      if (!isControlled) setOpenInternal(value);
      onOpenChangeProp?.(value);
    },
    [isControlled, onOpenChangeProp],
  );

  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;

    const scheduleClose = (e) => {
      const contentEl = contentRef.current;
      if (contentEl && contentEl.contains(e.target)) return;
      requestAnimationFrame(() => onOpenChangeRef.current(false));
    };

    document.addEventListener("scroll", scheduleClose, true);
    window.addEventListener("scroll", scheduleClose, true);
    document.addEventListener("wheel", scheduleClose, true);
    document.addEventListener("touchmove", scheduleClose, true);

    return () => {
      document.removeEventListener("scroll", scheduleClose, true);
      window.removeEventListener("scroll", scheduleClose, true);
      document.removeEventListener("wheel", scheduleClose, true);
      document.removeEventListener("touchmove", scheduleClose, true);
    };
  }, [open]);

  return (
    <SelectCloseOnScrollContext.Provider value={contentRef}>
      <SelectPrimitive.Root
        data-slot="select"
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      />
    </SelectCloseOnScrollContext.Provider>
  );
}

function SelectGroup({ ...props }) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        // Base (match Input)
        "w-full h-10 rounded-lg px-4 text-sm flex items-center justify-between",

        // Border
        "border border-[#cdcdcd]",

        // Remove shadow
        "shadow",

        // Focus styles (match Input exactly)
        "outline-none focus:ring-3 focus:ring-[var(--app-accent-light,#d1d5db)] focus:border-[var(--app-accent-border,#d1d5db)] data-[state=open]:ring-3 data-[state=open]:ring-[var(--app-accent-light,#d1d5db)] data-[state=open]:border-[var(--app-accent-border,#d1d5db)]",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",

        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({ ...props }) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className="flex cursor-default items-center justify-center py-1"
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ ...props }) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className="flex cursor-default items-center justify-center py-1"
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectContent({ className, children, position = "popper", ...props }) {
  const contentRef = React.useContext(SelectCloseOnScrollContext);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        ref={(node) => {
          contentRef.current = node;
        }}
        className={cn(
          "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-lg border border-[#a1a1a1] bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ ...props }) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className="px-2 py-1.5 text-sm font-semibold"
      {...props}
    />
  );
}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ ...props }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className="-mx-1 my-1 h-px bg-muted"
      {...props}
    />
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
