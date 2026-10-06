import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  EcosystemFinding,
  EcosystemPackage,
  ProjectEcosystem,
  Technology,
} from "@stackgenome/contracts";

declare global {
  interface Window {
    __STACKGENOME_DATA__: ProjectEcosystem;
  }
}

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
  "AI Context",
];

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

const App = ({ data }: { data: ProjectEcosystem }) => {
  const [tab, setTab] = useState<Tab>("Overview");
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
        <section>
          <div style={styles.card}>
            <strong>Existing capabilities first</strong>
            <p style={styles.muted}>
              StackGenome prefers libraries already present across the
              detected project ecosystems before recommending a new
              dependency.
            </p>
          </div>
        </section>
      )}

      {tab === "AI Context" && (
        <section>
          {data.packages
            .filter((pkg) => pkg.direct && pkg.guidance)
            .map((pkg) => (
              <div
                key={pkg.id}
                style={{ ...styles.card, marginBottom: 10 }}
              >
                <strong>
                  {pkg.name} · {pkg.ecosystem}
                </strong>
                <p style={styles.muted}>
                  Preferred patterns:{" "}
                  {pkg.guidance?.preferredPatterns.join(" · ")}
                </p>
                <p style={styles.muted}>
                  Avoid: {pkg.guidance?.avoidPatterns.join(" · ")}
                </p>
              </div>
            ))}
        </section>
      )}
    </main>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("StackGenome webview root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App data={window.__STACKGENOME_DATA__} />
  </React.StrictMode>,
);
