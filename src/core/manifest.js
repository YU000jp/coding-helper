"use strict";

const fs = require("fs");
const path = require("path");
const { canonicalize, computeJSCPID } = require("./jscpid");
const { normalizeHelper, validateHelper } = require("./helpers");

function defaultManifest(input = {}) {
  return {
    name: input.name || "skill-pack",
    version: input.version || "0.1.0",
    purpose: input.purpose || "",
    summary: input.summary || "",
    dependsOn: input.dependsOn || [],
    helpers: input.helpers || [],
  };
}

function normalizeManifest(manifest) {
  const helpers = Array.isArray(manifest.helpers) ? manifest.helpers.map(normalizeHelper) : [];
  const normalized = canonicalize({
    ...defaultManifest(manifest),
    dependsOn: manifest.dependsOn || [],
    helpers,
  });
  normalized.jscpid = computeJSCPID({
    name: normalized.name,
    version: normalized.version,
    purpose: normalized.purpose,
    summary: normalized.summary,
    dependsOn: normalized.dependsOn,
    helpers: normalized.helpers.map((helper) => helper.jscpid),
  });
  return normalized;
}

function validateManifest(manifest, context = {}) {
  const issues = collectIssues(manifest, context);
  if (issues.length > 0) {
    const error = new Error(formatIssues(issues));
    error.issues = issues;
    throw error;
  }
  return true;
}

function collectIssues(manifest, context = {}) {
  const issues = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    issues.push(issue(context.manifestPath, "manifest must be an object"));
    return issues;
  }

  requiredString(manifest.name, "name", issues, context.manifestPath);
  requiredString(manifest.version, "version", issues, context.manifestPath);
  requiredString(manifest.purpose, "purpose", issues, context.manifestPath);

  if (!Array.isArray(manifest.dependsOn)) {
    issues.push(issue(context.manifestPath, "dependsOn must be an array of pack names"));
  } else if (manifest.dependsOn.some((item) => typeof item !== "string")) {
    issues.push(issue(context.manifestPath, "dependsOn must be an array of strings"));
  }

  if (!Array.isArray(manifest.helpers) || manifest.helpers.length === 0) {
    issues.push(issue(context.manifestPath, "helpers must contain at least one helper"));
  } else {
    const helperIds = new Set();
    for (const helper of manifest.helpers) {
      const helperIssues = validateHelper(helper, context);
      issues.push(...helperIssues);
      if (helper && typeof helper === "object" && !Array.isArray(helper)) {
        if (helperIds.has(helper.id)) {
          issues.push(issue(context.manifestPath, `duplicate helper id: ${helper.id}`));
        }
        helperIds.add(helper.id);
      }
    }
  }

  if (manifest.jscpid && manifest.jscpid !== computeJSCPID({
    name: manifest.name,
    version: manifest.version,
    purpose: manifest.purpose,
    summary: manifest.summary || "",
    dependsOn: manifest.dependsOn || [],
    helpers: Array.isArray(manifest.helpers) ? manifest.helpers.map((helper) => normalizeHelper(helper).jscpid) : [],
  })) {
    issues.push(issue(context.manifestPath, "manifest.jscpid does not match computed value"));
  }

  const dependencySet = new Set(manifest.dependsOn || []);
  if (dependencySet.has(manifest.name)) {
    issues.push(issue(context.manifestPath, "a pack cannot depend on itself"));
  }

  return issues;
}

function requiredString(value, field, issues, manifestPath, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    issues.push(issue(manifestPath, `${field} must be a non-empty string`));
  }
}

function issue(pathValue, message) {
  return {
    path: pathValue || null,
    message,
  };
}

function formatIssues(issues) {
  return issues.map((entry) => `${entry.path || "<unknown>"}: ${entry.message}`).join("\n");
}

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifestPath, manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

module.exports = {
  defaultManifest,
  normalizeManifest,
  validateManifest,
  readManifest,
  writeManifest,
  collectIssues,
  formatIssues,
};
