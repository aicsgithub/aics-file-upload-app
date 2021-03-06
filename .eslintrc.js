module.exports = {
  root: true,
  env: {
    "browser": true,
    "node": true,
    "mocha": true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "import", "no-only-tests"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier/@typescript-eslint",
    "prettier/react",
    "plugin:prettier/recommended",
    "plugin:@fintechstudios/chai-as-promised/recommended"
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "import/order": ["error", {
      "alphabetize": {
        order: "asc",
        caseInsensitive: true
      },
      "newlines-between": "always",
      "groups": ["builtin", "external", "parent", "sibling", "index"],
    }],
    "eqeqeq": ["error", "always"],
    "react-hooks/exhaustive-deps": "error",
    "no-only-tests/no-only-tests": "error",
  },
};
