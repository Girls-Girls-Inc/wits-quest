// jest.config.js
export default {
  testEnvironment: "jsdom",

  roots: ["<rootDir>/backend/tests", "<rootDir>/frontend/src"],

  // ---------- Coverage ----------
  collectCoverage: true,
  collectCoverageFrom: [
    "frontend/src/**/*.{js,jsx,ts,tsx}", // frontend code
    "backend/**/*.{js,ts}",              // backend code
    "!backend/tests/**",                 // ignore test files
    "!backend/config.js",                // ignore config
    "!frontend/src/**/*.test.{js,jsx,ts,tsx}", // ignore test files
    "!frontend/src/context/**",          // ignore React context
    "!frontend/src/redux/**",            // ignore Redux store
    "!frontend/src/App.jsx",             // ignore entry
    "!frontend/src/main.jsx",            // ignore entry
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov"],

  // Optional: enforce minimum coverage (adjust if needed)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },

  // ---------- Transforms ----------
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },

  // Optional: ignore transforming most node_modules, allow ESM packages
  transformIgnorePatterns: [
    "node_modules/(?!some-esm-package)",
    "\\.css$", // ignore raw CSS files
  ],

  // ---------- Module Resolution ----------
  moduleDirectories: ["node_modules", "frontend/src"],
  moduleNameMapper: {
    "^react$": "<rootDir>/frontend/node_modules/react",
    "^react-dom$": "<rootDir>/frontend/node_modules/react-dom",
    "^react/jsx-runtime$": "<rootDir>/frontend/node_modules/react/jsx-runtime",
    "\\.css$": "identity-obj-proxy",
    "\\.(png|jpe?g|gif|svg|webp)$": "<rootDir>/frontend/src/tests/__mocks__/fileMock.js",
  },

  // ---------- Setup ----------
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // ---------- Verbosity ----------
  verbose: true,
};
