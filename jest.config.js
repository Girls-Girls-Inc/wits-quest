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
  transformIgnorePatterns: ["node_modules/(?!(react-router|react-router-dom)/)"],

  moduleFileExtensions: ["js", "jsx", "json"],

  collectCoverage: true,
  collectCoverageFrom: [
    "backend/**/*.js",
    "frontend/src/**/*.{js,jsx}",
    "!backend/tests/**",
    "!frontend/src/**/*.test.{js,jsx}"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],

  verbose: true
};
