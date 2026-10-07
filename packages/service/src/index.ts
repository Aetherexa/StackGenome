import { CapabilityAdvisor } from "@stackgenome/advisor";
import { ProjectAIContextGenerator } from "@stackgenome/context";
import type {
  AIContextProfile,
  AdvisorMode,
  AdvisorResult,
  ProjectAIContext,
  ProjectEcosystem,
  StackGenomeAnalysisOptions,
} from "@stackgenome/contracts";

export type ProjectAnalysisLoader = () => Promise<ProjectEcosystem>;

export class ProjectIntelligenceService {
  #cachedAnalysis: Promise<ProjectEcosystem> | undefined;

  constructor(
    private readonly loader: ProjectAnalysisLoader,
    private readonly contextGenerator = new ProjectAIContextGenerator(),
    private readonly advisor = new CapabilityAdvisor(),
  ) {}

  invalidate(): void {
    this.#cachedAnalysis = undefined;
  }

  async getProjectEcosystem(
    options: StackGenomeAnalysisOptions = {},
  ): Promise<ProjectEcosystem> {
    if (options.forceRefresh) {
      this.invalidate();
    }

    if (!this.#cachedAnalysis) {
      const pending = this.loader();
      this.#cachedAnalysis = pending;

      try {
        return await pending;
      } catch (error) {
        if (this.#cachedAnalysis === pending) {
          this.#cachedAnalysis = undefined;
        }
        throw error;
      }
    }

    return this.#cachedAnalysis;
  }

  refresh(): Promise<ProjectEcosystem> {
    return this.getProjectEcosystem({ forceRefresh: true });
  }

  async getAIContext(
    profile: AIContextProfile = "standard",
    options: StackGenomeAnalysisOptions = {},
  ): Promise<ProjectAIContext> {
    const ecosystem = await this.getProjectEcosystem(options);
    return this.contextGenerator.generate(ecosystem, profile);
  }

  async recommend(
    intent: string,
    mode: AdvisorMode = "existing-first",
    options: StackGenomeAnalysisOptions = {},
  ): Promise<AdvisorResult> {
    const ecosystem = await this.getProjectEcosystem(options);
    return this.advisor.recommend(ecosystem, {
      intent,
      mode,
    });
  }
}
