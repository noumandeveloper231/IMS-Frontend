"use client"

import React from "react"
import { Check, ChevronDown, X } from "lucide-react"

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
  multiselect = false,
  maxItems,
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const wrapperRef = React.useRef(null)
  const optionRefs = React.useRef([])

  // Single-select: value is string; multiselect: value is string[]
  const valuesArray = multiselect
    ? Array.isArray(value) ? value : value != null ? [String(value)] : []
    : []

  const selected = !multiselect ? options.find((o) => o.value === value) : null

  const maxItemsNum =
    maxItems != null ? (typeof maxItems === "string" ? parseInt(maxItems, 10) : maxItems) : null
  const atMax = maxItemsNum != null && valuesArray.length >= maxItemsNum

  React.useEffect(() => {
    if (!multiselect) {
      if (selected) {
        setSearch(selected.label)
      } else if (value == null || value === "") {
        setSearch("")
      }
    }
  }, [multiselect, value, selected])

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  // When popover opens, set highlighted index to current value (single) or 0
  React.useEffect(() => {
    if (open) {
      if (filtered.length === 0) {
        setHighlightedIndex(-1)
      } else if (!multiselect && value != null) {
        const idx = filtered.findIndex((o) => o.value === value)
        setHighlightedIndex(idx >= 0 ? idx : 0)
      } else {
        setHighlightedIndex(0)
      }
    } else {
      setHighlightedIndex(-1)
    }
  }, [open])

  // Keep highlighted index in bounds when filtered list changes
  React.useEffect(() => {
    if (!open || filtered.length === 0) return
    setHighlightedIndex((i) => Math.min(Math.max(i, 0), filtered.length - 1))
  }, [filtered, open])

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex].scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex])

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

  const addValue = React.useCallback(
    (val) => {
      if (atMax) return
      const str = typeof val === "string" ? val : (val?.value ?? val?.label ?? String(val))
      const next = valuesArray.includes(str) ? valuesArray : [...valuesArray, str]
      onChange?.(next)
    },
    [valuesArray, atMax, onChange]
  )

  const removeValue = React.useCallback(
    (val) => {
      const next = valuesArray.filter((v) => v !== val)
      onChange?.(next)
    },
    [valuesArray, onChange]
  )

  const handleKeyDown = (e) => {
    const isArrowOrEnter =
      e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape"

    // Open on arrow when closed (multiselect; single-select opens in handleSingleSelectKeyDown)
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && filtered.length > 0) {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex(0)
      return
    }

    if (open && isArrowOrEnter && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          const option = filtered[highlightedIndex]
          if (multiselect) {
            const isSelected = valuesArray.includes(option.value)
            if (isSelected) removeValue(option.value)
            else addValue(option.value)
          } else {
            onChange?.(option.value)
            setSearch(option.label)
            setOpen(false)
          }
        }
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
        return
      }
    }

    if (!multiselect) return

    // Multiselect-only: Enter to add from search text
    if (e.key === "Enter") {
      e.preventDefault()
      const trimmed = search.trim()
      if (options.length > 0) {
        const match = options.find(
          (o) => o.label.toLowerCase() === trimmed.toLowerCase() || o.value === trimmed
        )
        if (match && !valuesArray.includes(match.value)) {
          addValue(match.value)
          setSearch("")
        }
      } else {
        if (trimmed && !valuesArray.includes(trimmed)) {
          addValue(trimmed)
          setSearch("")
        }
      }
    }
    if (e.key === "Backspace" && !search && valuesArray.length > 0) {
      removeValue(valuesArray[valuesArray.length - 1])
    }
  }

  const handleSingleSelectKeyDown = (e) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) {
      e.preventDefault()
      setOpen(true)
    }
    handleKeyDown(e)
  }

  const renderSingleSelect = () => (
    <>
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleSingleSelectKeyDown}
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
    </>
  )

  const renderMultiselectInput = () => (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow focus-within:ring-2 focus-within:ring-[var(--app-accent-light,#d1d5db)] focus-within:border-[var(--app-accent-border,#d1d5db)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {valuesArray.map((v) => {
        const label = options.find((o) => o.value === v)?.label ?? v
        return (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
          >
            {label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeValue(v)
                }}
                className="rounded p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        )
      })}
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={valuesArray.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground"
      />
      <ChevronDown
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-4 w-4 opacity-50 cursor-pointer transition-transform shrink-0",
          open && "rotate-180"
        )}
      />
    </div>
  )

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <Popover open={open}>
        <PopoverAnchor asChild>
          <div className="relative w-full">
            {multiselect ? renderMultiselectInput() : renderSingleSelect()}
          </div>
        </PopoverAnchor>

        {multiselect && options.length === 0 ? (
          <PopoverContent
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-full p-2 rounded-xl shadow-md z-50 w-[var(--radix-popover-trigger-width)]"
            onWheel={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-muted-foreground px-2 py-1">
              Type and press Enter to add.
              {maxItemsNum != null && (
                <span className="block mt-0.5">
                  Max {maxItemsNum} item{maxItemsNum !== 1 ? "s" : ""}.
                </span>
              )}
            </p>
          </PopoverContent>
        ) : (
          <PopoverContent
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            className="w-full p-1 rounded-xl shadow-md z-50 w-[var(--radix-popover-trigger-width)]"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="max-h-60 overflow-y-auto">
              {!multiselect && filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No results found.
                </div>
              )}

              {multiselect && options.length > 0 && filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No results found.
                </div>
              )}

              {multiselect && options.length > 0 ? (
                filtered.map((option, index) => {
                  const isSelected = valuesArray.includes(option.value)
                  const isHighlighted = index === highlightedIndex
                  return (
                    <div
                      key={option.value}
                      ref={(el) => (optionRefs.current[index] = el)}
                      onClick={() => {
                        if (isSelected) {
                          removeValue(option.value)
                        } else {
                          addValue(option.value)
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent",
                        isHighlighted && "bg-accent"
                      )}
                    >
                      {option.qrcode && (
                        <img
                          src={option.qrcode}
                          alt={option.label}
                          className="w-10 h-10"
                        />
                      )}
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                  )
                })
              ) : !multiselect ? (
                filtered.map((option, index) => {
                  const isHighlighted = index === highlightedIndex
                  return (
                    <div
                      key={option.value}
                      ref={(el) => (optionRefs.current[index] = el)}
                      onClick={() => {
                        onChange?.(option.value)
                        setSearch(option.label)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent",
                        isHighlighted && "bg-accent"
                      )}
                    >
                    {option.qrcode && (
                      <img
                        src={option.qrcode}
                        alt={option.label}
                        className="w-10 h-10"
                      />
                    )}
                    <span>{option.label}</span>
                    {value === option.value && <Check className="h-4 w-4" />}
                  </div>
                );
                })
              ) : null}
            </div>
            {multiselect && options.length > 0 && maxItemsNum != null && (
              <p className="text-xs text-muted-foreground px-2 py-1 border-t mt-1">
                {valuesArray.length} / {maxItemsNum} selected
              </p>
            )}
          </PopoverContent>
        )}
      </Popover>
    </div>
  )
}
