/**
 * useBrandBulkDependencyManager
 * State machine for bulk brand deletion: analyze → resolve → preview → execute.
 * Uses POST /brands/check-bulk-dependencies, bulk-delete-preview, bulk-delete.
 * Dependencies are based on linked products.
 */

import { useState, useCallback } from "react";
import api from "@/utils/api";

const STATUS = {
  IDLE: "idle",
  ANALYZING: "analyzing",
  RESOLVING: "resolving",
  READY: "ready",
  EXECUTING: "executing",
  COMPLETED: "completed",
  FAILED: "failed",
};

const ITEM_STATUS = {
  NO_DEPS: "no_deps",
  NEEDS_RESOLUTION: "needs_resolution",
  RESOLVING: "resolving",
  RESOLVED: "resolved",
};

const RESOLUTION_ACTION = {
  DELETE: "delete",
  CASCADE: "cascade",
  TRANSFER: "transfer",
};

function buildResolutionPlan(items) {
  return items.map((item) => {
    if (item.status === ITEM_STATUS.NO_DEPS) {
      return { id: item.id, action: RESOLUTION_ACTION.DELETE };
    }
    if (item.resolutionAction === RESOLUTION_ACTION.CASCADE) {
      return { id: item.id, action: RESOLUTION_ACTION.CASCADE };
    }
    if (
      item.resolutionAction === RESOLUTION_ACTION.TRANSFER &&
      item.transferTarget
    ) {
      return {
        id: item.id,
        action: RESOLUTION_ACTION.TRANSFER,
        transferTo: item.transferTarget,
      };
    }
    return { id: item.id, action: RESOLUTION_ACTION.DELETE };
  });
}

function allResolved(items) {
  return items.every((item) => {
    if (item.status === ITEM_STATUS.NO_DEPS) return true;
    if (
      item.status !== ITEM_STATUS.NEEDS_RESOLUTION &&
      item.status !== ITEM_STATUS.RESOLVING
    ) {
      return (
        !!item.resolutionAction &&
        (item.resolutionAction !== "transfer" || !!item.transferTarget)
      );
    }
    return false;
  });
}

export function useBrandBulkDependencyManager(options = {}) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState({
    operationId: null,
    status: STATUS.IDLE,
    summary: { total: 0, noDeps: 0, needsResolution: 0 },
    items: [],
    selectedBrandIds: [],
    preview: null,
    error: null,
  });

  const startAnalysis = useCallback(
    async (brandIds) => {
      if (!brandIds?.length) return;
      setState((prev) => ({
        ...prev,
        selectedBrandIds: brandIds,
        status: STATUS.ANALYZING,
        error: null,
        items: [],
        summary: { total: 0, noDeps: 0, needsResolution: 0 },
      }));

      try {
        const { data } = await api.post("/brands/check-bulk-dependencies", {
          brandIds,
        });
        if (!data.success) throw new Error(data.message || "Check failed");

        setState((prev) => ({
          ...prev,
          operationId: data.operationId,
          summary:
            data.summary || { total: 0, noDeps: 0, needsResolution: 0 },
          items: (data.items || []).map((i) => ({
            ...i,
            status:
              i.status ||
              (i.dependenciesCount > 0
                ? ITEM_STATUS.NEEDS_RESOLUTION
                : ITEM_STATUS.NO_DEPS),
            resolutionAction: i.resolutionAction ?? null,
            transferTarget: i.transferTarget ?? null,
          })),
          status:
            data.summary?.needsResolution > 0
              ? STATUS.RESOLVING
              : STATUS.READY,
          error: null,
        }));
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to check dependencies";
        setState((prev) => ({
          ...prev,
          status: STATUS.FAILED,
          error: message,
        }));
        onError?.(message);
      }
    },
    [onError],
  );

  const setItemResolution = useCallback(
    (itemId, resolutionAction, transferTarget = null) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: ITEM_STATUS.RESOLVED,
                resolutionAction,
                transferTarget:
                  resolutionAction === RESOLUTION_ACTION.TRANSFER
                    ? transferTarget
                    : null,
              }
            : item,
        ),
      }));
    },
    [],
  );

  const setResolvingItem = useCallback((itemId, resolving) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: resolving ? ITEM_STATUS.RESOLVING : item.status,
            }
          : item,
      ),
    }));
  }, []);

  const resolveAllWithCascade = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.status === ITEM_STATUS.NEEDS_RESOLUTION
          ? {
              ...item,
              status: ITEM_STATUS.RESOLVED,
              resolutionAction: RESOLUTION_ACTION.CASCADE,
              transferTarget: null,
            }
          : item,
      ),
    }));
  }, []);

  const resolveAllWithTransfer = useCallback((transferToBrandId) => {
    if (!transferToBrandId) return;
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.status === ITEM_STATUS.NEEDS_RESOLUTION
          ? {
              ...item,
              status: ITEM_STATUS.RESOLVED,
              resolutionAction: RESOLUTION_ACTION.TRANSFER,
              transferTarget: transferToBrandId,
            }
          : item,
      ),
    }));
  }, []);

  const fetchPreview = useCallback(async () => {
    const { items, selectedBrandIds } = state;
    if (!items.length || !selectedBrandIds?.length) return null;

    const resolutionPlan = buildResolutionPlan(items);
    try {
      const { data } = await api.post("/brands/bulk-delete-preview", {
        brandIds: selectedBrandIds,
        resolutionPlan,
      });
      if (!data.success) throw new Error(data.message || "Preview failed");
      setState((prev) => ({ ...prev, preview: data }));
      return data;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Preview failed";
      setState((prev) => ({ ...prev, error: message }));
      onError?.(message);
      return null;
    }
  }, [state.items, state.selectedBrandIds, onError]);

  const executeBulkDelete = useCallback(async () => {
    const { items, selectedBrandIds } = state;
    if (!items.length || !selectedBrandIds?.length) return false;
    if (!allResolved(items)) return false;

    const resolutionPlan = buildResolutionPlan(items);
    setState((prev) => ({
      ...prev,
      status: STATUS.EXECUTING,
      error: null,
    }));

    try {
      const { data } = await api.post("/brands/bulk-delete", {
        brandIds: selectedBrandIds,
        resolutionPlan,
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
        err?.response?.data?.message ||
        err?.message ||
        "Bulk delete failed";
      setState((prev) => ({
        ...prev,
        status: STATUS.FAILED,
        error: message,
      }));
      onError?.(message);
      return false;
    }
  }, [state.items, state.selectedBrandIds, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      operationId: null,
      status: STATUS.IDLE,
      summary: { total: 0, noDeps: 0, needsResolution: 0 },
      items: [],
      selectedBrandIds: [],
      preview: null,
      error: null,
    });
  }, []);

  const resolvedCount = state.items.filter(
    (i) =>
      i.status === ITEM_STATUS.NO_DEPS ||
      (i.resolutionAction &&
        (i.resolutionAction !== "transfer" || i.transferTarget)),
  ).length;
  const totalCount = state.items.length;
  const canProceed = totalCount > 0 && allResolved(state.items);

  return {
    state,
    status: state.status,
    summary: state.summary,
    items: state.items,
    preview: state.preview,
    error: state.error,
    selectedBrandIds: state.selectedBrandIds,
    resolvedCount,
    totalCount,
    canProceed,
    startAnalysis,
    setItemResolution,
    setResolvingItem,
    resolveAllWithCascade,
    resolveAllWithTransfer,
    fetchPreview,
    executeBulkDelete,
    reset,
    STATUS,
    ITEM_STATUS,
    RESOLUTION_ACTION,
  };
}

