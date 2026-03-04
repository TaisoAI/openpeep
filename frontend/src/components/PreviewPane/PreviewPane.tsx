"use client";

import { useEffect, useRef, useCallback } from "react";
import { api, FileData, PeepManifest } from "@/utils/api";

interface PreviewPaneProps {
  file: FileData | null;
  peep: PeepManifest | null;
  onSaveStatus?: (status: string) => void;
}

export default function PreviewPane({
  file,
  peep,
  onSaveStatus,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current || !file || !peep) return;

    // Inject host theme CSS variables into the iframe
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const vars = [
        '--bg-app', '--bg-toolbar', '--bg-surface', '--bg-elevated',
        '--bg-hover', '--bg-input', '--border', '--border-subtle',
        '--text-primary', '--text-secondary', '--text-tertiary',
        '--accent', '--accent-hover',
      ];
      const css = `:root { ${vars.map(v => `${v}: ${rootStyles.getPropertyValue(v).trim()}`).join('; ')}; }
        body { background: var(--bg-app) !important; color: var(--text-primary) !important; }`;
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        const style = doc.createElement('style');
        style.id = 'peep-theme';
        style.textContent = css;
        doc.head.appendChild(style);
      }
    } catch { /* cross-origin fallback — peep uses its own colors */ }

    iframeRef.current.contentWindow?.postMessage(
      {
        type: "peep:init",
        filePath: file.path,
        content: file.content || null,
        fileName: file.name,
        ext: file.ext,
        binary: file.binary,
      },
      "*"
    );
  }, [file, peep]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { source, type, ...payload } = event.data || {};
      if (source !== "peep") return;

      switch (type) {
        case "peep:save":
          if (file) {
            try {
              await api.saveFile(file.path, payload.content);
              onSaveStatus?.("Saved");
            } catch {
              onSaveStatus?.("Save failed");
            }
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [file, onSaveStatus]);

  if (!file || !peep) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img
            src="/peep-icon.png"
            alt=""
            className="w-12 h-12 mx-auto mb-3 opacity-15"
          />
          <p className="text-xs text-tertiary">Select a file to preview</p>
        </div>
      </div>
    );
  }

  const iframeSrc = api.peepFileUrl(peep.id, peep.entry);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="flex-1 border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`${peep.name}: ${file.name}`}
      />
    </div>
  );
}
