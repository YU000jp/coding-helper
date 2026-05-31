"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  defaultManifest,
  normalizeManifest,
  validateManifest,
  writeManifest,
  renderSkillMarkdown,
  buildBundle,
  manifestSchemaPath,
} = require("../src");

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writePack(dir, manifest) {
  fs.mkdirSync(dir, { recursive: true });
  const normalized = normalizeManifest(manifest);
  writeManifest(path.join(dir, "skillpack.manifest.json"), normalized);
  fs.writeFileSync(path.join(dir, "SKILL.md"), renderSkillMarkdown(normalized), "utf8");
}

test("manifest normalizes and validates", () => {
  const manifest = defaultManifest({
    name: "alpha",
    purpose: "Reduce helper drift.",
    skills: [
      {
        id: "core",
        title: "Core",
        summary: "Shared helper pack.",
        purpose: "Reduce helper drift.",
        contracts: ["Keep it deterministic."],
        guarantees: ["Stable output."],
        usagePatterns: ["Load only when needed."],
        implementations: { ts: ["src/core"], rust: ["crates/core"] },
      },
    ],
  });

  const normalized = normalizeManifest(manifest);
  assert.match(normalized.jscpid, /^jscpid_[0-9a-f]{16}$/);
  assert.equal(normalized.skills[0].jscpid.startsWith("jscpid_"), true);
  assert.doesNotThrow(() => validateManifest(normalized));
});

test("renderSkillMarkdown includes core metadata", () => {
  const normalized = normalizeManifest(
    defaultManifest({
      name: "beta",
      purpose: "Provide scoped skills.",
      skills: [
        {
          id: "core",
          title: "Core",
          summary: "Pack summary.",
          purpose: "Provide scoped skills.",
          contracts: ["Keep boundaries clear."],
          guarantees: ["Explicit role ownership."],
          usagePatterns: ["Load selectively."],
          implementations: { ts: ["src/index.js"], rust: [] },
        },
      ],
    })
  );

  const markdown = renderSkillMarkdown(normalized);
  assert.match(markdown, /# beta/);
  assert.match(markdown, /## Skills/);
  assert.match(markdown, /JSCPID/);
  assert.match(markdown, /src\/index\.js/);
});

test("buildBundle deduplicates identical skills across packs", () => {
  const root = tempDir("coding-helper-");
  writePack(path.join(root, "a"), {
    name: "pack-a",
    purpose: "Shared skill.",
    skills: [
      {
        id: "shared",
        title: "Shared",
        summary: "Same semantics.",
        purpose: "Shared skill.",
        contracts: ["Keep behavior stable."],
        guarantees: ["Deterministic generation."],
        usagePatterns: ["Load only required packs."],
        implementations: { ts: ["src/shared"], rust: [] },
      },
    ],
  });
  writePack(path.join(root, "b"), {
    name: "pack-b",
    purpose: "Shared skill.",
    skills: [
      {
        id: "shared-copy",
        title: "Shared copy",
        summary: "Same semantics.",
        purpose: "Shared skill.",
        contracts: ["Keep behavior stable."],
        guarantees: ["Deterministic generation."],
        usagePatterns: ["Load only required packs."],
        implementations: { ts: ["src/shared"], rust: [] },
      },
    ],
  });

  const bundle = buildBundle({ root });
  assert.equal(bundle.packs.length, 2);
  assert.equal(bundle.duplicateSkills.length, 1);
});

test("buildBundle rejects circular dependencies", () => {
  const root = tempDir("coding-helper-cycle-");
  writePack(path.join(root, "a"), {
    name: "pack-a",
    purpose: "Cycle test.",
    dependsOn: ["pack-b"],
    skills: [
      {
        id: "a",
        title: "A",
        summary: "A.",
        purpose: "Cycle test.",
        contracts: ["Keep it stable."],
        guarantees: ["Deterministic output."],
        usagePatterns: ["Load selectively."],
        implementations: { ts: [], rust: [] },
      },
    ],
  });
  writePack(path.join(root, "b"), {
    name: "pack-b",
    purpose: "Cycle test.",
    dependsOn: ["pack-a"],
    skills: [
      {
        id: "b",
        title: "B",
        summary: "B.",
        purpose: "Cycle test.",
        contracts: ["Keep it stable."],
        guarantees: ["Deterministic output."],
        usagePatterns: ["Load selectively."],
        implementations: { ts: [], rust: [] },
      },
    ],
  });

  assert.throws(() => buildBundle({ root }), /Circular dependency detected/);
});

test("manifest schema is packaged and reachable from the public API", () => {
  assert.ok(fs.existsSync(manifestSchemaPath));
  assert.match(path.basename(manifestSchemaPath), /skillpack\.manifest\.schema\.json$/);
});
