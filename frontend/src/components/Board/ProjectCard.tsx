interface ProjectCardProps {
  name: string;
  path: string;
  project?: Record<string, unknown>;
  createdAt?: string;
  lastModified?: string;
  onClick: () => void;
}

export default function ProjectCard({
  name,
  project,
  createdAt,
  lastModified,
  onClick,
}: ProjectCardProps) {
  const description = (project?.description as string) || "";
  const type = (project?.type as string) || "";

  return (
    <div
      className="card-glass radius-sm p-2.5 cursor-pointer transition-all group"
      onClick={onClick}
    >
      {createdAt && (
        <p className="text-[10px] text-tertiary font-mono mb-0.5">
          {formatDate(createdAt)}
        </p>
      )}
      <h3 className="font-medium text-primary text-[13px] truncate group-hover:text-accent transition-colors">
        {formatProjectName(name)}
      </h3>
      {description && (
        <p className="text-[11px] text-tertiary mt-1 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
      {lastModified && (
        <p className="text-[10px] text-tertiary/60 font-mono mt-1" title={`Last modified: ${new Date(lastModified).toLocaleString()}`}>
          {formatRelativeTime(lastModified)}
        </p>
      )}
      {type && (
        <span className="inline-block text-[10px] bg-surface text-tertiary px-1.5 py-0.5 rounded font-medium mt-1">
          {type}
        </span>
      )}
    </div>
  );
}

function formatProjectName(folderName: string): string {
  const withoutDate = folderName.replace(/^\d{4}-\d{2}-\d{2}_/, "");
  return withoutDate
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
