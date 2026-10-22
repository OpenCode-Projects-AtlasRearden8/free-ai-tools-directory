#!/usr/bin/env node
/**
 * build-data.js — regenerate data/tools.js from data/tools.json.
 *
 * data/tools.json is the single source of truth for this directory.
 * data/tools.js is a generated offline mirror so the page still works
 * when someone opens index.html directly from disk (file://), where
 * fetch() is blocked by browsers. Run this after every edit to tools.json:
 *
 *   node scripts/build-data.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "data", "tools.json");
const jsPath = path.join(root, "data", "tools.js");

function main() {
  const raw = fs.readFileSync(jsonPath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("data/tools.json is not valid JSON: " + err.message);
    process.exit(1);
  }
  if (!data || !Array.isArray(data.tools)) {
    console.error("data/tools.json must contain a 'tools' array.");
    process.exit(1);
  }

  const banner = [
    "/**",
    " * GENERATED FILE — do not edit by hand.",
    " * Source of truth: data/tools.json",
    " * Regenerate with: node scripts/build-data.js",
    " */",
    ""
  ].join("\n");

  fs.writeFileSync(
    jsPath,
    banner + "window.FREE_AI_TOOLS_FULL = " + JSON.stringify(data, null, 2) + ";\n",
    "utf8"
  );
  console.log("Wrote data/tools.js (" + data.tools.length + " tools).");
}

main();
