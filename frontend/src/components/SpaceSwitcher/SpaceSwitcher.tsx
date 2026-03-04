"use client";

import { useState, useRef, useEffect } from "react";
import { Space } from "@/utils/api";

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
        className="flex items-center gap-2 px-2.5 h-7 rounded-lg bg-elevated hover:bg-hover border border-border-subtle text-sm text-primary transition-all"
      >
        <span className="text-base leading-none">{activeSpace?.icon || "🌐"}</span>
        <span className="font-medium text-xs">{activeSpace?.name || "All Spaces"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-elevated border border-border rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-scale-in">
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
          </div>
          <div className="border-t border-border mx-1" />
          <div className="p-1">
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
              <span className="text-base leading-none">🌐</span>
              <span className="font-medium">All Spaces</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
