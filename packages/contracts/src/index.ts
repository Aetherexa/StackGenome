export const PROJECT_ECOSYSTEM_SCHEMA_VERSION = "1.2" as const;

export type PackageScope =
  | "runtime"
  | "development"
  | "peer"
  | "optional"
  | "transitive"
  | "unknown";

export type PackageHealth = "healthy" | "warning" | "error" | "unknown";

export type TechnologyKind =
  | "language"
  | "framework"
  | "runtime"
  | "build-system"
  | "package-manager"
  | "testing"
  | "ui"
  | "database"
  | "other";

export type FindingSeverity = "info" | "warning" | "error";

export interface Technology {
  id: string;
  name: string;
  kind: TechnologyKind;
  ecosystem?: string;
  version?: string;
  source: string;
}

export interface PackageGuidance {
  preferredPatterns: string[];
  avoidPatterns: string[];
}

export interface EcosystemPackage {
  id: string;
  name: string;
  ecosystem: string;
  scope: PackageScope;
  direct: boolean;
  declaredVersion?: string;
  resolvedVersions: string[];
  purpose?: string;
  category?: string;
  guidance?: PackageGuidance;
  health: PackageHealth;
}

export interface Capability {
  id: string;
  name: string;
  providedBy: string[];
  confidence: number;
}

export interface EcosystemFinding {
  id: string;
  code: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  packageName?: string;
  recommendation?: string;
}

export interface ProjectIdentity {
  name: string;
  rootUri: string;
  projectType?: string;
}

export interface ProjectEcosystem {
  schemaVersion: typeof PROJECT_ECOSYSTEM_SCHEMA_VERSION;
  generatedAt: string;
  project: ProjectIdentity;
  technologies: Technology[];
  packages: EcosystemPackage[];
  capabilities: Capability[];
  findings: EcosystemFinding[];
  analyzers: string[];
}

export interface WorkspaceReader {
  exists(relativePath: string): Promise<boolean>;
  readText(relativePath: string): Promise<string>;
}

export interface AnalyzerContext {
  project: ProjectIdentity;
  reader: WorkspaceReader;
}

export interface EcosystemAnalyzer {
  readonly id: string;
  readonly displayName: string;
  detect(context: AnalyzerContext): Promise<boolean>;
  analyze(context: AnalyzerContext): Promise<Partial<ProjectEcosystem>>;
}
