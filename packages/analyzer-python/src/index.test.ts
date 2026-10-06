import { describe, expect, it } from "vitest";
import type {
  AnalyzerContext,
  WorkspaceReader,
} from "@stackgenome/contracts";
import { PythonEcosystemAnalyzer } from "./index.js";

const reader = (files: Record<string, string>): WorkspaceReader => ({
  exists: async (path) => Object.hasOwn(files, path),
  readText: async (path) => {
    const value = files[path];
    if (value === undefined) {
      throw new Error(`Missing test fixture: ${path}`);
    }
    return value;
  },
});

describe("PythonEcosystemAnalyzer", () => {
  it("detects Python projects from supported manifests", async () => {
    const analyzer = new PythonEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({ "requirements.txt": "requests>=2" }),
    };

    await expect(analyzer.detect(context)).resolves.toBe(true);
  });

  it("analyzes pyproject and uv lockfiles", async () => {
    const analyzer = new PythonEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "pyproject.toml": `
[project]
name = "inventory-api"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "pydantic>=2.11",
  "httpx>=0.28"
]

[dependency-groups]
dev = ["pytest>=8", "ruff>=0.13"]

[tool.uv]
package = true
`,
        "uv.lock": `
version = 1
revision = 3

[[package]]
name = "fastapi"
version = "0.116.1"

[[package]]
name = "pydantic"
version = "2.11.9"

[[package]]
name = "httpx"
version = "0.28.1"

[[package]]
name = "pytest"
version = "8.4.2"

[[package]]
name = "ruff"
version = "0.13.3"

[[package]]
name = "starlette"
version = "0.48.0"
`,
      }),
    };

    const result = await analyzer.analyze(context);

    expect(result.project).toEqual(
      expect.objectContaining({
        name: "inventory-api",
        projectType: "Python backend service",
      }),
    );
    expect(result.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pypi:fastapi",
          direct: true,
          declaredVersion: ">=0.115",
          resolvedVersions: ["0.116.1"],
        }),
        expect.objectContaining({
          id: "pypi:starlette",
          direct: false,
          scope: "transitive",
          resolvedVersions: ["0.48.0"],
        }),
      ]),
    );
    expect(result.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "capability:web-server" }),
        expect.objectContaining({ id: "capability:validation" }),
        expect.objectContaining({ id: "capability:http-client" }),
      ]),
    );
    expect(result.technologies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "language:python",
          version: ">=3.12",
        }),
        expect.objectContaining({
          id: "framework:python:fastapi",
        }),
        expect.objectContaining({
          id: "package-manager:python:uv",
        }),
      ]),
    );
  });

  it("reports conflicting pinned requirements", async () => {
    const analyzer = new PythonEcosystemAnalyzer();
    const context: AnalyzerContext = {
      project: { name: "workspace", rootUri: "file:///workspace" },
      reader: reader({
        "requirements.txt": "Django==5.1.0\n",
        "requirements-dev.txt": "django==5.2.0\n",
      }),
    };

    const result = await analyzer.analyze(context);

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "conflicting-pinned-requirements",
          packageName: "django",
          severity: "error",
        }),
      ]),
    );
  });
});
