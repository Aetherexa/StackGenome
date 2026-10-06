import type {
  AnalyzerContext,
  Capability,
  EcosystemAnalyzer,
  EcosystemPackage,
  ProjectEcosystem,
  Technology,
} from "@stackgenome/contracts";

interface PackageManifest {
  name?: string;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  packageManager?: string;
}

interface PackageLock {
  packages?: Record<string, { version?: string }>;
}

const PACKAGE_PURPOSES: Record<string, string> = {
  react: "UI framework",
  "react-dom": "React DOM renderer",
  vue: "UI framework",
  angular: "Application framework",
  express: "HTTP server framework",
  fastify: "HTTP server framework",
  zod: "Schema validation",
  axios: "HTTP client",
  vitest: "Unit testing",
  jest: "Unit testing",
  typescript: "TypeScript compiler",
  vite: "Build tool and development server",
  next: "React application framework",
};

const CAPABILITY_PACKAGES: Record<string, { name: string; packages: string[] }> = {
  validation: { name: "Schema validation", packages: ["zod", "joi", "yup"] },
  http: { name: "HTTP client", packages: ["axios", "got", "ky"] },
  testing: { name: "Unit testing", packages: ["vitest", "jest", "mocha"] },
  ui: { name: "UI framework", packages: ["react", "vue", "angular", "svelte"] },
};

const FRAMEWORKS = new Map<string, string>([
  ["react", "React"], ["vue", "Vue"], ["angular", "Angular"], ["next", "Next.js"],
  ["svelte", "Svelte"], ["express", "Express"], ["fastify", "Fastify"],
]);

const BUILD_TOOLS = new Map<string, string>([
  ["vite", "Vite"], ["webpack", "Webpack"], ["rollup", "Rollup"], ["esbuild", "esbuild"],
]);

const parseJson = <T>(text: string, fileName: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Unable to parse ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const collectDeclared = (manifest: PackageManifest): EcosystemPackage[] => {
  const sections = [
    ["runtime", manifest.dependencies],
    ["development", manifest.devDependencies],
    ["peer", manifest.peerDependencies],
    ["optional", manifest.optionalDependencies],
  ] as const;
  const result = new Map<string, EcosystemPackage>();

  for (const [scope, dependencies] of sections) {
    for (const [name, version] of Object.entries(dependencies ?? {})) {
      if (!result.has(name)) {
        result.set(name, {
          id: `npm:${name}`,
          name,
          ecosystem: "npm",
          scope,
          declaredVersion: version,
          resolvedVersions: [],
          ...(PACKAGE_PURPOSES[name] ? { purpose: PACKAGE_PURPOSES[name] } : {}),
        });
      }
    }
  }
  return [...result.values()];
};

const readResolvedVersions = (lock: PackageLock | undefined): Map<string, Set<string>> => {
  const versions = new Map<string, Set<string>>();
  for (const [path, metadata] of Object.entries(lock?.packages ?? {})) {
    const marker = "node_modules/";
    const index = path.lastIndexOf(marker);
    if (index < 0 || !metadata.version) continue;
    const name = path.slice(index + marker.length);
    const bucket = versions.get(name) ?? new Set<string>();
    bucket.add(metadata.version);
    versions.set(name, bucket);
  }
  return versions;
};

const detectTechnologies = (manifest: PackageManifest, packageNames: Set<string>): Technology[] => {
  const technologies: Technology[] = [
    { id: "language:javascript", name: "JavaScript", kind: "language", source: "package.json" },
  ];
  if (packageNames.has("typescript")) {
    technologies.push({ id: "language:typescript", name: "TypeScript", kind: "language", source: "package.json" });
  }
  for (const [pkg, name] of FRAMEWORKS) {
    if (packageNames.has(pkg)) technologies.push({ id: `framework:${pkg}`, name, kind: "framework", source: pkg });
  }
  for (const [pkg, name] of BUILD_TOOLS) {
    if (packageNames.has(pkg)) technologies.push({ id: `build-system:${pkg}`, name, kind: "build-system", source: pkg });
  }
  if (manifest.engines?.node) {
    technologies.push({ id: "runtime:node", name: "Node.js", kind: "runtime", version: manifest.engines.node, source: "package.json#engines.node" });
  }
  if (manifest.packageManager) {
    const separator = manifest.packageManager.lastIndexOf("@");
    const name = separator > 0 ? manifest.packageManager.slice(0, separator) : manifest.packageManager;
    const version = separator > 0 ? manifest.packageManager.slice(separator + 1) : undefined;
    technologies.push({
      id: `package-manager:${name}`,
      name,
      kind: "package-manager",
      ...(version ? { version } : {}),
      source: "package.json#packageManager",
    });
  }
  return technologies;
};

const detectCapabilities = (packageNames: Set<string>): Capability[] =>
  Object.entries(CAPABILITY_PACKAGES).flatMap(([id, definition]) => {
    const providers = definition.packages.filter((pkg) => packageNames.has(pkg));
    return providers.length ? [{
      id: `capability:${id}`,
      name: definition.name,
      providedBy: providers,
      confidence: 1,
    }] : [];
  });

export class NodeEcosystemAnalyzer implements EcosystemAnalyzer {
  readonly id = "node";
  readonly displayName = "Node.js ecosystem";

  async detect(context: AnalyzerContext): Promise<boolean> {
    return context.reader.exists("package.json");
  }

  async analyze(context: AnalyzerContext): Promise<Partial<ProjectEcosystem>> {
    const manifest = parseJson<PackageManifest>(await context.reader.readText("package.json"), "package.json");
    const packages = collectDeclared(manifest);

    let lock: PackageLock | undefined;
    if (await context.reader.exists("package-lock.json")) {
      lock = parseJson<PackageLock>(await context.reader.readText("package-lock.json"), "package-lock.json");
    }

    const resolved = readResolvedVersions(lock);
    for (const pkg of packages) pkg.resolvedVersions = [...(resolved.get(pkg.name) ?? [])].sort();

    const packageNames = new Set(packages.map((pkg) => pkg.name));
    return {
      project: { ...context.project, ...(manifest.name ? { name: manifest.name } : {}) },
      packages,
      technologies: detectTechnologies(manifest, packageNames),
      capabilities: detectCapabilities(packageNames),
      findings: packages
        .filter((pkg) => pkg.resolvedVersions.length > 1)
        .map((pkg) => ({
          id: `duplicate:${pkg.name}`,
          severity: "warning" as const,
          title: "Multiple resolved versions",
          message: `${pkg.name} resolves to ${pkg.resolvedVersions.join(", ")}.`,
          packageName: pkg.name,
        })),
    };
  }
}
