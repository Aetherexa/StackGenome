import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  AIContextProfile,
  AdvisorResult,
  EcosystemFinding,
  EcosystemPackage,
  ProjectAIContext,
  ProjectEcosystem,
  RecommendationCandidate,
  Technology,
} from "@stackgenome/contracts";

interface VsCodeApi {
  postMessage(message: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

declare global {
  interface Window {
    __STACKGENOME_DATA__: ProjectEcosystem;
    __STACKGENOME_RECOMMENDATION__: AdvisorResult | null;
    __STACKGENOME_AI_CONTEXTS__: Record<
      AIContextProfile,
      ProjectAIContext
    >;
    __STACKGENOME_INITIAL_TAB__: string;
    __STACKGENOME_INITIAL_CONTEXT_PROFILE__: AIContextProfile;
  }
}

const vscode = acquireVsCodeApi();

type Tab =
  | "Overview"
  | "Packages"
  | "Health"
  | "Capabilities"
  | "Recommend"
  | "AI Context";

const tabs: Tab[] = [
  "Overview",
  "Packages",
  "Health",
  "Capabilities",
  "Recommend",
];

const profiles: AIContextProfile[] = [
  "compact",
  "standard",
  "detailed",
];

const isTab = (value: string): value is Tab =>
  tabs.includes(value as Tab);

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "var(--vscode-font-family)",
    color: "var(--vscode-foreground)",
    background: "var(--vscode-editor-background)",
    minHeight: "100vh",
    padding: 24,
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  muted: { color: "var(--vscode-descriptionForeground)" },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
  card: {
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 8,
    padding: 14,
    background: "var(--vscode-sideBar-background)",
  },
  tabBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    borderBottom: "1px solid var(--vscode-panel-border)",
    marginBottom: 18,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  cell: {
    textAlign: "left",
    padding: "9px 8px",
    borderBottom: "1px solid var(--vscode-panel-border)",
    verticalAlign: "top",
  },
  pill: {
    display: "inline-block",
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 999,
    padding: "3px 8px",
    margin: "2px 4px 2px 0",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 260,
    flex: 1,
    padding: "7px 9px",
    color: "var(--vscode-input-foreground)",
    background: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-input-border)",
  },
  button: {
    padding: "7px 12px",
    color: "var(--vscode-button-foreground)",
    background: "var(--vscode-button-background)",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  recommendationHero: {
    border: "1px solid var(--vscode-focusBorder)",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    background: "var(--vscode-sideBar-background)",
  },
  candidateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  code: {
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    maxHeight: 520,
    overflow: "auto",
    padding: 14,
    border: "1px solid var(--vscode-panel-border)",
    borderRadius: 6,
    background: "var(--vscode-textCodeBlock-background)",
    fontFamily: "var(--vscode-editor-font-family)",
    fontSize: "var(--vscode-editor-font-size)",
  },
};

const packageFinding = (
  pkg: EcosystemPackage,
  findings: EcosystemFinding[],
): EcosystemFinding | undefined =>
  findings.find(
    (finding) =>
      (finding.packageId === pkg.id ||
        (!finding.packageId && finding.packageName === pkg.name)) &&
      (finding.severity === "error" ||
        finding.severity === "warning"),
  );

const groupTechnologies = (
  technologies: Technology[],
): Map<string, Technology[]> => {
  const groups = new Map<string, Technology[]>();
  for (const technology of technologies) {
    const key = technology.ecosystem ?? "project";
    const current = groups.get(key) ?? [];
    current.push(technology);
    groups.set(key, current);
  }
  return groups;
};

const CandidateCard = ({
  candidate,
  primary = false,
}: {
  candidate: RecommendationCandidate;
  primary?: boolean;
}) => (
  <div style={primary ? styles.recommendationHero : styles.card}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <strong>{candidate.name}</strong>
        <div style={styles.muted}>{candidate.ecosystem}</div>
      </div>
      <span style={styles.pill}>
        {candidate.existing ? "Already installed" : "New dependency"}
      </span>
    </div>

    <p>{candidate.reason}</p>

    <div>
      {candidate.matchedCapabilities.map((capability) => (
        <span key={capability} style={styles.pill}>
          {capability}
        </span>
      ))}
    </div>

    {candidate.installedVersion ? (
      <p style={styles.muted}>
        Resolved version: {candidate.installedVersion}
      </p>
    ) : candidate.declaredVersion ? (
      <p style={styles.muted}>
        Declared version: {candidate.declaredVersion}
      </p>
    ) : null}

    <p style={styles.muted}>
      Confidence: {Math.round(candidate.confidence * 100)}%
    </p>

    {candidate.guidance?.preferredPatterns.length ? (
      <div>
        <strong>Preferred</strong>
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

const RecommendationView = ({
  recommendation,
}: {
  recommendation: AdvisorResult | null;
}) => {
  if (!recommendation) {
    return (
      <div style={styles.card}>
        <strong>Existing capabilities first</strong>
        <p style={styles.muted}>
          Run “StackGenome: Find Existing Capability” or
          “StackGenome: Recommend Technology” from the Command Palette.
          StackGenome will prefer libraries already present in this project
          before proposing another dependency.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div style={{ ...styles.card, marginBottom: 12 }}>
        <strong>Implementation need</strong>
        <p>{recommendation.intent}</p>
        <div>
          {recommendation.matchedCapabilities.map((capability) => (
            <span key={capability} style={styles.pill}>
              {capability}
            </span>
          ))}
        </div>
        <p style={styles.muted}>{recommendation.explanation}</p>
      </div>

      <div style={{ ...styles.card, marginBottom: 12 }}>
        <strong>Dependency decision</strong>
        <p>
          {recommendation.newDependencyRequired === false
            ? "✓ No new dependency required"
            : recommendation.newDependencyRequired === true
              ? "＋ New dependency required"
              : "No package decision available"}
        </p>
      </div>

      {recommendation.primary ? (
        <>
          <h2>Recommended</h2>
          <CandidateCard candidate={recommendation.primary} primary />
        </>
      ) : null}

      {recommendation.alternatives.length > 0 ? (
        <>
          <h2>Alternatives</h2>
          <div style={styles.candidateGrid}>
            {recommendation.alternatives.map((candidate) => (
              <CandidateCard
                key={candidate.packageId}
                candidate={candidate}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
};

const AIContextView = ({
  contexts,
  initialProfile,
}: {
  contexts: Record<AIContextProfile, ProjectAIContext>;
  initialProfile: AIContextProfile;
}) => {
  const [profile, setProfile] =
    useState<AIContextProfile>(initialProfile);
  const context = contexts[profile];
  const serialized = useMemo(
    () => JSON.stringify(context, null, 2),
    [context],
  );

  return (
    <section>
      <div style={styles.toolbar}>
        <label>
          Profile{" "}
          <select
            aria-label="AI context profile"
            value={profile}
            onChange={(event) =>
              setProfile(event.target.value as AIContextProfile)
            }
          >
            {profiles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          style={styles.button}
          onClick={() =>
            vscode.postMessage({
              action: "copyAIContext",
              profile,
            })
          }
        >
          Copy JSON
        </button>
        <button
          type="button"
          style={styles.button}
          onClick={() =>
            vscode.postMessage({
              action: "exportAIContext",
              profile,
            })
          }
        >
          Export JSON
        </button>
      </div>

      <section style={styles.stats}>
        <div style={styles.card}>
          <strong>{context.stats.approximateTokens}</strong>
          <div style={styles.muted}>Approx. tokens</div>
        </div>
        <div style={styles.card}>
          <strong>{context.stats.characters}</strong>
          <div style={styles.muted}>Characters</div>
        </div>
        <div style={styles.card}>
          <strong>{context.packages.length}</strong>
          <div style={styles.muted}>Included packages</div>
        </div>
        <div style={styles.card}>
          <strong>{context.constraints.length}</strong>
          <div style={styles.muted}>Constraints</div>
        </div>
      </section>

      <div style={{ ...styles.card, marginBottom: 12 }}>
        <strong>What this context tells AI</strong>
        <p style={styles.muted}>
          Reuse installed capabilities, respect detected versions and
          dependency-health constraints, and avoid adding redundant
          technology.
        </p>
        {context.instructions.reuse.map((instruction) => (
          <div key={instruction}>✓ {instruction}</div>
        ))}
      </div>

      <div style={{ ...styles.card, marginBottom: 12 }}>
        <strong>Intentionally excluded</strong>
        <ul>
          {context.exclusions.map((exclusion) => (
            <li key={exclusion}>{exclusion}</li>
          ))}
        </ul>
      </div>

      <h2>Context preview</h2>
      <pre style={styles.code}>{serialized}</pre>
    </section>
  );
};

const App = ({
  data,
  recommendation,
  contexts,
  initialTab,
  initialContextProfile,
}: {
  data: ProjectEcosystem;
  recommendation: AdvisorResult | null;
  contexts: Record<AIContextProfile, ProjectAIContext>;
  initialTab: Tab;
  initialContextProfile: AIContextProfile;
}) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [packageSearch, setPackageSearch] = useState("");
  const [directOnly, setDirectOnly] = useState(true);
  const [ecosystem, setEcosystem] = useState("all");

  const warningCount = data.findings.filter(
    (item) => item.severity === "warning",
  ).length;
  const errorCount = data.findings.filter(
    (item) => item.severity === "error",
  ).length;
  const directCount = data.packages.filter((pkg) => pkg.direct).length;
  const transitiveCount = data.packages.length - directCount;

  const ecosystems = useMemo(
    () => [...new Set(data.packages.map((pkg) => pkg.ecosystem))].sort(),
    [data.packages],
  );

  const technologyGroups = useMemo(
    () => groupTechnologies(data.technologies),
    [data.technologies],
  );

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    return data.packages.filter((pkg) => {
      if (directOnly && !pkg.direct) return false;
      if (ecosystem !== "all" && pkg.ecosystem !== ecosystem) {
        return false;
      }
      if (!query) return true;
      return (
        pkg.name.toLowerCase().includes(query) ||
        pkg.ecosystem.toLowerCase().includes(query) ||
        pkg.category?.toLowerCase().includes(query) ||
        pkg.purpose?.toLowerCase().includes(query)
      );
    });
  }, [data.packages, directOnly, ecosystem, packageSearch]);

  return (
    <main style={styles.body}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>StackGenome</h1>
          <div style={styles.muted}>
            {data.project.name}
            {data.project.projectType
              ? ` · ${data.project.projectType}`
              : ""}
          </div>
        </div>
        <div style={styles.muted}>
          {data.analyzers.length} ecosystem
          {data.analyzers.length === 1 ? "" : "s"} · Schema{" "}
          {data.schemaVersion}
        </div>
      </header>

      <section style={styles.stats}>
        <div style={styles.card}>
          <strong>{directCount}</strong>
          <div style={styles.muted}>Direct packages</div>
        </div>
        <div style={styles.card}>
          <strong>{transitiveCount}</strong>
          <div style={styles.muted}>Transitive packages</div>
        </div>
        <div style={styles.card}>
          <strong>{data.capabilities.length}</strong>
          <div style={styles.muted}>Capabilities</div>
        </div>
        <div style={styles.card}>
          <strong>{warningCount + errorCount}</strong>
          <div style={styles.muted}>Health findings</div>
        </div>
      </section>

      <nav style={styles.tabBar}>
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            style={{
              padding: "8px 12px",
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

      {tab === "Overview" && (
        <section>
          {[...technologyGroups.entries()].map(
            ([group, technologies]) => (
              <div
                key={group}
                style={{ ...styles.card, marginBottom: 10 }}
              >
                <h2 style={{ textTransform: "capitalize" }}>
                  {group} ecosystem
                </h2>
                <div>
                  {technologies.map((technology) => (
                    <span key={technology.id} style={styles.pill}>
                      {technology.name}
                      {technology.version
                        ? ` ${technology.version}`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            ),
          )}
        </section>
      )}

      {tab === "Packages" && (
        <section>
          <div style={styles.toolbar}>
            <input
              aria-label="Search packages"
              value={packageSearch}
              onChange={(event) =>
                setPackageSearch(event.target.value)
              }
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
                onChange={(event) =>
                  setDirectOnly(event.target.checked)
                }
              />{" "}
              Direct only
            </label>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.cell}>Package</th>
                <th style={styles.cell}>Ecosystem</th>
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
                      {pkg.category ? (
                        <div style={styles.muted}>{pkg.category}</div>
                      ) : null}
                    </td>
                    <td style={styles.cell}>{pkg.ecosystem}</td>
                    <td style={styles.cell}>
                      {pkg.direct ? pkg.scope : "transitive"}
                    </td>
                    <td style={styles.cell}>
                      {pkg.declaredVersion ?? "—"}
                    </td>
                    <td style={styles.cell}>
                      {pkg.resolvedVersions.join(", ") || "—"}
                    </td>
                    <td style={styles.cell}>
                      {pkg.purpose ?? "Unknown"}
                    </td>
                    <td style={styles.cell}>
                      {finding
                        ? `${finding.severity === "error" ? "⛔" : "⚠"} ${finding.title}`
                        : "✓ Healthy"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === "Health" && (
        <section>
          {data.findings.length === 0 ? (
            <div style={styles.card}>
              No dependency health findings in the current analysis.
            </div>
          ) : (
            data.findings.map((finding) => (
              <div
                key={finding.id}
                style={{ ...styles.card, marginBottom: 10 }}
              >
                <strong>
                  {finding.severity === "error" ? "⛔" : "⚠"}{" "}
                  {finding.title}
                </strong>
                <p>{finding.message}</p>
                {finding.recommendation ? (
                  <p style={styles.muted}>
                    Recommendation: {finding.recommendation}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </section>
      )}

      {tab === "Capabilities" && (
        <section>
          {data.capabilities.map((capability) => (
            <div
              key={capability.id}
              style={{ ...styles.card, marginBottom: 10 }}
            >
              <strong>{capability.name}</strong>
              <div>
                {capability.providedBy.map((provider) => (
                  <span key={provider} style={styles.pill}>
                    {provider}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "Recommend" && (
        <RecommendationView recommendation={recommendation} />
      )}

      {tab === "AI Context" && (
        <AIContextView
          contexts={contexts}
          initialProfile={initialContextProfile}
        />
      )}
    </main>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("StackGenome webview root element was not found.");
}

const initialTab = isTab(window.__STACKGENOME_INITIAL_TAB__)
  ? window.__STACKGENOME_INITIAL_TAB__
  : "Overview";

createRoot(rootElement).render(
  <React.StrictMode>
    <App
      data={window.__STACKGENOME_DATA__}
      recommendation={window.__STACKGENOME_RECOMMENDATION__}
      contexts={window.__STACKGENOME_AI_CONTEXTS__}
      initialTab={initialTab}
      initialContextProfile={
        window.__STACKGENOME_INITIAL_CONTEXT_PROFILE__
      }
    />
  </React.StrictMode>,
);
