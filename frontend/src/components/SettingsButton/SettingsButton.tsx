import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Settings, Check, LayoutGrid, SlidersHorizontal } from "lucide-react";

interface SettingsButtonProps {
  statuses: string[];
  hiddenStatuses: string[];
  onHiddenStatusesChange: (hidden: string[]) => void;
  projectCounts: Record<string, number>;
  onSettingsOpen: () => void;
  onPeepsOpen: () => void;
}

export default function SettingsButton({
  statuses,
  hiddenStatuses,
  onHiddenStatusesChange,
  projectCounts,
  onSettingsOpen,
  onPeepsOpen,
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
        <Settings size={15} strokeWidth={1.8} />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropRef}
            className="fixed w-52 modal-glass z-[9999] animate-scale-in"
            style={{ top: pos.top, right: pos.right, background: "#2c2c2e" }}
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
                            <Check size={8} strokeWidth={3} className="text-white" />
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

            {/* Actions */}
            <div className="border-t border-border mx-2" />
            <div className="p-1">
              <button
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
                onClick={() => {
                  onPeepsOpen();
                  setOpen(false);
                }}
              >
                <LayoutGrid size={13} />
                <span className="font-medium">Peeps...</span>
              </button>
              <button
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
                onClick={() => {
                  onSettingsOpen();
                  setOpen(false);
                }}
              >
                <SlidersHorizontal size={13} />
                <span className="font-medium">All Settings...</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
