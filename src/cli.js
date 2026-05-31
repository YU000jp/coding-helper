#!/usr/bin/env node
"use strict";

const path = require("path");
const {
  createPack,
  updatePack,
  validatePack,
  listPacks,
  buildOutput,
  explainPack,
  packSelection,
} = require("./cli/index");

async function main(argv = process.argv.slice(2)) {
  const command = argv[0];
  const args = argv.slice(1);

  try {
    switch (command) {
      case "create":
        await createPack(parseCliArgs(args));
        break;
      case "update":
        await updatePack(parseCliArgs(args));
        break;
      case "validate":
        await validatePack(parseCliArgs(args));
        break;
      case "list":
        await listPacks(parseCliArgs(args));
        break;
      case "build":
        await buildOutput(parseCliArgs(args));
        break;
      case "pack":
        await packSelection(parseCliArgs(args));
        break;
      case "explain":
        await explainPack(parseCliArgs(args));
        break;
      case "help":
      case "--help":
      case "-h":
      default:
        printHelp();
        process.exitCode = command ? 1 : 0;
        break;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function parseCliArgs(argv) {
  const result = {
    _: [],
    root: process.cwd(),
    out: null,
    name: null,
    purpose: null,
    title: null,
    summary: null,
    skillId: null,
    ts: [],
    rust: [],
    dependsOn: [],
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      result._.push(value);
      continue;
    }

    const [flag, inlineValue] = value.split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];

    switch (flag) {
      case "--root":
        result.root = normalizePath(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--out":
        result.out = normalizePath(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--name":
        result.name = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--purpose":
        result.purpose = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--title":
        result.title = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--summary":
        result.summary = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--skill-id":
        result.skillId = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--ts":
        result.ts = splitList(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--rust":
        result.rust = splitList(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--depends-on":
        result.dependsOn = splitList(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--force":
        result.force = true;
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  return result;
}

function splitList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePath(value) {
  return path.resolve(process.cwd(), value);
}

function printHelp() {
  console.log(
    [
      "coding-helper <command> [options]",
      "",
      "Commands:",
      "  create    Scaffold a new skill pack",
      "  update    Regenerate SKILL.md from the manifest",
      "  validate  Validate one pack or a pack root",
      "  list      List discovered packs",
      "  build     Build a bundle output",
      "  pack      Emit a selected bundle",
      "  explain   Show pack details",
      "",
      "Options:",
      "  --root <dir>",
      "  --out <path>",
      "  --name <pack-name>",
      "  --purpose <text>",
      "  --title <skill-title>",
      "  --summary <skill-summary>",
      "  --skill-id <skill-id>",
      "  --ts <path[,path...]>",
      "  --rust <path[,path...]>",
      "  --depends-on <pack[,pack...]>",
      "  --force",
    ].join("\n")
  );
}

if (require.main === module) {
  main();
}

module.exports = { main, parseCliArgs };
