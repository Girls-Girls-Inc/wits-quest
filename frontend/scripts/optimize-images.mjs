import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const tasks = [
  {
    input: "src/assets/google-icon.png",
    output: "src/assets/google-icon.webp",
    resize: { width: 40 },
    webp: { quality: 85, effort: 5 },
  },
  {
    input: "src/assets/Logo.png",
    output: "src/assets/Logo.webp",
    resize: { width: 400 },
    webp: { quality: 80, effort: 5 },
  },
];

const run = async () => {
  for (const task of tasks) {
    const inputPath = resolve(root, task.input);
    const outputPath = resolve(root, task.output);

    await sharp(inputPath)
      .resize(task.resize)
      .webp(task.webp)
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