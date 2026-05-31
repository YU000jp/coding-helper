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
  lines.push(`- helper count: ${manifest.helpers.length}`);
  lines.push("");
  lines.push("## Helper Dictionary");
  for (const helper of manifest.helpers) {
    lines.push(`### ${helper.title}`);
    lines.push(`- id: ${helper.id}`);
    lines.push(`- JSCPID: ${helper.jscpid}`);
    if (helper.purpose) {
      lines.push(`- purpose: ${helper.purpose}`);
    }
    lines.push(`- tags: ${formatList(helper.tags)}`);
    lines.push(`- references: ${formatList(helper.references)}`);
    lines.push("");
    lines.push("#### Content");
    lines.push(renderIndentedBlock(helper.content));
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function formatList(items) {
  return items.length > 0 ? items.join(", ") : "none";
}

function renderIndentedBlock(content) {
  const lines = String(content || "").split("\n");
  return lines.map((line) => `    ${line}`).join("\n");
}

module.exports = { renderSkillMarkdown };
