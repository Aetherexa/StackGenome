import { describe, expect, it } from "vitest";
import type { AnalyzerContext, EcosystemAnalyzer } from "@stackgenome/contracts";
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
        technologies: [{ id: "runtime:node", name: "Node.js", kind: "runtime", source: "test" }],
        capabilities: [{ id: "capability:http", name: "HTTP", providedBy: ["demo"], confidence: 1 }],
      }),
    };
    const result = await new ProjectEcosystemEngine(new AnalyzerRegistry().register(analyzer)).analyze(context);
    expect(result.project.name).toBe("demo");
    expect(result.analyzers).toEqual(["test"]);
    expect(result.technologies).toHaveLength(1);
    expect(result.capabilities).toHaveLength(1);
  });
});
