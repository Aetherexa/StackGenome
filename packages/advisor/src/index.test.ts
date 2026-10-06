import { describe, expect, it } from "vitest";
import type { ProjectEcosystem } from "@stackgenome/contracts";
import { CapabilityAdvisor } from "./index.js";

const base = (overrides: Partial<ProjectEcosystem> = {}): ProjectEcosystem => ({
  schemaVersion: "1.3",
  generatedAt: "2026-10-06T00:00:00.000Z",
  project: { name: "demo", rootUri: "file:///demo" },
  technologies: [],
  packages: [],
  capabilities: [],
  findings: [],
  analyzers: [],
  ...overrides,
});

describe("CapabilityAdvisor", () => {
  it("prefers an existing Node capability and avoids a new dependency", () => {
    const ecosystem = base({
      analyzers: ["node"],
      technologies: [
        {
          id: "framework:react",
          name: "React",
          kind: "framework",
          ecosystem: "node",
          source: "react",
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
          category: "validation",
          health: "healthy",
        },
      ],
      capabilities: [
        {
          id: "capability:validation",
          name: "Schema validation",
          providedBy: ["zod"],
          confidence: 1,
        },
      ],
    });

    const result = new CapabilityAdvisor().recommend(ecosystem, {
      intent: "Add runtime API validation",
      mode: "existing-first",
    });

    expect(result.newDependencyRequired).toBe(false);
    expect(result.primary).toEqual(
      expect.objectContaining({
        packageId: "npm:zod",
        name: "zod",
        existing: true,
        installedVersion: "4.1.5",
      }),
    );
  });

  it("recommends TanStack Query for React query caching when absent", () => {
    const ecosystem = base({
      analyzers: ["node"],
      technologies: [
        {
          id: "framework:react",
          name: "React",
          kind: "framework",
          ecosystem: "node",
          source: "react",
        },
      ],
    });

    const result = new CapabilityAdvisor().recommend(ecosystem, {
      intent: "Add server state caching for API requests",
      mode: "existing-first",
    });

    expect(result.newDependencyRequired).toBe(true);
    expect(result.primary).toEqual(
      expect.objectContaining({
        name: "@tanstack/react-query",
        ecosystem: "npm",
        existing: false,
      }),
    );
  });

  it("recommends Python ecosystem packages for Python projects", () => {
    const ecosystem = base({
      analyzers: ["python"],
      technologies: [
        {
          id: "language:python",
          name: "Python",
          kind: "language",
          ecosystem: "python",
          source: "pyproject.toml",
        },
      ],
    });

    const result = new CapabilityAdvisor().recommend(ecosystem, {
      intent: "I need an HTTP client to call an API",
      mode: "existing-first",
    });

    expect(result.newDependencyRequired).toBe(true);
    expect(result.primary).toEqual(
      expect.objectContaining({
        ecosystem: "pypi",
      }),
    );
    expect(
      [result.primary?.name, ...result.alternatives.map((item) => item.name)],
    ).toEqual(expect.arrayContaining(["httpx", "requests"]));
  });

  it("combines providers in mixed ecosystems and still prefers existing", () => {
    const ecosystem = base({
      analyzers: ["node", "python"],
      packages: [
        {
          id: "npm:axios",
          name: "axios",
          ecosystem: "npm",
          scope: "runtime",
          direct: true,
          resolvedVersions: ["1.12.2"],
          health: "healthy",
        },
        {
          id: "pypi:httpx",
          name: "httpx",
          ecosystem: "pypi",
          scope: "runtime",
          direct: true,
          resolvedVersions: ["0.28.1"],
          health: "healthy",
        },
      ],
      capabilities: [
        {
          id: "capability:http-client",
          name: "HTTP client",
          providedBy: ["axios", "httpx"],
          confidence: 1,
        },
      ],
    });

    const result = new CapabilityAdvisor().recommend(ecosystem, {
      intent: "call an API with an HTTP client",
      mode: "existing-first",
    });

    expect(result.newDependencyRequired).toBe(false);
    expect(result.primary?.existing).toBe(true);
    expect(result.alternatives).toHaveLength(1);
  });

  it("does not suggest a package in existing-only mode", () => {
    const ecosystem = base({ analyzers: ["node"] });

    const result = new CapabilityAdvisor().recommend(ecosystem, {
      intent: "Add schema validation",
      mode: "existing-only",
    });

    expect(result.newDependencyRequired).toBeNull();
    expect(result.primary).toBeUndefined();
  });

  it("returns no recommendation for an unknown intent", () => {
    const result = new CapabilityAdvisor().recommend(base(), {
      intent: "make the project magical",
      mode: "existing-first",
    });

    expect(result.matchedCapabilities).toEqual([]);
    expect(result.primary).toBeUndefined();
    expect(result.newDependencyRequired).toBeNull();
  });
});
