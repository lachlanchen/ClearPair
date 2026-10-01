import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
await mkdir(".runtime/audio", { recursive: true });
await build({
  stdin: { contents: 'export * from "./src/curriculum"; export * from "./src/pronunciation-text";', resolveDir: process.cwd(), loader: 'ts' },
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: ".runtime/audio/curriculum.mjs",
});
const { lessons, audioKey, pronunciationText } = await import(
  pathToFileURL(resolve(".runtime/audio/curriculum.mjs")).href
);
const rows = new Map();
const mode = process.argv.includes("--first-pairs") ? "first" : "all";
for (const lesson of lessons)
  for (const pair of mode === "first" ? lesson.pairs.slice(0, 1) : lesson.pairs)
    for (const word of pair) {
      for (const context of [false, true]) {
        const key = audioKey(word, lesson.language, context);
        const row = {
          key,
          text: pronunciationText(word, lesson.language, context),
          language: lesson.language,
          ipa: word.ipa,
          word: word.text,
          context,
        };
        const previous = rows.get(key);
        if (previous && previous.text !== row.text) throw new Error('Conflicting authored speech for ' + key);
        rows.set(key, row);
      }
    }
await writeFile(
  ".runtime/audio/requests.json",
  JSON.stringify([...rows.values()], null, 2) + "\n",
);
console.log(
  `${rows.size} original curriculum utterances prepared (${mode} pairs).`,
);
