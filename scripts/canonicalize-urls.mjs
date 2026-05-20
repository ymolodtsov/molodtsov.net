import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "content");

const translit = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  є: "e",
  і: "i",
  ї: "yi",
  ґ: "g",
};

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

function parseScalar(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) {
    return "";
  }

  const raw = match[1].trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

function parseAliases(frontMatter) {
  const match = frontMatter.match(/^aliases:\n((?:- .*\n)*)/m);
  if (!match) {
    return [];
  }

  return match[1]
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .map((value) => {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        return value.slice(1, -1);
      }
      return value;
    });
}

function slugify(value) {
  const ascii = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("");

  return ascii
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function oldUrlFromFile(file) {
  const rel = path.relative(contentRoot, file).replace(/\\/g, "/");
  return `/${rel.replace(/\.md$/, ".html")}`;
}

function datePrefix(file, frontMatter) {
  const date = parseScalar(frontMatter, "date");
  if (date) {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `/${match[1]}/${match[2]}/${match[3]}`;
    }
  }

  const rel = path.relative(contentRoot, file).replace(/\\/g, "/");
  const match = rel.match(/^(\d{4})\/(\d{2})\/(\d{2})\//);
  if (!match) {
    return "";
  }
  return `/${match[1]}/${match[2]}/${match[3]}`;
}

function replaceOrInsert(frontMatter, key, value) {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, "m");
  if (re.test(frontMatter)) {
    return frontMatter.replace(re, line);
  }
  return `${frontMatter.trimEnd()}\n${line}\n`;
}

function removeAliases(frontMatter) {
  return frontMatter.replace(/^aliases:\n(?:- .*\n)*/gm, "");
}

const used = new Map();
const redirects = new Map();

for (const file of walk(contentRoot).sort()) {
  const original = fs.readFileSync(file, "utf8");
  if (!original.startsWith("---\n")) {
    continue;
  }

  const end = original.indexOf("\n---", 4);
  if (end === -1) {
    continue;
  }

  let frontMatter = original.slice(4, end);
  const body = original.slice(end);
  if (parseScalar(frontMatter, "type") !== "post") {
    continue;
  }

  const currentUrl = parseScalar(frontMatter, "url");
  const oldUrl = parseAliases(frontMatter)[0] || (currentUrl.endsWith(".html") ? currentUrl : oldUrlFromFile(file));
  const title = parseScalar(frontMatter, "title");
  const fallback = path.basename(file, ".md");
  const baseSlug = slugify(title || fallback) || fallback;
  const prefix = datePrefix(file, frontMatter);
  if (!prefix) {
    continue;
  }

  const key = prefix;
  const count = used.get(`${key}/${baseSlug}`) ?? 0;
  used.set(`${key}/${baseSlug}`, count + 1);
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
  const canonicalUrl = `${prefix}/${slug}/`;

  frontMatter = removeAliases(frontMatter);
  frontMatter = replaceOrInsert(frontMatter, "url", `"${canonicalUrl}"`);
  if (oldUrl !== canonicalUrl) {
    frontMatter = `${frontMatter.trimEnd()}\naliases:\n- "${oldUrl}"\n`;
    redirects.set(oldUrl, canonicalUrl);
  }

  const next = `---\n${frontMatter}${body}`;
  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}

for (const file of walk(contentRoot).sort()) {
  const original = fs.readFileSync(file, "utf8");
  if (!original.startsWith("---\n")) {
    continue;
  }

  const end = original.indexOf("\n---", 4);
  if (end === -1) {
    continue;
  }

  const frontMatter = original.slice(0, end + 5);
  let body = original.slice(end + 5);

  for (const [oldUrl, canonicalUrl] of redirects) {
    body = body
      .replaceAll(`https://molodtsov.net${oldUrl}`, canonicalUrl)
      .replaceAll(`http://molodtsov.net${oldUrl}`, canonicalUrl);
  }

  const next = `${frontMatter}${body}`;
  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}
