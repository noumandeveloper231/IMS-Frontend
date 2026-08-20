import { createContext, useState, useCallback, useContext } from "react";

const ImageModalContext = createContext(null);

export const ImageModalProvider = ({ children }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [open, setOpen] = useState(false);

  const openImageModal = useCallback((src) => {
    if (src) {
      setImageSrc(src);
      setOpen(true);
    }
  }, []);

  const closeImageModal = useCallback(() => {
    setOpen(false);
    setImageSrc(null);
  }, []);

  return (
    <ImageModalContext.Provider
      value={{ openImageModal, closeImageModal, imageSrc, open, setOpen }}
    >
      {children}
    </ImageModalContext.Provider>
  );
};

export const useImageModal = () => {
  const ctx = useContext(ImageModalContext);
  if (!ctx) {
    throw new Error("useImageModal must be used within ImageModalProvider");
  }
  return ctx;
};
