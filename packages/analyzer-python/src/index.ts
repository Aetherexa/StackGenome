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
import {
  PYTHON_CAPABILITY_NAMES,
  PYTHON_PACKAGE_KNOWLEDGE,
} from "./knowledge.js";
import {
  type DependencyDeclaration,
  type ResolvedPythonPackage,
  exactPinnedVersion,
  parsePipfile,
  parsePipfileLock,
  parsePyProject,
  parseRequirements,
  parseTomlLockPackages,
} from "./parsers.js";

type PythonManager = "pip" | "poetry" | "uv" | "pipenv";

interface PythonInputs {
  projectName?: string;
  requiresPython?: string;
  managers: Set<PythonManager>;
  declarations: DependencyDeclaration[];
  resolved: ResolvedPythonPackage[];
}

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
  if (related.some((finding) => finding.severity === "warning")) {
    return "warning";
  }
  return "healthy";
};

const collectInputs = async (
  context: AnalyzerContext,
): Promise<PythonInputs> => {
  const managers = new Set<PythonManager>();
  const declarations: DependencyDeclaration[] = [];
  const resolved: ResolvedPythonPackage[] = [];
  let projectName: string | undefined;
  let requiresPython: string | undefined;

  if (await context.reader.exists("pyproject.toml")) {
    const pyproject = parsePyProject(
      await context.reader.readText("pyproject.toml"),
    );
    declarations.push(...pyproject.declarations);
    projectName = pyproject.name ?? projectName;
    requiresPython = pyproject.requiresPython ?? requiresPython;

    for (const hint of pyproject.managerHints) {
      if (hint === "poetry" || hint === "uv") managers.add(hint);
    }

    if (pyproject.managerHints.length === 0) managers.add("pip");
  }

  if (await context.reader.exists("requirements.txt")) {
    declarations.push(
      ...parseRequirements(
        await context.reader.readText("requirements.txt"),
        "requirements.txt",
        "runtime",
      ),
    );
    if (managers.size === 0) managers.add("pip");
  }

  if (await context.reader.exists("requirements-dev.txt")) {
    declarations.push(
      ...parseRequirements(
        await context.reader.readText("requirements-dev.txt"),
        "requirements-dev.txt",
        "development",
      ),
    );
    if (managers.size === 0) managers.add("pip");
  }

  if (await context.reader.exists("Pipfile")) {
    const pipfile = parsePipfile(await context.reader.readText("Pipfile"));
    declarations.push(...pipfile.declarations);
    requiresPython = pipfile.requiresPython ?? requiresPython;
    managers.add("pipenv");
  }

  if (await context.reader.exists("poetry.lock")) {
    resolved.push(
      ...parseTomlLockPackages(
        await context.reader.readText("poetry.lock"),
        "poetry.lock",
      ),
    );
    managers.add("poetry");
  }

  if (await context.reader.exists("uv.lock")) {
    resolved.push(
      ...parseTomlLockPackages(
        await context.reader.readText("uv.lock"),
        "uv.lock",
      ),
    );
    managers.add("uv");
  }

  if (await context.reader.exists("Pipfile.lock")) {
    resolved.push(
      ...parsePipfileLock(await context.reader.readText("Pipfile.lock")),
    );
    managers.add("pipenv");
  }

  return {
    managers,
    declarations,
    resolved,
    ...(projectName ? { projectName } : {}),
    ...(requiresPython ? { requiresPython } : {}),
  };
};

const declarationFindings = (
  declarations: DependencyDeclaration[],
): EcosystemFinding[] => {
  const grouped = new Map<string, DependencyDeclaration[]>();
  for (const declaration of declarations) {
    const values = grouped.get(declaration.name) ?? [];
    values.push(declaration);
    grouped.set(declaration.name, values);
  }

  const findings: EcosystemFinding[] = [];

  for (const [name, values] of grouped) {
    const constraints = [
      ...new Set(
        values
          .map((value) => value.constraint)
          .filter((constraint): constraint is string => Boolean(constraint)),
      ),
    ];
    if (constraints.length <= 1) continue;

    const pins = [
      ...new Set(
        constraints
          .map(exactPinnedVersion)
          .filter((version): version is string => Boolean(version)),
      ),
    ];

    findings.push({
      id: `python:declaration:${name}`,
      code: pins.length > 1
        ? "conflicting-pinned-requirements"
        : "multiple-requirement-declarations",
      severity: pins.length > 1 ? "error" : "warning",
      title: pins.length > 1
        ? "Conflicting pinned Python requirements"
        : "Multiple Python requirement declarations",
      message: `${name} is declared with: ${constraints.join(", ")}.`,
      packageName: name,
      packageId: `pypi:${name}`,
      recommendation:
        "Consolidate dependency declarations so the project has one intentional version policy.",
    });
  }

  return findings;
};

const buildPackages = (
  declarations: DependencyDeclaration[],
  resolved: ResolvedPythonPackage[],
  findings: EcosystemFinding[],
): EcosystemPackage[] => {
  const resolvedVersions = new Map<string, Set<string>>();
  for (const pkg of resolved) {
    const versions = resolvedVersions.get(pkg.name) ?? new Set<string>();
    versions.add(pkg.version);
    resolvedVersions.set(pkg.name, versions);
  }

  const direct = new Map<
    string,
    {
      scope: EcosystemPackage["scope"];
      constraints: Set<string>;
    }
  >();

  for (const declaration of declarations) {
    const current = direct.get(declaration.name) ?? {
      scope: declaration.scope,
      constraints: new Set<string>(),
    };
    if (
      current.scope !== "runtime" &&
      declaration.scope === "runtime"
    ) {
      current.scope = "runtime";
    }
    if (declaration.constraint) {
      current.constraints.add(declaration.constraint);
    }
    direct.set(declaration.name, current);
  }

  const packages: EcosystemPackage[] = [];

  for (const [name, metadata] of direct) {
    const knowledge = PYTHON_PACKAGE_KNOWLEDGE[name];
    packages.push({
      id: `pypi:${name}`,
      name,
      ecosystem: "pypi",
      scope: metadata.scope,
      direct: true,
      ...(metadata.constraints.size > 0
        ? { declaredVersion: [...metadata.constraints].join(" | ") }
        : {}),
      resolvedVersions: [...(resolvedVersions.get(name) ?? [])].sort(),
      health: packageHealth(`pypi:${name}`, name, findings),
      ...(knowledge?.purpose ? { purpose: knowledge.purpose } : {}),
      ...(knowledge?.category ? { category: knowledge.category } : {}),
      ...(knowledge?.guidance ? { guidance: knowledge.guidance } : {}),
    });
  }

  for (const [name, versions] of resolvedVersions) {
    if (direct.has(name)) continue;
    const knowledge = PYTHON_PACKAGE_KNOWLEDGE[name];
    packages.push({
      id: `pypi:${name}`,
      name,
      ecosystem: "pypi",
      scope: "transitive",
      direct: false,
      resolvedVersions: [...versions].sort(),
      health: packageHealth(`pypi:${name}`, name, findings),
      ...(knowledge?.purpose ? { purpose: knowledge.purpose } : {}),
      ...(knowledge?.category ? { category: knowledge.category } : {}),
      ...(knowledge?.guidance ? { guidance: knowledge.guidance } : {}),
    });
  }

  return packages;
};

const resolvedFindings = (
  resolved: ResolvedPythonPackage[],
): EcosystemFinding[] => {
  const grouped = new Map<string, Set<string>>();
  for (const pkg of resolved) {
    const versions = grouped.get(pkg.name) ?? new Set<string>();
    versions.add(pkg.version);
    grouped.set(pkg.name, versions);
  }

  return [...grouped.entries()]
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({
      id: `python:duplicate:${name}`,
      code: "duplicate-resolved-versions",
      severity: "warning" as const,
      title: "Multiple resolved versions",
      message: `${name} resolves to ${[...versions].sort().join(", ")}.`,
      packageName: name,
      packageId: `pypi:${name}`,
      recommendation:
        "Review Python dependency constraints and lockfile resolution for unnecessary duplication.",
    }));
};

const unresolvedDirectFindings = (
  declarations: DependencyDeclaration[],
  resolved: ResolvedPythonPackage[],
): EcosystemFinding[] => {
  if (resolved.length === 0) return [];

  const resolvedNames = new Set(resolved.map((pkg) => pkg.name));
  return [
    ...new Set(declarations.map((declaration) => declaration.name)),
  ]
    .filter((name) => !resolvedNames.has(name))
    .map((name) => ({
      id: `python:unresolved:${name}`,
      code: "unresolved-direct-dependency",
      severity: "warning" as const,
      title: "Declared dependency not resolved",
      message: `${name} is declared but no matching resolved package was found in the supported Python lockfile.`,
      packageName: name,
      packageId: `pypi:${name}`,
      recommendation:
        "Verify that the lockfile is current and generated by the project's selected Python package manager.",
    }));
};

const detectCapabilities = (
  packages: EcosystemPackage[],
): Capability[] => {
  const providers = new Map<string, string[]>();

  for (const pkg of packages.filter((item) => item.direct)) {
    const knowledge = PYTHON_PACKAGE_KNOWLEDGE[pkg.name];
    for (const capability of knowledge?.capabilities ?? []) {
      const values = providers.get(capability) ?? [];
      values.push(pkg.name);
      providers.set(capability, values);
    }
  }

  return [...providers.entries()].map(([id, values]) => ({
    id: `capability:${id}`,
    name: PYTHON_CAPABILITY_NAMES[id] ?? id,
    providedBy: values.sort(),
    confidence: 1,
  }));
};

const detectProjectType = (
  directNames: Set<string>,
): string => {
  if (
    directNames.has("django") ||
    directNames.has("flask") ||
    directNames.has("fastapi")
  ) {
    return "Python backend service";
  }
  if (directNames.has("numpy") || directNames.has("pandas")) {
    return "Python data application";
  }
  return "Python application";
};

const detectTechnologies = (
  inputs: PythonInputs,
  directNames: Set<string>,
): Technology[] => {
  const technologies: Technology[] = [
    {
      id: "language:python",
      name: "Python",
      kind: "language",
      ecosystem: "python",
      ...(inputs.requiresPython ? { version: inputs.requiresPython } : {}),
      source: inputs.requiresPython
        ? "Python project metadata"
        : "Python dependency manifest",
    },
  ];

  const frameworks = new Map<string, string>([
    ["django", "Django"],
    ["flask", "Flask"],
    ["fastapi", "FastAPI"],
  ]);

  for (const [pkg, name] of frameworks) {
    if (directNames.has(pkg)) {
      technologies.push({
        id: `framework:python:${pkg}`,
        name,
        kind: "framework",
        ecosystem: "python",
        source: pkg,
      });
    }
  }

  for (const manager of [...inputs.managers].sort()) {
    technologies.push({
      id: `package-manager:python:${manager}`,
      name: manager === "pipenv" ? "Pipenv" : manager,
      kind: "package-manager",
      ecosystem: "python",
      source:
        manager === "poetry"
          ? "pyproject.toml / poetry.lock"
          : manager === "uv"
            ? "pyproject.toml / uv.lock"
            : manager === "pipenv"
              ? "Pipfile / Pipfile.lock"
              : "Python requirements",
    });
  }

  if (directNames.has("pytest")) {
    technologies.push({
      id: "testing:python:pytest",
      name: "pytest",
      kind: "testing",
      ecosystem: "python",
      source: "pytest",
    });
  }

  if (directNames.has("ruff")) {
    technologies.push({
      id: "build-system:python:ruff",
      name: "Ruff",
      kind: "build-system",
      ecosystem: "python",
      source: "ruff",
    });
  }

  return technologies;
};

export class PythonEcosystemAnalyzer implements EcosystemAnalyzer {
  readonly id = "python";
  readonly displayName = "Python ecosystem";

  async detect(context: AnalyzerContext): Promise<boolean> {
    const markers = [
      "pyproject.toml",
      "requirements.txt",
      "requirements-dev.txt",
      "poetry.lock",
      "uv.lock",
      "Pipfile",
      "Pipfile.lock",
    ];

    for (const marker of markers) {
      if (await context.reader.exists(marker)) return true;
    }

    return false;
  }

  async analyze(
    context: AnalyzerContext,
  ): Promise<Partial<ProjectEcosystem>> {
    const inputs = await collectInputs(context);
    const findings = [
      ...declarationFindings(inputs.declarations),
      ...resolvedFindings(inputs.resolved),
      ...unresolvedDirectFindings(inputs.declarations, inputs.resolved),
    ];

    const packages = buildPackages(
      inputs.declarations,
      inputs.resolved,
      findings,
    );
    const directNames = new Set(
      packages.filter((pkg) => pkg.direct).map((pkg) => pkg.name),
    );

    return {
      project: {
        ...context.project,
        ...(inputs.projectName ? { name: inputs.projectName } : {}),
        projectType: detectProjectType(directNames),
      },
      technologies: detectTechnologies(inputs, directNames),
      packages,
      capabilities: detectCapabilities(packages),
      findings,
    };
  }
}
