import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ProjectEcosystem } from "@stackgenome/contracts";

declare global {
  interface Window { __STACKGENOME_DATA__: ProjectEcosystem; }
}

type Tab = "Overview" | "Packages" | "Health" | "Capabilities" | "Recommend" | "AI Context";
const tabs: Tab[] = ["Overview", "Packages", "Health", "Capabilities", "Recommend", "AI Context"];

const styles: Record<string, React.CSSProperties> = {
  body: { fontFamily: "var(--vscode-font-family)", color: "var(--vscode-foreground)", background: "var(--vscode-editor-background)", minHeight: "100vh", padding: 24, boxSizing: "border-box" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  muted: { color: "var(--vscode-descriptionForeground)" },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 },
  card: { border: "1px solid var(--vscode-panel-border)", borderRadius: 8, padding: 14, background: "var(--vscode-sideBar-background)" },
  tabBar: { display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--vscode-panel-border)", marginBottom: 18 },
  table: { width: "100%", borderCollapse: "collapse" },
  cell: { textAlign: "left", padding: "9px 8px", borderBottom: "1px solid var(--vscode-panel-border)", verticalAlign: "top" },
  pill: { display: "inline-block", border: "1px solid var(--vscode-panel-border)", borderRadius: 999, padding: "3px 8px", margin: "2px 4px 2px 0" },
};

const App = ({ data }: { data: ProjectEcosystem }) => {
  const [tab, setTab] = useState<Tab>("Overview");
  const warningCount = data.findings.filter((item) => item.severity === "warning").length;
  const errorCount = data.findings.filter((item) => item.severity === "error").length;
  const techSummary = useMemo(() => data.technologies.map((technology) => technology.name).join(" · "), [data.technologies]);

  return (
    <main style={styles.body}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>StackGenome</h1>
          <div style={styles.muted}>{data.project.name} · Project Ecosystem Intelligence</div>
        </div>
        <div style={styles.muted}>Schema {data.schemaVersion}</div>
      </header>

      <section style={styles.stats}>
        <div style={styles.card}><strong>{data.packages.length}</strong><div style={styles.muted}>Packages</div></div>
        <div style={styles.card}><strong>{data.capabilities.length}</strong><div style={styles.muted}>Capabilities</div></div>
        <div style={styles.card}><strong>{warningCount}</strong><div style={styles.muted}>Warnings</div></div>
        <div style={styles.card}><strong>{errorCount}</strong><div style={styles.muted}>Critical</div></div>
      </section>

      <nav style={styles.tabBar}>
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} style={{
            padding: "8px 12px",
            border: "none",
            borderBottom: tab === item ? "2px solid var(--vscode-focusBorder)" : "2px solid transparent",
            color: "var(--vscode-foreground)",
            background: "transparent",
            cursor: "pointer",
          }}>{item}</button>
        ))}
      </nav>

      {tab === "Overview" && (
        <section><div style={styles.card}>
          <h2>Detected ecosystem</h2>
          <p>{techSummary || "No ecosystem technologies detected yet."}</p>
          <p style={styles.muted}>Analyzers: {data.analyzers.join(", ") || "none"}</p>
        </div></section>
      )}

      {tab === "Packages" && (
        <section><table style={styles.table}>
          <thead><tr><th style={styles.cell}>Package</th><th style={styles.cell}>Scope</th><th style={styles.cell}>Declared</th><th style={styles.cell}>Resolved</th><th style={styles.cell}>Purpose</th></tr></thead>
          <tbody>{data.packages.map((pkg) => (
            <tr key={pkg.id}>
              <td style={styles.cell}>{pkg.name}</td>
              <td style={styles.cell}>{pkg.scope}</td>
              <td style={styles.cell}>{pkg.declaredVersion ?? "—"}</td>
              <td style={styles.cell}>{pkg.resolvedVersions.join(", ") || "—"}</td>
              <td style={styles.cell}>{pkg.purpose ?? "Unknown"}</td>
            </tr>
          ))}</tbody>
        </table></section>
      )}

      {tab === "Health" && (
        <section>{data.findings.length === 0 ? (
          <div style={styles.card}>No dependency health findings in the current analysis.</div>
        ) : data.findings.map((finding) => (
          <div key={finding.id} style={{ ...styles.card, marginBottom: 10 }}>
            <strong>{finding.title}</strong><p>{finding.message}</p>
          </div>
        ))}</section>
      )}

      {tab === "Capabilities" && (
        <section>{data.capabilities.map((capability) => (
          <div key={capability.id} style={{ ...styles.card, marginBottom: 10 }}>
            <strong>{capability.name}</strong>
            <div>{capability.providedBy.map((provider) => <span key={provider} style={styles.pill}>{provider}</span>)}</div>
          </div>
        ))}</section>
      )}

      {(tab === "Recommend" || tab === "AI Context") && (
        <section style={styles.card}>
          <strong>{tab}</strong>
          <p style={styles.muted}>The foundation is ready. Version-aware recommendations and structured AI guidance remain isolated from RepoLens source analysis.</p>
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
  <React.StrictMode><App data={window.__STACKGENOME_DATA__} /></React.StrictMode>,
);
