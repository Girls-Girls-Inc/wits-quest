export default {
  testEnvironment: "jsdom",

  roots: ["<rootDir>/src"],
  testMatch: ["<rootDir>/src/**/*.test.{js,jsx}"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(png|jpe?g|gif|svg|webp)$": "<rootDir>/src/__mocks__/fileMock.js",
  },

  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },

  transformIgnorePatterns: ["node_modules/(?!(react-router|react-router-dom)/)"],

  moduleFileExtensions: ["js", "jsx", "json"],

  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!src/main.jsx",
    "!src/tests/**",
  ],

  verbose: true,
};
