/**
 * useProductBulkDependencyManager
 * State machine for bulk product deletion: analyze → preview → execute.
 * Products linked to orders cannot be deleted (blocked); only no_deps products are deleted.
 * Uses POST /products/check-bulk-dependencies, bulk-delete-preview, bulk-delete.
 */

import { useState, useCallback } from "react";
import api from "@/utils/api";

const STATUS = {
  IDLE: "idle",
  ANALYZING: "analyzing",
  READY: "ready",
  EXECUTING: "executing",
  COMPLETED: "completed",
  FAILED: "failed",
};

const ITEM_STATUS = {
  NO_DEPS: "no_deps",
  NEEDS_RESOLUTION: "needs_resolution",
};

export function useProductBulkDependencyManager(options = {}) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState({
    operationId: null,
    status: STATUS.IDLE,
    summary: { total: 0, noDeps: 0, needsResolution: 0 },
    items: [],
    selectedProductIds: [],
    preview: null,
    error: null,
  });

  const startAnalysis = useCallback(
    async (productIds) => {
      if (!productIds?.length) return;
      setState((prev) => ({
        ...prev,
        selectedProductIds: productIds,
        status: STATUS.ANALYZING,
        error: null,
        items: [],
        summary: { total: 0, noDeps: 0, needsResolution: 0 },
        preview: null,
      }));

      try {
        const { data } = await api.post("/products/check-bulk-dependencies", {
          productIds,
        });
        if (!data.success) throw new Error(data.message || "Check failed");

        setState((prev) => ({
          ...prev,
          operationId: data.operationId,
          summary: data.summary || { total: 0, noDeps: 0, needsResolution: 0 },
          items: (data.items || []).map((i) => ({
            ...i,
            status:
              i.status || (i.dependenciesCount > 0 ? ITEM_STATUS.NEEDS_RESOLUTION : ITEM_STATUS.NO_DEPS),
          })),
          status: STATUS.READY,
          error: null,
        }));
      } catch (err) {
        const message =
          err?.response?.data?.message || err?.message || "Failed to check dependencies";
        setState((prev) => ({
          ...prev,
          status: STATUS.FAILED,
          error: message,
        }));
        onError?.(message);
      }
    },
    [onError]
  );

  const fetchPreview = useCallback(async () => {
    const { selectedProductIds } = state;
    if (!selectedProductIds?.length) return null;

    try {
      const { data } = await api.post("/products/bulk-delete-preview", {
        productIds: selectedProductIds,
      });
      if (!data.success) throw new Error(data.message || "Preview failed");
      setState((prev) => ({ ...prev, preview: data }));
      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Preview failed";
      setState((prev) => ({ ...prev, error: message }));
      onError?.(message);
      return null;
    }
  }, [state.selectedProductIds, onError]);

  const executeBulkDelete = useCallback(async () => {
    const { selectedProductIds } = state;
    if (!selectedProductIds?.length) return false;

    setState((prev) => ({ ...prev, status: STATUS.EXECUTING, error: null }));

    try {
      const { data } = await api.post("/products/bulk-delete", {
        productIds: selectedProductIds,
      });
      if (!data.success) throw new Error(data.message || "Bulk delete failed");

      setState((prev) => ({
        ...prev,
        status: STATUS.COMPLETED,
        preview: null,
        error: null,
      }));
      onSuccess?.(data);
      return true;
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Bulk delete failed";
      setState((prev) => ({
        ...prev,
        status: STATUS.FAILED,
        error: message,
      }));
      onError?.(message);
      return false;
    }
  }, [state.selectedProductIds, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      operationId: null,
      status: STATUS.IDLE,
      summary: { total: 0, noDeps: 0, needsResolution: 0 },
      items: [],
      selectedProductIds: [],
      preview: null,
      error: null,
    });
  }, []);

  const noDepsCount = state.items.filter((i) => i.status === ITEM_STATUS.NO_DEPS).length;
  const totalCount = state.items.length;
  const canProceed = totalCount > 0 && noDepsCount > 0;

  return {
    state,
    status: state.status,
    summary: state.summary,
    items: state.items,
    preview: state.preview,
    error: state.error,
    selectedProductIds: state.selectedProductIds,
    noDepsCount,
    totalCount,
    canProceed,
    startAnalysis,
    fetchPreview,
    executeBulkDelete,
    reset,
    STATUS,
    ITEM_STATUS,
  };
}
