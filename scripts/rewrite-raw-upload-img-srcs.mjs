import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "content");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function generatedInline(uploadPath) {
  return uploadPath
    .replace(/^\/?uploads\//, "/generated/uploads/")
    .replace(/\.(jpe?g|png|webp)$/i, "-inline.webp");
}

for (const file of walk(contentRoot)) {
  const original = fs.readFileSync(file, "utf8");
  const next = original.replace(/(<img\b[^>]*\bsrc=")(\/?uploads\/[^"]+\.(?:jpe?g|png|webp))("[^>]*>)/gi, (_match, before, src, after) => {
    const candidate = generatedInline(src);
    const generatedFile = path.join(root, "static", candidate.replace(/^\//, ""));
    return `${before}${fs.existsSync(generatedFile) ? candidate : src}${after}`;
  });

  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}
