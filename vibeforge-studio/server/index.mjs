// Fail-closed AI proxy. ANTHROPIC_API_KEY lives HERE ONLY (server-side only).
// Never in client code, never behind a VITE_ prefix, never logged by value.
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const PORT = process.env.PORT ?? 8787;
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AI_MODEL ?? "claude-sonnet-4-6";
const ARMED = process.env.AI_PROXY_ARMED === "true"; // disarmed by default
const PROD = process.env.NODE_ENV === "production";
const DIST = resolve("dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:";

async function generate(req, res) {
  if (!ARMED || !KEY) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "AI proxy disarmed or key absent", state: "HOLD",
      lift: "export ANTHROPIC_API_KEY=… && export AI_PROXY_ARMED=true && pnpm dev:api" }));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  const { prompt, system } = JSON.parse(body || "{}");
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01",
      "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, stream: true,
      system, messages: [{ role: "user", content: prompt }] })
  });
  res.writeHead(upstream.status, { "content-type": "text/event-stream",
    "cache-control": "no-cache" });
  for await (const chunk of upstream.body) res.write(chunk);
  res.end();
}

function serveStatic(req, res) {
  const url = (req.url ?? "/").split("?")[0];
  let p = resolve(join(DIST, url === "/" ? "index.html" : url));
  if (!p.startsWith(DIST + "/")) { res.writeHead(403); res.end(); return; }
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, "index.html");
  res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream",
    "content-security-policy": CSP });
  createReadStream(p).pipe(res);
}

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate") return generate(req, res);
  if (PROD) return serveStatic(req, res);
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log(
  `[proxy] :${PORT} armed=${ARMED} key=${KEY ? "present(redacted)" : "ABSENT"} prod=${PROD}`));
