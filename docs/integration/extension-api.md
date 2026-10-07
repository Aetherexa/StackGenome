# StackGenome VS Code Extension API

StackGenome exposes a versioned API from extension activation so other VS Code extensions can consume project ecosystem intelligence without scraping the webview or re-parsing manifests.

## Extension identity

```text
aetherexa.stackgenome
```

## Consumer example

```ts
import * as vscode from "vscode";
import type { StackGenomeExtensionApi } from "@stackgenome/contracts";

const extension =
  vscode.extensions.getExtension<StackGenomeExtensionApi>(
    "aetherexa.stackgenome",
  );

if (!extension) {
  // StackGenome is not installed.
  return;
}

const api = extension.isActive
  ? extension.exports
  : await extension.activate();

if (api.apiVersion !== "1.0") {
  // Handle unsupported API versions.
  return;
}

const context = await api.getAIContext("standard");
```

## API

### `getProjectEcosystem(options?)`

Returns the normalized StackGenome `ProjectEcosystem`. Results are cached until a supported manifest/lockfile changes or the caller forces a refresh.

### `getAIContext(profile?, options?)`

Returns a versioned `ProjectAIContext`. The default profile is `standard`.

### `recommend(intent, mode?, options?)`

Runs StackGenome's deterministic existing-first capability advisor.

### `refresh()`

Forces project ecosystem re-analysis and returns the fresh model.

### `invalidate()`

Clears the current workspace analysis cache.

## Cache invalidation

The VS Code host invalidates cached project intelligence when supported dependency manifests or lockfiles are created, changed, or deleted, including Node and Python ecosystem files.

Repeated report/advisor/context requests reuse the same analysis while the cache is valid.

## Copilot Toolkit

Copilot Toolkit should treat StackGenome as an optional intelligence provider:

1. Look up `aetherexa.stackgenome`.
2. If unavailable, continue with Toolkit's baseline behavior.
3. If available, activate it and negotiate `apiVersion`.
4. Request `getAIContext("standard")` or `compact` for token-sensitive workflows.
5. Combine StackGenome's **technology/capability** context with RepoLens **source/relevance** context.

StackGenome does not require or import Copilot Toolkit, keeping both extensions independently usable.
