import { useState, useEffect, useCallback, useRef } from "react";
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

type View = "board" | "browse";

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

  // Track which view the user was on before drilling into a project
  const viewBeforeBrowse = useRef<View>("board");

  // Browse mode state
  const [browseRoot, setBrowseRoot] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [activePeep, setActivePeep] = useState<PeepManifest | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

  const loadSources = useCallback(async () => {
    const data = await api.getSources();
    setSpaces(data.spaces);
    setTheme(data.theme || { mode: "dark", style: "macos" });
    setShowHiddenFiles(data.showHiddenFiles || false);
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
    });
  }, [loadSources]);

  // Apply theme attributes to document root so CSS selectors work
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.style || "macos");
    document.documentElement.setAttribute("data-mode", theme.mode || "dark");
  }, [theme]);

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

  const displaySpace =
    activeSpace ||
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

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col bg-app"
      data-theme={theme.style || "macos"}
      data-mode={theme.mode || "dark"}
    >
      {/* Toolbar */}
      <header className="toolbar-glass flex items-center gap-2 px-3 h-12 shrink-0 relative z-20">
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
          onSelect={setActiveSpace}
        />

        {/* Breadcrumb */}
        {browseRoot && view === "browse" && (
          <div className="flex items-center gap-1.5 text-xs text-tertiary ml-1">
            <button
              className="text-secondary hover:text-primary transition-colors"
              onClick={goHome}
              title="Home"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
            <span className="text-border-subtle">/</span>
            <span className="text-secondary font-medium truncate max-w-[200px]">
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
            <aside className="sidebar-glass w-60 border-r border-border flex flex-col min-h-0">
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
      />
    </div>
  );
}
