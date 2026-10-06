import { describe, expect, it } from "vitest";
import type { AnalyzerContext, WorkspaceReader } from "@stackgenome/contracts";
import { NodeEcosystemAnalyzer } from "./index.js";

const reader = (files: Record<string, string>): WorkspaceReader => ({
  exists: async (path) => Object.hasOwn(files, path),
  readText: async (path) => {
    const value = files[path];
    if (value === undefined) throw new Error(`Missing test fixture: ${path}`);
    return value;
  },
});

describe("NodeEcosystemAnalyzer", () => {
  it("detects package.json projects", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({ "package.json": "{}" }),
    };
    await expect(analyzer.detect(context)).resolves.toBe(true);
  });

  it("reports declared and resolved dependency versions", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          name: "sample",
          packageManager: "pnpm@10.17.1",
          dependencies: { react: "^19.0.0", zod: "^4.0.0" },
          devDependencies: { typescript: "^5.9.0", vitest: "^3.0.0" },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/zod": { version: "4.1.5" },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "react", declaredVersion: "^19.0.0", resolvedVersions: ["19.1.1"] }),
    ]));
    expect(result.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "capability:validation" }),
      expect.objectContaining({ id: "capability:testing" }),
    ]));
    expect(result.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "framework:react" }),
      expect.objectContaining({ id: "language:typescript" }),
    ]));
  });
});
