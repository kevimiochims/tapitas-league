import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Nome usado sem existir (ex.: variável apagada e esquecida no JSX) quebra a
  // página só na hora do clique; aqui ele vira erro antes de subir
  {
    files: ["app/**/*.js"],
    ignores: ["app/**/* copy*.js", "app/**/*_black.js"],
    languageOptions: { globals: { process: "readonly" } },
    rules: { "no-undef": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
