import { copyFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
await copyFile(new URL("index.html", dist), new URL("404.html", dist));
