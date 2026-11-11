import { cp, writeFile } from "node:fs/promises";

await cp("assets", "_site/assets", {
  recursive: true,
  filter: (source) => !source.endsWith(".prompt.txt"),
});
await writeFile("_site/.nojekyll", "");
