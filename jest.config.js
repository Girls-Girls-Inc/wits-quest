module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/backend/tests", "<rootDir>/frontend/src"],
  collectCoverage: true,
  collectCoverageFrom: [
    "backend/**/*.js",
    "frontend/src/**/*.js",
    "!backend/tests/**",
    "!frontend/src/**/*.test.js"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"]
};

