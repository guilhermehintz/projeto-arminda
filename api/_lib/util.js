import { timingSafeEqual, createHash } from "node:crypto";

const RESERVED = ["api", "assets", "proposta", "index", "admin", "login"];

export function slugify(s) {
  let x = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  if (!x) return "";
  if (RESERVED.includes(x)) x = "proposta-" + x;
  return x;
}

export const isSlug = s => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(s);

// Compara a senha enviada no cabeçalho x-gdm-key com ADMIN_PASSWORD, sem vazar tempo de comparação.
export function isAuthorized(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const got = String(req.headers["x-gdm-key"] || "");
  if (!expected || !got) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(got).digest();
  return timingSafeEqual(a, b);
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 400000) throw Object.assign(new Error("too_large"), { status: 413 }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const str = (v, max) => String(v == null ? "" : v).slice(0, max);

// Textos editáveis: só objetos, listas, textos e verdadeiro/falso, com limites de tamanho.
export function cleanTextos(v, depth = 0) {
  if (depth > 5) return undefined;
  if (typeof v === "string") return v.slice(0, 3000);
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.slice(0, 40).map(x => cleanTextos(x, depth + 1)).filter(x => x !== undefined);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).slice(0, 60)) { if (/^[a-zA-Z0-9_]{1,40}$/.test(k)) { const c = cleanTextos(v[k], depth + 1); if (c !== undefined) o[k] = c; } }
    return o;
  }
  return undefined;
}

// Mantém só os campos conhecidos, com limites de tamanho.
export function cleanProposal(p) {
  const valor = Math.max(0, Math.min(99999999999, Math.round(Number(p.valor) || 0)));
  const validade = Math.max(1, Math.min(365, parseInt(p.validade, 10) || 30));
  const data = /^\d{4}-\d{2}-\d{2}$/.test(p.data || "") ? p.data : new Date().toISOString().slice(0, 10);
  const textos = cleanTextos(p.textos && typeof p.textos === "object" ? p.textos : {}) || {};
  if (JSON.stringify(textos).length > 120000) throw Object.assign(new Error("Os textos ficaram grandes demais."), { status: 413 });
  return {
    cliente: str(p.cliente, 80).trim(), valor, condicao: str(p.condicao, 140), obs: str(p.obs, 700),
    assunto: str(p.assunto, 180), contexto: str(p.contexto, 900), exito: str(p.exito, 140),
    data, validade, cidade: str(p.cidade, 60), resp: str(p.resp, 80), textos
  };
}
