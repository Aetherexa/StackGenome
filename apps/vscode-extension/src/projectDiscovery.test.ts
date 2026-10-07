import { describe, expect, it } from "vitest";
import { selectProjectCandidate } from "./projectDiscovery.js";

describe("selectProjectCandidate", () => {
  it("selects a single nested project root", () => {
    expect(
      selectProjectCandidate([
        {
          rootPath: "/workspace/WebResources",
          workspaceRootPath: "/workspace",
          markers: ["package.json", "tsconfig.json"],
        },
      ]),
    ).toEqual(
      expect.objectContaining({ rootPath: "/workspace/WebResources" }),
    );
  });

  it("prefers the project containing the active editor", () => {
    const selected = selectProjectCandidate(
      [
        {
          rootPath: "/workspace/apps/api",
          workspaceRootPath: "/workspace",
          markers: ["package.json"],
        },
        {
          rootPath: "/workspace/apps/web",
          workspaceRootPath: "/workspace",
          markers: ["package.json", "tsconfig.json"],
        },
      ],
      "/workspace/apps/web/src/App.tsx",
    );

    expect(selected?.rootPath).toBe("/workspace/apps/web");
  });

  it("prefers a supported manifest at the workspace root", () => {
    const selected = selectProjectCandidate([
      {
        rootPath: "/workspace",
        workspaceRootPath: "/workspace",
        markers: ["package.json"],
      },
      {
        rootPath: "/workspace/packages/a",
        workspaceRootPath: "/workspace",
        markers: ["package.json"],
      },
    ]);

    expect(selected?.rootPath).toBe("/workspace");
  });

  it("prefers package manifests over tsconfig-only candidates when ambiguous", () => {
    const selected = selectProjectCandidate([
      {
        rootPath: "/workspace/legacy",
        workspaceRootPath: "/workspace",
        markers: ["tsconfig.json"],
      },
      {
        rootPath: "/workspace/web",
        workspaceRootPath: "/workspace",
        markers: ["package.json"],
      },
    ]);

    expect(selected?.rootPath).toBe("/workspace/web");
  });
});
