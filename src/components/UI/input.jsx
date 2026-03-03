import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/UI/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";
import { cn } from "@/lib/utils";

const inputBaseClasses = [
  "w-full h-10 rounded-lg px-4 text-sm",
  "border border-[#cdcdcd]",
  "shadow",
  "placeholder:text-gray-500",
  "focus:outline-none focus:ring-3 focus:ring-[#cdcdcd] focus:border-[#a1a1a1]",
  "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
];

function DatePickerInput(
  { className, value = "", onChange, placeholder, disabled, type, ...props },
  ref
) {
  const [open, setOpen] = React.useState(false);
  const dateValue = value && value.length >= 10 ? new Date(value + "T00:00:00") : undefined;
  const displayLabel = dateValue
    ? format(dateValue, "MMM d, yyyy")
    : placeholder ?? "Pick a date";

  const handleSelect = (date) => {
    const nextValue = date ? format(date, "yyyy-MM-dd") : "";
    onChange?.({
      target: { value: nextValue },
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          className={cn(
            ...inputBaseClasses,
            "flex items-center justify-between text-left",
            !dateValue && "text-gray-500",
            className
          )}
          {...props}
        >
          <span className="truncate">{displayLabel}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}

const DatePickerInputForwarded = React.forwardRef(DatePickerInput);

const Input = React.forwardRef(
  ({ className, type = "text", value, onChange, ...props }, ref) => {
    if (type === "date") {
      return (
        <DatePickerInputForwarded
          ref={ref}
          className={className}
          type={type}
          value={value}
          onChange={onChange}
          {...props}
        />
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        value={value}
        onChange={onChange}
        className={cn(...inputBaseClasses, className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
