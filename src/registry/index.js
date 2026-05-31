"use strict";

const fs = require("fs");
const path = require("path");
const { normalizeManifest, readManifest, validateManifest } = require("../core/manifest");
const { renderSkillMarkdown } = require("../generator/skill-md");

function discoverPackDirectories(root) {
  const result = [];
  walk(root, result);
  return result;
}

function walk(dir, result) {
  if (!fs.existsSync(dir)) return;
  if (fs.existsSync(path.join(dir, "bundle.json"))) {
    return;
  }
  const manifestPath = path.join(dir, "skillpack.manifest.json");
  if (fs.existsSync(manifestPath)) {
    result.push(dir);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  for (const entry of entries) {
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), result);
    }
  }
}

function loadPack(dir) {
  const manifestPath = path.join(dir, "skillpack.manifest.json");
  const manifest = readManifest(manifestPath);
  return { dir, manifestPath, manifest };
}

function resolvePackSelection(root, selected = []) {
  const packs = discoverPackDirectories(root).map((dir) => loadPack(dir));
  if (packs.length === 0) {
    return { packs: [], helperDictionary: { canonical: [], duplicates: [] }, dependencyOrder: [] };
  }

  const normalizedPacks = packs.map((pack) => ({ ...pack, manifest: normalizeManifest(pack.manifest) }));
  for (const pack of normalizedPacks) {
    validateManifest(pack.manifest, { manifestPath: pack.manifestPath });
  }

  const byName = new Map(normalizedPacks.map((pack) => [pack.manifest.name, pack]));
  const byDir = new Map(normalizedPacks.map((pack) => [path.resolve(pack.dir), pack]));
  const byBaseName = new Map(normalizedPacks.map((pack) => [path.basename(pack.dir), pack]));
  const initial =
    selected.length > 0
      ? selected.map((token) => lookupPack(token, byName, byDir, byBaseName)).filter(Boolean)
      : normalizedPacks;

  if (selected.length > 0 && initial.length !== selected.length) {
    const unresolved = selected.filter((token) => !lookupPack(token, byName, byDir, byBaseName));
    throw new Error(`Unknown pack selection(s): ${unresolved.join(", ")}`);
  }
  const ordered = [];
  const visited = new Set();
  const stack = new Set();

  function visit(pack) {
    if (!pack || visited.has(pack.manifest.name)) return;
    if (stack.has(pack.manifest.name)) {
      throw new Error(`Circular dependency detected: ${Array.from(stack).join(" -> ")} -> ${pack.manifest.name}`);
    }
    stack.add(pack.manifest.name);
    for (const depName of pack.manifest.dependsOn || []) {
      const dependency = byName.get(depName);
      if (!dependency) {
        throw new Error(`Missing dependency "${depName}" required by pack "${pack.manifest.name}"`);
      }
      visit(dependency);
    }
    stack.delete(pack.manifest.name);
    visited.add(pack.manifest.name);
    ordered.push(pack);
  }

  for (const pack of initial) {
    visit(pack);
  }

  const dedupedHelpers = new Map();
  const resolvedPacks = [];
  const canonicalHelpers = [];
  const duplicateHelpers = [];

  for (const pack of ordered) {
    const helperMarkdown = renderSkillMarkdown(pack.manifest);
    for (const helper of pack.manifest.helpers) {
      const existing = dedupedHelpers.get(helper.jscpid);
      const helperSource = helperSourceRef(pack, helper);
      if (existing) {
        duplicateHelpers.push({
          jscpid: helper.jscpid,
          kept: existing.source,
          removed: helperSource,
        });
        continue;
      }
      const canonicalEntry = {
        jscpid: helper.jscpid,
        source: helperSource,
        helper,
      };
      dedupedHelpers.set(helper.jscpid, canonicalEntry);
      canonicalHelpers.push(canonicalEntry);
    }
    resolvedPacks.push({
      ...pack,
      helperMarkdown,
    });
  }

  return {
    packs: resolvedPacks,
    helperDictionary: {
      canonical: canonicalHelpers,
      duplicates: duplicateHelpers,
    },
    dependencyOrder: ordered.map((pack) => pack.manifest.name),
  };
}

function lookupPack(token, byName, byDir, byBaseName) {
  return byName.get(token) || byDir.get(path.resolve(token)) || byBaseName.get(token) || null;
}

function buildBundle({ root, selected = [] }) {
  const { packs, helperDictionary, dependencyOrder } = resolvePackSelection(root, selected);
  return {
    root,
    dependencyOrder,
    packs: packs.map((pack) => ({
      name: pack.manifest.name,
      dir: pack.dir,
      manifestPath: pack.manifestPath,
      manifest: pack.manifest,
      helperMarkdown: pack.helperMarkdown,
      jscpid: pack.manifest.jscpid,
      dependencies: pack.manifest.dependsOn,
    })),
    helperDictionary,
  };
}

function helperSourceRef(pack, helper) {
  return {
    packName: pack.manifest.name,
    packDir: pack.dir,
    manifestPath: pack.manifestPath,
    helperId: helper.id,
    helperTitle: helper.title,
  };
}

module.exports = {
  discoverPackDirectories,
  loadPack,
  resolvePackSelection,
  buildBundle,
};
