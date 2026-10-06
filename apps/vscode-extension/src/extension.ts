import { randomBytes } from "node:crypto";
import { NodeEcosystemAnalyzer } from "@stackgenome/analyzer-node";
import { PythonEcosystemAnalyzer } from "@stackgenome/analyzer-python";
import type {
  ProjectEcosystem,
  WorkspaceReader,
} from "@stackgenome/contracts";
import { AnalyzerRegistry, ProjectEcosystemEngine } from "@stackgenome/core";
import * as vscode from "vscode";

let latestAnalysis: ProjectEcosystem | undefined;

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
): string => {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.js"),
  );
  const nonce = randomBytes(16).toString("base64");
  const serialized = JSON.stringify(analysis).replaceAll("<", "\\u003c");

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
  <script nonce="${nonce}">window.__STACKGENOME_DATA__ = ${serialized};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
};

const openReport = (
  context: vscode.ExtensionContext,
  analysis: ProjectEcosystem,
): void => {
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
          openReport(context, latestAnalysis);
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
