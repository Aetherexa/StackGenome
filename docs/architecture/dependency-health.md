# Dependency-health fidelity

StackGenome reports only health signals that can be derived reliably from local project manifests and lockfiles. It does not claim registry-level freshness or vulnerability status without a dedicated external intelligence source.

## Node ecosystem

| Source | Resolved versions | Duplicate versions | Peer dependencies | Deprecation metadata |
| --- | --- | --- | --- | --- |
| npm `package-lock.json` | Full | Full | Full | When present |
| pnpm `pnpm-lock.yaml` | Full | Full | Full when recorded by the lockfile | When present |
| Yarn Berry/modern `yarn.lock` | Full | Full | Full when recorded by the lockfile | When present |
| Yarn classic v1 `yarn.lock` | Full | Full | Partial | Limited |

Yarn classic lockfiles do not consistently carry all peer/optional-peer metadata, so StackGenome treats their peer-health signal as partial rather than inferring data that is not present.

## Python ecosystem

| Source | Declared constraints | Resolved versions | Notes |
| --- | --- | --- | --- |
| `pyproject.toml` | Full for supported PEP 621/Poetry groups | — | Project and tool metadata |
| `requirements*.txt` | Full for standard named requirements | — | Includes/constraints are not recursively traversed yet |
| `poetry.lock` | — | Full package table | Local lockfile evidence |
| `uv.lock` | — | Full package table | Local lockfile evidence |
| `Pipfile` | Full | — | Runtime/development groups |
| `Pipfile.lock` | — | Full default/develop sections | Local lockfile evidence |

StackGenome deliberately distinguishes **declared** from **resolved** versions. A version constraint in a manifest is not presented as an installed/resolved version unless a supported lockfile provides that evidence.
