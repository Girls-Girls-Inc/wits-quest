export default {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  moduleFileExtensions: ["js", "jsx", "json", "node"],
  roots: ["<rootDir>/src"], // only look at frontend/src
  //setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"], // optional if you want RTL setup
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/main.jsx", // skip Vite entrypoint
    "!src/**/*.test.{js,jsx}"
  ],
};
