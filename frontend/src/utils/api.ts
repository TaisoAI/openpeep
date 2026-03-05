const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  // Sources / Spaces
  getSources: () =>
    fetchJSON<{
      spaces: Space[];
      defaultStatuses: string[];
      theme: ThemeConfig;
      showHiddenFiles: boolean;
      devMode: boolean;
      peephub: { url: string; apiKey?: string };
    }>("/sources"),

  updateSources: (payload: {
    spaces?: Space[];
    defaultStatuses?: string[];
    theme?: ThemeConfig;
    showHiddenFiles?: boolean;
    devMode?: boolean;
    peephub?: { url: string; apiKey?: string };
  }) =>
    fetchJSON<{ saved: boolean }>("/sources", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // Files
  listFiles: (root: string, path = "", showHidden = false, sort: FileSortField = "name", sortDir?: SortDirection) => {
    let url = `/files?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}&showHidden=${showHidden}&sort=${sort}`;
    if (sortDir) url += `&sortDir=${sortDir}`;
    return fetchJSON<{ entries: FileEntry[] }>(url);
  },

  readFile: (path: string) =>
    fetchJSON<FileData>(`/file?path=${encodeURIComponent(path)}`),

  saveFile: (path: string, content: string) =>
    fetchJSON<{ saved: boolean }>("/file", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  pickFolder: () => fetchJSON<{ path: string | null }>("/pick-folder"),

  updateProjectStatus: (root: string, path: string, status: string) =>
    fetchJSON<{ saved: boolean }>("/project-status", {
      method: "PUT",
      body: JSON.stringify({ root, path, status }),
    }),

  deleteFile: (path: string) =>
    fetchJSON<{ deleted: boolean }>(`/file?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),

  renameFile: (path: string, newName: string) =>
    fetchJSON<{ renamed: boolean; newPath: string }>("/file/rename", {
      method: "PUT",
      body: JSON.stringify({ path, newName }),
    }),

  rawFileUrl: (path: string) =>
    `${API_BASE}/file/raw?path=${encodeURIComponent(path)}`,

  // Peeps
  listPeeps: (root?: string) => {
    let url = "/peeps";
    if (root) url += `?root=${encodeURIComponent(root)}`;
    return fetchJSON<{ peeps: PeepManifest[] }>(url);
  },

  peepFileUrl: (peepId: string, filePath: string, root?: string) => {
    let url = `${API_BASE}/peeps/${peepId}/${filePath}?v=${Date.now()}`;
    if (root) url += `&root=${encodeURIComponent(root)}`;
    return url;
  },

  uninstallPeep: (peepId: string) =>
    fetchJSON<{ uninstalled: boolean }>(`/peeps/${peepId}`, {
      method: "DELETE",
    }),

  browsePeepHub: (params?: { q?: string; category?: string; sort?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.category) sp.set("category", params.category);
    if (params?.sort) sp.set("sort", params.sort);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return fetchJSON<PeepHubBrowseResponse>(`/peephub/browse${qs ? `?${qs}` : ""}`);
  },

  getPeepSamples: (peepId: string) =>
    fetchJSON<{ files: { name: string; content: string | null; binary?: boolean }[]; hasScreenshot: boolean }>(`/peep-samples/${peepId}`),

  installPeep: (slug: string, version?: string) =>
    fetchJSON<{ installed: boolean; id: string; version: string }>("/peeps/install", {
      method: "POST",
      body: JSON.stringify({ slug, version }),
    }),

  publishPeep: (peepPath: string, category?: string, tags?: string[]) =>
    fetchJSON<{ peep: Record<string, unknown>; version: Record<string, unknown> }>("/peeps/publish", {
      method: "POST",
      body: JSON.stringify({ peepPath, category: category || "viewer", tags: tags || [] }),
    }),

  // Session
  getSession: () => fetchJSON<SessionState>("/session"),

  saveSession: (session: SessionState) =>
    fetchJSON<{ saved: boolean }>("/session", {
      method: "PUT",
      body: JSON.stringify(session),
    }),
};

// Types
export interface Space {
  name: string;
  icon: string;
  accentColor?: string;
  roots: string[];
  statuses: string[];
  hiddenStatuses?: string[];
}

export interface SessionState {
  view?: string;
  spaceName?: string | null;
  browseRoot?: string;
  selectedPath?: string;
  expandedPaths?: string[];
}

export interface ThemeConfig {
  mode: "light" | "dark" | "auto";
  style: "macos" | "windows" | "linux";
  showLogo?: boolean;
}

export type FileSortField = "name" | "modified" | "created" | "size" | "type";
export type SortDirection = "asc" | "desc";

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number | null;
  project?: Record<string, unknown>;
  createdAt?: string;
  lastModified?: string;
}

export interface FileData {
  path: string;
  name: string;
  ext: string;
  content?: string;
  binary: boolean;
  size: number;
}

export interface PeepManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  builtin: boolean;
  priority: number;
  capabilities: string[];
  matches: {
    extensions?: string[];
    fileNames?: string[];
    contentMatch?: Record<string, unknown>;
  };
  bundle?: Record<string, unknown>;
  tools?: Array<{
    id: string;
    label: string;
    command: string;
    args: string[];
  }>;
  settings?: Record<string, unknown>;
  _path?: string;
  _tier?: "builtin" | "installed" | "project";
}

export interface PeepHubEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  tags: string[];
  latestVersion: string;
  totalDownloads: number;
  featured: boolean;
  author: { name: string; avatarUrl?: string };
}

export interface PeepHubBrowseResponse {
  peeps: PeepHubEntry[];
  total: number;
  page: number;
  pages: number;
}
