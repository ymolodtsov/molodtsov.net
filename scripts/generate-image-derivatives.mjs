import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const uploadsRoot = path.join(root, "static", "uploads");
const generatedRoot = path.join(root, "static", "generated", "uploads");
const cwebp = process.env.CWEBP || "/opt/homebrew/bin/cwebp";
const sourceExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
let sharp = null;

try {
  sharp = (await import("sharp")).default;
} catch {
  sharp = null;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

function outputPath(source, suffix) {
  const relative = path.relative(uploadsRoot, source);
  const parsed = path.parse(relative);
  return path.join(generatedRoot, parsed.dir, `${parsed.name}-${suffix}.webp`);
}

function isFresh(source, output) {
  if (!fs.existsSync(output)) {
    return false;
  }

  return fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs;
}

async function convert(source, output, width, quality) {
  if (isFresh(source, output)) {
    return { skipped: true };
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });

  if (sharp) {
    await sharp(source, { animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(output);
    return { skipped: false };
  }

  if (!fs.existsSync(cwebp)) {
    throw new Error("Install sharp with `npm install`, or set CWEBP to a local cwebp binary.");
  }

  const result = spawnSync(
    cwebp,
    ["-quiet", "-q", String(quality), "-resize", String(width), "0", source, "-o", output],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(`cwebp failed for ${source}: ${result.stderr || result.stdout}`);
  }

  return { skipped: false };
}

let created = 0;
let skipped = 0;

for (const source of walk(uploadsRoot)) {
  for (const derivative of [
    { suffix: "thumb", width: 480, quality: 72 },
    { suffix: "inline", width: 1600, quality: 80 },
  ]) {
    const result = await convert(source, outputPath(source, derivative.suffix), derivative.width, derivative.quality);
    if (result.skipped) {
      skipped += 1;
    } else {
      created += 1;
    }
  }
}

console.log(`image derivatives: created ${created}, skipped ${skipped}`);
