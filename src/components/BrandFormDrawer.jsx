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

export const BrandFormDrawer = React.memo(({
  open,
  editingBrand,
  onClose,
  onSubmit,
  loading,
}) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [imageLogoId, setImageLogoId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editingBrand) {
        setName(editingBrand.name || "");
        const imageUrl = editingBrand.imageUrl || (editingBrand.logo?.url);
        setPreview(imageUrl || null);
        setImageLogoId(editingBrand.logo?._id != null ? String(editingBrand.logo._id) : (typeof editingBrand.logo === "string" && editingBrand.logo ? String(editingBrand.logo) : null));
        setImage(null);
      } else {
        handleClearForm();
      }
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    }
  }, [open, editingBrand]);

  const handleClearForm = () => {
    setName("");
    setImage(null);
    setImageLogoId(null);
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
    setImageLogoId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Brand name is required ❌");
      return;
    }
    onSubmit({
      name: trimmedName,
      image,
      imageLogoId,
    });
  };

  return (
    <DrawerContent className="ml-auto h-full w-full max-w-[100vw] sm:max-w-2xl lg:max-w-3xl">
      <DrawerHeader className="px-4 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <DrawerTitle>
              {editingBrand ? "Edit Brand" : "Add New Brand"}
            </DrawerTitle>
            <DrawerDescription>
              {editingBrand
                ? "Update the brand details."
                : "Fill in the details below to add a new brand."}
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
            <FieldLabel htmlFor="brand-name">Name</FieldLabel>
            <Input
              id="brand-name"
              type="text"
              placeholder="Brand Name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </Field>
          <Field>
            <FieldLabel>Logo</FieldLabel>
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
                setImageLogoId(null);
              }}
              className="mt-1"
              accept="image/*"
            />
          </Field>
          <MediaGalleryModal
            open={mediaGalleryOpen}
            onOpenChange={setMediaGalleryOpen}
            multiple={false}
            title="Select brand logo"
            onConfirm={(media) => {
              if (media) {
                setImageLogoId(media._id != null ? String(media._id) : null);
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
                : editingBrand
                  ? "Update Brand"
                  : "Add Brand"}
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
