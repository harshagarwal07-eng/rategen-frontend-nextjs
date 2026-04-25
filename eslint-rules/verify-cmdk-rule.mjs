/**
 * Quick smoke-test for the cmdk-explicit-filter rule.
 * Run: node eslint-rules/verify-cmdk-rule.mjs
 */

import { Linter } from "eslint";
import rule from "./cmdk-explicit-filter.mjs";

const linter = new Linter({ configType: "flat" });

const config = [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { local: { rules: { "cmdk-explicit-filter": rule } } },
    rules: { "local/cmdk-explicit-filter": "error" },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
];

// --- CASE 1: should fire (no shouldFilter prop) ---
const broken = `
function A() {
  return (
    <Command>
      <CommandInput placeholder="Search…" />
      <CommandList>
        <CommandItem>Hello</CommandItem>
      </CommandList>
    </Command>
  );
}
`;

// --- CASE 2: should NOT fire (shouldFilter={false}) ---
const fixed = `
function B() {
  return (
    <Command shouldFilter={false}>
      <CommandInput placeholder="Search…" />
      <CommandList>
        <CommandItem>Hello</CommandItem>
      </CommandList>
    </Command>
  );
}
`;

// --- CASE 3: should NOT fire (no CommandInput → not searchable) ---
const noInput = `
function C() {
  return (
    <Command>
      <CommandList>
        <CommandItem>Hello</CommandItem>
      </CommandList>
    </Command>
  );
}
`;

// --- CASE 4: should NOT fire (shouldFilter={true} explicit) ---
const explicitTrue = `
function D() {
  return (
    <Command shouldFilter={true}>
      <CommandInput placeholder="Search…" />
      <CommandList>
        <CommandItem>Hello</CommandItem>
      </CommandList>
    </Command>
  );
}
`;

const run = (label, code, expectErrors) => {
  const messages = linter.verify(code, config, { filename: "test.jsx" });
  const errors = messages.filter((m) => m.ruleId === "local/cmdk-explicit-filter");
  const pass = expectErrors ? errors.length > 0 : errors.length === 0;
  const status = pass ? "PASS" : "FAIL";
  console.log(`${status}  ${label}`);
  if (!pass) {
    console.log("       Expected errors:", expectErrors, " Got:", errors.length);
    if (errors.length) console.log("       Messages:", errors.map((e) => e.message));
  } else if (errors.length > 0) {
    console.log("       Rule fired:", errors[0].message.slice(0, 80) + "…");
  }
  return pass;
};

const results = [
  run("broken: <Command> + <CommandInput> + no shouldFilter  → error expected", broken, true),
  run("safe:   shouldFilter={false}                          → no error", fixed, false),
  run("safe:   no <CommandInput> in tree                    → no error", noInput, false),
  run("safe:   shouldFilter={true} explicit                 → no error", explicitTrue, false),
];

const allPass = results.every(Boolean);
console.log(`\n${allPass ? "All tests passed ✓" : "Some tests FAILED ✗"}`);
process.exit(allPass ? 0 : 1);
