import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/**
 * Define tasks with the final DISPLAYED size
 * (taken from Lighthouse output: 45x45, 146x146, 131x131, etc.)
 */
const tasks = [
  {
    input: "src/assets/admin.png",
    output: "src/assets/admin.webp",
    resize: { width: 45, height: 45 }, // nav icon
  },
  {
    input: "src/assets/google-icon.png",
    output: "src/assets/google-icon.webp",
    resize: { width: 40, height: 40 }, // button icon
  },
  {
    input: "src/assets/home.png",
    output: "src/assets/home.webp",
    resize: { width: 45, height: 45 },
  },
  {
    input: "src/assets/leaderboard.png",
    output: "src/assets/leaderboard.webp",
    resize: { width: 45, height: 45 },
  },
  {
    input: "src/assets/Logo.png",
    output: "src/assets/Logo.webp",
    resize: { width: 146, height: 146 }, // dashboard card
  },
  {
    input: "src/assets/map.png",
    output: "src/assets/map.webp",
    resize: { width: 45, height: 45 },
  },
  {
    input: "src/assets/profile.png",
    output: "src/assets/profile.webp",
    resize: { width: 45, height: 45 },
  },
  {
    input: "src/assets/Signup.png",
    output: "src/assets/Signup.webp",
    resize: { width: 200 }, // keep larger if used in signup page
  },
  {
    input: "src/assets/Signup2.png",
    output: "src/assets/Signup2.webp",
    resize: { width: 200 },
  },
  {
    input: "src/assets/Signup3.png",
    output: "src/assets/Signup3.webp",
    resize: { width: 200 },
  },
];

const run = async () => {
  for (const task of tasks) {
    const inputPath = resolve(root, task.input);
    const outputPath = resolve(root, task.output);

    await sharp(inputPath)
      .resize(task.resize) // resize to displayed size
      .webp({ quality: 80, effort: 5 }) // compress
      .toFile(outputPath);

    const { width, height } = await sharp(outputPath).metadata();
    const { size } = await stat(outputPath);
    console.log(
      `${task.output} -> ${width || "?"}x${height || "?"} ${Math.round(size / 1024)} KiB`
    );
  }
};

run().catch((err) => {
  console.error("Image optimization failed", err);
  process.exitCode = 1;
});
