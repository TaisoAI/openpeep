import { useState, useEffect, useRef } from "react";
import { api, Space, ThemeConfig } from "@/utils/api";
import { X, GripVertical, Moon, Sun, SunMoon, Eye, EyeOff } from "lucide-react";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onSpacesChanged: () => void;
  theme: ThemeConfig;
  onThemeChanged: (theme: ThemeConfig) => void;
  showHiddenFiles: boolean;
  onShowHiddenFilesChanged: (show: boolean) => void;
  devMode: boolean;
  onDevModeChanged: (devMode: boolean) => void;
  peephubUrl: string;
  onPeephubUrlChanged: (url: string) => void;
  peephubApiKey: string;
  onPeephubApiKeyChanged: (key: string) => void;
}

type Tab = "general" | "spaces";

const OS_STYLES: { id: ThemeConfig["style"]; label: string; desc: string }[] = [
  { id: "macos", label: "macOS", desc: "Frosted glass, generous rounding" },
  { id: "windows", label: "Windows", desc: "Fluent/Mica, sharp corners" },
  { id: "linux", label: "Linux", desc: "GTK/Adwaita, flat surfaces" },
];

const ACCENT_COLORS = [
  { name: "amber", color: "#f59e0b" },
  { name: "orange", color: "#f97316" },
  { name: "red", color: "#ef4444" },
  { name: "rose", color: "#f43f5e" },
  { name: "pink", color: "#ec4899" },
  { name: "fuchsia", color: "#d946ef" },
  { name: "purple", color: "#8b5cf6" },
  { name: "indigo", color: "#6366f1" },
  { name: "blue", color: "#3b82f6" },
  { name: "sky", color: "#0ea5e9" },
  { name: "cyan", color: "#06b6d4" },
  { name: "teal", color: "#14b8a6" },
  { name: "emerald", color: "#10b981" },
  { name: "green", color: "#22c55e" },
  { name: "lime", color: "#84cc16" },
  { name: "yellow", color: "#eab308" },
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
  showHiddenFiles,
  onShowHiddenFilesChanged,
  devMode,
  onDevModeChanged,
  peephubUrl,
  onPeephubUrlChanged,
  peephubApiKey,
  onPeephubApiKeyChanged,
}: SettingsProps) {
  const [tab, setTab] = useState<Tab>("general");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addingStatusFor, setAddingStatusFor] = useState<number | null>(null);
  const [newStatusName, setNewStatusName] = useState("");
  const newStatusRef = useRef<HTMLInputElement>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [dragStatus, setDragStatus] = useState<{ spaceIndex: number; statusIndex: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    setAddingStatusFor(index);
    setNewStatusName("");
    setTimeout(() => newStatusRef.current?.focus(), 0);
  }

  function commitAddStatus() {
    if (addingStatusFor === null) return;
    const name = newStatusName.trim();
    if (name) {
      const updated = [...spaces];
      updated[addingStatusFor] = {
        ...updated[addingStatusFor],
        statuses: [...updated[addingStatusFor].statuses, name],
      };
      setSpaces(updated);
      setDirty(true);
    }
    setAddingStatusFor(null);
    setNewStatusName("");
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

  async function cycleThemeMode() {
    const next = theme.mode === "dark" ? "light" : theme.mode === "light" ? "auto" : "dark";
    const newTheme: ThemeConfig = { ...theme, mode: next };
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
            <X size={12} />
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
                    onClick={cycleThemeMode}
                  >
                    {theme.mode === "dark" ? <><Moon size={12} className="inline -mt-px mr-1" /> Dark</> : theme.mode === "light" ? <><Sun size={12} className="inline -mt-px mr-1" /> Light</> : <><SunMoon size={12} className="inline -mt-px mr-1" /> Auto</>}
                  </button>
                </div>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3 mt-2">
                  <span className="text-[13px] text-primary flex-1 font-medium">
                    Show Logo
                  </span>
                  <button
                    className={`w-9 h-5 rounded-full transition-all relative ${
                      theme.showLogo !== false
                        ? "bg-accent"
                        : "bg-elevated border border-border-subtle"
                    }`}
                    onClick={async () => {
                      const newTheme: ThemeConfig = {
                        ...theme,
                        showLogo: theme.showLogo === false ? true : false,
                      };
                      await api.updateSources({ theme: newTheme });
                      onThemeChanged(newTheme);
                    }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        theme.showLogo !== false ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  File Browser
                </h3>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                  <span className="text-[13px] text-primary flex-1 font-medium">
                    Show Hidden Files
                  </span>
                  <button
                    className={`w-9 h-5 rounded-full transition-all relative ${
                      showHiddenFiles
                        ? "bg-accent"
                        : "bg-elevated border border-border-subtle"
                    }`}
                    onClick={async () => {
                      const next = !showHiddenFiles;
                      await api.updateSources({ showHiddenFiles: next });
                      onShowHiddenFilesChanged(next);
                    }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        showHiddenFiles ? "left-[18px]" : "left-0.5"
                      }`}
                    />
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

              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  PeepHub
                </h3>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                  <div className="flex-1">
                    <span className="text-[13px] text-primary font-medium">
                      API Key
                    </span>
                    <p className="text-[10px] text-tertiary mt-0.5">
                      Get yours at peephub.taiso.ai/dashboard
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={showApiKey ? "text" : "password"}
                      className="w-52 bg-elevated border border-border-subtle rounded-lg px-2.5 py-1.5 text-[12px] text-primary font-mono outline-none focus:border-accent/50 transition-colors"
                      value={peephubApiKey}
                      onChange={(e) => onPeephubApiKeyChanged(e.target.value)}
                      onBlur={async () => {
                        await api.updateSources({ peephub: { url: peephubUrl, apiKey: peephubApiKey } });
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await api.updateSources({ peephub: { url: peephubUrl, apiKey: peephubApiKey } });
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Paste API key"
                    />
                    <button
                      className="w-7 h-7 flex items-center justify-center text-tertiary hover:text-primary rounded-lg hover:bg-hover transition-all"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? "Hide" : "Show"}
                    >
                      {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                  Developer
                </h3>
                <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                  <span className="text-[13px] text-primary flex-1 font-medium">
                    Dev Mode
                  </span>
                  <button
                    className={`w-9 h-5 rounded-full transition-all relative ${
                      devMode
                        ? "bg-accent"
                        : "bg-elevated border border-border-subtle"
                    }`}
                    onClick={async () => {
                      const next = !devMode;
                      await api.updateSources({ devMode: next });
                      onDevModeChanged(next);
                    }}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        devMode ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                {devMode && (
                  <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3 mt-2">
                    <span className="text-[13px] text-primary flex-1 font-medium">
                      PeepHub URL
                    </span>
                    <input
                      className="w-64 bg-elevated border border-border-subtle rounded-lg px-2.5 py-1.5 text-[12px] text-primary font-mono outline-none focus:border-accent/50 transition-colors"
                      value={peephubUrl}
                      onChange={(e) => onPeephubUrlChanged(e.target.value)}
                      onBlur={async () => {
                        await api.updateSources({ peephub: { url: peephubUrl, apiKey: peephubApiKey } });
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await api.updateSources({ peephub: { url: peephubUrl, apiKey: peephubApiKey } });
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="https://peephub.taiso.ai"
                    />
                  </div>
                )}
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
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {ACCENT_COLORS.map((ac) => (
                            <button
                              key={ac.name}
                              className={`w-5 h-5 rounded-full transition-all ${
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
                                <X size={10} />
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
                        <div className="space-y-0.5">
                          {space.statuses.map((status, si) => (
                            <div
                              key={status}
                              draggable
                              onDragStart={(e) => {
                                setDragStatus({ spaceIndex: i, statusIndex: si });
                                e.dataTransfer.effectAllowed = "move";
                                if (e.currentTarget instanceof HTMLElement) {
                                  e.currentTarget.style.opacity = "0.4";
                                }
                              }}
                              onDragEnd={(e) => {
                                if (e.currentTarget instanceof HTMLElement) {
                                  e.currentTarget.style.opacity = "1";
                                }
                                setDragStatus(null);
                                setDragOverIndex(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                if (dragOverIndex !== si) setDragOverIndex(si);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (dragStatus && dragStatus.spaceIndex === i && dragStatus.statusIndex !== si) {
                                  const updated = [...spaces];
                                  const statuses = [...updated[i].statuses];
                                  const [moved] = statuses.splice(dragStatus.statusIndex, 1);
                                  statuses.splice(si, 0, moved);
                                  updated[i] = { ...updated[i], statuses };
                                  setSpaces(updated);
                                  setDirty(true);
                                }
                                setDragStatus(null);
                                setDragOverIndex(null);
                              }}
                              className={`flex items-center gap-2 text-[11px] text-secondary px-2.5 py-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing group ${
                                dragStatus && dragOverIndex === si && dragStatus.statusIndex !== si
                                  ? "border-accent/50 bg-accent/8"
                                  : "bg-elevated border-border-subtle"
                              }`}
                            >
                              {/* Drag handle */}
                              <GripVertical size={10} className="text-tertiary shrink-0" />
                              <span className="flex-1">{status}</span>
                              <button
                                className="text-tertiary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => removeStatus(i, si)}
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                          {addingStatusFor === i && (
                            <input
                              ref={newStatusRef}
                              type="text"
                              value={newStatusName}
                              onChange={(e) => setNewStatusName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitAddStatus();
                                if (e.key === "Escape") { setAddingStatusFor(null); setNewStatusName(""); }
                              }}
                              onBlur={commitAddStatus}
                              placeholder="Column name"
                              className="bg-input text-[11px] text-primary px-2 py-1 rounded-lg border border-accent outline-none w-28"
                            />
                          )}
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
