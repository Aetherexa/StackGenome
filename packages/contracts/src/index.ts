export const PROJECT_ECOSYSTEM_SCHEMA_VERSION = "1.3" as const;

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
  packageId?: string;
  recommendation?: string;
}

export interface ProjectIdentity {
  name: string;
  rootUri: string;
  projectType?: string;
}

export type AnalysisStatus = "success" | "partial" | "unsupported" | "failed";

export interface AnalysisDiagnostic {
  code: string;
  severity: FindingSeverity;
  message: string;
  analyzerId?: string;
}

export interface ProjectAnalysisState {
  status: AnalysisStatus;
  rootUri: string;
  diagnostics: AnalysisDiagnostic[];
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
  analysis?: ProjectAnalysisState;
}

export type AdvisorMode = "existing-only" | "existing-first";

export interface AdvisorRequest {
  intent: string;
  mode: AdvisorMode;
}

export interface RecommendationCandidate {
  packageId: string;
  name: string;
  ecosystem: string;
  existing: boolean;
  confidence: number;
  matchedCapabilities: string[];
  reason: string;
  installedVersion?: string;
  declaredVersion?: string;
  guidance?: PackageGuidance;
}

export interface AdvisorResult {
  intent: string;
  mode: AdvisorMode;
  matchedCapabilities: string[];
  newDependencyRequired: boolean | null;
  primary?: RecommendationCandidate;
  alternatives: RecommendationCandidate[];
  explanation: string;
}

export const PROJECT_AI_CONTEXT_SCHEMA_VERSION = "1.0" as const;

export type AIContextProfile = "compact" | "standard" | "detailed";

export interface AIContextTechnology {
  name: string;
  kind: TechnologyKind;
  ecosystem?: string;
  version?: string;
}

export interface AIContextPackage {
  id: string;
  name: string;
  ecosystem: string;
  version?: string;
  purpose?: string;
  capabilities: string[];
  health: PackageHealth;
}

export interface AIContextConstraint {
  severity: FindingSeverity;
  code: string;
  message: string;
  packageId?: string;
  recommendation?: string;
}

export interface AIContextInstructions {
  reuse: string[];
  prefer: string[];
  avoid: string[];
}

export interface AIContextStats {
  characters: number;
  bytes: number;
  approximateTokens: number;
}

export interface ProjectAIContext {
  schemaVersion: typeof PROJECT_AI_CONTEXT_SCHEMA_VERSION;
  sourceSchemaVersion: string;
  profile: AIContextProfile;
  generatedAt: string;
  project: {
    name: string;
    projectType?: string;
    ecosystems: string[];
  };
  technologies: AIContextTechnology[];
  capabilities: Array<{
    id: string;
    name: string;
    providedBy: string[];
  }>;
  packages: AIContextPackage[];
  constraints: AIContextConstraint[];
  instructions: AIContextInstructions;
  exclusions: string[];
  stats: AIContextStats;
}

export const STACKGENOME_EXTENSION_API_VERSION = "1.0" as const;

export interface StackGenomeAnalysisOptions {
  forceRefresh?: boolean;
}

export interface StackGenomeExtensionApi {
  apiVersion: typeof STACKGENOME_EXTENSION_API_VERSION;
  getProjectEcosystem(
    options?: StackGenomeAnalysisOptions,
  ): Promise<ProjectEcosystem>;
  getAIContext(
    profile?: AIContextProfile,
    options?: StackGenomeAnalysisOptions,
  ): Promise<ProjectAIContext>;
  recommend(
    intent: string,
    mode?: AdvisorMode,
    options?: StackGenomeAnalysisOptions,
  ): Promise<AdvisorResult>;
  refresh(): Promise<ProjectEcosystem>;
  invalidate(): void;
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
