// Textos padrão para novas propostas (exige senha no cabeçalho x-gdm-key):
//   GET    /api/modelo   → { textos, updatedAt } ou { textos: null }
//   POST   /api/modelo   → salva { textos }
//   DELETE /api/modelo   → volta ao texto original da GDM
import { getModelo, saveModelo, deleteModelo } from "./_lib/store.js";
import { isAuthorized, send, readJson, cleanTextos } from "./_lib/util.js";

export default async function handler(req, res) {
  if (!isAuthorized(req)) return send(res, 401, { error: "Acesso não autorizado." });
  try {
    if (req.method === "GET") { const m = await getModelo(); return send(res, 200, m || { textos: null }); }
    if (req.method === "DELETE") { await deleteModelo(); return send(res, 200, { ok: true }); }
    if (req.method === "POST") {
      const body = await readJson(req);
      const textos = cleanTextos(body.textos || {});
      if (!textos || JSON.stringify(textos).length > 120000) return send(res, 400, { error: "Textos inválidos." });
      const doc = { textos, updatedAt: new Date().toISOString() };
      await saveModelo(doc);
      return send(res, 200, doc);
    }
    return send(res, 405, { error: "Método não permitido." });
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, { error: e.status ? e.message : "Erro ao acessar o armazenamento." });
  }
}
