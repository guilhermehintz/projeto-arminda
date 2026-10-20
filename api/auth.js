// POST /api/auth  (cabeçalho x-gdm-key) → confere a senha de acesso ao painel.
import { isAuthorized, send } from "./_lib/util.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método não permitido." });
  if (!process.env.ADMIN_PASSWORD) return send(res, 500, { error: "Defina a variável ADMIN_PASSWORD no projeto da Vercel." });
  if (!isAuthorized(req)) {
    await new Promise(r => setTimeout(r, 600)); // freia tentativas em sequência
    return send(res, 401, { error: "Senha incorreta." });
  }
  return send(res, 200, { ok: true });
}
