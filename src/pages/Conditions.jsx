import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import api from "../utils/api";
import { API_BASE_URL, API_HOST } from "../config/api";
import { Trash2, Pencil, Check, X, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Field, FieldLabel } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { CustomRowsPerPageInput } from "@/components/UI/custom-rows-per-page-input";
import { Button } from "@/components/UI/button";
import { Label } from "@/components/UI/label";
import { DeleteModel } from "@/components/DeleteModel";
import { Textarea } from "@/components/UI/textarea";
import { Combobox } from "@/components/UI/combobox";
import {
  ResolveDependenciesDialog,
  TransferDependenciesDialog,
} from "@/components/ResolveDependenciesDialog";
import { BulkDependencyManagerModal } from "@/components/BulkDependencyManagerModal";
import { useConditionBulkDependencyManager } from "@/hooks/useConditionBulkDependencyManager";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/UI/drawer";
import {
  Select as UiSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/UI/select";
import { DataTable } from "@/components/UI/data-table";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { ConditionFormDrawer } from "@/components/ConditionFormDrawer";
import { useImageModal } from "@/context/ImageModalContext";
import { useUploadQueue } from "@/context/UploadQueueContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/UI/tooltip";
import { UploadAlert } from "@/components/UploadAlert";
import axios from "axios";
import ImageWithFallback from "@/components/UI/ImageWithFallback";

const resolveImageUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${API_HOST}${src}`;
};

const ConditionImageCell = memo(({ src, alt, onClick }) => (
  <div className="flex items-center">
    <ImageWithFallback
      src={src}
      alt={alt}
      onClick={onClick}
      className="w-24 h-24 object-contain rounded-lg border border-gray-300 shadow cursor-pointer"
    />
  </div>
));

ConditionImageCell.displayName = "ConditionImageCell";

const TEMPLATE_COLUMNS = ["Name", "Image"];
/** Only Name is required in the file; Image column is optional. */
const REQUIRED_FILE_COLUMNS = ["Name"];

/** Stable empty array so conditions don't get new ref when data is undefined (avoids column remount / focus loss). */
const EMPTY_ARRAY = [];

const normalizeConditionName = (value) =>
  (value ?? "").toString().trim().toLowerCase();

const normalizeImageUrl = (value) => {
  const v = (value ?? "").toString().trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return "https://" + v;
};

const isValidImageUrl = (value) => {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return false;
  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
};

const normalizeKey = (key) =>
  key
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Description textarea with local state so parent doesn't re-render on every keystroke. */
const DescriptionField = forwardRef(function DescriptionField(
  { initialValue = "", min: minChars, max: maxChars },
  ref,
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => value,
    }),
    [value],
  );

  return (
    <>
      <Textarea
        id="condition-description"
        placeholder="Optional. If provided: 100–350 characters."
        className="min-h-[80px]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxChars}
      />
      {value.length > 0 && (
        <p
          className={`mt-1 text-sm ${
            value.length >= minChars && value.length <= maxChars
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {value.length} / {maxChars} characters
          {value.length > 0 &&
            value.length < minChars &&
            ` — min ${minChars} required`}
        </p>
      )}
    </>
  );
});

const Conditions = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { page: pageParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openImageModal } = useImageModal();
  const { addUploads } = useUploadQueue();

  const [editingCondition, setEditingCondition] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [conditionDrawerOpen, setConditionDrawerOpen] = useState(false);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    errors: 0,
    duplicates: 0,
  });
  const [importLoading, setImportLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customItemsPerPage, setCustomItemsPerPage] = useState("");
  const [selectedConditionIds, setSelectedConditionIds] = useState([]);
  const [highlightedConditionId, setHighlightedConditionId] = useState(null);
  const [tableRowSelection, setTableRowSelection] = useState({});
  const [bulkManagerOpen, setBulkManagerOpen] = useState(false);
  const [deleteWithDepsOpen, setDeleteWithDepsOpen] = useState(false);
  const [deleteWithDepsData, setDeleteWithDepsData] = useState(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [cascadeConfirmOpen, setCascadeConfirmOpen] = useState(false);
  const [cascadeDeleteLoading, setCascadeDeleteLoading] = useState(false);
  const [imageUploadState, setImageUploadState] = useState(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const imageUploadAbortRef = useRef(null);
  const conditionsRef = useRef(EMPTY_ARRAY);
  const conditionDrawerOpenRef = useRef(conditionDrawerOpen);

  useEffect(() => {
    conditionDrawerOpenRef.current = conditionDrawerOpen;
  }, [conditionDrawerOpen]);

  const initialPageIndex = useMemo(() => {
    const pageNumber = parseInt(pageParam || "1", 10);
    if (Number.isNaN(pageNumber) || pageNumber < 1) return 0;
    return pageNumber - 1;
  }, [pageParam]);

  const handlePageChange = useCallback(
    (pageIndex) => {
      const pageNumber = pageIndex + 1;
      if (pageNumber <= 1) {
        navigate("/conditions", { replace: true });
      } else {
        navigate(`/conditions/page/${pageNumber}`, { replace: true });
      }
    },
    [navigate],
  );

  // Open Import Excel drawer when a file is dragged over the page (not when Add/Edit Condition drawer is open); close when drag leaves
  useEffect(() => {
    const hasFiles = (e) => e.dataTransfer?.types?.includes("Files");
    const onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      if (conditionDrawerOpenRef.current) return;
      e.preventDefault();
      setImportDrawerOpen(true);
    };
    const onDragOver = (e) => {
      if (!hasFiles(e)) return;
      if (conditionDrawerOpenRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      if (conditionDrawerOpenRef.current) return;
      if (e.relatedTarget != null && document.body.contains(e.relatedTarget))
        return;
      setImportDrawerOpen(false);
    };
    const onDrop = (e) => {
      if (!hasFiles(e)) return;
      if (conditionDrawerOpenRef.current) return;
      e.preventDefault();
    };
    document.addEventListener("dragenter", onDragEnter, false);
    document.addEventListener("dragover", onDragOver, false);
    document.addEventListener("dragleave", onDragLeave, false);
    document.addEventListener("drop", onDrop, false);
    return () => {
      document.removeEventListener("dragenter", onDragEnter, false);
      document.removeEventListener("dragover", onDragOver, false);
      document.removeEventListener("dragleave", onDragLeave, false);
      document.removeEventListener("drop", onDrop, false);
    };
  }, []);

  const effectiveItemsPerPage = useMemo(() => {
    const custom = parseInt(customItemsPerPage, 10);
    if (!isNaN(custom) && custom >= 1 && custom <= 500) return custom;
    return itemsPerPage;
  }, [itemsPerPage, customItemsPerPage]);

  const { data: conditionsData, isLoading: conditionsLoading } = useQuery({
    queryKey: ["conditions"],
    queryFn: async () => {
      const res = await api.get("/conditions/getallcount");
      return res.data?.conditions ?? [];
    },
  });
  const conditions = conditionsData ?? EMPTY_ARRAY;
  conditionsRef.current = conditions;

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post("/conditions/create", formData);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Condition created ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
        setConditionDrawerOpen(false);
        setEditingCondition(null);
      } else {
        toast.error(data?.message || "Failed to create ❌");
      }
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        toast.error("Condition already exists ❌");
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to create condition. Please try again ❌");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => {
      const res = await api.put(`/conditions/update/${id}`, formData);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(data?.message || "Condition updated ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
        setConditionDrawerOpen(false);
        setEditingCondition(null);
      } else {
        toast.error(data?.message || "Failed to update ❌");
      }
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (
        error?.response?.status === 409 ||
        /already exists?/i.test(messageFromServer || "")
      ) {
        toast.error("Condition already exists ❌");
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to update condition. Please try again ❌");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/conditions/delete/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success("Condition has been deleted successfully ✅");
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
      } else {
        toast.error("Failed to delete condition ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
    onError: (error) => {
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;

      if (error?.response?.status === 409) {
        toast.error(
          messageFromServer ||
            "Cannot delete condition because it is linked with other records ❌",
        );
      } else if (messageFromServer) {
        toast.error(messageFromServer);
      } else {
        toast.error("Unable to delete condition. Please try again ❌");
      }
      setDeleteOpen(false);
      setDeleteId(null);
    },
  });

  const loading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const bulkManager = useConditionBulkDependencyManager({
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      setSelectedConditionIds([]);
      setTableRowSelection({});
      const count = data?.deleted?.length ?? 0;
      toast.success(`Deleted ${count} conditions successfully`);
    },
    onError: (message) => {
      toast.error(message || "Bulk delete failed");
    },
  });

  useEffect(() => {
    if (
      bulkManagerOpen &&
      selectedConditionIds.length > 0 &&
      bulkManager.status === "idle"
    ) {
      bulkManager.startAnalysis(selectedConditionIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only start when modal opens
  }, [bulkManagerOpen]);

  const handleClick = useCallback(
    (id) => {
      navigate(`/products/list?filterType=condition&filter=${id}`);
    },
    [navigate],
  );

  const handleSubmitForm = async ({
    name,
    description,
    tags,
    exampleProductImages,
    image,
    imageMediaId,
  }) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(Array.isArray(tags) ? tags : []));
    formData.append(
      "exampleProductImages",
      JSON.stringify(
        Array.isArray(exampleProductImages) ? exampleProductImages : [],
      ),
    );
    if (imageMediaId) {
      formData.append("image", String(imageMediaId));
    } else if (image) {
      formData.append("image", image);
    }

    if (editingCondition) {
      await updateMutation.mutateAsync({ id: editingCondition._id, formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = useCallback((cond) => {
    setEditingCondition(cond);
    setConditionDrawerOpen(true);
    toast.info(`Editing condition: ${cond.name}`);
  }, []);

  const confirmDelete = useCallback(async (id) => {
    try {
      const res = await api.get(`/conditions/dependencies/${id}`);
      const data = res.data;
      const hasDependencies = data?.hasDependencies === true;
      const condName =
        (conditionsRef.current || []).find((c) => c._id === id)?.name ??
        "Condition";
      if (hasDependencies) {
        setDeleteWithDepsData({
          id,
          name: condName,
          subcategoriesCount: 0,
          productsCount: data.productsCount ?? 0,
        });
        setDeleteWithDepsOpen(true);
        setTransferTargetId("");
      } else {
        setDeleteId(id);
        setDeleteOpen(true);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error("Condition not found");
        return;
      }
      toast.error(
        err?.response?.data?.message ||
          "Could not check condition dependencies",
      );
    }
  }, []);

  const handleCascadeDeleteConfirmed = async () => {
    if (!deleteId) return;
    setCascadeDeleteLoading(true);
    try {
      const res = await api.delete(
        `/conditions/delete/${deleteId}?cascade=true`,
      );
      if (res.data?.success) {
        toast.success(
          "Condition and its product links have been updated successfully ✅",
        );
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
      } else {
        toast.error("Failed to delete condition ❌");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete condition ❌",
      );
    } finally {
      setCascadeDeleteLoading(false);
      setCascadeConfirmOpen(false);
      setDeleteId(null);
      setDeleteWithDepsOpen(false);
      setDeleteWithDepsData(null);
    }
  };

  const handleTransferProceed = async () => {
    if (!deleteWithDepsData?.id || !transferTargetId) {
      toast.error("Please select a condition to transfer to");
      return;
    }
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/conditions/transfer/${deleteWithDepsData.id}`,
        { transferToConditionId: transferTargetId },
        { headers: { "Content-Type": "application/json" } },
      );
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ["conditions"] });
        toast.success(
          "Dependencies transferred and condition deleted successfully",
        );
        setDeleteWithDepsOpen(false);
        setTransferDialogOpen(false);
        setDeleteWithDepsData(null);
        setTransferTargetId("");
      } else {
        toast.error(data?.message || "Transfer failed");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        (typeof err?.response?.data === "string" ? err.response.data : null) ??
        "Transfer failed";
      toast.error(msg);
    }
  };

  const handleDeleteConfirmed = useCallback(() => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  }, [deleteId, deleteMutation]);

  const filteredConditions = useMemo(
    () =>
      (conditions || []).filter((c) =>
        (c.name || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [conditions, search],
  );

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (!highlightId || conditionsLoading || conditions.length === 0) return;

    const highlightedCondition = conditions.find((c) => c._id === highlightId);
    if (!highlightedCondition) return;

    setHighlightedConditionId(highlightedCondition._id);
    requestAnimationFrame(() => {
      const rowEl = document.querySelector(
        `[data-highlight-target="${highlightedCondition._id}"]`,
      );
      rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("highlight");
    setSearchParams(nextParams, { replace: true });
  }, [
    searchParams,
    setSearchParams,
    conditionsLoading,
    conditions,
  ]);

  useEffect(() => {
    if (!highlightedConditionId) return;
    const timer = setTimeout(() => setHighlightedConditionId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedConditionId]);

  const validateFileColumns = (rows) => {
    if (!rows.length) return { ok: false, message: "File is empty." };
    const first = rows[0];
    const keys = Object.keys(first || {});
    const normalized = keys.map((k) => normalizeKey(k));
    const hasName = normalized.includes("name");
    if (!hasName) {
      return {
        ok: false,
        message:
          "File does not contain the required column 'Name'. Please use the template.",
      };
    }
    return { ok: true };
  };

  const normalizeRowToTemplate = (row) => {
    const nameKey = Object.keys(row || {}).find(
      (k) => normalizeKey(k) === "name",
    );
    const imageKey = Object.keys(row || {}).find(
      (k) => normalizeKey(k) === "image",
    );
    return {
      Name: nameKey ? String(row[nameKey] ?? "").trim() : "",
      Image: imageKey ? String(row[imageKey] ?? "").trim() : "",
    };
  };

  const validateImportedRows = useCallback((rows) => {
    if (!rows.length) {
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
      return [];
    }
    const nameKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "name",
    );
    const imageKeyRef = Object.keys(rows[0] || {}).find(
      (k) => normalizeKey(k) === "image",
    );
    const seenInFile = new Set();
    const validated = rows.map((row) => {
      const nameKey =
        Object.keys(row).find((k) => normalizeKey(k) === "name") ??
        nameKeyRef ??
        null;
      const imageKey =
        Object.keys(row).find((k) => normalizeKey(k) === "image") ??
        imageKeyRef ??
        null;
      const rawName = nameKey ? String(row[nameKey] ?? "") : "";
      const name = rawName.trim();
      const imageUrl = imageKey ? String(row[imageKey] ?? "").trim() : "";
      const imageFromFile = row.__imageUrl || "";
      const image = imageUrl || imageFromFile;
      const fieldErrors = {};
      let statusMessage = "";
      if (!name) {
        fieldErrors[nameKey || "Name"] = "Required";
        statusMessage = "Name required";
      }
      if (image && !isValidImageUrl(image)) {
        fieldErrors[imageKey || "Image"] = "Invalid URL";
        statusMessage = statusMessage || "Invalid URL";
      }
      if (name && !fieldErrors[nameKey || "Name"]) {
        const norm = normalizeConditionName(name);
        if (seenInFile.has(norm)) {
          fieldErrors[nameKey || "Name"] = "Duplicate in file";
          statusMessage = "Duplicate in file";
        } else {
          seenInFile.add(norm);
        }
        const existsInDb = conditionsRef.current.some(
          (c) => normalizeConditionName(c.name) === norm,
        );
        if (existsInDb && !fieldErrors[nameKey || "Name"]) {
          fieldErrors[nameKey || "Name"] = "Already exists in DB";
          statusMessage = "Already in database";
        }
      }
      const hasErrors = Object.keys(fieldErrors).length > 0;
      const firstError = fieldErrors[Object.keys(fieldErrors)[0]] || "";
      return {
        ...row,
        Name: rawName,
        Image: image || imageUrl,
        __name: name,
        __imageUrl: imageFromFile || imageUrl,
        __errors: fieldErrors,
        __status: hasErrors ? "error" : "valid",
        __statusMessage: statusMessage || (hasErrors ? firstError : "OK"),
      };
    });
    const valid = validated.filter((r) => r.__status === "valid").length;
    const errors = validated.filter((r) => r.__status === "error").length;
    const duplicates = validated.filter(
      (r) =>
        r.__status === "error" &&
        (r.__statusMessage === "Duplicate in file" ||
          r.__statusMessage === "Already in database"),
    ).length;
    setImportStats({ total: rows.length, valid, errors, duplicates });
    return validated;
  }, []);

  const handleImportCellChange = useCallback(
    (rowIndex, columnKey, value) => {
      setImportRows((prev) => {
        const next = prev.map((r, i) =>
          i === rowIndex ? { ...r, [columnKey]: value } : r,
        );
        return validateImportedRows(next);
      });
    },
    [validateImportedRows],
  );

  const handleImportImageUpload = useCallback(
    (rowIndex, file, prevImageUrl) => {
      if (!file?.type?.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      const prevUrl = (prevImageUrl ?? "").toString().trim();
      if (prevUrl && /^https?:\/\//i.test(prevUrl)) {
        api
          .post("/conditions/delete-image-by-url", { imageUrl: prevUrl })
          .catch(() => {});
      }
      addUploads([file], undefined, {
        onComplete: (created) => {
          const m = created[0];
          if (m) {
            setImportRows((prev) => {
              const next = prev.map((r, i) =>
                i === rowIndex ? { ...r, __imageUrl: m.url, Image: m.url } : r,
              );
              return validateImportedRows(next);
            });
            toast.success("Image uploaded");
          }
        },
      });
    },
    [addUploads, validateImportedRows],
  );

  const handleImportImageUploadCancel = () => {
    if (imageUploadAbortRef.current) {
      imageUploadAbortRef.current.abort();
    }
    setImageUploadState(null);
    setImageUploadProgress(0);
  };

  const handleImportImageUrlBlur = useCallback(
    (rowIndex, columnKey, value) => {
      const trimmed = (value ?? "").toString().trim();
      if (!trimmed) return;
      const normalized = normalizeImageUrl(trimmed);
      if (normalized === trimmed) return;
      setImportRows((prev) => {
        const next = prev.map((r, i) =>
          i === rowIndex
            ? { ...r, [columnKey]: normalized, __imageUrl: normalized }
            : r,
        );
        return validateImportedRows(next);
      });
    },
    [validateImportedRows],
  );

  const handleRemoveImportRow = useCallback(
    (rowIndex) => {
      setImportRows((prev) => {
        const next = prev.filter((_, i) => i !== rowIndex);
        if (!next.length) {
          setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
          return [];
        }
        return validateImportedRows(next);
      });
    },
    [validateImportedRows],
  );

  const importTableColumns = useMemo(() => {
    const indexCol = {
      id: "__index",
      header: "#",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {Number(row.id) + 1}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    };
    const dynamicCols = (importColumns || []).map((col) => {
      const isNameCol = normalizeKey(col) === "name";
      const isImageCol = normalizeKey(col) === "image";
      return {
        id: col,
        header: col,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const rowIndex = Number(row.id);
          const rowData = row.original;
          if (isNameCol) {
            const nameVal = (rowData[col] ?? "").toString().trim();
            const nameErrorKey =
              rowData.__errors &&
              Object.keys(rowData.__errors).find(
                (k) => normalizeKey(k) === "name",
              );
            const nameError = Boolean(nameErrorKey);
            const nameFulfilled = nameVal.length > 0 && !nameError;
            const nameErrorMsg = nameErrorKey
              ? rowData.__errors[nameErrorKey] === "Already exists in DB"
                ? "Name already exists"
                : rowData.__errors[nameErrorKey] === "Duplicate in file"
                  ? "Duplicate in file"
                  : rowData.__errors[nameErrorKey] === "Required"
                    ? "Field is required"
                    : rowData.__errors[nameErrorKey]
              : "Field is required";
            return (
              <div
                className="flex items-center gap-2 min-w-0"
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              >
                <Input
                  value={rowData[col] ?? ""}
                  onChange={(e) =>
                    handleImportCellChange(rowIndex, col, e.target.value)
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === " " || e.key === "Tab") {
                      e.preventDefault();
                      const input = e.target;
                      const start = input.selectionStart ?? input.value.length;
                      const end = input.selectionEnd ?? input.value.length;
                      const v = (rowData[col] ?? "").toString();
                      const insert = e.key === "Tab" ? "\t" : " ";
                      const newValue =
                        v.slice(0, start) + insert + v.slice(end);
                      handleImportCellChange(rowIndex, col, newValue);
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          const pos = start + insert.length;
                          input.selectionStart = pos;
                          input.selectionEnd = pos;
                        });
                      });
                    }
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  className="h-8 text-xs flex-1 min-w-0"
                  placeholder="Condition name"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${nameFulfilled ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                        aria-hidden
                      >
                        {nameFulfilled ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      {nameFulfilled ? "Field fulfilled" : nameErrorMsg}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          }
          if (isImageCol) {
            const imgVal = (rowData.__imageUrl ?? rowData[col] ?? "")
              .toString()
              .trim();
            const imgErrorKey =
              rowData.__errors &&
              Object.keys(rowData.__errors).find(
                (k) => normalizeKey(k) === "image",
              );
            const imgError = Boolean(imgErrorKey);
            const imgFulfilled = !imgError;
            const imgErrorMsg = imgErrorKey
              ? rowData.__errors[imgErrorKey] === "Invalid URL"
                ? "Invalid URL"
                : rowData.__errors[imgErrorKey] === "Required"
                  ? "Field is required"
                  : rowData.__errors[imgErrorKey]
              : "Field is required";
            return (
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-1 items-center gap-1.5 min-w-0">
                  <Input
                    value={rowData.__imageUrl ?? rowData[col] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setImportRows((prev) => {
                        const next = prev.map((r, i) =>
                          i === rowIndex
                            ? { ...r, [col]: v, __imageUrl: v }
                            : r,
                        );
                        return validateImportedRows(next);
                      });
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    onKeyUp={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleImportImageUrlBlur(rowIndex, col, v);
                    }}
                    className="h-8 text-xs flex-1 min-w-0"
                    placeholder="Image URL"
                  />
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <input
                    id={`import-image-cond-${rowIndex}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        handleImportImageUpload(
                          rowIndex,
                          f,
                          rowData.__imageUrl ?? rowData[col] ?? "",
                        );
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={() =>
                      document
                        .getElementById(`import-image-cond-${rowIndex}`)
                        ?.click()
                    }
                  >
                    <CloudUpload className="h-4 w-4" />
                    Choose from device
                  </Button>
                </div>
              </div>
            );
          }
          return <span className="text-xs">{String(rowData[col] ?? "")}</span>;
        },
      };
    });
    const statusCol = {
      id: "__status",
      header: "Status",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={
                    r.__status === "valid"
                      ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700"
                      : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700"
                  }
                >
                  {r.__status === "valid" ? "Valid" : "Error"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                {r.__status === "valid"
                  ? "Ready to import"
                  : r.__statusMessage || "Validation error"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    };
    const actionsCol = {
      id: "__actions",
      header: "Actions",
      className: "w-[80px]",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleRemoveImportRow(Number(row.id))}
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    };
    return [indexCol, ...dynamicCols, statusCol, actionsCol];
  }, [
    importColumns,
    handleImportCellChange,
    handleImportImageUpload,
    handleImportImageUrlBlur,
    handleRemoveImportRow,
  ]);

  const handleAddImportRow = () => {
    const newRow = Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""]));
    setImportRows((prev) => validateImportedRows([...prev, newRow]));
  };

  const handleClearImportData = () => {
    setImportRows([]);
    setImportColumns([]);
    setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    toast.info("Import data cleared");
  };

  const handleImportFileSelected = async (fileOrFiles) => {
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {
        defval: "",
      });
      if (!rows.length) {
        toast.error("File is empty ❌");
        setImportRows([]);
        setImportColumns([]);
        setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
        return;
      }
      const colCheck = validateFileColumns(rows);
      if (!colCheck.ok) {
        toast.error(colCheck.message + " ❌");
        return;
      }
      const normalizedRows = rows.map((r) => normalizeRowToTemplate(r));
      setImportColumns(TEMPLATE_COLUMNS);
      const validatedRows = validateImportedRows(normalizedRows);
      setImportRows(validatedRows);
      toast.success("File loaded. Review and import ✅");
    } catch (err) {
      console.error("Import parse error:", err);
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Unable to read file: ${messageFromServer} ❌`
          : "Unable to read file ❌",
      );
    }
  };

  const handleImportValidSubmit = async () => {
    const validRows = importRows.filter((row) => row.__status === "valid");
    if (!validRows.length) {
      toast.error("No valid rows to import ❌");
      return;
    }
    setImportLoading(true);
    try {
      const payload = validRows.map(
        ({ __errors, __status, __name, __imageUrl, ...rest }) => ({
          name: __name,
          image: __imageUrl || rest.Image || "",
        }),
      );
      await api.post("/conditions/createbulk", payload);
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      toast.success(`Imported ${payload.length} conditions ✅`);
      setImportDrawerOpen(false);
      setImportRows([]);
      setImportColumns([]);
      setImportStats({ total: 0, valid: 0, errors: 0, duplicates: 0 });
    } catch (err) {
      const messageFromServer =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message;
      toast.error(
        messageFromServer
          ? `Bulk import failed: ${messageFromServer} ❌`
          : "Bulk import failed ❌",
      );
      console.error("Bulk import error:", err?.response?.data || err?.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewTemplate = () => {
    setImportColumns(TEMPLATE_COLUMNS);
    const templateRow = [
      Object.fromEntries(TEMPLATE_COLUMNS.map((h) => [h, ""])),
    ];
    setImportRows(validateImportedRows(templateRow));
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Conditions-import-template.xlsx");
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredConditions.map((c) => ({
        Name: c.name,
        Image: c.imageUrl || (c.image ? resolveImageUrl(c.image) : ""),
        "Product Count": c.productCount ?? 0,
        "Created At": c.createdAt
          ? new Date(c.createdAt).toLocaleDateString()
          : "",
        "Updated At": c.updatedAt
          ? new Date(c.updatedAt).toLocaleDateString()
          : "",
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Conditions");
    XLSX.writeFile(workbook, "Conditions.xlsx");
  };

  const conditionColumns = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        className: "text-center",
      },
      {
        id: "image",
        header: "Image",
        accessorKey: "image",
        cell: ({ row }) => {
          const cond = row.original;
          if (!cond.imageUrl && !cond.imageRef && !cond.image) {
            return <span className="text-gray-400 italic">No Image</span>;
          }
          const src =
            cond.imageUrl || cond.imageRef?.url || resolveImageUrl(cond.image);
          return (
            <ConditionImageCell
              src={src}
              alt={cond.name}
              onClick={() => openImageModal(src)}
            />
          );
        },
      },
      {
        id: "name",
        header: "Condition Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },
      {
        id: "productCount",
        header: "Product Count",
        accessorKey: "productCount",
        cell: ({ row }) => {
          const cond = row.original;
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(cond._id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleClick(cond._id)
                    }
                    className="w-full h-full min-h-[40px] flex items-center justify-center font-medium text-blue-600 hover:underline cursor-pointer"
                  >
                    {cond.productCount ?? 0}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  View products in this condition
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        id: "createdAt",
        header: "Created At",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.createdAt
              ? new Date(row.original.createdAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "updatedAt",
        header: "Updated At",
        accessorKey: "updatedAt",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleDateString()
              : ""}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const cond = row.original;
          return (
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(cond)}
                      aria-label="Edit condition"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit condition</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(cond._id)}
                      aria-label="Delete condition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Delete condition</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [openImageModal, handleClick, handleEdit, confirmDelete],
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <div className="mx-auto flex flex-col gap-4 sm:gap-6 bg-white p-6 sm:p-8 lg:p-10">
        <div className="min-w-0">
          <Drawer
            direction="right"
            open={conditionDrawerOpen}
            onOpenChange={setConditionDrawerOpen}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 truncate min-w-0">
                Conditions List ({filteredConditions.length})
              </h2>
              <div className="flex flex-wrap gap-2 sm:gap-4 items-center w-full lg:w-auto lg:flex-1 lg:justify-end">
                {selectedConditionIds.length > 0 && (
                  <div className="w-full sm:w-auto min-w-0">
                    <UiSelect
                      value=""
                      onValueChange={(value) => {
                        if (value === "bulk-delete") {
                          if (selectedConditionIds.length === 1) {
                            confirmDelete(selectedConditionIds[0]);
                          } else {
                            setBulkManagerOpen(true);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[170px] whitespace-nowrap">
                        <SelectValue placeholder="Bulk actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Select action</SelectLabel>
                          <SelectItem value="bulk-delete">
                            Bulk delete
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </UiSelect>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center shrink-0">
                  <Drawer
                    open={importDrawerOpen}
                    onOpenChange={setImportDrawerOpen}
                  >
                    <DrawerTrigger asChild>
                      <Label
                        variant="light"
                        className="px-3 sm:px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-300 cursor-pointer whitespace-nowrap text-sm sm:text-base"
                      >
                        Import Excel
                      </Label>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[90vh] w-full max-w-[100vw]">
                      <DrawerHeader className="border-b px-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <DrawerTitle>Bulk Condition Import</DrawerTitle>
                            <DrawerDescription>
                              Upload CSV or Excel file to create multiple
                              conditions.
                            </DrawerDescription>
                          </div>
                          <DrawerClose asChild>
                            <Button variant="outline" size="icon">
                              ✕
                            </Button>
                          </DrawerClose>
                        </div>
                      </DrawerHeader>
                      <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleViewTemplate}
                            >
                              View Template
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleDownloadTemplate}
                            >
                              Download Template
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Supported formats:{" "}
                              <span className="font-medium">.csv, .xlsx</span>
                            </p>
                          </div>
                          {importRows.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={handleClearImportData}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Upload file</p>
                          <ImageUploadDropzone
                            accept=".csv,.xlsx"
                            type="excel"
                            label="Drag & Drop Excel or CSV File"
                            description="Upload bulk condition file"
                            maxSize={10 * 1024 * 1024}
                            onFileSelect={handleImportFileSelected}
                          />
                        </div>
                        {imageUploadState && (
                          <UploadAlert
                            isActive={true}
                            fileName={imageUploadState.fileName}
                            progress={imageUploadProgress}
                            onCancel={handleImportImageUploadCancel}
                            onClose={handleImportImageUploadCancel}
                          />
                        )}
                        {importRows.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  Preview ({importStats.total} rows)
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddImportRow}
                                >
                                  Add row
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Valid: {importStats.valid} | Errors:{" "}
                                {importStats.errors}
                                {importStats.duplicates > 0 &&
                                  ` | Duplicates: ${importStats.duplicates}`}
                              </p>
                            </div>
                            <div className="border w-full rounded-md max-h-80 overflow-auto">
                              <DataTable
                                columns={importTableColumns}
                                data={importRows}
                                enableSelection={false}
                                addPagination={false}
                                pageSize={5}
                                getRowId={(row, index) => String(index)}
                                containerClassName="flex flex-col overflow-hidden rounded-none border-0 bg-background min-h-[200px] max-h-[320px]"
                                enableHeaderContextMenu={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <DrawerFooter className="border-t px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="text-muted-foreground">
                              ✔ Valid:{" "}
                              <span className="font-semibold text-emerald-700">
                                {importStats.valid}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              ⚠ Errors:{" "}
                              <span className="font-semibold text-red-700">
                                {importStats.errors}
                              </span>
                            </span>
                            {importStats.duplicates > 0 && (
                              <span className="text-muted-foreground">
                                ✖ Duplicates:{" "}
                                <span className="font-semibold text-orange-700">
                                  {importStats.duplicates}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handleImportValidSubmit}
                              disabled={!importStats.valid || importLoading}
                            >
                              {importLoading
                                ? "Importing..."
                                : "Import Valid Only"}
                            </Button>
                            <DrawerClose asChild>
                              <Button type="button" variant="ghost">
                                Cancel
                              </Button>
                            </DrawerClose>
                          </div>
                        </div>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </div>
                <Label
                  variant="success"
                  onClick={handleExport}
                  className="bg-green-600 text-white shadow hover:bg-green-600/90 px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Export Excel
                </Label>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    setEditingCondition(null);
                    setConditionDrawerOpen(true);
                  }}
                  className="px-3 sm:px-4 py-1.5 rounded-md cursor-pointer whitespace-nowrap text-sm sm:text-base"
                >
                  Add New Condition
                </Button>
              </div>
            </div>

            <ConditionFormDrawer
              open={conditionDrawerOpen}
              editingCondition={editingCondition}
              onClose={() => {
                setConditionDrawerOpen(false);
                setEditingCondition(null);
              }}
              onSubmit={handleSubmitForm}
              loading={loading}
            />
          </Drawer>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 mb-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="w-full min-w-0 flex-5">
                <Input
                  type="text"
                  placeholder="Search conditions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-auto min-w-0 flex-1">
                <UiSelect
                  value={
                    customItemsPerPage !== ""
                      ? "custom"
                      : effectiveItemsPerPage <= 100 &&
                          [10, 20, 50, 100].includes(effectiveItemsPerPage)
                        ? String(effectiveItemsPerPage)
                        : "custom"
                  }
                  onValueChange={(value) => {
                    if (value === "custom") return;
                    setItemsPerPage(Number(value));
                    setCustomItemsPerPage("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--radix-select-trigger-width)">
                    <SelectGroup>
                      <SelectLabel>Rows per page</SelectLabel>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                      <SelectItem value="custom" disabled>
                        Custom
                        {customItemsPerPage
                          ? ` (${effectiveItemsPerPage})`
                          : ""}
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <div
                      className="px-2 py-2"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                        Custom
                      </p>
                      <CustomRowsPerPageInput
                        type="number"
                        min={1}
                        max={500}
                        placeholder="e.g. 25"
                        className="h-8 w-full text-sm"
                        value={customItemsPerPage}
                        onChange={setCustomItemsPerPage}
                        autoFocus
                      />
                    </div>
                  </SelectContent>
                </UiSelect>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <DataTable
              columns={conditionColumns}
              data={filteredConditions}
              isLoading={conditionsLoading}
              pageSize={effectiveItemsPerPage}
              getRowProps={(row) => ({
                "data-highlight-target": row.original?._id,
                className:
                  row.original?._id === highlightedConditionId
                    ? "search-highlight-row"
                    : "",
              })}
              initialPageIndex={initialPageIndex}
              onPageChange={handlePageChange}
              rowSelection={tableRowSelection}
              onRowSelectionChange={setTableRowSelection}
              onSelectionChange={(rows) =>
                setSelectedConditionIds(rows.map((r) => r._id))
              }
            />
          </div>
        </div>
      </div>

      <DeleteModel
        title="Delete condition?"
        description="This action cannot be undone. This will permanently delete the selected condition."
        onDelete={handleDeleteConfirmed}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        loading={loading}
      />

      <ResolveDependenciesDialog
        open={deleteWithDepsOpen}
        onOpenChange={setDeleteWithDepsOpen}
        title="Resolve Condition Dependencies"
        dependencyData={deleteWithDepsData}
        childLabel=""
        linkedLabel="linked products"
        transferDescription="Move all product links to another condition before deleting this one."
        cascadeDescription="This will permanently unlink this condition from all products and delete the condition. This action cannot be undone."
        onChooseTransfer={() => setTransferDialogOpen(true)}
        onChooseCascade={() => {
          setDeleteId(deleteWithDepsData?.id ?? null);
          setCascadeConfirmOpen(true);
        }}
      />

      <TransferDependenciesDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        title="Transfer Condition Dependencies"
        description="Select the target condition to move all product links to, then confirm."
        targetOptions={(conditions || [])
          .filter((c) => c._id !== deleteWithDepsData?.id)
          .map((c) => ({ value: c._id, label: c.name }))}
        value={transferTargetId}
        onValueChange={setTransferTargetId}
        onSubmit={handleTransferProceed}
        submitLabel="Transfer & Delete"
      />

      <DeleteModel
        title="Cascade delete condition?"
        description="This will permanently unlink the condition from all products and delete the condition. This action cannot be undone."
        requireAcceptCheckbox
        acceptLabel="I understand that this condition will be unlinked from all products and permanently deleted."
        confirmLabel="Delete all"
        open={cascadeConfirmOpen}
        onOpenChange={(open) => {
          setCascadeConfirmOpen(open);
          if (!open) setDeleteId(null);
        }}
        onDelete={handleCascadeDeleteConfirmed}
        loading={cascadeDeleteLoading}
      />

      <BulkDependencyManagerModal
        open={bulkManagerOpen}
        onOpenChange={setBulkManagerOpen}
        manager={bulkManager}
        itemsSource={conditions || []}
        mode="condition"
        onComplete={() => {
          setBulkManagerOpen(false);
        }}
      />
    </div>
  );
};

export default Conditions;
