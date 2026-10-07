import { randomBytes } from "node:crypto";
import { CapabilityAdvisor } from "@stackgenome/advisor";
import { NodeEcosystemAnalyzer } from "@stackgenome/analyzer-node";
import { PythonEcosystemAnalyzer } from "@stackgenome/analyzer-python";
import { ProjectAIContextGenerator } from "@stackgenome/context";
import type {
  AIContextProfile,
  AdvisorMode,
  AdvisorResult,
  ProjectAIContext,
  ProjectEcosystem,
  WorkspaceReader,
} from "@stackgenome/contracts";
import { AnalyzerRegistry, ProjectEcosystemEngine } from "@stackgenome/core";
import * as vscode from "vscode";

type AIContextProfiles = Record<AIContextProfile, ProjectAIContext>;

const AI_CONTEXT_PROFILES: AIContextProfile[] = [
  "compact",
  "standard",
  "detailed",
];

const isAIContextProfile = (value: unknown): value is AIContextProfile =>
  typeof value === "string" &&
  AI_CONTEXT_PROFILES.includes(value as AIContextProfile);

const contextGenerator = new ProjectAIContextGenerator();

let latestAnalysis: ProjectEcosystem | undefined;
let latestRecommendation: AdvisorResult | undefined;

class VsCodeWorkspaceReader implements WorkspaceReader {
  constructor(private readonly root: vscode.Uri) {}

  async exists(relativePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(
        vscode.Uri.joinPath(this.root, relativePath),
      );
      return true;
    } catch {
      return false;
    }
  }

  async readText(relativePath: string): Promise<string> {
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(this.root, relativePath),
    );
    return new TextDecoder().decode(content);
  }
}

const analyzeWorkspace = async (): Promise<ProjectEcosystem> => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error(
      "Open a workspace folder before running StackGenome.",
    );
  }

  const registry = new AnalyzerRegistry()
    .register(new NodeEcosystemAnalyzer())
    .register(new PythonEcosystemAnalyzer());
  const engine = new ProjectEcosystemEngine(registry);

  return engine.analyze({
    project: {
      name: folder.name,
      rootUri: folder.uri.toString(),
    },
    reader: new VsCodeWorkspaceReader(folder.uri),
  });
};

const getWebviewHtml = (
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  analysis: ProjectEcosystem,
  contexts: AIContextProfiles,
  recommendation?: AdvisorResult,
  initialTab = "Overview",
  initialContextProfile: AIContextProfile = "standard",
): string => {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.js"),
  );
  const nonce = randomBytes(16).toString("base64");
  const serialized = JSON.stringify(analysis).replaceAll("<", "\\u003c");
  const serializedRecommendation = JSON.stringify(
    recommendation ?? null,
  ).replaceAll("<", "\\u003c");
  const serializedContexts = JSON.stringify(contexts).replaceAll(
    "<",
    "\\u003c",
  );
  const serializedTab = JSON.stringify(initialTab).replaceAll(
    "<",
    "\\u003c",
  );
  const serializedProfile = JSON.stringify(initialContextProfile).replaceAll(
    "<",
    "\\u003c",
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <title>StackGenome</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">
    window.__STACKGENOME_DATA__ = ${serialized};
    window.__STACKGENOME_RECOMMENDATION__ = ${serializedRecommendation};
    window.__STACKGENOME_AI_CONTEXTS__ = ${serializedContexts};
    window.__STACKGENOME_INITIAL_TAB__ = ${serializedTab};
    window.__STACKGENOME_INITIAL_CONTEXT_PROFILE__ = ${serializedProfile};
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
};

const handleWebviewMessage = async (
  message: unknown,
  contexts: AIContextProfiles,
): Promise<void> => {
  if (typeof message !== "object" || message === null) return;

  const action = Reflect.get(message, "action");
  const profile = Reflect.get(message, "profile");
  if (!isAIContextProfile(profile)) return;

  const selected = contexts[profile];
  const serialized = contextGenerator.serialize(selected);

  if (action === "copyAIContext") {
    await vscode.env.clipboard.writeText(serialized);
    await vscode.window.showInformationMessage(
      `StackGenome ${profile} AI context copied to clipboard.`,
    );
    return;
  }

  if (action === "exportAIContext") {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const defaultUri = folder
      ? vscode.Uri.joinPath(
          folder.uri,
          `stackgenome-ai-context.${profile}.json`,
        )
      : undefined;

    const target = await vscode.window.showSaveDialog({
      ...(defaultUri ? { defaultUri } : {}),
      saveLabel: "Export StackGenome AI Context",
      filters: { JSON: ["json"] },
    });

    if (!target) return;

    await vscode.workspace.fs.writeFile(
      target,
      new TextEncoder().encode(serialized),
    );
    await vscode.window.showInformationMessage(
      `StackGenome ${profile} AI context exported.`,
    );
  }
};

const openReport = (
  context: vscode.ExtensionContext,
  analysis: ProjectEcosystem,
  recommendation?: AdvisorResult,
  initialTab = "Overview",
  initialContextProfile: AIContextProfile = "standard",
): void => {
  const contexts = contextGenerator.generateAll(analysis);
  const panel = vscode.window.createWebviewPanel(
    "stackgenome.report",
    "StackGenome — Ecosystem Report",
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  panel.webview.html = getWebviewHtml(
    panel.webview,
    context.extensionUri,
    analysis,
    contexts,
    recommendation,
    initialTab,
    initialContextProfile,
  );

  panel.webview.onDidReceiveMessage(
    async (message) => {
      try {
        await handleWebviewMessage(message, contexts);
      } catch (error) {
        await vscode.window.showErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    undefined,
    context.subscriptions,
  );
};

const runAdvisor = async (
  context: vscode.ExtensionContext,
  mode: AdvisorMode,
): Promise<void> => {
  const intent = await vscode.window.showInputBox({
    title:
      mode === "existing-only"
        ? "StackGenome: Find Existing Capability"
        : "StackGenome: Recommend Technology",
    prompt: "What are you trying to implement?",
    placeHolder:
      "e.g. Add runtime API validation or add server-state caching",
    ignoreFocusOut: true,
  });

  if (!intent?.trim()) return;

  latestAnalysis = await analyzeWorkspace();
  latestRecommendation = new CapabilityAdvisor().recommend(
    latestAnalysis,
    {
      intent: intent.trim(),
      mode,
    },
  );

  openReport(
    context,
    latestAnalysis,
    latestRecommendation,
    "Recommend",
  );
};

const generateAIContext = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const selection = await vscode.window.showQuickPick(
    [
      {
        label: "Standard",
        description: "Recommended for Copilot Toolkit and general AI workflows",
        profile: "standard" as const,
      },
      {
        label: "Compact",
        description: "Token-efficient ecosystem and capability context",
        profile: "compact" as const,
      },
      {
        label: "Detailed",
        description: "Broader package and health evidence for diagnostics",
        profile: "detailed" as const,
      },
    ],
    {
      title: "StackGenome: Generate AI Context",
      placeHolder: "Choose a context profile",
    },
  );

  if (!selection) return;

  latestAnalysis = await analyzeWorkspace();
  openReport(
    context,
    latestAnalysis,
    latestRecommendation,
    "AI Context",
    selection.profile,
  );
};

export const activate = (context: vscode.ExtensionContext): void => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "stackgenome.analyzeProject",
      async () => {
        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "StackGenome: analyzing project ecosystem",
            },
            async () => {
              latestAnalysis = await analyzeWorkspace();
              latestRecommendation = undefined;
              openReport(context, latestAnalysis);
            },
          );
        } catch (error) {
          await vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "stackgenome.openReport",
      async () => {
        try {
          latestAnalysis ??= await analyzeWorkspace();
          openReport(
            context,
            latestAnalysis,
            latestRecommendation,
            latestRecommendation ? "Recommend" : "Overview",
          );
        } catch (error) {
          await vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "stackgenome.findExistingCapability",
      async () => {
        try {
          await runAdvisor(context, "existing-only");
        } catch (error) {
          await vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "stackgenome.recommendTechnology",
      async () => {
        try {
          await runAdvisor(context, "existing-first");
        } catch (error) {
          await vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "stackgenome.generateAIContext",
      async () => {
        try {
          await generateAIContext(context);
        } catch (error) {
          await vscode.window.showErrorMessage(
            error instanceof Error ? error.message : String(error),
          );
        }
      },
    ),
  );
};

export const deactivate = (): void => {};
