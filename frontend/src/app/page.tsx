import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { api, Space, FileData, PeepManifest, ThemeConfig, SessionState } from "@/utils/api";
import { resolvePeep } from "@/utils/peep-resolver";
import SpaceSwitcher from "@/components/SpaceSwitcher/SpaceSwitcher";
import Board from "@/components/Board/Board";
import ProjectGrid from "@/components/Board/ProjectGrid";
import FileTree from "@/components/FileTree/FileTree";
import PreviewPane from "@/components/PreviewPane/PreviewPane";
import PeepHub from "@/components/PeepHub/PeepHub";
import Settings from "@/components/Settings/Settings";
import SettingsButton from "@/components/SettingsButton/SettingsButton";
import { Home as HomeIcon, Copy, FolderOpen } from "lucide-react";

type View = "board" | "browse";

const ACCENT_MAP: Record<string, { color: string; hover: string; soft: string }> = {
  amber:   { color: "#f59e0b", hover: "#fbbf24", soft: "#f59e0b18" },
  orange:  { color: "#f97316", hover: "#fb923c", soft: "#f9731618" },
  red:     { color: "#ef4444", hover: "#f87171", soft: "#ef444418" },
  rose:    { color: "#f43f5e", hover: "#fb7185", soft: "#f43f5e18" },
  pink:    { color: "#ec4899", hover: "#f472b6", soft: "#ec489918" },
  fuchsia: { color: "#d946ef", hover: "#e879f9", soft: "#d946ef18" },
  purple:  { color: "#8b5cf6", hover: "#a78bfa", soft: "#8b5cf618" },
  indigo:  { color: "#6366f1", hover: "#818cf8", soft: "#6366f118" },
  blue:    { color: "#3b82f6", hover: "#60a5fa", soft: "#3b82f618" },
  sky:     { color: "#0ea5e9", hover: "#38bdf8", soft: "#0ea5e918" },
  cyan:    { color: "#06b6d4", hover: "#22d3ee", soft: "#06b6d418" },
  teal:    { color: "#14b8a6", hover: "#2dd4bf", soft: "#14b8a618" },
  emerald: { color: "#10b981", hover: "#34d399", soft: "#10b98118" },
  green:   { color: "#22c55e", hover: "#4ade80", soft: "#22c55e18" },
  lime:    { color: "#84cc16", hover: "#a3e635", soft: "#84cc1618" },
  yellow:  { color: "#eab308", hover: "#facc15", soft: "#eab30818" },
};

function formatBreadcrumb(folderName: string): string {
  const withoutDate = folderName.replace(/^\d{4}-\d{2}-\d{2}_/, "");
  return withoutDate
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [view, setView] = useState<View>("board");
  const [saveStatus, setSaveStatus] = useState("");
  const [peepHubOpen, setPeepHubOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>({ mode: "dark", style: "macos" });
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [devMode, setDevMode] = useState(false);
  const [peephubUrl, setPeephubUrl] = useState("https://peephub.taiso.ai");
  const [peephubApiKey, setPeephubApiKey] = useState("");
  const [sourcesLoaded, setSourcesLoaded] = useState(false);

  // Track which view the user was on before drilling into a project
  const viewBeforeBrowse = useRef<View>("board");

  // Browse mode state
  const [browseRoot, setBrowseRoot] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [activePeep, setActivePeep] = useState<PeepManifest | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const resizing = useRef(false);
  const [breadcrumbMenu, setBreadcrumbMenu] = useState<{ x: number; y: number } | null>(null);
  const [projectInfo, setProjectInfo] = useState<Record<string, unknown> | null>(null);
  const breadcrumbMenuRef = useRef<HTMLDivElement>(null);

  const loadSources = useCallback(async () => {
    const data = await api.getSources();
    setSpaces(data.spaces);
    setTheme(data.theme || { mode: "dark", style: "macos" });
    setShowHiddenFiles(data.showHiddenFiles || false);
    setDevMode(data.devMode || false);
    setPeephubUrl(data.peephub?.url || "https://peephub.taiso.ai");
    setPeephubApiKey(data.peephub?.apiKey || "");
    return data.spaces;
  }, []);

  // Persist session state to server (debounced)
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      api.saveSession({
        view,
        spaceName: activeSpace?.name || null,
        browseRoot,
        selectedPath,
        expandedPaths,
      }).catch(() => {});
    }, 500);
    return () => { if (sessionTimer.current) clearTimeout(sessionTimer.current); };
  }, [view, activeSpace?.name, browseRoot, selectedPath, expandedPaths]);

  // Sync hiddenStatuses when active space changes
  useEffect(() => {
    setHiddenStatuses(activeSpace?.hiddenStatuses || []);
  }, [activeSpace?.name]);

  const handleHiddenStatusesChange = useCallback(
    async (next: string[]) => {
      setHiddenStatuses(next);
      if (!activeSpace) return;
      try {
        const { spaces: current } = await api.getSources();
        const updated = current.map((s) =>
          s.name === activeSpace.name ? { ...s, hiddenStatuses: next } : s
        );
        await api.updateSources({ spaces: updated });
      } catch {
        setHiddenStatuses(hiddenStatuses);
      }
    },
    [activeSpace, hiddenStatuses]
  );

  useEffect(() => {
    // Load session, sources, and peeps in parallel
    Promise.all([
      api.getSession().catch(() => ({} as SessionState)),
      loadSources(),
      api.listPeeps(),
    ]).then(([session, loadedSpaces, { peeps: loadedPeeps }]) => {
      // Restore view
      if (session.view === "board" || session.view === "browse") setView(session.view as View);
      if (session.browseRoot) setBrowseRoot(session.browseRoot);
      if (session.expandedPaths) setExpandedPaths(session.expandedPaths);

      // Restore active space
      const restored = session.spaceName
        ? loadedSpaces.find((s: Space) => s.name === session.spaceName)
        : null;
      setActiveSpace(restored || (loadedSpaces.length > 0 ? loadedSpaces[0] : null));

      // Restore peeps and selected file
      setPeeps(loadedPeeps);
      if (session.selectedPath) {
        setSelectedPath(session.selectedPath);
        api.readFile(session.selectedPath).then((fileData) => {
          setSelectedFile(fileData);
          setActivePeep(resolvePeep(fileData, loadedPeeps));
        }).catch(() => {});
      }
      setSourcesLoaded(true);
    });
  }, [loadSources]);

  // Apply theme attributes to document root so CSS selectors work.
  // Also cache to localStorage so the inline FOUC-prevention script in
  // index.html can apply the right theme before React mounts.
  useEffect(() => {
    const style = theme.style || "macos";
    document.documentElement.setAttribute("data-theme", style);
    localStorage.setItem("openpeep-theme-style", style);

    const setMode = (resolved: string) => {
      document.documentElement.setAttribute("data-mode", resolved);
      document.documentElement.style.colorScheme = resolved;
      localStorage.setItem("openpeep-theme-mode", resolved);
    };

    if (theme.mode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => setMode(mq.matches ? "dark" : "light");
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      setMode(theme.mode || "dark");
    }
  }, [theme]);

  // Apply space accent color to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const ac = activeSpace?.accentColor && ACCENT_MAP[activeSpace.accentColor];
    if (ac) {
      root.style.setProperty("--accent", ac.color);
      root.style.setProperty("--accent-hover", ac.hover);
      root.style.setProperty("--accent-soft", ac.soft);
    } else {
      // Reset to theme defaults
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-hover");
      root.style.removeProperty("--accent-soft");
    }
  }, [activeSpace?.accentColor]);

  const openFile = useCallback(
    async (fullPath: string) => {
      setSelectedPath(fullPath);
      try {
        const fileData = await api.readFile(fullPath);
        setSelectedFile(fileData);
        const peep = resolvePeep(fileData, peeps);
        setActivePeep(peep);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [peeps]
  );

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const newW = Math.min(600, Math.max(160, startW + ev.clientX - startX));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [sidebarWidth]);

  const goHome = useCallback(() => {
    setBrowseRoot("");
    setSelectedFile(null);
    setActivePeep(null);
    setSelectedPath("");
    setExpandedPaths([]);
    setView(viewBeforeBrowse.current);
  }, []);

  const handleProjectSelect = (root: string, path: string) => {
    viewBeforeBrowse.current = view;
    setBrowseRoot(`${root}/${path}`);
    setView("browse");
  };

  // Load project.json info when browseRoot changes
  useEffect(() => {
    if (!browseRoot) { setProjectInfo(null); return; }
    api.readFile(`${browseRoot}/project.json`).then((f) => {
      try { setProjectInfo(JSON.parse(f.content || "{}")); } catch { setProjectInfo(null); }
    }).catch(() => setProjectInfo(null));
  }, [browseRoot]);

  const handleBreadcrumbContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setBreadcrumbMenu({ x, y });
  }, []);

  const copyBrowsePath = useCallback(() => {
    if (browseRoot) navigator.clipboard.writeText(browseRoot).catch(() => {});
    setBreadcrumbMenu(null);
  }, [browseRoot]);

  // Close breadcrumb menu on click outside / Escape
  useEffect(() => {
    if (!breadcrumbMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (breadcrumbMenuRef.current && !breadcrumbMenuRef.current.contains(e.target as Node)) {
        setBreadcrumbMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBreadcrumbMenu(null); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [breadcrumbMenu]);

  const handleSpacesChanged = async () => {
    const newSpaces = await loadSources();
    if (activeSpace) {
      const updated = newSpaces.find(
        (s: Space) => s.name === activeSpace.name
      );
      setActiveSpace(updated || (newSpaces.length > 0 ? newSpaces[0] : null));
    } else if (newSpaces.length > 0) {
      setActiveSpace(newSpaces[0]);
    }
  };

  const displaySpace = !sourcesLoaded
    ? null
    : activeSpace ||
      (spaces.length > 0
        ? {
            name: "All Spaces",
            icon: "🌐",
            roots: spaces.flatMap((s) => s.roots),
            statuses: spaces[0]?.statuses || [
              "Idea",
              "Planning",
              "In Progress",
              "Analyze",
              "Archive",
            ],
          }
        : null);

  // First-run wizard: show when no spaces configured
  const [wizardStep, setWizardStep] = useState(0);
  const showWizard = sourcesLoaded && spaces.length === 0 && !settingsOpen;

  const handleWizardPickFolder = async () => {
    const result = await api.pickFolder();
    if (result.path) {
      const newSpace: Space = {
        name: result.path.split("/").pop() || "My Projects",
        icon: "📁",
        roots: [result.path],
        statuses: ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
      };
      await api.updateSources({ spaces: [newSpace] });
      const updated = await loadSources();
      setActiveSpace(updated[0] || null);
      setWizardStep(2);
    }
  };

  const handleWizardTheme = async (mode: "dark" | "light" | "auto") => {
    const newTheme = { ...theme, mode };
    setTheme(newTheme);
    await api.updateSources({ theme: newTheme });
    setWizardStep(0); // Done - wizard hides because spaces.length > 0
  };

  if (showWizard) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-app">
        <div className="w-[420px] text-center">
          <img src="/peep-icon.png" alt="OpenPeep" className="w-16 h-16 mx-auto mb-6 drop-shadow-lg" />

          {wizardStep === 0 && (
            <>
              <h1 className="text-2xl font-bold text-primary mb-2">Welcome to OpenPeep</h1>
              <p className="text-sm text-secondary mb-8 leading-relaxed">
                Every file type deserves its own app. Pick a folder to get started.
              </p>
              <button
                className="h-10 px-6 bg-accent hover:bg-accent-hover text-black font-semibold text-sm rounded-xl transition-all"
                onClick={() => setWizardStep(1)}
              >
                Get Started
              </button>
            </>
          )}

          {wizardStep === 1 && (
            <>
              <h2 className="text-xl font-bold text-primary mb-2">Choose a workspace</h2>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                Pick a folder with your projects. You can add more later in Settings.
              </p>
              <button
                className="h-10 px-6 bg-accent hover:bg-accent-hover text-black font-semibold text-sm rounded-xl transition-all flex items-center gap-2 mx-auto"
                onClick={handleWizardPickFolder}
              >
                <FolderOpen size={16} />
                Pick a Folder
              </button>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <h2 className="text-xl font-bold text-primary mb-2">Choose a theme</h2>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                You can change this anytime in Settings.
              </p>
              <div className="flex gap-3 justify-center">
                {(["dark", "light", "auto"] as const).map((mode) => (
                  <button
                    key={mode}
                    className="w-28 h-20 rounded-xl border border-border-subtle hover:border-accent transition-all flex flex-col items-center justify-center gap-2 bg-surface"
                    onClick={() => handleWizardTheme(mode)}
                  >
                    <div className={`w-8 h-8 rounded-lg ${mode === "dark" ? "bg-gray-800" : mode === "light" ? "bg-gray-200" : "bg-gradient-to-r from-gray-800 to-gray-200"}`} />
                    <span className="text-xs font-medium text-secondary capitalize">{mode}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-app"
    >
      {/* Toolbar */}
      <header className="toolbar-glass flex items-center gap-2 px-3 h-12 shrink-0 relative z-20 toolbar-accent">
        {/* Logo / Home */}
        {theme.showLogo !== false && (
          <button
            className="flex items-center gap-2 mr-1 hover:opacity-80 transition-opacity"
            onClick={goHome}
            title="Home"
          >
            <img
              src="/peep-icon.png"
              alt="OpenPeep"
              className="w-6 h-6 drop-shadow-sm"
            />
          </button>
        )}

        {/* Space Switcher */}
        <SpaceSwitcher
          spaces={spaces}
          activeSpace={activeSpace}
          onSelect={(space) => {
            setActiveSpace(space);
            // Reset browse state when switching workspaces
            setBrowseRoot("");
            setSelectedFile(null);
            setActivePeep(null);
            setSelectedPath("");
            setExpandedPaths([]);
            setView("board");
          }}
        />

        {/* Breadcrumb */}
        {browseRoot && view === "browse" && (
          <div className="flex items-center gap-1.5 text-xs text-tertiary ml-1">
            <button
              className="text-secondary hover:text-primary transition-colors"
              onClick={goHome}
              title="Home"
            >
              <HomeIcon size={14} />
            </button>
            <span className="text-border-subtle">/</span>
            <span
              className="text-secondary font-medium truncate max-w-[200px] cursor-default"
              onContextMenu={handleBreadcrumbContext}
            >
              {formatBreadcrumb(browseRoot.split("/").pop() || "")}
            </span>
            {selectedFile && (
              <>
                <span className="text-border-subtle">/</span>
                <span className="text-tertiary truncate max-w-[160px]">
                  {selectedFile.name}
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex h-8 pill-glass overflow-hidden gap-0.5 p-0.5">
          <button
            className={`px-3.5 text-xs font-medium rounded-full transition-all ${
              view === "board"
                ? "bg-accent/20 text-accent"
                : "text-secondary hover:text-primary"
            }`}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            className={`px-3.5 text-xs font-medium rounded-full transition-all ${
              view === "browse"
                ? "bg-accent/20 text-accent"
                : "text-secondary hover:text-primary"
            }`}
            onClick={() => setView("browse")}
          >
            Browse
          </button>
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-1.5 ml-1">
          <SettingsButton
            statuses={[
              ...(displaySpace?.statuses || []),
              ...("Uncategorized" in projectCounts ? ["Uncategorized"] : []),
            ]}
            hiddenStatuses={hiddenStatuses}
            onHiddenStatusesChange={handleHiddenStatusesChange}
            projectCounts={projectCounts}
            onSettingsOpen={() => setSettingsOpen(true)}
            onPeepsOpen={() => setPeepHubOpen(true)}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {view === "board" && displaySpace && (
          <Board
            space={displaySpace}
            onProjectSelect={handleProjectSelect}
            hiddenStatuses={hiddenStatuses}
            onProjectCountsChange={setProjectCounts}
          />
        )}

        {view === "browse" && !browseRoot && displaySpace && (
          <ProjectGrid
            space={displaySpace}
            onProjectSelect={handleProjectSelect}
          />
        )}

        {view === "browse" && browseRoot && (
          <>
            <aside className="sidebar-glass border-r border-border flex flex-col min-h-0 relative" style={{ width: sidebarWidth }}>
              <FileTree
                root={browseRoot}
                onFileSelect={openFile}
                selectedPath={selectedPath}
                showHidden={showHiddenFiles}
                peeps={peeps}
                expandedPaths={expandedPaths}
                onExpandedPathsChange={setExpandedPaths}
                onFileDeleted={(path) => {
                  if (selectedPath === path || selectedPath?.startsWith(path + "/")) {
                    setSelectedFile(null);
                    setActivePeep(null);
                    setSelectedPath("");
                  }
                }}
                onFileRenamed={(oldPath, newPath) => {
                  if (selectedPath === oldPath) {
                    setSelectedPath(newPath);
                    openFile(newPath);
                  }
                }}
              />
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors z-10"
                onMouseDown={startResize}
              />
            </aside>

            <PreviewPane
              file={selectedFile}
              peep={activePeep}
              onSaveStatus={setSaveStatus}
              statuses={displaySpace?.statuses}
            />
          </>
        )}
      </main>

      {/* Status bar */}
      <footer className="flex items-center px-3 h-6 bg-toolbar border-t border-border text-[11px] text-tertiary shrink-0 font-mono">
        {activePeep && (
          <span className="text-secondary">
            {activePeep.name}{" "}
            <span className="text-tertiary">v{activePeep.version}</span>
          </span>
        )}
        <span className="flex-1" />
        {saveStatus && (
          <span className="text-emerald-400 mr-3">{saveStatus}</span>
        )}
        {selectedFile && (
          <span className="truncate max-w-xs">{selectedFile.path}</span>
        )}
      </footer>

      {/* Modals */}
      <PeepHub open={peepHubOpen} onClose={() => setPeepHubOpen(false)} />
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSpacesChanged={handleSpacesChanged}
        theme={theme}
        onThemeChanged={setTheme}
        showHiddenFiles={showHiddenFiles}
        onShowHiddenFilesChanged={setShowHiddenFiles}
        devMode={devMode}
        onDevModeChanged={setDevMode}
        peephubUrl={peephubUrl}
        onPeephubUrlChanged={setPeephubUrl}
        peephubApiKey={peephubApiKey}
        onPeephubApiKeyChanged={setPeephubApiKey}
      />

      {/* Breadcrumb context menu */}
      {breadcrumbMenu && createPortal(
        <div
          ref={breadcrumbMenuRef}
          className="fixed w-56 modal-glass z-[9999] animate-scale-in p-1"
          style={{ top: breadcrumbMenu.y, left: breadcrumbMenu.x }}
        >
          {/* Project info header */}
          <div className="px-2.5 py-2 border-b border-border-subtle mb-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary truncate">
              <FolderOpen size={12} className="text-accent shrink-0" />
              {formatBreadcrumb(browseRoot.split("/").pop() || "")}
            </div>
            {projectInfo && (
              <div className="text-[10px] text-tertiary mt-1.5 space-y-1">
                {typeof projectInfo.description === "string" && (
                  <div className="text-secondary leading-relaxed line-clamp-2">
                    {projectInfo.description}
                  </div>
                )}
                {typeof projectInfo.type === "string" && (
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="text-secondary">{projectInfo.type}</span>
                  </div>
                )}
                {typeof projectInfo.status === "string" && (
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="text-accent font-medium">{projectInfo.status}</span>
                  </div>
                )}
              </div>
            )}
            <div className="text-[10px] text-tertiary mt-1.5">
              <div className="flex justify-between">
                <span>Path</span>
                <span className="text-secondary truncate max-w-[140px] ml-2" title={browseRoot}>
                  {browseRoot.split("/").slice(-2).join("/")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <button
            className="w-full text-left px-2.5 py-1.5 text-[11px] rounded-md flex items-center gap-2 transition-colors text-secondary hover:bg-hover hover:text-primary"
            onClick={copyBrowsePath}
          >
            <Copy size={12} />
            Copy Path
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
