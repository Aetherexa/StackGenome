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

  it("reports direct and transitive packages with resolved versions", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          name: "sample",
          packageManager: "npm@11.6.0",
          engines: { node: ">=22" },
          dependencies: {
            react: "^19.0.0",
            zod: "^4.0.0",
          },
          devDependencies: {
            typescript: "^5.9.0",
            vitest: "^3.0.0",
          },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/zod": { version: "4.1.5" },
            "node_modules/typescript": { version: "5.9.3" },
            "node_modules/vitest": { version: "3.2.4" },
            "node_modules/tinybench": { version: "4.1.0" },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);

    expect(result.project).toEqual(expect.objectContaining({
      name: "sample",
      projectType: "Frontend application",
    }));
    expect(result.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "react",
        direct: true,
        declaredVersion: "^19.0.0",
        resolvedVersions: ["19.1.1"],
      }),
      expect.objectContaining({
        name: "tinybench",
        direct: false,
        scope: "transitive",
        resolvedVersions: ["4.1.0"],
      }),
    ]));
    expect(result.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "capability:validation" }),
      expect.objectContaining({ id: "capability:unit-testing" }),
    ]));
    expect(result.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "framework:react" }),
      expect.objectContaining({ id: "language:typescript" }),
      expect.objectContaining({ id: "package-manager:npm", version: "11.6.0" }),
    ]));
  });

  it("detects duplicates, deprecated packages and peer mismatches", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          dependencies: {
            react: "^19.0.0",
            "legacy-widget": "^2.0.0",
          },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/a/node_modules/react": { version: "18.3.1" },
            "node_modules/legacy-widget": {
              version: "2.0.0",
              deprecated: "Package is no longer maintained.",
              peerDependencies: { react: "^18.0.0" },
            },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);
    const codes = result.findings?.map((finding) => finding.code) ?? [];

    expect(codes).toContain("duplicate-resolved-versions");
    expect(codes).toContain("deprecated-package");
    expect(codes).not.toContain("peer-dependency-mismatch");

    const legacy = result.packages?.find((pkg) => pkg.name === "legacy-widget");
    expect(legacy?.health).toBe("warning");
  });

  it("detects an incompatible peer when no compatible resolved version exists", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          dependencies: {
            react: "^19.0.0",
            "legacy-widget": "^2.0.0",
          },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/legacy-widget": {
              version: "2.0.0",
              peerDependencies: { react: "^18.0.0" },
            },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "peer-dependency-mismatch",
        packageName: "legacy-widget",
      }),
    ]));
  });

  it("uses pnpm lockfiles when pnpm is declared", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          packageManager: "pnpm@10.17.1",
          dependencies: { zod: "^4.0.0" },
        }),
        "pnpm-lock.yaml": `
lockfileVersion: '9.0'
packages:
  zod@4.1.5: {}
`,
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "zod", resolvedVersions: ["4.1.5"] }),
    ]));
    expect(result.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "package-manager:pnpm", version: "10.17.1" }),
    ]));
  });
});


  it("detects TypeScript from tsconfig.json without a direct typescript dependency", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "legacy-ts", rootUri: "file:///legacy-ts" },
      reader: reader({
        "package.json": JSON.stringify({ dependencies: { lodash: "^4.17.21" } }),
        "tsconfig.json": JSON.stringify({ compilerOptions: { target: "es5" } }),
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "language:typescript",
        source: "tsconfig.json",
      }),
    ]));
  });

  it("continues manifest analysis when a lockfile cannot be parsed", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          dependencies: { zod: "^4.0.0" },
        }),
        "yarn.lock": "not: [valid",
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "zod",
        direct: true,
        declaredVersion: "^4.0.0",
      }),
    ]));
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "lockfile-parse-failed",
      }),
    ]));
  });


  it("treats duplicate resolved versions as informational observations", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          dependencies: { react: "^19.0.0" },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/a/node_modules/react": { version: "18.3.1" },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate-resolved-versions",
        severity: "info",
      }),
    ]));
  });

  it("treats peer issues from transitive packages as informational", async () => {
    const analyzer = new NodeEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "package.json": JSON.stringify({
          dependencies: { react: "^19.0.0" },
        }),
        "package-lock.json": JSON.stringify({
          packages: {
            "node_modules/react": { version: "19.1.1" },
            "node_modules/transitive-widget": {
              version: "1.0.0",
              peerDependencies: { vue: "^3.0.0" },
            },
          },
        }),
      }),
    };

    const result = await analyzer.analyze(context);
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "peer-dependency-missing",
        packageName: "transitive-widget",
        severity: "info",
      }),
    ]));
  });
