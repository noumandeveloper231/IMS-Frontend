import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";
import { toast } from "sonner";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    openingBalance: 0,
    notes: "",
    status: "active",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const nameInputRef = useRef(null);

  // ✅ Fetch Vendors
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/vendors/getall");
      setVendors(res.data);
    } catch (err) {
      toast.error("Failed to fetch vendors ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // ✅ Input Change Handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ✅ Submit Vendor
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim())
      return toast.error("Name & Phone required!");

    // Duplicate email check (when email is provided)
    if (form.email?.trim()) {
      const existing = vendors.find(
        (v) =>
          v.email?.toLowerCase() === form.email.trim().toLowerCase() &&
          v._id !== editingId
      );
      if (existing) {
        return toast.error("A vendor with this email already exists.");
      }
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/vendors/update/${editingId}`, form);
        toast.success("Vendor updated ✅");
      } else {
        await api.post("/vendors/create", form);
        toast.success("Vendor added ✅");
      }
      resetForm();
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong ❌");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit Vendor
  const handleEdit = (vendor) => {
    setForm({
      name: vendor.name || "",
      companyName: vendor.companyName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || "",
      openingBalance: vendor.openingBalance || 0,
      notes: vendor.notes || "",
      status: vendor.status || "active",
    });
    setEditingId(vendor._id);
    setTimeout(() => nameInputRef.current?.focus(), 100);
    toast.info(`Editing vendor: ${vendor.name}`);
  };

  // ✅ Delete Vendor
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This vendor will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      });
      if (!result.isConfirmed) return;

      setLoading(true);
      await api.delete(`/vendors/${id}`);
      Swal.fire("Deleted!", "Vendor deleted successfully.", "success");
      fetchVendors();
    } catch (err) {
      Swal.fire("Error!", "Failed to delete vendor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      openingBalance: 0,
      notes: "",
      status: "active",
    });
    setEditingId(null);
  };

  // ✅ Search
  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Export Excel
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredVendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "vendors.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8  ">
      <div className="max-w-7xl mx-auto">
        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {editingId ? "Edit Vendor" : "Add Vendor"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input
              type="text"
              name="name"
              placeholder="Vendor Name"
              ref={nameInputRef}
              value={form.name}
              onChange={handleChange}
              required
              className="p-3 border rounded-xl"
            />
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={form.companyName}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="p-3 border rounded-xl"
            />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={form.address}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <input
              type="text"
              name="country"
              placeholder="Country"
              value={form.country}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <input
              type="number"
              name="openingBalance"
              placeholder="Opening Balance"
              value={form.openingBalance}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            />
            <textarea
              name="notes"
              placeholder="Notes"
              value={form.notes}
              onChange={handleChange}
              className="p-3 border rounded-xl md:col-span-2"
            />
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="p-3 border rounded-xl"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="flex gap-4 mt-4 md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl"
              >
                {editingId ? "Update Vendor" : "Add Vendor"}
              </button>
              <button
                type="button"
                onClick={resetForm}
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
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Vendors List</h2>
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border rounded-xl"
            />
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Company</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">City</th>
                    <th className="p-4">Country</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v, i) => (
                    <tr key={v._id} className="hover:bg-gray-50">
                      <td className="p-4">{i + 1}</td>
                      <td className="p-4">{v.name}</td>
                      <td className="p-4">{v.companyName}</td>
                      <td className="p-4">{v.email}</td>
                      <td className="p-4">{v.phone}</td>
                      <td className="p-4">{v.city}</td>
                      <td className="p-4">{v.country}</td>
                      <td className="p-4">{v.openingBalance}</td>
                      <td className="p-4">{v.status}</td>
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => handleEdit(v)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(v._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Vendors;
