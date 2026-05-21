import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import configPrettier from "eslint-config-prettier";
import importPluginX from "eslint-plugin-import-x";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

const rootDir = import.meta.dirname;

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.cjs",
      "commitlint.config.cjs",
      "eslint.config.js",
      "server/src/generated/**",
      "server/prisma/migrations/**",
      "package-lock.json",
      "pnpm-lock.yaml",
      ".env*",
    ],
  },
  {
    files: ["*.config.js", "*.config.ts", "server/**/*.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: null,
      },
    },
    rules: {
      "multiline-comment-style": "off",
    },
  },
  {
    files: ["server/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: "./server/tsconfig.json",
        tsconfigRootDir: rootDir,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
      "import-x": importPluginX,
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./server/tsconfig.json",
        },
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...configPrettier.rules,
      "no-console": "off",

      "prettier/prettier": "error",

      semi: ["error", "always"],
      "max-statements-per-line": ["error", { max: 1 }],

      camelcase: "off",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "forbid",
        },
        {
          selector: "variable",
          filter: { regex: "Schema$", match: true },
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "snake_case"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase"],
        },
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["UPPER_CASE", "camelCase", "snake_case"],
        },
        {
          selector: ["class", "interface", "typeAlias", "enum", "typeParameter"],
          format: ["PascalCase"],
        },
        {
          selector: ["property", "objectLiteralProperty", "typeProperty"],
          format: null,
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE", "PascalCase"],
        },
      ],

      "no-implicit-globals": "error",
      "no-undef": "off",

      "no-var": "error",
      "prefer-const": "error",
      "no-self-assign": "error",
      "@typescript-eslint/no-use-before-define": [
        "error",
        { variables: true, functions: false },
      ],

      "no-array-constructor": "error",
      "no-new-object": "error",
      "prefer-spread": "error",
      "object-shorthand": ["error", "always"],

      "prefer-destructuring": [
        "error",
        { object: true, array: false },
        { enforceForRenamedProperties: false },
      ],

      "prefer-template": "error",

      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      "no-proto": "error",
      "constructor-super": "error",
      "no-this-before-super": "error",
      "no-dupe-class-members": "error",
      "no-useless-constructor": "error",

      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[specifiers.0.type='ImportNamespaceSpecifier']",
          message: "Wildcard import (import * as ...)는 금지됩니다.",
        },
        {
          selector: "ExportNamedDeclaration[source]",
          message:
            "다른 모듈에서 가져온 요소를 직접 export 할 수 없습니다. import 후 별도로 export 하세요.",
        },
        {
          selector: "ExportAllDeclaration",
          message: "export * from '...' (Wildcard Export)는 금지됩니다.",
        },
      ],

      curly: ["error", "all"],
      "keyword-spacing": ["error", { before: true, after: true }],
      "no-fallthrough": "error",
      "default-case": "off",
      "default-case-last": "error",

      "valid-typeof": "error",
      eqeqeq: ["error", "always"],

      "no-unneeded-ternary": "error",
      "@typescript-eslint/strict-boolean-expressions": "warn",

      "no-else-return": ["error", { allowElseIf: false }],

      "guard-for-in": "error",
      "no-prototype-builtins": "error",

      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "no-loop-func": "error",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { vars: "all", args: "after-used", argsIgnorePattern: "^_" },
      ],

      "spaced-comment": [
        "error",
        "always",
        {
          line: { markers: ["/"], exceptions: ["-", "+"] },
          block: { markers: ["!"], exceptions: ["*"], balanced: true },
        },
      ],
      "multiline-comment-style": ["error", "starred-block"],

      "space-infix-ops": "error",
      "space-in-parens": ["error", "never"],
      "array-bracket-spacing": ["error", "never"],
      "object-curly-spacing": ["error", "always"],
      "comma-spacing": ["error", { before: false, after: true }],

      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "multiline-block-like",
          next: "multiline-block-like",
        },
        { blankLine: "always", prev: "case", next: "case" },
        { blankLine: "always", prev: "default", next: "case" },
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "any", prev: "directive", next: "return" },
        { blankLine: "any", prev: "expression", next: "return" },
      ],
    },
  },
];
