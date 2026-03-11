import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { api } from "@/utils/api";

interface ProjectCardProps {
  name: string;
  path: string;
  root: string;
  project?: Record<string, unknown>;
  createdAt?: string;
  lastModified?: string;
  onClick: () => void;
  onDeleted?: () => void;
}

export default function ProjectCard({
  name,
  path,
  root,
  project,
  createdAt,
  lastModified,
  onClick,
  onDeleted,
}: ProjectCardProps) {
  const description = (project?.description as string) || "";
  const type = (project?.type as string) || "";
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        className="card-glass radius-sm p-2.5 cursor-pointer transition-all group"
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        {createdAt && (
          <p className="text-[10px] text-tertiary font-mono mb-0.5">
            {formatDate(createdAt)}
          </p>
        )}
        <h3 className="font-medium text-primary text-[13px] truncate group-hover:text-accent transition-colors">
          {formatProjectName(name)}
        </h3>
        {description && (
          <p className="text-[11px] text-tertiary mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        {lastModified && (
          <p className="text-[10px] text-tertiary/60 font-mono mt-1" title={`Last modified: ${new Date(lastModified).toLocaleString()}`}>
            {formatRelativeTime(lastModified)}
          </p>
        )}
        {type && (
          <span className="inline-block text-[10px] bg-surface text-tertiary px-1.5 py-0.5 rounded font-medium mt-1">
            {type}
          </span>
        )}
      </div>

      {contextMenu && createPortal(
        <ProjectContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          name={name}
          fullPath={`${root}/${path}`}
          onClose={() => setContextMenu(null)}
          onDeleted={() => {
            setContextMenu(null);
            onDeleted?.();
          }}
        />,
        document.body
      )}
    </>
  );
}

function ProjectContextMenu({
  x,
  y,
  name,
  fullPath,
  onClose,
  onDeleted,
}: {
  x: number;
  y: number;
  name: string;
  fullPath: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteFile(fullPath);
      onDeleted();
    } catch (err) {
      console.error("Failed to delete project:", err);
      setDeleting(false);
    }
  };

  const menuItem =
    "w-full text-left px-2.5 py-1.5 text-[11px] rounded-md flex items-center gap-2 transition-colors";

  // Keep menu on screen
  const menuStyle: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 120),
    left: Math.min(x, window.innerWidth - 240),
  };

  return (
    <div
      ref={menuRef}
      className="fixed w-56 modal-glass z-[9999] animate-scale-in p-1"
      style={menuStyle}
    >
      <div className="px-2.5 py-2 border-b border-border-subtle mb-1">
        <div className="text-[11px] font-semibold text-primary truncate">
          {formatProjectName(name)}
        </div>
        <div className="text-[10px] text-tertiary mt-0.5 truncate font-mono">
          {name}
        </div>
      </div>

      {confirming ? (
        <div className="px-2.5 py-2">
          <div className="text-[11px] text-secondary mb-2">
            Delete{" "}
            <span className="font-semibold text-primary">{formatProjectName(name)}</span>?
            <span className="text-tertiary"> This will delete the entire project folder.</span>
          </div>
          <div className="flex gap-1.5">
            <button
              className="flex-1 text-[11px] font-medium px-2 py-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
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
          <Trash2 size={12} />
          Delete Project
        </button>
      )}
    </div>
  );
}

function formatProjectName(folderName: string): string {
  const withoutDate = folderName.replace(/^\d{4}-\d{2}-\d{2}_/, "");
  return withoutDate
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
