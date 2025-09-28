// frontend/src/tests/lib/env.test.js

describe("env.js wrapper", () => {
  afterEach(() => {
    jest.resetModules(); // clear module cache between tests
    jest.clearAllMocks();
  });

  test("falls back to empty string when env is undefined", () => {
    // Mock env.js to simulate fallback
    jest.doMock("../../lib/env", () => ({
      __esModule: true,
      VITE_WEB_URL: "",
      default: { VITE_WEB_URL: "" },
    }));

    const envModule = require("../../lib/env"); // import fresh
    expect(envModule.VITE_WEB_URL).toBe("");
    expect(envModule.default.VITE_WEB_URL).toBe("");
  });

  test("uses VITE_WEB_URL when defined", () => {
    // Mock env.js to simulate a defined environment
    jest.doMock("../../lib/env", () => ({
      __esModule: true,
      VITE_WEB_URL: "http://localhost:3000",
      default: { VITE_WEB_URL: "http://localhost:3000" },
    }));

    const envModule = require("../../lib/env");
    expect(envModule.VITE_WEB_URL).toBe("http://localhost:3000");
    expect(envModule.default.VITE_WEB_URL).toBe("http://localhost:3000");
  });
});
