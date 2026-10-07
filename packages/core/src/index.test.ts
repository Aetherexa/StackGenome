import { describe, expect, it } from "vitest";
import type {
  AnalyzerContext,
  EcosystemAnalyzer,
} from "@stackgenome/contracts";
import { AnalyzerRegistry, ProjectEcosystemEngine } from "./index.js";

const context: AnalyzerContext = {
  project: { name: "demo", rootUri: "file:///demo" },
  reader: { exists: async () => true, readText: async () => "" },
};

describe("AnalyzerRegistry", () => {
  it("returns only matching analyzers", async () => {
    const matching: EcosystemAnalyzer = {
      id: "matching",
      displayName: "Matching",
      detect: async () => true,
      analyze: async () => ({}),
    };
    const ignored: EcosystemAnalyzer = {
      id: "ignored",
      displayName: "Ignored",
      detect: async () => false,
      analyze: async () => ({}),
    };
    const registry = new AnalyzerRegistry().register(matching).register(ignored);
    await expect(registry.matching(context)).resolves.toEqual([matching]);
  });

  it("rejects duplicate analyzer ids", () => {
    const analyzer: EcosystemAnalyzer = {
      id: "duplicate",
      displayName: "Duplicate",
      detect: async () => true,
      analyze: async () => ({}),
    };
    const registry = new AnalyzerRegistry().register(analyzer);
    expect(() => registry.register(analyzer)).toThrow(/already registered/);
  });
});

describe("ProjectEcosystemEngine", () => {
  it("normalizes analyzer fragments into one ecosystem model", async () => {
    const analyzer: EcosystemAnalyzer = {
      id: "test",
      displayName: "Test",
      detect: async () => true,
      analyze: async () => ({
        technologies: [
          {
            id: "runtime:node",
            name: "Node.js",
            kind: "runtime",
            source: "test",
          },
        ],
        capabilities: [
          {
            id: "capability:http",
            name: "HTTP",
            providedBy: ["demo"],
            confidence: 1,
          },
        ],
      }),
    };
    const result = await new ProjectEcosystemEngine(
      new AnalyzerRegistry().register(analyzer),
    ).analyze(context);

    expect(result.project.name).toBe("demo");
    expect(result.analyzers).toEqual(["test"]);
    expect(result.technologies).toHaveLength(1);
    expect(result.capabilities).toHaveLength(1);
  });

  it("merges shared capabilities from multiple ecosystems", async () => {
    const node: EcosystemAnalyzer = {
      id: "node",
      displayName: "Node",
      detect: async () => true,
      analyze: async () => ({
        project: {
          name: "demo",
          rootUri: "file:///demo",
          projectType: "Frontend application",
        },
        capabilities: [
          {
            id: "capability:http-client",
            name: "HTTP client",
            providedBy: ["axios"],
            confidence: 1,
          },
        ],
      }),
    };
    const python: EcosystemAnalyzer = {
      id: "python",
      displayName: "Python",
      detect: async () => true,
      analyze: async () => ({
        project: {
          name: "demo",
          rootUri: "file:///demo",
          projectType: "Python backend service",
        },
        capabilities: [
          {
            id: "capability:http-client",
            name: "HTTP client",
            providedBy: ["httpx"],
            confidence: 1,
          },
        ],
      }),
    };

    const result = await new ProjectEcosystemEngine(
      new AnalyzerRegistry().register(node).register(python),
    ).analyze(context);

    expect(result.project.projectType).toBe("Multi-ecosystem workspace");
    expect(result.analyzers).toEqual(["node", "python"]);
    expect(result.capabilities).toEqual([
      expect.objectContaining({
        id: "capability:http-client",
        providedBy: ["axios", "httpx"],
      }),
    ]);
  });
});


describe("ProjectEcosystemEngine resilience", () => {
  it("returns unsupported instead of a silent empty success", async () => {
    const engine = new ProjectEcosystemEngine(new AnalyzerRegistry());
    const result = await engine.analyze(context);

    expect(result.analysis?.status).toBe("unsupported");
    expect(result.analyzers).toEqual([]);
  });

  it("preserves successful analyzer results when another analyzer fails", async () => {
    const healthy: EcosystemAnalyzer = {
      id: "healthy",
      displayName: "Healthy",
      detect: async () => true,
      analyze: async () => ({
        technologies: [
          {
            id: "language:typescript",
            name: "TypeScript",
            kind: "language",
            source: "tsconfig.json",
          },
        ],
      }),
    };
    const broken: EcosystemAnalyzer = {
      id: "broken",
      displayName: "Broken",
      detect: async () => true,
      analyze: async () => {
        throw new Error("bad lockfile");
      },
    };

    const result = await new ProjectEcosystemEngine(
      new AnalyzerRegistry().register(healthy).register(broken),
    ).analyze(context);

    expect(result.analysis?.status).toBe("partial");
    expect(result.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "language:typescript" }),
    ]));
    expect(result.analysis?.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "analyzer-analysis-failed",
        analyzerId: "broken",
      }),
    ]));
  });
});
