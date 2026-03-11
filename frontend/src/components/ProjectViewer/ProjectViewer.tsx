import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/api";

interface ProjectViewerProps {
  filePath: string;
  onSaveStatus?: (status: string) => void;
  statuses?: string[];
}

interface ProjectData {
  status?: string;
  description?: string;
  type?: string;
  [key: string]: unknown;
}

const KNOWN_FIELDS = ["status", "description", "type"];

export default function ProjectViewer({ filePath, onSaveStatus, statuses = [] }: ProjectViewerProps) {
  const [data, setData] = useState<ProjectData | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    api.readFile(filePath).then((fileData) => {
      if (fileData.content) {
        try {
          setData(JSON.parse(fileData.content));
        } catch {
          setData(null);
        }
      }
    });
  }, [filePath]);

  const save = useCallback(async (updated: ProjectData) => {
    try {
      await api.saveFile(filePath, JSON.stringify(updated, null, 2));
      setData(updated);
      onSaveStatus?.("Saved");
    } catch {
      onSaveStatus?.("Save failed");
    }
  }, [filePath, onSaveStatus]);

  const handleFieldSave = useCallback((field: string) => {
    if (!data || editing !== field) return;
    const updated = { ...data, [field]: editValue };
    save(updated);
    setEditing(null);
  }, [data, editing, editValue, save]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!data) return;
    save({ ...data, status: newStatus });
  }, [data, save]);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-tertiary">Loading project metadata...</p>
      </div>
    );
  }

  const extraFields = Object.entries(data).filter(
    ([key]) => !KNOWN_FIELDS.includes(key)
  );

  return (
    <div className="flex-1 flex items-start justify-center p-8 overflow-y-auto">
      <div className="w-full max-w-lg space-y-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-[10px] text-tertiary uppercase tracking-wider font-semibold mb-1">
            Project Metadata
          </div>
          <div className="text-xs text-tertiary font-mono">{filePath.split("/").pop()}</div>
        </div>

        {/* Status */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(statuses.length > 0 ? statuses : ["Idea", "Planning", "In Progress", "Analyze", "Archive"]).map((s) => (
              <button
                key={s}
                className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  data.status === s
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-elevated border border-border-subtle text-secondary hover:text-primary hover:border-border"
                }`}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Description
          </label>
          {editing === "description" ? (
            <textarea
              className="w-full bg-elevated border border-accent/50 rounded-lg px-3 py-2 text-[13px] text-primary mt-2 outline-none resize-none min-h-[80px]"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) handleFieldSave("description");
                if (e.key === "Escape") setEditing(null);
              }}
              onBlur={() => handleFieldSave("description")}
              autoFocus
            />
          ) : (
            <p
              className="text-[13px] text-secondary mt-2 cursor-pointer hover:text-primary transition-colors min-h-[24px]"
              onClick={() => { setEditing("description"); setEditValue(data.description || ""); }}
            >
              {data.description || <span className="text-tertiary italic">Click to add description...</span>}
            </p>
          )}
        </div>

        {/* Type */}
        <div className="bg-surface border border-border-subtle rounded-xl p-4">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
            Type
          </label>
          {editing === "type" ? (
            <input
              className="w-full bg-elevated border border-accent/50 rounded-lg px-3 py-1.5 text-[13px] text-primary mt-2 outline-none"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFieldSave("type");
                if (e.key === "Escape") setEditing(null);
              }}
              onBlur={() => handleFieldSave("type")}
              autoFocus
            />
          ) : (
            <p
              className="text-[13px] text-secondary mt-2 cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setEditing("type"); setEditValue(data.type || ""); }}
            >
              {data.type || <span className="text-tertiary italic">Click to set type...</span>}
            </p>
          )}
        </div>

        {/* Extra fields (read-only display) */}
        {extraFields.length > 0 && extraFields.map(([key, value]) => (
          <div key={key} className="bg-surface border border-border-subtle rounded-xl p-4">
            <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
              {key}
            </label>
            <div className="mt-2">
              {renderValue(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderValue(value: unknown): React.ReactElement {
  // Array of objects → table
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
    const keys = Object.keys(value[0] as Record<string, unknown>);
    return (
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-elevated">
              {keys.map((k) => (
                <th key={k} className="text-left px-2.5 py-1.5 text-tertiary font-semibold border-b border-border-subtle">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((row, i) => {
              const obj = row as Record<string, unknown>;
              return (
                <tr key={i} className="border-b border-border-subtle last:border-0 hover:bg-hover transition-colors">
                  {keys.map((k) => (
                    <td key={k} className="px-2.5 py-1.5 text-secondary">
                      {typeof obj[k] === "boolean" ? (
                        <span className={obj[k] ? "text-emerald-400" : "text-tertiary"}>
                          {obj[k] ? "Yes" : "No"}
                        </span>
                      ) : typeof obj[k] === "object" ? (
                        JSON.stringify(obj[k])
                      ) : (
                        String(obj[k] ?? "")
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Simple array → comma list
  if (Array.isArray(value)) {
    return <span className="text-[11px] text-secondary">{value.map(String).join(", ")}</span>;
  }

  // Object → key-value pairs
  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-[11px] text-tertiary font-mono shrink-0">{k}:</span>
            <span className="text-[11px] text-secondary break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Primitive
  return <span className="text-[13px] text-secondary">{String(value)}</span>;
}
