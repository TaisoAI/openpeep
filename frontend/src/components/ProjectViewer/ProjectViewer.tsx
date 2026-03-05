import { useState, useEffect, useCallback } from "react";
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
        {extraFields.length > 0 && (
          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">
              Other Fields
            </label>
            <div className="space-y-2 mt-2">
              {extraFields.map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[11px] text-tertiary font-mono shrink-0">{key}:</span>
                  <span className="text-[11px] text-secondary font-mono break-all">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
