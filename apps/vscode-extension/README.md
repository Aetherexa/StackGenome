# StackGenome

> **Know your stack before you change your stack.**

StackGenome is a standalone VS Code extension for **project technology intelligence**. It turns manifests, lockfiles, and project configuration into a clear picture of what your project is built with, what capabilities already exist, and what you should reuse before adding more technology.

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

### Project DNA
See the project's languages, frameworks, runtimes, package managers, build systems, testing tools, and other detected technologies at a glance.

### Dependency intelligence
Inspect direct and transitive packages with declared and resolved versions.

### Dependency health
Separate actionable issues from informational ecosystem observations.

Actionable findings include:
- deprecated packages when the lockfile provides that metadata
- missing resolved direct dependencies
- peer dependency mismatches that affect direct dependencies
- malformed lockfiles
- conflicting Python requirement declarations

Informational observations include signals such as duplicate resolved versions or transitive peer conditions that may be normal in a healthy dependency tree.

### Capability map
Understand what installed packages already provide: validation, HTTP clients, forms, authentication, state management, testing, database access, and more.

### Existing-first capability advisor
Use **StackGenome: Find Capability** to describe what you want to implement. StackGenome first checks whether the project already has a suitable dependency. Only when no suitable installed capability exists does it recommend an ecosystem-compatible package.

## Quick start

1. Open a project folder in VS Code.
2. Open the Command Palette.
3. Run **StackGenome: Analyze Project**.
4. Explore **Overview**, **Technology**, **Capabilities**, **Dependencies**, and **Health**.
5. Use the **Technology decision** box on Overview to check what the project already provides before adding a dependency.

Useful commands:

- **StackGenome: Analyze Project** — refresh and open the ecosystem report.
- **StackGenome: Open Ecosystem Report** — reopen the current report.
- **StackGenome: Find Capability** — describe an implementation need and get an existing-first dependency decision.

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
