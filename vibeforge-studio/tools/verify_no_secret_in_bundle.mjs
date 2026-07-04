import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const banned = [["sk-", "ant-"].join(""), ["ANTHROPIC", "_API_KEY"].join("")];
let hits = 0;
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const text = readFileSync(p, "utf8");
    banned.forEach((b, i) => {
      if (text.includes(b)) { console.error(`SECRET-GATE hit banned[${i}] in ${p}`); hits++; }
    });
  }
})("dist");
console.log(hits === 0 ? "SECRET-GATE: 0 findings in dist/" : `SECRET-GATE: ${hits} findings`);
process.exit(hits === 0 ? 0 : 1);
