"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export function DefaultHeader({ column, title }) {
  const sorted = column.getIsSorted();

  const handlePointerDown = (event) => {
    // Ignore right-click so we don't sort on context menu
    if (event.button === 2) return;
    column.toggleSorting(column.getIsSorted() === "asc");
  };

  const SortIcon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      className="flex w-full items-center justify-center gap-3 text-center text-sm font-semibold text-gray-800 hover:text-black "
    >
      <span className="truncate text-center">{title}</span>
      <SortIcon className="h-4 w-4 shrink-0" />
    </button>
  );
}

