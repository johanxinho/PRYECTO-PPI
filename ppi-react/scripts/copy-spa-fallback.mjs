import { copyFile, readdir } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const assets = new URL("assets/", dist);
await copyFile(new URL("index.html", dist), new URL("404.html", dist));

// Atiende HTML cacheado que aún solicita el hash de CSS del despliegue anterior.
const stylesheet = (await readdir(assets)).find(
  (file) => file !== "index-BOrMBj_F.css" && /^index-[\w-]+\.css$/.test(file)
);
if (!stylesheet) throw new Error("No se encontró el CSS principal generado por Vite.");
await copyFile(new URL(stylesheet, assets), new URL("index-BOrMBj_F.css", assets));
