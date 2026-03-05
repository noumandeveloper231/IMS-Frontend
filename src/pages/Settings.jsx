import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/UI/tabs";
import { Button } from "@/components/UI/button";
import { Field } from "@/components/UI/field";
import { Input } from "@/components/UI/input";
import { Label } from "@/components/UI/label";
import { cn } from "@/lib/utils";
import api from "@/utils/api";

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
      { name: "siteIcon", label: "Site icon (URL)", placeholder: "https://...", hint: "URL of the icon image (e.g. logo)." },
      { name: "siteFavicon", label: "Site favicon (URL)", placeholder: "https://...", hint: "URL of the favicon image." },
      { name: "siteTagline", label: "Tagline", placeholder: "Short tagline", hint: null },
      { name: "siteDescription", label: "Site description", placeholder: "Brief description", hint: null },
    ],
  },
  {
    id: "general",
    label: "General",
    fields: [],
    placeholder: "Other general options. Configure later.",
  },
];

const initialFormState = () =>
  SETTINGS_MODAL_SECTIONS.reduce((acc, section) => {
    section.fields.forEach((f) => {
      acc[f.name] = "";
    });
    return acc;
  }, {});

const Settings = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings/get");
      const settings = res.data?.settings ?? {};
      setFormData((prev) => {
        const next = { ...prev };
        SETTINGS_MODAL_SECTIONS.forEach((section) => {
          section.fields.forEach((f) => {
            if (settings[f.name] != null) next[f.name] = String(settings[f.name]);
          });
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/settings/update", formData);
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setSaving(false);
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
                    "data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none"
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
                <section className="rounded-xl border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-6">
                  <h2 className="text-base font-semibold text-gray-900">{section.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {section.id === "general" ? (
                      <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                          Configure site identity and general options.
                        </p>
                        <Tabs defaultValue={SETTINGS_MODAL_SECTIONS[0].id} className="w-full">
                          <TabsList className="grid w-full grid-cols-2 max-w-md">
                            {SETTINGS_MODAL_SECTIONS.map((tab) => (
                              <TabsTrigger key={tab.id} value={tab.id}>
                                {tab.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>

                          {SETTINGS_MODAL_SECTIONS.map((sec) => (
                            <TabsContent key={sec.id} value={sec.id} className="mt-4">
                              {sec.fields.length > 0 ? (
                                <div className="space-y-4 max-w-xl">
                                  {sec.fields.map((field) => (
                                    <Field key={field.name}>
                                      <Label>{field.label}</Label>
                                      <Input
                                        value={formData[field.name] ?? ""}
                                        onChange={(e) => setField(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        disabled={loading}
                                      />
                                      {field.hint && (
                                        <p className="mt-1 text-xs text-gray-500">{field.hint}</p>
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
                          <Button onClick={handleSaveSettings} disabled={saving || loading}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                        </div>
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
