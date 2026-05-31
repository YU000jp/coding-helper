# @yu000jp/skillpack-helper

`@yu000jp/skillpack-helper` is a support library for other repositories that want to package and reuse AI coding knowledge as skill packs.

Repository:

- https://github.com/YU000jp/skillpack-helper

Use this package when you want to:

- keep repository-specific helper knowledge structured
- share the same guidance across multiple codebases
- reduce drift in generated code and prompts
- load only the minimum skills needed for a task

## Install

```bash
npm install @yu000jp/skillpack-helper
```

## Use From Another Repository

### CommonJS

```js
const {
  validateManifest,
  normalizeManifest,
  renderSkillMarkdown,
  buildBundle,
} = require("@yu000jp/skillpack-helper");
```

### ESM

```js
import skillpackHelper from "@yu000jp/skillpack-helper";

const {
  validateManifest,
  normalizeManifest,
  renderSkillMarkdown,
  buildBundle,
} = skillpackHelper;
```

### Schema Access

```js
const { manifestSchemaPath } = require("@yu000jp/skillpack-helper");
```

You can also reference the packaged schema directly:

- `@yu000jp/skillpack-helper/schema/skillpack.manifest.schema.json`

## Recommended Workflow

1. define skill packs in `skillpack.manifest.json`
2. generate `SKILL.md` from the manifest
3. validate the manifest and its semantic identifiers
4. build or pack only the skills needed for the target repository

## CLI

```bash
skillpack-helper create ./packs/example --name example-pack
skillpack-helper update ./packs/example
skillpack-helper validate ./packs
skillpack-helper list ./packs
skillpack-helper explain ./packs/example
skillpack-helper build ./packs --out ./dist
skillpack-helper pack ./packs --out ./bundle.json
```

- `skillpack-helper` is the primary CLI
- `create` scaffolds a new pack
- `update` regenerates `SKILL.md` from the manifest
- `validate` checks structure and semantic consistency
- `list` shows discovered packs
- `explain` prints the normalized pack view
- `build` emits a deterministic bundle for downstream use
- `pack` emits a machine-readable bundle and can target a subset of packs

## Manifest Model

`skillpack.manifest.json` is the source of truth.

It stores:

- pack name and version
- purpose and summary
- dependency pack names
- skill definitions
- implementation links
- generated `jscpid` values

Each skill stores:

- `id`
- `title`
- `summary`
- `purpose`
- `contracts`
- `guarantees`
- `usagePatterns`
- `dependsOn`
- `implementations.ts`
- `implementations.rust`
- `jscpid`

## JSON Schema

Schema file:

- [`schema/skillpack.manifest.schema.json`](./schema/skillpack.manifest.schema.json)

Editor support:

- VS Code completion is enabled through [`./.vscode/settings.json`](./.vscode/settings.json)
- other editors can point `skillpack.manifest.json` files at the same schema file directly

## Output Shape

`build` and `pack` produce deterministic output so downstream repositories can load only the packs they need.

The bundle includes:

- normalized pack metadata
- generated `SKILL.md`
- deduplicated skills by `JSCPID`
- dependency order

## Public API

The package exports the stable entrypoints for reuse by other repositories:

- manifest normalization and validation
- `SKILL.md` generation
- pack discovery and bundle building
- `manifestSchemaPath` for tooling integration

## Repository Layout

- `src/core` - manifest normalization, validation, and `JSCPID`
- `src/generator` - `SKILL.md` rendering
- `src/registry` - pack discovery, selection, and bundling
- `src/cli` - command-line entrypoints
- `schema` - JSON Schema for `skillpack.manifest.json`
- `test` - validation and bundling tests
