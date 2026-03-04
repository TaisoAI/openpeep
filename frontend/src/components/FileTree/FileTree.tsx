import { useState, useEffect, useCallback } from "react";
import { api, FileEntry } from "@/utils/api";

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

  const loadDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      try {
        const { entries } = await api.listFiles(root, path);
        return entries.map((entry) => ({
          ...entry,
          fullPath: `${root}/${entry.path}`,
        }));
      } catch {
        return [];
      }
    },
    [root]
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

  return (
    <div className="text-xs overflow-y-auto h-full select-none py-1">
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
