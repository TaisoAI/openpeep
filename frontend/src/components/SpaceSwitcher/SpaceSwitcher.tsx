import { useState, useRef, useEffect } from "react";
import { Space } from "@/utils/api";
import { ChevronDown, Globe } from "lucide-react";

interface SpaceSwitcherProps {
  spaces: Space[];
  activeSpace: Space | null;
  onSelect: (space: Space | null) => void;
}

export default function SpaceSwitcher({
  spaces,
  activeSpace,
  onSelect,
}: SpaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-8 pill-glass text-sm text-primary"
      >
        <span className="text-base leading-none">{activeSpace?.icon || <Globe size={16} />}</span>
        <span className="font-medium text-xs">{activeSpace?.name || "All Spaces"}</span>
        <ChevronDown size={10} className={`text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 modal-glass z-50 overflow-hidden animate-scale-in" style={{ background: "#2c2c2e" }}>
          <div className="p-1">
            {spaces.map((space) => (
              <button
                key={space.name}
                className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2.5 transition-colors ${
                  activeSpace?.name === space.name
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:bg-hover hover:text-primary"
                }`}
                onClick={() => {
                  onSelect(space);
                  setOpen(false);
                }}
              >
                <span className="text-base leading-none">{space.icon}</span>
                <span className="font-medium flex-1">{space.name}</span>
                <span className="text-tertiary text-[10px]">
                  {space.roots.length} root{space.roots.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
            <button
              className={`w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2.5 transition-colors ${
                !activeSpace
                  ? "bg-accent/10 text-accent"
                  : "text-secondary hover:bg-hover hover:text-primary"
              }`}
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              <Globe size={16} />
              <span className="font-medium">All Spaces</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
