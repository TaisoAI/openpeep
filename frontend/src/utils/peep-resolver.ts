import { PeepManifest, FileData } from "./api";

/**
 * Resolve which peep should handle a given file.
 * Priority: user override > content match > filename > extension
 */
export function resolvePeep(
  file: FileData,
  peeps: PeepManifest[],
  overrides: Array<{ pattern: string; peep: string }> = []
): PeepManifest | null {
  // Level 5: User overrides
  for (const override of overrides) {
    if (matchesPattern(file.name, override.pattern)) {
      const found = peeps.find((p) => p.id === override.peep);
      if (found) return found;
    }
  }

  // Level 3: Content match (highest auto-match)
  const contentMatches = peeps.filter((p) => matchesContent(file, p));
  if (contentMatches.length > 0) {
    return pickBest(contentMatches);
  }

  // Level 2: Filename pattern
  const nameMatches = peeps.filter((p) =>
    (p.matches.fileNames || []).some((pattern) =>
      matchesPattern(file.name, pattern)
    )
  );
  if (nameMatches.length > 0) {
    return pickBest(nameMatches);
  }

  // Level 1: Extension
  const extMatches = peeps.filter((p) =>
    (p.matches.extensions || []).includes(file.ext)
  );
  if (extMatches.length > 0) {
    return pickBest(extMatches);
  }

  return null;
}

/** Pick the peep with highest priority */
function pickBest(peeps: PeepManifest[]): PeepManifest {
  return peeps.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
}

/** Simple glob matching (supports * wildcard) */
function matchesPattern(fileName: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    "i"
  );
  return regex.test(fileName);
}

/** Content-based matching */
function matchesContent(file: FileData, peep: PeepManifest): boolean {
  const cm = peep.matches.contentMatch;
  if (!cm || file.binary || !file.content) return false;

  const rules = (cm as { type: string; rules: Array<Record<string, unknown>> })
    .rules;
  if (!rules) return false;

  const type = (cm as { type: string }).type;

  if (type === "json" && file.ext === ".json") {
    try {
      const data = JSON.parse(file.content);
      return rules.every((rule) => matchJsonRule(data, rule));
    } catch {
      return false;
    }
  }

  if (type === "text") {
    return rules.every((rule) => matchTextRule(file.content!, rule));
  }

  if (type === "html" && file.ext === ".html") {
    return rules.every((rule) => matchHtmlRule(file.content!, rule));
  }

  return false;
}

function matchJsonRule(data: unknown, rule: Record<string, unknown>): boolean {
  const path = rule.path as string;
  if (!path) return false;

  const value = getNestedValue(data, path);

  if ("values" in rule) {
    return (rule.values as string[]).includes(value as string);
  }
  if ("exists" in rule) {
    return rule.exists ? value !== undefined : value === undefined;
  }
  return false;
}

function matchTextRule(
  content: string,
  rule: Record<string, unknown>
): boolean {
  if ("firstLine" in rule) {
    const firstLine = content.split("\n")[0] || "";
    return new RegExp(rule.firstLine as string).test(firstLine);
  }
  if ("contains" in rule) {
    return content.includes(rule.contains as string);
  }
  return false;
}

function matchHtmlRule(
  content: string,
  rule: Record<string, unknown>
): boolean {
  if ("meta" in rule) {
    const metaName = rule.meta as string;
    const regex = new RegExp(
      `<meta\\s+name=["']${metaName}["']\\s+content=["']([^"']+)["']`,
      "i"
    );
    const match = content.match(regex);
    if (!match) return false;
    if ("values" in rule) {
      return (rule.values as string[]).includes(match[1]);
    }
    if ("contains" in rule) {
      return match[1].includes(rule.contains as string);
    }
    return true;
  }
  return false;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
