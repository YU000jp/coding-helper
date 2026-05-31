"use strict";

const crypto = require("crypto");

function canonicalize(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value.map(canonicalize);
    if (normalized.every((item) => typeof item === "string")) {
      return Array.from(new Set(normalized)).sort();
    }
    return normalized;
  }

  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const entry = canonicalize(value[key]);
      if (entry !== undefined) {
        result[key] = entry;
      }
    }
    return result;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function computeJSCPID(value) {
  const payload = stableStringify(value);
  const digest = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
  return `jscpid_${digest}`;
}

module.exports = { canonicalize, stableStringify, computeJSCPID };
