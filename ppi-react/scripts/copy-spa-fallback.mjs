import { createHash } from "node:crypto";
import { copyFile, readdir, readFile, writeFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const assets = new URL("assets/", dist);
await copyFile(new URL("index.html", dist), new URL("404.html", dist));

// Atiende HTML cacheado que aún solicita el hash de CSS del despliegue anterior.
const stylesheet = (await readdir(assets)).find(
  (file) => file !== "index-BOrMBj_F.css" && /^index-[\w-]+\.css$/.test(file),
);
if (!stylesheet) throw new Error("No se encontró el CSS principal generado por Vite.");
await copyFile(new URL(stylesheet, assets), new URL("index-BOrMBj_F.css", assets));

// Cachea el shell y todos los assets de build (incluido el chunk dinámico `en-*`).
const assetFiles = (await readdir(assets))
  .filter((file) => /\.(?:js|css|woff2|png|svg)$/.test(file))
  .map((file) => `assets/${file}`);
const shellFiles = [
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "brand/recordate-logo.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-192.png",
  "icon-maskable-512.png",
];
const precacheFiles = [...new Set([...shellFiles, ...assetFiles])].sort();
const contentHash = createHash("sha256");
for (const file of precacheFiles) {
  contentHash.update(file).update(await readFile(new URL(file, dist)));
}
const version = contentHash.digest("hex").slice(0, 12);
const manifestName = `precache-manifest-${version}.json`;
await writeFile(
  new URL(manifestName, dist),
  JSON.stringify({ version, assets: precacheFiles }, null, 2),
);
const serviceWorkerUrl = new URL("sw.js", dist);
const serviceWorker = (await readFile(serviceWorkerUrl, "utf8"))
  .replaceAll("__PRECACHE_MANIFEST__", manifestName)
  .replaceAll("__PRECACHE_VERSION__", version);
await writeFile(serviceWorkerUrl, serviceWorker);
