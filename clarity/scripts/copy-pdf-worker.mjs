// Copies the pdf.js worker into /public so PDF text extraction runs fully in the
// browser without loading anything from a CDN.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const dest = join(root, "public/pdf.worker.min.mjs");

if (existsSync(src)) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("clarity: pdf.js worker copied to public/");
} else {
  console.warn("clarity: pdfjs-dist not installed yet, worker not copied");
}
