"use client";

import { useState, useEffect } from "react";
import { api, PeepManifest } from "@/utils/api";

interface PeepHubProps {
  open: boolean;
  onClose: () => void;
}

export default function PeepHub({ open, onClose }: PeepHubProps) {
  const [peeps, setPeeps] = useState<PeepManifest[]>([]);
  const [tab, setTab] = useState<"installed" | "browse">("installed");

  useEffect(() => {
    if (open) {
      api.listPeeps().then(({ peeps }) => setPeeps(peeps));
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-glass border border-border radius w-[580px] max-h-[75vh] flex flex-col shadow-2xl shadow-black/50 animate-scale-in">
        {/* Header */}
        <div className="flex items-center px-5 py-3.5 border-b border-border">
          <img src="/peep-icon.png" alt="" className="w-5 h-5 mr-2" />
          <span className="text-sm font-semibold">Peeps</span>
          <div className="flex ml-3 h-7 bg-surface rounded-lg overflow-hidden border border-border-subtle">
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "installed"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("installed")}
            >
              Installed
            </button>
            <button
              className={`px-3 text-[11px] font-medium transition-all ${
                tab === "browse"
                  ? "bg-accent/15 text-accent"
                  : "text-secondary hover:text-primary"
              }`}
              onClick={() => setTab("browse")}
            >
              Browse
            </button>
          </div>
          <span className="flex-1" />
          <button
            className="w-6 h-6 flex items-center justify-center text-tertiary hover:text-primary rounded-md hover:bg-hover transition-all"
            onClick={onClose}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "installed" && (
            <div className="space-y-1">
              {peeps.map((peep) => (
                <div
                  key={peep.id}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-hover transition-colors"
                >
                  <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center text-lg border border-border-subtle">
                    🐥
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-primary">
                      {peep.name}
                    </div>
                    <div className="text-[11px] text-tertiary mt-0.5">
                      v{peep.version} · {peep.capabilities.join(", ")}
                    </div>
                  </div>
                  <div>
                    {peep.builtin ? (
                      <span className="text-[10px] text-tertiary bg-surface border border-border-subtle px-2 py-0.5 rounded-full font-medium">
                        Built-in
                      </span>
                    ) : (
                      <button
                        className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                        onClick={async () => {
                          await api.uninstallPeep(peep.id);
                          setPeeps((prev) =>
                            prev.filter((p) => p.id !== peep.id)
                          );
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "browse" && (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <img
                  src="/peep-icon.png"
                  alt=""
                  className="w-12 h-12 mx-auto mb-3 opacity-20"
                />
                <p className="text-sm text-secondary font-medium">
                  PeepHub coming soon
                </p>
                <p className="text-[11px] text-tertiary mt-1">
                  Community peeps marketplace at peephub.ai
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
