// Painel (exige senha no cabeçalho x-gdm-key):
//   GET    /api/propostas                 → lista as propostas salvas
//   POST   /api/propostas                 → salva { proposta, modo }  modo: "verificar" (padrão) | "atualizar" | "novo"
//   DELETE /api/propostas?slug=3tentos    → exclui
import { listProposals, getProposal, saveProposal, deleteProposal } from "./_lib/store.js";
import { isAuthorized, send, readJson, slugify, isSlug, cleanProposal } from "./_lib/util.js";

export default async function handler(req, res) {
  if (!isAuthorized(req)) return send(res, 401, { error: "Acesso não autorizado." });
  try {
    if (req.method === "GET") return send(res, 200, { propostas: await listProposals() });

    if (req.method === "DELETE") {
      const slug = new URL(req.url, "http://x").searchParams.get("slug") || "";
      if (!isSlug(slug)) return send(res, 400, { error: "Link inválido." });
      await deleteProposal(slug);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const p = cleanProposal(body.proposta || {});
      if (!p.cliente) return send(res, 400, { error: "Informe o nome do cliente." });
      const base = slugify(body.slug && isSlug(body.slug) ? body.slug : p.cliente);
      if (!base) return send(res, 400, { error: "Não foi possível montar o link com esse nome." });
      const modo = body.modo || "verificar";
      const now = new Date().toISOString();

      let slug = base;
      const atual = await getProposal(base);
      if (atual && modo === "verificar") {
        return send(res, 409, { conflito: true, slug: base, existente: { cliente: atual.cliente, valor: atual.valor, updatedAt: atual.updatedAt } });
      }
      let createdAt = atual && modo === "atualizar" ? atual.createdAt : now;
      if (atual && modo === "novo") {
        let i = 2;
        while (i < 100 && await getProposal(base + "-" + i)) i++;
        slug = base + "-" + i; createdAt = now;
      }
      const doc = { ...p, slug, createdAt, updatedAt: now };
      await saveProposal(slug, doc);
      return send(res, 200, { ok: true, slug, proposta: doc });
    }
    return send(res, 405, { error: "Método não permitido." });
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, { error: e.status ? e.message : "Erro ao acessar o armazenamento. Confira se o Blob está conectado ao projeto." });
  }
}
