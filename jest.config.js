module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/frontend/src", "<rootDir>/backend/tests"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"]
};
