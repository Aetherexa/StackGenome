import { describe, expect, it, vi } from "vitest";
import type { ProjectEcosystem } from "@stackgenome/contracts";
import { ProjectIntelligenceService } from "./index.js";

const ecosystem = (): ProjectEcosystem => ({
  schemaVersion: "1.3",
  generatedAt: "2026-10-07T09:00:00.000Z",
  project: {
    name: "demo",
    rootUri: "file:///demo",
    projectType: "Frontend application",
  },
  technologies: [
    {
      id: "language:typescript",
      name: "TypeScript",
      kind: "language",
      ecosystem: "node",
      source: "package.json",
    },
  ],
  packages: [
    {
      id: "npm:zod",
      name: "zod",
      ecosystem: "npm",
      scope: "runtime",
      direct: true,
      resolvedVersions: ["4.1.5"],
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
  findings: [],
  analyzers: ["node"],
});

describe("ProjectIntelligenceService", () => {
  it("reuses one in-flight/cached analysis", async () => {
    const loader = vi.fn(async () => ecosystem());
    const service = new ProjectIntelligenceService(loader);

    const [first, second] = await Promise.all([
      service.getProjectEcosystem(),
      service.getProjectEcosystem(),
    ]);
    const third = await service.getProjectEcosystem();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(third).toBe(first);
  });

  it("refreshes and invalidates analysis", async () => {
    let count = 0;
    const loader = vi.fn(async () => {
      count += 1;
      return {
        ...ecosystem(),
        generatedAt: `2026-10-07T09:00:0${count}.000Z`,
      };
    });
    const service = new ProjectIntelligenceService(loader);

    const first = await service.getProjectEcosystem();
    const refreshed = await service.refresh();
    service.invalidate();
    const afterInvalidate = await service.getProjectEcosystem();

    expect(loader).toHaveBeenCalledTimes(3);
    expect(refreshed.generatedAt).not.toBe(first.generatedAt);
    expect(afterInvalidate.generatedAt).not.toBe(refreshed.generatedAt);
  });

  it("clears failed analysis so a later call can retry", async () => {
    const loader = vi
      .fn<() => Promise<ProjectEcosystem>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(ecosystem());
    const service = new ProjectIntelligenceService(loader);

    await expect(service.getProjectEcosystem()).rejects.toThrow(
      "temporary failure",
    );
    await expect(service.getProjectEcosystem()).resolves.toEqual(
      expect.objectContaining({
        project: expect.objectContaining({ name: "demo" }),
      }),
    );

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("builds AI context and recommendations from the same cached analysis", async () => {
    const loader = vi.fn(async () => ecosystem());
    const service = new ProjectIntelligenceService(loader);

    const context = await service.getAIContext("compact");
    const recommendation = await service.recommend(
      "add schema validation",
      "existing-first",
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(context.profile).toBe("compact");
    expect(recommendation.newDependencyRequired).toBe(false);
    expect(recommendation.primary?.name).toBe("zod");
  });
});
