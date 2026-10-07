export interface ProjectCandidate {
  rootPath: string;
  workspaceRootPath: string;
  markers: string[];
}

const normalizePath = (value: string): string => {
  const normalized = value.replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized || "/";
};

const isWithin = (parent: string, child: string): boolean => {
  const normalizedParent = normalizePath(parent);
  const normalizedChild = normalizePath(child);
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  );
};

const depth = (value: string): number =>
  normalizePath(value)
    .split("/")
    .filter(Boolean).length;

const markerScore = (markers: string[]): number => {
  if (markers.includes("package.json")) return 50;
  if (markers.includes("pyproject.toml")) return 45;
  if (markers.includes("Pipfile")) return 40;
  if (markers.includes("requirements.txt")) return 35;
  if (markers.includes("tsconfig.json")) return 30;
  return 0;
};

export const selectProjectCandidate = (
  candidates: ProjectCandidate[],
  activeFilePath?: string,
): ProjectCandidate | undefined => {
  if (candidates.length === 0) return undefined;

  if (activeFilePath) {
    const activeMatches = candidates
      .filter((candidate) => isWithin(candidate.rootPath, activeFilePath))
      .sort(
        (left, right) =>
          depth(right.rootPath) - depth(left.rootPath) ||
          markerScore(right.markers) - markerScore(left.markers),
      );
    if (activeMatches[0]) return activeMatches[0];
  }

  const workspaceRoots = candidates.filter(
    (candidate) =>
      normalizePath(candidate.rootPath) ===
      normalizePath(candidate.workspaceRootPath),
  );
  if (workspaceRoots.length > 0) {
    return workspaceRoots.sort(
      (left, right) => markerScore(right.markers) - markerScore(left.markers),
    )[0];
  }

  if (candidates.length === 1) return candidates[0];

  return [...candidates].sort(
    (left, right) =>
      markerScore(right.markers) - markerScore(left.markers) ||
      depth(left.rootPath) - depth(right.rootPath) ||
      left.rootPath.localeCompare(right.rootPath),
  )[0];
};
