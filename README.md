# StackGenome

> **Know your stack before you change your stack.**

StackGenome is a project technology intelligence engine and standalone VS Code extension. It analyzes dependency manifests and lockfiles to explain the technologies, versions, capabilities, and dependency-health signals already present in a project.

## V1

The first public release is intentionally focused on the standalone developer experience:

- ecosystem overview
- declared versus resolved dependencies
- direct and transitive package intelligence
- package purpose and capability detection
- dependency-health findings
- existing-first capability discovery
- ecosystem-aware technology recommendations when a new dependency is actually needed

V1 supports Node/JavaScript/TypeScript and Python projects through pluggable ecosystem analyzers.

## Product boundary

- **StackGenome** answers what technology and package capabilities exist.
- **RepoLens** is responsible for source-code structure, relationships, and change impact.
- Future versions can expose StackGenome intelligence to other developer tools without changing the core analysis model.

## Development

The repository is a pnpm/TypeScript monorepo. Run:

```bash
pnpm install
pnpm check
```

To build the V1 Marketplace VSIX:

```bash
pnpm --filter stackgenome package:vsix
```

The packaged extension is written to `artifacts/stackgenome-1.0.0.vsix`.

See `docs/release/v1-marketplace.md` for release instructions.
