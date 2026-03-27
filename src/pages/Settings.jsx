import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/UI/tabs";
import { Button } from "@/components/UI/button";
import { Field } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Label } from "@/components/UI/label";
import { cn } from "@/lib/utils";
import api from "@/utils/api";
import { toast } from "sonner";
import { ImageUploadDropzone } from "@/components/UI/image-upload-dropzone";
import { useSettings } from "@/context/SettingsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/UI/dialog";

const SETTINGS_SECTIONS = [
  { id: "general", label: "General", description: "General application settings. Configure later." },
  { id: "appearance", label: "Appearance", description: "Theme and display preferences. Configure later." },
  { id: "notifications", label: "Notifications", description: "Notification and alert preferences. Configure later." },
  { id: "data-security", label: "Data & security", description: "Data handling and security options. Configure later." },
];

// Single modal: sections and fields defined as objects (matches backend setting keys)
const SETTINGS_MODAL_SECTIONS = [
  {
    id: "site",
    label: "Site",
    fields: [
      { name: "siteName", label: "Site name", placeholder: "My Store", hint: null },
      {
        name: "siteIcon",
        type: "image",
        label: "Site icon (favicon)",
        hint: "Used for browser favicon. Upload a small icon image.",
      },
      {
        name: "siteLogo",
        type: "image",
        label: "Site logo",
        hint: "Used in sidebar and navbar.",
      },
      { name: "siteTagline", label: "Tagline", placeholder: "Short tagline", hint: null },
      { name: "siteDescription", label: "Site description", placeholder: "Brief description", hint: null },
    ],
  },
  {
    id: "general",
    label: "General",
    fields: [
      {
        name: "skuPrefix",
        label: "SKU prefix",
        placeholder: "AR",
        hint: "Used as the default prefix for product SKU generation (e.g. AR, BR, CR).",
      },
      {
        name: "currency",
        label: "Currency",
        placeholder: "AED",
        hint: "Used in product prices across product pages.",
      },
      {
        name: "placeholderImage",
        type: "image",
        label: "Placeholder image",
        hint: "Used when product has no image.",
      },
    ],
    placeholder: "Other general options. Configure later.",
  },
];

const APPEARANCE_FIELDS = [
  {
    name: "accentColor",
    label: "Accent color",
    placeholder: "#111827",
    hint: "Used for primary buttons, lighter hover state, and the top loading bar.",
  },
];

const DEFAULT_PRESET_COLORS = [
  "#FABC00", "#FF9800", "#FF6D00", "#CF550E", "#E74600", "#EA6D52", "#D0323A", "#FF434A",
  "#E84859", "#F80A27", "#EA006D", "#CA005D", "#DD0395", "#C30089", "#BB41B6", "#A90EA0",
  "#197CCB", "#156CB0", "#8684CD", "#6A6BCB", "#876ABD", "#7752AF", "#A84CC1", "#8F24A8",
  "#1A98B7", "#3A85A3", "#1DAFBA", "#158A8F", "#15AE98", "#0D8B7D", "#0ECC66", "#1A923F",
  "#898383", "#656261", "#6D7D94", "#586679", "#648B82", "#4E746D", "#498C00", "#0E8B11",
  "#818181", "#545251", "#74848D", "#4F5A61", "#6F866B", "#5A685E", "#8A7D4C", "#877E68",
];

const initialFormState = () =>
  [...SETTINGS_MODAL_SECTIONS, { fields: APPEARANCE_FIELDS }].reduce((acc, section) => {
    section.fields.forEach((f) => {
      acc[f.name] = "";
    });
    return acc;
  }, {});

const normalizeHexColor = (value) => {
  const raw = String(value || "").trim();
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  const isThreeDigitHex = /^[0-9a-fA-F]{3}$/.test(hex);
  const isSixDigitHex = /^[0-9a-fA-F]{6}$/.test(hex);
  if (!isThreeDigitHex && !isSixDigitHex) return null;
  const sixDigit = isThreeDigitHex
    ? hex
        .split("")
        .map((char) => char + char)
        .join("")
    : hex;
  return `#${sixDigit.toUpperCase()}`;
};

const normalizeColorList = (list = [], max = 20) => {
  const seen = new Set();
  const normalized = [];
  for (const value of list) {
    const color = normalizeHexColor(value);
    if (!color || seen.has(color)) continue;
    seen.add(color);
    normalized.push(color);
    if (normalized.length >= max) break;
  }
  return normalized;
};

const pushRecentColor = (list = [], color, max = 8) => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return normalizeColorList(list, max);
  const without = normalizeColorList(list, max).filter((c) => c !== normalized);
  return [normalized, ...without].slice(0, max);
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const getReadableText = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
};

const Settings = () => {
  const { settings, loading: settingsLoading, refreshSettings } = useSettings();
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accentSaving, setAccentSaving] = useState(false);
  const [recentColors, setRecentColors] = useState([]);
  const [presetColors, setPresetColors] = useState(DEFAULT_PRESET_COLORS);
  const [customColors, setCustomColors] = useState([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customColorDraft, setCustomColorDraft] = useState("#7C3AED");

  const setField = (name, value) => {
    let nextValue = value;
    if (name === "skuPrefix" || name === "currency") {
      nextValue = String(value ?? "").toUpperCase();
    }
    if (name === "accentColor") {
      nextValue = String(value ?? "").toUpperCase();
    }
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  useEffect(() => {
    if (!settings) return;
    const next = initialFormState();
    SETTINGS_MODAL_SECTIONS.forEach((section) => {
      section.fields.forEach((f) => {
        if (settings[f.name] != null) next[f.name] = String(settings[f.name]);
      });
    });
    APPEARANCE_FIELDS.forEach((f) => {
      if (settings[f.name] != null) next[f.name] = String(settings[f.name]);
    });
    setFormData(next);
    setRecentColors(normalizeColorList(settings.accentColorRecents || [], 8));
    const presets = normalizeColorList(settings.accentColorPresets || [], 64);
    const mergedPresets = normalizeColorList([...DEFAULT_PRESET_COLORS, ...presets], 64);
    setPresetColors(mergedPresets.length > 0 ? mergedPresets : DEFAULT_PRESET_COLORS);
    setCustomColors(normalizeColorList(settings.accentColorCustoms || [], 64));
  }, [settings]);

  const persistAppearance = async ({
    accent,
    recents = recentColors,
    presets = presetColors,
    customs = customColors,
    withToast = false,
  }) => {
    const normalizedAccent = normalizeHexColor(accent);
    if (!normalizedAccent) return;
    setAccentSaving(true);
    try {
      const payload = {
        ...formData,
        accentColor: normalizedAccent,
        accentColorRecents: normalizeColorList(recents, 8),
        accentColorPresets: normalizeColorList(presets, 64),
        accentColorCustoms: normalizeColorList(customs, 64),
      };
      await api.put("/settings/update", payload);
      if (withToast) toast.success("Accent updated");
      await refreshSettings();
    } catch (err) {
      console.error("Failed to update accent settings", err);
      toast.error("Failed to update accent settings");
    } finally {
      setAccentSaving(false);
    }
  };

  const handleSelectAccentColor = async (color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    setField("accentColor", normalized);
    const nextRecents = pushRecentColor(recentColors, normalized, 8);
    setRecentColors(nextRecents);
    await persistAppearance({
      accent: normalized,
      recents: nextRecents,
    });
  };

  const handleAddCustomColor = async () => {
    const normalized = normalizeHexColor(customColorDraft);
    if (!normalized) return;
    const nextCustoms = normalizeColorList([normalized, ...customColors], 64);
    const nextRecents = pushRecentColor(recentColors, normalized, 8);
    setCustomColors(nextCustoms);
    setRecentColors(nextRecents);
    setField("accentColor", normalized);
    await persistAppearance({
      accent: normalized,
      recents: nextRecents,
      customs: nextCustoms,
      withToast: true,
    });
    setCustomDialogOpen(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        accentColor: normalizeHexColor(formData.accentColor) || "",
        accentColorRecents: normalizeColorList(recentColors, 8),
        accentColorPresets: normalizeColorList(presetColors, 64),
        accentColorCustoms: normalizeColorList(customColors, 64),
      };
      await api.put("/settings/update", payload);
      toast.success("Settings saved successfully");
      await refreshSettings();
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
    }
  };

  const uploadEndpointByField = {
    siteIcon: "/settings/upload-site-icon",
    siteLogo: "/settings/upload-site-logo",
    placeholderImage: "/settings/upload-placeholder-image",
  };

  const handleUploadFieldImage = async (fieldName, file) => {
    const endpoint = uploadEndpointByField[fieldName];
    if (!endpoint) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post(endpoint, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url ?? "";
      if (url) {
        setField(fieldName, url);
        toast.success("Image uploaded");
        await refreshSettings();
      } else {
        toast.error("Image upload failed");
      }
    } catch (err) {
      console.error("Image upload failed", err);
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your application preferences and configuration.
          </p>
        </div>
      </div>

      <Tabs defaultValue={SETTINGS_SECTIONS[0].id} className="w-full">
        <div className="mx-auto flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="w-full shrink-0 lg:w-56">
            <TabsList className="flex h-auto w-full flex-col justify-start rounded-xl border border-gray-200 bg-white p-2 shadow-sm lg:sticky lg:top-0">
              {SETTINGS_SECTIONS.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className={cn(
                    "w-full justify-start rounded-md px-3 py-2 text-sm font-medium text-gray-700",
                    "hover:bg-gray-100",
                    "data-[state=active]:bg-[var(--app-accent,#111827)] data-[state=active]:text-[var(--app-accent-foreground,#ffffff)] data-[state=active]:shadow-none data-[state=active]:font-semibold"
                  )}
                >
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            {SETTINGS_SECTIONS.map((section) => (
              <TabsContent
                key={section.id}
                value={section.id}
                className="mt-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <section className="px-0 py-0 bg-transparent">
                  <h2 className="text-base font-semibold text-gray-900">{section.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                  <div className="mt-4">
                    {section.id === "general" ? (
                      <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                          Configure site identity and general options.
                        </p>
                        <Tabs defaultValue={SETTINGS_MODAL_SECTIONS[0].id} className="w-full">
                          <TabsList className="grid w-full grid-cols-2 max-w-xl">
                            {SETTINGS_MODAL_SECTIONS.map((tab) => (
                              <TabsTrigger key={tab.id} value={tab.id}>
                                {tab.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {SETTINGS_MODAL_SECTIONS.map((sec) => (
                            <TabsContent key={sec.id} value={sec.id} className="mt-4">
                              {sec.fields.length > 0 ? (
                                <div className="space-y-4">
                                  {sec.fields.map((field) => (
                                    <Field key={field.name}>
                                      <Label>{field.label}</Label>
                                      {field.type === "image" ? (
                                        <>
                                          <ImageUploadDropzone
                                            accept="image/*"
                                            onFileSelect={(file) => handleUploadFieldImage(field.name, file)}
                                            previewUrl={formData[field.name] ?? ""}
                                            disabled={uploading || settingsLoading}
                                            label={field.label}
                                            description={field.hint ?? ""}
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <Input
                                            value={formData[field.name] ?? ""}
                                            onChange={(e) => setField(field.name, e.target.value)}
                                            placeholder={field.placeholder}
                                            disabled={uploading || saving || settingsLoading}
                                          />
                                          {field.hint && (
                                            <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
                                          )}
                                        </>
                                      )}
                                    </Field>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  {sec.placeholder ?? "No options yet."}
                                </p>
                              )}
                            </TabsContent>
                          ))}
                        </Tabs>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleSaveSettings} disabled={saving || uploading || settingsLoading}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : section.id === "appearance" ? (
                      <div className="max-w-xl space-y-4">
                        <p className="text-sm text-gray-500">
                          Click a color to apply immediately. No save button required.
                        </p>

                        <div className="space-y-2">
                          <Label className="mb-2 text-lg font-medium">Recent colors</Label>
                          <div className="max-w-xl flex flex-wrap gap-1">
                            {recentColors.length > 0 ? (
                              recentColors.map((color) => (
                                <button
                                  key={`recent-${color}`}
                                  type="button"
                                  className={cn(
                                    "h-15 w-15 border border-gray-300 transition-transform hover:scale-105",
                                    normalizeHexColor(formData.accentColor) === color &&
                                      "ring-2 ring-[var(--app-accent-border,#d1d5db)] ring-offset-1"
                                  )}
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleSelectAccentColor(color)}
                                  disabled={accentSaving || saving || uploading || settingsLoading}
                                  aria-label={`Select recent color ${color}`}
                                />
                              ))
                            ) : (
                              <p className="text-xs text-gray-500">No recent colors yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="mb-2 text-lg font-medium">Preset colors</Label>
                          <div className="max-w-xl flex flex-wrap gap-1">
                            {presetColors.map((color) => (
                              <button
                                key={`preset-${color}`}
                                type="button"
                                className={cn(
                                  "h-15 w-15 border border-gray-300 transition-transform hover:scale-105",
                                  normalizeHexColor(formData.accentColor) === color &&
                                    "ring-2 ring-[var(--app-accent-border,#d1d5db)] ring-offset-1"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleSelectAccentColor(color)}
                                disabled={accentSaving || saving || uploading || settingsLoading}
                                aria-label={`Select preset color ${color}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="mb-2 text-lg font-medium">Custom colors</Label>
                          <div className="max-w-xl flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="h-15 w-15 grid place-content-center border-2 border-dashed border-gray-400 text-2xl text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                              onClick={() => {
                                setCustomColorDraft(normalizeHexColor(formData.accentColor) || "#7C3AED");
                                setCustomDialogOpen(true);
                              }}
                              disabled={accentSaving || saving || uploading || settingsLoading}
                              aria-label="Create custom color"
                            >
                              +
                            </button>
                            {customColors.map((color) => (
                              <button
                                key={`custom-${color}`}
                                type="button"
                                className={cn(
                                  "h-15 w-15 border border-gray-300 transition-transform hover:scale-105",
                                  normalizeHexColor(formData.accentColor) === color &&
                                    "ring-2 ring-[var(--app-accent-border,#d1d5db)] ring-offset-1"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => handleSelectAccentColor(color)}
                                disabled={accentSaving || saving || uploading || settingsLoading}
                                aria-label={`Select custom color ${color}`}
                              />
                            ))}
                          </div>
                        </div>

                        <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Custom color</DialogTitle>
                              <DialogDescription>
                                Choose a custom color and preview it before applying.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                              <div className="space-y-3">
                                <Input
                                  type="color"
                                  value={normalizeHexColor(customColorDraft) || "#7C3AED"}
                                  onChange={(e) => setCustomColorDraft(e.target.value)}
                                  className="h-56 w-full cursor-pointer rounded-xl p-2"
                                />
                                <Input
                                  value={customColorDraft}
                                  onChange={(e) => setCustomColorDraft(e.target.value.toUpperCase())}
                                  placeholder="#7C3AED"
                                  className="uppercase"
                                />
                              </div>
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Color preview</p>
                                <div className="overflow-hidden rounded-lg border border-gray-300">
                                  <div
                                    className="p-3 text-center text-sm"
                                    style={{
                                      backgroundColor: normalizeHexColor(customColorDraft) || "#7C3AED",
                                      color: getReadableText(customColorDraft),
                                    }}
                                  >
                                    Preview
                                  </div>
                                  <div className="grid grid-cols-2">
                                    <div
                                      className="p-3 text-center text-sm"
                                      style={{
                                        backgroundColor: "#111827",
                                        color: normalizeHexColor(customColorDraft) || "#7C3AED",
                                      }}
                                    >
                                      Preview
                                    </div>
                                    <div
                                      className="p-3 text-center text-sm"
                                      style={{
                                        backgroundColor: "#E5E7EB",
                                        color: normalizeHexColor(customColorDraft) || "#7C3AED",
                                      }}
                                    >
                                      Preview
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setCustomDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleAddCustomColor}
                                disabled={
                                  accentSaving ||
                                  saving ||
                                  uploading ||
                                  settingsLoading ||
                                  !normalizeHexColor(customColorDraft)
                                }
                              >
                                Done
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No options yet.</p>
                    )}
                  </div>
                </section>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
