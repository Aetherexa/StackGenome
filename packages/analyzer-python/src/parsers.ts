import { parse as parseToml } from "smol-toml";
import type { PackageScope } from "@stackgenome/contracts";
import { normalizePythonPackageName } from "./knowledge.js";

export interface DependencyDeclaration {
  name: string;
  constraint?: string;
  scope: PackageScope;
  source: string;
}

export interface ResolvedPythonPackage {
  name: string;
  version: string;
  source: string;
}

interface PyProject {
  project?: {
    name?: string;
    "requires-python"?: string;
    dependencies?: string[];
    "optional-dependencies"?: Record<string, string[]>;
  };
  "dependency-groups"?: Record<string, string[]>;
  tool?: {
    poetry?: {
      name?: string;
      dependencies?: Record<string, unknown>;
      "dev-dependencies"?: Record<string, unknown>;
      group?: Record<string, { dependencies?: Record<string, unknown> }>;
    };
    uv?: Record<string, unknown>;
  };
}

const splitRequirement = (
  requirement: string,
): { name: string; constraint?: string } | undefined => {
  const withoutMarker = requirement.split(";")[0]?.trim() ?? "";
  if (!withoutMarker || withoutMarker.startsWith("-")) return undefined;

  const match = withoutMarker.match(
    /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]+\])?\s*(.*)$/,
  );
  if (!match?.[1]) return undefined;

  const constraint = match[2]?.trim();
  return {
    name: normalizePythonPackageName(match[1]),
    ...(constraint ? { constraint } : {}),
  };
};

const poetryConstraint = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof (value as { version?: unknown }).version === "string"
  ) {
    return (value as { version: string }).version;
  }
  return undefined;
};

const pushPoetryDependencies = (
  target: DependencyDeclaration[],
  dependencies: Record<string, unknown> | undefined,
  scope: PackageScope,
  source: string,
): void => {
  for (const [rawName, value] of Object.entries(dependencies ?? {})) {
    const name = normalizePythonPackageName(rawName);
    if (name === "python") continue;

    const constraint = poetryConstraint(value);
    target.push({
      name,
      scope,
      source,
      ...(constraint ? { constraint } : {}),
    });
  }
};

export const parsePyProject = (
  text: string,
): {
  name?: string;
  requiresPython?: string;
  declarations: DependencyDeclaration[];
  managerHints: string[];
} => {
  const parsed = parseToml(text, {
    unsafeKeyBehaviour: "throw",
  }) as unknown as PyProject;
  const declarations: DependencyDeclaration[] = [];

  for (const requirement of parsed.project?.dependencies ?? []) {
    const dependency = splitRequirement(requirement);
    if (dependency) {
      declarations.push({
        ...dependency,
        scope: "runtime",
        source: "pyproject.toml#project.dependencies",
      });
    }
  }

  for (const [group, requirements] of Object.entries(
    parsed.project?.["optional-dependencies"] ?? {},
  )) {
    for (const requirement of requirements) {
      const dependency = splitRequirement(requirement);
      if (dependency) {
        declarations.push({
          ...dependency,
          scope: group.toLowerCase().includes("dev")
            ? "development"
            : "optional",
          source: `pyproject.toml#project.optional-dependencies.${group}`,
        });
      }
    }
  }

  for (const [group, requirements] of Object.entries(
    parsed["dependency-groups"] ?? {},
  )) {
    for (const requirement of requirements) {
      const dependency = splitRequirement(requirement);
      if (dependency) {
        declarations.push({
          ...dependency,
          scope: group.toLowerCase().includes("dev")
            ? "development"
            : "optional",
          source: `pyproject.toml#dependency-groups.${group}`,
        });
      }
    }
  }

  pushPoetryDependencies(
    declarations,
    parsed.tool?.poetry?.dependencies,
    "runtime",
    "pyproject.toml#tool.poetry.dependencies",
  );
  pushPoetryDependencies(
    declarations,
    parsed.tool?.poetry?.["dev-dependencies"],
    "development",
    "pyproject.toml#tool.poetry.dev-dependencies",
  );

  for (const [group, config] of Object.entries(
    parsed.tool?.poetry?.group ?? {},
  )) {
    pushPoetryDependencies(
      declarations,
      config.dependencies,
      group.toLowerCase().includes("dev") ? "development" : "optional",
      `pyproject.toml#tool.poetry.group.${group}.dependencies`,
    );
  }

  const managerHints: string[] = [];
  if (parsed.tool?.poetry) managerHints.push("poetry");
  if (parsed.tool?.uv) managerHints.push("uv");

  const name = parsed.project?.name ?? parsed.tool?.poetry?.name;
  const requiresPython = parsed.project?.["requires-python"];

  return {
    ...(name ? { name } : {}),
    ...(requiresPython ? { requiresPython } : {}),
    declarations,
    managerHints,
  };
};

export const parseRequirements = (
  text: string,
  source = "requirements.txt",
  scope: PackageScope = "runtime",
): DependencyDeclaration[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, "").trim())
    .filter(
      (line) =>
        Boolean(line) &&
        !line.startsWith("#") &&
        !line.startsWith("-r ") &&
        !line.startsWith("--requirement ") &&
        !line.startsWith("-c ") &&
        !line.startsWith("--constraint "),
    )
    .flatMap((line) => {
      const parsed = splitRequirement(line);
      return parsed
        ? [{ ...parsed, scope, source }]
        : [];
    });

interface Pipfile {
  packages?: Record<string, unknown>;
  "dev-packages"?: Record<string, unknown>;
  requires?: {
    python_version?: string;
    python_full_version?: string;
  };
}

export const parsePipfile = (
  text: string,
): {
  declarations: DependencyDeclaration[];
  requiresPython?: string;
} => {
  const parsed = parseToml(text, {
    unsafeKeyBehaviour: "throw",
  }) as unknown as Pipfile;
  const declarations: DependencyDeclaration[] = [];

  for (const [rawName, value] of Object.entries(parsed.packages ?? {})) {
    const constraint =
      typeof value === "string"
        ? value
        : typeof value === "object" &&
            value !== null &&
            "version" in value &&
            typeof (value as { version?: unknown }).version === "string"
          ? (value as { version: string }).version
          : undefined;

    declarations.push({
      name: normalizePythonPackageName(rawName),
      scope: "runtime",
      source: "Pipfile#packages",
      ...(constraint ? { constraint } : {}),
    });
  }

  for (const [rawName, value] of Object.entries(
    parsed["dev-packages"] ?? {},
  )) {
    const constraint =
      typeof value === "string"
        ? value
        : typeof value === "object" &&
            value !== null &&
            "version" in value &&
            typeof (value as { version?: unknown }).version === "string"
          ? (value as { version: string }).version
          : undefined;

    declarations.push({
      name: normalizePythonPackageName(rawName),
      scope: "development",
      source: "Pipfile#dev-packages",
      ...(constraint ? { constraint } : {}),
    });
  }

  const requiresPython =
    parsed.requires?.python_full_version ?? parsed.requires?.python_version;

  return {
    declarations,
    ...(requiresPython ? { requiresPython } : {}),
  };
};

interface LockPackage {
  name?: string;
  version?: string;
}

export const parseTomlLockPackages = (
  text: string,
  source: "poetry.lock" | "uv.lock",
): ResolvedPythonPackage[] => {
  const parsed = parseToml(text, {
    unsafeKeyBehaviour: "throw",
  }) as unknown as { package?: LockPackage[] };

  return (parsed.package ?? []).flatMap((pkg) =>
    pkg.name && pkg.version
      ? [{
          name: normalizePythonPackageName(pkg.name),
          version: pkg.version,
          source,
        }]
      : [],
  );
};

export const parsePipfileLock = (text: string): ResolvedPythonPackage[] => {
  const parsed = JSON.parse(text) as {
    default?: Record<string, { version?: string }>;
    develop?: Record<string, { version?: string }>;
  };

  const packages: ResolvedPythonPackage[] = [];
  for (const section of [parsed.default, parsed.develop]) {
    for (const [rawName, metadata] of Object.entries(section ?? {})) {
      const version = metadata.version?.replace(/^==/, "");
      if (!version) continue;
      packages.push({
        name: normalizePythonPackageName(rawName),
        version,
        source: "Pipfile.lock",
      });
    }
  }

  return packages;
};

export const exactPinnedVersion = (
  constraint: string | undefined,
): string | undefined => {
  if (!constraint) return undefined;
  const match = constraint.trim().match(/^==\s*([^,;\s]+)$/);
  return match?.[1];
};
