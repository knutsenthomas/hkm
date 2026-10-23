import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");

// Keep the public shell and assets available at their established URLs.
for (const asset of [
  "styles.css",
  "js",
  "css",
  "img",
  "script.js",
  "media.js",
  "firebase-messaging-sw.js",
]) {
  fs.cpSync(path.join(root, asset), path.join(output, asset), {
    recursive: true,
  });
}

// Server-rendered share previews read these templates after Vite has built them.
const templates = [
  "leseplan-detaljer",
  "en/reading-plan-details",
  "es/detalles-plan-lectura",
  "blogg-post",
  "en/blog-post",
  "es/blog-post",
  "arrangement-detaljer",
  "en/event-details",
  "es/detalles-evento",
  "kurs",
  "en/courses",
  "es/cursos",
];
for (const template of templates) {
  fs.renameSync(
    path.join(output, template + ".html"),
    path.join(output, template + "-template.html"),
  );
}

execFileSync(
  process.execPath,
  [path.join(root, "scripts/generate_multilingual_sitemap.mjs")],
  { cwd: root, stdio: "inherit" },
);
fs.copyFileSync(
  path.join(root, "public/sitemap.xml"),
  path.join(output, "sitemap.xml"),
);
fs.copyFileSync(path.join(root, "404.html"), path.join(output, "404.html"));
