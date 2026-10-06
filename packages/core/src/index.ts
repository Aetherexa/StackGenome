import {
  PROJECT_ECOSYSTEM_SCHEMA_VERSION,
  type AnalyzerContext,
  type Capability,
  type EcosystemAnalyzer,
  type EcosystemFinding,
  type EcosystemPackage,
  type ProjectEcosystem,
  type ProjectIdentity,
  type Technology,
} from "@stackgenome/contracts";

export class AnalyzerRegistry {
  readonly #analyzers = new Map<string, EcosystemAnalyzer>();

  register(analyzer: EcosystemAnalyzer): this {
    if (this.#analyzers.has(analyzer.id)) {
      throw new Error(`Analyzer "${analyzer.id}" is already registered.`);
    }
    this.#analyzers.set(analyzer.id, analyzer);
    return this;
  }

  list(): readonly EcosystemAnalyzer[] {
    return [...this.#analyzers.values()];
  }

  async matching(context: AnalyzerContext): Promise<EcosystemAnalyzer[]> {
    const results = await Promise.all(
      this.list().map(async (analyzer) => ({
        analyzer,
        matches: await analyzer.detect(context),
      })),
    );
    return results.filter((result) => result.matches).map((result) => result.analyzer);
  }
}

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const values = new Map<string, T>();
  for (const item of items) values.set(item.id, item);
  return [...values.values()];
};

const mergeCapabilities = (items: Capability[]): Capability[] => {
  const capabilities = new Map<string, Capability>();

  for (const item of items) {
    const existing = capabilities.get(item.id);
    if (!existing) {
      capabilities.set(item.id, { ...item, providedBy: [...item.providedBy] });
      continue;
    }

    capabilities.set(item.id, {
      ...existing,
      name: existing.name || item.name,
      confidence: Math.max(existing.confidence, item.confidence),
      providedBy: [...new Set([...existing.providedBy, ...item.providedBy])].sort(),
    });
  }

  return [...capabilities.values()];
};

const mergeProjectIdentity = (
  context: ProjectIdentity,
  fragments: Array<Partial<ProjectEcosystem>>,
): ProjectIdentity => {
  const projectNames = fragments
    .map((fragment) => fragment.project?.name)
    .filter((name): name is string => Boolean(name));
  const projectTypes = [
    ...new Set(
      fragments
        .map((fragment) => fragment.project?.projectType)
        .filter((type): type is string => Boolean(type)),
    ),
  ];

  return {
    ...context,
    ...(projectNames.length > 0 ? { name: projectNames[0] ?? context.name } : {}),
    ...(projectTypes.length === 1
      ? { projectType: projectTypes[0] }
      : projectTypes.length > 1
        ? { projectType: "Multi-ecosystem workspace" }
        : context.projectType
          ? { projectType: context.projectType }
          : {}),
  };
};

export class ProjectEcosystemEngine {
  constructor(private readonly registry: AnalyzerRegistry) {}

  async analyze(context: AnalyzerContext): Promise<ProjectEcosystem> {
    const analyzers = await this.registry.matching(context);
    const fragments = await Promise.all(
      analyzers.map((analyzer) => analyzer.analyze(context)),
    );

    const technologies = fragments.flatMap(
      (fragment) => fragment.technologies ?? [],
    ) as Technology[];
    const packages = fragments.flatMap(
      (fragment) => fragment.packages ?? [],
    ) as EcosystemPackage[];
    const capabilities = fragments.flatMap(
      (fragment) => fragment.capabilities ?? [],
    ) as Capability[];
    const findings = fragments.flatMap(
      (fragment) => fragment.findings ?? [],
    ) as EcosystemFinding[];

    return {
      schemaVersion: PROJECT_ECOSYSTEM_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      project: mergeProjectIdentity(context.project, fragments),
      technologies: dedupeById(technologies),
      packages: dedupeById(packages),
      capabilities: mergeCapabilities(capabilities),
      findings: dedupeById(findings),
      analyzers: analyzers.map((analyzer) => analyzer.id),
    };
  }
}

export type {
  AnalyzerContext,
  EcosystemAnalyzer,
  ProjectEcosystem,
  WorkspaceReader,
} from "@stackgenome/contracts";
