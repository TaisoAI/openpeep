import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { api, FileEntry, PeepManifest, FileSortField, SortDirection } from "@/utils/api";

interface FileTreeProps {
  root: string;
  onFileSelect: (fullPath: string) => void;
  selectedPath?: string;
  showHidden?: boolean;
  onFileDeleted?: (path: string) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  peeps?: PeepManifest[];
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  fullPath: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: TreeNode;
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileType(name: string): string {
  const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")).toLowerCase() : "";
  const types: Record<string, string> = {
    ".md": "Markdown", ".txt": "Text", ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".js": "JavaScript", ".ts": "TypeScript", ".tsx": "TypeScript React", ".jsx": "JavaScript React",
    ".py": "Python", ".html": "HTML", ".css": "CSS", ".scss": "SCSS",
    ".png": "PNG Image", ".jpg": "JPEG Image", ".jpeg": "JPEG Image", ".gif": "GIF Image",
    ".svg": "SVG Image", ".webp": "WebP Image", ".heic": "HEIC Image",
    ".mp4": "MP4 Video", ".mov": "QuickTime Video", ".webm": "WebM Video",
    ".mp3": "MP3 Audio", ".wav": "WAV Audio", ".m4a": "M4A Audio",
    ".pdf": "PDF Document", ".zip": "ZIP Archive", ".tar": "TAR Archive",
  };
  return types[ext] || (ext ? `${ext.slice(1).toUpperCase()} File` : "File");
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function getSortAnnotation(node: TreeNode, sortField: FileSortField): string {
  switch (sortField) {
    case "modified":
      return formatShortDate(node.lastModified);
    case "created":
      return formatShortDate(node.createdAt);
    case "size":
      return node.isDir ? "" : formatSize(node.size);
    case "type": {
      if (node.isDir) return "Folder";
      const ext = node.name.includes(".") ? node.name.substring(node.name.lastIndexOf(".")).toLowerCase() : "";
      return ext || "File";
    }
    default:
      return "";
  }
}

function findPeepForFile(name: string, peeps: PeepManifest[]): PeepManifest | null {
  const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")).toLowerCase() : "";
  // Check filename patterns first
  for (const peep of peeps) {
    if (peep.matches.fileNames?.some((pattern) => {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
      return regex.test(name);
    })) return peep;
  }
  // Then extension
  if (ext) {
    const extMatches = peeps.filter((p) => p.matches.extensions?.includes(ext));
    if (extMatches.length > 0) return extMatches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  }
  return null;
}

export default function FileTree({
  root,
  onFileSelect,
  selectedPath,
  showHidden = false,
  onFileDeleted,
  onFileRenamed,
  peeps = [],
}: FileTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sortField, setSortField] = useState<FileSortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sortButtonRef.current && !sortButtonRef.current.contains(target) &&
        sortMenuRef.current && !sortMenuRef.current.contains(target)
      ) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSortMenu]);

  const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path, showHidden, sortField, sortDir);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
        }));
      } catch {
        return [];
      }
    },
    [root, showHidden, sortField, sortDir]
  );

  useEffect(() => {
    loadDirectory("").then((entries) => setNodes(entries));
  }, [root, loadDirectory]);

  const toggleDir = useCallback(
    async (node: TreeNode) => {
      const newExpanded = new Set(expandedPaths);
      if (newExpanded.has(node.path)) {
        newExpanded.delete(node.path);
      } else {
        newExpanded.add(node.path);
        if (!node.children) {
          const children = await loadDirectory(node.path);
          setNodes((prev) => updateNodeChildren(prev, node.path, children));
        }
      }
      setExpandedPaths(newExpanded);
    },
    [expandedPaths, loadDirectory]
  );

  const handleClick = (node: TreeNode) => {
    if (node.isDir) {
      toggleDir(node);
    } else {
      onFileSelect(node.fullPath);
    }
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      e.preventDefault();
      e.stopPropagation();
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 300);
      setContextMenu({ x, y, node });
    },
    []
  );

  const refreshParent = useCallback(
    async (nodePath: string) => {
      const parentPath = nodePath.includes("/")
        ? nodePath.substring(0, nodePath.lastIndexOf("/"))
        : "";
      const children = await loadDirectory(parentPath);
      if (parentPath === "") {
        setNodes(children);
      } else {
        setNodes((prev) => updateNodeChildren(prev, parentPath, children));
      }
    },
    [loadDirectory]
  );

  const handleDelete = useCallback(
    async (node: TreeNode) => {
      try {
        await api.deleteFile(node.fullPath);
        await refreshParent(node.path);
        onFileDeleted?.(node.fullPath);
      } catch (err) {
        console.error("Failed to delete:", err);
      }
      setContextMenu(null);
    },
    [refreshParent, onFileDeleted]
  );

  const handleRename = useCallback(
    (node: TreeNode) => {
      setRenamingPath(node.path);
      setRenameValue(node.name);
      setContextMenu(null);
    },
    []
  );

  const commitRename = useCallback(
    async (node: TreeNode) => {
      const trimmed = renameValue.trim();
      if (!trimmed || trimmed === node.name) {
        setRenamingPath(null);
        return;
      }
      try {
        const { newPath } = await api.renameFile(node.fullPath, trimmed);
        await refreshParent(node.path);
        onFileRenamed?.(node.fullPath, newPath);
      } catch (err) {
        console.error("Failed to rename:", err);
      }
      setRenamingPath(null);
    },
    [renameValue, refreshParent, onFileRenamed]
  );

  const handleCopyPath = useCallback(
    (node: TreeNode) => {
      navigator.clipboard.writeText(node.fullPath).catch(() => {});
      setContextMenu(null);
    },
    []
  );

  const handleSortSelect = useCallback((field: FileSortField) => {
    if (field === sortField) {
      const defaultDir = (field === "modified" || field === "created" || field === "size") ? "desc" : "asc";
      const currentDir = sortDir || defaultDir;
      setSortDir(currentDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(undefined);
    }
    setShowSortMenu(false);
  }, [sortField, sortDir]);

  const SORT_OPTIONS: { field: FileSortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "modified", label: "Date Modified" },
    { field: "created", label: "Date Created" },
    { field: "size", label: "Size" },
    { field: "type", label: "Type" },
  ];

  const currentSortDir = sortDir || ((sortField === "modified" || sortField === "created" || sortField === "size") ? "desc" : "asc");

  return (
    <div className="flex flex-col h-full">
      {/* Sort header */}
      <div className="flex items-center px-2 py-1.5 border-b border-border-subtle shrink-0">
        <span className="text-[10px] text-tertiary uppercase tracking-wider font-semibold flex-1">Files</span>
        <div className="relative" ref={sortButtonRef}>
          <button
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort files"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M9 18h6" />
            </svg>
          </button>
          {showSortMenu && (
            <div ref={sortMenuRef} className="absolute right-0 top-7 w-40 modal-glass z-50 p-1 animate-scale-in">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.field}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-md flex items-center gap-2 transition-colors ${
                    sortField === opt.field
                      ? "text-accent bg-accent/10"
                      : "text-secondary hover:bg-hover hover:text-primary"
                  }`}
                  onClick={() => handleSortSelect(opt.field)}
                >
                  <span className="flex-1">{opt.label}</span>
                  {sortField === opt.field && (
                    <span className="text-[9px] text-tertiary">
                      {currentSortDir === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tree content */}
      <div className="text-xs overflow-y-auto flex-1 select-none py-1">
        {nodes.map((node) => (
          <TreeNodeView
            key={node.path}
            node={node}
            depth={0}
            expanded={expandedPaths}
            selectedPath={selectedPath}
            sortField={sortField}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameCommit={commitRename}
            onRenameCancel={() => setRenamingPath(null)}
          />
        ))}

        {contextMenu &&
          createPortal(
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              node={contextMenu.node}
              peeps={peeps}
              onClose={() => setContextMenu(null)}
              onDelete={handleDelete}
              onRename={handleRename}
              onCopyPath={handleCopyPath}
            />,
            document.body
          )}
      </div>
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  expanded,
  selectedPath,
  sortField,
  onClick,
  onContextMenu,
  renamingPath,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedPath?: string;
  sortField: FileSortField;
  onClick: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  renamingPath: string | null;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: (node: TreeNode) => void;
  onRenameCancel: () => void;
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = node.fullPath === selectedPath;
  const isRenaming = renamingPath === node.path;
  const indent = depth * 14;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          // Select name without extension for files
          const dotIdx = node.isDir ? -1 : el.value.lastIndexOf(".");
          el.setSelectionRange(0, dotIdx > 0 ? dotIdx : el.value.length);
        }
      }, 0);
    }
  }, [isRenaming, node.isDir]);

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-[3px] cursor-pointer transition-colors ${
          isSelected
            ? "bg-accent/10 text-accent"
            : "text-secondary hover:bg-hover hover:text-primary"
        }`}
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => onClick(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <span className="w-3 text-center text-[9px] text-tertiary shrink-0">
          {node.isDir ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        {isRenaming ? (
          <input
            ref={inputRef}
            className="bg-input text-primary text-xs px-1 py-0 rounded border border-accent outline-none flex-1 min-w-0 font-medium"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameCommit(node);
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={() => onRenameCommit(node)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="truncate font-medium flex-1">{node.name}</span>
            {sortField !== "name" && (() => {
              const annotation = getSortAnnotation(node, sortField);
              return annotation ? (
                <span className="text-[9px] text-tertiary shrink-0 ml-1 font-normal tabular-nums">{annotation}</span>
              ) : null;
            })()}
          </>
        )}
      </div>
      {node.isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              sortField={sortField}
              onClick={onClick}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContextMenu({
  x,
  y,
  node,
  peeps,
  onClose,
  onDelete,
  onRename,
  onCopyPath,
}: {
  x: number;
  y: number;
  node: TreeNode;
  peeps: PeepManifest[];
  onClose: () => void;
  onDelete: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onCopyPath: (node: TreeNode) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const matchedPeep = node.isDir ? null : findPeepForFile(node.name, peeps);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const menuItem =
    "w-full text-left px-2.5 py-1.5 text-[11px] rounded-md flex items-center gap-2 transition-colors";

  return (
    <div
      ref={menuRef}
      className="fixed w-56 modal-glass z-[9999] animate-scale-in p-1"
      style={{ top: y, left: x }}
    >
      {/* Info header */}
      <div className="px-2.5 py-2 border-b border-border-subtle mb-1">
        <div className="text-[11px] font-semibold text-primary truncate">
          {node.name}
        </div>
        <div className="text-[10px] text-tertiary mt-1.5 space-y-1">
          <div className="flex justify-between">
            <span>Type</span>
            <span className="text-secondary">{node.isDir ? "Folder" : getFileType(node.name)}</span>
          </div>
          {!node.isDir && node.size !== null && (
            <div className="flex justify-between">
              <span>Size</span>
              <span className="text-secondary">{formatSize(node.size)}</span>
            </div>
          )}
          {node.createdAt && (
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-secondary">{formatDate(node.createdAt)}</span>
            </div>
          )}
          {node.lastModified && (
            <div className="flex justify-between">
              <span>Modified</span>
              <span className="text-secondary">{formatDate(node.lastModified)}</span>
            </div>
          )}
          {matchedPeep && (
            <div className="flex justify-between">
              <span>Peep</span>
              <span className="text-accent font-medium">{matchedPeep.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <button
        className={`${menuItem} text-secondary hover:bg-hover hover:text-primary`}
        onClick={() => onRename(node)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        Rename
      </button>

      <button
        className={`${menuItem} text-secondary hover:bg-hover hover:text-primary`}
        onClick={() => onCopyPath(node)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        Copy Path
      </button>

      <div className="border-t border-border-subtle my-1 mx-1" />

      {confirming ? (
        <div className="px-2.5 py-2">
          <div className="text-[11px] text-secondary mb-2">
            Delete{" "}
            <span className="font-semibold text-primary">{node.name}</span>?
            {node.isDir && (
              <span className="text-tertiary"> This will delete all contents.</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              className="flex-1 text-[11px] font-medium px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              onClick={() => onDelete(node)}
            >
              Delete
            </button>
            <button
              className="flex-1 text-[11px] font-medium px-2 py-1 rounded-md bg-elevated text-secondary hover:text-primary transition-colors"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className={`${menuItem} text-red-400/70 hover:bg-red-500/10 hover:text-red-400`}
          onClick={() => setConfirming(true)}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Delete
        </button>
      )}
    </div>
  );
}

function updateNodeChildren(
  nodes: TreeNode[],
  targetPath: string,
  children: TreeNode[]
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeChildren(node.children, targetPath, children),
      };
    }
    return node;
  });
}
