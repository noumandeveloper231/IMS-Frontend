import React, { useState } from "react";
import { Edit, Trash2 } from "lucide-react";

const DataTable = ({ title, data, columns, loading, onEdit, onDelete }) => {
  const [search, setSearch] = useState("");

  // Filtered data based on search
  const filteredData = data.filter((row) =>
    columns.some((col) =>
      row[col.accessor]?.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="bg-white shadow rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg p-2 w-full mb-4 focus:ring-2 focus:ring-blue-400"
      />

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-6">
          <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
        </div>
      ) : filteredData.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No records found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                {columns.map((col) => (
                  <th key={col.accessor} className="p-3 border-b">
                    {col.header}
                  </th>
                ))}
                <th className="p-3 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.accessor} className="p-3 border-b">
                      {row[col.accessor]}
                    </td>
                  ))}
                  <td className="p-3 border-b text-center space-x-2">
                    <button
                      onClick={() => onEdit(row)}
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(row._id)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataTable;
