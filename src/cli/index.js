"use strict";

const fs = require("fs");
const path = require("path");
const { defaultHelper } = require("../core/helpers");
const {
  defaultManifest,
  normalizeManifest,
  readManifest,
  validateManifest,
  writeManifest,
} = require("../core/manifest");
const { renderSkillMarkdown } = require("../generator/skill-md");
const { buildBundle, discoverPackDirectories, loadPack } = require("../registry");

async function createPack(options) {
  const root = options.root || process.cwd();
  const dir = resolveCreateDirectory(options, root);
  const name = options.name || path.basename(dir);
  const manifestPath = path.join(dir, "skillpack.manifest.json");
  const helperId = options.helperId || "core";

  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(manifestPath) && !options.force) {
    throw new Error(`Manifest already exists: ${manifestPath}`);
  }

  const manifest = defaultManifest({
    name,
    purpose: options.purpose || "Describe the pack purpose here.",
    dependsOn: options.dependsOn || [],
    helpers: [
      defaultHelper({
        id: helperId,
        title: options.title || "Core helper",
        purpose: options.helperPurpose || options.purpose || "Describe the helper purpose here.",
        tags: options.tags || [],
        content: options.content || "Describe the helper body here.",
        references: options.references || [],
      }),
    ],
  });

  const normalized = normalizeManifest(manifest);
  writeManifest(manifestPath, normalized);
  fs.writeFileSync(path.join(dir, "SKILL.md"), renderSkillMarkdown(normalized), "utf8");
  console.log(`Created ${manifestPath}`);
}

async function updatePack(options) {
  const pack = loadPack(resolvePackPath(options));
  const normalized = normalizeManifest(pack.manifest);
  writeManifest(pack.manifestPath, normalized);
  fs.writeFileSync(path.join(pack.dir, "SKILL.md"), renderSkillMarkdown(normalized), "utf8");
  console.log(`Updated ${pack.manifestPath}`);
}

async function validatePack(options) {
  const root = resolveRootDirectory(options);
  const packs = discoverPackDirectories(root).map((dir) => loadPack(dir));
  if (packs.length === 0) {
    throw new Error(`No helper packs found under ${root}`);
  }

  for (const pack of packs) {
    validateManifest(pack.manifest, { manifestPath: pack.manifestPath });
  }

  console.log(`Validated ${packs.length} pack(s).`);
}

async function buildOutput(options) {
  const root = resolveRootDirectory(options);
  const outDir = options.out || path.join(root, "dist");
  const bundle = buildBundle({ root });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bundle.json"), JSON.stringify(bundle, null, 2) + "\n", "utf8");
  for (const pack of bundle.packs) {
    const packDir = path.join(outDir, sanitizeFileName(pack.manifest.name));
    fs.mkdirSync(packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, "skillpack.manifest.json"), JSON.stringify(pack.manifest, null, 2) + "\n", "utf8");
    fs.writeFileSync(path.join(packDir, "SKILL.md"), pack.helperMarkdown, "utf8");
  }
  console.log(`Built bundle at ${outDir}`);
}

async function packSelection(options) {
  const { root, selected } = resolveRootAndSelected(options);
  const bundle = buildBundle({ root, selected });
  const output = JSON.stringify(bundle, null, 2) + "\n";
  if (options.out) {
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, output, "utf8");
    console.log(`Wrote ${options.out}`);
  } else {
    process.stdout.write(output);
  }
}

function resolvePackPath(options) {
  const root = resolveRootDirectory(options);
  const target = resolveTargetDirectory(options, root);
  if (fs.existsSync(path.join(target, "skillpack.manifest.json"))) {
    return target;
  }
  const packs = discoverPackDirectories(target);
  if (packs.length === 0) {
    const token = options._[0];
    if (token) {
      const resolvedFromName = resolvePackByToken(token, root);
      if (resolvedFromName) {
        return resolvedFromName;
      }
    }
    throw new Error(`No manifest found in ${target}`);
  }
  if (options._[0] && !fs.existsSync(path.resolve(process.cwd(), options._[0]))) {
    const resolvedFromName = resolvePackByToken(options._[0], root);
    if (resolvedFromName) {
      return resolvedFromName;
    }
  }
  return packs[0];
}

function resolveRootDirectory(options) {
  if (options.root) {
    return options.root;
  }
  const first = options._[0];
  if (first && fs.existsSync(path.resolve(process.cwd(), first))) {
    return path.resolve(process.cwd(), first);
  }
  return process.cwd();
}

function resolveTargetDirectory(options, root) {
  if (options._[0] && fs.existsSync(path.resolve(root, options._[0]))) {
    return path.resolve(root, options._[0]);
  }
  if (options._[0] && fs.existsSync(path.resolve(process.cwd(), options._[0]))) {
    return path.resolve(process.cwd(), options._[0]);
  }
  return root;
}

function resolveCreateDirectory(options, root) {
  if (options._[0]) {
    return path.resolve(root, options._[0]);
  }
  return root;
}

function resolveRootAndSelected(options) {
  const root = resolveRootDirectory(options);
  const rootArg = options._[0];
  const selected = [];
  if (rootArg && fs.existsSync(path.resolve(process.cwd(), rootArg))) {
    const resolved = path.resolve(process.cwd(), rootArg);
    if (resolved === root) {
      selected.push(...options._.slice(1));
    } else {
      selected.push(...options._);
    }
  } else {
    selected.push(...options._);
  }
  return { root, selected };
}

function resolvePackByToken(token, root) {
  const packs = discoverPackDirectories(root).map((dir) => loadPack(dir));
  for (const pack of packs) {
    if (pack.manifest.name === token || path.basename(pack.dir) === token) {
      return pack.dir;
    }
  }
  return null;
}

function sanitizeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

module.exports = {
  createPack,
  updatePack,
  validatePack,
  buildOutput,
  packSelection,
};
