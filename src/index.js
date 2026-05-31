"use strict";

const path = require("path");
const { computeJSCPID, canonicalize, stableStringify } = require("./core/jscpid");
const {
  defaultManifest,
  normalizeManifest,
  validateManifest,
  readManifest,
  writeManifest,
} = require("./core/manifest");
const { renderSkillMarkdown } = require("./generator/skill-md");
const {
  discoverPackDirectories,
  loadPack,
  resolvePackSelection,
  buildBundle,
} = require("./registry");

const manifestSchemaPath = path.join(__dirname, "..", "schema", "skillpack.manifest.schema.json");

module.exports = {
  computeJSCPID,
  canonicalize,
  stableStringify,
  defaultManifest,
  normalizeManifest,
  validateManifest,
  readManifest,
  writeManifest,
  renderSkillMarkdown,
  discoverPackDirectories,
  loadPack,
  resolvePackSelection,
  buildBundle,
  manifestSchemaPath,
};
