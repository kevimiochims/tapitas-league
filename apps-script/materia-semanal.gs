// =============================================================================
// MATÉRIA DA RODADA NA TAPITAS NEWS (IA)
// -----------------------------------------------------------------------------
// Toda semana, depois que a rodada fecha, escreve uma matéria longa sobre ela e
// publica na Tapitas News (aba MEMES), com fotos. Mesma engrenagem dos recaps:
//   1. O site monta o DOSSIÊ DA RODADA (/api/recap/context?...&mode=week):
//      placares e ganchos de todos os confrontos, destaques, classificação,
//      Power Rankings, recaps já escritos e a próxima rodada.
//   2. Entram a LORE (com a época de cada item) e as fotos da semana (as
//      mesmas do Power Rankings: aba PR_FOTOS, ou a busca do site).
//   3. O Gemini escreve título, linha fina e o texto (em português, com
//      intertítulos) e marca onde cada foto entra.
//   4. A matéria vira uma linha na aba MEMES e o site é avisado.
//
// Fica no MESMO projeto do Apps Script dos recaps (usa recapConfig_,
// chamaGemini_ e loreTexto_ do recaps-ia.gs).
//
// TESTES (nada é publicado):
//   - Edite MATERIA_SEMANAS_TESTE e rode testaMateriaSemana(). Cada matéria vai
//     para a aba MATERIAS_TESTE (criada sozinha) e o log mostra o link da
//     prévia no site (/news/teste-...). A prévia tem o visual da matéria
//     publicada, mas não aparece na lista da Tapitas News.
//   - Para gerar de novo uma semana de teste, apague a linha dela na aba
//     MATERIAS_TESTE e rode outra vez.
//
// AUTOMÁTICO:
//   - Rode instalaMateriaSemanal() uma vez. Todo dia às 11h ele confere se há
//     rodada nova fechada (Power Ranking calculado e recaps escritos) sem
//     matéria; se houver, escreve e publica. Cada rodada sai uma vez só.
//   - Para publicar uma rodada na mão: publicaMateriaSemana('2026', '4').
// =============================================================================

const MATERIA_SEMANAS_TESTE = [['2026', '1'], ['2026', '2'], ['2026', '3']];
const MATERIA_ABA = 'MEMES';
const MATERIA_ABA_TESTE = 'MATERIAS_TESTE';
const MATERIA_CATEGORIA = 'Recap';
const MATERIA_AUTOR = 'Tapitas News';
const MATERIA_TEMPO_MAX_MS = 4.5 * 60 * 1000;

const MATERIA_INSTRUCOES = `
Você é o editor-chefe da Tapitas News, o jornal da Tapitas League, uma liga de
fantasy football entre amigos que existe desde 2014. Escreva a MATÉRIA DA RODADA.

FONTE: tudo o que você escrever tem que estar no DOSSIÊ. Não invente placares,
pontos, recordes, sequências nem fatos. Os ganchos já vêm calculados e
verificados: escolha os melhores e conte as histórias. Os recaps já publicados
da rodada são a versão oficial de cada jogo: mantenha os mesmos fatos, mas não
copie frases deles.

TOM: jornal esportivo bem-humorado, com provocações leves entre os times, como
a imprensa esportiva brasileira faz no futebol. A LORE (piadas internas e
histórias do grupo) é o tempero: use quando encaixar, sem forçar, respeitando a
época indicada em cada item e os itens "Proibido".

TAMANHO E ESTRUTURA: texto longo, entre 900 e 1300 palavras, em português do
Brasil, em Markdown, com 4 a 6 intertítulos "## " criativos. Roteiro:
  - abertura: já é o jogo da semana (a grande história da rodada), contado ali
    mesmo, com os detalhes. Nada de parágrafo de "resumo da rodada" antes;
  - um giro por TODOS os outros confrontos (nenhum fica de fora);
  - destaques individuais: só quem ainda NÃO apareceu no texto, ou uma frase
    curta de ranking (sem recontar o jogo de ninguém);
  - classificação e Power Ranking: só o movimento da tabela (quem subiu, quem
    caiu, quem lidera), sem recontar placares nem jogos;
  - de olho na próxima rodada (os confrontos e o que está em jogo, sem prever
    resultado como se fosse fato).
Nos playoffs, na final e no jogo do Unicórnio, o texto gira em torno disso.

NÃO SE REPITA: cada confronto é contado UMA vez, num único trecho. Um placar,
uma pontuação de jogador ou um fato já citado não aparece de novo em outra
seção. O "atual campeão" é chamado assim no máximo uma vez no texto inteiro.
Não invente apelidos, cargos ou papéis de ninguém (quem é comissário, fundador
etc.) que não estejam no dossiê ou na LORE.
Cite os times pelo nome (pode usar **negrito** na primeira menção). Nunca diga
em que vaga um jogador atuou nem fale em FLEX.

FOTOS: você recebe a lista de FOTOS DISPONÍVEIS (uma por time). Coloque de 2 a 4
delas no texto, cada uma numa linha sozinha, logo depois do parágrafo que fala
daquele time, assim:
[[FOTO: Nome exato do time]]
Nunca a mesma foto duas vezes e nunca antes do primeiro parágrafo (a foto de
capa já fica no topo).

RESPOSTA, exatamente neste formato:
TÍTULO: (título curto e forte, sem aspas)
LINHA FINA: (uma frase que complementa o título)
---
(o texto em Markdown)
`;

// -----------------------------------------------------------------------------
// Entradas
// -----------------------------------------------------------------------------

function testaMateriaSemana() {
  const inicio = Date.now();
  const feitas = slugsDaAba_(MATERIA_ABA_TESTE);
  for (const [season, week] of MATERIA_SEMANAS_TESTE) {
    if (feitas.has(slugMateria_(season, week, true))) {
      Logger.log(`[MATÉRIA] Teste ${season} semana ${week} já existe (apague a linha na ${MATERIA_ABA_TESTE} para refazer).`);
      continue;
    }
    if (Date.now() - inicio > MATERIA_TEMPO_MAX_MS - 90 * 1000) {
      Logger.log('[MATÉRIA] Tempo quase no limite: rode de novo para continuar.');
      return;
    }
    geraMateria_(String(season), String(week), true);
  }
}

function publicaMateriaSemana(season, week) {
  if (!season || !week) throw new Error('Informe a temporada e a semana, ex.: publicaMateriaSemana("2026", "4")');
  geraMateria_(String(season), String(week), false);
}

function instalaMateriaSemanal() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'materiaDaSemanaAutomatica')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('materiaDaSemanaAutomatica').timeBased().everyDays(1).atHour(11).create();
  Logger.log('[MATÉRIA] Gatilho diário (11h) criado. Ele só publica quando há rodada nova fechada sem matéria.');
}

// Gatilho diário: publica a matéria da última rodada fechada, uma vez só
function materiaDaSemanaAutomatica() {
  const { season, week } = ultimaRodadaFechada_();
  if (!season) { Logger.log('[MATÉRIA] Nenhuma rodada fechada encontrada.'); return; }
  if (slugsDaAba_(MATERIA_ABA).has(slugMateria_(season, week, false))) {
    Logger.log(`[MATÉRIA] ${season} semana ${week} já tem matéria.`);
    return;
  }
  if (!recapsProntos_(season, week)) {
    Logger.log(`[MATÉRIA] ${season} semana ${week}: os recaps ainda não foram escritos. Tento de novo amanhã.`);
    return;
  }
  geraMateria_(season, week, false);
}

// -----------------------------------------------------------------------------
// Geração
// -----------------------------------------------------------------------------

function geraMateria_(season, week, teste) {
  const cfg = recapConfig_();
  Logger.log(`[MATÉRIA] ${teste ? 'TESTE ' : ''}${season} semana ${week}: montando o dossiê...`);
  const base = `${cfg.site}/api/recap/context?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}&mode=week${cfg.token ? `&token=${encodeURIComponent(cfg.token)}` : ''}`;
  const dossie = buscaTexto_(base);
  const dados = JSON.parse(buscaTexto_(`${base}&format=json`));
  const times = Array.from(new Set((dados.matchups || []).flatMap(m => m.teams)));

  // Fotos da semana (uma por time) e a de capa: a do time do melhor jogador
  const fotos = fotosDaRodada_(cfg, season, week);
  const capaTime = (dados.highs && dados.highs.players && dados.highs.players[0] && dados.highs.players[0].team) || (dados.highs && dados.highs.top && dados.highs.top.team) || times[0];
  const capa = fotos[capaTime] || Object.values(fotos)[0] || null;
  const lista = Object.keys(fotos)
    .filter(t => t !== capaTime)
    .map(t => `- ${t}: ${fotos[t].player || 'foto do time'}${fotos[t].pts ? ` (${fotos[t].pts} pts)` : ''}`);

  const anteriores = aberturasAnteriores_(teste);
  const texto = [
    `Escreva a matéria da rodada (${season}, semana ${week}).`,
    '',
    dossie,
    loreTexto_(cfg, times, season, week),
    lista.length ? `\n\n## FOTOS DISPONÍVEIS (use [[FOTO: time]])\n${lista.join('\n')}` : '',
    anteriores.length ? `\n\n## MATÉRIAS ANTERIORES (não repita títulos, aberturas nem piadas)\n${anteriores.map(a => `- ${a}`).join('\n')}` : '',
  ].join('\n');

  const { texto: resposta, modelo } = chamaGemini_(cfg, MATERIA_INSTRUCOES, texto);
  const materia = parseMateria_(resposta);
  if (!materia.titulo || materia.corpo.length < 400) throw new Error(`Resposta do Gemini fora do formato:\n${resposta.slice(0, 500)}`);

  // Marcadores de foto viram imagens com legenda
  const usadas = new Set();
  const corpo = materia.corpo.replace(/\[\[\s*FOTO:\s*([^\]]+?)\s*\]\]/gi, (m, time) => {
    const t = Object.keys(fotos).find(x => semAcento_(x) === semAcento_(time)) || null;
    if (!t || usadas.has(t) || t === capaTime) return '';
    usadas.add(t);
    const f = fotos[t];
    const legenda = [f.player ? `${f.player} (${t})` : t, f.pts ? `${f.pts} pts na rodada` : '', f.credit ? `Foto: ${f.credit}` : ''].filter(Boolean).join(' · ');
    return `\n\n![${legenda}](${f.url})\n\n`; // linha própria (parágrafo separado)
  }).replace(/\n{3,}/g, '\n\n').trim();

  const linha = {
    title: materia.titulo,
    subtitle: materia.linhaFina,
    slug: slugMateria_(season, week, teste),
    category: MATERIA_CATEGORIA,
    // Data em texto ISO ("2026-10-04"): no formato da planilha (04/10/2026) o
    // site leria como mês/dia
    date: teste ? `'${Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd')}` : new Date(),
    imageUrl: capa ? capa.url : '',
    content: corpo,
    author: MATERIA_AUTOR,
  };
  gravaMateria_(teste ? MATERIA_ABA_TESTE : MATERIA_ABA, linha, teste);
  Logger.log(`[MATÉRIA] "${linha.title}" (${corpo.split(/\s+/).length} palavras, ${usadas.size} fotos no texto, modelo ${modelo}).`);
  if (teste) {
    Logger.log(`[MATÉRIA] Prévia: ${cfg.site}/news/${linha.slug}`);
  } else {
    if (typeof avisaSiteNovaNoticia_ === 'function') avisaSiteNovaNoticia_();
    Logger.log(`[MATÉRIA] Publicada: ${cfg.site}/news/${linha.slug}`);
  }
}

function parseMateria_(resposta) {
  const t = String(resposta || '').replace(/\r/g, '').replace(/^```[a-z]*\n?|```$/gim, '').trim();
  const titulo = (t.match(/^\s*T[ÍI]TULO:\s*(.+)$/im) || [])[1] || '';
  const linhaFina = (t.match(/^\s*LINHA FINA:\s*(.+)$/im) || [])[1] || '';
  const i = t.search(/^---\s*$/m);
  let corpo = i >= 0 ? t.slice(i).replace(/^---\s*$/m, '') : t.replace(/^\s*T[ÍI]TULO:.*$/im, '').replace(/^\s*LINHA FINA:.*$/im, '');
  corpo = corpo.trim();
  return { titulo: titulo.replace(/^["“]|["”]$/g, '').trim(), linhaFina: linhaFina.replace(/^["“]|["”]$/g, '').trim(), corpo };
}

// Fotos do Power Rankings da semana: as guardadas na PR_FOTOS (Drive, servidas
// pelo site) e, para os times sem linha lá, a busca automática do site
function fotosDaRodada_(cfg, season, week) {
  const fotos = {};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PR_FOTOS');
  if (sh) {
    const [h, ...rows] = sh.getDataRange().getValues();
    const col = n => h.map(x => String(x).trim()).indexOf(n);
    const iS = col('Season'), iW = col('Week'), iT = col('Team'), iF = col('FileId'), iU = col('Url'), iJ = col('Jogador'), iP = col('Pts'), iC = col('Credito');
    rows.forEach(r => {
      if (String(r[iS]).trim() !== String(season) || String(r[iW]).trim() !== String(week)) return;
      const team = String(r[iT]).trim();
      const fileId = String(r[iF] || '').trim();
      const url = fileId ? `${cfg.site}/api/pr-photo/${fileId}` : String(r[iU] || '').trim();
      if (!team || !url) return;
      fotos[team] = { url, player: String(r[iJ] || '').trim(), pts: String(r[iP] || '').trim(), credit: iC >= 0 ? String(r[iC] || '').trim() : '' };
    });
  }
  try {
    const res = UrlFetchApp.fetch(`${cfg.site}/api/league/pr-photos?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}`, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const live = JSON.parse(res.getContentText() || '{}');
      Object.keys(live).forEach(team => {
        const f = live[team];
        if (fotos[team] || !f || !f.url) return;
        fotos[team] = { url: f.url, player: f.player || '', pts: f.pts ? Number(f.pts).toFixed(2) : '', credit: f.credit || '' };
      });
    }
  } catch (e) {
    Logger.log(`[MATÉRIA] Busca de fotos do site falhou: ${e}`);
  }
  return fotos;
}

// -----------------------------------------------------------------------------
// Planilha
// -----------------------------------------------------------------------------

const MATERIA_COLUNAS = {
  id: ['id'],
  title: ['title', 'titulo', 'título'],
  subtitle: ['subtitle', 'subtitulo', 'subtítulo', 'linha fina'],
  slug: ['slug'],
  category: ['category', 'categoria'],
  date: ['date', 'data'],
  imageUrl: ['imageurl', 'image', 'imagem', 'image url'],
  content: ['content', 'conteudo', 'conteúdo', 'texto'],
  author: ['author', 'autor'],
};

function abaMateria_(nome, criar) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nome);
  if (!sh && criar) {
    sh = ss.insertSheet(nome);
    sh.appendRow(['id', 'title', 'subtitle', 'slug', 'category', 'date', 'imageUrl', 'content', 'author']);
  }
  return sh;
}

function gravaMateria_(nome, linha, teste) {
  const sh = abaMateria_(nome, teste);
  if (!sh) throw new Error(`Aba ${nome} não encontrada.`);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => semAcento_(String(h).trim()));
  const idx = {};
  Object.keys(MATERIA_COLUNAS).forEach(k => { idx[k] = head.findIndex(h => MATERIA_COLUNAS[k].map(semAcento_).includes(h)); });
  ['title', 'slug', 'content'].forEach(k => {
    if (idx[k] < 0) throw new Error(`A aba ${nome} não tem a coluna "${k}". Colunas encontradas: ${head.join(', ')}`);
  });
  const values = sh.getDataRange().getValues();
  // Mesma semana já gravada: substitui (só no teste; na MEMES nunca duplica)
  let rowNum = -1;
  values.slice(1).forEach((r, i) => { if (String(r[idx.slug]).trim() === linha.slug) rowNum = i + 2; });
  if (rowNum > 0 && !teste) { Logger.log(`[MATÉRIA] ${linha.slug} já existe na ${nome}; nada a fazer.`); return; }
  if (idx.id >= 0) linha.id = values.slice(1).reduce((m, r) => Math.max(m, Number(r[idx.id]) || 0), 0) + 1;
  const row = new Array(head.length).fill('');
  Object.keys(idx).forEach(k => { if (idx[k] >= 0 && linha[k] !== undefined) row[idx[k]] = linha[k]; });
  if (rowNum > 0) sh.getRange(rowNum, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
}

function slugsDaAba_(nome) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!sh || sh.getLastRow() < 2) return new Set();
  const [h, ...rows] = sh.getDataRange().getValues();
  const i = h.map(x => semAcento_(String(x).trim())).indexOf('slug');
  return new Set(i < 0 ? [] : rows.map(r => String(r[i]).trim()).filter(Boolean));
}

function slugMateria_(season, week, teste) {
  return `${teste ? 'teste-' : ''}rodada-${season}-semana-${String(week).replace(/[^0-9]+/g, '-')}`;
}

// Começo das últimas matérias automáticas (para não repetir abertura/título)
function aberturasAnteriores_(teste) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(teste ? MATERIA_ABA_TESTE : MATERIA_ABA);
  if (!sh || sh.getLastRow() < 2) return [];
  const [h, ...rows] = sh.getDataRange().getValues();
  const head = h.map(x => semAcento_(String(x).trim()));
  const iT = head.findIndex(x => MATERIA_COLUNAS.title.map(semAcento_).includes(x));
  const iC = head.findIndex(x => MATERIA_COLUNAS.content.map(semAcento_).includes(x));
  const iA = head.findIndex(x => MATERIA_COLUNAS.author.map(semAcento_).includes(x));
  return rows
    .filter(r => iA < 0 || String(r[iA]).trim() === MATERIA_AUTOR)
    .slice(-3)
    .map(r => `"${String(r[iT] || '').trim()}" — ${String(r[iC] || '').replace(/\s+/g, ' ').slice(0, 160)}…`);
}

// Última rodada com Power Ranking calculado (= rodada fechada)
function ultimaRodadaFechada_() {
  const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
  const h = values[0].map(v => String(v).trim());
  const iS = h.indexOf('Season'), iW = h.indexOf('Week'), iPR = h.indexOf('Power Ranking');
  let best = { season: '', week: '', key: -1 };
  values.slice(1).forEach(r => {
    if (!(Number(String(r[iPR]).replace(',', '.')) > 0)) return;
    const nums = String(r[iW]).match(/\d+/g) || [];
    const w = nums.length ? Math.max.apply(null, nums.map(Number)) : 0;
    const key = Number(r[iS]) * 100 + w;
    if (key > best.key) best = { season: String(r[iS]), week: String(r[iW]), key };
  });
  return best;
}

// A matéria espera os recaps dos jogos da rodada (para contar a mesma versão)
function recapsProntos_(season, week) {
  const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
  const h = values[0].map(v => String(v).trim());
  const iS = h.indexOf('Season'), iW = h.indexOf('Week'), iR = h.indexOf('Recap da Partida');
  if (iR < 0) return true;
  const rows = values.slice(1).filter(r => String(r[iS]).trim() === String(season) && String(r[iW]).trim() === String(week));
  return rows.length > 0 && rows.every(r => String(r[iR] || '').trim());
}

function buscaTexto_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(`Site respondeu ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`);
  return res.getContentText();
}
