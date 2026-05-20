# molodtsov.net Hugo site

This is a regular Hugo version of the blog exported from Micro.blog.

## Local development

```sh
hugo server --bind 127.0.0.1 --port 1313 --disableFastRender
```

Then open <http://127.0.0.1:1313/>.

## Build

```sh
npm run optimize-images
npm run build
```

The generated static site is written to `public/`.

## Notes

- Content lives in `content/`.
- Theme templates live in `layouts/`.
- Uploaded media is local in `static/uploads/`.
- The Micro.blog conversation, IndieAuth, Micropub, Webmention, RSD, podcast, reply, and footer/profile links were removed.
- Post canonical URLs are readable dated paths such as `/2024/01/16/lichnyi-opyt-tesla-model-3/`.
- Legacy Micro.blog `.html` post URLs are preserved with Hugo `aliases`.
- Upload originals are capped/compressed by `scripts/optimize-upload-originals.mjs`.
- Display images use generated WebP derivatives from `static/generated/uploads/`: `-inline.webp` for posts and `-thumb.webp` for grids.
