module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/backend/tests", "<rootDir>/frontend/src"],

  collectCoverage: true,
  collectCoverageFrom: [
    "backend/**/*.js",
    "frontend/src/**/*.{js,jsx}",
    "!backend/tests/**",
    "!frontend/src/**/*.test.{js,jsx}"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],

  // ensure JSX/TSX is transpiled
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },

  // 👇 force a single React copy everywhere + stub CSS/assets
  moduleNameMapper: {
    "^react$": "<rootDir>/frontend/node_modules/react",
    "^react-dom$": "<rootDir>/frontend/node_modules/react-dom",
    "^react/jsx-runtime$": "<rootDir>/frontend/node_modules/react/jsx-runtime",
    "\\.css$": "identity-obj-proxy",
    "\\.(png|jpe?g|gif|svg|webp)$": "<rootDir>/frontend/src/tests/__mocks__/fileMock.js"
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
