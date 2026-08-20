import React, { useContext, useState } from "react";
import { User, LogOut, Settings, ChevronDown, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import assets from "@/assets/assets";
import { useSettings } from "@/context/SettingsContext";
import { useGlobalSearch } from "@/context/GlobalSearchContext";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/UI/input-group";
import { Kbd } from "@/components/UI/kbd";
import { ProfileModal } from "@/components/UI/ProfileModal";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { openSearch } = useGlobalSearch();
  const [isProfileOpen, setIsProfileOpen] = useState(false);


  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const profileAvatarSrc = user?.profilePicture || user?.avatar || user?.image || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="bg-white text-gray-900 border-b border-gray-300 px-5 py-3 flex justify-between items-center dark:border-gray-600 dark:bg-gray-900 dark:text-white">
      <Link to="/" className="flex items-center gap-2">
        <img
          src={settings?.siteLogo || assets.logo}
          alt="logo"
          className="w-10 h-10"
        />
        <h1 className="text-xl font-semibold">
          {settings?.siteName || "Al Ramil"}
        </h1>
      </Link>

      <div className="flex items-center gap-3">
        <button type="button" onClick={openSearch} className="hidden md:flex">
          <InputGroup className="w-64">
            <InputGroupAddon align="inline-start">
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search..."
              readOnly
              onClick={openSearch}
            />
            <InputGroupAddon align="inline-end">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </button>

        <button
          type="button"
          onClick={openSearch}
          className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
        >
          {profileAvatarSrc ? (
            <img
              src={profileAvatarSrc}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {initials || <User size={16} />}
            </div>
          )}
          <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown size={18} className="transition-transform" />
        </button>
      </div>

      <ProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
};

export default Navbar;
