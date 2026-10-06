import { parse as parseYaml } from "yaml";

export type NodePackageManager = "npm" | "pnpm" | "yarn";

export interface ResolvedPackage {
  name: string;
  version: string;
  peerDependencies: Record<string, string>;
  optionalPeers: Set<string>;
  deprecated?: string;
}

export interface LockfileAnalysis {
  manager: NodePackageManager;
  source: string;
  packages: ResolvedPackage[];
}

interface NpmLockPackage {
  version?: string;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  deprecated?: string;
}

interface NpmLock {
  packages?: Record<string, NpmLockPackage>;
}

const packageNameFromNodeModulesPath = (path: string): string | undefined => {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  return index < 0 ? undefined : path.slice(index + marker.length);
};

export const parseNpmLock = (text: string): LockfileAnalysis => {
  const lock = JSON.parse(text) as NpmLock;
  const packages: ResolvedPackage[] = [];

  for (const [path, metadata] of Object.entries(lock.packages ?? {})) {
    const name = packageNameFromNodeModulesPath(path);
    if (!name || !metadata.version) continue;

    const optionalPeers = new Set(
      Object.entries(metadata.peerDependenciesMeta ?? {})
        .filter(([, value]) => value.optional === true)
        .map(([peer]) => peer),
    );

    packages.push({
      name,
      version: metadata.version,
      peerDependencies: metadata.peerDependencies ?? {},
      optionalPeers,
      ...(metadata.deprecated ? { deprecated: metadata.deprecated } : {}),
    });
  }

  return { manager: "npm", source: "package-lock.json", packages };
};

const parsePnpmPackageKey = (key: string): { name: string; version: string } | undefined => {
  const cleaned = key.replace(/^\//, "").split("(")[0] ?? "";
  const lastAt = cleaned.lastIndexOf("@");

  if (lastAt > 0) {
    const name = cleaned.slice(0, lastAt);
    const version = cleaned.slice(lastAt + 1);
    if (name && version) return { name, version };
  }

  const slashVersion = cleaned.match(/^(.+)\/(\d+[^/]*)$/);
  return slashVersion?.[1] && slashVersion[2]
    ? { name: slashVersion[1], version: slashVersion[2] }
    : undefined;
};

export const parsePnpmLock = (text: string): LockfileAnalysis => {
  const lock = parseYaml(text) as {
    packages?: Record<string, unknown>;
    snapshots?: Record<string, unknown>;
  };

  const keys = new Set([
    ...Object.keys(lock.packages ?? {}),
    ...Object.keys(lock.snapshots ?? {}),
  ]);

  const packages = [...keys].flatMap((key) => {
    const parsed = parsePnpmPackageKey(key);
    return parsed
      ? [{
          ...parsed,
          peerDependencies: {},
          optionalPeers: new Set<string>(),
        }]
      : [];
  });

  return { manager: "pnpm", source: "pnpm-lock.yaml", packages };
};

const packageNameFromYarnSelector = (selector: string): string | undefined => {
  const clean = selector.trim().replace(/^"|"$/g, "");
  const npmIndex = clean.indexOf("@npm:");
  if (npmIndex > 0) return clean.slice(0, npmIndex);

  const lastAt = clean.lastIndexOf("@");
  return lastAt > 0 ? clean.slice(0, lastAt) : undefined;
};

export const parseYarnLock = (text: string): LockfileAnalysis => {
  const packages: ResolvedPackage[] = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line || /^\s/.test(line) || line.startsWith("#") || !line.endsWith(":")) continue;

    const firstSelector = line.slice(0, -1).split(",")[0];
    const name = firstSelector ? packageNameFromYarnSelector(firstSelector) : undefined;
    if (!name) continue;

    let version: string | undefined;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const detail = lines[cursor] ?? "";
      if (detail && !/^\s/.test(detail)) break;

      const match = detail.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
      if (match?.[1]) {
        version = match[1];
        break;
      }
    }

    if (version) {
      packages.push({
        name,
        version,
        peerDependencies: {},
        optionalPeers: new Set<string>(),
      });
    }
  }

  return { manager: "yarn", source: "yarn.lock", packages };
};

export const groupResolvedVersions = (
  packages: ResolvedPackage[],
): Map<string, Set<string>> => {
  const versions = new Map<string, Set<string>>();

  for (const pkg of packages) {
    const bucket = versions.get(pkg.name) ?? new Set<string>();
    bucket.add(pkg.version);
    versions.set(pkg.name, bucket);
  }

  return versions;
};
