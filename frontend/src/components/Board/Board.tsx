import { useState, useEffect, useCallback } from "react";
import { api, Space, FileEntry } from "@/utils/api";
import ProjectCard from "./ProjectCard";

interface BoardProps {
  space: Space;
  onProjectSelect: (root: string, path: string) => void;
  hiddenStatuses?: string[];
  onProjectCountsChange?: (counts: Record<string, number>) => void;
}

interface ProjectEntry extends FileEntry {
  status: string;
  root: string;
}

export default function Board({ space, onProjectSelect, hiddenStatuses = [], onProjectCountsChange }: BoardProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<ProjectEntry | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [space]);

  async function loadProjects() {
    setLoading(true);
    const allProjects: ProjectEntry[] = [];

    for (const root of space.roots) {
      try {
        const { entries } = await api.listFiles(root);
        for (const entry of entries) {
          if (entry.isDir) {
            const status =
              (entry.project?.status as string) ||
              space.statuses[0] ||
              "Idea";
            allProjects.push({ ...entry, status, root });
          }
        }
      } catch {
        // Root might not exist
      }
    }

    setProjects(allProjects);
    setLoading(false);
  }

  // Compute uncategorized projects (status doesn't match any column)
  const uncategorized = projects.filter(
    (p) => !space.statuses.includes(p.status)
  );

  // Report project counts to parent for the settings dropdown
  useEffect(() => {
    if (!onProjectCountsChange || projects.length === 0) return;
    const counts: Record<string, number> = {};
    for (const status of space.statuses) {
      counts[status] = projects.filter((p) => p.status === status).length;
    }
    if (uncategorized.length > 0) {
      counts["Uncategorized"] = uncategorized.length;
    }
    onProjectCountsChange(counts);
  }, [projects, space.statuses, uncategorized.length, onProjectCountsChange]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, project: ProjectEntry) => {
      setDragItem(project);
      e.dataTransfer.effectAllowed = "move";
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.5";
      }
    },
    []
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragItem(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dropTarget !== status) {
        setDropTarget(status);
      }
    },
    [dropTarget]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: string) => {
      e.preventDefault();
      setDropTarget(null);

      if (!dragItem || dragItem.status === newStatus) {
        setDragItem(null);
        return;
      }

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.root === dragItem.root && p.path === dragItem.path
            ? { ...p, status: newStatus }
            : p
        )
      );

      // Persist to project.json
      try {
        await api.updateProjectStatus(dragItem.root, dragItem.path, newStatus);
      } catch (err) {
        console.error("Failed to update status:", err);
        // Revert on failure
        setProjects((prev) =>
          prev.map((p) =>
            p.root === dragItem.root && p.path === dragItem.path
              ? { ...p, status: dragItem.status }
              : p
          )
        );
      }

      setDragItem(null);
    },
    [dragItem]
  );

  // Build column list: configured statuses + Uncategorized if there are orphaned projects
  const allColumns = uncategorized.length > 0
    ? ["Uncategorized", ...space.statuses]
    : space.statuses;
  const visibleColumns = allColumns.filter(
    (s) => !hiddenStatuses.includes(s)
  );
  const hasProjects = projects.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* Board content */}
      <div className="flex-1 flex min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-tertiary text-sm animate-fade-in">
              Loading...
            </div>
          </div>
        ) : !hasProjects ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <img
                src="/peep-icon.png"
                alt=""
                className="w-16 h-16 mx-auto mb-4 opacity-20"
              />
              <p className="text-secondary text-sm font-medium mb-1">
                No projects yet
              </p>
              <p className="text-tertiary text-xs max-w-[240px]">
                Add root folders in Settings to see your projects on the board
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-auto flex-1 p-4 pt-2">
            <div className="flex gap-3 items-stretch min-h-full">
            {visibleColumns.map((status, i) => {
              const columnProjects = status === "Uncategorized"
                ? uncategorized
                : projects.filter((p) => p.status === status);
              const isOver = dropTarget === status;
              const isDragSource = dragItem?.status === status;

              return (
                <div
                  key={status}
                  className={`flex-shrink-0 w-72 flex flex-col animate-fade-in column-glass transition-all duration-200 ${
                    isOver && !isDragSource
                      ? "!bg-accent/8 !border-accent/30"
                      : ""
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
                    <h2 className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      {status}
                    </h2>
                    {columnProjects.length > 0 && (
                      <span className="text-[10px] text-tertiary bg-elevated px-1.5 py-0.5 rounded-full font-mono ml-auto">
                        {columnProjects.length}
                      </span>
                    )}
                  </div>

                  {/* Column body */}
                  <div className="flex-1 flex flex-col gap-1.5 p-2 min-h-[80px]">
                    {columnProjects.map((project) => (
                      <div
                        key={`${project.root}/${project.path}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <ProjectCard
                          name={project.name}
                          path={project.path}
                          project={project.project}
                          createdAt={project.createdAt}
                          lastModified={project.lastModified}
                          onClick={() =>
                            onProjectSelect(project.root, project.path)
                          }
                        />
                      </div>
                    ))}
                    {columnProjects.length === 0 && (
                      <div className="flex-1 flex items-center justify-center py-6">
                        <p className="text-[11px] text-tertiary/50 italic">
                          Drop here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
