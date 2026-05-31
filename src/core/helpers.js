"use strict";

const { canonicalize, computeJSCPID } = require("./jscpid");

function defaultHelper(input = {}) {
  return {
    id: input.id || "core",
    title: input.title || "Core helper",
    purpose: input.purpose || "",
    tags: input.tags || [],
    content: input.content || "",
    references: input.references || [],
  };
}

function normalizeHelper(helper) {
  const normalized = canonicalize({
    id: helper.id,
    title: trimText(helper.title || helper.id),
    purpose: trimText(helper.purpose || ""),
    tags: normalizeStringList(helper.tags),
    content: normalizeHelperContent(helper.content || ""),
    references: normalizeStringList(helper.references),
  });

  normalized.jscpid = computeJSCPID({
    title: normalized.title,
    purpose: normalized.purpose,
    tags: normalized.tags,
    content: normalized.content,
    references: normalized.references,
  });

  return normalized;
}

function validateHelper(helper, context = {}) {
  const issues = [];
  if (!helper || typeof helper !== "object" || Array.isArray(helper)) {
    issues.push(issue(context.manifestPath, "each helper must be an object"));
    return issues;
  }

  requiredString(helper.id, "helpers[].id", issues, context.manifestPath);
  requiredString(helper.title, "helpers[].title", issues, context.manifestPath);
  requiredString(helper.purpose, "helpers[].purpose", issues, context.manifestPath);
  requiredString(helper.content, "helpers[].content", issues, context.manifestPath);
  requiredArrayOfStrings(helper.tags, "helpers[].tags", issues, context.manifestPath);
  requiredArrayOfStrings(helper.references, "helpers[].references", issues, context.manifestPath);

  const normalized = normalizeHelper(helper);
  if (helper.jscpid && helper.jscpid !== normalized.jscpid) {
    issues.push(issue(context.manifestPath, `helper ${helper.id} jscpid does not match computed value`));
  }

  return issues;
}

function normalizeHelperContent(value) {
  const text = String(value || "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return "";
  }

  const trimmed = lines.map((line) => line.replace(/[ \t]+$/u, ""));
  const indentWidth = findCommonIndentWidth(trimmed);
  const normalized = trimmed.map((line) => stripIndent(line, indentWidth));
  return normalized.join("\n").replace(/\n{3,}/g, "\n\n");
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((item) => trimText(item))
        .filter((item) => item.length > 0)
    )
  ).sort();
}

function findCommonIndentWidth(lines) {
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      let width = 0;
      for (const char of line) {
        if (char === " ") {
          width += 1;
        } else if (char === "\t") {
          width += 2;
        } else {
          break;
        }
      }
      return width;
    });

  if (indents.length === 0) {
    return 0;
  }

  return Math.min(...indents);
}

function stripIndent(line, width) {
  let consumed = 0;
  let index = 0;
  while (index < line.length && consumed < width) {
    const char = line[index];
    if (char === " ") {
      consumed += 1;
      index += 1;
      continue;
    }
    if (char === "\t") {
      consumed += 2;
      index += 1;
      continue;
    }
    break;
  }
  return line.slice(index);
}

function trimText(value) {
  return String(value || "").trim();
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

function issue(pathValue, message) {
  return {
    path: pathValue || null,
    message,
  };
}

module.exports = {
  defaultHelper,
  normalizeHelper,
  normalizeHelperContent,
  normalizeStringList,
  validateHelper,
};
