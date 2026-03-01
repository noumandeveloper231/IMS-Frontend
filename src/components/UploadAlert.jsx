'use client'

import { UploadIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/UI/button'

/**
 * Reusable upload-in-progress alert with real-time progress.
 * @param {boolean} isActive - When false, renders null
 * @param {string} fileName - Name of the file being uploaded
 * @param {number} progress - 0–100 upload progress
 * @param {() => void} onCancel - Called when user clicks Cancel
 * @param {() => void} onClose - Called when user clicks the X to dismiss (e.g. after done)
 */
export function UploadAlert({
  isActive,
  fileName = '',
  progress = 0,
  onCancel,
  onClose,
}) {
  if (!isActive) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/30">
      <UploadIcon className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        <div>
          <p className="font-medium text-sky-900 dark:text-sky-100">
            Uploading &apos;{fileName || 'image'}&apos;
          </p>
          <p className="text-sm text-sky-700 dark:text-sky-300">
            Please wait while we upload your image.
          </p>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-800"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Upload progress"
        >
          <div
            className="h-full rounded-full bg-sky-600 transition-[width] duration-200 dark:bg-sky-400"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer rounded-md px-2"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      <button
        type="button"
        className="size-8 shrink-0 rounded-md p-1.5 text-sky-600 hover:bg-sky-200 dark:text-sky-400 dark:hover:bg-sky-800"
        onClick={onClose}
        aria-label="Close"
      >
        <XIcon className="size-5" />
      </button>
    </div>
  )
}

export default UploadAlert
