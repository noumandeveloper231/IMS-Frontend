import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import { ArrowUpAZ, ArrowDownAZ, ArrowUp01, ArrowDown01 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [expenseDate, setExpenseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("paid");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [sortField, setSortField] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // ✅ Fetch Expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/expenses/getall");
      setExpenses(res.data?.expenses ?? res.data ?? []);
    } catch (err) {
      toast.error("Failed to fetch expenses ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Expense Categories
  const fetchExpenseCategories = async () => {
    try {
      const res = await api.get("/expense-categories/getall");
      setExpenseCategories(res.data?.categories ?? res.data ?? []);
    } catch (err) {
      toast.error("Failed to fetch expense categories ❌");
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchExpenseCategories();
  }, []);

  // ✅ Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !category) return toast.error("Title, Amount & Category required ❌");

    const expenseData = {
      title: title.trim(),
      category, // must be ExpenseCategory _id
      amount: Number(amount),
      paymentMethod,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes?.trim() || undefined,
      status,
    };

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/expenses/update/${editingId}`, expenseData);
        toast.success("Expense updated ✅");
      } else {
        await api.post("/expenses/create", expenseData);
        toast.success("Expense added ✅");
      }
      handleClear();
      fetchExpenses();
    } catch (err) {
      toast.error("Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Expense
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the expense permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/expenses/delete/${id}`);
      toast.success("Expense deleted ✅");
      fetchExpenses();
    } catch (err) {
      toast.error("Delete failed ❌");
    }
  };

  // ✅ Edit Expense
  const handleEdit = (exp) => {
    setTitle(exp.title);
    setCategory(exp.category?._id ?? exp.category);
    setAmount(exp.amount);
    setPaymentMethod(exp.paymentMethod);
    setExpenseDate(exp.expenseDate?.split("T")[0] || "");
    setNotes(exp.notes || "");
    setStatus(exp.status);
    setEditingId(exp._id);
  };

  // ✅ Clear Form
  const handleClear = () => {
    setTitle("");
    setCategory("");
    setAmount("");
    setPaymentMethod("cash");
    setExpenseDate("");
    setNotes("");
    setStatus("paid");
    setEditingId(null);
  };

  // ✅ Search & Filter
  const filteredExpenses = (expenses || []).filter((e) =>
    e.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Sort
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortField === "title") {
      return sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    } else if (sortField === "amount") {
      return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
    } else {
      return 0;
    }
  });

  // ✅ Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const currentExpenses = sortedExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ Export Excel
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredExpenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "expenses.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 sm:p-12  ">
      <div className="max-w-7xl mx-auto">
        {/* Form */}
        <div className="bg-white p-8 rounded-3xl shadow-xl mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {editingId ? "Edit Expense" : "Add Expense"}
          </h2>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Expense Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-3 border rounded-xl"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border rounded-xl"
              required
            >
              <option value="">Select Category</option>
              {expenseCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-3 border rounded-xl"
              required
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="p-3 border rounded-xl"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="credit">Credit</option>
            </select>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="p-3 border rounded-xl"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 border rounded-xl"
            >
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="p-3 border rounded-xl md:col-span-2"
            />
            <div className="flex gap-4 md:col-span-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl"
              >
                {editingId ? "Update Expense" : "Add Expense"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-3 bg-gray-400 text-white rounded-xl"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-xl"
              >
                Export Excel
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white p-8 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">
              Expenses List ({filteredExpenses.length})
            </h2>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border rounded-xl"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3">#</th>
                  <th
                    className="p-3 cursor-pointer"
                    onClick={() => setSortField("title")}
                  >
                    Title{" "}
                    {sortField === "title" &&
                      (sortOrder === "asc" ? (
                        <ArrowUpAZ className="inline w-4" />
                      ) : (
                        <ArrowDownAZ className="inline w-4" />
                      ))}
                  </th>
                  <th>Category</th>
                  <th
                    className="p-3 cursor-pointer"
                    onClick={() => setSortField("amount")}
                  >
                    Amount{" "}
                    {sortField === "amount" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp01 className="inline w-4" />
                      ) : (
                        <ArrowDown01 className="inline w-4" />
                      ))}
                  </th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentExpenses.map((exp, i) => (
                  <tr key={exp._id} className="border-t">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">{exp.title}</td>
                    <td className="p-3">
                      {expenseCategories.find((c) => c._id === exp.category)?.name ??
                        exp.category?.name ??
                        exp.category ??
                        "-"}
                    </td>
                    <td className="p-3">{exp.amount}</td>
                    <td className="p-3">{exp.paymentMethod}</td>
                    <td className="p-3">{exp.status}</td>
                    <td className="p-3">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">{exp.notes || "-"}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(exp)}
                        className="px-3 py-1 bg-blue-500 text-white rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded"
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 border rounded ${
                  currentPage === i + 1 ? "bg-blue-600 text-white" : ""
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
