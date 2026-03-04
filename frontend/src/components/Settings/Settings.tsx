"use client";

import { useState, useEffect } from "react";
import { api, Space, ThemeConfig } from "@/utils/api";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onSpacesChanged: () => void;
  theme: ThemeConfig;
  onThemeChanged: (theme: ThemeConfig) => void;
}

type Tab = "general" | "spaces";

const OS_STYLES: { id: ThemeConfig["style"]; label: string; desc: string }[] = [
  { id: "macos", label: "macOS", desc: "Frosted glass, generous rounding" },
  { id: "windows", label: "Windows", desc: "Fluent/Mica, sharp corners" },
  { id: "linux", label: "Linux", desc: "GTK/Adwaita, flat surfaces" },
];

const ACCENT_COLORS = [
  { name: "amber", color: "#f59e0b" },
  { name: "blue", color: "#3b82f6" },
  { name: "purple", color: "#8b5cf6" },
  { name: "pink", color: "#ec4899" },
  { name: "red", color: "#ef4444" },
  { name: "orange", color: "#f97316" },
  { name: "green", color: "#22c55e" },
  { name: "teal", color: "#14b8a6" },
];

const DEFAULT_STATUSES = [
  "Idea",
  "Planning",
  "In Progress",
  "Analyze",
  "Archive",
];

export default function Settings({
  open,
  onClose,
  onSpacesChanged,
  theme,
  onThemeChanged,
}: SettingsProps) {
  const [tab, setTab] = useState<Tab>("spaces");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open) {
      api.getSources().then(({ spaces }) => {
        setSpaces(spaces);
        setDirty(false);
      });
    }
  }, [open]);

  if (!open) return null;

  async function saveSpaces() {
    await api.updateSources({ spaces });
    setDirty(false);
    onSpacesChanged();
  }

  function addSpace() {
    const newSpace: Space = {
      name: "New Space",
      icon: "📁",
      roots: [],
      statuses: [...DEFAULT_STATUSES],
    };
    setSpaces([...spaces, newSpace]);
    setEditingIndex(spaces.length);
    setDirty(true);
  }

  function updateSpace(index: number, updates: Partial<Space>) {
    const updated = [...spaces];
    updated[index] = { ...updated[index], ...updates };
    setSpaces(updated);
    setDirty(true);
  }

  function removeSpace(index: number) {
    setSpaces(spaces.filter((_, i) => i !== index));
    setEditingIndex(null);
    setDirty(true);
  }

  async function addRoot(index: number) {
    try {
      const { path } = await api.pickFolder();
      if (!path) return;
      const updated = [...spaces];
      updated[index] = {
        ...updated[index],
        roots: [...updated[index].roots, path],
      };
      setSpaces(updated);
      setDirty(true);
    } catch (err) {
      console.error("Failed to open folder picker:", err);
    }
  }

  function removeRoot(spaceIndex: number, rootIndex: number) {
    const updated = [...spaces];
    updated[spaceIndex] = {
      ...updated[spaceIndex],
      roots: updated[spaceIndex].roots.filter((_, i) => i !== rootIndex),
    };
    setSpaces(updated);
    setDirty(true);
  }

  function addStatus(index: number) {
    const status = prompt("Enter new status column name:");
    if (!status) return;
    const updated = [...spaces];
    updated[index] = {
      ...updated[index],
      statuses: [...updated[index].statuses, status],
    };
    setSpaces(updated);
    setDirty(true);
  }

  function removeStatus(spaceIndex: number, statusIndex: number) {
    const updated = [...spaces];
    updated[spaceIndex] = {
      ...updated[spaceIndex],
      statuses: updated[spaceIndex].statuses.filter(
        (_, i) => i !== statusIndex
      ),
    };
    setSpaces(updated);
    setDirty(true);
  }

  async function toggleTheme() {
    const newTheme: ThemeConfig = {
      ...theme,
      mode: theme.mode === "dark" ? "light" : "dark",
    };
    await api.updateSources({ theme: newTheme });
    onThemeChanged(newTheme);
  }

  async function setStyle(style: ThemeConfig["style"]) {
    const newTheme: ThemeConfig = { ...theme, style };
    await api.updateSources({ theme: newTheme });
    onThemeChanged(newTheme);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-glass border border-border radius w-[620px] max-h-[85vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
        {/* Header */}
        <div className="flex items-center px-5 py-3.5 border-b border-border">
          <img src="/peep-icon.png" alt="" className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Settings</span>
          <div className="flex ml-3 h-7 bg-surface rounded-lg overflow-hidden border border-border-subtle">
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "general"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("general")}
            >
              General
            </button>
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "spaces"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("spaces")}
            >
              Spaces
            </button>
          </div>
          <span className="flex-1" />
          {dirty && (
            <button
              className="h-7 px-3 text-[11px] font-semibold bg-accent hover:bg-accent-hover text-black rounded-lg transition-all mr-2"
              onClick={saveSpaces}
            >
              Save Changes
            </button>
          )}
          <button
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={onClose}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "general" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  Appearance
                </h3>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                  <span className="text-[13px] text-primary flex-1 font-medium">
                    Theme
                  </span>
                  <button
                    className="h-7 px-3 bg-elevated hover:bg-hover border border-border-subtle rounded-lg text-[11px] font-medium text-secondary hover:text-primary transition-all"
                    onClick={toggleTheme}
                  >
                    {theme.mode === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  UI Style
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {OS_STYLES.map((os) => (
                    <button
                      key={os.id}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all ${
                        (theme.style || "macos") === os.id
                          ? "bg-accent/10 border-accent/40 text-primary"
                          : "bg-surface border-border-subtle text-secondary hover:text-primary hover:border-border"
                      }`}
                      onClick={() => setStyle(os.id)}
                    >
                      <span className="text-[13px] font-semibold">{os.label}</span>
                      <span className="text-[10px] text-tertiary leading-snug">{os.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "spaces" && (
            <div className="space-y-2 animate-fade-in">
              {spaces.map((space, i) => (
                <div
                  key={i}
                  className="bg-surface border border-border-subtle rounded-xl overflow-hidden"
                >
                  {/* Space header */}
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-hover transition-colors"
                    onClick={() =>
                      setEditingIndex(editingIndex === i ? null : i)
                    }
                  >
                    <span className="text-[9px] text-tertiary">
                      {editingIndex === i ? "▾" : "▸"}
                    </span>
                    <span className="text-lg leading-none">{space.icon}</span>
                    <span className="text-[13px] font-medium text-primary flex-1">
                      {space.name}
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">
                      {space.roots.length} root
                      {space.roots.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Expanded editor */}
                  {editingIndex === i && (
                    <div className="px-3.5 pb-3.5 space-y-3 border-t border-border-subtle pt-3">
                      {/* Name + Icon */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                            Name
                          </label>
                          <input
                            className="w-full bg-elevated border border-border-subtle rounded-lg px-2.5 py-1.5 text-[13px] text-primary mt-1 outline-none focus:border-accent/50 transition-colors"
                            value={space.name}
                            onChange={(e) =>
                              updateSpace(i, { name: e.target.value })
                            }
                          />
                        </div>
                        <div className="w-16">
                          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                            Icon
                          </label>
                          <input
                            className="w-full bg-elevated border border-border-subtle rounded-lg px-2 py-1.5 text-[13px] text-center mt-1 outline-none focus:border-accent/50 transition-colors"
                            value={space.icon}
                            onChange={(e) =>
                              updateSpace(i, { icon: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* Accent color */}
                      <div>
                        <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                          Accent Color
                        </label>
                        <div className="flex gap-1.5 mt-1.5">
                          {ACCENT_COLORS.map((ac) => (
                            <button
                              key={ac.name}
                              className={`w-6 h-6 rounded-full transition-all ${
                                space.accentColor === ac.name
                                  ? "ring-2 ring-white ring-offset-2 ring-offset-surface scale-110"
                                  : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: ac.color }}
                              onClick={() =>
                                updateSpace(i, { accentColor: ac.name })
                              }
                              title={ac.name}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Roots */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                            Root Folders
                          </label>
                          <button
                            className="text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
                            onClick={() => addRoot(i)}
                          >
                            + Add
                          </button>
                        </div>
                        <div className="space-y-1">
                          {space.roots.length === 0 && (
                            <div className="text-[11px] text-tertiary italic py-2 px-2.5 bg-elevated rounded-lg border border-dashed border-border-subtle text-center">
                              No roots — click + Add to add a folder
                            </div>
                          )}
                          {space.roots.map((root, ri) => (
                            <div
                              key={ri}
                              className="flex items-center gap-2 bg-elevated rounded-lg px-2.5 py-1.5 group border border-border-subtle"
                            >
                              <span className="text-[11px] text-secondary font-mono flex-1 truncate">
                                {root}
                              </span>
                              <button
                                className="text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => removeRoot(i, ri)}
                              >
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 12 12"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                >
                                  <path d="M2 2l8 8M10 2l-8 8" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Statuses */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                            Board Columns
                          </label>
                          <button
                            className="text-[11px] text-accent hover:text-accent-hover font-medium transition-colors"
                            onClick={() => addStatus(i)}
                          >
                            + Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {space.statuses.map((status, si) => (
                            <span
                              key={si}
                              className="flex items-center gap-1 bg-elevated text-[11px] text-secondary px-2 py-1 rounded-lg border border-border-subtle group"
                            >
                              {status}
                              <button
                                className="text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-0.5"
                                onClick={() => removeStatus(i, si)}
                              >
                                <svg
                                  width="8"
                                  height="8"
                                  viewBox="0 0 12 12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                >
                                  <path d="M2 2l8 8M10 2l-8 8" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="pt-2 border-t border-border-subtle">
                        <button
                          className="text-[11px] text-red-400/70 hover:text-red-400 font-medium transition-colors"
                          onClick={() => removeSpace(i)}
                        >
                          Delete Space
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add space button */}
              <button
                className="w-full py-2.5 border border-dashed border-border rounded-xl text-[12px] font-medium text-tertiary hover:text-accent hover:border-accent/30 transition-all"
                onClick={addSpace}
              >
                + Add Space
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
