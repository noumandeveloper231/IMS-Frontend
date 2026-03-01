# Categories vs Products – Features & Differences

Reference: **Categories** (preferred). Target: align **Products** to match.

---

## 1. Page layout & container
| Feature | Categories | Products |
|--------|------------|----------|
| Root container | `min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden` | ✅ Same |
| Inner card | `max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8` | ✅ Same |
| Section wrapper | `min-w-0` on header and table sections | ✅ Same |

---

## 2. Header & action buttons
| Feature | Categories | Products |
|--------|------------|----------|
| Title | `text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0` + count | ✅ Same |
| Button layout | `flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end` | ✅ Same |
| Import Excel label | `px-3 sm:px-4 py-2.5 sm:py-3` + `text-sm sm:text-base` + `whitespace-nowrap` | ❌ Products: `px-4 py-3` only |
| Export / Add buttons | Same classes as above | ✅ Products Export/Add already match |
| Bulk actions | 1 selected → single delete flow; 2+ → bulk modal | ❌ Products: always opens bulk modal |

---

## 3. Import drawer – structure & layout
| Feature | Categories | Products |
|--------|------------|----------|
| DrawerContent | `max-h-[90vh] w-full max-w-[100vw]` | ❌ `max-h-[90vh]` only |
| DrawerHeader | `border-b px-4 sm:px-6` | ❌ `border-b` only |
| Header close button | `<Button variant="outline" size="icon">✕</Button>` | ✅ Same |
| Content area | `no-scrollbar overflow-y-auto px-4 sm:px-6 py-4 space-y-6` | ❌ `px-6 py-4` (no sm:px-6, no space-y-6) |
| Template row | `flex flex-wrap items-center justify-between gap-3` | ❌ `flex flex-wrap items-center gap-3` (no justify-between) |
| Left group | `flex flex-wrap items-center gap-2 sm:gap-3 min-w-0` | ❌ `gap-3` only |
| Clear button | Only when `importRows.length > 0`; red styling | ✅ Same condition; ❌ Products no red class |
| DrawerFooter | `border-t px-4 sm:px-6 py-3 sm:py-4` | ❌ `border-t` only |
| Footer stats | ✔ Valid, ⚠ Errors, ✖ Duplicates (duplicates only if `> 0`) | ❌ Duplicates always shown; same icons |

---

## 4. Import drawer – preview table
| Feature | Categories | Products |
|--------|------------|----------|
| Component | **DataTable** (UI/data-table) | ❌ Raw **Table** + TableHeader + TableBody + map |
| Columns | useMemo `importTableColumns`: #, dynamic cols, Status, Actions | ❌ Inline map over importColumns + hardcoded #, SKU, Status, Actions |
| Row ID | `getRowId={(row, index) => String(index)}` | key={rowIndex} |
| Table container | `border w-full rounded-md max-h-80 overflow-auto` → DataTable with `containerClassName="flex flex-col overflow-hidden rounded-none border-0 bg-background min-h-[200px] max-h-[320px]"` | ❌ `border w-full rounded-md max-h-80 overflow-auto` → inner `min-w-max` + Table |
| Pagination | `addPagination={false}`, `pageSize={5}` | N/A (all rows shown) |
| Selection | `enableSelection={false}` | N/A |
| Header context menu | `enableHeaderContextMenu={false}` | N/A |

---

## 5. Import drawer – actions & validation
| Feature | Categories | Products |
|--------|------------|----------|
| View Template / Download Template | Same pattern | ✅ Same |
| Upload dropzone | ImageUploadDropzone, same props pattern | ✅ Same |
| In-upload progress | **UploadAlert** when imageUploadState (e.g. “Choose from device”) | ❌ Products: no UploadAlert (Images column uses URL modal) |
| Add row | Button "Add row" next to "Preview (N rows)" | ✅ Same |
| Stats line | "Valid: X \| Errors: Y" + " \| Duplicates: Z" only if duplicates > 0 | ✅ Same text; ❌ Duplicates always in footer |
| Primary action | "Import Valid Only"; disabled when `!importStats.valid \|\| importLoading` | ✅ Same |
| Cancel | DrawerClose + ghost Button | ✅ Same |
| Fix Errors button | ❌ None | ❌ Products has placeholder "Fix Errors" → toast.info |

---

## 6. Main data table (list)
| Feature | Categories | Products |
|--------|------------|----------|
| Search + Rows per page row | `flex flex-col sm:flex-row gap-3 sm:gap-4`; Input full width; Select 5/10/20/50/100 + Custom 1–500 | ✅ Same (Products has extra Stock filter) |
| Loading state | Spinner in py-10 | ✅ Same |
| Table wrapper | `overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0` | ✅ Same |
| DataTable | columns, data, pageSize, rowSelection, onRowSelectionChange, onSelectionChange | ✅ Same |
| Section comment | "Table section" | ❌ "Product Table" |

---

## 7. Callbacks & state
| Feature | Categories | Products |
|--------|------------|----------|
| handleRemoveImportRow | useCallback | ❌ Plain function |
| handleImportCellChange | useCallback; Tab/Space handled in input | ❌ Plain function; Tab/Space handled |
| validateImportedRows | Uses ref (categoriesRef) for stable list; no useCallback | Uses `products` in closure (could use ref) |
| EMPTY_ARRAY / ref | EMPTY_ARRAY + categoriesRef | ❌ products from query only |

---

## 8. Error handling & toasts
| Feature | Categories | Products |
|--------|------------|----------|
| File load error | messageFromServer in toast; "Unable to read file ❌" | ❌ "Unable to read file ❌" only |
| Bulk import error | messageFromServer in toast; console.error | ❌ "Bulk import failed ❌"; console.error |

---

## Summary of changes to apply in Products (to match Categories)

1. **Import drawer layout**
   - DrawerContent: add `w-full max-w-[100vw]`.
   - DrawerHeader: add `px-4 sm:px-6`.
   - Content area: use `px-4 sm:px-6 py-4 space-y-6`.
   - Template row: add `justify-between`; left group add `gap-2 sm:gap-3 min-w-0`.
   - Clear button: add red styling to match Categories.
   - DrawerFooter: add `px-4 sm:px-6 py-3 sm:py-4`.
   - Show "Duplicates" in footer only when `importStats.duplicates > 0`.
   - Remove "Fix Errors" button.

2. **Header buttons**
   - Import Excel label: use `px-3 sm:px-4 py-2.5 sm:py-3` and `text-sm sm:text-base whitespace-nowrap`.

3. **Bulk actions**
   - When 1 product selected → call confirmDelete(selectedProductIds[0]); when 2+ → open bulk delete modal.

4. **Section comment**
   - Rename "Product Table" to "Table section".

5. **Optional (larger refactor)**
   - Replace import preview Table with DataTable + column defs (like Categories) for consistent behavior and styling.
   - Add UploadAlert if Products gets a "Choose from device" image upload in the import table.
   - Align file-load and bulk-import error toasts with Categories (include messageFromServer where available).
