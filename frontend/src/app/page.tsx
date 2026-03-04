"use client";

import { useState, useEffect, useCallback } from "react";
import { api, Space, FileData, PeepManifest, ThemeConfig } from "@/utils/api";
import { resolvePeep } from "@/utils/peep-resolver";
import SpaceSwitcher from "@/components/SpaceSwitcher/SpaceSwitcher";
import Board from "@/components/Board/Board";
import FileTree from "@/components/FileTree/FileTree";
import PreviewPane from "@/components/PreviewPane/PreviewPane";
import PeepHub from "@/components/PeepHub/PeepHub";
import Settings from "@/components/Settings/Settings";

type View = "board" | "browse";

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [view, setView] = useState<View>("board");
  const [saveStatus, setSaveStatus] = useState("");
  const [peepHubOpen, setPeepHubOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>({ mode: "dark", style: "macos" });

  // Browse mode state
  const [browseRoot, setBrowseRoot] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [activePeep, setActivePeep] = useState<PeepManifest | null>(null);
  const [selectedPath, setSelectedPath] = useState("");

  const loadSources = useCallback(async () => {
    const data = await api.getSources();
    setSpaces(data.spaces);
    setTheme(data.theme || { mode: "dark", style: "macos" });
    return data.spaces;
  }, []);

  useEffect(() => {
    loadSources().then((spaces) => {
      if (spaces.length > 0) setActiveSpace(spaces[0]);
    });
    api.listPeeps().then(({ peeps }) => setPeeps(peeps));
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

  const handleProjectSelect = (root: string, path: string) => {
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
      className="h-screen flex flex-col bg-app"
      data-theme={theme.style || "macos"}
      data-mode={theme.mode || "dark"}
    >
      {/* Toolbar */}
      <header className="toolbar-glass flex items-center gap-2 px-3 h-12 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <img
            src="/peep-icon.png"
            alt="OpenPeep"
            className="w-6 h-6 drop-shadow-sm"
          />
        </div>

        {/* Space Switcher */}
        <SpaceSwitcher
          spaces={spaces}
          activeSpace={activeSpace}
          onSelect={setActiveSpace}
        />

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex h-7 bg-elevated radius-sm overflow-hidden border border-border-subtle">
          <button
            className={`px-3 text-xs font-medium transition-all ${
              view === "board"
                ? "bg-accent/15 text-accent"
                : "text-secondary hover:text-primary"
            }`}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            className={`px-3 text-xs font-medium transition-all ${
              view === "browse"
                ? "bg-accent/15 text-accent"
                : "text-secondary hover:text-primary"
            }`}
            onClick={() => setView("browse")}
          >
            Browse
          </button>
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-1 ml-1">
          <button
            className="h-7 px-2.5 text-xs font-medium text-secondary hover:text-primary hover:bg-hover rounded-lg transition-all"
            onClick={() => setPeepHubOpen(true)}
          >
            Peeps
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center text-secondary hover:text-primary hover:bg-hover rounded-lg transition-all"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex min-h-0">
        {view === "board" && displaySpace && (
          <Board space={displaySpace} onProjectSelect={handleProjectSelect} />
        )}

        {view === "browse" && (
          <>
            <aside className="sidebar-glass w-60 border-r border-border flex flex-col min-h-0">
              {browseRoot ? (
                <>
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <button
                      className="text-xs text-secondary hover:text-primary transition-colors"
                      onClick={() => setBrowseRoot("")}
                    >
                      ← Roots
                    </button>
                    <span className="text-xs text-tertiary truncate font-medium">
                      {browseRoot.split("/").pop()}
                    </span>
                  </div>
                  <FileTree
                    root={browseRoot}
                    onFileSelect={openFile}
                    selectedPath={selectedPath}
                  />
                </>
              ) : displaySpace && displaySpace.roots.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider">
                      Root Folders
                    </span>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {displaySpace.roots.map((root) => (
                      <button
                        key={root}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-hover transition-colors group"
                        onClick={() => setBrowseRoot(root)}
                      >
                        <span className="text-base leading-none">📁</span>
                        <span className="text-[13px] text-primary font-medium truncate flex-1">
                          {root.split("/").pop()}
                        </span>
                        <span className="text-[10px] text-tertiary truncate max-w-[100px] opacity-0 group-hover:opacity-100 transition-opacity">
                          {root}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <img
                      src="/peep-icon.png"
                      alt=""
                      className="w-10 h-10 mx-auto mb-3 opacity-30"
                    />
                    <p className="text-xs text-tertiary mb-2">
                      No root folders configured
                    </p>
                    <button
                      className="text-xs text-accent hover:text-accent-hover font-medium transition-colors"
                      onClick={() => setSettingsOpen(true)}
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
              )}
            </aside>

            <PreviewPane
              file={selectedFile}
              peep={activePeep}
              onSaveStatus={setSaveStatus}
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
      />
    </div>
  );
}
