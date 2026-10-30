/* GDM Proposta: template da proposta (compartilhado entre o painel, a página pública e o PDF).
   Todos os textos vêm de um objeto "textos" editável no painel. */
(function () {
  const PAGE_W = 794, PAGE_H = 1123; // A4 a 96 dpi
  const IMG = { claro: "/assets/img/logo-claro.webp", escuro: "/assets/img/logo-escuro.webp" };
  const RESERVED = ["api", "assets", "proposta", "index", "admin", "login"];

  /* ---------- símbolo GDM (três barras do logo) ---------- */
  const BARS = [[234,216,329,216,96,677,0,677],[476,0,572,0,338,461,242,461],[559,101,655,101,422,563,325,563]];
  function barsPath(dx, dy, s) {
    return BARS.map(b => "M" + [0,2,4,6].map(i => (b[i]*s+dx).toFixed(1) + " " + (b[i+1]*s+dy).toFixed(1)).join(" L") + " Z").join(" ");
  }
  const svgURI = svg => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const GOLD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E7DBA6"/><stop offset="1" stop-color="#B89C5E"/></linearGradient>`;
  function bandSVG() {
    const s = 0.24, step = 150; let d = "";
    for (let x = -40; x < PAGE_W + 60; x += step) d += barsPath(x, -92, s) + " ";
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="70" viewBox="0 0 ${PAGE_W} 70"><path d="${d}" fill="none" stroke="#D2BF86" stroke-width="1"/></svg>`);
  }
  function coverSVG() {
    let d = ""; const s = 0.5, step = 250;
    for (let x = -160; x < PAGE_W + 200; x += step) { d += barsPath(x, -200, s) + " "; d += barsPath(x + 125, 150, s) + " "; }
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="470" viewBox="0 0 ${PAGE_W} 470">
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D4A34"/><stop offset=".72" stop-color="#34402D"/><stop offset="1" stop-color="#2B3525"/></linearGradient>${GOLD}</defs>
  <path d="${d}" fill="url(#f)"/><path d="${barsPath(560,250,0.27)}" fill="url(#g)"/></svg>`);
  }
  const markSVG = () => svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 655 677"><defs>${GOLD}</defs><path d="${barsPath(0,0,1)}" fill="url(#g)"/></svg>`);
  const ART = { band: bandSVG(), cover: coverSVG(), mark: markSVG() };

  /* ---------- utilidades ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const BRL = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtMoney = cents => "R$ " + BRL.format((cents || 0) / 100);
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const clone = o => JSON.parse(JSON.stringify(o));
  function slugify(s) {
    let x = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/&/g, " e ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
    if (!x) return "";
    if (RESERVED.includes(x)) x = "proposta-" + x;
    return x;
  }
  function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function dataExtensa(iso) { const p = (iso || todayISO()).split("-"); return (MESES[parseInt(p[1],10)-1] || "") + " de " + p[0]; }
  function dataCurta(iso) { const p = (iso || todayISO()).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }

  /* número por extenso (pt-BR) */
  const UN = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const DZ = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const CT = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  function ate999(n) {
    if (n === 0) return ""; if (n === 100) return "cem";
    const c = Math.floor(n/100), r = n % 100, out = [];
    if (c) out.push(CT[c]);
    if (r) { if (r < 20) out.push(UN[r]); else { const d = Math.floor(r/10), u = r % 10; out.push(u ? DZ[d] + " e " + UN[u] : DZ[d]); } }
    return out.join(" e ");
  }
  function inteiroExtenso(n) {
    if (n === 0) return "zero";
    const grupos = []; let x = n; while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
    const nomes = [["",""],["mil","mil"],["milhão","milhões"],["bilhão","bilhões"]];
    const partes = [];
    for (let i = grupos.length - 1; i >= 0; i--) {
      const g = grupos[i]; if (!g) continue;
      const t = (i === 1 && g === 1) ? "mil" : ate999(g) + (i ? " " + (g === 1 ? nomes[i][0] : nomes[i][1]) : "");
      partes.push({ t, g, i });
    }
    let s = "";
    partes.forEach((p, k) => {
      if (k === 0) { s = p.t; return; }
      const usaE = k === partes.length - 1 && p.i === 0 && (p.g < 100 || p.g % 100 === 0);
      s += usaE ? " e " + p.t : (p.i === 0 ? " " + p.t : ", " + p.t);
    });
    return s;
  }
  function reaisExtenso(cents) {
    cents = Math.max(0, Math.round(cents || 0));
    const r = Math.floor(cents / 100), c = cents % 100; let s = "";
    if (r > 0) { s = inteiroExtenso(r); s += (r >= 1000000 && r % 1000000 === 0) ? " de reais" : (r === 1 ? " real" : " reais"); }
    if (c > 0) s += (s ? " e " : "") + inteiroExtenso(c) + (c === 1 ? " centavo" : " centavos");
    return s || "zero real";
  }

  /* ---------- textos padrão (tudo isso é editável na aba Textos) ---------- */
  const TEXTOS = {
    capa: {
      linha1: "Consultoria *Fiscal e Tributária*", linha2: "para grãos e cereais",
      rotuloDest: "Destinatário", rotuloData: "Data", rotuloValidade: "Validade"
    },
    quem: {
      eyebrow: "Quem somos", titulo: "Estratégia fiscal *para o agro crescer*",
      p1: "A GDM Estratégia Fiscal existe para desmistificar a burocracia tributária do agronegócio. Reduzimos custos fiscais e cuidamos da qualidade da sua atividade, para que a sua energia fique onde ela gera mais resultado: no desenvolvimento, na expansão e na inovação do negócio.",
      p2: "Não resolvemos apenas conflitos tributários. Alinhamos conformidade fiscal com eficiência financeira, com acompanhamento global e atualizado do panorama fiscal, sempre em defesa da empresa.",
      propositoTitulo: "Nosso propósito",
      proposito: "Transformar desafios fiscais em oportunidades de crescimento no mercado, reduzindo seus custos com transparência e simplicidade burocrática. Nosso dever é gerar ações transformadoras do campo ao mercado, contornando obstáculos em busca de impactos positivos.",
      pilaresTitulo: "Como a nossa consultoria atua",
      pilares: [
        { t: "Validar operações antes do negócio", d: "Análise tributária prévia de oportunidades e estruturas comerciais." },
        { t: "Prevenir passivos fiscais", d: "Suporte preventivo para que a rotina não vire contingência futura." },
        { t: "Esclarecer incentivos fiscais", d: "Diferimentos, suspensões e regimes especiais, e o que cada um exige." },
        { t: "Proteger os créditos", d: "Legitimidade e documentação dos créditos de ICMS, PIS e COFINS." },
        { t: "Preparar para a Reforma Tributária", d: "Impactos da CBS e do IBS e adequações para a transição." },
        { t: "Responder a demandas fiscais", d: "Orientação sobre notificações, cobranças e malha fiscal." },
        { t: "Acompanhar a legislação", d: "O produtor e a empresa do agro atentos às mudanças que importam." },
        { t: "Conectar agro e tributarista", d: "Ponte entre a rotina do campo e a técnica tributária." }
      ],
      contatoTitulo: "Um único ponto de contato",
      contato: "Quando a demanda exige atuação privativa de advogado, a GDM conduz o projeto ao lado de escritórios de advocacia parceiros, especializados em direito tributário. Você conversa com um só time do início ao fim."
    },
    contexto: {
      eyebrow: "Objetivo", titulo: "Contexto e *objetivo*",
      objetivoTitulo: "Objetivo do trabalho",
      objetivo: "Prestar suporte técnico-fiscal e tributário contínuo à equipe da {cliente}, com segurança nas operações comerciais, mitigação de riscos fiscais e tributários e suporte estratégico às decisões que envolvem a comercialização de grãos, cereais e demais produtos do agronegócio.\nA atuação é integrada e abrange toda a cadeia operacional da empresa, da negociação e aquisição dos produtos ao faturamento, transporte, armazenagem, exportação e escrituração fiscal.",
      recebeTitulo: "Benefícios para a {cliente}",
      recebe: [
        "Mais segurança fiscal nas operações de compra, venda, armazenagem, industrialização e exportação.",
        "Menor exposição a autuações, glosas de crédito e contingências fiscais.",
        "Validação prévia das operações de maior complexidade tributária.",
        "Apoio permanente às equipes fiscal, contábil, comercial, logística e administrativa.",
        "Atualização constante sobre mudanças legislativas, normativas e jurisprudenciais do agronegócio.",
        "Orientação sobre os impactos e as adaptações exigidas pela Reforma Tributária.",
        "Especialistas na tributação de grãos, sem ampliar a estrutura interna.",
        "Análises fiscal e jurídica integradas, com mais previsibilidade nas decisões."
      ]
    },
    escopo: {
      eyebrow: "Escopo", titulo: "Consultoria tributária *contínua*",
      intro: "Atendimento permanente às demandas operacionais da {cliente} ligadas às rotinas fiscais e tributárias, por meio de consultas, reuniões técnicas e pareceres, conforme a complexidade da matéria.",
      entregavelRotulo: "Inclui:",
      etapas: [
        { on: true, t: "Tributação das operações e apoio comercial", d: "Suporte rápido para oportunidades comerciais, inclusive emergenciais, operações interestaduais e expansão de mercados. Avaliação prévia dos impactos tributários de estruturas negociais e de operações não recorrentes, distribuição contratual dos riscos e responsabilidades tributárias e apoio na redação de cláusulas sobre tributos, em prazo compatível com a dinâmica das negociações.", e: "" },
        { on: true, t: "ICMS", d: "Diferimentos, suspensões, benefícios e créditos fiscais, obrigações acessórias e procedimentos operacionais relacionados ao imposto.", e: "" },
        { on: true, t: "PIS e COFINS", d: "Tratamento tributário nas operações de compra, de venda e destinadas à exportação, além dos créditos e regimes específicos aplicáveis ao setor.", e: "" },
        { on: true, t: "Reforma Tributária", d: "Impactos da CBS e do IBS, reflexos na apuração dos tributos, adequações operacionais e fiscais para a transição e avaliação das oportunidades e riscos da implementação.", e: "" },
        { on: true, t: "Procedimentos internos", d: "Avaliação dos procedimentos fiscais adotados, identificação de riscos e oportunidades tributárias, recomendações de adequação de controles e processos e fortalecimento da governança tributária.", e: "" }
      ]
    },
    invest: {
      eyebrow: "Honorários", titulo: "*Investimento*",
      intro: "Pela execução dos serviços descritos nesta proposta, a {cliente} pagará honorários mensais, líquidos dos tributos incidentes sobre o faturamento.",
      colComponente: "Componente", colValor: "Valor e condição",
      linhaTitulo: "Consultoria fiscal e tributária contínua", linhaSub: "suporte consultivo descrito no escopo desta proposta",
      exitoTitulo: "Honorários de êxito", exitoNota: "devidos somente sobre o benefício econômico efetivamente obtido",
      totalRotulo: "Investimento mensal", obsTitulo: "Prazo de contratação",
      outrosTitulo: "Outros serviços, sob proposta específica",
      outros: "Levantamentos fiscais retrospectivos, recuperação de créditos, processos administrativos ou judiciais e demais demandas fora do escopo podem ser orçados separadamente, se houver interesse."
    },
    inicio: {
      eyebrow: "Escopo", titulo: "Suporte em *operações e projetos*",
      passos: [
        { t: "Estruturação e validação de operações", d: "Venda com fim específico de exportação, operações por conta e ordem e triangulares, armazenagem em terceiros, transferências entre estabelecimentos e compras interestaduais de produtores." },
        { t: "Benefícios fiscais e créditos", d: "Diferimentos, suspensões, regimes especiais e benefícios estaduais e federais. Legitimidade dos créditos, riscos de glosa de ICMS, PIS e COFINS e créditos presumidos." },
        { t: "Aquisições de produtores rurais", d: "Riscos da cadeia de fornecimento, responsabilidade do adquirente e prevenção de passivos por irregularidades dos fornecedores." },
        { t: "Projetos e decisões estruturais", d: "Filiais, frota própria, armazenagem e secagem, reestruturação logística e novos modelos operacionais." },
        { t: "Demandas fiscais e atualização", d: "Notificações, cobranças, avisos de divergência e malha fiscal, com apoio em respostas preliminares. Monitoramento legislativo e informativos sobre mudanças relevantes." }
      ],
      docsTitulo: "Forma de atendimento",
      docs: ["E-mail", "Telefone", "WhatsApp corporativo", "Reuniões virtuais agendadas", "Pareceres e memorandos técnicos"],
      naoInclTitulo: "Limitação do escopo",
      naoIncl: [
        "Auditoria fiscal ou contábil, certificação de conformidade e revisão de escriturações e declarações.",
        "Levantamentos retrospectivos e recuperação de créditos, salvo contratação específica.",
        "Processos administrativos ou judiciais, recursos, sustentação oral e representação perante órgãos públicos."
      ],
      premissasTitulo: "Premissas",
      premissas: [
        "O trabalho parte das informações e documentos fornecidos pela {cliente}, que responde por sua veracidade e completude."
      ]
    },
    cond: {
      eyebrow: "Condições", titulo: "Condições gerais *da proposta*",
      clausulas: [
        { t: "Formalização.", d: "Aceita esta proposta, as partes formalizarão o Contrato de Prestação de Serviços de Consultoria, do qual ela fará parte como anexo. Até a assinatura do contrato, o aceite desta proposta vincula as partes nos termos aqui previstos." },
        { t: "Prazo.", d: "O contrato terá prazo mínimo de vigência de 12 (doze) meses, contados da data de sua assinatura." },
        { t: "Vencimento e faturamento.", d: "Os honorários são mensais e vencem conforme a condição indicada no item Investimento. As notas fiscais serão enviadas ao e-mail informado com antecedência mínima de 5 (cinco) dias úteis do vencimento." },
        { t: "Inadimplemento.", d: "O atraso no pagamento sujeita o valor devido a multa de 2% (dois por cento) e correção monetária até o efetivo pagamento, e autoriza a suspensão dos serviços até a regularização." },
        { t: "Tributos.", d: "Os honorários são líquidos. Os tributos incidentes sobre o faturamento, inclusive os sujeitos à retenção na fonte, serão acrescidos ao valor faturado." },
        { t: "Despesas.", d: "Custas, taxas, deslocamentos e serviços de terceiros, quando necessários, correm por conta da contratante e dependem de sua aprovação prévia." },
        { t: "Atuação jurídica.", d: "Demandas que exijam atuação privativa de advogado serão conduzidas por escritório parceiro, mediante contratação própria, com acompanhamento da GDM." },
        { t: "Natureza da obrigação.", d: "Os serviços de consultoria constituem obrigação de meio, e não de resultado. Ressalvadas as hipóteses de dolo, a responsabilidade da GDM limita-se aos honorários efetivamente recebidos." },
        { t: "Confidencialidade e proteção de dados.", d: "Informações e documentos recebidos serão usados exclusivamente na execução dos serviços, mantidos em sigilo e tratados nos termos da Lei nº 13.709/2018 (LGPD)." },
        { t: "Anticorrupção.", d: "As partes obrigam-se a cumprir a Lei nº 12.846/2013, abstendo-se de oferecer, prometer ou efetuar qualquer vantagem indevida relacionada a esta contratação." },
        { t: "Assinatura eletrônica.", d: "As partes reconhecem a validade da assinatura eletrônica desta proposta e do contrato." },
        { t: "Validade e aceite.", d: "Esta proposta é válida por {validade} ({validade_extenso}) dias a partir de {data}. Estando de acordo, basta assinar no campo abaixo ou confirmar o aceite por escrito." }
      ],
      fechamento: "Permanecemos à disposição para quaisquer esclarecimentos e esperamos contribuir para o fortalecimento da governança tributária e da segurança fiscal das operações da {cliente}.",
      assinaGdm: "GDM Estratégia Fiscal", assinaCliente: "De acordo · {cliente}", assinaClienteSub: "Nome, cargo e data"
    },
    contra: {
      tag: "Estratégia tributária com visão de negócio",
      whatsapp: "(65) 99696-3745", site: "gdmestrategiafiscal.com.br", instagram: "@gdm_estrategia_fiscal",
      endereco: "Rua Teodorico Pereira, 131, Bairro Novo Horizonte, Nortelândia/MT, CEP 78430-000"
    }
  };

  const DEFAULTS = {
    cliente: "Futuro Cereais",
    valor: 1500000,
    condicao: "por mês, líquido de tributos",
    obs: "O contrato terá prazo mínimo de vigência de 12 (doze) meses, contados da data de sua assinatura. O valor contempla o suporte consultivo fiscal e tributário contínuo descrito no escopo desta proposta.",
    assunto: "Suporte fiscal e tributário contínuo para a comercialização de grãos, cereais e demais produtos do agronegócio.",
    contexto: "No mercado de grãos e commodities agrícolas, a {cliente} frequentemente se depara com oportunidades comerciais que exigem rápida avaliação tributária e fiscal, especialmente em operações interestaduais, novas rotas de comercialização e negociações que pedem resposta imediata.\nNesses cenários, um suporte consultivo especializado e ágil é fundamental para subsidiar as decisões da equipe comercial, avaliar corretamente os impactos tributários das operações, mitigar riscos fiscais e preservar a competitividade e a rentabilidade dos negócios.",
    exito: "", data: todayISO(), validade: 30, cidade: "Nortelândia/MT", resp: "Arminda Frota"
  };

  // Junta os textos salvos com o padrão (preenche o que faltar; propostas antigas usavam "etapas" como lista de ids).
  const ETAPA_IDS = ["diag", "mapa", "plano", "acomp"];
  function textosDe(s) {
    const t = (s && s.textos) || {}, out = {};
    for (const k in TEXTOS) out[k] = Object.assign(clone(TEXTOS[k]), t[k] && typeof t[k] === "object" ? clone(t[k]) : {});
    if (!(t.escopo && Array.isArray(t.escopo.etapas)) && s && Array.isArray(s.etapas))
      out.escopo.etapas = TEXTOS.escopo.etapas.map((e, i) => Object.assign(clone(e), { on: s.etapas.includes(ETAPA_IDS[i]) }));
    return out;
  }
  const whatsDigits = w => { const d = String(w || "").replace(/\D/g, ""); return d.length >= 10 && d.length <= 11 ? "55" + d : d; };

  /* ---------- páginas ---------- */
  function renderPages(input) {
    const s = Object.assign({}, DEFAULTS, input);
    const X = textosDe(s);
    const validade = Math.max(1, parseInt(s.validade, 10) || 30);
    const vars = {
      cliente: s.cliente || "Cliente", valor: fmtMoney(s.valor), valor_extenso: reaisExtenso(s.valor),
      validade: String(validade), validade_extenso: inteiroExtenso(validade), data: dataCurta(s.data),
      cidade: s.cidade || "", condicao: s.condicao || ""
    };
    // T(): escapa, troca {variáveis} e transforma *trecho* em destaque.
    const T = str => esc(str).replace(/\{([a-z_]+)\}/g, (m, k) => k in vars ? esc(vars[k]) : m).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
    const P = str => String(str || "").split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p class="just">${T(x)}</p>`).join("");
    const LI = arr => (arr || []).filter(x => String(x).trim()).map(x => `<li>${T(x)}</li>`).join("");
    const head = (e, t) => `<div><div class="eyebrow"><img src="${ART.mark}" alt="">${T(e)}</div><h2 class="sec">${T(t)}</h2></div>`;
    const foot = n => `<div class="foot"><span>GDM Estratégia Fiscal · Proposta ${esc(vars.cliente)}</span><span>${String(n).padStart(2,"0")}</span></div>`;
    const band = `<img class="band" src="${ART.band}" alt="">`;
    const etapas = (X.escopo.etapas || []).filter(e => e.on !== false && String(e.t || "").trim());
    let n = 1; const pages = [];

    pages.push(`<div class="pg dark">
      <img class="cover-art" src="${ART.cover}" alt="">
      <div class="cover-in">
        <img class="logo" src="${IMG.claro}" alt="GDM Estratégia Fiscal e Comércio de Grãos">
        <h1>${T(X.capa.linha1)}<br>${T(X.capa.linha2)}</h1>
        <p class="sub">${T(s.assunto)}</p>
      </div>
      <dl class="cover-meta">
        <dt>${T(X.capa.rotuloDest)}</dt><dd>${esc(vars.cliente)}</dd>
        <dt>${T(X.capa.rotuloData)}</dt><dd>${esc(s.cidade || "")}${s.cidade ? ", " : ""}${dataExtensa(s.data)}</dd>
        <dt>${T(X.capa.rotuloValidade)}</dt><dd>${validade} dias</dd>
      </dl>
      <div class="cover-line"></div>
    </div>`);

    const Q = X.quem;
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(Q.eyebrow, Q.titulo)}
        ${Q.p1 ? `<p class="lead">${T(Q.p1)}</p>` : ""}${Q.p2 ? `<p class="lead">${T(Q.p2)}</p>` : ""}
        ${Q.proposito ? `<div class="box-g"><h4>${T(Q.propositoTitulo)}</h4>${P(Q.proposito)}</div>` : ""}
        ${(Q.pilares || []).length ? `<div class="h3">${T(Q.pilaresTitulo)}</div>
        <div class="pillars">${Q.pilares.filter(p => String(p.t || "").trim()).map(p => `<div class="pill"><img src="${ART.mark}" alt=""><div><b>${T(p.t)}</b><span>${T(p.d)}</span></div></div>`).join("")}</div>` : ""}
        ${Q.contato ? `<div class="box"><div class="h3">${T(Q.contatoTitulo)}</div>${P(Q.contato)}</div>` : ""}
      </div>${foot(n)}</div>`);

    const C = X.contexto;
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(C.eyebrow, C.titulo)}
        <div class="box">${P(String(s.contexto || "")) || '<p class="just">Descreva o contexto do cliente na aba Dados.</p>'}</div>
        ${C.objetivo ? `<div class="box-g"><h4>${T(C.objetivoTitulo)}</h4>${P(C.objetivo)}</div>` : ""}
        ${(C.recebe || []).length ? `<div class="h3">${T(C.recebeTitulo)}</div><ul class="dots">${LI(C.recebe)}</ul>` : ""}
      </div>${foot(n)}</div>`);

    const E = X.escopo;
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(E.eyebrow, E.titulo)}
        ${E.intro ? `<p class="lead">${T(E.intro)}</p>` : ""}
        <div class="steps">${etapas.map((e, i) => `<div class="step"><div class="n">${i+1}</div><div><h5>${T(e.t)}</h5>${P(e.d)}${String(e.e || "").trim() ? `<p class="del"><b>${T(E.entregavelRotulo)}</b> ${T(e.e)}</p>` : ""}</div></div>`).join("") || "<p>Inclua ao menos uma etapa na aba Textos.</p>"}</div>
      </div>${foot(n)}</div>`);

    const I = X.invest;
    const sub = String(I.linhaSub || "").trim() ? T(I.linhaSub) : etapas.map(e => esc(String(e.t).toLowerCase())).join(", ");
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(I.eyebrow, I.titulo)}
        ${I.intro ? `<p class="lead">${T(I.intro)}</p>` : ""}
        <div class="tbl">
          <div class="th"><span>${T(I.colComponente)}</span><span>${T(I.colValor)}</span></div>
          <div class="tr"><div><b>${T(I.linhaTitulo)}</b><small>${sub}</small></div>
            <div class="val"><b>${esc(vars.valor)}</b><small>${esc(s.condicao || "")}</small></div></div>
          ${s.exito ? `<div class="tr alt"><div><b>${T(I.exitoTitulo)}</b><small>${T(I.exitoNota)}</small></div><div class="val"><b style="font-size:12.5px">${esc(s.exito)}</b></div></div>` : ""}
        </div>
        <div class="total">
          <span class="lbl">${T(I.totalRotulo)}</span><span class="big">${esc(vars.valor)}</span>
          <span class="ext">(${esc(vars.valor_extenso)}), ${esc(s.condicao || "conforme condição acordada")}${s.exito ? ", além dos honorários de êxito descritos acima" : ""}.</span>
        </div>
        ${String(s.obs || "").trim() ? `<div class="obs"><h4>${T(I.obsTitulo)}</h4><p>${esc(String(s.obs).trim())}</p></div>` : ""}
        ${I.outros ? `<div class="h3">${T(I.outrosTitulo)}</div>${P(I.outros)}` : ""}
      </div>${foot(n)}</div>`);

    const N = X.inicio;
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(N.eyebrow, N.titulo)}
        ${(N.passos || []).length ? `<div class="steps">${N.passos.filter(p => String(p.t || "").trim()).map((p, i) => `<div class="step"><div class="n">${i+1}</div><div><h5>${T(p.t)}</h5>${P(p.d)}</div></div>`).join("")}</div>` : ""}
        ${(N.docs || []).length ? `<div class="h3">${T(N.docsTitulo)}</div><div class="chips">${N.docs.filter(x => String(x).trim()).map(x => `<span>${T(x)}</span>`).join("")}</div>` : ""}
        ${(N.naoIncl || []).length ? `<div class="box-g"><h4>${T(N.naoInclTitulo)}</h4><ul class="dots">${LI(N.naoIncl)}</ul></div>` : ""}
        ${(N.premissas || []).length ? `<div class="box"><div class="h3">${T(N.premissasTitulo)}</div><ul class="dots">${LI(N.premissas)}</ul></div>` : ""}
      </div>${foot(n)}</div>`);

    const K = X.cond;
    n++; pages.push(`<div class="pg">${band}<div class="body">
        ${head(K.eyebrow, K.titulo)}
        <ol class="clauses">${(K.clausulas || []).filter(c => String(c.t || c.d || "").trim()).map(c => `<li><span><b>${T(c.t)}</b> ${T(c.d)}</span></li>`).join("")}</ol>
        ${K.fechamento ? `<p>${T(K.fechamento)}</p>` : ""}
        <div class="sign">
          <div><b>${T(K.assinaGdm)}</b><small>${esc(s.resp || "Responsável pela GDM")}</small></div>
          <div><b>${T(K.assinaCliente)}</b><small>${T(K.assinaClienteSub)}</small></div>
        </div>
      </div>${foot(n)}</div>`);

    const Z = X.contra;
    const contato = [Z.whatsapp && `<b>WhatsApp</b> ${T(Z.whatsapp)}`, Z.site && `<b>Site</b> ${T(Z.site)}`, Z.instagram && `<b>Instagram</b> ${T(Z.instagram)}`].filter(Boolean).join(" · ");
    pages.push(`<div class="pg dark">
      <img class="cover-art" src="${ART.cover}" alt="" style="opacity:.55">
      <div class="back-in"><img class="logo" src="${IMG.claro}" alt="GDM"><span class="tag">${T(Z.tag)}</span></div>
      <div class="back-contact"><span>${contato}</span>${Z.endereco ? `<span>${T(Z.endereco)}</span>` : ""}</div>
    </div>`);
    return pages;
  }

  /* página de cada seção (usado para ligar a prévia à aba Textos) */
  const SECOES = ["capa", "quem", "contexto", "escopo", "invest", "inicio", "cond", "contra"];

  /* monta as folhas em escala dentro de um container */
  function mount(container, pages, maxW) {
    const avail = Math.max(240, Math.min(maxW || 9999, container.clientWidth));
    const sc = Math.min(1, avail / PAGE_W);
    container.innerHTML = pages.map((p, i) =>
      `<div class="sheet" data-page="${i+1}" data-sec="${SECOES[i] || ""}" style="width:${PAGE_W*sc}px;height:${PAGE_H*sc}px">${p.replace('<div class="pg', '<div style="transform:scale(' + sc + ')" class="pg')}</div>`).join("");
    return sc;
  }
  // Páginas cujo texto passou da área útil da folha.
  function overflowing(container) {
    return [...container.querySelectorAll(".sheet")].filter(sh => {
      const b = sh.querySelector(".pg .body"); return b && b.scrollHeight > b.clientHeight + 2;
    }).map(sh => sh.dataset.sec);
  }

  /* ---------- PDF (html2canvas + jsPDF) ---------- */
  async function buildPdf(s, onProgress) {
    if (!window.html2canvas || !window.jspdf) throw new Error("libs");
    try { await document.fonts.ready; } catch (e) {}
    let host = document.getElementById("exportHost");
    if (!host) { host = document.createElement("div"); host.id = "exportHost"; host.setAttribute("aria-hidden", "true"); document.body.appendChild(host); }
    host.innerHTML = renderPages(s).join("");
    const imgs = [...host.querySelectorAll("img")];
    await Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; })));
    const pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const nodes = [...host.children];
    for (let i = 0; i < nodes.length; i++) {
      onProgress && onProgress(i + 1, nodes.length);
      const canvas = await window.html2canvas(nodes[i], { scale: 2, backgroundColor: null, logging: false, width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W, useCORS: true });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }
    host.innerHTML = "";
    pdf.setProperties({ title: "Proposta GDM · " + (s.cliente || ""), author: "GDM Estratégia Fiscal" });
    return pdf;
  }
  const pdfName = s => "Proposta GDM - " + (String(s.cliente || "cliente").replace(/[\\/:*?"<>|]+/g, "").trim() || "cliente") + ".pdf";
  const savePdf = async (pdf, name) => pdf.save(name);

  window.GDM = { savePdf, PAGE_W, PAGE_H, ART, IMG, TEXTOS, DEFAULTS, SECOES, textosDe, whatsDigits, clone, esc, fmtMoney, BRL,
    reaisExtenso, inteiroExtenso, slugify, todayISO, dataExtensa, renderPages, mount, overflowing, buildPdf, pdfName };
})();
