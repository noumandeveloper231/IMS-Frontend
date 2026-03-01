/**
 * ProductBulkDependencyModal
 * Bulk product deletion with dependency listing: shows which products can be deleted
 * and which are linked to orders (blocked). No transfer/cascade - only delete no_deps.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useProductBulkDependencyManager } from "@/hooks/useProductBulkDependencyManager";

const ITEM_STATUS = {
  NO_DEPS: "no_deps",
  NEEDS_RESOLUTION: "needs_resolution",
};

export function ProductBulkDependencyModal({
  open,
  onOpenChange,
  manager,
  onComplete,
}) {
  const {
    status,
    summary,
    items,
    preview,
    error,
    noDepsCount,
    totalCount,
    canProceed,
    fetchPreview,
    executeBulkDelete,
    reset,
    STATUS,
    ITEM_STATUS: ITEM_STATUS_ENUM,
  } = manager;

  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleClose = (isOpen) => {
    if (!isOpen) {
      reset();
      setShowPreview(false);
      onOpenChange?.(false);
    }
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
  const isReady = status === STATUS.READY;
  const isExecuting = status === STATUS.EXECUTING;
  const isCompleted = status === STATUS.COMPLETED;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk delete products</DialogTitle>
          <DialogDescription>
            {isAnalyzing && "Checking order dependencies for selected products…"}
            {isReady && !showPreview &&
              `${noDepsCount} product(s) can be deleted, ${summary.needsResolution ?? 0} are linked to orders and cannot be deleted.`}
            {showPreview && "Review the summary below before executing."}
            {isExecuting && "Deleting products…"}
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
                <strong>{noDepsCount}</strong> can be deleted · <strong>{summary.needsResolution ?? 0}</strong> linked to orders (blocked)
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
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                      {item.status === ITEM_STATUS_ENUM.NO_DEPS && (
                        <p className="text-xs text-muted-foreground">Will be deleted.</p>
                      )}
                      {item.status === ITEM_STATUS_ENUM.NEEDS_RESOLUTION && (
                        <p className="text-xs text-amber-600">
                          Linked to {item.ordersCount} order(s). Cannot delete.
                        </p>
                      )}
                    </div>
                  </div>
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
                    Products to delete: <strong>{preview.summary?.toDelete ?? 0}</strong>
                  </li>
                  {preview.summary?.blocked > 0 && (
                    <li>
                      Products linked to orders (skipped): <strong>{preview.summary.blocked}</strong>
                    </li>
                  )}
                </ul>
              </div>
              {preview.toDelete?.length > 0 && (
                <div className="rounded-lg border p-3 border-gray-300">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Products to delete</p>
                  <p className="text-sm">{preview.toDelete.map((p) => p.name).join(", ")}</p>
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
                disabled={isExecuting || (preview.summary?.toDelete ?? 0) === 0}
                onClick={handleExecute}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
