import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"], // Apply only to TypeScript files
    languageOptions: {
      parserOptions: {
        project: true, // Ensure it uses the TypeScript project
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error", // ❌ Prevent 'any' types
      "@typescript-eslint/no-unused-vars": "error",  // ❌ Prevent unused variables
    },
  },
];

export default eslintConfig;
