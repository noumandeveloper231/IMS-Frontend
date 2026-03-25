import React, { useContext } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import assets from "@/assets/assets";
import { useSettings } from "@/context/SettingsContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/UI/popover";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { settings } = useSettings();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <div className="bg-white text-gray-900 border-b border-gray-300 px-5 py-3 flex justify-between items-center dark:border-gray-600 dark:bg-gray-900 dark:text-white">
      <Link to="/" className="flex items-center gap-2">
        <img src={settings?.siteLogo || assets.logo} alt="logo" className="w-10 h-10" />
        <h1 className="text-xl font-semibold">
          {settings?.siteName || "Al Ramil"}
        </h1>
      </Link>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <User size={18} />
            </div>
            <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown size={18} className="transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-52 p-0 py-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            {user?.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default Navbar;
