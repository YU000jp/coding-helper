#!/usr/bin/env node
"use strict";

const path = require("path");
const {
  createPack,
  updatePack,
  validatePack,
  buildOutput,
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
      case "build":
        await buildOutput(parseCliArgs(args));
        break;
      case "pack":
        await packSelection(parseCliArgs(args));
        break;
      case "help":
      case "--help":
      case "-h":
        printHelp();
        process.exitCode = 0;
        break;
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
    root: null,
    out: null,
    name: null,
    purpose: null,
    title: null,
    summary: null,
    helperId: null,
    helperPurpose: null,
    content: null,
    tags: [],
    references: [],
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
      case "--helper-id":
        result.helperId = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--helper-purpose":
        result.helperPurpose = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--content":
        result.content = nextValue;
        if (!inlineValue) index += 1;
        break;
      case "--tags":
        result.tags = splitList(nextValue);
        if (!inlineValue) index += 1;
        break;
      case "--references":
        result.references = splitList(nextValue);
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
      "skillpack-helper <command> [options]",
      "",
      "Commands:",
      "  create    Scaffold a new helper pack",
      "  update    Regenerate SKILL.md from the manifest",
      "  validate  Validate one helper pack or a pack root",
      "  build     Build a bundle output",
      "  pack      Emit a selected bundle",
      "",
      "Options:",
      "  --root <dir>",
      "  --out <path>",
      "  --name <pack-name>",
      "  --purpose <text>",
      "  --title <helper-title>",
      "  --summary <pack-summary>",
      "  --helper-id <helper-id>",
      "  --helper-purpose <text>",
      "  --content <text>",
      "  --tags <tag[,tag...]>",
      "  --references <ref[,ref...]>",
      "  --depends-on <pack[,pack...]>",
      "  --force",
    ].join("\n")
  );
}

if (require.main === module) {
  main();
}

module.exports = { main, parseCliArgs };
