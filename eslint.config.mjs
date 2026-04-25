import { createRequire } from "module";
import cmdkExplicitFilter from "./eslint-rules/cmdk-explicit-filter.mjs";

// eslint-config-next ships native flat config arrays — no FlatCompat needed.
const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const localPlugin = {
  rules: {
    "cmdk-explicit-filter": cmdkExplicitFilter,
  },
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { local: localPlugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "local/cmdk-explicit-filter": "error",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
