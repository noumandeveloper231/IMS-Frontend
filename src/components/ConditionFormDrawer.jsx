import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { Field, FieldLabel } from "@/components/UI/field";
import { Textarea } from "@/components/UI/textarea";
import { Combobox } from "@/components/UI/combobox";
import {
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/UI/drawer";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { MediaGalleryModal } from "@/components/media";
import { toast } from "sonner";
import api from "../utils/api";

const DESCRIPTION_MIN = 100;
const DESCRIPTION_MAX = 350;

const DescriptionField = forwardRef(function DescriptionField(
  { initialValue = "", min: minChars, max: maxChars },
  ref
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
  }), [value]);

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
          className={`mt-1 text-sm ${value.length >= minChars && value.length <= maxChars
              ? "text-green-600"
              : "text-red-600"
            }`}
        >
          {value.length} / {maxChars} characters
          {value.length > 0 && value.length < minChars &&
            ` — min ${minChars} required`}
        </p>
      )}
    </>
  );
});

export const ConditionFormDrawer = React.memo(({
  open,
  editingCondition,
  onClose,
  onSubmit,
  loading,
}) => {
  const [name, setName] = useState("");
  const [tags, setTags] = useState([]);
  const [exampleProductImages, setExampleProductImages] = useState([]);
  const [exampleProductImagesPreview, setExampleProductImagesPreview] = useState(null);
  const [image, setImage] = useState(null);
  const [imageMediaId, setImageMediaId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const nameInputRef = useRef(null);
  const descriptionFieldRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editingCondition) {
        setName(editingCondition.name || "");
        setTags(Array.isArray(editingCondition.tags) ? [...editingCondition.tags] : []);
        setExampleProductImages(Array.isArray(editingCondition.exampleProductImages) ? [...editingCondition.exampleProductImages] : []);
        setExampleProductImagesPreview(null);
        setShowOptionalDetails(Boolean(
          (editingCondition.description && editingCondition.description.trim()) ||
          (Array.isArray(editingCondition.tags) && editingCondition.tags.length > 0) ||
          (Array.isArray(editingCondition.exampleProductImages) && editingCondition.exampleProductImages.length > 0)
        ));
        const imageUrl = editingCondition.imageUrl || (editingCondition.imageRef?.url);
        setPreview(imageUrl || null);
        setImageMediaId(editingCondition.imageRef?._id != null ? String(editingCondition.imageRef._id) : (typeof editingCondition.imageRef === "string" && editingCondition.imageRef ? String(editingCondition.imageRef) : null));
        setImage(null);
      } else {
        handleClearForm();
      }
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [open, editingCondition]);

  const handleClearForm = () => {
    setName("");
    setImage(null);
    setImageMediaId(null);
    setPreview(null);
    setTags([]);
    setExampleProductImages([]);
    setExampleProductImagesPreview(null);
    setShowOptionalDetails(false);
  };

  const handleDropFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Please upload a valid image file ❌");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setImageMediaId(null);
  };

  const handleExampleProductImagesSelect = useCallback(async (files) => {
    const fileList = Array.isArray(files) ? files : files ? [files] : [];
    const toAdd = fileList.slice(0, Math.max(0, 2 - exampleProductImages.length));
    if (!toAdd.length) {
      if (fileList.length > 0) toast.error("Maximum 2 example product images allowed");
      return;
    }
    for (const file of toAdd) {
      if (!file?.type?.startsWith("image/")) {
        toast.error("Please select valid image files");
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("image", file);
        // Using the same endpoint as before
        const res = await api.post("/conditions/upload-image", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const url = res.data?.url;
        if (url) {
          setExampleProductImages((prev) => (prev.length >= 2 ? prev : [...prev, url].slice(0, 2)));
          setExampleProductImagesPreview(url);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Image upload failed");
      }
    }
  }, [exampleProductImages.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Condition name is required ❌");
      return;
    }

    const desc = descriptionFieldRef.current?.getValue?.() ?? "";
    const trimmedDesc = desc.trim();
    if (trimmedDesc.length > 0) {
      if (trimmedDesc.length < DESCRIPTION_MIN) {
        toast.error(`Description must be at least ${DESCRIPTION_MIN} characters when provided ❌`);
        return;
      }
      if (trimmedDesc.length > DESCRIPTION_MAX) {
        toast.error(`Description must be at most ${DESCRIPTION_MAX} characters ❌`);
        return;
      }
    }

    onSubmit({
      name: trimmedName,
      description: trimmedDesc,
      tags,
      exampleProductImages,
      image,
      imageMediaId,
    });
  };

  return (
    <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
      <DrawerHeader className="px-4 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <DrawerTitle>
              {editingCondition ? "Edit Condition" : "Add New Condition"}
            </DrawerTitle>
            <DrawerDescription>
              {editingCondition
                ? "Update the condition details."
                : "Fill in the details below to add a new condition."}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
              ✕
            </Button>
          </DrawerClose>
        </div>
      </DrawerHeader>
      <div className="no-scrollbar overflow-y-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field>
            <FieldLabel htmlFor="condition-name">Name</FieldLabel>
            <Input
              id="condition-name"
              type="text"
              placeholder="Condition Name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </Field>
          <Field>
            <FieldLabel>Image</FieldLabel>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaGalleryOpen(true)}
              >
                Select from gallery
              </Button>
            </div>
            <ImageUploadDropzone
              onFileSelect={handleDropFile}
              previewUrl={preview}
              showPreview
              onRemove={() => {
                setPreview(null);
                setImage(null);
                setImageMediaId(null);
              }}
              className="mt-1"
              accept="image/*"
            />
          </Field>

          <div className="space-y-4 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              className="px-0 h-auto font-medium text-blue-600 hover:text-blue-700 hover:bg-transparent"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
            >
              {showOptionalDetails ? "Hide" : "Show"} Optional Details
            </Button>

            {showOptionalDetails && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <Field>
                  <FieldLabel htmlFor="condition-description">Description</FieldLabel>
                  <DescriptionField
                    ref={descriptionFieldRef}
                    initialValue={editingCondition?.description || ""}
                    min={DESCRIPTION_MIN}
                    max={DESCRIPTION_MAX}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="condition-tags">Tags (Keywords)</FieldLabel>
                  <Combobox
                    id="condition-tags"
                    placeholder="Type and press enter to add tags"
                    options={[]}
                    value={tags}
                    onChange={setTags}
                    creatable
                    multiple
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Press enter after each tag to add it.
                  </p>
                </Field>

                <Field>
                  <FieldLabel>Example Product Images (max 2)</FieldLabel>
                  <ImageUploadDropzone
                    onFileSelect={handleExampleProductImagesSelect}
                    className="mt-1"
                    accept="image/*"
                    multiple
                    limit={2}
                    disabled={exampleProductImages.length >= 2}
                    label={exampleProductImages.length >= 2 ? "Maximum 2 images" : "Add example image"}
                    description={exampleProductImages.length >= 2 ? "" : "or click to browse"}
                  />
                  {exampleProductImages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exampleProductImages.map((url, idx) => (
                        <div key={idx} className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => {
                              setExampleProductImages((prev) => prev.filter((_, i) => i !== idx));
                              setExampleProductImagesPreview(null);
                            }}
                            className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white text-[10px] hover:bg-black"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                          <img
                            src={url}
                            alt={`Example ${idx + 1}`}
                            className="w-24 h-24 object-contain rounded-lg border border-[#cdcdcd] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>

          <MediaGalleryModal
            open={mediaGalleryOpen}
            onOpenChange={setMediaGalleryOpen}
            multiple={false}
            title="Select condition image"
            onConfirm={(media) => {
              if (media) {
                setImageMediaId(media._id != null ? String(media._id) : null);
                setPreview(media.url);
                setImage(null);
              }
              setMediaGalleryOpen(false);
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-stretch sm:items-center flex-wrap">
            <Button type="submit" variant="default" disabled={loading} className="w-full sm:w-auto">
              {loading
                ? "Please wait..."
                : editingCondition
                  ? "Update Condition"
                  : "Add Condition"}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleClearForm}
              className="bg-red-600 text-white shadow hover:bg-red-600/90 px-4 py-3.5 rounded-md w-full sm:w-auto"
            >
              Clear
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto sm:ml-auto">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </form>
      </div>
    </DrawerContent>
  );
});
