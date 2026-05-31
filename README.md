# @yu000jp/skillpack-helper

CLI-only `devDependency` for downstream repositories that manage AI helper dictionaries.

It is used to:

- validate `skillpack.manifest.json`
- normalize helper entries with `JSCPID`
- build deterministic bundle output
- report duplicate helpers before packaging

## Install

```bash
npm i -D @yu000jp/skillpack-helper
```

## Use In a Repository

Add scripts to the consuming repository and treat them as the normal workflow:

```json
{
  "scripts": {
    "skillpack:validate": "skillpack-helper validate ./packs",
    "skillpack:build": "skillpack-helper build ./packs --out ./dist",
    "skillpack:pack": "skillpack-helper pack ./packs --out ./bundle.json"
  }
}
```

Typical flow:

```bash
npm run skillpack:validate
npm run skillpack:build
npm run skillpack:pack
```

`build` and `pack` produce a bundle with:

- `dependencyOrder`
- `packs`
- `helperDictionary.canonical`
- `helperDictionary.duplicates`

Example:

```json
{
  "dependencyOrder": ["pack-a", "pack-b"],
  "helperDictionary": {
    "canonical": [
      {
        "jscpid": "jscpid_0123456789abcdef",
        "source": {
          "packName": "pack-a",
          "helperId": "shared"
        }
      }
    ],
    "duplicates": [
      {
        "jscpid": "jscpid_0123456789abcdef",
        "kept": {
          "packName": "pack-a",
          "helperId": "shared"
        },
        "removed": {
          "packName": "pack-b",
          "helperId": "shared-copy"
        }
      }
    ]
  }
}
```

## Manifest Shape

Each pack provides one `skillpack.manifest.json` file. The important fields are:

- `name`
- `version`
- `purpose`
- `summary`
- `dependsOn`
- `helpers[]`

Each helper entry contains:

- `id`
- `title`
- `purpose`
- `tags`
- `content`
- `references`

## Command Reference

- `create` scaffold a new helper pack
- `update` regenerate `SKILL.md` from the manifest
- `validate` check one pack or a pack tree
- `build` write deterministic bundle output to disk
- `pack` write bundle JSON to stdout or a file

Direct execution is supported when you need it:

```bash
npx skillpack-helper validate ./packs
```

## Schema

- [`schema/skillpack.manifest.schema.json`](./schema/skillpack.manifest.schema.json)
- `@yu000jp/skillpack-helper/schema/skillpack.manifest.schema.json`
