import { build } from "esbuild";

const shared = {
  bundle: true,
  minify: true,
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": "\"production\"",
  },
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.cjs",
    platform: "node",
    format: "cjs",
    target: "node20",
    external: ["vscode"],
  }),
  build({
    ...shared,
    entryPoints: ["src/webview/main.tsx"],
    outfile: "dist/webview.js",
    platform: "browser",
    format: "iife",
    target: "es2022",
  }),
]);
