#!/usr/bin/env node
/**
 * Fail if em dash (U+2014) appears in user-facing TS/TSX outside admin and code comments.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const APP_ROOT = new URL("..", import.meta.url).pathname;
const WIDGET_ROOT = join(APP_ROOT, "..", "widget", "src");

const SCAN_ROOTS = [
  join(APP_ROOT, "app", "(dashboard)"),
  join(APP_ROOT, "app", "(marketing)"),
  join(APP_ROOT, "app", "(onboarding)"),
  join(APP_ROOT, "components"),
  join(APP_ROOT, "lib", "marketing"),
  join(APP_ROOT, "lib", "plan-entitlements.ts"),
  join(APP_ROOT, "lib", "brand-chrome.ts"),
  WIDGET_ROOT,
];

const SKIP_DIR_PARTS = [`${join("components", "admin")}`];

function isCommentLine(line) {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/**") ||
    t.startsWith("*/") ||
    t.startsWith("{/*") ||
    t.startsWith("/*")
  );
}

function shouldSkipPath(absPath) {
  return SKIP_DIR_PARTS.some((part) => absPath.includes(part));
}

function collectFiles(target, out = []) {
  if (target.endsWith(".ts") || target.endsWith(".tsx")) {
    if (!shouldSkipPath(target)) out.push(target);
    return out;
  }
  let st;
  try {
    st = statSync(target);
  } catch {
    return out;
  }
  if (!st.isDirectory()) return out;
  if (shouldSkipPath(target)) return out;
  for (const name of readdirSync(target)) {
    if (name === "node_modules" || name === ".next") continue;
    collectFiles(join(target, name), out);
  }
  return out;
}

const EM_DASH = "\u2014";
const violations = [];

for (const root of SCAN_ROOTS) {
  for (const file of collectFiles(root)) {
    const rel = relative(join(APP_ROOT, ".."), file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, idx) => {
      if (line.includes(EM_DASH) && !isCommentLine(line)) {
        violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Em dash found in user-facing copy (use comma, period, or hyphen instead):\n");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("OK: no em dash in user-facing copy paths.");
