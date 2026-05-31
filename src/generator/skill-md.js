"use strict";

function renderSkillMarkdown(manifest) {
  const lines = [];
  lines.push(`# ${manifest.name}`);
  if (manifest.summary) {
    lines.push("");
    lines.push(manifest.summary);
  }
  if (manifest.purpose) {
    lines.push("");
    lines.push("## Purpose");
    lines.push(manifest.purpose);
  }
  lines.push("");
  lines.push("## Pack Metadata");
  lines.push(`- JSCPID: ${manifest.jscpid}`);
  lines.push(`- dependsOn: ${manifest.dependsOn.length > 0 ? manifest.dependsOn.join(", ") : "none"}`);
  lines.push("");
  lines.push("## Contracts");
  lines.push(renderList(manifest.skills.flatMap((skill) => skill.contracts), "No contracts defined."));
  lines.push("");
  lines.push("## Guarantees");
  lines.push(renderList(manifest.skills.flatMap((skill) => skill.guarantees), "No guarantees defined."));
  lines.push("");
  lines.push("## Usage Patterns");
  lines.push(renderList(manifest.skills.flatMap((skill) => skill.usagePatterns), "No usage patterns defined."));
  lines.push("");
  lines.push("## Skills");
  for (const skill of manifest.skills) {
    lines.push(`### ${skill.title}`);
    lines.push(`- id: ${skill.id}`);
    lines.push(`- JSCPID: ${skill.jscpid}`);
    if (skill.summary) lines.push(`- summary: ${skill.summary}`);
    if (skill.purpose) lines.push(`- purpose: ${skill.purpose}`);
    lines.push(`- ts: ${formatLinks(skill.implementations.ts)}`);
    lines.push(`- rust: ${formatLinks(skill.implementations.rust)}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function renderList(items, fallback) {
  const unique = Array.from(new Set(items.filter(Boolean)));
  if (unique.length === 0) {
    return `- ${fallback}`;
  }
  return unique.map((item) => `- ${item}`).join("\n");
}

function formatLinks(links) {
  return links.length > 0 ? links.join(", ") : "none";
}

module.exports = { renderSkillMarkdown };
