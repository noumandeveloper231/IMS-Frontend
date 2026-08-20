import * as React from "react";
import {
  User,
  Lock,
  Camera,
  MoreVertical,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/UI/dialog";
import { Button } from "@/components/UI/button";
import { Input } from "@/components/UI/input";
import { cn } from "@/lib/utils";
import api from "@/utils/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function ProfileModal({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = React.useState("profile");
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [profilePreview, setProfilePreview] = React.useState("");
  const [selectedImageFile, setSelectedImageFile] = React.useState(null);
  const [avatarHasError, setAvatarHasError] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    firstName: user?.firstName || user?.name?.split(" ")[0] || "",
    lastName: user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordTouched, setPasswordTouched] = React.useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const fileInputRef = React.useRef(null);

  const passwordRules = React.useMemo(() => {
    const newPassword = passwordData.newPassword || "";
    return {
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [passwordData.newPassword]);

  const isPasswordStrong = React.useMemo(
    () => Object.values(passwordRules).every(Boolean),
    [passwordRules],
  );

  const doPasswordsMatch =
    passwordData.confirmPassword.length > 0 &&
    passwordData.newPassword === passwordData.confirmPassword;

  const isPasswordFormValid =
    passwordData.currentPassword.trim().length > 0 &&
    isPasswordStrong &&
    doPasswordsMatch;

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      // For now, just read the file as data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarHasError(false);
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    setProfileData({
      firstName: user?.firstName || user?.name?.split(" ")[0] || "",
      lastName: user?.lastName || user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
    });
    setProfilePreview("");
    setSelectedImageFile(null);
    setAvatarHasError(false);
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let nextProfilePicture = user?.profilePicture || "";
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append("image", selectedImageFile);
        const uploadRes = await api.post("/users/profile-picture", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        nextProfilePicture =
          uploadRes?.data?.url ||
          uploadRes?.data?.user?.profilePicture ||
          nextProfilePicture;
      }

      const res = await api.put("/users/profile", {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        profilePicture: nextProfilePicture,
      });

      const updatedUserPayload = {
        ...(res.data?.user || res.data),
        profilePicture: nextProfilePicture,
      };
      updateUser(updatedUserPayload);
      toast.success("Profile updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const currentPassword = passwordData.currentPassword.trim();
    const newPassword = passwordData.newPassword;
    const confirmPassword = passwordData.confirmPassword;

    if (!currentPassword) {
      toast.error("Current password is required");
      setIsLoading(false);
      return;
    }

    if (!isPasswordStrong) {
      toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      );
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      setIsLoading(false);
      return;
    }

    try {
      await api.put("/users/password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password updated successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordTouched({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const joinedDate =
    user?.createdAt ||
    user?.dateJoined ||
    user?.created_at ||
    user?.joinedAt ||
    user?.joined_at ||
    user?.createdOn ||
    user?.created_on;

  const avatarSource = avatarHasError
    ? ""
    : profilePreview || user?.profilePicture || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButton={false}
        className="max-w-4xl p-0 overflow-hidden max-h-[90vh]"
      >
        <DialogTitle className="sr-only">Account Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your account profile and security settings
        </DialogDescription>
        <div className="flex h-[90vh]">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Account Settings</h2>
            </div>

            <nav className="flex-1 p-2">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "profile"
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <User className="h-4 w-4" />
                Profile
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors mt-1",
                  activeTab === "security"
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <Lock className="h-4 w-4" />
                Security
              </button>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {activeTab === "profile" ? (
              <div className="p-6">
                {/* Profile Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Profile</h3>

                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePictureChange}
                      />
                      {avatarSource ? (
                        <img
                          src={avatarSource}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover"
                          onError={() => setAvatarHasError(true)}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
                          {profileData.firstName?.[0]?.toUpperCase() ||
                            user?.name?.[0]?.toUpperCase() ||
                            "U"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        <Camera className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <p className="text-xl font-semibold text-gray-900">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.name || "User"}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        {user?.email || "No email"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <form
                  onSubmit={handleProfileUpdate}
                  className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
                >
                  <h3 className="text-lg font-semibold mb-4">
                    Basic Information
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <Input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined:{" "}
                        {formatDate(joinedDate)}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </form>

                {/* Email Addresses Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Email Addresses</h3>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user?.email}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          Primary
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Security Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Change Password
                  </h3>

                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        onBlur={() =>
                          setPasswordTouched((prev) => ({
                            ...prev,
                            currentPassword: true,
                          }))
                        }
                        className="w-full"
                        required
                      />
                      {passwordTouched.currentPassword &&
                      !passwordData.currentPassword.trim() ? (
                        <p className="text-xs text-red-600 mt-1">
                          Current password is required.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        onBlur={() =>
                          setPasswordTouched((prev) => ({
                            ...prev,
                            newPassword: true,
                          }))
                        }
                        className="w-full"
                        required
                      />
                      {(passwordTouched.newPassword ||
                        passwordData.newPassword.length > 0) && (
                        <div className="mt-2 space-y-1 text-xs">
                          <p
                            className={
                              passwordRules.minLength
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            At least 8 characters
                          </p>
                          <p
                            className={
                              passwordRules.uppercase
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            At least 1 uppercase letter
                          </p>
                          <p
                            className={
                              passwordRules.lowercase
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            At least 1 lowercase letter
                          </p>
                          <p
                            className={
                              passwordRules.number
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            At least 1 number
                          </p>
                          <p
                            className={
                              passwordRules.special
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            At least 1 special character
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        onBlur={() =>
                          setPasswordTouched((prev) => ({
                            ...prev,
                            confirmPassword: true,
                          }))
                        }
                        className="w-full"
                        required
                      />
                      {passwordData.confirmPassword.length > 0 && (
                        <p
                          className={`text-xs mt-1 ${
                            doPasswordsMatch ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {doPasswordsMatch
                            ? "Passwords match"
                            : "Passwords do not match"}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isLoading || !isPasswordFormValid}>
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ProfileModal };
