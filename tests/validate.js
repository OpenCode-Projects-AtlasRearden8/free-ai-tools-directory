#!/usr/bin/env node
/**
 * validate.js — automated checks for this directory.
 *
 * Validates:
 *   1. data/tools.json parses and every tool has the required fields,
 *      valid URLs, sane dates, and an allowed category.
 *   2. No affiliate-style or tracking parameters in any link.
 *   3. data/tools.js exists and exactly mirrors data/tools.json
 *      (the offline fallback the page loads on file://).
 *   4. index.html references the real files and every card field
 *      the UI renders is covered by the data.
 *
 * Run:  node tests/validate.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks++;
  if (!condition) {
    failures.push(message);
  }
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

// ---------- 1. tools.json structure ----------
let data;
try {
  data = readJson("data/tools.json");
  checks++;
} catch (err) {
  failures.push("data/tools.json does not parse as JSON: " + err.message);
  report();
  return;
}

check(Array.isArray(data.tools) && data.tools.length > 0, "data/tools.json must contain a non-empty 'tools' array");
check(data.meta && typeof data.meta.updatedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.meta.updatedOn), "data/meta.updatedOn must be an ISO date (YYYY-MM-DD)");
check(typeof (data.meta && data.meta.maintainer) === "string" && data.meta.maintainer.length > 0, "data/meta.maintainer must be a non-empty string");

const VALID_CATEGORIES = ["chat", "image", "writing", "study", "voice"];
const REQUIRED_FIELDS = [
  "id", "name", "category", "url", "whatItDoes", "actuallyFree",
  "access", "limits", "verifiedFreeOn", "recheckDate"
];
const AFFILIATE_PATTERNS = [/[?&]aff(iliate)?[=_]/i, /[?&]ref(er)?[=_]/i, /[?&]utm_/i, /[?&]partner[=_]/i, /[?&]tag[=_]\w/i];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const seenIds = new Set();
const seenUrls = new Set();
const seenNames = new Set();

for (const tool of data.tools) {
  const where = "tool '" + (tool.id || tool.name || JSON.stringify(tool).slice(0, 40)) + "'";

  for (const field of REQUIRED_FIELDS) {
    check(
      Object.prototype.hasOwnProperty.call(tool, field) && typeof tool[field] === "string" && tool[field].length > 0,
      where + " is missing required field '" + field + "' (or it is empty)"
    );
  }

  check(seenIds.has(tool.id) === false, where + " has a duplicate id");
  if (tool.id) seenIds.add(tool.id);

  check(seenNames.has(tool.name) === false, where + " has a duplicate name");
  if (tool.name) seenNames.add(tool.name);

  check(seenUrls.has(tool.url) === false, where + " has a duplicate url");
  if (tool.url) seenUrls.add(tool.url);

  check(
    !!tool.url && /^https:\/\/[^\s"']+$/.test(tool.url),
    where + " url must be a single-line https:// link (got: " + JSON.stringify(tool.url) + ")"
  );

  check(
    VALID_CATEGORIES.indexOf(tool.category) !== -1,
    where + " category must be one of " + VALID_CATEGORIES.join(", ") + " (got: " + tool.category + ")"
  );

  check(
    ["browser", "local"].indexOf(tool.access) !== -1,
    where + " access must be 'browser' or 'local' (got: " + tool.access + ")"
  );

  check(
    !!tool.verifiedFreeOn && ISO_DATE.test(tool.verifiedFreeOn) && !Number.isNaN(Date.parse(tool.verifiedFreeOn)),
    where + " verifiedFreeOn must be a real ISO date (got: " + tool.verifiedFreeOn + ")"
  );

  check(
    !!tool.recheckDate && ISO_DATE.test(tool.recheckDate) && !Number.isNaN(Date.parse(tool.recheckDate)),
    where + " recheckDate must be a real ISO date (got: " + tool.recheckDate + ")"
  );

  if (ISO_DATE.test(tool.verifiedFreeOn || "") && ISO_DATE.test(tool.recheckDate || "")) {
    check(
      Date.parse(tool.recheckDate) > Date.parse(tool.verifiedFreeOn),
      where + " recheckDate must be later than verifiedFreeOn"
    );
    check(
      Date.parse(tool.recheckDate) > Date.parse(data.meta.updatedOn) - 1,
      where + " recheckDate should not be in the past relative to meta.updatedOn"
    );
  }

  check(
    typeof tool.actuallyFree === "string" && tool.actuallyFree.length >= 10,
    where + " 'actuallyFree' should describe what is actually free (too short to be honest)"
  );

  check(
    typeof tool.limits === "string" && tool.limits.length >= 10,
    where + " 'limits' should describe the honest limits (too short to be honest)"
  );

  if (typeof tool.url === "string") {
    for (const pattern of AFFILIATE_PATTERNS) {
      check(!pattern.test(tool.url), where + " url looks like an affiliate/tracking link: " + tool.url);
    }
    check(!/\bhttp:\/\//.test(tool.url), where + " url must use https, not http: " + tool.url);
  }
}

// ---------- 2. offline mirror data/tools.js ----------
check(fs.existsSync(path.join(root, "data", "tools.js")), "data/tools.js (offline mirror) is missing — run: node scripts/build-data.js");
if (fs.existsSync(path.join(root, "data", "tools.js"))) {
  const js = fs.readFileSync(path.join(root, "data", "tools.js"), "utf8");
  let mirror = null;
  try {
    const start = js.indexOf("window.FREE_AI_TOOLS_FULL = ") + "window.FREE_AI_TOOLS_FULL = ".length;
    mirror = JSON.parse(js.slice(start, js.lastIndexOf(";")));
    checks++;
  } catch (err) {
    failures.push("data/tools.js does not contain parseable JSON after 'window.FREE_AI_TOOLS_FULL = '");
  }
  if (mirror) {
    check(
      JSON.stringify(mirror) === JSON.stringify(data),
      "data/tools.js is out of sync with data/tools.json — run: node scripts/build-data.js"
    );
  }
}

// ---------- 3. page references ----------
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const ref of ["css/style.css", "js/app.js", "data/tools.js"]) {
  check(html.indexOf(ref) !== -1, "index.html should reference " + ref);
}
check(
  /rel\s*=\s*["']noopener/i.test(html) === false || /target="_blank"[^>]*rel="noopener[^"]*"/.test(html),
  "all target=_blank links inside index.html template should keep rel=noopener"
);
check(html.indexOf("affiliate") !== -1, "index.html should mention the no-affiliate policy");
check(html.indexOf("medical advice") !== -1, "index.html should carry the not-medical-advice disclaimer");

// app.js must render every card field it promises
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
for (const field of ["whatItDoes", "actuallyFree", "limits", "verifiedFreeOn", "recheckDate", "access"]) {
  check(app.indexOf(field) !== -1, "js/app.js should use the '" + field + "' field when rendering cards");
}

// ---------- 4. integrity: no secrets / personal data ----------
const fileList = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules"].indexOf(entry.name) !== -1) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else fileList.push(full);
  }
})(root);
const SECRET = new RegExp([
  "sk-[A-Za-z0-9_-]{20,}",                       // OpenAI-style
  "gh[pousr]_[A-Za-z0-9]{20,}",                  // GitHub tokens
  "(?:AKIA|ASIA)[0-9A-Z]{16}",                   // AWS access keys
  "AIza[0-9A-Za-z_-]{30,}",                      // Google API keys
  "xox[baprs]-[A-Za-z0-9-]{10,}",                // Slack tokens
  "Bearer [A-Za-z0-9_-]{20,}",                   // bearer tokens in code
  "\\b(?:key|token|password|secret)\\s*[:=]\\s*[\"'][A-Za-z0-9_-]{16,}[\"']"
].join("|"), "i");
for (const file of fileList) {
  // Skip our own validation code: it contains the pattern itself, not a secret.
  if (path.resolve(file) === path.resolve(__filename)) continue;
  const text = fs.readFileSync(file, "utf8");
  check(!SECRET.test(text), file.replace(root + path.sep, "") + " looks like it contains a secret or API key");
}

// ---------- report ----------
function report() {
  if (failures.length) {
    console.error("FAILED: " + failures.length + " of " + checks + " checks did not pass:");
    failures.forEach(function (f) {
      console.error("  - " + f);
    });
    process.exit(1);
  }
  console.log("PASSED: all " + checks + " checks OK.");
  console.log("Tools: " + data.tools.length + " | Categories: " + VALID_CATEGORIES.join(", "));
}

report();
