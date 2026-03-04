import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface SettingsButtonProps {
  statuses: string[];
  hiddenStatuses: string[];
  onHiddenStatusesChange: (hidden: string[]) => void;
  projectCounts: Record<string, number>;
  onSettingsOpen: () => void;
}

export default function SettingsButton({
  statuses,
  hiddenStatuses,
  onHiddenStatusesChange,
  projectCounts,
  onSettingsOpen,
}: SettingsButtonProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Position dropdown below button, right-aligned to viewport edge
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: 12,
    });
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleColumn = useCallback(
    (status: string) => {
      const next = hiddenStatuses.includes(status)
        ? hiddenStatuses.filter((s) => s !== status)
        : [...hiddenStatuses, status];
      if (next.length >= statuses.length) return;
      onHiddenStatusesChange(next);
    },
    [hiddenStatuses, statuses, onHiddenStatusesChange]
  );

  const hiddenCount = hiddenStatuses.length;

  return (
    <>
      <button
        ref={btnRef}
        className={`w-8 h-8 flex items-center justify-center pill-glass transition-colors ${
          open || hiddenCount > 0
            ? "text-accent"
            : "text-secondary hover:text-primary"
        }`}
        onClick={() => setOpen(!open)}
        title="Settings"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={dropRef}
            className="fixed w-52 modal-glass z-[9999] animate-scale-in"
            style={{ top: pos.top, right: pos.right, background: "#1c1c24" }}
          >
            {/* Column visibility */}
            {statuses.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">
                    Columns
                  </span>
                </div>
                <div className="px-1 pb-1">
                  {statuses.map((status) => {
                    const visible = !hiddenStatuses.includes(status);
                    const count = projectCounts[status] || 0;
                    return (
                      <button
                        key={status}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-hover transition-colors"
                        onClick={() => toggleColumn(status)}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all ${
                            visible
                              ? "bg-accent border-accent"
                              : "border-border-subtle"
                          }`}
                        >
                          {visible && (
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={`text-xs flex-1 ${
                            visible ? "text-primary" : "text-tertiary"
                          }`}
                        >
                          {status}
                        </span>
                        <span className="text-[10px] text-tertiary font-mono">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Open full settings */}
            <div className="border-t border-border mx-2" />
            <div className="p-1">
              <button
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
                onClick={() => {
                  onSettingsOpen();
                  setOpen(false);
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                <span className="font-medium">All Settings...</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
