"use client"

import React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/UI/popover"
import { Input } from "./input"

export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const wrapperRef = React.useRef(null)

  const selected = options.find((o) => o.value === value)

  React.useEffect(() => {
    if (selected) {
      setSearch(selected.label)
    }
  }, [value])

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Popover open={open}>
        {/* Anchor instead of Trigger */}
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
            />

            <ChevronDown
              onClick={() => setOpen((prev) => !prev)}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 cursor-pointer transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-full p-1 rounded-xl shadow-md z-50 w-[var(--radix-popover-trigger-width)]"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No results found.
              </div>
            )}

            {filtered.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange?.(option.value)
                  setSearch(option.label)
                  setOpen(false)
                }}
                className="flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent"
              >
                <span>{option.label}</span> 
                {value === option.value && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}