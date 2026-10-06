import type { PackageGuidance } from "@stackgenome/contracts";

export interface PackageKnowledgeEntry {
  purpose: string;
  category: string;
  capabilities?: string[];
  primaryCapabilities?: string[];
  aliases?: string[];
  guidance?: PackageGuidance;
  frameworks?: string[];
}

export interface CatalogTechnology extends PackageKnowledgeEntry {
  packageId: string;
  name: string;
  ecosystem: string;
}

export interface CapabilityDefinition {
  name: string;
  aliases: string[];
}

export const CAPABILITY_DEFINITIONS: Record<string, CapabilityDefinition> = {
  ui: {
    name: "UI framework",
    aliases: ["ui", "user interface", "frontend components", "component framework"],
  },
  routing: {
    name: "Application routing",
    aliases: ["routing", "router", "navigation", "routes"],
  },
  "server-rendering": {
    name: "Server rendering",
    aliases: ["server rendering", "ssr", "server side rendering"],
  },
  "dependency-injection": {
    name: "Dependency injection",
    aliases: ["dependency injection", "di container", "inject dependencies"],
  },
  validation: {
    name: "Schema validation",
    aliases: ["validation", "validate", "schema validation", "runtime validation", "api validation", "input validation"],
  },
  "http-client": {
    name: "HTTP client",
    aliases: ["http client", "api client", "http request", "api request", "rest client", "call api"],
  },
  "server-state": {
    name: "Server-state management",
    aliases: ["server state", "remote state", "api state", "data fetching state"],
  },
  "query-caching": {
    name: "Query caching",
    aliases: ["query caching", "api caching", "server state caching", "request caching", "cache api", "data cache"],
  },
  "client-state": {
    name: "Client state management",
    aliases: ["client state", "state management", "global state", "application state"],
  },
  forms: {
    name: "Form management",
    aliases: ["form", "forms", "form state", "form validation", "manage form"],
  },
  authentication: {
    name: "Authentication",
    aliases: ["authentication", "auth", "login", "identity", "sign in"],
  },
  database: {
    name: "Database access",
    aliases: ["database", "db access", "persistence", "sql database"],
  },
  orm: {
    name: "Object-relational mapping",
    aliases: ["orm", "object relational", "database models", "database mapping"],
  },
  "unit-testing": {
    name: "Unit testing",
    aliases: ["unit test", "unit testing", "test functions", "test components"],
  },
  "e2e-testing": {
    name: "End-to-end testing",
    aliases: ["e2e", "end to end", "browser testing", "ui automation"],
  },
  "async-testing": {
    name: "Async testing",
    aliases: ["async test", "async testing", "test asyncio"],
  },
  linting: {
    name: "Linting",
    aliases: ["lint", "linting", "code lint", "static lint"],
  },
  formatting: {
    name: "Formatting",
    aliases: ["format code", "formatter", "formatting"],
  },
  build: {
    name: "Build tooling",
    aliases: ["build tool", "bundler", "bundle project", "build project"],
  },
  typescript: {
    name: "TypeScript",
    aliases: ["typescript", "type script"],
  },
  "type-checking": {
    name: "Static type checking",
    aliases: ["type check", "type checking", "static types"],
  },
  ai: {
    name: "AI integration",
    aliases: ["ai", "llm", "openai", "language model", "generative ai"],
  },
  "llm-orchestration": {
    name: "LLM orchestration",
    aliases: ["llm orchestration", "agent workflow", "ai workflow", "chains"],
  },
  "data-analysis": {
    name: "Data analysis",
    aliases: ["data analysis", "dataframe", "tabular data"],
  },
  "numerical-computing": {
    name: "Numerical computing",
    aliases: ["numerical", "matrix", "scientific computing", "array computing"],
  },
  "web-server": {
    name: "Web server",
    aliases: ["web server", "http server", "api server", "backend server"],
  },
  api: {
    name: "API toolkit",
    aliases: ["rest api", "api toolkit", "api framework"],
  },
  "application-server": {
    name: "Application server",
    aliases: ["application server", "asgi", "wsgi", "serve python app"],
  },
  aws: {
    name: "AWS integration",
    aliases: ["aws", "amazon web services", "s3", "dynamodb"],
  },
  azure: {
    name: "Azure integration",
    aliases: ["azure", "microsoft azure"],
  },
};

export const CAPABILITY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(CAPABILITY_DEFINITIONS).map(([id, definition]) => [
    id,
    definition.name,
  ]),
);

export const NODE_PACKAGE_KNOWLEDGE: Record<string, PackageKnowledgeEntry> = {
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
    frameworks: ["react"],
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
    primaryCapabilities: ["validation"],
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
    primaryCapabilities: ["validation"],
  },
  joi: {
    purpose: "Schema description and validation",
    category: "validation",
    capabilities: ["validation"],
    primaryCapabilities: ["validation"],
  },
  axios: {
    purpose: "Promise-based HTTP client",
    category: "http",
    capabilities: ["http-client"],
    primaryCapabilities: ["http-client"],
    guidance: {
      preferredPatterns: ["Reuse the project's configured Axios instance and interceptors."],
      avoidPatterns: ["Avoid creating ad-hoc Axios instances when a shared client already exists."],
    },
  },
  ky: {
    purpose: "Fetch-based HTTP client",
    category: "http",
    capabilities: ["http-client"],
    primaryCapabilities: ["http-client"],
  },
  "@tanstack/react-query": {
    purpose: "Server-state fetching, caching and mutation management",
    category: "server-state",
    capabilities: ["server-state", "query-caching"],
    primaryCapabilities: ["server-state", "query-caching"],
    frameworks: ["react", "next"],
    guidance: {
      preferredPatterns: [
        "Use stable query keys.",
        "Use mutations for write operations and invalidate affected queries.",
        "Reuse the existing QueryClient configuration.",
      ],
      avoidPatterns: ["Avoid introducing parallel bespoke caches for server state."],
    },
  },
  swr: {
    purpose: "React hooks for remote data fetching and caching",
    category: "server-state",
    capabilities: ["server-state", "query-caching"],
    primaryCapabilities: ["server-state", "query-caching"],
    frameworks: ["react", "next"],
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
    frameworks: ["react"],
  },
  "react-hook-form": {
    purpose: "Performant React form state and validation orchestration",
    category: "forms",
    capabilities: ["forms"],
    primaryCapabilities: ["forms"],
    frameworks: ["react", "next"],
    guidance: {
      preferredPatterns: ["Prefer register/useController and reuse existing form abstractions."],
      avoidPatterns: ["Avoid adding Formik when React Hook Form already satisfies the requirement."],
    },
  },
  "@azure/msal-browser": {
    purpose: "Microsoft identity authentication for browser applications",
    category: "authentication",
    capabilities: ["authentication", "azure"],
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
  openai: {
    purpose: "OpenAI API client for JavaScript and TypeScript",
    category: "ai",
    capabilities: ["ai"],
  },
};

export const PYTHON_PACKAGE_KNOWLEDGE: Record<string, PackageKnowledgeEntry> = {
  django: {
    purpose: "Full-stack Python web framework",
    category: "framework",
    capabilities: ["web-server", "routing", "orm"],
  },
  flask: {
    purpose: "Lightweight Python web framework",
    category: "framework",
    capabilities: ["web-server", "routing"],
  },
  fastapi: {
    purpose: "Typed asynchronous API framework",
    category: "framework",
    capabilities: ["web-server", "routing", "validation", "api"],
    guidance: {
      preferredPatterns: ["Use typed request and response models.", "Reuse dependency injection through FastAPI dependencies."],
      avoidPatterns: ["Avoid duplicating validation already represented by Pydantic models."],
    },
  },
  pydantic: {
    purpose: "Runtime data validation using Python type hints",
    category: "validation",
    capabilities: ["validation"],
    primaryCapabilities: ["validation"],
    guidance: {
      preferredPatterns: ["Use BaseModel for boundary validation and serialization.", "Keep validation rules close to domain or API models."],
      avoidPatterns: ["Avoid duplicating equivalent manual validation when a Pydantic model already exists."],
    },
  },
  requests: {
    purpose: "Synchronous HTTP client",
    category: "http",
    capabilities: ["http-client"],
    primaryCapabilities: ["http-client"],
  },
  httpx: {
    purpose: "Synchronous and asynchronous HTTP client",
    category: "http",
    capabilities: ["http-client"],
    guidance: {
      preferredPatterns: ["Reuse shared Client or AsyncClient instances when the project provides them."],
      avoidPatterns: ["Avoid adding requests for asynchronous workflows when HTTPX is already installed."],
    },
  },
  sqlalchemy: {
    purpose: "SQL toolkit and object-relational mapper",
    category: "database",
    capabilities: ["database", "orm"],
    primaryCapabilities: ["database", "orm"],
  },
  "django-rest-framework": {
    purpose: "REST API toolkit for Django",
    category: "api",
    capabilities: ["api"],
    frameworks: ["django"],
  },
  pytest: {
    purpose: "Python testing framework",
    category: "testing",
    capabilities: ["unit-testing"],
    primaryCapabilities: ["unit-testing"],
  },
  "pytest-asyncio": {
    purpose: "Asyncio support for pytest",
    category: "testing",
    capabilities: ["async-testing"],
  },
  uvicorn: {
    purpose: "ASGI application server",
    category: "runtime",
    capabilities: ["application-server"],
  },
  gunicorn: {
    purpose: "WSGI process manager and application server",
    category: "runtime",
    capabilities: ["application-server"],
  },
  numpy: {
    purpose: "Numerical computing library",
    category: "data",
    capabilities: ["numerical-computing"],
  },
  pandas: {
    purpose: "Tabular data analysis library",
    category: "data",
    capabilities: ["data-analysis"],
  },
  boto3: {
    purpose: "AWS SDK for Python",
    category: "cloud",
    capabilities: ["aws"],
  },
  "azure-identity": {
    purpose: "Azure identity authentication library",
    category: "authentication",
    capabilities: ["authentication", "azure"],
  },
  openai: {
    purpose: "OpenAI API client",
    category: "ai",
    capabilities: ["ai"],
  },
  langchain: {
    purpose: "LLM application framework",
    category: "ai",
    capabilities: ["ai", "llm-orchestration"],
  },
  ruff: {
    purpose: "Python linter and formatter",
    category: "quality",
    capabilities: ["linting", "formatting"],
  },
  black: {
    purpose: "Python code formatter",
    category: "quality",
    capabilities: ["formatting"],
  },
  mypy: {
    purpose: "Static type checker for Python",
    category: "quality",
    capabilities: ["type-checking"],
  },
};

export const normalizePythonPackageName = (name: string): string =>
  name.trim().toLowerCase().replace(/[_.]+/g, "-");

const toCatalog = (
  ecosystem: string,
  prefix: string,
  knowledge: Record<string, PackageKnowledgeEntry>,
): CatalogTechnology[] =>
  Object.entries(knowledge).map(([name, entry]) => ({
    packageId: `${prefix}:${name}`,
    name,
    ecosystem,
    ...entry,
  }));

export const TECHNOLOGY_CATALOG: CatalogTechnology[] = [
  ...toCatalog("npm", "npm", NODE_PACKAGE_KNOWLEDGE),
  ...toCatalog("pypi", "pypi", PYTHON_PACKAGE_KNOWLEDGE),
];
