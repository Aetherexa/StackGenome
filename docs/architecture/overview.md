# StackGenome architecture

StackGenome separates **ecosystem intelligence** from **source-code intelligence**.

## Product boundary

StackGenome owns:
- project manifests and lock files;
- dependencies and resolved versions;
- runtimes, frameworks, build systems and package managers;
- dependency health and compatibility;
- project capabilities;
- library recommendations;
- version-aware guidance for AI assistants.

RepoLens owns:
- AST and symbol analysis;
- import/call graphs;
- architecture and module relationships;
- source-code hotspots;
- change impact and blast radius.

## Architecture

```text
VS Code command
      |
      v
Workspace reader
      |
      v
Analyzer registry
      |
      +--> Node adapter
      +--> Python adapter (future)
      +--> Java adapter (future)
      +--> .NET adapter (future)
      +--> Go adapter (future)
      |
      v
Normalized ProjectEcosystem
      |
      +--> StackGenome Webview
      +--> AI Context (future)
```

The core package knows nothing about npm, Maven, NuGet, pip, Cargo or any other package manager. Ecosystem support is provided exclusively through adapters implementing the shared analyzer contract.
