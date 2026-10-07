import type {
  AIContextPackage,
  AIContextProfile,
  AIContextStats,
  EcosystemPackage,
  ProjectAIContext,
  ProjectEcosystem,
} from "@stackgenome/contracts";
import { TECHNOLOGY_CATALOG } from "@stackgenome/knowledge";

const EXCLUSIONS = [
  "Source-file topology and repository structure are not included.",
  "AST, import graph, caller/callee, and blast-radius data are not included.",
  "StackGenome does not infer how a library is used inside source files.",
];

const installedVersion = (pkg: EcosystemPackage): string | undefined =>
  pkg.resolvedVersions[0] ?? pkg.declaredVersion;

const packageCapabilities = (packageId: string): string[] =>
  TECHNOLOGY_CATALOG.find((entry) => entry.packageId === packageId)
    ?.capabilities ?? [];

const buildPackage = (pkg: EcosystemPackage): AIContextPackage => {
  const version = installedVersion(pkg);

  return {
    id: pkg.id,
    name: pkg.name,
    ecosystem: pkg.ecosystem,
    ...(version ? { version } : {}),
    ...(pkg.purpose ? { purpose: pkg.purpose } : {}),
    capabilities: packageCapabilities(pkg.id),
    health: pkg.health,
  };
};

const relevantDirectPackages = (
  ecosystem: ProjectEcosystem,
): EcosystemPackage[] =>
  ecosystem.packages
    .filter((pkg) => pkg.direct)
    .sort((left, right) => left.id.localeCompare(right.id));

const packageSelection = (
  ecosystem: ProjectEcosystem,
  profile: AIContextProfile,
): EcosystemPackage[] => {
  const direct = relevantDirectPackages(ecosystem);

  if (profile === "detailed") {
    return ecosystem.packages
      .filter(
        (pkg) =>
          pkg.direct ||
          pkg.health !== "healthy" ||
          packageCapabilities(pkg.id).length > 0,
      )
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  if (profile === "standard") {
    return direct.filter(
      (pkg) =>
        packageCapabilities(pkg.id).length > 0 ||
        pkg.health !== "healthy" ||
        Boolean(pkg.guidance),
    );
  }

  return direct.filter(
    (pkg) =>
      packageCapabilities(pkg.id).length > 0 ||
      pkg.health === "error" ||
      pkg.health === "warning",
  );
};

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );

const buildInstructions = (
  packages: EcosystemPackage[],
): ProjectAIContext["instructions"] => {
  const reuse = packages
    .filter((pkg) => pkg.direct && packageCapabilities(pkg.id).length > 0)
    .map((pkg) => {
      const capabilities = packageCapabilities(pkg.id);
      const version = installedVersion(pkg);
      return `Reuse ${pkg.name}${version ? ` (${version})` : ""} for ${capabilities.join(", ")}.`;
    });

  const prefer = packages.flatMap(
    (pkg) => pkg.guidance?.preferredPatterns ?? [],
  );
  const avoid = [
    "Do not introduce a new dependency when an installed healthy package already provides the required capability.",
    ...packages.flatMap((pkg) => pkg.guidance?.avoidPatterns ?? []),
  ];

  return {
    reuse: uniqueSorted(reuse),
    prefer: uniqueSorted(prefer),
    avoid: uniqueSorted(avoid),
  };
};

const computeStats = (
  value: Omit<ProjectAIContext, "stats">,
): AIContextStats => {
  const serialized = JSON.stringify(value);
  const characters = serialized.length;
  const bytes = new TextEncoder().encode(serialized).byteLength;

  return {
    characters,
    bytes,
    approximateTokens: Math.ceil(characters / 4),
  };
};

const technologySelection = (
  ecosystem: ProjectEcosystem,
  profile: AIContextProfile,
): ProjectAIContext["technologies"] => {
  const technologies = ecosystem.technologies
    .map((technology) => ({
      name: technology.name,
      kind: technology.kind,
      ...(technology.ecosystem
        ? { ecosystem: technology.ecosystem }
        : {}),
      ...(technology.version ? { version: technology.version } : {}),
    }))
    .sort((left, right) =>
      `${left.ecosystem ?? ""}:${left.kind}:${left.name}`.localeCompare(
        `${right.ecosystem ?? ""}:${right.kind}:${right.name}`,
      ),
    );

  if (profile === "compact") {
    return technologies.filter((technology) =>
      ["language", "framework", "runtime", "package-manager"].includes(
        technology.kind,
      ),
    );
  }

  return technologies;
};

const constraintSelection = (
  ecosystem: ProjectEcosystem,
  profile: AIContextProfile,
): ProjectAIContext["constraints"] => {
  const findings =
    profile === "compact"
      ? ecosystem.findings.filter(
          (finding) =>
            finding.severity === "error" ||
            finding.code.includes("peer") ||
            finding.code.includes("deprecated"),
        )
      : profile === "standard"
        ? ecosystem.findings.filter(
            (finding) => finding.severity !== "info",
          )
        : ecosystem.findings;

  return findings
    .map((finding) => ({
      severity: finding.severity,
      code: finding.code,
      message: finding.message,
      ...(finding.packageId ? { packageId: finding.packageId } : {}),
      ...(finding.recommendation
        ? { recommendation: finding.recommendation }
        : {}),
    }))
    .sort((left, right) =>
      `${left.severity}:${left.code}:${left.packageId ?? ""}`.localeCompare(
        `${right.severity}:${right.code}:${right.packageId ?? ""}`,
      ),
    );
};

export class ProjectAIContextGenerator {
  generate(
    ecosystem: ProjectEcosystem,
    profile: AIContextProfile = "standard",
  ): ProjectAIContext {
    const selectedPackages = packageSelection(ecosystem, profile);
    const ecosystems = uniqueSorted([
      ...ecosystem.analyzers,
      ...ecosystem.packages.map((pkg) => pkg.ecosystem),
    ]);

    const base: Omit<ProjectAIContext, "stats"> = {
      schemaVersion: "1.0",
      sourceSchemaVersion: ecosystem.schemaVersion,
      profile,
      generatedAt: ecosystem.generatedAt,
      project: {
        name: ecosystem.project.name,
        ...(ecosystem.project.projectType
          ? { projectType: ecosystem.project.projectType }
          : {}),
        ecosystems,
      },
      technologies: technologySelection(ecosystem, profile),
      capabilities: ecosystem.capabilities
        .map((capability) => ({
          id: capability.id.replace(/^capability:/, ""),
          name: capability.name,
          providedBy: [...capability.providedBy].sort(),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
      packages: selectedPackages.map(buildPackage),
      constraints: constraintSelection(ecosystem, profile),
      instructions: buildInstructions(selectedPackages),
      exclusions: [...EXCLUSIONS],
    };

    return {
      ...base,
      stats: computeStats(base),
    };
  }

  generateAll(
    ecosystem: ProjectEcosystem,
  ): Record<AIContextProfile, ProjectAIContext> {
    return {
      compact: this.generate(ecosystem, "compact"),
      standard: this.generate(ecosystem, "standard"),
      detailed: this.generate(ecosystem, "detailed"),
    };
  }

  serialize(context: ProjectAIContext): string {
    return JSON.stringify(context, null, 2);
  }
}
