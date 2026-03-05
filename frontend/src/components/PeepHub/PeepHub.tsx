import { useState, useEffect, useRef, useCallback } from "react";
import { api, PeepManifest, PeepHubEntry } from "@/utils/api";
import { X, Package, Search, Download, AlertCircle, Loader2, Upload, Check, ChevronDown, Eye, FileText } from "lucide-react";

const CATEGORIES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "tool", label: "Tool" },
  { value: "bundle", label: "Bundle" },
];

interface PeepHubProps {
  open: boolean;
  onClose: () => void;
}

export default function PeepHub({ open, onClose }: PeepHubProps) {
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [tab, setTab] = useState<"installed" | "browse">("installed");

  // Browse state
  const [hubPeeps, setHubPeeps] = useState<PeepHubEntry[]>([]);
  const [hubTotal, setHubTotal] = useState(0);
  const [hubLoading, setHubLoading] = useState(false);
  const [hubError, setHubError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Install state
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [installError, setInstallError] = useState("");

  // Publish modal state
  const [publishPeep, setPublishPeep] = useState<PeepManifest | null>(null);
  const [publishCategory, setPublishCategory] = useState("viewer");
  const [publishTags, setPublishTags] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [sampleFiles, setSampleFiles] = useState<{ name: string; content: string | null }[]>([]);
  const [hasScreenshot, setHasScreenshot] = useState(false);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [expandedSample, setExpandedSample] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api.listPeeps().then(({ peeps }) => setPeeps(peeps));
    }
  }, [open]);

  const fetchHub = useCallback(async (q = "") => {
    setHubLoading(true);
    setHubError("");
    try {
      const data = await api.browsePeepHub({ q: q || undefined });
      setHubPeeps(data.peeps);
      setHubTotal(data.total);
    } catch (err) {
      setHubError(err instanceof Error ? err.message : "Failed to connect to PeepHub");
      setHubPeeps([]);
    } finally {
      setHubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "browse") {
      fetchHub(searchQuery);
    }
  }, [open, tab, fetchHub]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchHub(value), 300);
  };

  function openPublishModal(peep: PeepManifest) {
    setPublishPeep(peep);
    setPublishCategory("viewer");
    setPublishTags("");
    setPublishError("");
    setPublishSuccess(false);
    setPublishLoading(false);
    setSampleFiles([]);
    setHasScreenshot(false);
    setExpandedSample(null);

    // Load sample data
    setSamplesLoading(true);
    api.getPeepSamples(peep.id).then((data) => {
      setSampleFiles(data.files);
      setHasScreenshot(data.hasScreenshot);
    }).catch(() => {}).finally(() => setSamplesLoading(false));
  }

  async function handlePublish() {
    if (!publishPeep?._path) return;
    setPublishLoading(true);
    setPublishError("");
    try {
      const tags = publishTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      await api.publishPeep(publishPeep._path, publishCategory, tags);
      setPublishSuccess(true);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishLoading(false);
    }
  }

  function closePublishModal() {
    const wasSuccess = publishSuccess;
    setPublishPeep(null);
    if (wasSuccess) {
      setTab("browse");
      fetchHub("");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-glass border border-border radius w-[580px] max-h-[75vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
        {/* Header */}
        <div className="flex items-center px-5 py-3.5 border-b border-border">
          <img src="/peep-icon.png" alt="" className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Peeps</span>
          <div className="flex ml-3 h-7 bg-surface rounded-lg overflow-hidden border border-border-subtle">
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "installed"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("installed")}
            >
              Installed
            </button>
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "browse"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("browse")}
            >
              Browse
            </button>
          </div>
          <span className="flex-1" />
          <button
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={onClose}
          >
            <X size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "installed" && (
            <div className="space-y-1">
              {peeps.map((peep) => (
                <div
                  key={peep.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-hover transition-colors"
                >
                  <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center border border-border-subtle text-secondary">
                    <Package size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-primary">
                      {peep.name}
                    </div>
                    <div className="text-[11px] text-tertiary mt-0.5">
                      v{peep.version} · {peep.capabilities.join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!peep.builtin && (
                      <button
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 text-accent hover:text-accent-hover bg-accent/10"
                        onClick={() => openPublishModal(peep)}
                      >
                        <Upload size={12} />
                        Publish
                      </button>
                    )}
                    {peep.builtin ? (
                      <span className="text-[10px] text-tertiary bg-surface border border-border-subtle px-2 py-0.5 rounded-full font-medium">
                        Built-in
                      </span>
                    ) : (
                      <button
                        className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                        onClick={async () => {
                          await api.uninstallPeep(peep.id);
                          setPeeps((prev) =>
                            prev.filter((p) => p.id !== peep.id)
                          );
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "browse" && (
            <div className="space-y-2">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary" />
                <input
                  className="w-full bg-elevated border border-border-subtle rounded-lg pl-8 pr-3 py-2 text-[12px] text-primary outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary"
                  placeholder="Search peeps..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Install error */}
              {installError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <span className="text-[11px] text-red-400 flex-1">{installError}</span>
                  <button className="text-[10px] text-red-400 hover:text-red-300" onClick={() => setInstallError("")}>dismiss</button>
                </div>
              )}

              {/* Loading */}
              {hubLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin text-tertiary" />
                </div>
              )}

              {/* Error */}
              {hubError && !hubLoading && (
                <div className="flex items-center gap-2.5 py-8 px-3 justify-center">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-[12px] text-red-400">{hubError}</span>
                </div>
              )}

              {/* Results */}
              {!hubLoading && !hubError && hubPeeps.length > 0 && (
                <div className="space-y-2">
                  {hubPeeps.map((entry) => (
                    <div
                      key={entry.slug}
                      className="rounded-xl border border-border-subtle overflow-hidden hover:border-border transition-colors bg-surface"
                    >
                      {/* Thumbnail */}
                      {entry.thumbnailUrl ? (
                        <div className="w-full relative overflow-hidden bg-[#1a1a2e] rounded-t-xl" style={{ aspectRatio: "16/9" }}>
                          <img
                            src={entry.thumbnailUrl}
                            alt={`${entry.name} preview`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-elevated flex items-center justify-center">
                          <Package size={28} className="text-tertiary/30" />
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-8 h-8 bg-elevated rounded-lg flex items-center justify-center border border-border-subtle text-secondary overflow-hidden shrink-0">
                          {entry.iconUrl ? (
                            <img src={entry.iconUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-primary">
                            {entry.name}
                          </div>
                          <div className="text-[11px] text-tertiary mt-0.5 truncate">
                            {entry.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-tertiary">
                            <span>{entry.author?.name}</span>
                            <span>v{entry.latestVersion}</span>
                            {entry.totalDownloads > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Download size={9} />
                                {entry.totalDownloads.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const local = peeps.find((p) => p.id === entry.slug);
                          const isInstalling = installingSlug === entry.slug;
                          if (local && local.version === entry.latestVersion) {
                            return (
                              <span className="text-[11px] text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 rounded-lg shrink-0 flex items-center gap-1">
                                <Check size={11} />
                                Installed
                              </span>
                            );
                          }
                          if (local) {
                            return (
                              <button
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium px-2.5 py-1 bg-amber-500/10 rounded-lg transition-colors shrink-0 flex items-center gap-1 disabled:opacity-50"
                                disabled={isInstalling}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setInstallingSlug(entry.slug);
                                  setInstallError("");
                                  try {
                                    await api.installPeep(entry.slug);
                                    const { peeps: updated } = await api.listPeeps();
                                    setPeeps(updated);
                                  } catch (err) {
                                    setInstallError(err instanceof Error ? err.message : "Update failed");
                                  } finally {
                                    setInstallingSlug(null);
                                  }
                                }}
                              >
                                {isInstalling ? <Loader2 size={11} className="animate-spin" /> : null}
                                {isInstalling ? "Updating..." : "Update"}
                              </button>
                            );
                          }
                          return (
                            <button
                              className="text-[11px] text-accent hover:text-accent-hover font-medium px-2.5 py-1 bg-accent/10 rounded-lg transition-colors shrink-0 flex items-center gap-1 disabled:opacity-50"
                              disabled={isInstalling}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setInstallingSlug(entry.slug);
                                setInstallError("");
                                try {
                                  await api.installPeep(entry.slug);
                                  const { peeps: updated } = await api.listPeeps();
                                  setPeeps(updated);
                                } catch (err) {
                                  setInstallError(err instanceof Error ? err.message : "Install failed");
                                } finally {
                                  setInstallingSlug(null);
                                }
                              }}
                            >
                              {isInstalling ? <Loader2 size={11} className="animate-spin" /> : null}
                              {isInstalling ? "Installing..." : "Install"}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                  {hubTotal > hubPeeps.length && (
                    <div className="text-center py-2">
                      <span className="text-[10px] text-tertiary">
                        Showing {hubPeeps.length} of {hubTotal} peeps
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Empty */}
              {!hubLoading && !hubError && hubPeeps.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center">
                    <img
                      src="/peep-icon.png"
                      alt=""
                      className="w-10 h-10 mx-auto mb-2.5 opacity-20"
                    />
                    <p className="text-[13px] text-secondary font-medium">
                      {searchQuery ? "No peeps found" : "No peeps on PeepHub yet"}
                    </p>
                    <p className="text-[11px] text-tertiary mt-1">
                      {searchQuery ? "Try a different search" : "Be the first to publish!"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {publishPeep && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !publishLoading && closePublishModal()}
        >
          <div className="modal-glass border border-border radius w-[520px] max-h-[80vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
            {/* Header */}
            <div className="flex items-center px-5 py-3.5 border-b border-border">
              <Upload size={14} className="text-accent mr-2" />
              <span className="text-sm font-semibold">Publish to PeepHub</span>
              <span className="flex-1" />
              <button
                className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
                onClick={closePublishModal}
                disabled={publishLoading}
              >
                <X size={12} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Success state */}
              {publishSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-[14px] font-semibold text-primary">Published!</p>
                  <p className="text-[12px] text-tertiary mt-1">
                    {publishPeep.name} v{publishPeep.version} is now live on PeepHub.
                  </p>
                  <button
                    className="mt-4 h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black rounded-lg transition-all"
                    onClick={closePublishModal}
                  >
                    View in Browse
                  </button>
                </div>
              ) : (
                <>
                  {/* Peep info */}
                  <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                    <div className="w-10 h-10 bg-elevated rounded-lg flex items-center justify-center border border-border-subtle text-secondary">
                      <Package size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-primary">{publishPeep.name}</div>
                      <div className="text-[11px] text-tertiary mt-0.5">
                        {publishPeep.id} · v{publishPeep.version}
                      </div>
                      <div className="text-[11px] text-tertiary truncate">{publishPeep.description}</div>
                    </div>
                  </div>

                  {/* Public Preview */}
                  <div>
                    <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Eye size={10} />
                      Public Preview
                    </label>
                    <p className="text-[10px] text-tertiary mt-0.5 mb-2">
                      This is what users will see on PeepHub. Review before publishing.
                    </p>
                    {/* Live iframe preview */}
                    {publishPeep && (
                      <div className="relative w-full overflow-hidden bg-[#1a1a2e] rounded-lg border border-border-subtle" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          src={`${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/peeps/${publishPeep.id}/index.html`}
                          sandbox="allow-scripts allow-same-origin"
                          className="absolute top-0 left-0 border-0 pointer-events-none"
                          style={{
                            width: "1280px",
                            height: "720px",
                            transformOrigin: "top left",
                          }}
                          title="Publish preview"
                          ref={(el) => {
                            if (!el || !el.parentElement) return;
                            const scale = el.parentElement.clientWidth / 1280;
                            el.style.transform = `scale(${scale})`;
                            // Send theme + sample data when loaded
                            el.onload = () => {
                              const theme = {
                                "--bg-app": "#1a1a2e", "--bg-toolbar": "#16213e", "--bg-surface": "#1a1a2e",
                                "--bg-elevated": "#222244", "--bg-hover": "#2a2a4a", "--border": "#333366",
                                "--border-subtle": "#2a2a4a", "--text-primary": "#e0e0e0", "--text-secondary": "#b0b0c0",
                                "--text-tertiary": "#707090", "--accent": "#7c3aed", "--accent-hover": "#6d28d9",
                              };
                              el.contentWindow?.postMessage({ type: "peep:theme", theme }, "*");
                              // Send first sample file as init data
                              const sample = sampleFiles.find((f) => f.content);
                              if (sample?.content) {
                                el.contentWindow?.postMessage({
                                  type: "peep:init",
                                  filePath: `/preview/${sample.name}`,
                                  content: sample.content,
                                  fileName: sample.name,
                                  ext: sample.name.split(".").pop() || "json",
                                  binary: false,
                                  apiBase: "",
                                }, "*");
                              }
                            };
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Sample Data Files */}
                  {samplesLoading ? (
                    <div className="flex items-center gap-2 text-[11px] text-tertiary">
                      <Loader2 size={11} className="animate-spin" /> Loading sample data...
                    </div>
                  ) : sampleFiles.length > 0 ? (
                    <div>
                      <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold flex items-center gap-1">
                        <FileText size={10} />
                        Sample Data ({sampleFiles.length} file{sampleFiles.length > 1 ? "s" : ""})
                        {hasScreenshot && " + screenshot"}
                      </label>
                      <p className="text-[10px] text-tertiary mt-0.5 mb-1.5">
                        These files will be publicly visible on PeepHub.
                      </p>
                      <div className="space-y-1">
                        {sampleFiles.map((f) => (
                          <div key={f.name} className="bg-elevated border border-border-subtle rounded-lg overflow-hidden">
                            <button
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-hover transition-colors"
                              onClick={() => setExpandedSample(expandedSample === f.name ? null : f.name)}
                            >
                              <FileText size={11} className="text-tertiary shrink-0" />
                              <span className="text-[11px] text-primary flex-1 truncate">{f.name}</span>
                              <ChevronDown size={10} className={`text-tertiary transition-transform ${expandedSample === f.name ? "rotate-180" : ""}`} />
                            </button>
                            {expandedSample === f.name && f.content && (
                              <pre className="text-[10px] text-secondary px-2.5 py-2 border-t border-border-subtle bg-surface max-h-32 overflow-auto font-mono leading-relaxed">
                                {f.content}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-tertiary bg-elevated/50 border border-border-subtle rounded-lg p-2.5 flex items-start gap-2">
                      <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>No sample data found in <code className="text-[10px] bg-surface px-1 rounded">samples/</code> folder. The preview on PeepHub will be empty.</span>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                      Category
                    </label>
                    <div className="relative mt-1">
                      <select
                        className="w-full appearance-none bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-[12px] text-primary outline-none focus:border-accent/50 transition-colors cursor-pointer"
                        value={publishCategory}
                        onChange={(e) => setPublishCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                      Tags
                    </label>
                    <input
                      className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-[12px] text-primary mt-1 outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary"
                      placeholder="youtube, poll, community (comma separated)"
                      value={publishTags}
                      onChange={(e) => setPublishTags(e.target.value)}
                    />
                  </div>

                  {/* Error */}
                  {publishError && (
                    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-red-400 leading-relaxed">{publishError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      className="h-8 px-3 text-[12px] font-medium text-secondary hover:text-primary rounded-lg hover:bg-hover transition-all"
                      onClick={closePublishModal}
                      disabled={publishLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                      onClick={handlePublish}
                      disabled={publishLoading}
                    >
                      {publishLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Upload size={12} />
                          Publish
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
