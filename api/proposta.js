// GET /api/proposta?slug=3tentos  → proposta pública (usada pela página /3tentos).
import { getProposal } from "./_lib/store.js";
import { isSlug, send } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Método não permitido." });
  const slug = new URL(req.url, "http://x").searchParams.get("slug") || "";
  if (!isSlug(slug)) return send(res, 400, { error: "Link inválido." });
  try {
    const p = await getProposal(slug);
    if (!p) return send(res, 404, { error: "Proposta não encontrada." });
    return send(res, 200, p);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: "Não foi possível carregar a proposta." });
  }
}
