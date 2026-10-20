// Servidor local que imita a Vercel: arquivos estáticos, funções em /api e o link /nome-do-cliente.
// Uso: ADMIN_PASSWORD=teste npm run dev   →  http://localhost:3000
import http from "node:http";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const PORT = Number(process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".ico": "image/x-icon" };

async function serveFile(res, file) {
  const data = await fs.readFile(file);
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(data);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith("/api/")) {
      const name = p.slice(5).replace(/[^a-z0-9_-]/gi, "");
      const file = path.join(ROOT, "api", name + ".js");
      if (!name || name.startsWith("_") || !existsSync(file)) { res.writeHead(404); return res.end("not found"); }
      const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
      return await mod.default(req, res);
    }
    if (p === "/") p = "/index.html";
    let file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (!path.extname(file) && existsSync(file + ".html")) file += ".html";
    if (existsSync(file) && (await fs.stat(file)).isFile()) return await serveFile(res, file);
    if (/^\/[a-z0-9][a-z0-9-]{0,63}$/.test(p)) return await serveFile(res, path.join(ROOT, "proposta.html"));
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Página não encontrada");
  } catch (e) {
    console.error(e); res.writeHead(500); res.end("erro");
  }
}).listen(PORT, () => console.log(`GDM Proposta rodando em http://localhost:${PORT}`));
