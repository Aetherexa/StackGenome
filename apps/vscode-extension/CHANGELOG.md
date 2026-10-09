# Changelog

All notable changes to StackGenome are documented here.

## 1.0.0 — Initial public release

### Project ecosystem intelligence
- Node/JavaScript/TypeScript and Python project detection.
- Declared versus resolved dependency versions.
- Direct and transitive dependency inventory.
- Framework, runtime, package-manager, build, testing, and tooling detection.

### Dependency health
- Duplicate resolved-version detection.
- Deprecated package findings when supported by lockfile metadata.
- Missing resolved dependency findings.
- Peer dependency health for supported Node lockfiles.
- Conflicting Python requirement detection.

### Capability intelligence
- Package purpose and capability classification.
- Unified **Find Capability** workflow with existing-first dependency decisions.
- Broader V1 intent intelligence including internationalization, logging, date/time handling, serialization, and feature flags.
- Ecosystem-aware technology recommendations with implementation guidance.

### VS Code experience
- Marketplace-ready visual polish using native VS Code theme variables.
- Stronger information hierarchy, responsive layouts, semantic badges, and accessible focus states.
- Primary recommendations now show human-friendly capability names, match strength, why-the-option-fits context, and implementation guidance.
- Alternatives are collapsed by default so the primary decision stays visually dominant.
- Project Technology Intelligence overview centered on Project DNA.
- Existing-capability cards show what the project can already do.
- Inline technology-decision workflow on the Overview.
- Dedicated Technology, Capabilities, Dependencies, and Health views.
- Searchable dependency intelligence with graceful unknown-package states.
- Health findings separated into actionable errors/warnings and informational observations.
