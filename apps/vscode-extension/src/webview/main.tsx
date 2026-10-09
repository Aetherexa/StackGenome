import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  AdvisorResult,
  EcosystemFinding,
  EcosystemPackage,
  ProjectEcosystem,
  RecommendationCandidate,
  Technology,
  TechnologyKind,
} from "@stackgenome/contracts";

interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

declare global {
  interface Window {
    __STACKGENOME_DATA__: ProjectEcosystem;
    __STACKGENOME_RECOMMENDATION__: AdvisorResult | null;
    __STACKGENOME_INITIAL_TAB__: string;
  }
}

const vscode = acquireVsCodeApi();

type Tab =
  | "Overview"
  | "Technology"
  | "Capabilities"
  | "Dependencies"
  | "Health";

const tabs: Tab[] = [
  "Overview",
  "Technology",
  "Capabilities",
  "Dependencies",
  "Health",
];

const examples = [
  "internationalization",
  "logging",
  "API validation",
  "HTTP client",
  "authentication",
];

const kindOrder: TechnologyKind[] = [
  "language",
  "framework",
  "runtime",
  "build-system",
  "package-manager",
  "testing",
  "ui",
  "database",
  "other",
];

const kindLabels: Record<TechnologyKind, string> = {
  language: "Languages",
  framework: "Frameworks",
  runtime: "Runtimes",
  "build-system": "Build systems",
  "package-manager": "Package managers",
  testing: "Testing",
  ui: "UI",
  database: "Database",
  other: "Other",
};

const kindSymbols: Record<TechnologyKind, string> = {
  language: "</>",
  framework: "◇",
  runtime: "▶",
  "build-system": "⚙",
  "package-manager": "⬢",
  testing: "✓",
  ui: "▣",
  database: "◉",
  other: "•",
};

const capabilityNames: Record<string, string> = {
  "http-client": "HTTP client",
  "server-state": "Server-state management",
  "query-caching": "Query caching",
  "client-state": "Client state management",
  "dependency-injection": "Dependency injection",
  "server-rendering": "Server rendering",
  "unit-testing": "Unit testing",
  "e2e-testing": "End-to-end testing",
  "async-testing": "Async testing",
  "type-checking": "Static type checking",
  "llm-orchestration": "LLM orchestration",
  "data-analysis": "Data analysis",
  "numerical-computing": "Numerical computing",
  "web-server": "Web server",
  "application-server": "Application server",
  "date-time": "Date & time handling",
  "feature-flags": "Feature flags",
  api: "API toolkit",
  ai: "AI integration",
  aws: "AWS integration",
  azure: "Azure integration",
  orm: "ORM",
  typescript: "TypeScript",
};

const css = `
  :root {
    color-scheme: light dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
  }

  button,
  input,
  select {
    font: inherit;
  }

  .sg-shell {
    width: min(1480px, 100%);
    margin: 0 auto;
    padding: 30px 34px 56px;
    font-family: var(--vscode-font-family);
  }

  .sg-header {
    display: flex;
    justify-content: space-between;
    gap: 28px;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .sg-brand {
    display: flex;
    gap: 14px;
    align-items: center;
    min-width: 0;
  }

  .sg-mark {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    border: 1px solid var(--vscode-focusBorder);
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-focusBorder);
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -2px;
    box-shadow: 0 2px 10px var(--vscode-widget-shadow);
  }

  .sg-title {
    margin: 0;
    font-size: 26px;
    line-height: 1.15;
    font-weight: 720;
    letter-spacing: -0.4px;
  }

  .sg-tagline {
    margin-top: 5px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
  }

  .sg-project-name {
    margin-top: 8px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }

  .sg-header-meta {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    max-width: 52%;
  }

  .sg-chip,
  .sg-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    border-radius: 999px;
    padding: 4px 9px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 12px;
    line-height: 1.2;
  }

  .sg-chip-subtle {
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-descriptionForeground);
  }

  .sg-badge-positive {
    border-color: var(--vscode-testing-iconPassed);
    color: var(--vscode-testing-iconPassed);
    background: var(--vscode-editorWidget-background);
  }

  .sg-badge-warning {
    border-color: var(--vscode-editorWarning-foreground);
    color: var(--vscode-editorWarning-foreground);
    background: var(--vscode-editorWidget-background);
  }

  .sg-badge-error {
    border-color: var(--vscode-testing-iconFailed);
    color: var(--vscode-testing-iconFailed);
    background: var(--vscode-editorWidget-background);
  }

  .sg-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    padding: 4px;
    margin-bottom: 28px;
    border-radius: 10px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-editorWidget-background);
  }

  .sg-tab {
    appearance: none;
    border: 0;
    border-radius: 7px;
    padding: 8px 13px;
    color: var(--vscode-descriptionForeground);
    background: transparent;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }

  .sg-tab:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-toolbar-hoverBackground);
  }

  .sg-tab-active {
    color: var(--vscode-foreground);
    background: var(--vscode-tab-activeBackground);
    box-shadow: inset 0 -2px 0 var(--vscode-focusBorder);
  }

  .sg-tab:focus-visible,
  .sg-button:focus-visible,
  .sg-ghost-button:focus-visible,
  .sg-example:focus-visible,
  .sg-input:focus-visible,
  .sg-select:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .sg-section {
    margin-bottom: 30px;
  }

  .sg-section-head {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-end;
    margin-bottom: 12px;
  }

  .sg-eyebrow {
    margin-bottom: 5px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .sg-section-title {
    margin: 0;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 650;
  }

  .sg-section-copy {
    margin: 5px 0 0;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
  }

  .sg-muted {
    color: var(--vscode-descriptionForeground);
  }

  .sg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 12px;
  }

  .sg-wide-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 14px;
  }

  .sg-card {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 11px;
    background: var(--vscode-editorWidget-background);
    padding: 16px;
    min-width: 0;
  }

  .sg-card-soft {
    background: var(--vscode-sideBar-background);
  }

  .sg-dna-card {
    min-height: 118px;
    position: relative;
    overflow: hidden;
  }

  .sg-dna-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }

  .sg-dna-symbol {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--vscode-textCodeBlock-background);
    color: var(--vscode-focusBorder);
    font-family: var(--vscode-editor-font-family);
    font-weight: 700;
    font-size: 12px;
  }

  .sg-dna-label {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 600;
  }

  .sg-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .sg-tech-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-textCodeBlock-background);
    padding: 5px 9px;
    font-size: 12px;
    line-height: 1.15;
  }

  .sg-capability-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .sg-check {
    width: 26px;
    height: 26px;
    flex: 0 0 26px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: var(--vscode-testing-iconPassed);
    border: 1px solid var(--vscode-testing-iconPassed);
    font-weight: 800;
    font-size: 12px;
  }

  .sg-capability-title {
    font-weight: 650;
    margin-bottom: 7px;
  }

  .sg-decision {
    border: 1px solid var(--vscode-focusBorder);
    border-radius: 14px;
    padding: 20px;
    background: var(--vscode-editorWidget-background);
    box-shadow: 0 5px 22px var(--vscode-widget-shadow);
  }

  .sg-decision-title {
    margin: 0;
    font-size: 19px;
    font-weight: 650;
  }

  .sg-input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    margin-top: 16px;
  }

  .sg-input,
  .sg-select {
    width: 100%;
    min-height: 38px;
    padding: 8px 10px;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 7px;
  }

  .sg-button {
    min-height: 38px;
    padding: 8px 15px;
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
    cursor: pointer;
    font-weight: 600;
  }

  .sg-button:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
  }

  .sg-button:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .sg-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 10px;
  }

  .sg-example,
  .sg-ghost-button {
    appearance: none;
    border-radius: 999px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    background: transparent;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 5px 9px;
    font-size: 12px;
  }

  .sg-example:hover,
  .sg-ghost-button:hover {
    color: var(--vscode-foreground);
    background: var(--vscode-toolbar-hoverBackground);
  }

  .sg-decision-result {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
  }

  .sg-decision-summary {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .sg-decision-headline {
    font-size: 16px;
    font-weight: 650;
  }

  .sg-inline-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 14px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-top: 7px;
  }

  .sg-recommendation {
    border: 1px solid var(--vscode-focusBorder);
    border-radius: 12px;
    background: var(--vscode-sideBar-background);
    padding: 18px;
  }

  .sg-recommendation-secondary {
    border-color: var(--vscode-widget-border, var(--vscode-panel-border));
    background: var(--vscode-editorWidget-background);
  }

  .sg-recommendation-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .sg-package-name {
    font-size: 18px;
    line-height: 1.2;
    font-weight: 700;
  }

  .sg-package-ecosystem {
    margin-top: 4px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }

  .sg-why {
    margin: 15px 0;
    padding: 12px 13px;
    border-left: 3px solid var(--vscode-focusBorder);
    background: var(--vscode-textCodeBlock-background);
    border-radius: 0 7px 7px 0;
  }

  .sg-why-label {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
  }

  .sg-guidance-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .sg-guidance {
    border-radius: 8px;
    padding: 12px 13px;
    background: var(--vscode-textCodeBlock-background);
  }

  .sg-guidance-title {
    font-weight: 650;
    margin-bottom: 7px;
  }

  .sg-guidance ul {
    margin: 0;
    padding-left: 18px;
  }

  .sg-guidance li + li {
    margin-top: 6px;
  }

  .sg-alternatives {
    margin-top: 12px;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    padding-top: 10px;
  }

  .sg-alternatives summary {
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    user-select: none;
  }

  .sg-health-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .sg-metric {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    padding: 14px;
    background: var(--vscode-editorWidget-background);
  }

  .sg-metric-value {
    font-size: 20px;
    font-weight: 720;
    line-height: 1;
  }

  .sg-metric-label {
    margin-top: 7px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }

  .sg-metric-error .sg-metric-value {
    color: var(--vscode-testing-iconFailed);
  }

  .sg-metric-warning .sg-metric-value {
    color: var(--vscode-editorWarning-foreground);
  }

  .sg-metric-info .sg-metric-value {
    color: var(--vscode-charts-blue);
  }

  .sg-toolbar {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(130px, auto) auto;
    gap: 10px;
    align-items: center;
    margin-bottom: 14px;
  }

  .sg-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }

  .sg-table-wrap {
    overflow: auto;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    background: var(--vscode-editorWidget-background);
  }

  .sg-table {
    width: 100%;
    min-width: 850px;
    border-collapse: collapse;
  }

  .sg-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    text-align: left;
    padding: 10px 12px;
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.045em;
    font-weight: 700;
  }

  .sg-table td {
    padding: 11px 12px;
    vertical-align: top;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    font-size: 13px;
  }

  .sg-table tr:last-child td {
    border-bottom: 0;
  }

  .sg-table tbody tr:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .sg-package-cell {
    font-weight: 650;
  }

  .sg-package-sub {
    margin-top: 3px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
  }

  .sg-empty,
  .sg-alert {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 10px;
    background: var(--vscode-editorWidget-background);
    padding: 18px;
  }

  .sg-empty-title,
  .sg-alert-title {
    font-weight: 650;
  }

  .sg-empty p,
  .sg-alert p {
    margin-bottom: 0;
  }

  .sg-health-group + .sg-health-group {
    margin-top: 24px;
  }

  .sg-finding {
    position: relative;
    padding-left: 44px;
  }

  .sg-finding-icon {
    position: absolute;
    left: 14px;
    top: 14px;
    font-size: 15px;
  }

  .sg-finding-title {
    font-weight: 650;
  }

  .sg-finding-copy {
    margin: 7px 0 0;
    color: var(--vscode-descriptionForeground);
    line-height: 1.45;
  }

  .sg-evidence-row {
    padding: 10px 0;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
  }

  .sg-evidence-row:last-child {
    border-bottom: 0;
  }

  .sg-evidence-name {
    font-weight: 650;
  }

  .sg-evidence-source {
    margin-top: 4px;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
  }

  @media (max-width: 900px) {
    .sg-shell {
      padding: 22px 20px 42px;
    }

    .sg-header {
      flex-direction: column;
      gap: 14px;
    }

    .sg-header-meta {
      justify-content: flex-start;
      max-width: 100%;
    }

    .sg-health-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sg-guidance-grid {
      grid-template-columns: 1fr;
    }

    .sg-toolbar {
      grid-template-columns: 1fr 1fr;
    }

    .sg-toolbar .sg-input {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 620px) {
    .sg-shell {
      padding: 18px 14px 34px;
    }

    .sg-mark {
      width: 38px;
      height: 38px;
      flex-basis: 38px;
    }

    .sg-title {
      font-size: 23px;
    }

    .sg-section-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .sg-input-row,
    .sg-toolbar,
    .sg-health-grid {
      grid-template-columns: 1fr;
    }

    .sg-button {
      width: 100%;
    }

    .sg-decision-summary,
    .sg-recommendation-head {
      flex-direction: column;
    }
  }
`;

const normalizeTab = (value: string): Tab => {
  if (tabs.includes(value as Tab)) return value as Tab;
  if (value === "Packages") return "Dependencies";
  return "Overview";
};

const displayRoot = (rootUri: string): string => {
  try {
    const value = decodeURIComponent(rootUri);
    const normalized = value.replace(/^file:\/\//, "").replaceAll("\\", "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts.slice(-3).join("/") || rootUri;
  } catch {
    return rootUri;
  }
};

const humanizeCapability = (value: string): string => {
  const normalized = value.replace(/^capability:/, "");
  const known = capabilityNames[normalized];
  if (known) return known;

  return normalized
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const matchStrength = (confidence: number): string => {
  if (confidence >= 0.9) return "Very high";
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.65) return "Good";
  return "Moderate";
};

const groupTechnologies = (
  technologies: Technology[],
): Map<TechnologyKind, Technology[]> => {
  const groups = new Map<TechnologyKind, Technology[]>();
  for (const technology of technologies) {
    const current = groups.get(technology.kind) ?? [];
    current.push(technology);
    groups.set(technology.kind, current);
  }
  return groups;
};

const packageFinding = (
  pkg: EcosystemPackage,
  findings: EcosystemFinding[],
): EcosystemFinding | undefined =>
  findings.find(
    (finding) =>
      (finding.packageId === pkg.id ||
        (!finding.packageId && finding.packageName === pkg.name)) &&
      (finding.severity === "error" || finding.severity === "warning"),
  );

const TechnologyPills = ({ items }: { items: Technology[] }) => (
  <div className="sg-pills">
    {items.map((technology) => (
      <span key={technology.id} className="sg-tech-pill">
        {technology.name}
        {technology.version ? ` ${technology.version}` : ""}
      </span>
    ))}
  </div>
);

const CapabilityPills = ({ capabilities }: { capabilities: string[] }) => (
  <div className="sg-pills">
    {capabilities.map((capability) => (
      <span key={capability} className="sg-tech-pill">
        {humanizeCapability(capability)}
      </span>
    ))}
  </div>
);

const CandidateCard = ({
  candidate,
  primary = false,
}: {
  candidate: RecommendationCandidate;
  primary?: boolean;
}) => {
  const capabilityText = candidate.matchedCapabilities
    .map(humanizeCapability)
    .join(", ");

  const why = candidate.existing
    ? `${candidate.name} is already installed in this project and provides ${capabilityText}.`
    : `${candidate.name} fits the detected ${candidate.ecosystem} ecosystem and provides ${capabilityText}.`;

  return (
    <div
      className={`sg-recommendation ${primary ? "" : "sg-recommendation-secondary"}`}
    >
      <div className="sg-recommendation-head">
        <div>
          <div className="sg-package-name">{candidate.name}</div>
          <div className="sg-package-ecosystem">{candidate.ecosystem}</div>
        </div>
        <span
          className={`sg-badge ${candidate.existing ? "sg-badge-positive" : "sg-chip-subtle"}`}
        >
          {candidate.existing ? "✓ Already installed" : "＋ New dependency"}
        </span>
      </div>

      <CapabilityPills capabilities={candidate.matchedCapabilities} />

      <div className="sg-inline-meta">
        {candidate.installedVersion ? (
          <span>Resolved {candidate.installedVersion}</span>
        ) : candidate.declaredVersion ? (
          <span>Declared {candidate.declaredVersion}</span>
        ) : null}
        <span>Match strength: {matchStrength(candidate.confidence)}</span>
      </div>

      <div className="sg-why">
        <span className="sg-why-label">Why this fits</span>
        {why}
      </div>

      {candidate.guidance?.preferredPatterns.length ||
      candidate.guidance?.avoidPatterns.length ? (
        <div className="sg-guidance-grid">
          {candidate.guidance?.preferredPatterns.length ? (
            <div className="sg-guidance">
              <div className="sg-guidance-title">Recommended usage</div>
              <ul>
                {candidate.guidance.preferredPatterns.map((pattern) => (
                  <li key={pattern}>{pattern}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {candidate.guidance?.avoidPatterns.length ? (
            <div className="sg-guidance">
              <div className="sg-guidance-title">Avoid</div>
              <ul>
                {candidate.guidance.avoidPatterns.map((pattern) => (
                  <li key={pattern}>{pattern}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const DecisionResult = ({
  recommendation,
}: {
  recommendation: AdvisorResult | null;
}) => {
  if (!recommendation) {
    return (
      <div className="sg-decision-result">
        <span className="sg-muted">
          Describe an implementation need. StackGenome checks installed capabilities
          first and only recommends a new dependency when nothing suitable already exists.
        </span>
      </div>
    );
  }

  if (recommendation.matchedCapabilities.length === 0) {
    return (
      <div className="sg-decision-result">
        <div className="sg-alert">
          <div className="sg-alert-title">No dependency-backed capability matched yet</div>
          <p>{recommendation.intent}</p>
          <p className="sg-muted">{recommendation.explanation}</p>
          <p className="sg-muted">
            StackGenome V1 reasons from deterministic project ecosystem metadata;
            source-code implementation patterns are outside this scope.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sg-decision-result">
      <div className="sg-decision-summary">
        <div>
          <div className="sg-decision-headline">
            {recommendation.newDependencyRequired === false
              ? "Reuse what is already installed"
              : recommendation.newDependencyRequired === true
                ? "A new dependency is the best match"
                : "Capability understood"}
          </div>
          <div className="sg-inline-meta">
            <span>Need: {recommendation.intent}</span>
            <span>
              Capability:{" "}
              {recommendation.matchedCapabilities
                .map(humanizeCapability)
                .join(", ")}
            </span>
          </div>
        </div>
        <span
          className={`sg-badge ${
            recommendation.newDependencyRequired === false
              ? "sg-badge-positive"
              : "sg-chip-subtle"
          }`}
        >
          {recommendation.newDependencyRequired === false
            ? "✓ No new dependency"
            : recommendation.newDependencyRequired === true
              ? "＋ New dependency"
              : "Decision pending"}
        </span>
      </div>

      {recommendation.primary ? (
        <CandidateCard candidate={recommendation.primary} primary />
      ) : null}

      {recommendation.alternatives.length > 0 ? (
        <details className="sg-alternatives">
          <summary>
            Compare {recommendation.alternatives.length} alternative
            {recommendation.alternatives.length === 1 ? "" : "s"}
          </summary>
          <div className="sg-wide-grid" style={{ marginTop: 12 }}>
            {recommendation.alternatives.map((candidate) => (
              <CandidateCard key={candidate.packageId} candidate={candidate} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
};

const SectionHeader = ({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) => (
  <div className="sg-section-head">
    <div>
      <div className="sg-eyebrow">{eyebrow}</div>
      <h2 className="sg-section-title">{title}</h2>
      {copy ? <p className="sg-section-copy">{copy}</p> : null}
    </div>
    {action}
  </div>
);

const App = ({
  data,
  initialRecommendation,
  initialTab,
}: {
  data: ProjectEcosystem;
  initialRecommendation: AdvisorResult | null;
  initialTab: Tab;
}) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [packageSearch, setPackageSearch] = useState("");
  const [directOnly, setDirectOnly] = useState(true);
  const [ecosystem, setEcosystem] = useState("all");
  const [capabilityIntent, setCapabilityIntent] = useState(
    initialRecommendation?.intent ?? "",
  );
  const [decisionPending, setDecisionPending] = useState(false);

  const warningCount = data.findings.filter(
    (item) => item.severity === "warning",
  ).length;
  const errorCount = data.findings.filter(
    (item) => item.severity === "error",
  ).length;
  const infoCount = data.findings.filter(
    (item) => item.severity === "info",
  ).length;
  const actionableCount = errorCount + warningCount;
  const directCount = data.packages.filter((pkg) => pkg.direct).length;
  const transitiveCount = data.packages.length - directCount;
  const analysisStatus =
    data.analysis?.status ??
    (data.analyzers.length === 0 ? "unsupported" : "success");

  const technologyGroups = useMemo(
    () => groupTechnologies(data.technologies),
    [data.technologies],
  );

  const ecosystems = useMemo(
    () => [...new Set(data.packages.map((pkg) => pkg.ecosystem))].sort(),
    [data.packages],
  );

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    return data.packages.filter((pkg) => {
      if (directOnly && !pkg.direct) return false;
      if (ecosystem !== "all" && pkg.ecosystem !== ecosystem) return false;
      if (!query) return true;
      return (
        pkg.name.toLowerCase().includes(query) ||
        pkg.ecosystem.toLowerCase().includes(query) ||
        pkg.category?.toLowerCase().includes(query) ||
        pkg.purpose?.toLowerCase().includes(query)
      );
    });
  }, [data.packages, directOnly, ecosystem, packageSearch]);

  const capabilities = useMemo(
    () =>
      [...data.capabilities].sort(
        (left, right) =>
          right.confidence - left.confidence ||
          left.name.localeCompare(right.name),
      ),
    [data.capabilities],
  );

  const runCapabilityDecision = (): void => {
    const intent = capabilityIntent.trim();
    if (!intent) return;
    setDecisionPending(true);
    vscode.postMessage({ action: "findCapability", intent });
  };

  return (
    <>
      <style>{css}</style>
      <main className="sg-shell">
        <header className="sg-header">
          <div className="sg-brand">
            <div className="sg-mark" aria-hidden="true">SG</div>
            <div>
              <h1 className="sg-title">StackGenome</h1>
              <div className="sg-tagline">
                Know your stack before you change your stack.
              </div>
              <div className="sg-project-name">
                <strong>{data.project.name}</strong>
                {data.project.projectType ? ` · ${data.project.projectType}` : ""}
              </div>
            </div>
          </div>

          <div className="sg-header-meta">
            {data.analyzers.map((analyzer) => (
              <span key={analyzer} className="sg-chip sg-chip-subtle">
                {analyzer}
              </span>
            ))}
            <span className="sg-chip sg-chip-subtle">
              {displayRoot(data.analysis?.rootUri ?? data.project.rootUri)}
            </span>
            <span
              className={`sg-badge ${
                actionableCount === 0 ? "sg-badge-positive" : "sg-badge-warning"
              }`}
            >
              {actionableCount === 0
                ? "✓ Healthy"
                : `${actionableCount} actionable`}
            </span>
          </div>
        </header>

        {analysisStatus !== "success" ? (
          <div className="sg-alert" style={{ marginBottom: 18 }}>
            <div className="sg-alert-title">
              {analysisStatus === "unsupported"
                ? "No supported project ecosystem detected"
                : analysisStatus === "failed"
                  ? "StackGenome could not analyze this project"
                  : "StackGenome completed with partial results"}
            </div>
            {analysisStatus === "unsupported" ? (
              <p>
                StackGenome V1 looks for Node/TypeScript or Python project metadata
                such as package.json, tsconfig.json, pyproject.toml, requirements.txt,
                or Pipfile. Open a file inside the intended nested project and analyze again.
              </p>
            ) : null}
            {(data.analysis?.diagnostics ?? []).map((diagnostic) => (
              <p key={`${diagnostic.code}:${diagnostic.analyzerId ?? ""}`}>
                {diagnostic.severity === "error" ? "⛔" : "⚠"} {diagnostic.message}
              </p>
            ))}
          </div>
        ) : null}

        <nav className="sg-tabs" aria-label="StackGenome report sections">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={`sg-tab ${tab === item ? "sg-tab-active" : ""}`}
              aria-current={tab === item ? "page" : undefined}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === "Overview" ? (
          <>
            <section className="sg-section">
              <SectionHeader
                eyebrow="Project intelligence"
                title="Project DNA"
                copy="The technologies and tooling StackGenome can prove from project metadata."
                action={
                  <span className="sg-muted">
                    {directCount} direct · {transitiveCount} transitive
                  </span>
                }
              />

              {data.technologies.length === 0 ? (
                <div className="sg-empty">
                  <div className="sg-empty-title">No technology metadata detected</div>
                  <p className="sg-muted">
                    StackGenome could not derive technology signals from the current project metadata.
                  </p>
                </div>
              ) : (
                <div className="sg-grid">
                  {kindOrder
                    .filter(
                      (kind) => (technologyGroups.get(kind)?.length ?? 0) > 0,
                    )
                    .map((kind) => (
                      <div key={kind} className="sg-card sg-dna-card">
                        <div className="sg-dna-top">
                          <span className="sg-dna-label">{kindLabels[kind]}</span>
                          <span className="sg-dna-symbol" aria-hidden="true">
                            {kindSymbols[kind]}
                          </span>
                        </div>
                        <TechnologyPills items={technologyGroups.get(kind) ?? []} />
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="sg-section">
              <SectionHeader
                eyebrow="Existing-first"
                title="What this project can already do"
                copy="Capabilities backed by installed direct dependencies."
                action={
                  <button
                    type="button"
                    className="sg-ghost-button"
                    onClick={() => setTab("Capabilities")}
                  >
                    View all {capabilities.length}
                  </button>
                }
              />

              {capabilities.length === 0 ? (
                <div className="sg-empty">
                  <div className="sg-empty-title">No curated capabilities detected yet</div>
                  <p className="sg-muted">
                    The project was analyzed successfully, but StackGenome's deterministic
                    catalog does not yet classify its direct dependencies into capabilities.
                  </p>
                </div>
              ) : (
                <div className="sg-grid">
                  {capabilities.slice(0, 6).map((capability) => (
                    <div key={capability.id} className="sg-card sg-capability-card">
                      <span className="sg-check" aria-hidden="true">✓</span>
                      <div>
                        <div className="sg-capability-title">{capability.name}</div>
                        <div className="sg-pills">
                          {capability.providedBy.map((provider) => (
                            <span key={provider} className="sg-tech-pill">
                              {provider}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="sg-section">
              <SectionHeader
                eyebrow="Technology decision"
                title="Find the right capability"
                copy="StackGenome checks this project's installed stack first."
                action={<span className="sg-badge sg-badge-positive">Existing-first</span>}
              />

              <div className="sg-decision">
                <h3 className="sg-decision-title">What are you trying to add?</h3>
                <p className="sg-section-copy">
                  Describe the capability, not the package. We'll reuse what is already
                  installed whenever a suitable option exists.
                </p>

                <div className="sg-input-row">
                  <input
                    aria-label="Capability intent"
                    className="sg-input"
                    value={capabilityIntent}
                    onChange={(event) => setCapabilityIntent(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") runCapabilityDecision();
                    }}
                    placeholder="e.g. internationalization, logging, API validation"
                  />
                  <button
                    type="button"
                    className="sg-button"
                    disabled={decisionPending || !capabilityIntent.trim()}
                    onClick={runCapabilityDecision}
                  >
                    {decisionPending ? "Checking…" : "Find capability"}
                  </button>
                </div>

                <div className="sg-examples" aria-label="Capability examples">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="sg-example"
                      onClick={() => setCapabilityIntent(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <DecisionResult recommendation={initialRecommendation} />
              </div>
            </section>

            <section className="sg-section">
              <SectionHeader
                eyebrow="Dependency health"
                title="Signal, not noise"
                copy="Actionable problems are separated from informational observations."
                action={
                  <button
                    type="button"
                    className="sg-ghost-button"
                    onClick={() => setTab("Health")}
                  >
                    View findings
                  </button>
                }
              />

              <div className="sg-health-grid">
                <div className="sg-metric sg-metric-error">
                  <div className="sg-metric-value">{errorCount}</div>
                  <div className="sg-metric-label">Errors</div>
                </div>
                <div className="sg-metric sg-metric-warning">
                  <div className="sg-metric-value">{warningCount}</div>
                  <div className="sg-metric-label">Warnings</div>
                </div>
                <div className="sg-metric sg-metric-info">
                  <div className="sg-metric-value">{infoCount}</div>
                  <div className="sg-metric-label">Observations</div>
                </div>
                <div className="sg-metric">
                  <div className="sg-metric-value">{data.packages.length}</div>
                  <div className="sg-metric-label">Resolved packages</div>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {tab === "Technology" ? (
          <section className="sg-section">
            <SectionHeader
              eyebrow="Evidence"
              title="Project technology"
              copy="Detected from manifests, lockfiles, and project configuration."
            />

            {data.technologies.length === 0 ? (
              <div className="sg-empty">No technology metadata was detected.</div>
            ) : (
              <div className="sg-wide-grid">
                {kindOrder
                  .filter(
                    (kind) => (technologyGroups.get(kind)?.length ?? 0) > 0,
                  )
                  .map((kind) => (
                    <div key={kind} className="sg-card">
                      <div className="sg-dna-top">
                        <strong>{kindLabels[kind]}</strong>
                        <span className="sg-dna-symbol" aria-hidden="true">
                          {kindSymbols[kind]}
                        </span>
                      </div>
                      {(technologyGroups.get(kind) ?? []).map((technology) => (
                        <div key={technology.id} className="sg-evidence-row">
                          <div className="sg-evidence-name">
                            {technology.name}
                            {technology.version ? (
                              <span className="sg-tech-pill" style={{ marginLeft: 7 }}>
                                {technology.version}
                              </span>
                            ) : null}
                          </div>
                          <div className="sg-evidence-source">
                            Evidence: {technology.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "Capabilities" ? (
          <section className="sg-section">
            <SectionHeader
              eyebrow="Reuse"
              title="Existing capabilities"
              copy="What installed direct dependencies already provide."
            />

            {capabilities.length === 0 ? (
              <div className="sg-empty">
                <div className="sg-empty-title">No curated capabilities detected</div>
                <p className="sg-muted">
                  This does not mean the project has no functionality. StackGenome V1
                  only reports capabilities backed by deterministic package knowledge.
                </p>
              </div>
            ) : (
              <div className="sg-wide-grid">
                {capabilities.map((capability) => (
                  <div key={capability.id} className="sg-card sg-capability-card">
                    <span className="sg-check" aria-hidden="true">✓</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="sg-capability-title">{capability.name}</div>
                      <div className="sg-pills">
                        {capability.providedBy.map((provider) => (
                          <span key={provider} className="sg-tech-pill">
                            {provider}
                          </span>
                        ))}
                      </div>
                      <div className="sg-inline-meta">
                        <span>Evidence confidence: {matchStrength(capability.confidence)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "Dependencies" ? (
          <section className="sg-section">
            <SectionHeader
              eyebrow="Inventory"
              title="Dependency intelligence"
              copy="Declared vs resolved versions, purpose, scope, and health."
              action={
                <span className="sg-muted">
                  {directCount} direct · {transitiveCount} transitive
                </span>
              }
            />

            <div className="sg-toolbar">
              <input
                aria-label="Search dependencies"
                className="sg-input"
                value={packageSearch}
                onChange={(event) => setPackageSearch(event.target.value)}
                placeholder="Search package, ecosystem, category or purpose"
              />
              <select
                aria-label="Filter ecosystem"
                className="sg-select"
                value={ecosystem}
                onChange={(event) => setEcosystem(event.target.value)}
              >
                <option value="all">All ecosystems</option>
                {ecosystems.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <label className="sg-checkbox">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(event) => setDirectOnly(event.target.checked)}
                />
                Direct only
              </label>
            </div>

            {filteredPackages.length === 0 ? (
              <div className="sg-empty">
                <div className="sg-empty-title">No dependencies match these filters</div>
                <p className="sg-muted">
                  Clear the search or broaden the ecosystem/direct dependency filters.
                </p>
              </div>
            ) : (
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Type</th>
                      <th>Declared</th>
                      <th>Resolved</th>
                      <th>Purpose</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPackages.map((pkg) => {
                      const finding = packageFinding(pkg, data.findings);
                      return (
                        <tr key={pkg.id}>
                          <td>
                            <div className="sg-package-cell">{pkg.name}</div>
                            <div className="sg-package-sub">
                              {pkg.ecosystem}
                              {pkg.category ? ` · ${pkg.category}` : ""}
                            </div>
                          </td>
                          <td>{pkg.direct ? pkg.scope : "transitive"}</td>
                          <td>{pkg.declaredVersion ?? "—"}</td>
                          <td>{pkg.resolvedVersions.join(", ") || "—"}</td>
                          <td>
                            {pkg.purpose ?? (
                              <span className="sg-muted">Purpose not classified yet</span>
                            )}
                          </td>
                          <td>
                            {finding ? (
                              <span
                                className={`sg-badge ${
                                  finding.severity === "error"
                                    ? "sg-badge-error"
                                    : "sg-badge-warning"
                                }`}
                              >
                                {finding.severity === "error" ? "⛔" : "⚠"}{" "}
                                {finding.title}
                              </span>
                            ) : (
                              <span className="sg-badge sg-badge-positive">
                                ✓ No actionable issue
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {tab === "Health" ? (
          <section className="sg-section">
            <SectionHeader
              eyebrow="Quality"
              title="Dependency health"
              copy="Actionable errors and warnings are separated from ecosystem observations."
              action={
                <div className="sg-pills">
                  <span className="sg-badge sg-badge-error">{errorCount} errors</span>
                  <span className="sg-badge sg-badge-warning">
                    {warningCount} warnings
                  </span>
                  <span className="sg-chip sg-chip-subtle">
                    {infoCount} observations
                  </span>
                </div>
              }
            />

            {data.findings.length === 0 ? (
              <div className="sg-empty">
                <div className="sg-empty-title">✓ No dependency health findings</div>
                <p className="sg-muted">
                  StackGenome did not detect deterministic ecosystem issues in this analysis.
                </p>
              </div>
            ) : (
              (["error", "warning", "info"] as const).map((severity) => {
                const findings = data.findings.filter(
                  (finding) => finding.severity === severity,
                );
                if (findings.length === 0) return null;

                return (
                  <section key={severity} className="sg-health-group">
                    <div className="sg-section-head">
                      <h3 className="sg-section-title">
                        {severity === "error"
                          ? "Errors"
                          : severity === "warning"
                            ? "Warnings"
                            : "Observations"}{" "}
                        <span className="sg-muted">({findings.length})</span>
                      </h3>
                    </div>
                    <div className="sg-wide-grid">
                      {findings.map((finding) => (
                        <div key={finding.id} className="sg-card sg-finding">
                          <span className="sg-finding-icon" aria-hidden="true">
                            {severity === "error"
                              ? "⛔"
                              : severity === "warning"
                                ? "⚠"
                                : "ⓘ"}
                          </span>
                          <div className="sg-finding-title">{finding.title}</div>
                          <p className="sg-finding-copy">{finding.message}</p>
                          {finding.recommendation ? (
                            <p className="sg-finding-copy">
                              <strong>
                                {severity === "info" ? "Note" : "Recommendation"}:
                              </strong>{" "}
                              {finding.recommendation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </section>
        ) : null}
      </main>
    </>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("StackGenome webview root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App
      data={window.__STACKGENOME_DATA__}
      initialRecommendation={window.__STACKGENOME_RECOMMENDATION__}
      initialTab={normalizeTab(window.__STACKGENOME_INITIAL_TAB__)}
    />
  </React.StrictMode>,
);
