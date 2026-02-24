import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "sonner";

// 1. Create the Context
const ExpenseCategoryContext = createContext();

// 2. Create a Provider Component
export const ExpenseCategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // You can also manage other shared states here like sorting, search, etc.
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Fetch Categories function
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://localhost:5000/api/expense-categories/getall"
      );
      setCategories(res.data.categories);
    } catch (err) {
      toast.error("Failed to fetch expense categories ❌");
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const createCategory = async (categoryData) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/expense-categories/create",
        categoryData
      );
      if (response.data.success) {
        toast.success(response.data.message || "Expense Category created ✅");
        fetchCategories(); // Refresh list after creation
      } else {
        toast.error(response.data.message || "Failed to create ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/expense-categories/update/${id}`,
        categoryData
      );
      if (response.data.success) {
        toast.success(response.data.message || "Expense Category updated ✅");
        fetchCategories(); // Refresh list after update
      } else {
        toast.error(response.data.message || "Failed to update ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  const deleteCategory = async (id) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/expense-categories/delete/${id}`
      );
      if (response.data.success) {
        toast.success("Expense Category deleted successfully ✅");
        fetchCategories();
      } else {
        toast.error("Failed to delete expense category ❌");
      }
    } catch (err) {
      toast.error("Something went wrong ❌");
    }
  };

  // Run the fetch function on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // 3. Provide the state and functions to children
  const value = {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
  };

  return (
    <ExpenseCategoryContext.Provider value={value}>
      {children}
    </ExpenseCategoryContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useExpenseCategories = () => useContext(ExpenseCategoryContext);
