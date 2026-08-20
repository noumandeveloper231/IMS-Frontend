import * as React from "react";
import { GlobalSearch } from "@/components/UI/GlobalSearch";

const GlobalSearchContext = React.createContext(null);

export function GlobalSearchProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleSearch = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openSearch = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearch = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggleSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSearch]);

  return (
    <GlobalSearchContext.Provider value={{ isOpen, openSearch, closeSearch, toggleSearch }}>
      {children}
      <GlobalSearch open={isOpen} onOpenChange={setIsOpen} />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = React.useContext(GlobalSearchContext);
  if (!context) {
    throw new Error("useGlobalSearch must be used within a GlobalSearchProvider");
  }
  return context;
}
