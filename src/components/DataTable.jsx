"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/UI/pagination";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/table";
import { Input } from "@/components/UI/input";
import { Button } from "@/components/UI/button";
import { Checkbox } from "@/components/UI/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/UI/dropdown-menu";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/UI/context-menu";
import { DefaultHeader } from "@/components/DefaultHeader";

export function DataTable({
  columns,
  data: dataProp,
  renderRowActions,
  pageSize: pageSizeProp,
  // TanStack Query: when provided, table uses useQuery instead of data prop
  queryKey,
  queryFn,
  queryOptions = {},
}) {
  const hasQuery = Boolean(queryKey && queryFn);

  const { data: queryData, isLoading, isError, error } = useQuery({
    queryKey: queryKey ?? ["data-table"],
    queryFn: queryFn ?? (async () => []),
    enabled: hasQuery,
    ...queryOptions,
  });

  const data = hasQuery ? (queryData ?? []) : (dataProp ?? []);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});

  const effectivePageSize = pageSizeProp || 10;
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: effectivePageSize,
  });

  React.useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      pageSize: effectivePageSize,
    }));
  }, [effectivePageSize]);

  const selectionColumn = React.useMemo(
    () => ({
      id: "__select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    []
  );

  const actionsColumn = React.useMemo(
    () =>
      renderRowActions
        ? {
          id: "__actions",
          header: () => null,
          enableSorting: false,
          enableHiding: false,
          cell: ({ row }) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                {renderRowActions(row)}
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }
        : null,
    [renderRowActions]
  );

  const allColumns = React.useMemo(
    () =>
      actionsColumn
        ? [selectionColumn, ...columns, actionsColumn]
        : [selectionColumn, ...columns],
    [selectionColumn, columns, actionsColumn]
  );

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const hideableColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.getCanHide() &&
        column.id !== "__select" &&
        column.id !== "__actions"
    );

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;

  const getPaginationRange = () => {
    const total = pageCount;
    const current = currentPage;

    const delta = 1; // how many pages beside current
    const range = [];

    const left = Math.max(0, current - delta);
    const right = Math.min(total - 1, current + delta);

    // Always include first page
    if (left > 0) {
      range.push(0);
      if (left > 1) range.push("...");
    }

    // Middle pages
    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    // Always include last page
    if (right < total - 1) {
      if (right < total - 2) range.push("...");
      range.push(total - 1);
    }

    return range;
  };

  return (
    <div className="space-y-3 w-full flex flex-col">
      <div className="flex h-[500px] flex-col overflow-hidden rounded-md border border-gray-200 bg-background">
        <div className="flex-1 overflow-auto">
          <Table className="relative min-w-full text-black" stickyHeader>
            <TableHeader className="text-black shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-gray-200 shadow-sm">
                  {headerGroup.headers.map((header) => {
                    const isSelection = header.column.id === "__select";

                    const rawLabel = header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      );

                    const title =
                      (header.column.columnDef.meta &&
                        header.column.columnDef.meta.label) ||
                      rawLabel ||
                      header.column.id;

                    const headerInner = isSelection ? (
                      rawLabel
                    ) : (
                      <DefaultHeader
                        column={header.column}
                        title={String(title)}
                      />
                    );

                    return (
                      <ContextMenu key={header.id}>
                        <ContextMenuTrigger asChild>
                          <TableHead
                            className={
                              header.index === 0
                                ? "sticky top-0 left-0 z-20 bg-background px-4 py-3 text-sm text-black border-b border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                                : "sticky top-0 z-20 bg-background px-4 py-3 text-sm text-black border-b border-gray-200"
                            }
                          >
                            {headerInner}
                          </TableHead>
                        </ContextMenuTrigger>
                        <ContextMenuContent align="start">
                          {hideableColumns.map((column) => (
                            <ContextMenuCheckboxItem
                              key={column.id}
                              checked={column.getIsVisible()}
                              onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                              }
                            >
                              {String(
                                (column.columnDef.meta &&
                                  column.columnDef.meta.label) ||
                                column.columnDef.header ||
                                column.id
                              )}
                            </ContextMenuCheckboxItem>
                          ))}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-sm text-destructive"
                  >
                    {error?.message ?? "Failed to load data."}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-gray-200"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3 text-sm text-black"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <span className="flex-1 text-xs text-muted-foreground">
          {table.getSelectedRowModel().rows.length} of{" "}
          {table.getRowModel().rows.length} row(s) selected.
        </span>

        <div className="sm:ml-auto flex justify-end flex-1">
          {pageCount > 1 && (
            <Pagination className="sm:ml-auto flex justify-end flex-1">
              <PaginationContent>
                {/* Previous */}
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.previousPage();
                    }}
                    className={
                      !table.getCanPreviousPage()
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>

                {/* Page Numbers */}
                {getPaginationRange().map((item, index) =>
                  item === "..." ? (
                    <PaginationItem key={`...-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          table.setPageIndex(item);
                        }}
                      >
                        {item + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                {/* Next */}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      table.nextPage();
                    }}
                    className={
                      !table.getCanNextPage()
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
