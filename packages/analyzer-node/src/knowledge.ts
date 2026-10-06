import type { PackageGuidance } from "@stackgenome/contracts";

export interface PackageKnowledge {
  purpose: string;
  category: string;
  capabilities?: string[];
  guidance?: PackageGuidance;
}

export const PACKAGE_KNOWLEDGE: Record<string, PackageKnowledge> = {
  react: {
    purpose: "Component-based UI framework",
    category: "ui",
    capabilities: ["ui"],
    guidance: {
      preferredPatterns: ["Prefer function components and hooks.", "Reuse existing project component patterns."],
      avoidPatterns: ["Do not introduce a second UI framework for the same responsibility."],
    },
  },
  "@angular/core": {
    purpose: "Angular application framework",
    category: "ui",
    capabilities: ["ui"],
  },
  vue: {
    purpose: "Progressive UI framework",
    category: "ui",
    capabilities: ["ui"],
  },
  svelte: {
    purpose: "Compiler-based UI framework",
    category: "ui",
    capabilities: ["ui"],
  },
  next: {
    purpose: "React full-stack application framework",
    category: "framework",
    capabilities: ["ui", "routing", "server-rendering"],
  },
  express: {
    purpose: "HTTP server framework",
    category: "web-server",
    capabilities: ["web-server"],
  },
  fastify: {
    purpose: "High-performance HTTP server framework",
    category: "web-server",
    capabilities: ["web-server"],
  },
  "@nestjs/core": {
    purpose: "Node.js server application framework",
    category: "framework",
    capabilities: ["web-server", "dependency-injection"],
  },
  zod: {
    purpose: "Runtime schema validation with static type inference",
    category: "validation",
    capabilities: ["validation"],
    guidance: {
      preferredPatterns: [
        "Define reusable schemas near domain boundaries.",
        "Infer TypeScript types from schemas where practical.",
        "Use safeParse when validation failure is an expected control path.",
      ],
      avoidPatterns: [
        "Avoid duplicating a Zod schema with a manually maintained equivalent type.",
        "Avoid adding another validation library when Zod already covers the requirement.",
      ],
    },
  },
  yup: {
    purpose: "Object schema validation",
    category: "validation",
    capabilities: ["validation"],
  },
  joi: {
    purpose: "Schema description and validation",
    category: "validation",
    capabilities: ["validation"],
  },
  axios: {
    purpose: "Promise-based HTTP client",
    category: "http",
    capabilities: ["http-client"],
    guidance: {
      preferredPatterns: ["Reuse the project's configured Axios instance and interceptors."],
      avoidPatterns: ["Avoid creating ad-hoc Axios instances when a shared client already exists."],
    },
  },
  ky: {
    purpose: "Fetch-based HTTP client",
    category: "http",
    capabilities: ["http-client"],
  },
  "@tanstack/react-query": {
    purpose: "Server-state fetching, caching and mutation management",
    category: "server-state",
    capabilities: ["server-state", "query-caching"],
    guidance: {
      preferredPatterns: [
        "Use stable query keys.",
        "Use mutations for write operations and invalidate affected queries.",
        "Reuse the existing QueryClient configuration.",
      ],
      avoidPatterns: ["Avoid introducing parallel bespoke caches for server state."],
    },
  },
  redux: {
    purpose: "Predictable application state container",
    category: "state-management",
    capabilities: ["client-state"],
  },
  "@reduxjs/toolkit": {
    purpose: "Official Redux state-management toolkit",
    category: "state-management",
    capabilities: ["client-state"],
  },
  zustand: {
    purpose: "Minimal state-management library",
    category: "state-management",
    capabilities: ["client-state"],
  },
  "react-hook-form": {
    purpose: "Performant React form state and validation orchestration",
    category: "forms",
    capabilities: ["forms"],
    guidance: {
      preferredPatterns: ["Prefer register/useController and reuse existing form abstractions."],
      avoidPatterns: ["Avoid adding Formik when React Hook Form already satisfies the requirement."],
    },
  },
  "@azure/msal-browser": {
    purpose: "Microsoft identity authentication for browser applications",
    category: "authentication",
    capabilities: ["authentication"],
  },
  prisma: {
    purpose: "Type-safe database ORM and schema toolkit",
    category: "database",
    capabilities: ["database", "orm"],
  },
  typeorm: {
    purpose: "Object-relational mapper",
    category: "database",
    capabilities: ["database", "orm"],
  },
  vitest: {
    purpose: "Vite-native unit testing framework",
    category: "testing",
    capabilities: ["unit-testing"],
  },
  jest: {
    purpose: "JavaScript testing framework",
    category: "testing",
    capabilities: ["unit-testing"],
  },
  "@playwright/test": {
    purpose: "Browser end-to-end testing framework",
    category: "testing",
    capabilities: ["e2e-testing"],
  },
  cypress: {
    purpose: "Browser end-to-end testing framework",
    category: "testing",
    capabilities: ["e2e-testing"],
  },
  vite: {
    purpose: "Frontend build tool and development server",
    category: "build",
    capabilities: ["build"],
  },
  webpack: {
    purpose: "JavaScript module bundler",
    category: "build",
    capabilities: ["build"],
  },
  esbuild: {
    purpose: "JavaScript and TypeScript bundler/minifier",
    category: "build",
    capabilities: ["build"],
  },
  typescript: {
    purpose: "Typed superset of JavaScript and compiler",
    category: "language-tooling",
    capabilities: ["typescript"],
  },
  eslint: {
    purpose: "JavaScript and TypeScript linting",
    category: "quality",
    capabilities: ["linting"],
  },
  "@biomejs/biome": {
    purpose: "Formatter and linter toolchain",
    category: "quality",
    capabilities: ["linting", "formatting"],
  },
  prettier: {
    purpose: "Opinionated code formatter",
    category: "quality",
    capabilities: ["formatting"],
  },
};

export const CAPABILITY_NAMES: Record<string, string> = {
  ui: "UI framework",
  routing: "Application routing",
  "server-rendering": "Server rendering",
  "web-server": "Web server",
  "dependency-injection": "Dependency injection",
  validation: "Schema validation",
  "http-client": "HTTP client",
  "server-state": "Server-state management",
  "query-caching": "Query caching",
  "client-state": "Client state management",
  forms: "Form management",
  authentication: "Authentication",
  database: "Database access",
  orm: "Object-relational mapping",
  "unit-testing": "Unit testing",
  "e2e-testing": "End-to-end testing",
  build: "Build tooling",
  typescript: "TypeScript",
  linting: "Linting",
  formatting: "Formatting",
};
