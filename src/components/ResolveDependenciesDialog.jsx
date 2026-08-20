import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import { Combobox } from "@/components/UI/combobox";

/**
 * Choice dialog: entity has dependencies. User chooses "Transfer" or "Cascade".
 * Use with TransferDependenciesDialog and DeleteModel for cascade.
 */
export function ResolveDependenciesDialog({
  open,
  onOpenChange,
  title = "Resolve Dependencies",
  dependencyData,
  /** Label for the count of child items (e.g. "subcategories") */
  childLabel = "subcategories",
  /** Label for linked items count (e.g. "linked products") */
  linkedLabel = "linked products",
  /** Called when user chooses Transfer → parent should open TransferDependenciesDialog */
  onChooseTransfer,
  /** Called when user chooses Cascade → parent should open cascade confirm modal */
  onChooseCascade,
  /** Optional custom description for transfer option */
  transferDescription = "Move all dependencies to another item before deleting this one.",
  /** Optional custom description for cascade option */
  cascadeDescription = "This will permanently delete this item and all its dependencies. This action cannot be undone.",
}) {
  const count = dependencyData?.subcategoriesCount ?? dependencyData?.childCount ?? 0;
  const linked = dependencyData?.productsCount ?? dependencyData?.linkedCount ?? 0;
  const hasCounts = count > 0 || linked > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {dependencyData && (
              <>
                <span className="font-medium text-foreground">
                  {dependencyData.name}
                </span>{" "}
                contains{" "}
                {hasCounts && (
                  <>
                    {count > 0 && (
                      <>
                        <span className="font-medium">{count}</span> {childLabel}
                        {linked > 0 && " and "}
                      </>
                    )}
                    {linked > 0 && (
                      <>
                        <span className="font-medium">{linked}</span> {linkedLabel}
                      </>
                    )}
                    .
                  </>
                )}
                <br />
                Please choose how you would like to proceed.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold">
                Transfer Dependencies
              </h4>
              <p className="text-xs text-muted-foreground">
                {transferDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onChooseTransfer?.();
              }}
            >
              Transfer to another
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
              <span className="bg-background px-2">Or</span>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-red-600">
                Permanent Deletion
              </h4>
              <p className="text-xs text-red-500">
                {cascadeDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onChooseCascade?.();
              }}
            >
              Delete everything
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Transfer dependencies modal: select target and submit.
 * Use after ResolveDependenciesDialog when user chooses "Transfer".
 */
export function TransferDependenciesDialog({
  open,
  onOpenChange,
  title = "Transfer Dependencies",
  description = "Select the target item to move all dependencies to, then confirm.",
  targetOptions = [],
  value,
  onValueChange,
  onSubmit,
  loading = false,
  submitLabel = "Transfer & Delete",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Combobox
            options={targetOptions}
            value={value}
            onChange={onValueChange}
            placeholder="Select target"
          />
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!value || loading}
            className="w-full"
          >
            {loading ? "Please wait..." : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
