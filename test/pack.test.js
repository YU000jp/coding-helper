"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const cliPath = path.resolve(__dirname, "..", "src", "cli.js");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function writeManifest(dir, manifest) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "skillpack.manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

test("help shows only the supported CLI commands", () => {
  const result = runCli(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /create/);
  assert.match(result.stdout, /update/);
  assert.match(result.stdout, /validate/);
  assert.match(result.stdout, /build/);
  assert.match(result.stdout, /pack/);
  assert.doesNotMatch(result.stdout, /\blist\b/);
  assert.doesNotMatch(result.stdout, /\bexplain\b/);
});

test("create scaffolds helper fields and update regenerates SKILL.md", () => {
  const root = tempDir("skillpack-helper-create-");
  const packDir = path.join(root, "example");

  const createResult = runCli(["create", packDir, "--name", "example-pack"]);
  assert.equal(createResult.status, 0);
  const manifestPath = path.join(packDir, "skillpack.manifest.json");
  assert.ok(fs.existsSync(manifestPath));
  assert.ok(fs.existsSync(path.join(packDir, "SKILL.md")));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(Array.isArray(manifest.helpers));
  assert.equal(manifest.helpers.length, 1);
  assert.equal(manifest.helpers[0].id, "core");
  assert.ok(typeof manifest.helpers[0].jscpid === "string");

  manifest.purpose = "Updated purpose.";
  manifest.helpers[0].content = "Updated helper body.";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const updateResult = runCli(["update", packDir]);
  assert.equal(updateResult.status, 0);
  const updated = fs.readFileSync(path.join(packDir, "SKILL.md"), "utf8");
  assert.match(updated, /Updated purpose\./);
  assert.match(updated, /Helper Dictionary/);
  assert.match(updated, /Updated helper body\./);
});

test("validate build and pack dedupe helpers through JSCPID", () => {
  const root = tempDir("skillpack-helper-dedupe-");
  writeManifest(path.join(root, "a"), {
    name: "pack-a",
    version: "0.1.0",
    purpose: "Shared helper.",
    summary: "Pack A.",
    dependsOn: [],
    helpers: [
      {
        id: "shared",
        title: "Shared helper",
        purpose: "Shared helper.",
        tags: ["shared", "core"],
        content: "function add(a, b) {\n  return a + b;\n}\n",
        references: ["src/shared"],
      },
    ],
  });
  writeManifest(path.join(root, "b"), {
    name: "pack-b",
    version: "0.1.0",
    purpose: "Shared helper.",
    summary: "Pack B.",
    dependsOn: [],
    helpers: [
      {
        id: "shared-copy",
        title: "Shared helper",
        purpose: "Shared helper.",
        tags: ["core", "shared"],
        content: "    function add(a, b) {\n      return a + b;\n    }\n",
        references: ["src/shared"],
      },
    ],
  });

  const validateResult = runCli(["validate", root]);
  assert.equal(validateResult.status, 0);
  assert.match(validateResult.stdout, /Validated 2 pack\(s\)\./);

  const outDir = path.join(root, "dist");
  const buildResult = runCli(["build", root, "--out", outDir]);
  assert.equal(buildResult.status, 0);
  const bundle = JSON.parse(fs.readFileSync(path.join(outDir, "bundle.json"), "utf8"));
  assert.deepEqual(bundle.dependencyOrder, ["pack-a", "pack-b"]);
  assert.equal(bundle.packs.length, 2);
  assert.equal(bundle.helperDictionary.canonical.length, 1);
  assert.equal(bundle.helperDictionary.duplicates.length, 1);
  assert.equal(bundle.helperDictionary.duplicates[0].kept.packName, "pack-a");
  assert.equal(bundle.helperDictionary.duplicates[0].removed.packName, "pack-b");

  const packResult = runCli(["pack", root]);
  assert.equal(packResult.status, 0);
  const packBundle = JSON.parse(packResult.stdout);
  assert.deepEqual(packBundle, bundle);
});
