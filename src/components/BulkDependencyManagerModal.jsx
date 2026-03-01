/**
 * BulkDependencyManagerModal
 * Full-width modal for bulk category deletion: dependency rows, per-item resolve, batch resolve, preview, execute.
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
import { ResolveDependenciesDialog, TransferDependenciesDialog } from "@/components/ResolveDependenciesDialog";
import { useBulkDependencyManager } from "@/hooks/useBulkDependencyManager";

const ITEM_STATUS = {
  NO_DEPS: "no_deps",
  NEEDS_RESOLUTION: "needs_resolution",
  RESOLVING: "resolving",
  RESOLVED: "resolved",
};

export function BulkDependencyManagerModal({
  open,
  onOpenChange,
  manager,
  categories = [],
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

  const selectedSet = useMemo(() => new Set(selectedCategoryIds || []), [selectedCategoryIds]);

  const resolvingItem = useMemo(
    () => items.find((i) => i.id === resolvingItemId),
    [items, resolvingItemId]
  );

  const transferTargetOptions = useMemo(
    () =>
      (categories || [])
        .filter((c) => c._id && !selectedSet.has(c._id))
        .map((c) => ({ value: c._id, label: c.name })),
    [categories, selectedSet]
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
            <DialogTitle>Bulk delete categories</DialogTitle>
            <DialogDescription>
              {isAnalyzing && "Checking dependencies for selected categories…"}
              {isResolving && `Resolve dependencies for each category (${resolvedCount} / ${totalCount} resolved).`}
              {isReady && !showPreview && "All categories are ready. Proceed to preview or run batch actions."}
              {showPreview && "Review the summary below before executing."}
              {isExecuting && "Deleting categories…"}
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
                {summary.needsResolution > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={resolveAllWithCascade}>
                      Resolve all with cascade
                    </Button>
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value) resolveAllWithTransfer(value);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Resolve all with transfer…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Transfer to</SelectLabel>
                          {transferTargetOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </div>
                )}
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
                          <p className="text-xs text-muted-foreground">Category will be deleted.</p>
                        )}
                        {item.status === ITEM_STATUS_ENUM.NEEDS_RESOLUTION && (
                          <p className="text-xs text-muted-foreground">
                            Has {item.dependenciesCount} dependencies
                            ({item.subcategoriesCount} subcategories, {item.productsCount} products).
                          </p>
                        )}
                        {item.resolutionAction === "cascade" && (
                          <p className="text-xs text-emerald-600">Resolved (Cascade).</p>
                        )}
                        {item.resolutionAction === "transfer" && item.transferTarget && (
                          <p className="text-xs text-emerald-600">
                            Resolved (Transfer to {transferTargetOptions.find((o) => o.value === item.transferTarget)?.label ?? "category"}).
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
                    <li>Categories to delete: <strong>{preview.summary?.categoriesToDelete ?? 0}</strong></li>
                    <li>Total subcategories affected: <strong>{preview.summary?.totalSubcategoriesAffected ?? 0}</strong></li>
                    <li>Total products affected: <strong>{preview.summary?.totalProductsAffected ?? 0}</strong></li>
                  </ul>
                </div>
                {preview.categories?.length > 0 && (
                  <div className="rounded-lg border p-3 border-gray-300">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Categories</p>
                    <p className="text-sm">{preview.categories.map((c) => c.name).join(", ")}</p>
                  </div>
                )}
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
        title="Resolve category dependencies"
        dependencyData={
          resolvingItem
            ? {
                id: resolvingItem.id,
                name: resolvingItem.name,
                subcategoriesCount: resolvingItem.subcategoriesCount ?? 0,
                productsCount: resolvingItem.productsCount ?? 0,
              }
            : null
        }
        childLabel="subcategories"
        linkedLabel="linked products"
        transferDescription="Move all subcategories and product links to another category before deleting this one."
        cascadeDescription="This will permanently delete this category and all its subcategories. This action cannot be undone."
        onChooseTransfer={handleChooseTransfer}
        onChooseCascade={handleChooseCascade}
      />

      <TransferDependenciesDialog
        open={singleTransferOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSingleTransferTargetId("");
            setResolvingItemId(null);
          }
          setSingleTransferOpen(open);
        }}
        title="Transfer category dependencies"
        description="Select the target category to move all subcategories and product links to."
        targetOptions={transferTargetOptions}
        value={singleTransferTargetId}
        onValueChange={setSingleTransferTargetId}
        onSubmit={() => handleTransferSubmit(singleTransferTargetId)}
        submitLabel="Confirm transfer"
      />
    </>
  );
}
