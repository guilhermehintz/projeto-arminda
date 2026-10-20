/* GDM Proposta: página pública /nome-do-cliente */
(function () {
  const G = window.GDM, $ = id => document.getElementById(id);
  const slug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ""));
  const introKey = "gdm-v" + location.pathname;
  let data = null;

  function toast(msg, kind) {
    const el = document.createElement("div"); el.className = "toast" + (kind ? " " + kind : ""); el.textContent = msg;
    $("toasts").appendChild(el); setTimeout(() => el.remove(), 3800);
  }
  function msg(title, body) {
    GDMIntro.dismiss();
    $("vPages").innerHTML = "";
    $("vMsg").innerHTML = `<div class="vmsg"><h2>${G.esc(title)}</h2><p>${G.esc(body)}</p>
      <a class="btn btn-glass" href="https://wa.me/${G.whatsDigits(G.TEXTOS.contra.whatsapp)}" target="_blank" rel="noopener">Falar com a GDM</a></div>`;
  }
  function draw() { if (data) G.mount($("vPages"), G.renderPages(data), 860); }

  async function load() {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) return msg("Link inválido", "Confira o endereço recebido.");
    try {
      const r = await fetch("/api/proposta?slug=" + encodeURIComponent(slug), { cache: "no-store" });
      const p = await r.json().catch(() => ({}));
      if (r.status === 404) return msg("Proposta não encontrada", "Este link pode ter sido substituído ou removido. Fale com a GDM para receber a versão atual.");
      if (!r.ok) return msg("Não foi possível abrir", "Tente novamente em alguns instantes.");
      data = p;
      const textos = G.textosDe(p);
      document.title = "Proposta " + p.cliente + " · GDM Estratégia Fiscal";
      $("vCli").textContent = p.cliente;
      $("vMeta").textContent = G.fmtMoney(p.valor) + " · válida por " + (p.validade || 30) + " dias a partir de " + String(p.data || "").split("-").reverse().join("/");
      $("vhero").hidden = false; $("vbtns").hidden = false;
      $("vWa").href = "https://wa.me/" + G.whatsDigits(textos.contra.whatsapp) + "?text=" + encodeURIComponent("Olá! Recebi a proposta da GDM para " + p.cliente + " e gostaria de conversar.");
      draw();
      if (GDMIntro.active()) {
        GDMIntro.mark(introKey);
        GDMIntro.type([["Proposta personalizada para ", "t1"], [p.cliente, "t2"]], "GDM Estratégia Fiscal <span>·</span> " + G.esc(textos.contra.tag || "Estratégia fiscal para o agro crescer"));
      }
    } catch (e) { msg("Sem conexão", "Verifique a internet e recarregue a página."); }
  }

  $("vPdf").onclick = async () => {
    if (!data) return;
    const btn = $("vPdf"), label = btn.querySelector("span"); btn.disabled = true;
    try {
      const pdf = await G.buildPdf(data, (i, n) => { label.textContent = `Gerando ${i} de ${n}…`; });
      await G.savePdf(pdf, G.pdfName(data)); toast("PDF baixado.", "ok");
    } catch (e) { toast("Não foi possível gerar o PDF agora.", "err"); }
    label.textContent = "Baixar PDF"; btn.disabled = false;
  };
  let rz = null;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(draw, 90); }).observe(document.body);
  load();
})();
