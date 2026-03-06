import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { api, PeepManifest, PeepHubEntry, PeepHubDetailResponse } from "@/utils/api";
import { X, Package, Search, Download, AlertCircle, Loader2, Upload, Check, ChevronDown, Eye, FileText, ArrowLeft, ExternalLink, Clock } from "lucide-react";

const CATEGORIES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "tool", label: "Tool" },
  { value: "bundle", label: "Bundle" },
];

const CAPABILITY_FILTERS = ["view", "edit", "tool"] as const;
const TIER_FILTERS = ["builtin", "installed", "project"] as const;

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

  // Filters
  const [capabilityFilter, setCapabilityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [installedSort, setInstalledSort] = useState<"name" | "tier">("name");
  const [browseSort, setBrowseSort] = useState<"downloads" | "newest" | "name">("downloads");

  // Install state
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [installError, setInstallError] = useState("");

  // Detail view state (browse tab)
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<PeepHubDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Installed detail view state
  const [installedDetailId, setInstalledDetailId] = useState<string | null>(null);
  const [installedHubData, setInstalledHubData] = useState<PeepHubDetailResponse | null>(null);
  const [installedHubLoading, setInstalledHubLoading] = useState(false);
  const [installedSamples, setInstalledSamples] = useState<{ name: string; content: string | null; binary?: boolean; path?: string }[]>([]);
  const [installedHasScreenshot, setInstalledHasScreenshot] = useState(false);
  const [installedSamplesLoading, setInstalledSamplesLoading] = useState(false);

  // Publish modal state
  const [publishPeep, setPublishPeep] = useState<PeepManifest | null>(null);
  const [publishCategory, setPublishCategory] = useState("viewer");
  const [publishTags, setPublishTags] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [sampleFiles, setSampleFiles] = useState<{ name: string; content: string | null; binary?: boolean; path?: string }[]>([]);
  const [hasScreenshot, setHasScreenshot] = useState(false);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [expandedSample, setExpandedSample] = useState<string | null>(null);

  // Confirm remove
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Installed search
  const [installedSearch, setInstalledSearch] = useState("");

  useEffect(() => {
    if (open) {
      api.listPeeps().then(({ peeps }) => setPeeps(peeps));
    }
  }, [open]);

  const fetchHub = useCallback(async (q = "") => {
    setHubLoading(true);
    setHubError("");
    try {
      const data = await api.browsePeepHub({
        q: q || undefined,
        category: categoryFilter || undefined,
        sort: browseSort,
      });
      setHubPeeps(data.peeps);
      setHubTotal(data.total);
    } catch (err) {
      setHubError(err instanceof Error ? err.message : "Failed to connect to PeepHub");
      setHubPeeps([]);
    } finally {
      setHubLoading(false);
    }
  }, [categoryFilter, browseSort]);

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

  // Filtered + sorted installed peeps
  const filteredPeeps = useMemo(() => {
    let list = [...peeps];
    if (installedSearch) {
      const q = installedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }
    if (capabilityFilter) {
      list = list.filter((p) => p.capabilities.includes(capabilityFilter));
    }
    if (tierFilter) {
      list = list.filter((p) => {
        if (tierFilter === "builtin") return p.builtin;
        if (tierFilter === "installed") return !p.builtin && p._tier !== "project";
        if (tierFilter === "project") return p._tier === "project";
        return true;
      });
    }
    if (installedSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (installedSort === "tier") {
      const order = { builtin: 0, project: 1, installed: 2 };
      list.sort((a, b) => {
        const ta = a.builtin ? "builtin" : (a._tier || "installed");
        const tb = b.builtin ? "builtin" : (b._tier || "installed");
        return (order[ta as keyof typeof order] ?? 3) - (order[tb as keyof typeof order] ?? 3);
      });
    }
    return list;
  }, [peeps, installedSearch, capabilityFilter, tierFilter, installedSort]);

  async function openDetail(slug: string) {
    setDetailSlug(slug);
    setDetailLoading(true);
    setDetailError("");
    setDetailData(null);
    try {
      const data = await api.getPeepHubDetail(slug);
      setDetailData(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load peep details");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailSlug(null);
    setDetailData(null);
    setDetailError("");
  }

  function openInstalledDetail(peepId: string) {
    setInstalledDetailId(peepId);
    setInstalledHubData(null);
    setInstalledSamples([]);
    setInstalledHasScreenshot(false);

    // Fetch samples for live preview
    setInstalledSamplesLoading(true);
    api.getPeepSamples(peepId)
      .then((data) => {
        setInstalledSamples(data.files);
        setInstalledHasScreenshot(data.hasScreenshot);
      })
      .catch(() => {})
      .finally(() => setInstalledSamplesLoading(false));

    // Try to fetch PeepHub data (may not exist)
    setInstalledHubLoading(true);
    api.getPeepHubDetail(peepId)
      .then((data) => setInstalledHubData(data))
      .catch(() => {}) // Silently fail — peep may not be published
      .finally(() => setInstalledHubLoading(false));
  }

  function closeInstalledDetail() {
    setInstalledDetailId(null);
    setInstalledHubData(null);
    setInstalledSamples([]);
  }

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

  const tierLabel = (t: string) =>
    t === "builtin" ? "Built-in" : t === "installed" ? "Installed" : t === "project" ? "Project" : t;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-glass border border-border radius w-[960px] h-[85vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
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

        {/* Body: sidebar + main */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — uses sidebar-glass for proper macOS vibrancy */}
          <div className="w-[180px] shrink-0 sidebar-glass border-r border-border-subtle p-4 overflow-y-auto">
            {tab === "installed" ? (
              <>
                <div className="mb-5">
                  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                    Capability
                  </h3>
                  <SidebarRadio
                    value={capabilityFilter}
                    onChange={setCapabilityFilter}
                    options={[
                      { value: null, label: "All" },
                      ...CAPABILITY_FILTERS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
                    ]}
                  />
                </div>
                <div className="mb-5">
                  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                    Tier
                  </h3>
                  <SidebarRadio
                    value={tierFilter}
                    onChange={setTierFilter}
                    options={[
                      { value: null, label: "All" },
                      ...TIER_FILTERS.map((t) => ({ value: t, label: tierLabel(t) })),
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                    Sort
                  </h3>
                  <SidebarRadio
                    value={installedSort}
                    onChange={(v) => setInstalledSort(v as "name" | "tier")}
                    options={[
                      { value: "name", label: "Name" },
                      { value: "tier", label: "Tier" },
                    ]}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                    Category
                  </h3>
                  <SidebarRadio
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={[
                      { value: null, label: "All" },
                      ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
                    Sort
                  </h3>
                  <SidebarRadio
                    value={browseSort}
                    onChange={(v) => setBrowseSort(v as "downloads" | "newest" | "name")}
                    options={[
                      { value: "downloads", label: "Downloads" },
                      { value: "newest", label: "Newest" },
                      { value: "name", label: "Name" },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search bar — hidden on detail views */}
            {!installedDetailId && !detailSlug && (
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                <input
                  className="w-full bg-input border border-border-subtle radius-sm pl-9 pr-3 py-2 text-[13px] text-primary outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary"
                  placeholder="Search peeps..."
                  value={tab === "installed" ? installedSearch : searchQuery}
                  onChange={(e) =>
                    tab === "installed"
                      ? setInstalledSearch(e.target.value)
                      : handleSearch(e.target.value)
                  }
                />
              </div>
              {/* Paste-to-install on Browse tab */}
              {tab === "browse" && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-tertiary whitespace-nowrap">Install by ID:</span>
                  <input
                    className="flex-1 bg-input border border-border-subtle radius-sm px-2.5 py-1 text-[12px] text-primary outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary font-mono"
                    placeholder="Paste peep slug..."
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const slug = (e.target as HTMLInputElement).value.trim();
                        if (!slug) return;
                        setInstallingSlug(slug);
                        setInstallError("");
                        try {
                          await api.installPeep(slug);
                          const { peeps: updated } = await api.listPeeps();
                          setPeeps(updated);
                          (e.target as HTMLInputElement).value = "";
                        } catch (err) {
                          setInstallError(err instanceof Error ? err.message : "Install failed");
                        } finally {
                          setInstallingSlug(null);
                        }
                      }
                    }}
                  />
                  {installingSlug && <Loader2 size={12} className="animate-spin text-accent" />}
                </div>
              )}
            </div>
            )}

            {/* Scrollable grid area */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {tab === "installed" && installedDetailId && (
                <InstalledDetailView
                  peep={peeps.find((p) => p.id === installedDetailId) || null}
                  hubData={installedHubData}
                  hubLoading={installedHubLoading}
                  samples={installedSamples}
                  samplesLoading={installedSamplesLoading}
                  hasScreenshot={installedHasScreenshot}
                  onBack={closeInstalledDetail}
                  onPublish={(p) => { closeInstalledDetail(); openPublishModal(p); }}
                  onRemove={async (id) => {
                    await api.uninstallPeep(id);
                    setPeeps((prev) => prev.filter((p) => p.id !== id));
                    closeInstalledDetail();
                  }}
                  onPriorityChange={async (id, priority) => {
                    await api.updatePeepPriority(id, priority);
                    setPeeps((prev) => prev.map((p) => p.id === id ? { ...p, priority } : p));
                  }}
                />
              )}

              {tab === "installed" && !installedDetailId && (
                <>
                  {filteredPeeps.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredPeeps.map((peep) => (
                        <div
                          key={peep.id}
                          className="card-glass flex flex-col p-3.5 transition-all cursor-pointer"
                          onClick={() => openInstalledDetail(peep.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-surface radius-xs flex items-center justify-center border border-border-subtle text-secondary shrink-0">
                              <Package size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-primary truncate">
                                {peep.name}
                              </div>
                              <div className="text-[11px] text-secondary mt-0.5 truncate">
                                {peep.description}
                              </div>
                            </div>
                          </div>
                          {/* Meta row */}
                          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                            <span className="text-[11px] text-tertiary bg-surface border border-border-subtle px-2 py-0.5 radius-xs font-medium">
                              v{peep.version}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 radius-xs font-medium ${
                              peep.builtin
                                ? "text-tertiary bg-surface border border-border-subtle"
                                : peep._tier === "project"
                                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                : "text-accent bg-accent/10 border border-accent/20"
                            }`}>
                              {peep.builtin ? "Built-in" : peep._tier === "project" ? "Project" : "Installed"}
                            </span>
                            {peep.capabilities.map((cap) => (
                              <span key={cap} className="text-[11px] text-secondary bg-surface border border-border-subtle px-2 py-0.5 radius-xs">
                                {cap}
                              </span>
                            ))}
                          </div>
                          {/* Actions row */}
                          {!peep.builtin && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                              <button
                                className="h-7 px-3 text-[11px] font-semibold radius-xs transition-all flex items-center gap-1.5 text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/15"
                                onClick={(e) => { e.stopPropagation(); openPublishModal(peep); }}
                              >
                                <Upload size={12} />
                                Publish
                              </button>
                              <span className="flex-1" />
                              {confirmRemoveId === peep.id ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-red-400 font-medium">Remove?</span>
                                  <button
                                    className="h-7 px-2.5 text-[11px] text-red-400 hover:text-red-300 font-semibold radius-xs bg-red-500/15 hover:bg-red-500/20 transition-all"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await api.uninstallPeep(peep.id);
                                      setPeeps((prev) =>
                                        prev.filter((p) => p.id !== peep.id)
                                      );
                                      setConfirmRemoveId(null);
                                    }}
                                  >
                                    Yes, Remove
                                  </button>
                                  <button
                                    className="h-7 px-2.5 text-[11px] text-secondary hover:text-primary font-medium radius-xs hover:bg-hover transition-all"
                                    onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(null); }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="h-7 px-3 text-[11px] text-red-400 hover:text-red-300 font-medium radius-xs bg-red-500/10 hover:bg-red-500/15 transition-all"
                                  onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(peep.id); }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <img src="/peep-icon.png" alt="" className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-[13px] text-secondary font-medium">
                          {installedSearch ? "No matching peeps" : "No peeps installed"}
                        </p>
                        <p className="text-[11px] text-tertiary mt-1">
                          {installedSearch ? "Try a different search" : "Browse PeepHub to install peeps"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "browse" && detailSlug && (
                <DetailView
                  detailData={detailData}
                  detailLoading={detailLoading}
                  detailError={detailError}
                  peeps={peeps}
                  installingSlug={installingSlug}
                  onBack={closeDetail}
                  onInstall={async (slug) => {
                    setInstallingSlug(slug);
                    setInstallError("");
                    try {
                      await api.installPeep(slug);
                      const { peeps: updated } = await api.listPeeps();
                      setPeeps(updated);
                    } catch (err) {
                      setInstallError(err instanceof Error ? err.message : "Install failed");
                    } finally {
                      setInstallingSlug(null);
                    }
                  }}
                />
              )}

              {tab === "browse" && !detailSlug && (
                <>
                  {/* Install error */}
                  {installError && (
                    <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 radius-sm p-3 mb-3">
                      <AlertCircle size={14} className="text-red-400 shrink-0" />
                      <span className="text-[12px] text-red-400 flex-1">{installError}</span>
                      <button className="text-[11px] text-red-400 hover:text-red-300 font-medium" onClick={() => setInstallError("")}>dismiss</button>
                    </div>
                  )}

                  {/* Loading */}
                  {hubLoading && (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 size={20} className="animate-spin text-tertiary" />
                    </div>
                  )}

                  {/* Error */}
                  {hubError && !hubLoading && (
                    <div className="flex items-center gap-3 py-12 px-4 justify-center">
                      <AlertCircle size={16} className="text-red-400 shrink-0" />
                      <span className="text-[13px] text-red-400">{hubError}</span>
                    </div>
                  )}

                  {/* Results grid */}
                  {!hubLoading && !hubError && hubPeeps.length > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {hubPeeps.map((entry) => (
                          <div
                            key={entry.slug}
                            className="card-glass overflow-hidden flex flex-col transition-all cursor-pointer"
                            onClick={() => openDetail(entry.slug)}
                          >
                            {/* Thumbnail — 16:9 matching PeepHub */}
                            {entry.thumbnailUrl ? (
                              <div className="w-full relative overflow-hidden bg-surface" style={{ aspectRatio: "16/9" }}>
                                <img
                                  src={entry.thumbnailUrl}
                                  alt={`${entry.name} preview`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="w-full bg-elevated flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
                                <img src="/peep-icon.png" alt="" className="w-8 h-8 opacity-15" />
                              </div>
                            )}
                            {/* Info */}
                            <div className="p-3.5 flex-1 flex flex-col">
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 radius-xs bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                                  {entry.iconUrl ? (
                                    <img src={entry.iconUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <img src="/peep-icon.png" alt="" className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-semibold text-primary truncate">
                                    {entry.name}
                                  </div>
                                  <div className="text-[11px] text-secondary mt-0.5 line-clamp-1">
                                    {entry.description}
                                  </div>
                                  <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-tertiary">
                                    {entry.author?.name && <span>{entry.author.name}</span>}
                                    {entry.totalDownloads > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Download size={10} />
                                        {entry.totalDownloads.toLocaleString()}
                                      </span>
                                    )}
                                    <span>v{entry.latestVersion}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Action button */}
                              <div className="flex items-center justify-end mt-3 pt-3 border-t border-border-subtle">
                                <BrowseActionButton
                                  entry={entry}
                                  peeps={peeps}
                                  installingSlug={installingSlug}
                                  onInstall={async (slug) => {
                                    setInstallingSlug(slug);
                                    setInstallError("");
                                    try {
                                      await api.installPeep(slug);
                                      const { peeps: updated } = await api.listPeeps();
                                      setPeeps(updated);
                                    } catch (err) {
                                      setInstallError(err instanceof Error ? err.message : "Install failed");
                                    } finally {
                                      setInstallingSlug(null);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {hubTotal > hubPeeps.length && (
                        <div className="text-center py-3 mt-2">
                          <span className="text-[11px] text-tertiary">
                            Showing {hubPeeps.length} of {hubTotal} peeps
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Empty */}
                  {!hubLoading && !hubError && hubPeeps.length === 0 && (
                    <div className="flex items-center justify-center py-16">
                      <div className="text-center">
                        <img
                          src="/peep-icon.png"
                          alt=""
                          className="w-10 h-10 mx-auto mb-3 opacity-20"
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
                </>
              )}
            </div>
          </div>
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
                    className="mt-4 h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black radius-sm transition-all"
                    onClick={closePublishModal}
                  >
                    View in Browse
                  </button>
                </div>
              ) : (
                <>
                  {/* Peep info */}
                  <div className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl p-3">
                    <div className="w-10 h-10 bg-elevated radius-sm flex items-center justify-center border border-border-subtle text-secondary">
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
                    <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Eye size={11} />
                      Public Preview
                    </h3>
                    <p className="text-[11px] text-tertiary mb-2">
                      This is what users will see on PeepHub. Review before publishing.
                    </p>
                    {publishPeep && (
                      <div className="relative w-full overflow-hidden bg-surface radius-sm border border-border-subtle" style={{ paddingBottom: "56.25%" }}>
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
                            el.onload = () => {
                              const theme = {
                                "--bg-app": "#1a1a2e", "--bg-toolbar": "#16213e", "--bg-surface": "#1a1a2e",
                                "--bg-elevated": "#222244", "--bg-hover": "#2a2a4a", "--border": "#333366",
                                "--border-subtle": "#2a2a4a", "--text-primary": "#e0e0e0", "--text-secondary": "#b0b0c0",
                                "--text-tertiary": "#707090", "--accent": "#7c3aed", "--accent-hover": "#6d28d9",
                              };
                              el.contentWindow?.postMessage({ type: "peep:theme", theme }, "*");
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
                      <Loader2 size={12} className="animate-spin" /> Loading sample data...
                    </div>
                  ) : sampleFiles.length > 0 ? (
                    <div>
                      <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider flex items-center gap-1 mb-1">
                        <FileText size={11} />
                        Sample Data ({sampleFiles.length} file{sampleFiles.length > 1 ? "s" : ""})
                        {hasScreenshot && " + screenshot"}
                      </h3>
                      <p className="text-[11px] text-tertiary mb-2">
                        These files will be publicly visible on PeepHub.
                      </p>
                      <div className="space-y-1.5">
                        {sampleFiles.map((f) => (
                          <div key={f.name} className="bg-elevated border border-border-subtle radius-xs overflow-hidden">
                            <button
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover transition-colors"
                              onClick={() => setExpandedSample(expandedSample === f.name ? null : f.name)}
                            >
                              <FileText size={12} className="text-tertiary shrink-0" />
                              <span className="text-[12px] text-primary flex-1 truncate">{f.name}</span>
                              <ChevronDown size={11} className={`text-tertiary transition-transform ${expandedSample === f.name ? "rotate-180" : ""}`} />
                            </button>
                            {expandedSample === f.name && f.content && (
                              <pre className="text-[11px] text-secondary px-3 py-2 border-t border-border-subtle bg-surface max-h-32 overflow-auto font-mono leading-relaxed">
                                {f.content}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-tertiary bg-elevated/50 border border-border-subtle radius-sm p-3 flex items-start gap-2.5">
                      <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>No sample data found in <code className="text-[11px] bg-surface px-1 radius-xs">samples/</code> folder. The preview on PeepHub will be empty.</span>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-1">
                      Category
                    </h3>
                    <div className="relative mt-1">
                      <select
                        className="w-full appearance-none bg-input border border-border-subtle radius-sm px-3 py-2 text-[13px] text-primary outline-none focus:border-accent/50 transition-colors cursor-pointer"
                        value={publishCategory}
                        onChange={(e) => setPublishCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-1">
                      Tags
                    </h3>
                    <input
                      className="w-full bg-input border border-border-subtle radius-sm px-3 py-2 text-[13px] text-primary mt-1 outline-none focus:border-accent/50 transition-colors placeholder:text-tertiary"
                      placeholder="youtube, poll, community (comma separated)"
                      value={publishTags}
                      onChange={(e) => setPublishTags(e.target.value)}
                    />
                  </div>

                  {/* Error */}
                  {publishError && (
                    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 radius-sm p-3">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-red-400 leading-relaxed">{publishError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      className="h-8 px-3 text-[12px] font-medium text-secondary hover:text-primary radius-sm hover:bg-hover transition-all"
                      onClick={closePublishModal}
                      disabled={publishLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black radius-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
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

/** Sidebar radio group — macOS HIG-style list selection */
function SidebarRadio<T extends string | null>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`text-left text-[12px] px-2.5 py-1.5 radius-xs transition-all ${
            value === opt.value
              ? "text-accent bg-accent/10 font-medium"
              : "text-secondary hover:text-primary hover:bg-hover"
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Installed peep detail view — local info + live preview + optional PeepHub data */
function InstalledDetailView({
  peep,
  hubData,
  hubLoading,
  samples,
  samplesLoading,
  hasScreenshot,
  onBack,
  onPublish,
  onRemove,
}: {
  peep: PeepManifest | null;
  hubData: PeepHubDetailResponse | null;
  hubLoading: boolean;
  samples: { name: string; content: string | null; binary?: boolean; path?: string }[];
  samplesLoading: boolean;
  hasScreenshot: boolean;
  onBack: () => void;
  onPublish: (peep: PeepManifest) => void;
  onRemove: (id: string) => void;
  onPriorityChange?: (id: string, priority: number) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  if (!peep) return null;

  const tierLabel = peep.builtin ? "Built-in" : peep._tier === "project" ? "Project" : "Installed";
  const tierClass = peep.builtin
    ? "text-tertiary bg-surface border border-border-subtle"
    : peep._tier === "project"
    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
    : "text-accent bg-accent/10 border border-accent/20";

  // Prefer text sample, but fall back to binary sample (served via URL)
  const firstSample = samples.find((f) => f.content) || samples.find((f) => f.name) || null;

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        className="flex items-center gap-1.5 text-[12px] text-secondary hover:text-primary transition-all mt-2 mb-4"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Back to Installed
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-[52px] h-[52px] radius-sm bg-surface flex items-center justify-center overflow-hidden shrink-0 border border-border-subtle text-secondary">
          <Package size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-primary">{peep.name}</div>
          <div className="text-[11px] text-tertiary mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{peep.author}</span>
            <span className="text-border">·</span>
            <span className={`px-2 py-0.5 radius-xs font-medium ${tierClass}`}>{tierLabel}</span>
          </div>
          <div className="text-[12px] text-secondary mt-1">{peep.description}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {!peep.builtin && (
            <>
              <button
                className="h-8 px-3 text-[12px] font-semibold radius-sm transition-all flex items-center gap-1.5 text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/15"
                onClick={() => onPublish(peep)}
              >
                <Upload size={14} />
                Publish
              </button>
              {confirmRemove ? (
                <div className="flex items-center gap-1.5">
                  <button
                    className="h-8 px-3 text-[12px] text-red-400 hover:text-red-300 font-semibold radius-sm bg-red-500/15 hover:bg-red-500/20 transition-all"
                    onClick={() => onRemove(peep.id)}
                  >
                    Yes, Remove
                  </button>
                  <button
                    className="h-8 px-3 text-[12px] text-secondary hover:text-primary font-medium radius-sm hover:bg-hover transition-all"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="h-8 px-3 text-[12px] text-red-400 hover:text-red-300 font-medium radius-sm bg-red-500/10 hover:bg-red-500/15 transition-all"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live Preview */}
      {samplesLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-tertiary mb-5">
          <Loader2 size={12} className="animate-spin" /> Loading preview...
        </div>
      ) : (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
            Preview
          </h3>
          {firstSample ? (
            <div
              ref={iframeContainerRef}
              className="relative w-full overflow-hidden bg-surface radius-sm border border-border-subtle"
              style={{ aspectRatio: "16/9" }}
            >
              <iframe
                src={`${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/peeps/${peep.id}/index.html`}
                sandbox="allow-scripts allow-same-origin"
                className="absolute top-0 left-0 border-0 opacity-0 transition-opacity duration-200"
                style={{ width: "1280px", height: "720px", transformOrigin: "top left" }}
                title={`${peep.name} preview`}
                ref={(el) => {
                  if (!el || !iframeContainerRef.current) return;
                  const scale = iframeContainerRef.current.clientWidth / 1280;
                  el.style.transform = `scale(${scale})`;
                  // Fade in after scale is applied to prevent flash
                  requestAnimationFrame(() => { el.classList.remove("opacity-0"); });
                }}
                onLoad={(e) => {
                  const iframe = e.currentTarget;
                  const sendInit = () => {
                    const theme = {
                      "--bg-app": "#1a1a2e", "--bg-toolbar": "#16213e", "--bg-surface": "#1a1a2e",
                      "--bg-elevated": "#222244", "--bg-hover": "#2a2a4a", "--border": "#333366",
                      "--border-subtle": "#2a2a4a", "--text-primary": "#e0e0e0", "--text-secondary": "#b0b0c0",
                      "--text-tertiary": "#707090", "--accent": "#7c3aed", "--accent-hover": "#6d28d9",
                    };
                    iframe.contentWindow?.postMessage({ type: "peep:theme", theme }, "*");
                    if (firstSample) {
                      const isBinary = !firstSample.content;
                      iframe.contentWindow?.postMessage({
                        type: "peep:init",
                        filePath: firstSample.path || `/preview/${firstSample.name}`,
                        content: isBinary ? "" : firstSample.content,
                        fileName: firstSample.name,
                        ext: "." + (firstSample.name.split(".").pop() || ""),
                        binary: isBinary,
                        apiBase: "http://localhost:8000",
                      }, "*");
                    }
                  };
                  // Delay to ensure PeepSDK listener is ready
                  setTimeout(sendInit, 100);
                  setTimeout(sendInit, 500);
                }}
              />
            </div>
          ) : (
            <div className="w-full bg-surface radius-sm border border-border-subtle flex flex-col items-center justify-center gap-2 py-12">
              <Package size={32} className="text-tertiary opacity-30" />
              <p className="text-[12px] text-tertiary">No preview available</p>
              <p className="text-[11px] text-tertiary opacity-70">
                Add sample files to <code className="bg-elevated px-1.5 py-0.5 radius-xs text-[11px]">samples/</code> to enable preview
              </p>
            </div>
          )}
        </div>
      )}

      {/* Details */}
      <div className="mb-5">
        <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
          Details
        </h3>
        <div className="bg-surface border border-border-subtle radius-sm p-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-tertiary">Version</div>
            <div className="text-[12px] text-primary font-medium mt-0.5">v{peep.version}</div>
          </div>
          <div>
            <div className="text-[11px] text-tertiary">Priority</div>
            {peep._tier === "builtin" ? (
              <div className="text-[12px] text-primary font-medium mt-0.5">{peep.priority ?? 0}</div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <button
                  className="w-5 h-5 flex items-center justify-center text-[13px] text-secondary hover:text-primary bg-surface hover:bg-hover border border-border-subtle radius-xs transition-all"
                  onClick={() => onPriorityChange?.(peep.id, (peep.priority ?? 0) - 1)}
                >−</button>
                <span className="text-[12px] text-primary font-medium font-mono min-w-[20px] text-center">{peep.priority ?? 0}</span>
                <button
                  className="w-5 h-5 flex items-center justify-center text-[13px] text-secondary hover:text-primary bg-surface hover:bg-hover border border-border-subtle radius-xs transition-all"
                  onClick={() => onPriorityChange?.(peep.id, (peep.priority ?? 0) + 1)}
                >+</button>
              </div>
            )}
          </div>
          <div>
            <div className="text-[11px] text-tertiary">Entry</div>
            <div className="text-[12px] text-primary font-medium mt-0.5 font-mono">{peep.entry}</div>
          </div>
          <div>
            <div className="text-[11px] text-tertiary">Author</div>
            <div className="text-[12px] text-primary font-medium mt-0.5">{peep.author}</div>
          </div>
          {peep.capabilities.length > 0 && (
            <div className="col-span-2">
              <div className="text-[11px] text-tertiary mb-1">Capabilities</div>
              <div className="flex flex-wrap gap-1.5">
                {peep.capabilities.map((cap) => (
                  <span key={cap} className="text-[11px] px-2 py-0.5 radius-xs font-medium text-tertiary bg-elevated border border-border-subtle">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}
          {peep.matches.extensions && peep.matches.extensions.length > 0 && (
            <div className="col-span-2">
              <div className="text-[11px] text-tertiary mb-1">File Extensions</div>
              <div className="flex flex-wrap gap-1.5">
                {peep.matches.extensions.map((ext) => (
                  <span key={ext} className="text-[11px] px-2 py-0.5 radius-xs font-medium text-primary bg-elevated border border-border-subtle font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}
          {peep._path && (
            <div className="col-span-2">
              <div className="text-[11px] text-tertiary">Path</div>
              <div className="text-[11px] text-secondary mt-0.5 font-mono truncate">{peep._path}</div>
            </div>
          )}
        </div>
      </div>

      {/* PeepHub data (if available) */}
      {hubLoading && (
        <div className="flex items-center gap-2 text-[11px] text-tertiary mb-5">
          <Loader2 size={12} className="animate-spin" /> Checking PeepHub...
        </div>
      )}
      {hubData && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
            PeepHub
          </h3>
          <div className="bg-surface border border-border-subtle radius-sm p-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[11px] text-tertiary">Downloads</div>
                <div className="text-[12px] text-primary font-medium mt-0.5 flex items-center gap-1">
                  <Download size={11} />
                  {hubData.peep.totalDownloads.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-tertiary">Latest Version</div>
                <div className="text-[12px] text-primary font-medium mt-0.5">v{hubData.peep.latestVersion}</div>
              </div>
            </div>
            {hubData.versions.length > 0 && (
              <>
                <div className="text-[11px] text-tertiary mb-1.5">Version History</div>
                <div className="space-y-1.5">
                  {hubData.versions.slice(0, 3).map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-[11px]">
                      <span className="font-semibold text-primary">v{v.version}</span>
                      <span className="text-tertiary flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                      {v.changelog && <span className="text-secondary truncate">{v.changelog}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sample files */}
      {samples.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
            Sample Data ({samples.length} file{samples.length > 1 ? "s" : ""})
            {hasScreenshot && " + screenshot"}
          </h3>
          <div className="space-y-1">
            {samples.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-[11px] text-secondary py-1">
                <FileText size={12} className="text-tertiary shrink-0" />
                <span className="font-mono">{f.name}</span>
                {f.binary && <span className="text-tertiary">(binary)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Detail view for a single peep from PeepHub */
function DetailView({
  detailData,
  detailLoading,
  detailError,
  peeps,
  installingSlug,
  onBack,
  onInstall,
}: {
  detailData: PeepHubDetailResponse | null;
  detailLoading: boolean;
  detailError: string;
  peeps: PeepManifest[];
  installingSlug: string | null;
  onBack: () => void;
  onInstall: (slug: string) => void;
}) {
  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-tertiary" />
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="animate-fade-in">
        <button
          className="flex items-center gap-1.5 text-[12px] text-secondary hover:text-primary transition-all mt-2 mb-4"
          onClick={onBack}
        >
          <ArrowLeft size={14} />
          Back to Browse
        </button>
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 radius-sm p-3">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span className="text-[12px] text-red-400">{detailError}</span>
        </div>
      </div>
    );
  }

  if (!detailData) return null;

  const { peep, versions, author } = detailData;
  const screenshotSrc = peep.screenshots?.[0] || peep.screenshotUrl || peep.thumbnailUrl;
  const local = peeps.find((p) => p.id === peep.slug);

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        className="flex items-center gap-1.5 text-[12px] text-secondary hover:text-primary transition-all mt-2 mb-4"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        Back to Browse
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-[52px] h-[52px] radius-sm bg-accent/10 flex items-center justify-center overflow-hidden shrink-0 border border-border-subtle">
          {peep.iconUrl ? (
            <img src={peep.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <img src="/peep-icon.png" alt="" className="w-7 h-7" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-primary">{peep.name}</div>
          <div className="text-[11px] text-tertiary mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>by {author.name}</span>
            <span className="text-border">·</span>
            <span className="capitalize">{peep.category}</span>
          </div>
          <div className="text-[12px] text-secondary mt-1">{peep.description}</div>
        </div>
        <div className="shrink-0">
          {local && local.version === peep.latestVersion ? (
            <span className="h-8 px-4 text-[12px] text-emerald-400 font-semibold bg-emerald-500/10 radius-sm flex items-center gap-1.5">
              <Check size={14} />
              Installed
            </span>
          ) : local ? (
            <button
              className="h-8 px-4 text-[12px] text-amber-400 hover:text-amber-300 font-semibold bg-amber-500/10 hover:bg-amber-500/15 radius-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              disabled={installingSlug === peep.slug}
              onClick={() => onInstall(peep.slug)}
            >
              {installingSlug === peep.slug ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {installingSlug === peep.slug ? "Updating..." : "Update"}
            </button>
          ) : (
            <button
              className="h-8 px-4 text-[12px] font-semibold bg-accent hover:bg-accent-hover text-black radius-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              disabled={installingSlug === peep.slug}
              onClick={() => onInstall(peep.slug)}
            >
              {installingSlug === peep.slug ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {installingSlug === peep.slug ? "Installing..." : "Install"}
            </button>
          )}
        </div>
      </div>

      {/* Screenshot */}
      {screenshotSrc && (
        <div className="w-full radius-sm overflow-hidden border border-border-subtle mb-5" style={{ aspectRatio: "16/9" }}>
          <img
            src={screenshotSrc}
            alt={`${peep.name} screenshot`}
            className="w-full h-full object-cover bg-surface"
          />
        </div>
      )}

      {/* About */}
      {peep.longDescription && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
            About
          </h3>
          <div className="text-[12px] text-secondary leading-relaxed whitespace-pre-wrap">
            {peep.longDescription}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="mb-5">
        <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
          Details
        </h3>
        <div className="bg-surface border border-border-subtle radius-sm p-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-tertiary">Version</div>
            <div className="text-[12px] text-primary font-medium mt-0.5">v{peep.latestVersion}</div>
          </div>
          <div>
            <div className="text-[11px] text-tertiary">Downloads</div>
            <div className="text-[12px] text-primary font-medium mt-0.5 flex items-center gap-1">
              <Download size={11} />
              {peep.totalDownloads.toLocaleString()}
            </div>
          </div>
          {peep.tags.length > 0 && (
            <div className="col-span-2">
              <div className="text-[11px] text-tertiary mb-1">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {peep.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 radius-xs font-medium text-tertiary bg-elevated border border-border-subtle">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(peep.homepageUrl || peep.repositoryUrl) && (
            <div className="col-span-2 flex items-center gap-3">
              {peep.homepageUrl && (
                <a
                  href={peep.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={11} />
                  Homepage
                </a>
              )}
              {peep.repositoryUrl && (
                <a
                  href={peep.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={11} />
                  Repository
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Version History */}
      {versions.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold text-tertiary uppercase tracking-wider mb-2">
            Version History
          </h3>
          <div className="space-y-2">
            {versions.slice(0, 5).map((v) => (
              <div key={v.id} className="bg-surface border border-border-subtle radius-sm p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-primary">v{v.version}</span>
                  <span className="text-[11px] text-tertiary flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                  {v.sizeBytes > 0 && (
                    <span className="text-[11px] text-tertiary">
                      {(v.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
                {v.changelog && (
                  <div className="text-[11px] text-secondary mt-1 leading-relaxed">{v.changelog}</div>
                )}
              </div>
            ))}
            {versions.length > 5 && (
              <div className="text-[11px] text-tertiary text-center py-1">
                + {versions.length - 5} older version{versions.length - 5 > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Browse tab install/update/installed button */
function BrowseActionButton({
  entry,
  peeps,
  installingSlug,
  onInstall,
}: {
  entry: PeepHubEntry;
  peeps: PeepManifest[];
  installingSlug: string | null;
  onInstall: (slug: string) => void;
}) {
  const local = peeps.find((p) => p.id === entry.slug);
  const isInstalling = installingSlug === entry.slug;

  if (local && local.version === entry.latestVersion) {
    return (
      <span className="h-7 px-3 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 radius-xs shrink-0 flex items-center gap-1.5">
        <Check size={12} />
        Installed
      </span>
    );
  }
  if (local) {
    return (
      <button
        className="h-7 px-3 text-[11px] text-amber-400 hover:text-amber-300 font-medium bg-amber-500/10 radius-xs transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
        disabled={isInstalling}
        onClick={(e) => { e.stopPropagation(); onInstall(entry.slug); }}
      >
        {isInstalling ? <Loader2 size={12} className="animate-spin" /> : null}
        {isInstalling ? "Updating..." : "Update"}
      </button>
    );
  }
  return (
    <button
      className="h-7 px-3 text-[11px] text-accent hover:text-accent-hover font-semibold bg-accent/10 radius-xs transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
      disabled={isInstalling}
      onClick={(e) => { e.stopPropagation(); onInstall(entry.slug); }}
    >
      {isInstalling ? <Loader2 size={12} className="animate-spin" /> : null}
      {isInstalling ? "Installing..." : "Install"}
    </button>
  );
}
