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
  const manifestPath = path.join(dir, "skillpack.manifest.json");
  if (fs.existsSync(manifestPath)) {
    result.push(dir);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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
    return { packs: [], duplicateSkills: [] };
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

  const dedupedSkills = new Map();
  const dedupedPacks = [];
  const duplicateSkills = [];

  for (const pack of ordered) {
    const skillMarkdown = renderSkillMarkdown(pack.manifest);
    const keptSkills = [];
    for (const skill of pack.manifest.skills) {
      const existing = dedupedSkills.get(skill.jscpid);
      if (existing) {
        duplicateSkills.push({ jscpid: skill.jscpid, kept: existing.packName, removed: pack.manifest.name });
        continue;
      }
      dedupedSkills.set(skill.jscpid, { packName: pack.manifest.name, skillId: skill.id });
      keptSkills.push(skill);
    }
    dedupedPacks.push({
      ...pack,
      skillMarkdown,
      manifest: {
        ...pack.manifest,
        skills: keptSkills,
      },
    });
  }

  return { packs: dedupedPacks, duplicateSkills };
}

function lookupPack(token, byName, byDir, byBaseName) {
  return byName.get(token) || byDir.get(path.resolve(token)) || byBaseName.get(token) || null;
}

function buildBundle({ root, selected = [] }) {
  const { packs, duplicateSkills } = resolvePackSelection(root, selected);
  return {
    root,
    generatedAt: new Date().toISOString(),
    packs: packs.map((pack) => ({
      name: pack.manifest.name,
      dir: pack.dir,
      manifestPath: pack.manifestPath,
      manifest: pack.manifest,
      skillMarkdown: pack.skillMarkdown,
      jscpid: pack.manifest.jscpid,
      dependencies: pack.manifest.dependsOn,
    })),
    duplicateSkills,
  };
}

module.exports = {
  discoverPackDirectories,
  loadPack,
  resolvePackSelection,
  buildBundle,
};
