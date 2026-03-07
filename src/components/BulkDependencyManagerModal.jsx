/**
 * BulkDependencyManagerModal
 * Generic full-width modal for bulk deletion with dependency resolution.
 * Used for both categories and subcategories: dependency rows, per-item resolve, batch resolve, preview, execute.
 * Uses existing ResolveDependenciesDialog and TransferDependenciesDialog for single-item resolution.
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import {
  Select as UiSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import {
  ResolveDependenciesDialog,
  TransferDependenciesDialog,
} from "@/components/ResolveDependenciesDialog";

export function BulkDependencyManagerModal({
  open,
  onOpenChange,
  manager,
  categories = [],
  itemsSource,
  mode = "category", // "category" | "subcategory" | "brand" | "condition"
  onComplete,
}) {
  const {
    state,
    status,
    summary,
    items,
    preview,
    error,
    selectedCategoryIds,
    selectedSubcategoryIds,
    selectedBrandIds,
    selectedConditionIds,
    resolvedCount,
    totalCount,
    canProceed,
    setItemResolution,
    setResolvingItem,
    resolveAllWithCascade,
    resolveAllWithTransfer,
    fetchPreview,
    executeBulkDelete,
    reset,
    STATUS,
    ITEM_STATUS: ITEM_STATUS_ENUM,
  } = manager;

  const [singleResolveOpen, setSingleResolveOpen] = useState(false);
  const [singleTransferOpen, setSingleTransferOpen] = useState(false);
  const [singleTransferTargetId, setSingleTransferTargetId] = useState("");
  const [resolvingItemId, setResolvingItemId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedIds =
    selectedCategoryIds ||
    selectedSubcategoryIds ||
    selectedBrandIds ||
    selectedConditionIds ||
    [];

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const resolvingItem = useMemo(
    () => items.find((i) => i.id === resolvingItemId),
    [items, resolvingItemId]
  );

  const entityLabelMap = {
    category: "category",
    subcategory: "subcategory",
    brand: "brand",
    condition: "condition",
  };
  const entityLabelPluralMap = {
    category: "categories",
    subcategory: "subcategories",
    brand: "brands",
    condition: "conditions",
  };

  const entityLabel = entityLabelMap[mode] || "item";
  const entityLabelPlural = entityLabelPluralMap[mode] || "items";

  const sourceItems = itemsSource ?? categories ?? [];

  const transferTargetOptions = useMemo(
    () =>
      (sourceItems || [])
        .filter((c) => c._id && !selectedSet.has(c._id))
        .map((c) => ({ value: c._id, label: c.name })),
    [sourceItems, selectedSet]
  );

  const handleClose = (open) => {
    if (!open) {
      reset();
      setSingleResolveOpen(false);
      setSingleTransferOpen(false);
      setResolvingItemId(null);
      setShowPreview(false);
      onOpenChange?.(false);
    }
  };

  const handleResolveClick = (item) => {
    if (item.status !== ITEM_STATUS_ENUM.NEEDS_RESOLUTION) return;
    setResolvingItemId(item.id);
    setResolvingItem(item);
    setSingleResolveOpen(true);
  };

  const handleChooseTransfer = () => {
    setSingleResolveOpen(false);
    setSingleTransferOpen(true);
  };

  const handleChooseCascade = () => {
    if (resolvingItemId) {
      setItemResolution(resolvingItemId, "cascade");
      setSingleResolveOpen(false);
      setResolvingItemId(null);
    }
  };

  const handleTransferSubmit = (transferToCategoryId) => {
    if (!resolvingItemId || !transferToCategoryId) return;
    setItemResolution(resolvingItemId, "transfer", transferToCategoryId);
    setSingleTransferOpen(false);
    setSingleTransferTargetId("");
    setResolvingItemId(null);
  };

  const handleProceedToPreview = async () => {
    if (!canProceed) return;
    setPreviewLoading(true);
    const data = await fetchPreview();
    setPreviewLoading(false);
    if (data) setShowPreview(true);
  };

  const handleExecute = async () => {
    const success = await executeBulkDelete();
    if (success) {
      setShowPreview(false);
      onComplete?.();
      handleClose(false);
    }
  };

  const isAnalyzing = status === STATUS.ANALYZING;
  const isResolving = status === STATUS.RESOLVING;
  const isReady = status === STATUS.READY;
  const isExecuting = status === STATUS.EXECUTING;
  const isCompleted = status === STATUS.COMPLETED;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{`Bulk delete ${entityLabelPlural}`}</DialogTitle>
            <DialogDescription>
              {isAnalyzing &&
                `Checking dependencies for selected ${entityLabelPlural}…`}
              {!isAnalyzing &&
                !showPreview &&
                status === STATUS.RESOLVING &&
                `Resolve dependencies for each ${entityLabel} (${resolvedCount} / ${totalCount} resolved).`}
              {!isAnalyzing &&
                !showPreview &&
                status === STATUS.READY &&
                `All ${entityLabelPlural} are ready. Proceed to preview.`}
              {showPreview && "Review the summary below before executing."}
              {isExecuting && `Deleting ${entityLabelPlural}…`}
              {isCompleted && "Bulk delete completed."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {isAnalyzing && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          )}

          {!isAnalyzing && items.length > 0 && !showPreview && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-300">
                <span className="text-sm text-muted-foreground">
                  Progress: <strong>{resolvedCount}</strong> / <strong>{totalCount}</strong> resolved
                </span>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 bg-muted/20 border-gray-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.status === ITEM_STATUS_ENUM.NO_DEPS && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {item.status === ITEM_STATUS_ENUM.NEEDS_RESOLUTION && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                        </span>
                      )}
                      {(item.status === ITEM_STATUS_ENUM.RESOLVED || item.resolutionAction) && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.status === ITEM_STATUS_ENUM.NO_DEPS && (
                          <p className="text-xs text-muted-foreground">
                            {mode === "category"
                              ? "Category will be deleted."
                              : "Subcategory will be deleted."}
                          </p>
                        )}
                        {item.status === ITEM_STATUS_ENUM.NEEDS_RESOLUTION && (
                          <p className="text-xs text-muted-foreground">
                            {mode === "category" ? (
                              <>
                                Has {item.dependenciesCount} dependencies (
                                {item.subcategoriesCount} subcategories,{" "}
                                {item.productsCount} products).
                              </>
                            ) : (
                              <>
                                Has {item.dependenciesCount} dependencies (
                                {item.productsCount} products).
                              </>
                            )}
                          </p>
                        )}
                        {item.resolutionAction === "cascade" && (
                          <p className="text-xs text-emerald-600">Resolved (Cascade).</p>
                        )}
                        {item.resolutionAction === "transfer" && item.transferTarget && (
                          <p className="text-xs text-emerald-600">
                            Resolved (Transfer to{" "}
                            {transferTargetOptions.find(
                              (o) => o.value === item.transferTarget
                            )?.label ??
                              (mode === "category" ? "category" : "subcategory")}
                            ).
                          </p>
                        )}
                      </div>
                    </div>
                    {item.status === ITEM_STATUS_ENUM.NEEDS_RESOLUTION && (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleResolveClick(item)}>
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter className="border-t pt-4 border-gray-300">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canProceed || previewLoading}
                  onClick={handleProceedToPreview}
                >
                  {previewLoading ? "Loading…" : "Proceed to preview"}
                </Button>
              </DialogFooter>
            </>
          )}

          {showPreview && preview && (
            <>
              <div className="space-y-4 py-4 overflow-y-auto">
                <div className="rounded-lg border bg-muted/30 p-4 border-gray-300">
                  <h4 className="text-sm font-semibold mb-2">Preview summary</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      {(() => {
                        const summary = preview.summary || {};
                        let count = 0;
                        if (mode === "category") count = summary.categoriesToDelete ?? 0;
                        else if (mode === "subcategory")
                          count = summary.subcategoriesToDelete ?? 0;
                        else if (mode === "brand")
                          count = summary.brandsToDelete ?? 0;
                        else if (mode === "condition")
                          count = summary.conditionsToDelete ?? 0;
                        return (
                          <>
                            {`${entityLabelPlural.charAt(0).toUpperCase()}${entityLabelPlural.slice(
                              1
                            )} to delete:`}{" "}
                            <strong>{count}</strong>
                          </>
                        );
                      })()}
                    </li>
                    {mode === "category" && (
                      <li>
                        Total subcategories affected:{" "}
                        <strong>
                          {preview.summary?.totalSubcategoriesAffected ?? 0}
                        </strong>
                      </li>
                    )}
                    <li>
                      Total products affected:{" "}
                      <strong>{preview.summary?.totalProductsAffected ?? 0}</strong>
                    </li>
                  </ul>
                </div>
                {(() => {
                  let list = [];
                  if (mode === "category") list = preview.categories || [];
                  else if (mode === "subcategory") list = preview.subcategories || [];
                  else if (mode === "brand") list = preview.brands || [];
                  else if (mode === "condition") list = preview.conditions || [];
                  if (!list.length) return null;
                  return (
                    <div className="rounded-lg border p-3 border-gray-300">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {entityLabelPlural.charAt(0).toUpperCase() +
                          entityLabelPlural.slice(1)}
                      </p>
                      <p className="text-sm">
                        {list.map((c) => c.name).join(", ")}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <DialogFooter className="border-t pt-4 border-gray-300">
                <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isExecuting}
                  onClick={handleExecute}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting…
                    </>
                  ) : (
                    "Delete all"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ResolveDependenciesDialog
        open={singleResolveOpen}
        onOpenChange={setSingleResolveOpen}
        title={
          mode === "category"
            ? "Resolve Category Dependencies"
            : mode === "subcategory"
            ? "Resolve Subcategory Dependencies"
            : mode === "brand"
            ? "Resolve Brand Dependencies"
            : "Resolve Condition Dependencies"
        }
        dependencyData={
          resolvingItem
            ? {
                id: resolvingItem.id,
                name: resolvingItem.name,
                subcategoriesCount:
                  mode === "category" ? resolvingItem.subcategoriesCount ?? 0 : 0,
                productsCount: resolvingItem.productsCount ?? 0,
              }
            : null
        }
        childLabel={mode === "category" ? "subcategories" : ""}
        linkedLabel="linked products"
        transferDescription={
          mode === "category"
            ? "Move all subcategories and product links to another category before deleting this one."
            : mode === "subcategory"
            ? "Move all product links to another subcategory before deleting this one."
            : mode === "brand"
            ? "Move all product links to another brand before deleting this one."
            : "Move all product links to another condition before deleting this one."
        }
        cascadeDescription={
          mode === "category"
            ? "This will permanently delete this category and all its subcategories. This action cannot be undone."
            : mode === "subcategory"
            ? "This will permanently unlink this subcategory from all products and delete the subcategory. This action cannot be undone."
            : mode === "brand"
            ? "This will permanently unlink this brand from all products and delete the brand. This action cannot be undone."
            : "This will permanently unlink this condition from all products and delete the condition. This action cannot be undone."
        }
        onChooseTransfer={handleChooseTransfer}
        onChooseCascade={handleChooseCascade}
      />

      <TransferDependenciesDialog
        open={singleTransferOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSingleTransferTargetId("");
            setResolvingItemId(null);
          }
          setSingleTransferOpen(isOpen);
        }}
        title={
          mode === "category"
            ? "Transfer Category Dependencies"
            : mode === "subcategory"
            ? "Transfer Subcategory Dependencies"
            : mode === "brand"
            ? "Transfer Brand Dependencies"
            : "Transfer Condition Dependencies"
        }
        description={
          mode === "category"
            ? "Select the target category to move all subcategories and product links to."
            : mode === "subcategory"
            ? "Select the target subcategory to move all product links to."
            : mode === "brand"
            ? "Select the target brand to move all product links to."
            : "Select the target condition to move all product links to."
        }
        targetOptions={transferTargetOptions}
        value={singleTransferTargetId}
        onValueChange={setSingleTransferTargetId}
        onSubmit={() => handleTransferSubmit(singleTransferTargetId)}
        submitLabel="Confirm transfer"
      />
    </>
  );
}
