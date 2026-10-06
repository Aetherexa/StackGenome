import { describe, expect, it } from "vitest";
import {
  groupResolvedVersions,
  parseNpmLock,
  parsePnpmLock,
  parseYarnLock,
} from "./lockfiles.js";

describe("Node lockfile parsers", () => {
  it("parses npm packages, peers and deprecation metadata", () => {
    const result = parseNpmLock(
      JSON.stringify({
        packages: {
          "node_modules/react": { version: "19.1.1" },
          "node_modules/example": {
            version: "2.0.0",
            peerDependencies: { react: "^18.0.0" },
            deprecated: "Use replacement-package.",
          },
        },
      }),
    );

    expect(result.manager).toBe("npm");
    expect(result.peerMetadataFidelity).toBe("full");
    expect(result.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "react", version: "19.1.1" }),
        expect.objectContaining({
          name: "example",
          version: "2.0.0",
          peerDependencies: { react: "^18.0.0" },
          deprecated: "Use replacement-package.",
        }),
      ]),
    );
  });

  it("parses pnpm package keys and peer metadata", () => {
    const result = parsePnpmLock(`
lockfileVersion: '9.0'
packages:
  react@19.1.1: {}
  '@scope/pkg@2.4.0':
    peerDependencies:
      react: ^19.0.0
    peerDependenciesMeta:
      react:
        optional: true
snapshots:
  zod@4.1.5: {}
`);

    expect(result.manager).toBe("pnpm");
    expect(result.peerMetadataFidelity).toBe("full");
    expect(result.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "react", version: "19.1.1" }),
        expect.objectContaining({
          name: "@scope/pkg",
          version: "2.4.0",
          peerDependencies: { react: "^19.0.0" },
        }),
        expect.objectContaining({ name: "zod", version: "4.1.5" }),
      ]),
    );

    const scoped = result.packages.find(
      (pkg) => pkg.name === "@scope/pkg",
    );
    expect(scoped?.optionalPeers.has("react")).toBe(true);
  });

  it("parses Yarn classic lock entries", () => {
    const result = parseYarnLock(`
# yarn lockfile v1

react@^19.0.0:
  version "19.1.1"
  resolved "https://registry.yarnpkg.com/react"

"@scope/pkg@^2.0.0":
  version "2.4.0"
  peerDependencies:
    react "^19.0.0"
`);

    expect(result.manager).toBe("yarn");
    expect(result.peerMetadataFidelity).toBe("partial");
    expect(result.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "react", version: "19.1.1" }),
        expect.objectContaining({
          name: "@scope/pkg",
          version: "2.4.0",
          peerDependencies: { react: "^19.0.0" },
        }),
      ]),
    );
  });

  it("parses modern Yarn Berry lockfiles with peer metadata", () => {
    const result = parseYarnLock(`
__metadata:
  version: 8
  cacheKey: 10c0

"react@npm:^19.0.0":
  version: 19.1.1
  resolution: "react@npm:19.1.1"

"example@npm:^2.0.0":
  version: 2.3.0
  resolution: "example@npm:2.3.0"
  peerDependencies:
    react: ^19.0.0
  peerDependenciesMeta:
    react:
      optional: true
`);

    expect(result.peerMetadataFidelity).toBe("full");
    expect(result.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "react",
          version: "19.1.1",
        }),
        expect.objectContaining({
          name: "example",
          version: "2.3.0",
          peerDependencies: { react: "^19.0.0" },
        }),
      ]),
    );
    expect(
      result.packages.find((pkg) => pkg.name === "example")
        ?.optionalPeers.has("react"),
    ).toBe(true);
  });

  it("groups multiple resolved versions", () => {
    const versions = groupResolvedVersions([
      {
        name: "react",
        version: "18.3.1",
        peerDependencies: {},
        optionalPeers: new Set(),
      },
      {
        name: "react",
        version: "19.1.1",
        peerDependencies: {},
        optionalPeers: new Set(),
      },
    ]);

    expect([...(versions.get("react") ?? [])].sort()).toEqual([
      "18.3.1",
      "19.1.1",
    ]);
  });
});
