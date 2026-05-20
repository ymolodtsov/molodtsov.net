import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const uploadsRoot = path.join(root, "static", "uploads");
const minBytes = Number(process.env.MIN_BYTES || 650 * 1024);
const maxPixels = Number(process.env.MAX_PIXELS || 2400);
const jpegQuality = Number(process.env.JPEG_QUALITY || 82);
const sips = process.env.SIPS || "/usr/bin/sips";
const force = process.env.FORCE_ORIGINAL_OPTIMIZE === "1";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.jpe?g$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

if (!fs.existsSync(sips)) {
  throw new Error(`sips not found at ${sips}`);
}

function dimensions(file) {
  const result = spawnSync(sips, ["-g", "pixelWidth", "-g", "pixelHeight", file], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`sips metadata failed for ${file}: ${result.stderr || result.stdout}`);
  }

  const width = Number(result.stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || 0);
  const height = Number(result.stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || 0);
  return { width, height };
}

let optimized = 0;
let skipped = 0;
let beforeBytes = 0;
let afterBytes = 0;

for (const file of walk(uploadsRoot)) {
  const before = fs.statSync(file).size;
  beforeBytes += before;

  if (before < minBytes) {
    skipped += 1;
    afterBytes += before;
    continue;
  }

  const { width, height } = dimensions(file);
  if (!force && Math.max(width, height) <= maxPixels) {
    skipped += 1;
    afterBytes += before;
    continue;
  }

  const result = spawnSync(
    sips,
    ["-Z", String(maxPixels), "-s", "format", "jpeg", "-s", "formatOptions", String(jpegQuality), file],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error(`sips failed for ${file}: ${result.stderr || result.stdout}`);
  }

  const after = fs.statSync(file).size;
  afterBytes += after;
  optimized += 1;
}

console.log(
  `upload originals: optimized ${optimized}, skipped ${skipped}, jpeg bytes ${Math.round(beforeBytes / 1024 / 1024)}MB -> ${Math.round(afterBytes / 1024 / 1024)}MB`,
);
