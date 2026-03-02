import * as React from "react";
import { Input } from "@/components/UI/input";

/**
 * Input that keeps its value in local state and only syncs to parent on blur.
 * Prevents parent re-renders during typing, which fixes focus loss when the
 * input is inside Select, DataTable, Dialog, or other components that
 * re-render and cause focus to be stolen.
 */
export function CustomRowsPerPageInput({ value, onChange, ...props }) {
  const [localValue, setLocalValue] = React.useState(value);
  const isEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => {
        isEditingRef.current = true;
        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
        setLocalValue(v);
      }}
      onBlur={() => {
        isEditingRef.current = false;
        const v = localValue.replace(/\D/g, "").slice(0, 3);
        setLocalValue(v);
        onChange(v);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}
