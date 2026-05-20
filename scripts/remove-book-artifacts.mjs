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

for (const file of walk(contentRoot)) {
  const original = fs.readFileSync(file, "utf8");
  let next = original;

  next = next.replace(
    /^<img src="https:\/\/covers\.openlibrary\.org\/b\/isbn\/[^"]+" align="left" class="microblog_book" style="[^"]+">\n\n/gm,
    "",
  );

  next = next.replace(/^books:\n(?:- .*\n)*/gm, "");
  next = next.replace(/\[([^\]]+)\]\(https:\/\/openlibrary\.org\/isbn\/[0-9Xx]+\)/g, "$1");

  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}
