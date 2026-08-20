/**
 * ProductDependencyDialog
 * Shown when a product has order dependencies.
 * Offers: Close (cancel) or Cascade (remove product from all orders and delete).
 * No transfer option for products.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import { format } from "date-fns";

export function ProductDependencyDialog({
  open,
  onOpenChange,
  title = "Product has order dependencies",
  dependencyData,
  /** Called when user chooses Cascade → parent should open cascade confirm modal */
  onChooseCascade,
  /** Description for cascade option */
  cascadeDescription = "This will remove this product from all orders and then delete it. This action cannot be undone.",
}) {
  const ordersCount = dependencyData?.ordersCount ?? dependencyData?.linkedCount ?? 0;
  const orders = dependencyData?.orders ?? [];
  const productName = dependencyData?.name ?? "This product";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{productName}</span>{" "}
            is linked to{" "}
            <span className="font-medium">{ordersCount}</span>{" "}
            {ordersCount === 1 ? "order" : "orders"}.{" "}
            Choose how you would like to proceed.
          </DialogDescription>
        </DialogHeader>

        {orders.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-semibold text-amber-800">Linked orders</h4>
            <ul className="text-sm text-amber-900 space-y-1">
              {orders.map((o) => (
                <li key={o._id} className="flex justify-between gap-2">
                  <span className="font-medium">{o.invoiceNo ?? o._id}</span>
                  {o.createdAt && (
                    <span className="text-amber-700">
                      {format(new Date(o.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 mt-4">
          <div>
            <h4 className="text-sm font-semibold text-red-600">
              Permanent Deletion (Cascade)
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
            Delete and remove from orders
          </Button>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
