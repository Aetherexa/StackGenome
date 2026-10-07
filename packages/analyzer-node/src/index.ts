import { satisfies, valid } from "semver";
import type {
  AnalyzerContext,
  Capability,
  EcosystemAnalyzer,
  EcosystemFinding,
  EcosystemPackage,
  PackageHealth,
  ProjectEcosystem,
  Technology,
} from "@stackgenome/contracts";
import { CAPABILITY_NAMES, PACKAGE_KNOWLEDGE } from "./knowledge.js";
import {
  type LockfileAnalysis,
  type NodePackageManager,
  type ResolvedPackage,
  groupResolvedVersions,
  parseNpmLock,
  parsePnpmLock,
  parseYarnLock,
} from "./lockfiles.js";

interface PackageManifest {
  name?: string;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  packageManager?: string;
}

const FRAMEWORKS = new Map<string, string>([
  ["react", "React"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["next", "Next.js"],
  ["svelte", "Svelte"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["@nestjs/core", "NestJS"],
]);

const BUILD_TOOLS = new Map<string, string>([
  ["vite", "Vite"],
  ["webpack", "Webpack"],
  ["rollup", "Rollup"],
  ["esbuild", "esbuild"],
]);

const parseJson = <T>(text: string, fileName: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Unable to parse ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const parseDeclaredManager = (
  packageManager: string | undefined,
): { name: NodePackageManager; version?: string } | undefined => {
  if (!packageManager) return undefined;

  const separator = packageManager.lastIndexOf("@");
  const rawName = separator > 0 ? packageManager.slice(0, separator) : packageManager;
  if (rawName !== "npm" && rawName !== "pnpm" && rawName !== "yarn") return undefined;

  const version = separator > 0 ? packageManager.slice(separator + 1) : undefined;
  return { name: rawName, ...(version ? { version } : {}) };
};

const chooseLockfile = async (
  context: AnalyzerContext,
  preferred: NodePackageManager | undefined,
): Promise<{
  lockfile?: LockfileAnalysis;
  findings: EcosystemFinding[];
}> => {
  const readers: Record<
    NodePackageManager,
    { file: string; parse: (text: string) => LockfileAnalysis }
  > = {
    npm: { file: "package-lock.json", parse: parseNpmLock },
    pnpm: { file: "pnpm-lock.yaml", parse: parsePnpmLock },
    yarn: { file: "yarn.lock", parse: parseYarnLock },
  };

  const order = preferred
    ? [preferred, ...(["npm", "pnpm", "yarn"] as const).filter((name) => name !== preferred)]
    : (["npm", "pnpm", "yarn"] as const);

  const findings: EcosystemFinding[] = [];

  for (const manager of order) {
    const reader = readers[manager];
    if (!(await context.reader.exists(reader.file))) continue;

    try {
      return {
        lockfile: reader.parse(await context.reader.readText(reader.file)),
        findings,
      };
    } catch (error) {
      findings.push({
        id: `lockfile-parse:${reader.file}`,
        code: "lockfile-parse-failed",
        severity: "warning",
        title: "Lockfile could not be parsed",
        message: `${reader.file} could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        recommendation:
          "Regenerate the lockfile or verify it is valid. StackGenome continued with manifest-level analysis.",
      });
    }
  }

  return { findings };
};

const declaredSections = (
  manifest: PackageManifest,
): Array<[EcosystemPackage["scope"], Record<string, string> | undefined]> => [
  ["runtime", manifest.dependencies],
  ["development", manifest.devDependencies],
  ["peer", manifest.peerDependencies],
  ["optional", manifest.optionalDependencies],
];

const packageHealth = (
  packageId: string,
  name: string,
  findings: EcosystemFinding[],
): PackageHealth => {
  const related = findings.filter(
    (finding) =>
      finding.packageId === packageId ||
      (!finding.packageId && finding.packageName === name),
  );
  if (related.some((finding) => finding.severity === "error")) return "error";
  if (related.some((finding) => finding.severity === "warning")) return "warning";
  return related.length > 0 ? "healthy" : "healthy";
};

const createDirectPackages = (
  manifest: PackageManifest,
  versions: Map<string, Set<string>>,
): EcosystemPackage[] => {
  const packages = new Map<string, EcosystemPackage>();

  for (const [scope, dependencies] of declaredSections(manifest)) {
    for (const [name, declaredVersion] of Object.entries(dependencies ?? {})) {
      if (packages.has(name)) continue;

      const knowledge = PACKAGE_KNOWLEDGE[name];
      packages.set(name, {
        id: `npm:${name}`,
        name,
        ecosystem: "npm",
        scope,
        direct: true,
        declaredVersion,
        resolvedVersions: [...(versions.get(name) ?? [])].sort(),
        health: "healthy",
        ...(knowledge?.purpose ? { purpose: knowledge.purpose } : {}),
        ...(knowledge?.category ? { category: knowledge.category } : {}),
        ...(knowledge?.guidance ? { guidance: knowledge.guidance } : {}),
      });
    }
  }

  return [...packages.values()];
};

const createTransitivePackages = (
  resolvedPackages: ResolvedPackage[],
  directNames: Set<string>,
): EcosystemPackage[] => {
  const versions = groupResolvedVersions(resolvedPackages);

  return [...versions.entries()]
    .filter(([name]) => !directNames.has(name))
    .map(([name, resolvedVersions]) => {
      const knowledge = PACKAGE_KNOWLEDGE[name];
      return {
        id: `npm:${name}`,
        name,
        ecosystem: "npm",
        scope: "transitive" as const,
        direct: false,
        resolvedVersions: [...resolvedVersions].sort(),
        health: "healthy" as const,
        ...(knowledge?.purpose ? { purpose: knowledge.purpose } : {}),
        ...(knowledge?.category ? { category: knowledge.category } : {}),
        ...(knowledge?.guidance ? { guidance: knowledge.guidance } : {}),
      };
    });
};

const duplicateFindings = (
  versions: Map<string, Set<string>>,
): EcosystemFinding[] =>
  [...versions.entries()]
    .filter(([, resolved]) => resolved.size > 1)
    .map(([name, resolved]) => ({
      id: `duplicate:${name}`,
      code: "duplicate-resolved-versions",
      severity: "warning" as const,
      title: "Multiple resolved versions",
      message: `${name} resolves to ${[...resolved].sort().join(", ")}.`,
      packageName: name,
      packageId: `npm:${name}`,
      recommendation: "Review dependency constraints and deduplicate where the ecosystem permits.",
    }));

const deprecatedFindings = (
  packages: ResolvedPackage[],
): EcosystemFinding[] => {
  const seen = new Set<string>();
  const findings: EcosystemFinding[] = [];

  for (const pkg of packages) {
    if (!pkg.deprecated || seen.has(pkg.name)) continue;
    seen.add(pkg.name);
    findings.push({
      id: `deprecated:${pkg.name}`,
      code: "deprecated-package",
      severity: "warning",
      title: "Deprecated package",
      message: `${pkg.name}@${pkg.version}: ${pkg.deprecated}`,
      packageName: pkg.name,
      packageId: `npm:${pkg.name}`,
      recommendation: "Plan migration to a maintained alternative or supported version.",
    });
  }

  return findings;
};

const unresolvedFindings = (
  packages: EcosystemPackage[],
  hasLockfile: boolean,
): EcosystemFinding[] =>
  hasLockfile
    ? packages
        .filter((pkg) => pkg.direct && pkg.resolvedVersions.length === 0)
        .map((pkg) => ({
          id: `unresolved:${pkg.name}`,
          code: "unresolved-direct-dependency",
          severity: "warning" as const,
          title: "Declared dependency not resolved",
          message: `${pkg.name} is declared as ${pkg.declaredVersion ?? "unknown"} but no resolved version was found in the selected lockfile.`,
          packageName: pkg.name,
          packageId: `npm:${pkg.name}`,
          recommendation: "Verify lockfile consistency and reinstall dependencies if required.",
        }))
    : [];

const peerFindings = (
  resolvedPackages: ResolvedPackage[],
): EcosystemFinding[] => {
  const versions = groupResolvedVersions(resolvedPackages);
  const findings: EcosystemFinding[] = [];
  const emitted = new Set<string>();

  for (const pkg of resolvedPackages) {
    for (const [peerName, range] of Object.entries(pkg.peerDependencies)) {
      if (pkg.optionalPeers.has(peerName)) continue;

      const peerVersions = [...(versions.get(peerName) ?? [])];
      const findingBase = `${pkg.name}@${pkg.version} requires ${peerName}@${range}`;

      if (peerVersions.length === 0) {
        const id = `peer-missing:${pkg.name}:${peerName}`;
        if (emitted.has(id)) continue;
        emitted.add(id);
        findings.push({
          id,
          code: "peer-dependency-missing",
          severity: "warning",
          title: "Peer dependency missing",
          message: `${findingBase}, but ${peerName} is not resolved.`,
          packageName: pkg.name,
          packageId: `npm:${pkg.name}`,
          recommendation: `Install a compatible ${peerName} version or use a compatible ${pkg.name} release.`,
        });
        continue;
      }

      const compatible = peerVersions.some((version) => valid(version) && satisfies(version, range));
      if (!compatible) {
        const id = `peer-mismatch:${pkg.name}:${peerName}`;
        if (emitted.has(id)) continue;
        emitted.add(id);
        findings.push({
          id,
          code: "peer-dependency-mismatch",
          severity: "warning",
          title: "Peer dependency mismatch",
          message: `${findingBase}, but resolved versions are ${peerVersions.join(", ")}.`,
          packageName: pkg.name,
          packageId: `npm:${pkg.name}`,
          recommendation: "Align the peer dependency versions before relying on this package combination.",
        });
      }
    }
  }

  return findings;
};

const detectCapabilities = (
  directPackages: EcosystemPackage[],
): Capability[] => {
  const providers = new Map<string, string[]>();

  for (const pkg of directPackages) {
    const knowledge = PACKAGE_KNOWLEDGE[pkg.name];
    for (const capability of knowledge?.capabilities ?? []) {
      const packages = providers.get(capability) ?? [];
      packages.push(pkg.name);
      providers.set(capability, packages);
    }
  }

  return [...providers.entries()].map(([id, packages]) => ({
    id: `capability:${id}`,
    name: CAPABILITY_NAMES[id] ?? id,
    providedBy: packages.sort(),
    confidence: 1,
  }));
};

const detectTechnologies = (
  manifest: PackageManifest,
  directNames: Set<string>,
  manager: { name: NodePackageManager; version?: string; source: string } | undefined,
  hasPackageManifest: boolean,
  hasTypeScriptConfig: boolean,
): Technology[] => {
  const technologies: Technology[] = [];

  if (hasPackageManifest) {
    technologies.push({
      id: "language:javascript",
      name: "JavaScript",
      kind: "language",
      ecosystem: "node",
      source: "package.json",
    });
  }

  if (directNames.has("typescript") || hasTypeScriptConfig) {
    technologies.push({
      id: "language:typescript",
      name: "TypeScript",
      kind: "language",
      ecosystem: "node",
      source: hasTypeScriptConfig ? "tsconfig.json" : "package.json",
    });
  }

  for (const [pkg, name] of FRAMEWORKS) {
    if (directNames.has(pkg)) {
      technologies.push({
        id: `framework:${pkg}`,
        name,
        kind: "framework",
        ecosystem: "node",
        source: pkg,
      });
    }
  }

  for (const [pkg, name] of BUILD_TOOLS) {
    if (directNames.has(pkg)) {
      technologies.push({
        id: `build-system:${pkg}`,
        name,
        kind: "build-system",
        ecosystem: "node",
        source: pkg,
      });
    }
  }

  if (manifest.engines?.node) {
    technologies.push({
      id: "runtime:node",
      name: "Node.js",
      kind: "runtime",
      ecosystem: "node",
      version: manifest.engines.node,
      source: "package.json#engines.node",
    });
  }

  if (manager) {
    technologies.push({
      id: `package-manager:${manager.name}`,
      name: manager.name,
      kind: "package-manager",
      ecosystem: "node",
      ...(manager.version ? { version: manager.version } : {}),
      source: manager.source,
    });
  }

  return technologies;
};

const inferProjectType = (names: Set<string>): string | undefined => {
  if (names.has("next")) return "Full-stack web application";
  if (names.has("@nestjs/core") || names.has("express") || names.has("fastify")) {
    return "Backend service";
  }
  if (
    names.has("react") ||
    names.has("vue") ||
    names.has("@angular/core") ||
    names.has("svelte")
  ) {
    return "Frontend application";
  }
  return undefined;
};

export class NodeEcosystemAnalyzer implements EcosystemAnalyzer {
  readonly id = "node";
  readonly displayName = "Node.js ecosystem";

  async detect(context: AnalyzerContext): Promise<boolean> {
    return (
      (await context.reader.exists("package.json")) ||
      (await context.reader.exists("tsconfig.json"))
    );
  }

  async analyze(context: AnalyzerContext): Promise<Partial<ProjectEcosystem>> {
    const hasPackageManifest = await context.reader.exists("package.json");
    const hasTypeScriptConfig = await context.reader.exists("tsconfig.json");
    const manifest = hasPackageManifest
      ? parseJson<PackageManifest>(
          await context.reader.readText("package.json"),
          "package.json",
        )
      : {};

    const declaredManager = parseDeclaredManager(manifest.packageManager);
    const lockfileSelection = await chooseLockfile(
      context,
      declaredManager?.name,
    );
    const lockfile = lockfileSelection.lockfile;
    const resolvedPackages = lockfile?.packages ?? [];
    const versions = groupResolvedVersions(resolvedPackages);
    const directPackages = createDirectPackages(manifest, versions);
    const directNames = new Set(directPackages.map((pkg) => pkg.name));
    const transitivePackages = createTransitivePackages(resolvedPackages, directNames);

    const findings = [
      ...lockfileSelection.findings,
      ...duplicateFindings(versions),
      ...deprecatedFindings(resolvedPackages),
      ...unresolvedFindings(directPackages, Boolean(lockfile)),
      ...peerFindings(resolvedPackages),
    ];

    const allPackages = [...directPackages, ...transitivePackages].map((pkg) => ({
      ...pkg,
      health: packageHealth(pkg.id, pkg.name, findings),
    }));

    const manager = declaredManager
      ? {
          ...declaredManager,
          source: "package.json#packageManager",
        }
      : lockfile
        ? {
            name: lockfile.manager,
            source: lockfile.source,
          }
        : undefined;

    const projectType = inferProjectType(directNames);

    return {
      project: {
        ...context.project,
        ...(manifest.name ? { name: manifest.name } : {}),
        ...(projectType ? { projectType } : {}),
      },
      packages: allPackages,
      technologies: detectTechnologies(
        manifest,
        directNames,
        manager,
        hasPackageManifest,
        hasTypeScriptConfig,
      ),
      capabilities: detectCapabilities(directPackages),
      findings,
    };
  }
}
