module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: ["babel-plugin-transform-vite-meta-env"],
  // or "babel-plugin-transform-import-meta" if you prefer that one
};
