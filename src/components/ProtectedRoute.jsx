import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH !== "false";

export default function ProtectedRoute({ permission, children }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!REQUIRE_AUTH) return children;

  if (!user && localStorage.getItem("token")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && (!user.permissions || !user.permissions.includes(permission))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Not allowed</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-center">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
