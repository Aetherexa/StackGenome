# StackGenome V1 Marketplace release

## Release target

- Extension ID: `aetherexa.stackgenome`
- Version: `1.0.0`
- Marketplace positioning: **Know what your project already has.**
- V1 public scope: standalone project ecosystem intelligence.

## One-time Marketplace setup

1. Create or confirm the Visual Studio Marketplace publisher ID `aetherexa`.
2. Ensure the publisher ID matches the extension manifest exactly.
3. Configure Marketplace trusted publishing for this GitHub repository/workflow if using automated publishing.
4. Use the GitHub environment `vscode-marketplace` for publication controls.

The current Microsoft publishing guidance recommends secure automated publishing with Microsoft Entra/OIDC. Global Azure DevOps PATs are scheduled for retirement on December 1, 2026.

## Build a release candidate

From the repository root:

```bash
pnpm install
pnpm check
pnpm package:vsix
```

Expected artifact:

```text
artifacts/stackgenome-1.0.0.vsix
```

Install the VSIX into a clean VS Code profile and validate:

- extension details render correctly
- icon and README render correctly
- Analyze Project opens the report
- Overview/Packages/Health/Capabilities/Recommend work
- Node/npm/pnpm/Yarn sample projects analyze correctly
- Python/pyproject/requirements/Poetry/uv/Pipenv sample projects analyze correctly
- missing/unsupported project metadata fails gracefully
- no future-facing AI Context UI is exposed in V1

## GitHub release workflow

Run **Marketplace Release** manually.

- `publish=false` builds and uploads the VSIX only.
- `publish=true` also calls `vsce publish --oidc --no-dependencies`.

Do not enable `publish=true` until Marketplace trusted publishing is configured for the `aetherexa` publisher.

## Manual first-publish fallback

If trusted publishing has not been configured yet:

1. Run the release workflow with `publish=false`.
2. Download the VSIX artifact.
3. Open the Visual Studio Marketplace publisher management page.
4. Upload `stackgenome-1.0.0.vsix` under the `aetherexa` publisher.
5. Verify the listing before announcing the release.

## Post-publish checks

- Search Marketplace for `StackGenome`.
- Confirm extension ID is `aetherexa.stackgenome`.
- Install from Marketplace into a clean VS Code profile.
- Run the V1 smoke test again.
- Create Git tag `v1.0.0`.
- Publish a GitHub Release with the VSIX attached if desired.
