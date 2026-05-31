"use strict";

const fs = require("fs");
const path = require("path");
const { canonicalize, computeJSCPID } = require("./jscpid");

function defaultManifest(input = {}) {
  return {
    name: input.name || "skill-pack",
    version: input.version || "0.1.0",
    purpose: input.purpose || "",
    summary: input.summary || "",
    dependsOn: input.dependsOn || [],
    skills: input.skills || [],
  };
}

function normalizeManifest(manifest) {
  const normalized = canonicalize({
    ...defaultManifest(manifest),
    dependsOn: manifest.dependsOn || [],
    skills: (manifest.skills || []).map(normalizeSkill),
  });
  normalized.jscpid = computeJSCPID({
    name: normalized.name,
    version: normalized.version,
    purpose: normalized.purpose,
    summary: normalized.summary,
    dependsOn: normalized.dependsOn,
    skills: normalized.skills.map((skill) => skill.jscpid),
  });
  return normalized;
}

function normalizeSkill(skill) {
  const normalized = canonicalize({
    id: skill.id,
    title: skill.title || skill.id,
    summary: skill.summary || "",
    purpose: skill.purpose || "",
    contracts: skill.contracts || [],
    guarantees: skill.guarantees || [],
    usagePatterns: skill.usagePatterns || [],
    implementations: {
      ts: (((skill.implementations || {}).ts) || []).map(String),
      rust: (((skill.implementations || {}).rust) || []).map(String),
    },
    dependsOn: skill.dependsOn || [],
  });
  normalized.jscpid = computeJSCPID({
    purpose: normalized.purpose,
    summary: normalized.summary,
    contracts: normalized.contracts,
    guarantees: normalized.guarantees,
    usagePatterns: normalized.usagePatterns,
    implementations: normalized.implementations,
    dependsOn: normalized.dependsOn,
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
  requiredString(manifest.purpose, "purpose", issues, context.manifestPath, true);

  if (!Array.isArray(manifest.dependsOn)) {
    issues.push(issue(context.manifestPath, "dependsOn must be an array of pack names"));
  } else if (manifest.dependsOn.some((item) => typeof item !== "string")) {
    issues.push(issue(context.manifestPath, "dependsOn must be an array of strings"));
  }

  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
    issues.push(issue(context.manifestPath, "skills must contain at least one skill"));
  } else {
    const skillIds = new Set();
    for (const skill of manifest.skills) {
      if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
        issues.push(issue(context.manifestPath, "each skill must be an object"));
        continue;
      }

      requiredString(skill.id, "skills[].id", issues, context.manifestPath);
      requiredString(skill.title, "skills[].title", issues, context.manifestPath, true);
      requiredString(skill.summary, "skills[].summary", issues, context.manifestPath, true);
      requiredString(skill.purpose, "skills[].purpose", issues, context.manifestPath, true);
      requiredArrayOfStrings(skill.contracts, "skills[].contracts", issues, context.manifestPath);
      requiredArrayOfStrings(skill.guarantees, "skills[].guarantees", issues, context.manifestPath);
      requiredArrayOfStrings(skill.usagePatterns, "skills[].usagePatterns", issues, context.manifestPath);
      requiredArrayOfStrings(skill.dependsOn || [], "skills[].dependsOn", issues, context.manifestPath);
      requiredSkillLinks(skill.implementations, "skills[].implementations", issues, context.manifestPath);
      if (skillIds.has(skill.id)) {
        issues.push(issue(context.manifestPath, `duplicate skill id: ${skill.id}`));
      }
      skillIds.add(skill.id);
    }
  }

  if (manifest.jscpid && manifest.jscpid !== computeJSCPID({
    name: manifest.name,
    version: manifest.version,
    purpose: manifest.purpose,
    summary: manifest.summary || "",
    dependsOn: manifest.dependsOn || [],
    skills: (manifest.skills || []).map((skill) => normalizeSkill(skill).jscpid),
  })) {
    issues.push(issue(context.manifestPath, "manifest.jscpid does not match computed value"));
  }

  for (const skill of manifest.skills || []) {
    if (!skill || typeof skill !== "object") continue;
    const normalizedSkill = normalizeSkill(skill);
    if (skill.jscpid && skill.jscpid !== normalizedSkill.jscpid) {
      issues.push(issue(context.manifestPath, `skill ${skill.id} jscpid does not match computed value`));
    }
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

function requiredArrayOfStrings(value, field, issues, manifestPath) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    issues.push(issue(manifestPath, `${field} must be an array of strings`));
  }
}

function requiredSkillLinks(value, field, issues, manifestPath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(issue(manifestPath, `${field} must be an object with ts and rust arrays`));
    return;
  }
  requiredArrayOfStrings(value.ts || [], `${field}.ts`, issues, manifestPath);
  requiredArrayOfStrings(value.rust || [], `${field}.rust`, issues, manifestPath);
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
