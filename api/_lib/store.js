// Armazenamento das propostas.
// Em produção usa o Vercel Blob (variável BLOB_READ_WRITE_TOKEN criada ao conectar o Blob ao projeto).
// Sem essa variável (rodando no seu computador), grava arquivos em .data/propostas.
import { promises as fs } from "node:fs";
import path from "node:path";

const PREFIX = "propostas/";
const ACCESS = process.env.BLOB_ACCESS === "public" ? "public" : "private";
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_ROOT = path.join(process.cwd(), ".data");
const LOCAL_DIR = path.join(LOCAL_ROOT, "propostas");

async function blob() { return import("@vercel/blob"); }

async function streamToText(stream) {
  return new Response(stream).text();
}

async function readPath(pathname) {
  if (useBlob()) {
    const { get } = await blob();
    const res = await get(pathname, { access: ACCESS, useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await streamToText(res.stream));
  }
  try { return JSON.parse(await fs.readFile(path.join(LOCAL_ROOT, pathname), "utf8")); }
  catch (e) { if (e.code === "ENOENT") return null; throw e; }
}
async function writePath(pathname, data) {
  const body = JSON.stringify(data);
  if (useBlob()) {
    const { put } = await blob();
    await put(pathname, body, { access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
    return;
  }
  if (process.env.VERCEL) throw Object.assign(new Error("Conecte um Vercel Blob ao projeto para salvar."), { status: 500 });
  const file = path.join(LOCAL_ROOT, pathname);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}
async function removePath(pathname) {
  if (useBlob()) { const { del } = await blob(); await del(pathname); return; }
  await fs.rm(path.join(LOCAL_ROOT, pathname), { force: true });
}

// Textos salvos como padrão para novas propostas.
export const getModelo = () => readPath("config/modelo.json");
export const saveModelo = data => writePath("config/modelo.json", data);
export const deleteModelo = () => removePath("config/modelo.json");

export async function getProposal(slug) {
  if (useBlob()) {
    const { get } = await blob();
    const res = await get(PREFIX + slug + ".json", { access: ACCESS, useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await streamToText(res.stream));
  }
  try { return JSON.parse(await fs.readFile(path.join(LOCAL_DIR, slug + ".json"), "utf8")); }
  catch (e) { if (e.code === "ENOENT") return null; throw e; }
}

export async function saveProposal(slug, data) {
  const body = JSON.stringify(data);
  if (useBlob()) {
    const { put } = await blob();
    await put(PREFIX + slug + ".json", body, {
      access: ACCESS, addRandomSuffix: false, allowOverwrite: true,
      contentType: "application/json", cacheControlMaxAge: 60
    });
    return;
  }
  if (process.env.VERCEL) throw Object.assign(new Error("Conecte um Vercel Blob ao projeto para salvar propostas."), { status: 500 });
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, slug + ".json"), body);
}

export async function deleteProposal(slug) {
  if (useBlob()) {
    const { del } = await blob();
    await del(PREFIX + slug + ".json");
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, slug + ".json"), { force: true });
}

export async function listProposals() {
  let slugs = [];
  if (useBlob()) {
    const { list } = await blob();
    let cursor;
    do {
      const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
      slugs.push(...r.blobs.map(b => b.pathname.slice(PREFIX.length).replace(/\.json$/, "")));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  } else {
    try { slugs = (await fs.readdir(LOCAL_DIR)).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)); }
    catch (e) { if (e.code !== "ENOENT") throw e; }
  }
  const items = await Promise.all(slugs.map(async s => {
    try { const p = await getProposal(s); return p && { slug: s, cliente: p.cliente, valor: p.valor, updatedAt: p.updatedAt, createdAt: p.createdAt }; }
    catch { return null; }
  }));
  return items.filter(Boolean).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
