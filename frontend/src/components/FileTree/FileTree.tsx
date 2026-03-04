import { useState, useEffect, useCallback, useRef } from "react";
import { api, FileEntry, FileSortField, SortDirection } from "@/utils/api";

interface FileTreeProps {
  root: string;
  onFileSelect: (fullPath: string) => void;
  selectedPath?: string;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
  fullPath: string;
}

export default function FileTree({
  root,
  onFileSelect,
  selectedPath,
}: FileTreeProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<FileSortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection | undefined>(undefined);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortButtonRef.current && !sortButtonRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSortMenu]);

  const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path, false, sortField, sortDir);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
        }));
      } catch {
        return [];
      }
    },
    [root, sortField, sortDir]
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

  const handleSortSelect = useCallback((field: FileSortField) => {
    if (field === sortField) {
      // Toggle direction
      const defaultDir = (field === "modified" || field === "created" || field === "size") ? "desc" : "asc";
      const currentDir = sortDir || defaultDir;
      setSortDir(currentDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(undefined); // Use default
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
        <div className="relative">
          <button
            ref={sortButtonRef}
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort files"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M9 18h6" />
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-7 w-40 modal-glass z-50 p-1 animate-scale-in">
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
            onClick={handleClick}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  expanded,
  selectedPath,
  onClick,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selectedPath?: string;
  onClick: (node: TreeNode) => void;
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = node.fullPath === selectedPath;
  const indent = depth * 14;

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
      >
        <span className="w-3 text-center text-[9px] text-tertiary shrink-0">
          {node.isDir ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        <span className="truncate font-medium">
          {node.name}
        </span>
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
              onClick={onClick}
            />
          ))}
        </div>
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
