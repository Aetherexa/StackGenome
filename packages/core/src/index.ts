import {
  PROJECT_ECOSYSTEM_SCHEMA_VERSION,
  type AnalysisDiagnostic,
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

const diagnosticMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class ProjectEcosystemEngine {
  constructor(private readonly registry: AnalyzerRegistry) {}

  async analyze(context: AnalyzerContext): Promise<ProjectEcosystem> {
    const diagnostics: AnalysisDiagnostic[] = [];

    const detection = await Promise.all(
      this.registry.list().map(async (analyzer) => {
        try {
          return {
            analyzer,
            matches: await analyzer.detect(context),
          };
        } catch (error) {
          diagnostics.push({
            code: "analyzer-detection-failed",
            severity: "error",
            analyzerId: analyzer.id,
            message: `${analyzer.displayName} detection failed: ${diagnosticMessage(error)}`,
          });
          return { analyzer, matches: false };
        }
      }),
    );

    const analyzers = detection
      .filter((result) => result.matches)
      .map((result) => result.analyzer);

    const analyzed = await Promise.all(
      analyzers.map(async (analyzer) => {
        try {
          return {
            analyzer,
            fragment: await analyzer.analyze(context),
          };
        } catch (error) {
          diagnostics.push({
            code: "analyzer-analysis-failed",
            severity: "error",
            analyzerId: analyzer.id,
            message: `${analyzer.displayName} analysis failed: ${diagnosticMessage(error)}`,
          });
          return { analyzer, fragment: undefined };
        }
      }),
    );

    const fragments = analyzed
      .map((result) => result.fragment)
      .filter((fragment): fragment is Partial<ProjectEcosystem> => Boolean(fragment));

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

    const analysisFailures = diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ).length;

    const status =
      analyzers.length === 0
        ? diagnostics.length > 0
          ? "failed"
          : "unsupported"
        : fragments.length === 0
          ? "failed"
          : analysisFailures > 0
            ? "partial"
            : "success";

    return {
      schemaVersion: PROJECT_ECOSYSTEM_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      project: mergeProjectIdentity(context.project, fragments),
      technologies: dedupeById(technologies),
      packages: dedupeById(packages),
      capabilities: mergeCapabilities(capabilities),
      findings: dedupeById(findings),
      analyzers: analyzers.map((analyzer) => analyzer.id),
      analysis: {
        status,
        rootUri: context.project.rootUri,
        diagnostics,
      },
    };
  }
}

export type {
  AnalyzerContext,
  EcosystemAnalyzer,
  ProjectEcosystem,
  WorkspaceReader,
} from "@stackgenome/contracts";
