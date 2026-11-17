import { readFileSync } from "node:fs";

const html = readFileSync("dist/client/index.html", "utf8");
const island = html.match(/<div data-island="[^"]*"/)?.[0];
console.log(island ? `island: ${island}` : "island: none (Counter.vue is static HTML, never hydrated)");
process.exitCode = island ? 0 : 1;
