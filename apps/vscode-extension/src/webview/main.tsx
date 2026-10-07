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

const normalizeTab = (value: string): Tab => {
  if (tabs.includes(value as Tab)) return value as Tab;
  if (value === "Packages") return "Dependencies";
  return "Overview";
};

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "var(--vscode-font-family)",
    color: "var(--vscode-foreground)",
    background: "var(--vscode-editor-background)",
    minHeight: "100vh",
    padding: "28px 32px 48px",
    boxSizing: "border-box",
    maxWidth: 1500,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 22,
  },
  title: { fontSize: 27, fontWeight: 700, margin: 0 },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: "var(--vscode-descriptionForeground)",
  },
  muted: { color: "var(--vscode-descriptionForeground)" },
  card: {
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 10,
    padding: 16,
    background: "var(--vscode-sideBar-background)",
  },
  heroCard: {
    border: "1px solid var(--vscode-focusBorder)",
    borderRadius: 10,
    padding: 18,
    background: "var(--vscode-sideBar-background)",
  },
  section: { marginBottom: 20 },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, margin: 0 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 10,
  },
  wideGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
  },
  tabBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    borderBottom: "1px solid var(--vscode-panel-border)",
    marginBottom: 22,
  },
  pill: {
    display: "inline-block",
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 999,
    padding: "3px 8px",
    margin: "2px 4px 2px 0",
    fontSize: 12,
  },
  toolbar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 280,
    flex: 1,
    padding: "9px 10px",
    color: "var(--vscode-input-foreground)",
    background: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-input-border)",
    borderRadius: 4,
  },
  button: {
    padding: "9px 14px",
    color: "var(--vscode-button-foreground)",
    background: "var(--vscode-button-background)",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "5px 9px",
    color: "var(--vscode-foreground)",
    background: "transparent",
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 12,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  cell: {
    textAlign: "left",
    padding: "9px 8px",
    borderBottom: "1px solid var(--vscode-panel-border)",
    verticalAlign: "top",
  },
  meta: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "var(--vscode-descriptionForeground)",
    fontSize: 12,
    marginTop: 8,
  },
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
  <div>
    {items.map((technology) => (
      <span key={technology.id} style={styles.pill}>
        {technology.name}
        {technology.version ? ` ${technology.version}` : ""}
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
}) => (
  <div style={primary ? styles.heroCard : styles.card}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div>
        <strong>{candidate.name}</strong>
        <div style={styles.muted}>{candidate.ecosystem}</div>
      </div>
      <span style={styles.pill}>
        {candidate.existing ? "Already installed" : "New dependency"}
      </span>
    </div>
    <p>{candidate.reason}</p>
    <TechnologyPills
      items={candidate.matchedCapabilities.map((capability) => ({
        id: capability,
        name: capability,
        kind: "other",
        source: "advisor",
      }))}
    />
    {candidate.installedVersion ? (
      <p style={styles.muted}>Resolved version: {candidate.installedVersion}</p>
    ) : candidate.declaredVersion ? (
      <p style={styles.muted}>Declared version: {candidate.declaredVersion}</p>
    ) : null}
    {candidate.guidance?.preferredPatterns.length ? (
      <div>
        <strong>Preferred patterns</strong>
        <ul>
          {candidate.guidance.preferredPatterns.map((pattern) => (
            <li key={pattern}>{pattern}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {candidate.guidance?.avoidPatterns.length ? (
      <div>
        <strong>Avoid</strong>
        <ul>
          {candidate.guidance.avoidPatterns.map((pattern) => (
            <li key={pattern}>{pattern}</li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
);

const DecisionResult = ({
  recommendation,
}: {
  recommendation: AdvisorResult | null;
}) => {
  if (!recommendation) {
    return (
      <p style={styles.muted}>
        Describe what you need. StackGenome checks the current project first and
        only recommends a new dependency when no suitable installed capability exists.
      </p>
    );
  }

  if (recommendation.matchedCapabilities.length === 0) {
    return (
      <div style={{ ...styles.card, marginTop: 12 }}>
        <strong>No dependency-backed capability matched yet</strong>
        <p>{recommendation.intent}</p>
        <p style={styles.muted}>{recommendation.explanation}</p>
        <p style={styles.muted}>
          StackGenome V1 reasons from deterministic project ecosystem metadata.
          Source-code implementation patterns are outside this V1 scope.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <strong>
          {recommendation.newDependencyRequired === false
            ? "✓ Reuse what is already installed"
            : recommendation.newDependencyRequired === true
              ? "＋ New dependency recommended"
              : "Capability understood"}
        </strong>
        <div style={styles.meta}>
          <span>Need: {recommendation.intent}</span>
          <span>
            Capability: {recommendation.matchedCapabilities.join(", ")}
          </span>
        </div>
        <p style={styles.muted}>{recommendation.explanation}</p>
      </div>

      {recommendation.primary ? (
        <CandidateCard candidate={recommendation.primary} primary />
      ) : null}

      {recommendation.alternatives.length > 0 ? (
        <details style={{ marginTop: 10 }}>
          <summary>Other compatible options</summary>
          <div style={{ ...styles.wideGrid, marginTop: 10 }}>
            {recommendation.alternatives.map((candidate) => (
              <CandidateCard key={candidate.packageId} candidate={candidate} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
};

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
    <main style={styles.body}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>StackGenome</h1>
          <div style={styles.tagline}>
            Know your stack before you change your stack.
          </div>
          <div style={{ ...styles.muted, marginTop: 8 }}>
            <strong>{data.project.name}</strong>
            {data.project.projectType ? ` · ${data.project.projectType}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={styles.muted}>
            {data.analyzers.length > 0
              ? data.analyzers.join(" + ")
              : "No supported ecosystem detected"}
          </div>
          <div style={{ ...styles.muted, marginTop: 4, fontSize: 12 }}>
            {displayRoot(data.analysis?.rootUri ?? data.project.rootUri)}
          </div>
        </div>
      </header>

      {analysisStatus !== "success" ? (
        <div
          style={{
            ...styles.card,
            marginBottom: 18,
            border:
              analysisStatus === "failed"
                ? "1px solid var(--vscode-inputValidation-errorBorder)"
                : "1px solid var(--vscode-inputValidation-warningBorder)",
          }}
        >
          <strong>
            {analysisStatus === "unsupported"
              ? "No supported project ecosystem detected"
              : analysisStatus === "failed"
                ? "StackGenome could not analyze this project"
                : "StackGenome completed with partial results"}
          </strong>
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

      <nav style={styles.tabBar}>
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            style={{
              padding: "9px 12px",
              border: "none",
              borderBottom:
                tab === item
                  ? "2px solid var(--vscode-focusBorder)"
                  : "2px solid transparent",
              color: "var(--vscode-foreground)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === "Overview" ? (
        <>
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Project DNA</h2>
              <span style={styles.muted}>
                {directCount} direct · {transitiveCount} transitive dependencies
              </span>
            </div>
            {data.technologies.length === 0 ? (
              <div style={styles.card}>
                No technology metadata was detected for this project.
              </div>
            ) : (
              <div style={styles.grid}>
                {kindOrder
                  .filter((kind) => (technologyGroups.get(kind)?.length ?? 0) > 0)
                  .map((kind) => (
                    <div key={kind} style={styles.card}>
                      <strong>{kindLabels[kind]}</strong>
                      <div style={{ marginTop: 8 }}>
                        <TechnologyPills items={technologyGroups.get(kind) ?? []} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>What this project can already do</h2>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setTab("Capabilities")}
              >
                View all {capabilities.length}
              </button>
            </div>
            {capabilities.length === 0 ? (
              <div style={styles.card}>
                <strong>No curated capabilities detected yet</strong>
                <p style={styles.muted}>
                  StackGenome still understands the project technology and dependencies.
                  Capability classification is intentionally deterministic and may not yet
                  cover every installed package.
                </p>
              </div>
            ) : (
              <div style={styles.grid}>
                {capabilities.slice(0, 6).map((capability) => (
                  <div key={capability.id} style={styles.card}>
                    <strong>✓ {capability.name}</strong>
                    <div style={{ marginTop: 8 }}>
                      {capability.providedBy.map((provider) => (
                        <span key={provider} style={styles.pill}>
                          {provider}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Technology decision</h2>
              <span style={styles.muted}>Existing dependency first</span>
            </div>
            <div style={styles.heroCard}>
              <strong>What are you trying to add?</strong>
              <p style={styles.muted}>
                StackGenome checks this project's installed capabilities before
                recommending another dependency.
              </p>
              <div style={styles.toolbar}>
                <input
                  aria-label="Capability intent"
                  style={styles.input}
                  value={capabilityIntent}
                  onChange={(event) => setCapabilityIntent(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") runCapabilityDecision();
                  }}
                  placeholder="e.g. internationalization, logging, API validation"
                />
                <button
                  type="button"
                  style={styles.button}
                  disabled={decisionPending || !capabilityIntent.trim()}
                  onClick={runCapabilityDecision}
                >
                  {decisionPending ? "Checking…" : "Find Capability"}
                </button>
              </div>
              <div>
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setCapabilityIntent(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <DecisionResult recommendation={initialRecommendation} />
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Dependency health</h2>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setTab("Health")}
              >
                View findings
              </button>
            </div>
            <div style={styles.wideGrid}>
              <div style={styles.card}>
                <strong>{actionableCount === 0 ? "✓ No actionable issues" : `${actionableCount} actionable`}</strong>
                <div style={styles.meta}>
                  <span>{errorCount} errors</span>
                  <span>{warningCount} warnings</span>
                  <span>{infoCount} observations</span>
                </div>
              </div>
              <div style={styles.card}>
                <strong>Dependency footprint</strong>
                <div style={styles.meta}>
                  <span>{directCount} direct</span>
                  <span>{transitiveCount} transitive</span>
                  <span>{data.packages.length} total</span>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {tab === "Technology" ? (
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Project technology</h2>
            <span style={styles.muted}>
              Detected from manifests, lockfiles, and project configuration
            </span>
          </div>
          {data.technologies.length === 0 ? (
            <div style={styles.card}>No technology metadata was detected.</div>
          ) : (
            <div style={styles.wideGrid}>
              {kindOrder
                .filter((kind) => (technologyGroups.get(kind)?.length ?? 0) > 0)
                .map((kind) => (
                  <div key={kind} style={styles.card}>
                    <h3 style={{ marginTop: 0 }}>{kindLabels[kind]}</h3>
                    {(technologyGroups.get(kind) ?? []).map((technology) => (
                      <div
                        key={technology.id}
                        style={{
                          padding: "8px 0",
                          borderBottom: "1px solid var(--vscode-panel-border)",
                        }}
                      >
                        <strong>{technology.name}</strong>
                        {technology.version ? (
                          <span style={styles.pill}>{technology.version}</span>
                        ) : null}
                        <div style={{ ...styles.muted, fontSize: 12, marginTop: 3 }}>
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
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Existing capabilities</h2>
            <span style={styles.muted}>
              What installed direct dependencies already provide
            </span>
          </div>
          {capabilities.length === 0 ? (
            <div style={styles.card}>
              <strong>No curated capabilities detected</strong>
              <p style={styles.muted}>
                This does not mean the project has no functionality. StackGenome V1
                only reports capabilities backed by deterministic package knowledge.
              </p>
            </div>
          ) : (
            <div style={styles.wideGrid}>
              {capabilities.map((capability) => (
                <div key={capability.id} style={styles.card}>
                  <strong>{capability.name}</strong>
                  <p style={styles.muted}>Provided by installed dependencies:</p>
                  <div>
                    {capability.providedBy.map((provider) => (
                      <span key={provider} style={styles.pill}>
                        {provider}
                      </span>
                    ))}
                  </div>
                  <div style={styles.meta}>
                    <span>
                      Confidence: {Math.round(capability.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "Dependencies" ? (
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Dependency intelligence</h2>
            <span style={styles.muted}>
              {directCount} direct · {transitiveCount} transitive
            </span>
          </div>
          <div style={styles.toolbar}>
            <input
              aria-label="Search dependencies"
              value={packageSearch}
              onChange={(event) => setPackageSearch(event.target.value)}
              placeholder="Search package, ecosystem, category or purpose"
              style={styles.input}
            />
            <select
              aria-label="Filter ecosystem"
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
            <label>
              <input
                type="checkbox"
                checked={directOnly}
                onChange={(event) => setDirectOnly(event.target.checked)}
              />{" "}
              Direct only
            </label>
          </div>

          {filteredPackages.length === 0 ? (
            <div style={styles.card}>
              No dependencies match the current filters.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.cell}>Package</th>
                  <th style={styles.cell}>Type</th>
                  <th style={styles.cell}>Declared</th>
                  <th style={styles.cell}>Resolved</th>
                  <th style={styles.cell}>Purpose</th>
                  <th style={styles.cell}>Health</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((pkg) => {
                  const finding = packageFinding(pkg, data.findings);
                  return (
                    <tr key={pkg.id}>
                      <td style={styles.cell}>
                        <strong>{pkg.name}</strong>
                        <div style={styles.muted}>
                          {pkg.ecosystem}
                          {pkg.category ? ` · ${pkg.category}` : ""}
                        </div>
                      </td>
                      <td style={styles.cell}>
                        {pkg.direct ? pkg.scope : "transitive"}
                      </td>
                      <td style={styles.cell}>{pkg.declaredVersion ?? "—"}</td>
                      <td style={styles.cell}>
                        {pkg.resolvedVersions.join(", ") || "—"}
                      </td>
                      <td style={styles.cell}>
                        {pkg.purpose ?? (
                          <span style={styles.muted}>
                            Purpose not classified yet
                          </span>
                        )}
                      </td>
                      <td style={styles.cell}>
                        {finding
                          ? `${finding.severity === "error" ? "⛔" : "⚠"} ${finding.title}`
                          : "✓ No actionable issue"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {tab === "Health" ? (
        <section>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Dependency health</h2>
            <span style={styles.muted}>
              {errorCount} errors · {warningCount} warnings · {infoCount} observations
            </span>
          </div>

          {data.findings.length === 0 ? (
            <div style={styles.card}>
              <strong>✓ No dependency health findings</strong>
              <p style={styles.muted}>
                StackGenome did not detect deterministic ecosystem issues in the
                current analysis.
              </p>
            </div>
          ) : (
            (["error", "warning", "info"] as const).map((severity) => {
              const findings = data.findings.filter(
                (finding) => finding.severity === severity,
              );
              if (findings.length === 0) return null;

              return (
                <section key={severity} style={styles.section}>
                  <h3>
                    {severity === "error"
                      ? "Errors"
                      : severity === "warning"
                        ? "Warnings"
                        : "Observations"}
                    {" "}({findings.length})
                  </h3>
                  <div style={styles.wideGrid}>
                    {findings.map((finding) => (
                      <div key={finding.id} style={styles.card}>
                        <strong>
                          {severity === "error"
                            ? "⛔"
                            : severity === "warning"
                              ? "⚠"
                              : "ⓘ"}{" "}
                          {finding.title}
                        </strong>
                        <p>{finding.message}</p>
                        {finding.recommendation ? (
                          <p style={styles.muted}>
                            {severity === "info" ? "Note" : "Recommendation"}:{" "}
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
