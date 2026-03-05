import { useEffect, useRef } from "react";
import { api, FileData, PeepManifest } from "@/utils/api";
import ProjectViewer from "@/components/ProjectViewer/ProjectViewer";

interface PreviewPaneProps {
  file: FileData | null;
  peep: PeepManifest | null;
  onSaveStatus?: (status: string) => void;
  statuses?: string[];
}

export default function PreviewPane({
  file,
  peep,
  onSaveStatus,
  statuses,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const fileRef = useRef(file);
  fileRef.current = file;

  const peepRef = useRef(peep);
  peepRef.current = peep;

  function injectTheme() {
    if (!iframeRef.current) return;
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
        const existing = doc.getElementById('peep-theme');
        if (existing) existing.remove();
        const style = doc.createElement('style');
        style.id = 'peep-theme';
        style.textContent = css;
        doc.head.appendChild(style);
      }
    } catch { /* cross-origin fallback */ }
  }

  function sendFileToIframe(f: FileData) {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      {
        type: "peep:init",
        filePath: f.path,
        content: f.content || null,
        fileName: f.name,
        ext: f.ext,
        binary: f.binary,
      },
      "*"
    );
  }

  // When iframe loads for the first time, inject theme and send current file
  function handleIframeLoad() {
    iframeReady.current = true;
    injectTheme();
    if (fileRef.current) {
      sendFileToIframe(fileRef.current);
    }
  }

  // Reset iframeReady when peep changes (iframe remounts via key)
  useEffect(() => {
    iframeReady.current = false;
  }, [peep?.id]);

  // When file changes and iframe is already loaded, send new data
  useEffect(() => {
    if (iframeReady.current && file) {
      sendFileToIframe(file);
    }
  }, [file]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { source, type, ...payload } = event.data || {};
      if (source !== "peep") return;

      switch (type) {
        case "peep:save":
          if (fileRef.current) {
            try {
              await api.saveFile(fileRef.current.path, payload.content);
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
  }, [onSaveStatus]);

  // No file selected — show placeholder
  if (!file) {
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

  // project.json — use built-in ProjectViewer
  if (file.name === "project.json") {
    return (
      <ProjectViewer
        filePath={file.path}
        onSaveStatus={onSaveStatus}
        statuses={statuses}
      />
    );
  }

  // No peep matched — show placeholder
  if (!peep) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img
            src="/peep-icon.png"
            alt=""
            className="w-12 h-12 mx-auto mb-3 opacity-15"
          />
          <p className="text-xs text-tertiary">No viewer available for this file type</p>
        </div>
      </div>
    );
  }

  const iframeSrc = api.peepFileUrl(peep.id, peep.entry);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <iframe
        key={peep.id}
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
