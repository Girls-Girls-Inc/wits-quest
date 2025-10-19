const path = require("path");

try {
  require(path.resolve(__dirname, "frontend", "jest.setup.js"));
} catch (err) {
}

try {
  require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });
} catch { }

try { jest.mock("./frontend/src/styles/button.css", () => ({})); } catch (e) { }
try { jest.mock("./frontend/src/styles/navbar.css", () => ({})); } catch (e) { }
try { jest.mock("./frontend/src/assets/Logo.webp", () => "Logo.webp"); } catch (e) { }

// 3) Mock the env wrapper so tests never need to parse import.meta
try {
  const envModulePath = path.resolve(__dirname, "frontend", "src", "lib", "env.js");
  try {
    // Only mock if file exists
    require.resolve(envModulePath);
    jest.mock(envModulePath, () => ({
      __esModule: true,
      VITE_WEB_URL: "http://localhost:3000",
      default: { VITE_WEB_URL: "http://localhost:3000" },
    }));
  } catch (e) {
    // env module not present yet - ignore
  }
} catch (e) {
  // ignore any unexpected errors
}

// 4) Dynamically mock frontend page modules that may contain Vite-specific syntax
//    IMPORTANT: do NOT include pages you will test directly (e.g. passwordResetRequest)
const pagesToTry = [
  //"adminDashboard",
  "editProfile",
  "leaderboard",
  "map",
  // passwordResetRequest intentionally excluded so tests can import the real component
  "quests",
  "settings",
  // add other page basenames if needed (avoid ones you test directly)
];

pagesToTry.forEach((name) => {
  const candidates = [
    path.resolve(__dirname, "frontend", "src", "pages", `${name}.jsx`),
    path.resolve(__dirname, "frontend", "src", "pages", `${name}.js`),
  ];
  for (const candidate of candidates) {
    try {
      require.resolve(candidate);
      jest.mock(candidate, () => ({ __esModule: true, default: () => null }));
      break;
    } catch (err) {
      // not present, try next
    }
  }
});
