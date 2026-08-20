import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "sonner";

// 1. Create the Context
const BrandContext = createContext();

// 2. Create a Provider Component
export const BrandProvider = ({ children }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  // You can also manage other shared states here like sorting, search, etc.
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch Brands function
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:5000/api/brands/getallcount"
      );
      setBrands(res.data.brands);
    } catch (err) {
      toast.error("Failed to fetch brands ❌");
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const createBrand = async (formData) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/brands/create",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.data.success) {
        toast.success(response.data.message || "Brand created ✅");
        fetchBrands(); // Refresh list after creation
      } else {
        toast.error(response.data.message || "Failed to create ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  const updateBrand = async (id, formData) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/brands/update/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.data.success) {
        toast.success(response.data.message || "Brand updated ✅");
        fetchBrands(); // Refresh list after update
      } else {
        toast.error(response.data.message || "Failed to update ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  const deleteBrand = async (id) => {
    // Note: You can add the Swal logic here as well for a cleaner component.
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/brands/delete/${id}`
      );
      if (response.data.success) {
        toast.success("Brand deleted successfully ✅");
        fetchBrands();
      } else {
        toast.error("Failed to delete brand ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  // Run the fetch function on component mount
  useEffect(() => {
    fetchBrands();
  }, []);

  // 3. Provide the state and functions to children
  const value = {
    brands,
    loading,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
  };

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useBrands = () => useContext(BrandContext);
