import { describe, expect, it } from "vitest";
import {
  parsePipfile,
  parsePipfileLock,
  parsePyProject,
  parseRequirements,
  parseTomlLockPackages,
} from "./parsers.js";

describe("Python manifest parsers", () => {
  it("parses PEP 621 and Poetry pyproject dependencies", () => {
    const result = parsePyProject(`
[project]
name = "api-service"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "httpx[http2]>=0.28; python_version >= '3.12'"
]

[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.13"]

[tool.poetry.group.docs.dependencies]
mkdocs = "^1.6"
`);

    expect(result.name).toBe("api-service");
    expect(result.requiresPython).toBe(">=3.12");
    expect(result.declarations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "fastapi",
          constraint: ">=0.115",
          scope: "runtime",
        }),
        expect.objectContaining({
          name: "pytest",
          scope: "development",
        }),
        expect.objectContaining({
          name: "mkdocs",
          scope: "optional",
        }),
      ]),
    );
  });

  it("parses requirements files", () => {
    const result = parseRequirements(`
# core
Django==5.2.7
requests>=2.32
httpx[http2]~=0.28 ; python_version >= "3.11"
-r requirements-extra.txt
`);

    expect(result).toEqual([
      expect.objectContaining({ name: "django", constraint: "==5.2.7" }),
      expect.objectContaining({ name: "requests", constraint: ">=2.32" }),
      expect.objectContaining({ name: "httpx", constraint: "~=0.28" }),
    ]);
  });

  it("parses Poetry and uv lock package tables", () => {
    const poetry = parseTomlLockPackages(
      `
[[package]]
name = "fastapi"
version = "0.116.1"

[[package]]
name = "pydantic"
version = "2.11.9"
`,
      "poetry.lock",
    );

    const uv = parseTomlLockPackages(
      `
version = 1
revision = 3

[[package]]
name = "httpx"
version = "0.28.1"
`,
      "uv.lock",
    );

    expect(poetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "fastapi", version: "0.116.1" }),
      ]),
    );
    expect(uv).toEqual([
      expect.objectContaining({ name: "httpx", version: "0.28.1" }),
    ]);
  });

  it("parses Pipfile and Pipfile.lock", () => {
    const pipfile = parsePipfile(`
[requires]
python_version = "3.12"

[packages]
requests = ">=2.32"
fastapi = "*"

[dev-packages]
pytest = ">=8"
`);

    const lock = parsePipfileLock(
      JSON.stringify({
        default: {
          requests: { version: "==2.32.5" },
          fastapi: { version: "==0.116.1" },
        },
        develop: {
          pytest: { version: "==8.4.2" },
        },
      }),
    );

    expect(pipfile.requiresPython).toBe("3.12");
    expect(pipfile.declarations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "pytest", scope: "development" }),
      ]),
    );
    expect(lock).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "requests", version: "2.32.5" }),
        expect.objectContaining({ name: "pytest", version: "8.4.2" }),
      ]),
    );
  });
});
