# StackGenome AI Context Contract

StackGenome exposes project ecosystem intelligence as a deterministic JSON artifact for AI developer tools.

## Package API

```ts
import { ProjectAIContextGenerator } from "@stackgenome/context";

const generator = new ProjectAIContextGenerator();
const context = generator.generate(projectEcosystem, "standard");
```

The generator does not call an LLM, network service, or package registry. It transforms the locally detected `ProjectEcosystem` model.

## Profiles

- **compact** — minimal ecosystem/capability guidance for token-sensitive prompts.
- **standard** — recommended default for Copilot Toolkit and general AI workflows.
- **detailed** — includes broader package and health evidence for diagnostics.

Every profile returns the same versioned `ProjectAIContext` schema.

## Copilot Toolkit consumption

Copilot Toolkit should consume StackGenome through the stable context contract rather than re-parsing manifests:

```ts
const projectContext = generator.generate(ecosystem, "standard");

contextBuilder.add({
  source: "stackgenome",
  schemaVersion: projectContext.schemaVersion,
  payload: projectContext,
});
```

The transport between extensions is intentionally not defined here. The contract is independent of VS Code UI and can later be exposed through an extension API, shared service, file artifact, MCP resource, or other integration channel.

## AI behavior encoded by StackGenome

The context tells an AI assistant to:

- reuse installed libraries that already provide the requested capability;
- respect detected versions and health constraints;
- follow package-specific preferred patterns where StackGenome has deterministic knowledge;
- avoid introducing redundant dependencies.

## Explicit exclusions

StackGenome AI context does not include source-code topology, AST/symbol analysis, imports, callers/callees, file relevance, architectural relationships, or blast radius. Those remain RepoLens responsibilities.

A future Copilot Toolkit context builder can combine:

```text
StackGenome -> WHAT technology/capability exists
RepoLens    -> WHERE relevant code lives / what is connected
Toolkit     -> compose the final AI context
```
