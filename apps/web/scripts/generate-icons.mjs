import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const logoPath = "public/logo.png";
const outDir = "public/icons";
const appDir = "src/app";

function renderIcon(size, paddingRatio = 0.1) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;

  return sharp(logoPath)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()
    .then((logo) =>
      sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite([{ input: logo, gravity: "center" }])
        .png(),
    );
}

await mkdir(outDir, { recursive: true });

const sizes = [
  { path: join(appDir, "icon.png"), size: 32 },
  { path: join(appDir, "apple-icon.png"), size: 180 },
  { path: join(outDir, "icon-192.png"), size: 192 },
  { path: join(outDir, "icon-512.png"), size: 512 },
];

for (const { path, size } of sizes) {
  await renderIcon(size).then((img) => img.toFile(path));
  console.log(`wrote ${path} (${size}x${size})`);
}

await renderIcon(32).then((img) => img.toFile(join(appDir, "favicon.ico")));
console.log(`wrote ${join(appDir, "favicon.ico")}`);

const svg = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
  '<rect width="512" height="512" fill="#fff"/>',
  '<image href="/icons/icon-512.png" width="512" height="512"/>',
  "</svg>",
].join("");
await Bun.write(join(outDir, "icon.svg"), svg);
console.log(`wrote ${join(outDir, "icon.svg")}`);
