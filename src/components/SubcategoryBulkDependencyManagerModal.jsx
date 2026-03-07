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

export function SubcategoryBulkDependencyManagerModal({
  open,
  onOpenChange,
  manager,
  subcategories = [],
  onComplete,
}) {
  const {
    state,
    status,
    summary,
    items,
    error,
    selectedSubcategoryIds,
    resolvedCount,
    totalCount,
    canProceed,
    setItemResolution,
    setResolvingItem,
    resolveAllWithCascade,
    resolveAllWithTransfer,
    executeBulkDelete,
    reset,
    STATUS,
    ITEM_STATUS,
  } = manager;

  const [singleResolveOpen, setSingleResolveOpen] = useState(false);
  const [singleTransferOpen, setSingleTransferOpen] = useState(false);
  const [singleTransferTargetId, setSingleTransferTargetId] = useState("");
  const [resolvingItemId, setResolvingItemId] = useState(null);

  const selectedSet = useMemo(
    () => new Set(selectedSubcategoryIds || []),
    [selectedSubcategoryIds],
  );

  const resolvingItem = useMemo(
    () => items.find((i) => i.id === resolvingItemId),
    [items, resolvingItemId],
  );

  const transferTargetOptions = useMemo(
    () =>
      (subcategories || [])
        .filter((s) => s._id && !selectedSet.has(s._id))
        .map((s) => ({ value: s._id, label: s.name })),
    [subcategories, selectedSet],
  );

  const handleClose = (isOpen) => {
    if (!isOpen) {
      reset();
      setSingleResolveOpen(false);
      setSingleTransferOpen(false);
      setResolvingItemId(null);
      onOpenChange?.(false);
    }
  };

  const handleResolveClick = (item) => {
    if (item.status !== ITEM_STATUS.NEEDS_RESOLUTION) return;
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

  const handleTransferSubmit = (transferToSubcategoryId) => {
    if (!resolvingItemId || !transferToSubcategoryId) return;
    setItemResolution(resolvingItemId, "transfer", transferToSubcategoryId);
    setSingleTransferOpen(false);
    setSingleTransferTargetId("");
    setResolvingItemId(null);
  };

  const handleExecute = async () => {
    const success = await executeBulkDelete();
    if (success) {
      onComplete?.();
      handleClose(false);
    }
  };

  const isAnalyzing = status === STATUS.ANALYZING;
  const isExecuting = status === STATUS.EXECUTING;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk delete subcategories</DialogTitle>
            <DialogDescription>
              {isAnalyzing && "Checking dependencies for selected subcategories…"}
              {!isAnalyzing &&
                `Resolve dependencies for each subcategory (${resolvedCount} / ${totalCount} resolved).`}
              {isExecuting && "Deleting subcategories…"}
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

          {!isAnalyzing && items.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-300">
                <span className="text-sm text-muted-foreground">
                  Progress: <strong>{resolvedCount}</strong> /{" "}
                  <strong>{totalCount}</strong> resolved
                </span>
                {summary.needsResolution > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resolveAllWithCascade}
                    >
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
                      {item.status === ITEM_STATUS.NO_DEPS && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {item.status === ITEM_STATUS.NEEDS_RESOLUTION && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                        </span>
                      )}
                      {(item.status === ITEM_STATUS.RESOLVED ||
                        item.resolutionAction) && (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.status === ITEM_STATUS.NO_DEPS && (
                          <p className="text-xs text-muted-foreground">
                            Subcategory will be deleted.
                          </p>
                        )}
                        {item.status === ITEM_STATUS.NEEDS_RESOLUTION && (
                          <p className="text-xs text-muted-foreground">
                            Has {item.dependenciesCount} dependencies (
                            {item.productsCount} products).
                          </p>
                        )}
                        {item.resolutionAction === "cascade" && (
                          <p className="text-xs text-emerald-600">
                            Resolved (Cascade).
                          </p>
                        )}
                        {item.resolutionAction === "transfer" &&
                          item.transferTarget && (
                            <p className="text-xs text-emerald-600">
                              Resolved (Transfer to{" "}
                              {transferTargetOptions.find(
                                (o) => o.value === item.transferTarget,
                              )?.label ?? "subcategory"}
                              ).
                            </p>
                        )}
                      </div>
                    </div>
                    {item.status === ITEM_STATUS.NEEDS_RESOLUTION && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveClick(item)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter className="border-t pt-4 border-gray-300">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canProceed || isExecuting}
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
        title="Resolve Subcategory Dependencies"
        dependencyData={
          resolvingItem
            ? {
                id: resolvingItem.id,
                name: resolvingItem.name,
                subcategoriesCount: 0,
                productsCount: resolvingItem.productsCount ?? 0,
              }
            : null
        }
        childLabel=""
        linkedLabel="linked products"
        transferDescription="Move all product links to another subcategory before deleting this one."
        cascadeDescription="This will permanently unlink this subcategory from all products and delete the subcategory. This action cannot be undone."
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
        title="Transfer Subcategory Dependencies"
        description="Select the target subcategory to move all product links to."
        targetOptions={transferTargetOptions}
        value={singleTransferTargetId}
        onValueChange={setSingleTransferTargetId}
        onSubmit={() => handleTransferSubmit(singleTransferTargetId)}
        submitLabel="Confirm transfer"
      />
    </>
  );
}

