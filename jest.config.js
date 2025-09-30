// jest.config.js (project root)
module.exports = {
  testEnvironment: "jsdom",

  roots: ["<rootDir>/frontend/src", "<rootDir>/backend"],

  // run the root setup file that orchestrates other setup tasks
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  
  // Add global setup for environment variables
  setupFiles: ["<rootDir>/jest.env.setup.js"],

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
    "/node_modules/",
  ],

  moduleFileExtensions: ["js", "jsx", "json"],

  collectCoverage: true,
  collectCoverageFrom: [
    // Only include specific directories we want measured
    "backend/controllers/*.js",
    "backend/middleware/*.js", 
    "backend/models/*.js",
    "backend/routes/*.js",
    "backend/supabase/*.js",
    "frontend/src/components/**/*.{js,jsx}",
    "frontend/src/pages/**/*.{js,jsx}",
    "frontend/src/*.{js,jsx}",
    // Explicitly exclude problematic files
    "!frontend/src/main.jsx",
    "!frontend/src/lib/env.js", 
    "!frontend/src/supabase/supabaseClient.js",
    "!**/*.test.{js,jsx}",
    "!**/*.spec.{js,jsx}",
    "!**/tests/**",
    "!**/__tests__/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/coverage/"
  ],

  verbose: true
};