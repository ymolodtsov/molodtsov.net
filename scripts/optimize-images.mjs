#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  "scripts/optimize-upload-originals.mjs",
  "scripts/generate-image-derivatives.mjs",
  "scripts/rewrite-raw-upload-img-srcs.mjs",
];

for (const step of steps) {
  const result = spawnSync(process.execPath, [step], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
