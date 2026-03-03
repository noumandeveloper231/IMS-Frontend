import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectCloseOnScrollContext = React.createContext(null)

const Select = ({ open: openProp, onOpenChange: onOpenChangeProp, ...props }) => {
  const [openInternal, setOpenInternal] = React.useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : openInternal

  const onOpenChange = React.useCallback(
    (value) => {
      if (!isControlled) setOpenInternal(value)
      onOpenChangeProp?.(value)
    },
    [isControlled, onOpenChangeProp]
  )

  const onOpenChangeRef = React.useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  const contentRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return

    const scheduleClose = (e) => {
      const contentEl = contentRef.current
      if (contentEl && contentEl.contains(e.target)) return
      requestAnimationFrame(() => onOpenChangeRef.current(false))
    }

    document.addEventListener("scroll", scheduleClose, true)
    window.addEventListener("scroll", scheduleClose, true)
    document.addEventListener("wheel", scheduleClose, true)
    document.addEventListener("touchmove", scheduleClose, true)

    return () => {
      document.removeEventListener("scroll", scheduleClose, true)
      window.removeEventListener("scroll", scheduleClose, true)
      document.removeEventListener("wheel", scheduleClose, true)
      document.removeEventListener("touchmove", scheduleClose, true)
    }
  }, [open])

  return (
    <SelectCloseOnScrollContext.Provider value={contentRef}>
      <SelectPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />
    </SelectCloseOnScrollContext.Provider>
  )
}

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base (match Input)
      "w-full h-10 rounded-lg px-4 text-sm flex items-center justify-between",

      // Border
      "border border-[#cdcdcd]",

      // Remove shadow
      "shadow",

      // Focus styles (match Input exactly)
      "outline-none focus-visible:ring-3 focus-visible:ring-[#cdcdcd] focus-visible:border-[#a1a1a1]",
      // Disabled
      "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",

      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className="flex cursor-default items-center justify-center py-1"
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName =
  SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className="flex cursor-default items-center justify-center py-1"
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(
  ({ className, children, position = "popper", ...props }, ref) => {
    const contentRef = React.useContext(SelectCloseOnScrollContext)

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={(node) => {
            contentRef.current = node
            if (typeof ref === "function") ref(node)
            else if (ref) ref.current = node
          }}
          className={cn(
            "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-lg border border-[#a1a1a1] bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
            position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1",
              position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef((props, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className="px-2 py-1.5 text-sm font-semibold"
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
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
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef((props, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className="-mx-1 my-1 h-px bg-muted"
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

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
}