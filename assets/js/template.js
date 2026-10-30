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

  function dataLonga(iso) { const p = (iso || todayISO()).split("-"); return parseInt(p[2], 10) + " de " + (MESES[parseInt(p[1],10)-1] || "") + " de " + p[0]; }

  /* ---------- textos padrão (tudo isso é editável na aba Textos) ----------
     Cada seção tem a lista "off" com os itens que ficam fora da proposta:
     "_secao" tira a seção inteira, "paragrafos.1" tira um item de lista, "intro21" tira um campo. */
  const VERSAO = "2";
  const TEXTOS = {
    capa: {
      off: [],
      linha1: "PROPOSTA DE *PRESTAÇÃO DE SERVIÇOS*", linha2: "",
      rotuloDest: "Destinatário", rotuloData: "Data", rotuloValidade: "Validade"
    },
    quem: {
      off: [],
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
    objetivo: {
      off: [],
      eyebrow: "", titulo: "1. *OBJETIVO*",
      paragrafos: [
        "A presente proposta tem por objetivo prestar suporte técnico-fiscal e tributário contínuo à equipe da *{cliente}*, proporcionando segurança nas operações comerciais, mitigação de riscos fiscais e tributários e suporte estratégico para tomada de decisões envolvendo a comercialização de grãos, cereais e demais produtos do agronegócio.",
        "A atuação será realizada de forma integrada, abrangendo toda a cadeia operacional da empresa, desde a negociação e aquisição dos produtos até o faturamento, transporte, armazenagem, exportação e escrituração fiscal.",
        "Considerando a dinâmica do mercado de grãos e commodities agrícolas, a *{cliente}* frequentemente se depara com oportunidades comerciais que exigem rápida avaliação tributária e fiscal, especialmente em operações interestaduais, novas rotas de comercialização e negociações que demandam resposta imediata ao mercado. Nesses cenários, a disponibilidade de suporte consultivo especializado e ágil torna-se fundamental para subsidiar a tomada de decisões da equipe comercial, permitindo a correta avaliação dos impactos tributários das operações, a mitigação de riscos fiscais e a preservação da competitividade e da rentabilidade dos negócios."
      ]
    },
    escopo: {
      off: [],
      eyebrow: "", titulo: "2. *ESCOPO DOS SERVIÇOS*",
      sub21: "2.1 Consultoria Tributariamente Contínua",
      intro21: "A consultoria tributária fiscal compreende atendimento permanente às demandas operacionais da {cliente} relacionadas às rotinas tributárias e fiscais, incluindo:",
      grupos21: [
        { t: "Tributação das Operações", itens: [
          "Distribuição contratual dos riscos tributários;",
          "Responsabilidades tributárias das partes;",
          "Impactos fiscais das condições negociais estabelecidas;",
          "Suporte à elaboração de cláusulas relacionadas a tributos;",
          "Suporte tributário rápido para análise de oportunidades comerciais emergenciais;",
          "Orientação fiscal e tributária para operações interestaduais e expansão de mercados;",
          "Avaliação preliminar dos impactos tributários de estruturas negociais antes da formalização dos negócios;",
          "Apoio à equipe comercial na definição de estratégias que conciliem competitividade comercial e conformidade tributária;",
          "Disponibilização de orientação consultiva em prazo compatível com a dinâmica das negociações e oportunidades de mercado;",
          "Análise dos reflexos tributários de operações não recorrentes ou com estruturas diferenciadas de comercialização."] },
        { t: "ICMS", itens: [
          "Diferimentos;", "Suspensões;", "Benefícios fiscais;", "Créditos fiscais;", "Obrigações acessórias;",
          "Procedimentos operacionais relacionados ao imposto."] },
        { t: "PIS e COFINS", itens: [
          "Tratamento tributário nas operações de compra;", "Tratamento tributário nas operações de venda;",
          "Operações destinadas à exportação;", "Créditos e regimes específicos aplicáveis ao setor."] },
        { t: "Reforma Tributária", itens: [
          "Orientações acerca dos impactos da CBS e do IBS;", "Reflexos na apuração dos tributos;",
          "Adequações operacionais e fiscais necessárias para a transição ao novo modelo tributário;",
          "Avaliação de oportunidades e riscos decorrentes da implementação da Reforma Tributária."] },
        { t: "Procedimentos Internos", itens: [
          "Avaliação dos procedimentos fiscais atualmente adotados pela empresa;", "Identificação de riscos tributários;",
          "Identificação de oportunidades tributárias;", "Recomendações de adequação de controles e processos;",
          "Orientação para fortalecimento da governança tributária."] }
      ],
      lim21Titulo: "Limitação do Escopo",
      lim21Intro: "Os serviços de consultoria fiscal não abrangem:",
      lim21: [
        "Auditoria fiscal;", "Revisão ou validação da escrituração fiscal;", "Revisão de declarações fiscais;",
        "Certificação de conformidade tributária;",
        "Levantamentos fiscais retrospectivos ou trabalhos de recuperação de créditos, salvo contratação específica."
      ],
      sub22: "2.2 Consultoria Tributária Contínua",
      intro22: "Prestação de suporte tributário permanente para análise de situações tributárias relevantes à operação da {cliente}, por meio de consultas, reuniões técnicas e emissão de pareceres tributários, conforme a complexidade da matéria.",
      contempla: "*O escopo contempla:*",
      grupos22: [
        { t: "Estruturação e Validação de Operações", itens: [
          "Venda com fim específico de exportação;", "Operações por conta e ordem;", "Operações triangulares;",
          "Remessas para armazenagem em terceiros;", "Transferências entre estabelecimentos;",
          "Compras interestaduais de produtores rurais."] },
        { t: "Benefícios Fiscais e Regimes Especiais", itens: [
          "Preservação de diferimentos;", "Suspensões tributárias;", "Regimes especiais;",
          "Benefícios fiscais estaduais e federais;", "Validação da documentação necessária para manutenção dos incentivos."] },
        { t: "Suporte às Aquisições de Produtores Rurais", itens: [
          "Avaliação de riscos tributários da cadeia de fornecimento;", "Responsabilidade tributária do adquirente;",
          "Procedimentos cadastrais e documentais relacionados aos fornecedores;",
          "Orientação preventiva para mitigação de passivos fiscais decorrentes de irregularidades dos fornecedores."] },
        { t: "Créditos Tributários", itens: [
          "Orientação quanto à legitimidade dos créditos tributários;", "Análise de riscos de glosa de créditos de ICMS;",
          "Análise de riscos de glosa de créditos de PIS e COFINS;", "Créditos presumidos e regimes especiais;",
          "Orientações acerca da documentação suporte dos créditos."] },
        { t: "Apoio às Negociações Comerciais", itens: [
          "Distribuição contratual dos riscos tributários;", "Responsabilidades tributárias das partes;",
          "Impactos fiscais das condições negociais estabelecidas;", "Suporte à elaboração de cláusulas relacionadas a tributos."] },
        { t: "Projetos e Decisões Estruturais", itens: [
          "Abertura e encerramento de filiais;", "Operações com frota própria;", "Prestação de serviços de armazenagem;",
          "Prestação de serviços de secagem;", "Reestruturação logística;",
          "Avaliação de impactos tributários em novos modelos operacionais."] },
        { t: "Atendimento a Demandas Fiscais", itens: [
          "Análise de notificações fiscais;", "Cartas de cobrança;", "Avisos de divergência;", "Apontamentos de malha fiscal;",
          "Orientação quanto às medidas cabíveis;", "Apoio técnico para elaboração de respostas preliminares."] },
        { t: "Atualização Tributária Permanente", itens: [
          "Monitoramento legislativo;", "Informativos sobre alterações legais relevantes;",
          "Divulgação de decisões administrativas e judiciais com potencial impacto à atividade da empresa;",
          "Orientação prática sobre os efeitos das mudanças normativas;",
          "Compartilhamento de oportunidades tributárias identificadas durante o acompanhamento da legislação e jurisprudência."] }
      ],
      lim22Titulo: "Limitação do Escopo",
      lim22Intro: "Os serviços não abrangem:",
      lim22: [
        "Auditoria fiscal ou contábil;", "Revisão de escriturações;", "Elaboração de declarações fiscais;",
        "Patrocínio de processos administrativos ou judiciais;", "Elaboração de recursos administrativos ou judiciais;",
        "Sustentação oral e representação perante órgãos públicos, salvo contratação específica."
      ]
    },
    atendimento: {
      off: [],
      eyebrow: "", titulo: "3. *FORMA DE ATENDIMENTO*",
      intro: "Os atendimentos poderão ser realizados por meio de:",
      itens: [
        "E-mail;", "Telefone;", "WhatsApp corporativo;",
        "Reuniões virtuais e reuniões periódicas de alinhamento estratégico, quando necessário, previamente agendadas.",
        "Emissão de pareceres, memorandos e orientações técnicas."
      ]
    },
    prazo: {
      off: [],
      eyebrow: "", titulo: "4. *PRAZO DE CONTRATAÇÃO*",
      texto: "O contrato terá prazo mínimo de vigência de *12 (doze) meses*, contados da data de sua assinatura."
    },
    honorarios: {
      off: [],
      eyebrow: "", titulo: "5. *HONORÁRIOS*",
      intro: "Pela execução dos serviços descritos nesta proposta, a {cliente} pagará honorários mensais de:",
      rotulo: "",
      liquido: "*Valor líquido dos tributos incidentes sobre o faturamento.*",
      contempla: "O valor contempla o suporte consultivo fiscal e tributário contínuo descrito no escopo desta proposta.",
      exitoTitulo: "Honorários de êxito", obsTitulo: "Observação"
    },
    beneficios: {
      off: [],
      eyebrow: "", titulo: "6. *BENEFÍCIOS PARA A {cliente}*",
      intro: "A contratação da consultoria fiscal e tributária contínua proporcionará à {cliente}:",
      itens: [
        "Maior segurança fiscal e tributária nas operações de compra, venda, armazenagem, industrialização e exportação;",
        "Redução da exposição a autuações, glosas de crédito e contingências fiscais;",
        "Suporte técnico especializado para validação prévia de operações com maior complexidade tributária;",
        "Apoio permanente às equipes fiscal, contábil, comercial, logística e administrativa na tomada de decisões;",
        "Atualização constante sobre alterações legislativas, normativas e jurisprudenciais relevantes ao setor do agronegócio;",
        "Identificação de riscos e oportunidades tributárias inerentes às operações da empresa;",
        "Orientação quanto aos impactos e adaptações necessários em razão da implementação da Reforma Tributária;",
        "Acesso a profissionais especializados na tributação do agronegócio e da comercialização de grãos, sem necessidade de ampliação da estrutura interna;",
        "Integração entre as análises fiscal e jurídica, proporcionando maior consistência, segurança e previsibilidade às decisões empresariais;",
        "Suporte preventivo, evitando que questões operacionais se transformem em contingências fiscais futuras."
      ]
    },
    final: {
      off: ["assinaCliente"],
      eyebrow: "", titulo: "7. *CONSIDERAÇÕES FINAIS*",
      paragrafos: [
        "A presente proposta contempla atendimento consultivo contínuo, preventivo e estratégico, voltado à mitigação de riscos e ao suporte das operações rotineiras da {cliente}, permitindo que as decisões tributárias sejam tomadas com maior previsibilidade, segurança e eficiência.",
        "O trabalho será desenvolvido em estreita cooperação com as equipes da {cliente}, buscando soluções práticas, juridicamente seguras e alinhadas às particularidades do mercado de grãos e commodities agrícolas.",
        "Permanecemos à disposição para quaisquer esclarecimentos adicionais e esperamos contribuir para o fortalecimento da governança tributária e da segurança fiscal das operações da empresa."
      ],
      resumo: [
        "*Investimento Mensal:* {valor} ({valor_extenso}) líquidos de tributos.",
        "*Prazo Mínimo de Contratação:* 12 (doze) meses.",
        "*Validade da Proposta:* {validade} dias."
      ],
      saudacao: "Atenciosamente,",
      encerramento: "E, por estarem assim justas e contratadas, as partes firmam o presente em duas vias de igual teor.",
      dataLinha: "Data: {data_longa}.",
      assinaGdm: "GDM ESTRATÉGIA FISCAL", assinaTag: "Estratégia tributária com visão de negócio.",
      assinaCliente: "De acordo · {cliente}", assinaClienteSub: "Nome, cargo e data"
    },
    cond: {
      off: ["_secao"],
      eyebrow: "", titulo: "Condições gerais *da proposta*",
      clausulas: [
        { t: "Formalização.", d: "Aceita esta proposta, as partes formalizarão o Contrato de Prestação de Serviços de Consultoria, do qual ela fará parte como anexo. Até a assinatura do contrato, o aceite desta proposta vincula as partes nos termos aqui previstos." },
        { t: "Vencimento e faturamento.", d: "Os honorários são mensais e vencem conforme a condição indicada no item Honorários. As notas fiscais serão enviadas ao e-mail informado com antecedência mínima de 5 (cinco) dias úteis do vencimento." },
        { t: "Inadimplemento.", d: "O atraso no pagamento sujeita o valor devido a multa de 2% (dois por cento) e correção monetária até o efetivo pagamento, e autoriza a suspensão dos serviços até a regularização." },
        { t: "Despesas.", d: "Custas, taxas, deslocamentos e serviços de terceiros, quando necessários, correm por conta da contratante e dependem de sua aprovação prévia." },
        { t: "Atuação jurídica.", d: "Demandas que exijam atuação privativa de advogado serão conduzidas por escritório parceiro, mediante contratação própria, com acompanhamento da GDM." },
        { t: "Natureza da obrigação.", d: "Os serviços de consultoria constituem obrigação de meio, e não de resultado. Ressalvadas as hipóteses de dolo, a responsabilidade da GDM limita-se aos honorários efetivamente recebidos." },
        { t: "Confidencialidade e proteção de dados.", d: "Informações e documentos recebidos serão usados exclusivamente na execução dos serviços, mantidos em sigilo e tratados nos termos da Lei nº 13.709/2018 (LGPD)." },
        { t: "Anticorrupção.", d: "As partes obrigam-se a cumprir a Lei nº 12.846/2013, abstendo-se de oferecer, prometer ou efetuar qualquer vantagem indevida relacionada a esta contratação." },
        { t: "Assinatura eletrônica.", d: "As partes reconhecem a validade da assinatura eletrônica desta proposta e do contrato." }
      ]
    },
    contra: {
      off: [],
      tag: "Estratégia tributária com visão de negócio",
      whatsapp: "(65) 99696-3745", site: "gdmestrategiafiscal.com.br", instagram: "@gdm_estrategia_fiscal",
      endereco: "Rua Teodorico Pereira, 131, Bairro Novo Horizonte, Nortelândia/MT, CEP 78430-000"
    }
  };

  const DEFAULTS = {
    cliente: "Futuro Cereais",
    valor: 1500000,
    condicao: "por mês",
    obs: "",
    assunto: "Consultoria Fiscal e Tributária para Comercialização de Grãos e Cereais",
    contexto: "",
    exito: "", data: todayISO(), validade: 30, cidade: "Nortelândia/MT", resp: "Arminda Frota",
    ocultar: {}
  };

  // Campos da aba Dados que podem sair da proposta, e as variáveis que deixam de existir quando saem.
  const CAMPOS = ["cliente", "valor", "condicao", "obs", "assunto", "contexto", "exito", "data", "validade", "cidade", "resp"];
  const VARS_DO_CAMPO = { valor: ["valor", "valor_extenso"], condicao: ["condicao"], data: ["data", "data_longa"],
    validade: ["validade", "validade_extenso"], cidade: ["cidade"], resp: ["resp"] };
  const SEM_NOME = "CONTRATANTE"; // usado no lugar do nome quando o nome do cliente sai da proposta

  // Junta os textos salvos com o padrão. Textos do modelo anterior (sem versão) são trocados pelo padrão atual.
  function textosDe(s) {
    const t = (s && s.textos && s.textos.v === VERSAO) ? s.textos : {}, out = { v: VERSAO };
    for (const k in TEXTOS) out[k] = Object.assign(clone(TEXTOS[k]), t[k] && typeof t[k] === "object" ? clone(t[k]) : {});
    return out;
  }
  const whatsDigits = w => { const d = String(w || "").replace(/\D/g, ""); return d.length >= 10 && d.length <= 11 ? "55" + d : d; };
  const oculto = (s, k) => Boolean(s && s.ocultar && s.ocultar[k]);
  const nomeVisivel = s => oculto(s, "cliente") ? "" : String((s && s.cliente) || "").trim();

  /* ---------- páginas ---------- */
  const SECOES = ["capa", "quem", "objetivo", "escopo", "atendimento", "prazo", "honorarios", "beneficios", "final", "cond", "contra"];
  const NOVA_PAGINA = { quem: true, objetivo: true, cond: true };

  function renderPages(input) {
    const s = Object.assign({}, DEFAULTS, input);
    const X = textosDe(s);
    const hide = k => oculto(s, k);
    const validade = Math.max(1, parseInt(s.validade, 10) || 30);
    const nome = hide("cliente") ? "" : (s.cliente || "");
    const vars = {
      cliente: nome || SEM_NOME, valor: fmtMoney(s.valor), valor_extenso: reaisExtenso(s.valor),
      validade: String(validade), validade_extenso: inteiroExtenso(validade), data: dataCurta(s.data), data_longa: dataLonga(s.data),
      cidade: s.cidade || "", condicao: s.condicao || "", resp: s.resp || ""
    };
    const semVar = new Set(); for (const k in VARS_DO_CAMPO) if (hide(k)) VARS_DO_CAMPO[k].forEach(v => semVar.add(v));
    // T(): escapa, troca {variáveis} e transforma *trecho* em destaque.
    const T = str => esc(str).replace(/\{([a-z_]+)\}/g, (m, k) => k in vars ? esc(vars[k]) : m).replace(/\*([^*\n]+)\*/g, "<b>$1</b>");
    // ok(): o texto existe e não depende de um dado que saiu da proposta.
    const ok = str => String(str || "").trim() !== "" && ![...String(str).matchAll(/\{([a-z_]+)\}/g)].some(m => semVar.has(m[1]));
    const on = (sec, path) => !(X[sec].off || []).includes(path);
    const txt = (sec, k) => on(sec, k) && ok(X[sec][k]) ? X[sec][k] : "";
    const vis = (sec, k) => (X[sec][k] || []).map((x, i) => [x, i]).filter(([x, i]) => on(sec, k + "." + i));
    const P = str => String(str || "").split(/\n+/).map(x => x.trim()).filter(ok).map(x => `<p class="just">${T(x)}</p>`).join("");
    const LI = arr => arr.filter(ok).map(x => `<li>${T(x)}</li>`).join("");
    const band = `<img class="band" src="${ART.band}" alt="">`;

    // Blocos de cada seção; depois são distribuídos nas folhas conforme cabem.
    const B = [];
    const add = (sec, html, keep) => { if (html) B.push({ sec, html, keep: !!keep }); };
    const head = sec => {
      const e = txt(sec, "eyebrow"), t = txt(sec, "titulo");
      if (!e && !t) return;
      add(sec, `<div class="shead">${e ? `<div class="eyebrow"><img src="${ART.mark}" alt="">${T(e)}</div>` : ""}${t ? `<h2 class="sec">${T(t)}</h2>` : ""}</div>`, true);
    };
    const secao = sec => on(sec, "_secao");
    // listas entram item por item, para poderem continuar na folha seguinte
    const lista = (sec, arr) => arr.filter(ok).forEach(x => add(sec, `<ul class="dots dots-c"><li>${T(x)}</li></ul>`));

    if (secao("quem")) {
      const Q = X.quem, sec = "quem";
      head(sec);
      if (txt(sec, "p1")) add(sec, `<p class="lead">${T(Q.p1)}</p>`);
      if (txt(sec, "p2")) add(sec, `<p class="lead">${T(Q.p2)}</p>`);
      if (txt(sec, "proposito")) add(sec, `<div class="box-g">${txt(sec, "propositoTitulo") ? `<h4>${T(Q.propositoTitulo)}</h4>` : ""}${P(Q.proposito)}</div>`);
      const pil = vis(sec, "pilares").filter(([p]) => ok(p.t));
      if (pil.length) {
        if (txt(sec, "pilaresTitulo")) add(sec, `<div class="h3">${T(Q.pilaresTitulo)}</div>`, true);
        add(sec, `<div class="pillars">${pil.map(([p]) => `<div class="pill"><img src="${ART.mark}" alt=""><div><b>${T(p.t)}</b>${ok(p.d) ? `<span>${T(p.d)}</span>` : ""}</div></div>`).join("")}</div>`);
      }
      if (txt(sec, "contato")) add(sec, `<div class="box">${txt(sec, "contatoTitulo") ? `<div class="h3">${T(Q.contatoTitulo)}</div>` : ""}${P(Q.contato)}</div>`);
    }

    if (secao("objetivo")) {
      const sec = "objetivo";
      head(sec);
      vis(sec, "paragrafos").forEach(([p]) => add(sec, P(p)));
      if (!hide("contexto") && ok(s.contexto)) add(sec, `<div class="box">${P(s.contexto)}</div>`);
    }

    if (secao("escopo")) {
      const E = X.escopo, sec = "escopo";
      const grupos = k => vis(sec, k).forEach(([g, i]) => {
        const itens = (g.itens || []).filter((x, j) => on(sec, `${k}.${i}.itens.${j}`)).filter(ok);
        if (ok(g.t) && itens.length) add(sec, `<h5 class="grp-h">${T(g.t)}</h5>`, true);
        lista(sec, itens);
      });
      const lim = (tk, ik, lk) => {
        const li = LI(vis(sec, lk).map(([x]) => x));
        if (!li && !txt(sec, ik)) return;
        add(sec, `<div class="box-g">${txt(sec, tk) ? `<h4>${T(E[tk])}</h4>` : ""}${txt(sec, ik) ? `<p>${T(E[ik])}</p>` : ""}${li ? `<ul class="dots">${li}</ul>` : ""}</div>`);
      };
      head(sec);
      if (txt(sec, "sub21")) add(sec, `<div class="h3">${T(E.sub21)}</div>`, true);
      if (txt(sec, "intro21")) add(sec, `<p class="just">${T(E.intro21)}</p>`, true);
      grupos("grupos21");
      lim("lim21Titulo", "lim21Intro", "lim21");
      if (txt(sec, "sub22")) add(sec, `<div class="h3">${T(E.sub22)}</div>`, true);
      if (txt(sec, "intro22")) add(sec, `<p class="just">${T(E.intro22)}</p>`, true);
      if (txt(sec, "contempla")) add(sec, `<p>${T(E.contempla)}</p>`, true);
      grupos("grupos22");
      lim("lim22Titulo", "lim22Intro", "lim22");
    }

    if (secao("atendimento")) {
      const sec = "atendimento";
      head(sec);
      if (txt(sec, "intro")) add(sec, `<p class="just">${T(X[sec].intro)}</p>`, true);
      lista(sec, vis(sec, "itens").map(([x]) => x));
    }

    if (secao("prazo")) {
      const sec = "prazo";
      head(sec);
      if (txt(sec, "texto")) add(sec, P(X[sec].texto));
    }

    if (secao("honorarios")) {
      const H = X.honorarios, sec = "honorarios";
      head(sec);
      // a introdução termina em "honorários mensais de:", então sai junto com o valor
      if (!hide("valor") && txt(sec, "intro")) add(sec, `<p class="just">${T(H.intro)}</p>`, true);
      if (!hide("valor")) {
        const cond = hide("condicao") ? "" : String(s.condicao || "").trim();
        const ext = "(" + esc(vars.valor_extenso) + ")" + (cond ? (/^(por|ao|mensal)/i.test(cond) ? " " : ", ") + esc(cond) : "");
        add(sec, `<div class="total">${txt(sec, "rotulo") ? `<span class="lbl">${T(H.rotulo)}</span>` : ""}<span class="big">${esc(vars.valor)}</span><span class="ext">${ext}</span></div>`);
      }
      if (txt(sec, "liquido")) add(sec, `<p>${T(H.liquido)}</p>`);
      if (txt(sec, "contempla")) add(sec, `<p class="just">${T(H.contempla)}</p>`);
      if (!hide("exito") && ok(s.exito)) add(sec, `<div class="obs"><h4>${T(H.exitoTitulo)}</h4><p>${esc(String(s.exito).trim())}</p></div>`);
      if (!hide("obs") && String(s.obs || "").trim()) add(sec, `<div class="obs"><h4>${T(H.obsTitulo)}</h4><p>${esc(String(s.obs).trim())}</p></div>`);
    }

    if (secao("beneficios")) {
      const sec = "beneficios";
      head(sec);
      if (txt(sec, "intro")) add(sec, `<p class="just">${T(X[sec].intro)}</p>`, true);
      lista(sec, vis(sec, "itens").map(([x]) => x));
    }

    if (secao("final")) {
      const F = X.final, sec = "final";
      head(sec);
      vis(sec, "paragrafos").forEach(([p]) => add(sec, P(p)));
      const res = vis(sec, "resumo").map(([x]) => x).filter(ok);
      if (res.length) add(sec, `<div class="box">${res.map(x => `<p>${T(x)}</p>`).join("")}</div>`);
      const fecho = ["saudacao", "encerramento", "dataLinha"].filter(k => txt(sec, k)).map(k => `<p>${T(F[k])}</p>`).join("");
      if (fecho) add(sec, `<div class="fecho">${fecho}</div>`, true);
      const gdm = [!hide("resp") && ok(s.resp) ? `<b>${esc(s.resp)}</b>` : "", txt(sec, "assinaGdm") ? `<b>${T(F.assinaGdm)}</b>` : "", txt(sec, "assinaTag") ? `<small>${T(F.assinaTag)}</small>` : ""].join("");
      const cli = txt(sec, "assinaCliente") ? `<div><b>${T(F.assinaCliente)}</b>${txt(sec, "assinaClienteSub") ? `<small>${T(F.assinaClienteSub)}</small>` : ""}</div>` : "";
      if (gdm || cli) add(sec, `<div class="sign">${gdm ? `<div>${gdm}</div>` : ""}${cli}</div>`);
    }

    if (secao("cond")) {
      const sec = "cond";
      head(sec);
      const cl = vis(sec, "clausulas").filter(([c]) => ok(c.t) || ok(c.d));
      if (cl.length) add(sec, `<ol class="clauses">${cl.map(([c]) => `<li><span>${ok(c.t) ? `<b>${T(c.t)}</b> ` : ""}${ok(c.d) ? T(c.d) : ""}</span></li>`).join("")}</ol>`);
    }

    // capa
    const C = X.capa, pages = [], secs = [];
    const meta = [
      nome && on("capa", "rotuloDest") ? `<dt>${T(C.rotuloDest)}</dt><dd>${esc(nome)}</dd>` : "",
      !hide("data") && on("capa", "rotuloData") ? `<dt>${T(C.rotuloData)}</dt><dd>${!hide("cidade") && s.cidade ? esc(s.cidade) + ", " : ""}${dataExtensa(s.data)}</dd>` : "",
      !hide("validade") && on("capa", "rotuloValidade") ? `<dt>${T(C.rotuloValidade)}</dt><dd>${validade} dias</dd>` : ""
    ].join("");
    pages.push(`<div class="pg dark">
      <img class="cover-art" src="${ART.cover}" alt="">
      <div class="cover-in">
        <img class="logo" src="${IMG.claro}" alt="GDM Estratégia Fiscal e Comércio de Grãos">
        <h1>${[txt("capa", "linha1"), txt("capa", "linha2")].filter(Boolean).map(T).join("<br>")}</h1>
        ${!hide("assunto") && ok(s.assunto) ? `<p class="sub">${T(s.assunto)}</p>` : ""}
      </div>
      ${meta ? `<dl class="cover-meta">${meta}</dl>` : ""}
      <div class="cover-line"></div>
    </div>`); secs.push("capa");

    // folhas internas: os blocos vão entrando até não caber mais
    const rodape = nome ? "GDM Estratégia Fiscal · Proposta " + esc(nome) : "GDM Estratégia Fiscal · Proposta";
    const corpos = paginar(B);
    corpos.forEach((pg, i) => {
      pages.push(`<div class="pg">${band}<div class="body">${pg.blocks.map(b => b.html).join("")}</div><div class="foot"><span>${rodape}</span><span>${String(i + 2).padStart(2, "0")}</span></div></div>`);
      secs.push([...new Set(pg.blocks.map(b => b.sec))].join(" "));
    });

    // contracapa
    const Z = X.contra;
    if (on("contra", "_secao")) {
      const contato = [txt("contra", "whatsapp") && `<b>WhatsApp</b> ${T(Z.whatsapp)}`, txt("contra", "site") && `<b>Site</b> ${T(Z.site)}`, txt("contra", "instagram") && `<b>Instagram</b> ${T(Z.instagram)}`].filter(Boolean).join(" · ");
      pages.push(`<div class="pg dark">
        <img class="cover-art" src="${ART.cover}" alt="" style="opacity:.55">
        <div class="back-in"><img class="logo" src="${IMG.claro}" alt="GDM">${txt("contra", "tag") ? `<span class="tag">${T(Z.tag)}</span>` : ""}</div>
        <div class="back-contact">${contato ? `<span>${contato}</span>` : ""}${txt("contra", "endereco") ? `<span>${T(Z.endereco)}</span>` : ""}</div>
      </div>`); secs.push("contra");
    }
    pages.secs = secs;
    return pages;
  }

  /* distribui os blocos nas folhas medindo a altura real de cada um */
  let medidor = null;
  function paginar(blocks) {
    if (!blocks.length) return [];
    if (typeof document === "undefined" || !document.body) return [{ blocks }];
    if (!medidor || !medidor.isConnected) {
      medidor = document.createElement("div");
      medidor.setAttribute("aria-hidden", "true");
      medidor.style.cssText = "position:fixed;left:-30000px;top:0;width:794px;visibility:hidden;pointer-events:none";
      medidor.innerHTML = `<div class="pg"><div class="body"></div></div>`;
      document.body.appendChild(medidor);
    }
    const body = medidor.querySelector(".body");
    const cabe = () => body.scrollHeight <= body.clientHeight + 1;
    const out = []; let atual = [];
    const fecha = () => { if (atual.length) out.push({ blocks: atual }); atual = []; body.innerHTML = ""; };
    const poe = b => { atual.push(b); body.insertAdjacentHTML("beforeend", b.html); };
    blocks.forEach((b, i) => {
      const novaSecao = i > 0 && b.sec !== blocks[i - 1].sec;
      if (novaSecao && NOVA_PAGINA[b.sec]) fecha();
      poe(b);
      if (cabe() || atual.length === 1) return;
      // não coube: volta este bloco e os títulos que ficariam sozinhos no fim da folha
      atual.pop();
      const levar = [];
      while (atual.length && atual[atual.length - 1].keep) levar.unshift(atual.pop());
      if (!atual.length) { atual = levar.concat([b]); return; } // nem sozinho cabe: fica na folha (aviso de "passou")
      fecha();
      levar.forEach(poe); poe(b);
    });
    fecha();
    return out;
  }

  /* monta as folhas em escala dentro de um container */
  function mount(container, pages, maxW) {
    const avail = Math.max(240, Math.min(maxW || 9999, container.clientWidth));
    const sc = Math.min(1, avail / PAGE_W);
    const secs = pages.secs || [];
    container.innerHTML = pages.map((p, i) =>
      `<div class="sheet" data-page="${i+1}" data-sec="${secs[i] || ""}" style="width:${PAGE_W*sc}px;height:${PAGE_H*sc}px">${p.replace('<div class="pg', '<div style="transform:scale(' + sc + ')" class="pg')}</div>`).join("");
    return sc;
  }
  // Páginas cujo texto passou da área útil da folha.
  function overflowing(container) {
    return [...container.querySelectorAll(".sheet")].filter(sh => {
      const b = sh.querySelector(".pg .body"); return b && b.scrollHeight > b.clientHeight + 2;
    }).flatMap(sh => sh.dataset.sec.split(" "));
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
    const nome = nomeVisivel(s);
    pdf.setProperties({ title: "Proposta GDM" + (nome ? " · " + nome : ""), author: "GDM Estratégia Fiscal" });
    return pdf;
  }
  const pdfName = s => { const n = nomeVisivel(s).replace(/[\\/:*?"<>|]+/g, "").trim(); return "Proposta GDM" + (n ? " - " + n : "") + ".pdf"; };
  const savePdf = async (pdf, name) => pdf.save(name);

  window.GDM = { savePdf, PAGE_W, PAGE_H, ART, IMG, TEXTOS, DEFAULTS, SECOES, CAMPOS, VERSAO, textosDe, whatsDigits, clone, esc, fmtMoney, BRL,
    reaisExtenso, inteiroExtenso, slugify, todayISO, dataExtensa, dataLonga, renderPages, mount, overflowing, buildPdf, pdfName, nomeVisivel, oculto };
})();
