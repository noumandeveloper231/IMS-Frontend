import React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = React.useState(false)

  const selected = options.find((o) => o.value === value)
  // const selectImg = options.find((o) => o.value === value)?.img;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {selected?.qrcode && (
              <img
                src={selected.qrcode}
                alt={selected.label}
                className="h-5 w-5 rounded object-cover"
              />
            )}
            {selected ? selected.label : placeholder}
          </div>

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange?.(option.value)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Check icon */}
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />

                  {/* Optional Image */}
                  {option.qrcode && (
                    <img
                      src={option.qrcode}
                      alt={option.label}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}

                  {/* Label */}
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}