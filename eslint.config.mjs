import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*-client.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/lib/admin-access", "**/admin-access"], message: "Read the server-provided role instead of importing the administrator email policy into browser components." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".tmp-*/**",
    ".tmp-*",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
