import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { mediaApi } from "@/api/media";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ImageIcon } from "lucide-react";

const MEDIA_QUERY_KEY = ["media"];

const UploadQueueContext = createContext(null);

export function UploadQueueProvider({ children }) {
  const queryClient = useQueryClient();
  const [uploadingItems, setUploadingItems] = useState([]);
  const [recentSuccessCount, setRecentSuccessCount] = useState(0);
  const successTimeoutRef = React.useRef(null);

  const clearRecentSuccess = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setRecentSuccessCount(0);
  }, []);

  const addUploads = useCallback(async (files, folder = null) => {
    const fileArray = Array.from(files).filter((f) => f?.type?.startsWith("image/"));
    if (!fileArray.length) return;

    const initial = fileArray.map((file, i) => ({
      key: `upload-${Date.now()}-${i}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      media: null,
    }));
    setUploadingItems(initial);

    const uploadOne = async (file) => {
      const formData = new FormData();
      formData.append("images", file);
      if (folder) formData.append("folder", folder);
      const created = await mediaApi.upload(formData);
      return Array.isArray(created) && created[0] ? created[0] : null;
    };

    const next = [...initial];
    let successCount = 0;
    for (let i = 0; i < fileArray.length; i++) {
      try {
        const media = await uploadOne(fileArray[i]);
        next[i] = { ...next[i], status: "done", media };
        successCount += 1;
        setUploadingItems([...next]);
      } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || "";
        const isPermissionDenied = status === 403 || /not allowed|forbidden|permission/i.test(msg);
        const errorMessage = isPermissionDenied
          ? "You don't have permission to upload media."
          : (msg || `Upload failed: ${fileArray[i].name}`);
        toast.error(errorMessage);
        next[i] = { ...next[i], status: "done", media: null };
        setUploadingItems([...next]);
      }
    }

    queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY });
    next.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setUploadingItems([]);

    // Only show success when at least one upload succeeded
    if (successCount > 0) {
      setRecentSuccessCount(successCount);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setRecentSuccessCount(0);
        successTimeoutRef.current = null;
      }, 8000);
    }
  }, [queryClient]);

  return (
    <UploadQueueContext.Provider value={{ uploadingItems, addUploads, recentSuccessCount, clearRecentSuccess }}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error("useUploadQueue must be used within UploadQueueProvider");
  }
  return ctx;
}

/** Renders the fixed bottom-right "uploading in background" popup when queue has items, and success message + Go to Gallery when done. */
export function UploadQueueToast() {
  const navigate = useNavigate();
  const { uploadingItems, recentSuccessCount, clearRecentSuccess } = useUploadQueue();

  const uploadingCount = uploadingItems.filter((u) => u.status === "uploading").length;
  const showUploading = uploadingItems.length > 0;
  const showSuccess = recentSuccessCount > 0 && !showUploading;

  const goToGallery = useCallback(() => {
    clearRecentSuccess();
    navigate("/gallery");
  }, [clearRecentSuccess, navigate]);

  if (!showUploading && !showSuccess) return null;

  if (showSuccess) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 shadow-lg"
        aria-live="polite"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-900">
            {recentSuccessCount} image(s) uploaded successfully
          </p>
          <button
            type="button"
            onClick={goToGallery}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ImageIcon className="h-4 w-4" />
            Go to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg"
      aria-live="polite"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} of ${uploadingItems.length} image(s)…`
            : `Processed ${uploadingItems.length} image(s)`}
        </p>
        <p className="text-xs text-muted-foreground">
          You can keep using the page. Images are uploading in the background.
        </p>
      </div>
    </div>
  );
}
