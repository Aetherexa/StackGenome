import type {
  AdvisorRequest,
  AdvisorResult,
  EcosystemPackage,
  ProjectEcosystem,
  RecommendationCandidate,
} from "@stackgenome/contracts";
import {
  CAPABILITY_DEFINITIONS,
  TECHNOLOGY_CATALOG,
  type CatalogTechnology,
} from "@stackgenome/knowledge";

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();

const capabilityMatches = (intent: string): string[] => {
  const normalized = normalize(intent);
  const scored = Object.entries(CAPABILITY_DEFINITIONS)
    .map(([id, definition]) => {
      const phrases = [definition.name, ...definition.aliases];
      const matched = phrases.filter((phrase) =>
        normalized.includes(normalize(phrase)),
      );
      return { id, score: matched.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));

  return scored.map((entry) => entry.id);
};

const installedVersion = (pkg: EcosystemPackage): string | undefined =>
  pkg.resolvedVersions[0] ?? pkg.declaredVersion;

const frameworkNames = (ecosystem: ProjectEcosystem): Set<string> =>
  new Set(
    ecosystem.technologies
      .filter((technology) => technology.kind === "framework")
      .map((technology) => normalize(technology.name)),
  );

const projectPackageEcosystems = (ecosystem: ProjectEcosystem): Set<string> => {
  const values = new Set(ecosystem.packages.map((pkg) => pkg.ecosystem));

  if (ecosystem.analyzers.includes("node")) values.add("npm");
  if (ecosystem.analyzers.includes("python")) values.add("pypi");

  return values;
};

const existingCandidates = (
  ecosystem: ProjectEcosystem,
  capabilities: string[],
): RecommendationCandidate[] => {
  const requested = new Set(capabilities);

  return ecosystem.packages
    .filter((pkg) => pkg.direct)
    .flatMap((pkg) => {
      const capability = ecosystem.capabilities.filter((item) =>
        item.providedBy.includes(pkg.name),
      );
      const matched = capability
        .map((item) => item.id.replace(/^capability:/, ""))
        .filter((id) => requested.has(id));

      if (matched.length === 0) return [];

      const healthPenalty =
        pkg.health === "error" ? 0.35 : pkg.health === "warning" ? 0.12 : 0;
      const confidence = Math.max(
        0.5,
        Math.min(1, 0.82 + matched.length * 0.06 - healthPenalty),
      );
      const version = installedVersion(pkg);

      return [{
        packageId: pkg.id,
        name: pkg.name,
        ecosystem: pkg.ecosystem,
        existing: true,
        confidence,
        matchedCapabilities: matched,
        reason: `${pkg.name} is already a direct project dependency and provides ${matched.join(", ")}.`,
        ...(pkg.resolvedVersions[0]
          ? { installedVersion: pkg.resolvedVersions[0] }
          : {}),
        ...(pkg.declaredVersion
          ? { declaredVersion: pkg.declaredVersion }
          : {}),
        ...(pkg.guidance ? { guidance: pkg.guidance } : {}),
        ...(version && !pkg.resolvedVersions[0]
          ? { installedVersion: version }
          : {}),
      }];
    })
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.name.localeCompare(right.name),
    );
};

const isCatalogCompatible = (
  candidate: CatalogTechnology,
  ecosystems: Set<string>,
  frameworks: Set<string>,
): boolean => {
  if (!ecosystems.has(candidate.ecosystem)) return false;
  if (!candidate.frameworks || candidate.frameworks.length === 0) return true;

  return candidate.frameworks.some((framework) =>
    frameworks.has(normalize(framework)),
  );
};

const newCandidates = (
  ecosystem: ProjectEcosystem,
  capabilities: string[],
): RecommendationCandidate[] => {
  const requested = new Set(capabilities);
  const packageIds = new Set(ecosystem.packages.map((pkg) => pkg.id));
  const ecosystems = projectPackageEcosystems(ecosystem);
  const frameworks = frameworkNames(ecosystem);

  return TECHNOLOGY_CATALOG
    .filter((candidate) => !packageIds.has(candidate.packageId))
    .filter((candidate) =>
      isCatalogCompatible(candidate, ecosystems, frameworks),
    )
    .flatMap((candidate) => {
      const matched = (candidate.capabilities ?? []).filter((capability) =>
        requested.has(capability),
      );
      if (matched.length === 0) return [];

      const frameworkBonus =
        candidate.frameworks?.some((framework) =>
          frameworks.has(normalize(framework)),
        ) === true
          ? 0.08
          : 0;
      const confidence = Math.min(
        0.94,
        0.68 + matched.length * 0.08 + frameworkBonus,
      );

      return [{
        packageId: candidate.packageId,
        name: candidate.name,
        ecosystem: candidate.ecosystem,
        existing: false,
        confidence,
        matchedCapabilities: matched,
        reason: `${candidate.name} matches the detected ${candidate.ecosystem} ecosystem and provides ${matched.join(", ")}.`,
        ...(candidate.guidance ? { guidance: candidate.guidance } : {}),
      }];
    })
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.name.localeCompare(right.name),
    );
};

export class CapabilityAdvisor {
  recommend(
    ecosystem: ProjectEcosystem,
    request: AdvisorRequest,
  ): AdvisorResult {
    const matchedCapabilities = capabilityMatches(request.intent);

    if (matchedCapabilities.length === 0) {
      return {
        intent: request.intent,
        mode: request.mode,
        matchedCapabilities: [],
        newDependencyRequired: null,
        alternatives: [],
        explanation:
          "StackGenome could not map this request to a known project capability yet. No dependency recommendation was made.",
      };
    }

    const existing = existingCandidates(ecosystem, matchedCapabilities);
    if (existing.length > 0) {
      const [primary, ...alternatives] = existing;
      return {
        intent: request.intent,
        mode: request.mode,
        matchedCapabilities,
        newDependencyRequired: false,
        ...(primary ? { primary } : {}),
        alternatives,
        explanation:
          "An existing direct dependency already provides the requested capability, so StackGenome recommends reusing the current project ecosystem.",
      };
    }

    if (request.mode === "existing-only") {
      return {
        intent: request.intent,
        mode: request.mode,
        matchedCapabilities,
        newDependencyRequired: null,
        alternatives: [],
        explanation:
          "No existing direct dependency was found for the requested capability. Existing-only mode does not propose new packages.",
      };
    }

    const suggested = newCandidates(ecosystem, matchedCapabilities);
    const [primary, ...alternatives] = suggested;

    if (!primary) {
      return {
        intent: request.intent,
        mode: request.mode,
        matchedCapabilities,
        newDependencyRequired: null,
        alternatives: [],
        explanation:
          "The capability was understood, but StackGenome has no compatible package candidate in its current knowledge catalog.",
      };
    }

    return {
      intent: request.intent,
      mode: request.mode,
      matchedCapabilities,
      newDependencyRequired: true,
      primary,
      alternatives: alternatives.slice(0, 3),
      explanation:
        "No existing direct dependency provides the requested capability. StackGenome selected a compatible candidate from the detected ecosystem knowledge catalog.",
    };
  }
}
