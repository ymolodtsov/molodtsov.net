import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const cdnUploadRE = /https:\/\/cdn\.uploads\.micro\.blog\/\d+\//g;
const siteUploadRE = /https:\/\/molodtsov\.net\/uploads\//g;
const legacyUploadRE = /https:\/\/ym\.micro\.blog\/uploads\//g;
const photoProxyRE = /https:\/\/micro\.blog\/photos\/(?:\d+x|[0-9]+)\//g;
const bookCoverRE = /https:\/\/cdn\.micro\.blog\/books\/([0-9Xx]+)\/cover\.jpg/g;
const bookLinkRE = /https:\/\/micro\.blog\/books\/([0-9Xx]+)/g;

function walk(dir, predicate, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, files);
    } else if (predicate(full)) {
      files.push(full);
    }
  }
  return files;
}

function localizeUploads(value) {
  return value
    .replace(cdnUploadRE, "/uploads/")
    .replace(siteUploadRE, "/uploads/")
    .replace(legacyUploadRE, "/uploads/")
    .replace(photoProxyRE, "")
    .replace(bookCoverRE, "https://covers.openlibrary.org/b/isbn/$1-L.jpg")
    .replace(bookLinkRE, "https://openlibrary.org/isbn/$1");
}

function sanitizeMarkdownFrontMatter(file) {
  const original = fs.readFileSync(file, "utf8");
  if (!original.startsWith("---\n")) {
    return;
  }

  const end = original.indexOf("\n---", 4);
  if (end === -1) {
    return;
  }

  let frontMatter = original.slice(4, end);
  let body = original.slice(end);

  frontMatter = frontMatter
    .replace(/^microblog:.*\n/gm, "")
    .replace(/^guid:.*\n/gm, "")
    .replace(/^post_id:.*\n/gm, "")
    .replace(/^thumbnail: https:\/\/s3\.amazonaws\.com\/micro\.blog\/.*\n/gm, "")
    .replace(/^opengraph:\n(?:  .*\n)+/gm, "")
    .replace(/^custom_summary: false\n/gm, "")
    .replace(/^summary: ""\n/gm, "")
    .replace(cdnUploadRE, "/uploads/")
    .replace(siteUploadRE, "/uploads/")
    .replace(legacyUploadRE, "/uploads/")
    .replace(bookCoverRE, "https://covers.openlibrary.org/b/isbn/$1-L.jpg")
    .replace(bookLinkRE, "https://openlibrary.org/isbn/$1");

  body = localizeUploads(body);

  const next = `---\n${frontMatter}${body}`;
  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}

function sanitizeTextFile(file) {
  const original = fs.readFileSync(file, "utf8");
  const next = localizeUploads(original);
  if (next !== original) {
    fs.writeFileSync(file, next);
  }
}

const configPath = path.join(root, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const author = {
  name: "Юрий Молодцов",
  avatar: "/assets/img/avatar.jpg",
  username: "yury_mol",
};

delete config.author;
delete config.blackfriday;
delete config.outputFormats.RSD;
delete config.outputFormats.PodcastXML;
delete config.outputFormats.PodcastJSON;
config.outputs.home = ["HTML", "RSS", "JSON", "ArchiveJSON", "PhotosJSON"];
delete config.outputs.taxonomyTerm;
delete config.paginate;
config.pagination = { pagerSize: 15 };

config.params = {
  ...config.params,
  author,
  description: "Блог для фотографий и заметок",
  site_image: "/uploads/2022/1142ee3a81.jpg",
  paginate_home: true,
  paginate_categories: true,
  theme_seconds: "0",
  plugins_css: ["/css/all.min.css?v=5", "/css/photos-grid.css?v=5", "/img-gallery.css?v=5"],
  plugins_js: ["/glightbox.js?v=5"],
  plugins_html: ["glightbox.html", "twitter_meta.html", "open_graph_meta.html"],
  photos_grid_style: "masonry",
  show_all_photos: true,
  included_categories: "photo",
};

for (const key of [
  "about_me",
  "itunes_description",
  "itunes_category",
  "itunes_subcategory",
  "itunes_author",
  "itunes_email",
  "itunes_cover",
  "site_id",
  "paginate_replies",
  "feeds",
  "has_podcasts",
  "has_newsletters",
  "include_conversation",
]) {
  delete config.params[key];
}

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

for (const file of walk(path.join(root, "content"), (name) => name.endsWith(".md"))) {
  sanitizeMarkdownFrontMatter(file);
}

for (const dir of ["layouts", "data"]) {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) {
    for (const file of walk(full, (name) => /\.(html|xml|json|yaml|yml)$/.test(name))) {
      sanitizeTextFile(file);
    }
  }
}
