import type { PackageGuidance } from "@stackgenome/contracts";

export interface PythonPackageKnowledge {
  purpose: string;
  category: string;
  capabilities?: string[];
  guidance?: PackageGuidance;
}

export const PYTHON_PACKAGE_KNOWLEDGE: Record<string, PythonPackageKnowledge> = {
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
    capabilities: ["web-server", "routing", "validation"],
    guidance: {
      preferredPatterns: [
        "Use typed request and response models.",
        "Reuse dependency injection through FastAPI dependencies.",
      ],
      avoidPatterns: [
        "Avoid duplicating validation already represented by Pydantic models.",
      ],
    },
  },
  pydantic: {
    purpose: "Runtime data validation using Python type hints",
    category: "validation",
    capabilities: ["validation"],
    guidance: {
      preferredPatterns: [
        "Use BaseModel for boundary validation and serialization.",
        "Keep validation rules close to domain or API models.",
      ],
      avoidPatterns: [
        "Avoid duplicating equivalent manual validation when a Pydantic model already exists.",
      ],
    },
  },
  requests: {
    purpose: "Synchronous HTTP client",
    category: "http",
    capabilities: ["http-client"],
  },
  httpx: {
    purpose: "Synchronous and asynchronous HTTP client",
    category: "http",
    capabilities: ["http-client"],
    guidance: {
      preferredPatterns: [
        "Reuse shared Client or AsyncClient instances when the project provides them.",
      ],
      avoidPatterns: [
        "Avoid adding requests for asynchronous workflows when HTTPX is already installed.",
      ],
    },
  },
  sqlalchemy: {
    purpose: "SQL toolkit and object-relational mapper",
    category: "database",
    capabilities: ["database", "orm"],
  },
  "django-rest-framework": {
    purpose: "REST API toolkit for Django",
    category: "api",
    capabilities: ["api"],
  },
  pytest: {
    purpose: "Python testing framework",
    category: "testing",
    capabilities: ["unit-testing"],
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

export const PYTHON_CAPABILITY_NAMES: Record<string, string> = {
  "web-server": "Web server",
  routing: "Application routing",
  orm: "Object-relational mapping",
  validation: "Schema validation",
  "http-client": "HTTP client",
  database: "Database access",
  api: "API toolkit",
  "unit-testing": "Unit testing",
  "async-testing": "Async testing",
  "application-server": "Application server",
  "numerical-computing": "Numerical computing",
  "data-analysis": "Data analysis",
  aws: "AWS integration",
  azure: "Azure integration",
  authentication: "Authentication",
  ai: "AI integration",
  "llm-orchestration": "LLM orchestration",
  linting: "Linting",
  formatting: "Formatting",
  "type-checking": "Static type checking",
};

export const normalizePythonPackageName = (name: string): string =>
  name.trim().toLowerCase().replace(/[_.]+/g, "-");
