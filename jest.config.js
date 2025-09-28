// jest.config.js (project root)
module.exports = {
  testEnvironment: "jsdom",

  roots: ["<rootDir>/frontend/src", "<rootDir>/backend"],

  // run the root setup file that orchestrates other setup tasks
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // force single react copy + map styles & assets
  moduleNameMapper: {
    "^react$": "<rootDir>/frontend/node_modules/react",
    "^react-dom$": "<rootDir>/frontend/node_modules/react-dom",
    "^react/jsx-runtime$": "<rootDir>/frontend/node_modules/react/jsx-runtime",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(png|jpe?g|gif|svg|webp)$": "<rootDir>/frontend/src/tests/__mocks__/fileMock.js"
  },

  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },

  // transpile react-router-dom if necessary; extend if other node_modules need transpiling
  transformIgnorePatterns: [
    "/node_modules/", "\\.(css)$"
  ],

  moduleFileExtensions: ["js", "jsx", "json"],

  collectCoverage: true,
  collectCoverageFrom: [
    // Be very specific about what to include
    "backend/controllers/**/*.js",
    "backend/middleware/**/*.js", 
    "backend/models/**/*.js",
    "backend/routes/**/*.js",
    "backend/supabase/**/*.js",
    "frontend/src/components/**/*.{js,jsx}",
    "frontend/src/pages/**/*.{js,jsx}",
    // Exclude all test files
    "!**/*.test.{js,jsx}",
    "!**/*.spec.{js,jsx}",
    "!**/tests/**",
    "!**/__tests__/**",
    // Exclude specific problem files
    "!frontend/src/main.jsx",
    "!frontend/src/lib/env.js", 
    "!frontend/src/supabase/supabaseClient.js"
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov"],

  verbose: true
};