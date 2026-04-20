import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { Field, FieldLabel } from "@/components/UI/field";
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

export const CategoryFormDrawer = React.memo(({
  open,
  editingCategory,
  onClose,
  onSubmit,
  loading,
}) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [imageMediaId, setImageMediaId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editingCategory) {
        setName(editingCategory.name || "");
        const imageUrl = editingCategory.imageUrl || (editingCategory.image?.url);
        setPreview(imageUrl || null);
        setImageMediaId(editingCategory.image?._id != null ? String(editingCategory.image._id) : (typeof editingCategory.image === "string" && editingCategory.image ? String(editingCategory.image) : null));
        setImage(null);
      } else {
        handleClearForm();
      }
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [open, editingCategory]);

  const handleClearForm = () => {
    setName("");
    setImage(null);
    setImageMediaId(null);
    setPreview(null);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Category name is required ❌");
      return;
    }
    onSubmit({
      name: trimmedName,
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
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DrawerTitle>
            <DrawerDescription>
              {editingCategory
                ? "Update the category details."
                : "Fill in the details below to add a new category."}
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
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input
              id="category-name"
              type="text"
              placeholder="Category Name"
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
          <MediaGalleryModal
            open={mediaGalleryOpen}
            onOpenChange={setMediaGalleryOpen}
            multiple={false}
            title="Select category image"
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
                : editingCategory
                  ? "Update Category"
                  : "Add Category"}
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
