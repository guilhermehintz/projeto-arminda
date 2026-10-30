/* GDM Proposta: painel (vinheta, acesso, edição de dados e textos, PDF e links). */
(function () {
  const G = window.GDM;
  const $ = id => document.getElementById(id);
  const esc = G.esc;
  const KEY_STORE = "gdm-key", DRAFT = "gdm-rascunho", INTRO = "gdm-vinheta";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  let key = store.get(KEY_STORE) || "";

  /* ---------- luz que acompanha o cursor ---------- */
  if (!reduce) {
    let raf = 0;
    addEventListener("pointermove", e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mx", e.clientX + "px");
        document.documentElement.style.setProperty("--my", e.clientY + "px");
        const card = e.target.closest && e.target.closest(".card");
        if (card) { const r = card.getBoundingClientRect(); card.style.setProperty("--cx", (e.clientX - r.left) + "px"); }
      });
    }, { passive: true });
  }

  /* ---------- API ---------- */
  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", "x-gdm-key": key, ...(opts.headers || {}) } });
    let data = {}; try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && path !== "/api/auth") { lock(); throw Object.assign(new Error("401"), { status: 401 }); }
    return { status: res.status, data };
  }

  /* ---------- avisos ---------- */
  function toast(msg, kind, action) {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.innerHTML = `<span>${esc(msg)}</span>`;
    if (action) { const b = document.createElement("button"); b.type = "button"; b.textContent = action.label; b.onclick = () => { action.run(); el.remove(); }; el.appendChild(b); }
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), action ? 6500 : 3800);
  }

  /* ---------- vinheta ---------- */
  async function playIntro() {
    if (!GDMIntro.active()) return;
    GDMIntro.mark(INTRO);
    await GDMIntro.type([["Bem-vinda, ", "t1"], ["Arminda", "t2"]], "GDM Proposta <span>·</span> Estratégia fiscal para o agro crescer");
  }

  /* ---------- acesso ---------- */
  async function checkKey() {
    if (!key) return false;
    try { const r = await api("/api/auth", { method: "POST" }); return r.status === 200; }
    catch (e) { return null; }
  }
  function showGate(msg) {
    $("shell").hidden = true; $("gate").hidden = false;
    $("gateErr").textContent = msg || "";
    setTimeout(() => $("senha").focus(), 50);
  }
  function lock() { key = ""; store.del(KEY_STORE); showGate("Sua sessão expirou. Digite a senha novamente."); }
  $("pwToggle").onclick = () => { const i = $("senha"); const show = i.type === "password"; i.type = show ? "text" : "password"; $("pwToggle").textContent = show ? "Ocultar" : "Mostrar"; };
  $("gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("gateBtn"); btn.disabled = true; btn.textContent = "Entrando…"; $("gateErr").textContent = "";
    key = $("senha").value;
    try {
      const r = await api("/api/auth", { method: "POST" });
      if (r.status === 200) { store.set(KEY_STORE, key); $("senha").value = ""; showShell(); }
      else { key = ""; $("gateErr").textContent = r.data.error || "Não foi possível entrar."; }
    } catch (err) { key = ""; $("gateErr").textContent = "Sem conexão com o servidor. Tente de novo."; }
    btn.disabled = false; btn.textContent = "Entrar";
  });

  /* ---------- estado ---------- */
  let modelo = null;            // textos salvos como padrão (null = texto original da GDM)
  let modeloEm = null;
  const padrao = () => G.clone(modelo || G.TEXTOS);
  let state = Object.assign({}, G.DEFAULTS);
  let loadedSlug = null;
  try { const d = JSON.parse(store.get(DRAFT) || "null"); if (d && typeof d === "object") { state = Object.assign({}, G.DEFAULTS, d.state); loadedSlug = d.loadedSlug || null; } } catch (e) {}
  state.textos = G.textosDe(state); delete state.etapas;

  /* ---------- aba Dados ---------- */
  const F = { cliente: "f-cliente", condicao: "f-condicao", obs: "f-obs", assunto: "f-assunto", contexto: "f-contexto", exito: "f-exito", data: "f-data", validade: "f-validade", cidade: "f-cidade", resp: "f-resp" };
  const PRESETS = ["à vista, no aceite da proposta", "50% no aceite e 50% na entrega do diagnóstico", "em 3 parcelas mensais, a primeira no aceite", "mensal, durante a vigência do contrato"];
  const PRESET_LABEL = ["À vista", "50% + 50%", "3 parcelas", "Mensal"];

  function fillForm() {
    for (const k in F) $(F[k]).value = state[k] == null ? "" : state[k];
    $("f-valor").value = G.BRL.format((state.valor || 0) / 100);
    $("presets").innerHTML = PRESETS.map((p, i) => `<button type="button" data-p="${i}" aria-pressed="${state.condicao === p}">${PRESET_LABEL[i]}</button>`).join("");
    drawTextos();
    hints();
  }
  function slugFor() {
    const base = G.slugify(state.cliente);
    if (loadedSlug && base && (loadedSlug === base || loadedSlug.startsWith(base + "-"))) return loadedSlug;
    return base;
  }
  function hints() {
    const sl = slugFor();
    $("slugTxt").innerHTML = sl ? esc(location.host) + "/<b>" + esc(sl) + "</b>" : "digite o nome do cliente";
    $("valorExt").textContent = state.valor ? G.reaisExtenso(state.valor) : "";
    $("obsCount").textContent = (state.obs || "").length + "/600";
    $("ctxCount").textContent = (state.contexto || "").length + "/900 · use {cliente} para inserir o nome";
    $("presets").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(state.condicao === PRESETS[+b.dataset.p])));
    const same = ["cliente", "valor", "condicao", "obs", "assunto", "contexto"].every(k => state[k] === G.DEFAULTS[k]);
    $("sampleNote").hidden = !same;
    $("btnLinkTxt").textContent = loadedSlug && sl === loadedSlug ? "Atualizar link" : "Gerar link";
  }
  let tmr = null;
  function changed() {
    hints();
    clearTimeout(tmr);
    tmr = setTimeout(() => { render(); store.set(DRAFT, JSON.stringify({ state, loadedSlug })); }, 140);
  }
  function bindForm() {
    for (const k in F) $(F[k]).addEventListener("input", e => { state[k] = k === "validade" ? (parseInt(e.target.value, 10) || "") : e.target.value; changed(); });
    $("f-valor").addEventListener("input", e => {
      const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
      state.valor = parseInt(digits || "0", 10);
      e.target.value = G.BRL.format(state.valor / 100);
      changed();
    });
    $("presets").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      state.condicao = PRESETS[+b.dataset.p]; $("f-condicao").value = state.condicao; changed();
    });
  }

  /* ---------- abas ---------- */
  function setTab(which) {
    const t = which === "textos";
    $("tabDados").setAttribute("aria-selected", String(!t)); $("tabTextos").setAttribute("aria-selected", String(t));
    $("paneDados").hidden = t; $("paneTextos").hidden = !t;
  }
  $("tabDados").onclick = () => setTab("dados");
  $("tabTextos").onclick = () => setTab("textos");
  function openSection(sec) {
    setTab("textos");
    const d = document.querySelector(`#txSecs details[data-sec="${sec}"]`); if (!d) return;
    d.open = true;
    setTimeout(() => d.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 30);
  }
  document.addEventListener("click", e => { const g = e.target.closest("[data-goto]"); if (g) openSection(g.dataset.goto); });

  /* ---------- aba Textos ---------- */
  const EY = ["eyebrow", "Rótulo acima do título"], TI = ["titulo", "Título da página"];
  const SCHEMA = [
    { id: "capa", nome: "Capa", note: "Assunto, data e validade ficam na aba Dados do cliente.",
      f: [["linha1", "Título, linha 1"], ["linha2", "Título, linha 2"], ["rotuloDest", "Rótulo do destinatário"], ["rotuloData", "Rótulo da data"], ["rotuloValidade", "Rótulo da validade"]] },
    { id: "quem", nome: "Quem somos",
      f: [EY, TI, ["p1", "Parágrafo 1", "area"], ["p2", "Parágrafo 2", "area"], ["propositoTitulo", "Título do quadro verde"], ["proposito", "Texto do quadro verde", "area"],
          ["pilaresTitulo", "Título da lista de atuação"], ["pilares", "Itens de atuação", "pairs", ["Título", "Descrição"]], ["contatoTitulo", "Título do quadro final"], ["contato", "Texto do quadro final", "area"]] },
    { id: "contexto", nome: "Contexto e objetivo", note: "O contexto de cada cliente fica na aba Dados do cliente.",
      f: [EY, TI, ["objetivoTitulo", "Título do quadro verde"], ["objetivo", "Objetivo do trabalho", "area"], ["recebeTitulo", "Título da lista"], ["recebe", "Benefícios para o cliente", "list"]] },
    { id: "escopo", nome: "Escopo: consultoria contínua",
      f: [EY, TI, ["intro", "Introdução", "area"], ["entregavelRotulo", "Rótulo antes do entregável"], ["etapas", "Frentes do escopo", "etapas"]] },
    { id: "invest", nome: "Investimento", note: "Valor, condição de pagamento, êxito e observação ficam na aba Dados do cliente.",
      f: [EY, TI, ["intro", "Introdução", "area"], ["colComponente", "Coluna 1 da tabela"], ["colValor", "Coluna 2 da tabela"], ["linhaTitulo", "Nome do item de honorários"],
          ["linhaSub", "Descrição do item (em branco, lista as etapas)"], ["exitoTitulo", "Nome do item de êxito"], ["exitoNota", "Descrição do item de êxito"],
          ["totalRotulo", "Rótulo do total"], ["obsTitulo", "Título da observação"], ["outrosTitulo", "Título de outros serviços"], ["outros", "Texto de outros serviços", "area"]] },
    { id: "inicio", nome: "Escopo: operações, atendimento e limites",
      f: [EY, TI, ["passos", "Frentes do escopo", "pairs", ["Frente", "Descrição"]], ["docsTitulo", "Título das formas de atendimento"], ["docs", "Formas de atendimento", "list"],
          ["naoInclTitulo", "Título da limitação do escopo"], ["naoIncl", "O que não está incluído", "list"], ["premissasTitulo", "Título das premissas"], ["premissas", "Premissas", "list"]] },
    { id: "cond", nome: "Condições gerais",
      f: [EY, TI, ["clausulas", "Cláusulas", "pairs", ["Título da cláusula", "Texto da cláusula"]], ["fechamento", "Frase de fechamento", "area"],
          ["assinaGdm", "Assinatura da GDM"], ["assinaCliente", "Assinatura do cliente"], ["assinaClienteSub", "Linha abaixo da assinatura do cliente"]] },
    { id: "contra", nome: "Contracapa e contatos",
      f: [["tag", "Frase abaixo do logo"], ["whatsapp", "WhatsApp"], ["site", "Site"], ["instagram", "Instagram"], ["endereco", "Endereço", "area"]] }
  ];
  const ITEM_LABEL = { pilares: "Item", recebe: "Item", etapas: "Frente", passos: "Frente", docs: "Canal", naoIncl: "Item", premissas: "Premissa", clausulas: "Cláusula" };
  const NEW_ITEM = { pairs: () => ({ t: "", d: "" }), list: () => "", etapas: () => ({ on: true, t: "", d: "", e: "" }) };

  const ta = (path, val, rows, ph) => `<textarea data-path="${path}" rows="${rows || 2}"${ph ? ` placeholder="${esc(ph)}"` : ""}>${esc(val)}</textarea>`;
  const inp = (path, val, ph) => `<input type="text" data-path="${path}" value="${esc(val)}"${ph ? ` placeholder="${esc(ph)}"` : ""}>`;
  function listHTML(sec, k, type, labels) {
    const arr = state.textos[sec][k] || [], base = `${sec}.${k}`;
    const items = arr.map((it, i) => {
      const p = `${base}.${i}`;
      let body = "";
      if (type === "list") body = ta(p, it, 2);
      if (type === "pairs") body = inp(p + ".t", it.t, labels[0]) + ta(p + ".d", it.d, 2, labels[1]);
      if (type === "etapas") body = `<label class="inc"><input type="checkbox" data-path="${p}.on" ${it.on !== false ? "checked" : ""}> Incluir nesta proposta</label>`
        + inp(p + ".t", it.t, "Nome da frente") + ta(p + ".d", it.d, 3, "Descrição") + `<span class="sublbl">Inclui (opcional)</span>` + ta(p + ".e", it.e, 2, "Opcional: o que está incluído");
      return `<div class="li${type === "etapas" && it.on === false ? " off" : ""}"><div class="li-head"><span>${ITEM_LABEL[k] || "Item"} ${i + 1}</span><div class="li-btns">
        <button type="button" data-act="up" data-list="${base}" data-i="${i}" aria-label="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-act="down" data-list="${base}" data-i="${i}" aria-label="Descer" ${i === arr.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-act="del" data-list="${base}" data-i="${i}" aria-label="Remover">×</button></div></div>${body}</div>`;
    }).join("");
    return `<div class="lst" data-type="${type}">${items}<button type="button" class="add" data-act="add" data-list="${base}" data-type="${type}">+ Adicionar ${String(ITEM_LABEL[k] || "item").toLowerCase()}</button></div>`;
  }
  function secBody(S) {
    const t = state.textos[S.id];
    return (S.note ? `<p class="hint-ui">${esc(S.note)}</p>` : "") + S.f.map(([k, label, type, labels]) => {
      const p = `${S.id}.${k}`;
      if (type === "list" || type === "pairs" || type === "etapas") return `<div class="field"><span class="lbl">${esc(label)}</span>${listHTML(S.id, k, type, labels)}</div>`;
      return `<div class="field"><label>${esc(label)}</label>${type === "area" ? ta(p, t[k], 3) : inp(p, t[k])}</div>`;
    }).join("") + `<button type="button" class="restore" data-restore="${S.id}">Restaurar textos desta página</button>`;
  }
  function drawTextos() {
    const open = new Set([...document.querySelectorAll("#txSecs details[open]")].map(d => d.dataset.sec));
    $("txSecs").innerHTML = SCHEMA.map((S, i) => `<details class="card glass more tx" data-sec="${S.id}"${open.has(S.id) ? " open" : ""}>
      <summary><span class="pgn">${String(i + 1).padStart(2, "0")}</span><h3>${esc(S.nome)}</h3><em class="warn" hidden>Passou da página</em><i aria-hidden="true"></i></summary>
      <div class="more-in" data-body="${S.id}">${secBody(S)}</div></details>`).join("");
    padraoInfo();
  }
  // abrir uma página na aba Textos leva a prévia até ela
  $("txSecs").addEventListener("toggle", e => {
    if (!e.target.open || !e.target.dataset.sec) return;
    const sh = document.querySelector(`#pages .sheet[data-sec="${e.target.dataset.sec}"]`);
    if (sh && innerWidth > 860) sh.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, true);
  function redrawSection(sec) {
    const S = SCHEMA.find(x => x.id === sec), box = document.querySelector(`[data-body="${sec}"]`);
    if (S && box) box.innerHTML = secBody(S);
  }
  function getPath(path) { const parts = path.split("."); let o = state.textos; for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]]; return [o, parts[parts.length - 1]]; }
  $("txSecs").addEventListener("input", e => {
    const p = e.target.dataset.path; if (!p) return;
    const [o, k] = getPath(p); o[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (e.target.type === "checkbox") e.target.closest(".li").classList.toggle("off", !e.target.checked);
    changed();
  });
  $("txSecs").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.restore) {
      const sec = b.dataset.restore, prev = G.clone(state.textos[sec]);
      state.textos[sec] = padrao()[sec]; redrawSection(sec); changed();
      toast("Textos da página restaurados.", "", { label: "Desfazer", run: () => { state.textos[sec] = prev; redrawSection(sec); changed(); } });
      return;
    }
    const act = b.dataset.act; if (!act) return;
    const [sec, k] = b.dataset.list.split("."), arr = state.textos[sec][k], i = +b.dataset.i;
    if (act === "add") arr.push(NEW_ITEM[b.dataset.type]());
    if (act === "del") {
      const removed = arr.splice(i, 1)[0];
      toast("Item removido.", "", { label: "Desfazer", run: () => { arr.splice(i, 0, removed); redrawSection(sec); changed(); } });
    }
    if (act === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (act === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    redrawSection(sec); changed();
    if (act === "add") { const items = document.querySelectorAll(`[data-body="${sec}"] [data-path^="${sec}.${k}.${arr.length - 1}"]`); const f = [...items].find(x => x.type !== "checkbox"); f && f.focus(); }
  });

  // inserir {cliente}, *destaque* etc. no último campo usado
  let lastField = null;
  document.addEventListener("focusin", e => { if (e.target.matches("#txSecs input[type=text], #txSecs textarea, #f-assunto, #f-contexto, #f-obs")) lastField = e.target; });
  document.querySelector(".tx-tokens").addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); });
  document.querySelector(".tx-tokens").addEventListener("click", e => {
    const b = e.target.closest("button[data-token]"); if (!b) return;
    if (!lastField || !lastField.isConnected) return toast("Clique primeiro no campo onde quer inserir.", "");
    const f = lastField, tok = b.dataset.token, s0 = f.selectionStart ?? f.value.length, s1 = f.selectionEnd ?? s0;
    const sel = f.value.slice(s0, s1);
    const ins = tok === "*destaque*" ? "*" + (sel || "destaque") + "*" : tok;
    f.value = f.value.slice(0, s0) + ins + f.value.slice(s1);
    f.focus(); f.setSelectionRange(s0 + ins.length, s0 + ins.length);
    f.dispatchEvent(new Event("input", { bubbles: true }));
  });

  function padraoInfo() {
    $("padraoInfo").innerHTML = modelo
      ? `Novas propostas usam o padrão salvo${modeloEm ? " em " + esc(new Date(modeloEm).toLocaleDateString("pt-BR")) : ""}. <button type="button" class="linkish" id="btnOriginal">Voltar ao texto original da GDM</button>`
      : "Novas propostas usam o texto original da GDM.";
    const o = $("btnOriginal"); if (o) o.onclick = resetModelo;
  }
  $("btnPadrao").onclick = async () => {
    try {
      const r = await api("/api/modelo", { method: "POST", body: JSON.stringify({ textos: state.textos }) });
      if (r.status !== 200) return toast(r.data.error || "Não foi possível salvar o padrão.", "err");
      modelo = G.textosDe({ textos: r.data.textos }); modeloEm = r.data.updatedAt; padraoInfo();
      toast("Padrão salvo. Toda proposta nova começa com estes textos.", "ok");
    } catch (e) { if (e.status !== 401) toast("Sem conexão com o servidor.", "err"); }
  };
  $("btnRestaurarTudo").onclick = () => {
    const prev = G.clone(state.textos);
    state.textos = padrao(); drawTextos(); changed();
    toast(modelo ? "Textos voltaram ao padrão salvo." : "Textos voltaram ao original da GDM.", "", { label: "Desfazer", run: () => { state.textos = prev; drawTextos(); changed(); } });
  };
  async function resetModelo() {
    try {
      const r = await api("/api/modelo", { method: "DELETE" });
      if (r.status === 200) { modelo = null; modeloEm = null; padraoInfo(); toast("Padrão apagado. Novas propostas usam o texto original.", "ok"); }
    } catch (e) {}
  }
  async function loadModelo() {
    try {
      const r = await api("/api/modelo");
      if (r.status === 200 && r.data.textos) { modelo = G.textosDe({ textos: r.data.textos }); modeloEm = r.data.updatedAt; }
      padraoInfo();
    } catch (e) {}
  }

  /* ---------- prévia ---------- */
  let io = null;
  function render() {
    const box = $("pages");
    G.mount(box, G.renderPages(state), 860);
    const n = box.children.length;
    $("pager").textContent = "Página 1 de " + n;
    if (io) io.disconnect();
    io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) $("pager").textContent = "Página " + en.target.dataset.page + " de " + n; });
    }, { rootMargin: "-45% 0px -45% 0px" });
    [...box.children].forEach(c => { io.observe(c); c.title = "Editar os textos desta página"; });
    const over = G.overflowing(box);
    [...box.children].forEach(c => c.classList.toggle("over", over.includes(c.dataset.sec)));
    document.querySelectorAll("#txSecs details").forEach(d => { d.querySelector(".warn").hidden = !over.includes(d.dataset.sec); });
  }
  $("pages").addEventListener("click", e => { const sh = e.target.closest(".sheet"); if (sh && sh.dataset.sec) openSection(sh.dataset.sec); });
  let rz = null;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (!$("shell").hidden) render(); }, 90); }).observe($("preview"));

  /* ---------- PDF ---------- */
  $("btnPdf").onclick = async () => {
    const btn = $("btnPdf"), label = btn.querySelector("span");
    btn.disabled = true;
    try {
      const pdf = await G.buildPdf(state, (i, n) => { label.textContent = `Gerando ${i} de ${n}…`; });
      await G.savePdf(pdf, G.pdfName(state));
      toast("PDF baixado.", "ok");
    } catch (e) {
      toast(e.message === "libs" ? "O gerador de PDF ainda está carregando. Tente em alguns segundos." : "Não foi possível gerar o PDF.", "err");
    }
    label.textContent = "Baixar PDF"; btn.disabled = false;
  };

  /* ---------- link ---------- */
  const urlOf = slug => location.origin + "/" + slug;
  const waOf = (slug, cliente) => "https://wa.me/?text=" + encodeURIComponent(`Olá! Segue a proposta da GDM Estratégia Fiscal para ${cliente}: ${urlOf(slug)}`);
  function openModal(html) {
    $("modalCard").innerHTML = `<button class="x modal-close" type="button" id="mClose" aria-label="Fechar">×</button>` + html;
    $("modal").hidden = false; $("mClose").onclick = closeModal;
    setTimeout(() => { const f = $("modalCard").querySelector("[data-focus]"); f && f.focus(); }, 30);
  }
  function closeModal() { $("modal").hidden = true; $("modalCard").innerHTML = ""; }
  $("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("modal").hidden) closeModal(); else if (!$("drawer").hidden) closeDrawer(); } });

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); if (btn) btn.textContent = "Copiado"; toast("Link copiado.", "ok"); }
    catch (e) { prompt("Copie o link:", text); }
  }
  function linkReady(slug, cliente, updated) {
    const url = urlOf(slug);
    openModal(`<div class="okmark"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <div><h2 id="modalTitle">${updated ? "Link atualizado" : "Link pronto"}</h2><p>Quem abrir verá a vinheta "Proposta personalizada para ${esc(cliente)}", a proposta completa e o botão para baixar o PDF.</p></div>
      <div class="urlbox"><code>${esc(location.host)}/<b>${esc(slug)}</b></code><button type="button" id="mCopy" data-focus>Copiar</button></div>
      <div class="modal-act">
        <a class="btn btn-glass" href="${esc(url)}" target="_blank" rel="noopener">Abrir proposta</a>
        <a class="btn btn-gold" href="${esc(waOf(slug, cliente))}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
      </div>`);
    $("mCopy").onclick = e => copy(url, e.currentTarget);
  }
  async function save(modo, slugHint) {
    const btn = $("btnLink"); btn.disabled = true;
    try {
      const r = await api("/api/propostas", { method: "POST", body: JSON.stringify({ proposta: state, modo, slug: slugHint }) });
      if (r.status === 409) {
        const ex = r.data.existente || {};
        openModal(`<div><h2 id="modalTitle">Esse link já existe</h2><p>Já existe uma proposta para <b>${esc(ex.cliente)}</b> em ${esc(location.host)}/${esc(r.data.slug)}, salva em ${esc(new Date(ex.updatedAt).toLocaleDateString("pt-BR"))} no valor de ${esc(G.fmtMoney(ex.valor))}.</p></div>
          <div class="modal-act"><button class="btn btn-glass" type="button" id="mUpd" data-focus>Substituir a anterior</button><button class="btn btn-gold" type="button" id="mNew">Criar novo link</button></div>`);
        $("mUpd").onclick = () => save("atualizar", r.data.slug);
        $("mNew").onclick = () => save("novo", r.data.slug);
        return;
      }
      if (r.status !== 200) { toast(r.data.error || "Não foi possível salvar.", "err"); return; }
      loadedSlug = r.data.slug; changed();
      linkReady(r.data.slug, state.cliente, modo === "atualizar");
      refreshList();
    } catch (e) { if (e.status !== 401) toast("Sem conexão com o servidor.", "err"); }
    finally { btn.disabled = false; }
  }
  $("btnLink").onclick = () => {
    if (!G.slugify(state.cliente)) { setTab("dados"); toast("Preencha o nome do cliente para gerar o link.", "err"); $("f-cliente").focus(); return; }
    const sl = slugFor();
    if (loadedSlug && sl === loadedSlug) save("atualizar", loadedSlug); else save("verificar");
  };

  /* ---------- lista ---------- */
  let items = [];
  async function refreshList() {
    try { const r = await api("/api/propostas"); if (r.status === 200) { items = r.data.propostas || []; $("count").textContent = items.length; drawList(); } }
    catch (e) {}
  }
  function drawList() {
    const q = G.slugify($("busca").value);
    const vis = items.filter(p => !q || G.slugify(p.cliente).includes(q) || p.slug.includes(q));
    if (!items.length) { $("list").innerHTML = `<p class="empty">Nenhuma proposta com link ainda.<br>Preencha os dados e toque em "Gerar link".</p>`; return; }
    if (!vis.length) { $("list").innerHTML = `<p class="empty">Nada encontrado para essa busca.</p>`; return; }
    $("list").innerHTML = vis.map(p => `<div class="item" data-slug="${esc(p.slug)}">
      <div class="item-top"><b>${esc(p.cliente)}</b><span class="v">${esc(G.fmtMoney(p.valor))}</span></div>
      <small>/${esc(p.slug)} · atualizada em ${esc(new Date(p.updatedAt).toLocaleDateString("pt-BR"))}</small>
      <div class="item-act">
        <button type="button" data-a="edit">Editar</button>
        <button type="button" data-a="copy">Copiar link</button>
        <a href="${esc(waOf(p.slug, p.cliente))}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="/${esc(p.slug)}" target="_blank" rel="noopener">Abrir</a>
        <button type="button" data-a="del" class="danger">Excluir</button>
      </div></div>`).join("");
  }
  $("busca").addEventListener("input", drawList);
  $("list").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    const it = b.closest(".item"), slug = it.dataset.slug, a = b.dataset.a;
    if (a === "copy") return copy(urlOf(slug), b);
    if (a === "edit") {
      try {
        const r = await fetch("/api/proposta?slug=" + encodeURIComponent(slug)); const p = await r.json();
        if (!r.ok) return toast(p.error || "Não foi possível abrir.", "err");
        const prev = { state, loadedSlug };
        state = Object.assign({}, G.DEFAULTS, p); state.textos = G.textosDe(p); delete state.etapas;
        loadedSlug = slug; fillForm(); render(); changed(); closeDrawer(); setTab("dados");
        toast("Editando " + p.cliente + ".", "", { label: "Desfazer", run: () => { state = prev.state; loadedSlug = prev.loadedSlug; fillForm(); render(); changed(); } });
      } catch (err) { toast("Sem conexão com o servidor.", "err"); }
      return;
    }
    if (a === "del") {
      if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Confirmar exclusão"; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ""; b.textContent = "Excluir"; } }, 4000); return; }
      try {
        const r = await api("/api/propostas?slug=" + encodeURIComponent(slug), { method: "DELETE" });
        if (r.status === 200) { if (loadedSlug === slug) { loadedSlug = null; changed(); } toast("Proposta excluída. O link deixou de funcionar.", "ok"); refreshList(); }
        else toast(r.data.error || "Não foi possível excluir.", "err");
      } catch (err) {}
    }
  });
  function openDrawer() { $("drawer").hidden = false; $("scrim").hidden = false; refreshList(); setTimeout(() => $("busca").focus(), 50); }
  function closeDrawer() { $("drawer").hidden = true; $("scrim").hidden = true; }
  $("btnLista").onclick = openDrawer; $("drawerClose").onclick = closeDrawer; $("scrim").onclick = closeDrawer;

  /* ---------- nova proposta e conta ---------- */
  $("btnNova").onclick = () => {
    const prev = { state, loadedSlug };
    state = Object.assign({}, G.DEFAULTS, { cliente: "", valor: 0, obs: "", exito: "", data: G.todayISO(), textos: padrao() });
    loadedSlug = null; fillForm(); render(); changed(); setTab("dados"); $("f-cliente").focus();
    toast("Nova proposta em branco.", "", { label: "Desfazer", run: () => { state = prev.state; loadedSlug = prev.loadedSlug; fillForm(); render(); changed(); } });
  };
  $("meBtn").onclick = e => { e.stopPropagation(); const m = $("meMenu"); m.hidden = !m.hidden; $("meBtn").setAttribute("aria-expanded", String(!m.hidden)); };
  document.addEventListener("click", e => { if (!e.target.closest(".me")) { $("meMenu").hidden = true; $("meBtn").setAttribute("aria-expanded", "false"); } });
  $("btnSair").onclick = () => { key = ""; store.del(KEY_STORE); $("meMenu").hidden = true; showGate(""); };

  /* ---------- inicialização ---------- */
  function showShell() {
    $("gate").hidden = true; $("shell").hidden = false;
    $("shell").classList.add("enter"); setTimeout(() => $("shell").classList.remove("enter"), 1400);
    render(); refreshList(); loadModelo();
  }
  window.__gdmApp = { getState: () => state, playIntro };
  fillForm(); bindForm();
  (async () => {
    const [ok] = await Promise.all([checkKey(), playIntro()]);
    if (ok === true) showShell();
    else showGate(ok === null ? "Sem conexão com o servidor." : "");
  })();
})();
