# GDM Proposta

Gerador de propostas comerciais da **GDM Estratégia Fiscal e Comércio de Grãos**.

A Arminda entra no painel, preenche cliente, valor e observação, vê a proposta montada na hora e escolhe entre:

* **Baixar PDF**: folhas A4 com a identidade da GDM. O texto passa para a folha seguinte quando não cabe.
* **Gerar link**: um endereço público com o nome do cliente, por exemplo `seudominio.com.br/3tentos`, com botão para baixar o PDF e falar com a GDM no WhatsApp.

## Estrutura

```
index.html            Painel (vinheta de boas-vindas, acesso por senha, edição e prévia)
proposta.html         Página pública aberta pelo link /nome-do-cliente
assets/css/app.css    Interface (verde escuro, luzes brancas, vidro fosco)
assets/css/sheets.css Visual das folhas A4 da proposta
assets/js/template.js Conteúdo e layout da proposta, valor por extenso, slug e geração do PDF
assets/js/app.js      Lógica do painel
assets/js/viewer.js   Lógica da página pública
api/auth.js           Confere a senha do painel
api/propostas.js      Lista, salva e exclui propostas (exige senha)
api/proposta.js       Entrega uma proposta pelo slug (público)
api/modelo.js         Textos padrão para novas propostas (exige senha)
assets/js/intro.js    Vinheta de entrada (painel e página do cliente)
api/_lib/             Armazenamento (Vercel Blob) e utilidades
vercel.json           Faz /nome-do-cliente abrir a página pública
scripts/dev.mjs       Servidor local que imita a Vercel
```

## Publicar na Vercel

1. **GitHub**: suba esta pasta para um repositório (pode ser privado).
2. **Vercel**: *Add New > Project*, importe o repositório. Não precisa mudar nada em Build Settings (Framework Preset: **Other**).
3. **Armazenamento**: no projeto, abra *Storage > Create > Blob*, crie um store **Private** e conecte ao projeto. A Vercel cria sozinha a variável `BLOB_READ_WRITE_TOKEN`.
   * Se o store for criado como **Public**, adicione também a variável `BLOB_ACCESS=public`.
4. **Senha**: em *Settings > Environment Variables*, crie `ADMIN_PASSWORD` com a senha que a Arminda vai usar.
5. Faça um novo deploy (*Deployments > Redeploy*) para as variáveis valerem.
6. **Domínio** (opcional): em *Settings > Domains*, adicione algo como `proposta.gdmestrategiafiscal.com.br`.
7. **Imagem do WhatsApp**: depois de definir o domínio, troque em `proposta.html` a linha
   `<meta property="og:image" content="/assets/img/og.png">` pelo endereço completo, por exemplo
   `https://proposta.gdmestrategiafiscal.com.br/assets/img/og.png`. O WhatsApp só mostra a prévia com endereço completo.

## Rodar no computador

```bash
npm install
ADMIN_PASSWORD=teste npm run dev
```

Abra `http://localhost:3000`. Sem o token do Blob, as propostas ficam salvas na pasta `.data/` (que não vai para o GitHub).

## Como usar

* A vinheta "Bem-vinda, Arminda" aparece a cada vez que ela abre o sistema (uma vez por sessão do navegador). Clique ou aperte Esc para pular.
* Quem abre o link do cliente vê a vinheta "Proposta personalizada para {nome do cliente}" antes da proposta.
* O painel tem duas abas:
  * **Dados do cliente**: nome, valor, condição de pagamento, observação, assunto, contexto, êxito, data, validade, cidade e quem assina.
  * **Textos da proposta**: todos os textos, separados por seção (Objetivo, Escopo, Forma de atendimento, Prazo, Honorários, Benefícios, Considerações finais, além de Quem somos e Condições gerais). Parágrafos, grupos e itens de lista podem ser editados, incluídos, removidos e reordenados.
* Cada campo, item e seção tem o botão **Na proposta / Oculto**, que tira o item da proposta sem apagar o texto. Se o nome do cliente for ocultado, os textos passam a dizer "CONTRATANTE" e o nome some da capa, do rodapé e do PDF. Se o valor for ocultado, somem o quadro do valor e as frases que citam o valor.
* Nos textos, `{cliente}` vira o nome do cliente (também funcionam `{valor}`, `{validade}` e `{data}`) e `*trecho*` fica em negrito.
* Clicar numa página da prévia abre os textos dela. Se um texto passar do tamanho da folha, a página fica marcada e aparece o aviso "Passou da página".
* **Salvar como padrão** guarda os textos atuais para toda proposta nova. **Restaurar padrão** volta os textos da proposta aberta ao padrão. O texto original da GDM pode ser recuperado a qualquer momento.
* A senha é pedida uma vez por aparelho. Para trocar de aparelho ou sair, use o menu do avatar no canto superior direito.
* Ao gerar o link de um cliente que já tem proposta, o sistema pergunta se deve **substituir** a anterior ou **criar um novo link** (`/cliente-2`).
* Em **Propostas** ficam todas as propostas com link: editar, copiar link, enviar no WhatsApp, abrir ou excluir. Excluir derruba o link na hora.

## Texto original

Tudo pode ser mudado pelo próprio painel, na aba Textos da proposta. O texto original da GDM, usado quando não há padrão salvo, fica em `assets/js/template.js`, na constante `TEXTOS`.
