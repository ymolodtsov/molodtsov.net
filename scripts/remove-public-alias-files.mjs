import fs from "node:fs";
import path from "node:path";

const publicRoot = path.join(process.cwd(), "public");
const redirectsPath = path.join(publicRoot, "_redirects");

if (!fs.existsSync(redirectsPath)) {
  console.log("public aliases: no _redirects file found");
  process.exit(0);
}

let removed = 0;
for (const line of fs.readFileSync(redirectsPath, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) {
    continue;
  }

  const [from] = line.trim().split(/\s+/);
  if (!from || !from.endsWith(".html")) {
    continue;
  }

  const file = path.join(publicRoot, from.replace(/^\/+/, ""));
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    fs.unlinkSync(file);
    removed += 1;
  }
}

console.log(`public aliases: removed ${removed} files`);
