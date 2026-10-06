import {
  PROJECT_ECOSYSTEM_SCHEMA_VERSION,
  type AnalyzerContext,
  type Capability,
  type EcosystemAnalyzer,
  type EcosystemFinding,
  type EcosystemPackage,
  type ProjectEcosystem,
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

export class ProjectEcosystemEngine {
  constructor(private readonly registry: AnalyzerRegistry) {}

  async analyze(context: AnalyzerContext): Promise<ProjectEcosystem> {
    const analyzers = await this.registry.matching(context);
    const fragments = await Promise.all(analyzers.map((analyzer) => analyzer.analyze(context)));

    const technologies = fragments.flatMap((fragment) => fragment.technologies ?? []) as Technology[];
    const packages = fragments.flatMap((fragment) => fragment.packages ?? []) as EcosystemPackage[];
    const capabilities = fragments.flatMap((fragment) => fragment.capabilities ?? []) as Capability[];
    const findings = fragments.flatMap((fragment) => fragment.findings ?? []) as EcosystemFinding[];

    return {
      schemaVersion: PROJECT_ECOSYSTEM_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      project: fragments.find((fragment) => fragment.project)?.project ?? context.project,
      technologies: dedupeById(technologies),
      packages: dedupeById(packages),
      capabilities: dedupeById(capabilities),
      findings: dedupeById(findings),
      analyzers: analyzers.map((analyzer) => analyzer.id),
    };
  }
}

export type { AnalyzerContext, EcosystemAnalyzer, ProjectEcosystem, WorkspaceReader } from "@stackgenome/contracts";
