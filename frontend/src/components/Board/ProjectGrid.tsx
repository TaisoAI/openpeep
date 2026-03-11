import { useState, useEffect } from "react";
import { api, Space, FileEntry } from "@/utils/api";
import ProjectCard from "./ProjectCard";

interface ProjectGridProps {
  space: Space;
  onProjectSelect: (root: string, path: string) => void;
  refreshKey?: number;
}

interface ProjectEntry extends FileEntry {
  root: string;
}

export default function ProjectGrid({ space, onProjectSelect, refreshKey }: ProjectGridProps) {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);

  function reload() { setLocalRefresh((n) => n + 1); }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const all: ProjectEntry[] = [];
      for (const root of space.roots) {
        try {
          const { entries } = await api.listFiles(root);
          for (const entry of entries) {
            if (entry.isDir) {
              all.push({ ...entry, root });
            }
          }
        } catch {
          // Root might not exist
        }
      }
      if (!cancelled) {
        // Sort by lastModified descending (most recent first)
        all.sort((a, b) => {
          const ta = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const tb = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          return tb - ta;
        });
        setProjects(all);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [space, refreshKey, localRefresh]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-tertiary text-sm animate-fade-in">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img src="/peep-icon.png" alt="" className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-secondary text-sm font-medium mb-1">No projects yet</p>
          <p className="text-tertiary text-xs max-w-[240px]">
            Add root folders in Settings to see your projects
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
        {projects.map((project) => (
          <ProjectCard
            key={`${project.root}/${project.path}`}
            name={project.name}
            path={project.path}
            root={project.root}
            project={project.project}
            createdAt={project.createdAt}
            lastModified={project.lastModified}
            onClick={() => onProjectSelect(project.root, project.path)}
            onDeleted={reload}
          />
        ))}
      </div>
    </div>
  );
}
