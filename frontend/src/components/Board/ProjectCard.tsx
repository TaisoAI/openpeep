interface ProjectCardProps {
  name: string;
  path: string;
  project?: Record<string, unknown>;
  onClick: () => void;
}

export default function ProjectCard({
  name,
  project,
  onClick,
}: ProjectCardProps) {
  const description = (project?.description as string) || "";
  const type = (project?.type as string) || "";

  return (
    <div
      className="card-glass radius-sm p-2.5 cursor-pointer transition-all group"
      onClick={onClick}
    >
      <h3 className="font-medium text-primary text-[13px] truncate group-hover:text-accent transition-colors">
        {formatProjectName(name)}
      </h3>
      {description && (
        <p className="text-[11px] text-tertiary mt-1 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
      {type && (
        <span className="inline-block text-[10px] bg-surface text-tertiary px-1.5 py-0.5 rounded mt-1.5 font-medium">
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
