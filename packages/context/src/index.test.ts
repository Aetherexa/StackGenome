import { describe, expect, it } from "vitest";
import type { ProjectEcosystem } from "@stackgenome/contracts";
import { ProjectAIContextGenerator } from "./index.js";

const ecosystem: ProjectEcosystem = {
  schemaVersion: "1.3",
  generatedAt: "2026-10-07T08:00:00.000Z",
  project: {
    name: "mixed-app",
    rootUri: "file:///mixed-app",
    projectType: "Multi-ecosystem workspace",
  },
  technologies: [
    {
      id: "language:typescript",
      name: "TypeScript",
      kind: "language",
      ecosystem: "node",
      source: "package.json",
    },
    {
      id: "framework:react",
      name: "React",
      kind: "framework",
      ecosystem: "node",
      source: "react",
    },
    {
      id: "language:python",
      name: "Python",
      kind: "language",
      ecosystem: "python",
      version: ">=3.12",
      source: "pyproject.toml",
    },
  ],
  packages: [
    {
      id: "npm:zod",
      name: "zod",
      ecosystem: "npm",
      scope: "runtime",
      direct: true,
      declaredVersion: "^4.0.0",
      resolvedVersions: ["4.1.5"],
      purpose: "Runtime schema validation",
      health: "healthy",
      guidance: {
        preferredPatterns: ["Define reusable schemas."],
        avoidPatterns: ["Avoid duplicate manual validation."],
      },
    },
    {
      id: "pypi:httpx",
      name: "httpx",
      ecosystem: "pypi",
      scope: "runtime",
      direct: true,
      declaredVersion: ">=0.28",
      resolvedVersions: ["0.28.1"],
      purpose: "HTTP client",
      health: "healthy",
    },
    {
      id: "npm:legacy",
      name: "legacy",
      ecosystem: "npm",
      scope: "transitive",
      direct: false,
      resolvedVersions: ["1.0.0"],
      health: "warning",
    },
  ],
  capabilities: [
    {
      id: "capability:validation",
      name: "Schema validation",
      providedBy: ["zod"],
      confidence: 1,
    },
    {
      id: "capability:http-client",
      name: "HTTP client",
      providedBy: ["httpx"],
      confidence: 1,
    },
  ],
  findings: [
    {
      id: "deprecated:legacy",
      code: "deprecated-package",
      severity: "warning",
      title: "Deprecated package",
      message: "legacy is deprecated",
      packageId: "npm:legacy",
      recommendation: "Migrate away from legacy.",
    },
  ],
  analyzers: ["node", "python"],
};

describe("ProjectAIContextGenerator", () => {
  it("generates a deterministic mixed-ecosystem context", () => {
    const generator = new ProjectAIContextGenerator();
    const first = generator.generate(ecosystem, "standard");
    const second = generator.generate(ecosystem, "standard");

    expect(first).toEqual(second);
    expect(first.project.ecosystems).toEqual(
      expect.arrayContaining(["node", "python", "npm", "pypi"]),
    );
    expect(first.instructions.reuse).toEqual(
      expect.arrayContaining([
        expect.stringContaining("zod"),
        expect.stringContaining("httpx"),
      ]),
    );
  });

  it("keeps compact context smaller than detailed context", () => {
    const generator = new ProjectAIContextGenerator();
    const compact = generator.generate(ecosystem, "compact");
    const detailed = generator.generate(ecosystem, "detailed");

    expect(compact.stats.characters).toBeLessThan(
      detailed.stats.characters,
    );
    expect(compact.stats.approximateTokens).toBeLessThan(
      detailed.stats.approximateTokens,
    );
    expect(detailed.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "npm:legacy" }),
      ]),
    );
  });

  it("instructs AI to reuse installed capabilities before adding dependencies", () => {
    const result = new ProjectAIContextGenerator().generate(
      ecosystem,
      "standard",
    );

    expect(result.instructions.avoid).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Do not introduce a new dependency"),
        "Avoid duplicate manual validation.",
      ]),
    );
    expect(result.constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "deprecated-package",
          packageId: "npm:legacy",
        }),
      ]),
    );
  });

  it("serializes as valid versioned JSON", () => {
    const generator = new ProjectAIContextGenerator();
    const context = generator.generate(ecosystem, "standard");
    const parsed = JSON.parse(generator.serialize(context));

    expect(parsed.schemaVersion).toBe("1.0");
    expect(parsed.profile).toBe("standard");
    expect(parsed.project.name).toBe("mixed-app");
  });
});
