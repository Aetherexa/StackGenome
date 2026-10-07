# StackGenome

> **Know what your project already has.**

StackGenome is a standalone VS Code extension that turns dependency manifests and lockfiles into a clear picture of your project's technology ecosystem.

Before adding another package, StackGenome helps you answer:

- What packages does this project use?
- Which versions are declared, and which versions are actually resolved?
- What is each package for?
- What frameworks, runtimes, package managers, and tooling are present?
- Are there duplicate, deprecated, unresolved, or incompatible dependencies?
- Are peer dependencies satisfied?
- Does the project already contain a library that can solve what I need?
- If not, what technology fits the ecosystem already in use?

## Why StackGenome

Large projects accumulate dependencies quickly. Developers often reach for a new package before checking whether the repository already has a suitable capability.

StackGenome gives you an **existing-first view of the project ecosystem** so you can make better dependency and implementation decisions with less guesswork.

## V1 features

### Ecosystem overview
See detected languages, frameworks, runtimes, package managers, build tools, testing tools, and other project technologies.

### Dependency intelligence
Inspect direct and transitive packages with declared and resolved versions.

### Dependency health
Surface actionable findings such as:

- duplicate resolved versions
- deprecated packages when the lockfile provides that metadata
- missing resolved direct dependencies
- peer dependency mismatches
- conflicting Python requirement declarations

### Capability map
Understand what installed packages already provide: validation, HTTP clients, forms, authentication, state management, testing, database access, and more.

### Existing-first recommendations
Use **StackGenome: Find Existing Capability** or **StackGenome: Recommend Technology** to check whether the project already has a suitable library before introducing another dependency.

## Quick start

1. Open a project folder in VS Code.
2. Open the Command Palette.
3. Run **StackGenome: Analyze Project**.
4. Explore **Overview**, **Packages**, **Health**, **Capabilities**, and **Recommend**.

Useful commands:

- **StackGenome: Analyze Project** — refresh and open the ecosystem report.
- **StackGenome: Open Ecosystem Report** — reopen the current report.
- **StackGenome: Find Existing Capability** — check whether an installed package can solve an implementation need.
- **StackGenome: Recommend Technology** — get an ecosystem-aware recommendation when no suitable installed capability exists.

## Supported ecosystems in V1

StackGenome is designed around pluggable ecosystem analyzers. The first public release supports:

### Node / JavaScript / TypeScript
- `package.json`
- `package-lock.json`
- `pnpm-lock.yaml`
- Yarn classic and modern `yarn.lock`

### Python
- `pyproject.toml`
- `requirements.txt` and `requirements-dev.txt`
- `poetry.lock`
- `uv.lock`
- `Pipfile`
- `Pipfile.lock`

More ecosystem adapters can be added without changing the core model.

## Local and deterministic

V1 analysis is derived from project manifests, lockfiles, and StackGenome's built-in knowledge catalog. The core analysis does **not** require an LLM or a cloud service.

## Scope

StackGenome focuses on **what technology and package capabilities exist in a project**.

It does not attempt to build source-code call graphs, AST relationships, or change-impact maps. This keeps the V1 product focused on project ecosystem intelligence.

## Current limitations

- Package knowledge is intentionally curated and will expand over time.
- Some health signals depend on what a package manager records in its lockfile.
- Registry-wide freshness, vulnerability databases, and source-code usage analysis are not presented as facts unless StackGenome has deterministic evidence.

## Feedback and support

Found an issue or a project StackGenome should understand better? Open an issue in the [StackGenome repository](https://github.com/Aetherexa/StackGenome/issues).

## License

MIT © Aetherexa
