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
  const wrapperRef = React.useRef(null)

  // Single-select: value is string; multiselect: value is string[]
  const valuesArray = multiselect
    ? Array.isArray(value) ? value : value != null ? [String(value)] : []
    : []

  const selected = !multiselect ? options.find((o) => o.value === value) : null

  const maxItemsNum =
    maxItems != null ? (typeof maxItems === "string" ? parseInt(maxItems, 10) : maxItems) : null
  const atMax = maxItemsNum != null && valuesArray.length >= maxItemsNum

  React.useEffect(() => {
    if (!multiselect && selected) {
      setSearch(selected.label)
    }
  }, [multiselect, value, selected])

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
    if (!multiselect) return
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

  const renderSingleSelect = () => (
    <>
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
    </>
  )

  const renderMultiselectInput = () => (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
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
                filtered.map((option) => {
                  const isSelected = valuesArray.includes(option.value)
                  return (
                    <div
                      key={option.value}
                      onClick={() => {
                        if (isSelected) {
                          removeValue(option.value)
                        } else {
                          addValue(option.value)
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent"
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
                filtered.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange?.(option.value)
                      setSearch(option.label)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent"
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
                ))
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
