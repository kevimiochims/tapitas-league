// =============================================================================
// MEME DA RODADA NA TAPITAS NEWS (texto do Gemini + charge da Cloudflare)
// -----------------------------------------------------------------------------
// Toda semana, depois da matéria da rodada, publica um post de zoação na
// categoria Meme, com uma charge desenhada por IA (gratuita):
//   1. O site monta o dossiê da rodada (o mesmo da matéria semanal).
//   2. O Gemini (texto, chave gratuita) escolhe a história mais engraçada e
//      escreve o post curto, a legenda da charge e a CENA, em inglês, usando os
//      mascotes da liga (MEME_MASCOTES).
//   3. A Cloudflare (modelo Flux, cota diária grátis) desenha DUAS versões. A
//      imagem nunca tem texto: a frase da charge vai como legenda no post.
//   4. O post vai para a aba MEMES e o site é avisado.
//
// Fica no MESMO projeto da Tapitas Engine e usa funções do recaps-ia.gs
// (recapConfig_, chamaGemini_, loreTexto_) e do materia-semanal.gs
// (gravaMateria_, slugsDaAba_, ultimaRodadaFechada_, recapsProntos_,
// dataDaRodada_). Precisa das Propriedades CF_ACCOUNT_ID e CF_API_TOKEN (as
// mesmas do teste da charge).
//
// TESTES (nada é publicado):
//   - Edite MEME_SEMANAS_TESTE e rode testaMemeSemana(). Cada post vai para a
//     aba MATERIAS_TESTE com as DUAS charges (na prévia elas passam como fotos
//     de um carrossel); o log mostra o link da prévia (/news/teste-meme-...).
//   - Para refazer uma semana, apague a linha dela na MATERIAS_TESTE.
//   - Para publicar os testes aprovados: publicaTestesMeme(). Vai a 1ª charge;
//     para usar a 2ª, apague a 1ª da célula imageUrl antes (o que vem antes do |).
//
// AUTOMÁTICO (com a sua aprovação):
//   - Rode instalaMemeSemanal() uma vez. Todo dia às 6h (depois da matéria das
//     5h) ele confere se há rodada fechada sem meme e GERA o meme como TESTE
//     (aba MATERIAS_TESTE, com as duas charges). Nada vai para o site sozinho:
//     você recebe um e-mail com o link da prévia.
//   - Para aprovar: escolha a charge (apague a outra da célula imageUrl) e rode
//     publicaTestesMeme(). Não gostou: apague a linha e rode
//     memeDaSemanaAutomatico() para gerar outro.
//   - Para gerar e publicar uma rodada direto, sem aprovação:
//     publicaMemeSemana('2026', '4').
// =============================================================================

const MEME_SEMANAS_TESTE = [['2026', '1'], ['2026', '2'], ['2026', '3']];
const MEME_CATEGORIA = 'Meme';
const MEME_HORA = 6;
const MEME_PASTA = 'Tapitas League - Charges';

// Como cada time aparece na charge (descrição dos avatares da liga). Sem nome
// de pessoa real: o desenhista recusa ou distorce gente de verdade.
const MEME_MASCOTES = {
  'H-Lera do Mahl': 'a fierce dark-blue eagle with orange eyes and sharp feathers',
  'Howmuch': 'a grim country singer dressed all in black, with slicked-back black hair, carrying an acoustic guitar',
  'I am Megatron': 'a huge gray robot with a big arm cannon and a purple emblem on its chest',
  'Moneyball': 'a handsome baseball team manager with messy blond hair wearing a dark green jacket',
  'Ocupa e Resiste': 'a giant red clenched fist with a small face, like a protest symbol come to life',
  'OldBrady': 'an aging star quarterback with stubble wearing a navy blue and red uniform with number 12',
  'Patrolao Squad': 'a big yellow bulldozer with a happy face puffing black smoke from its exhaust',
  'Pequers Verde': 'a cool beige goat with curly horns, long blond hair, small blue sunglasses and a cigar',
  'Peytao da Massa': 'a veteran quarterback with a very big forehead wearing an orange jersey with number 18',
  'Rincao Settlers': 'a grumpy old coach in a gray hooded sweatshirt with his arms crossed',
};

const MEME_ESTILO = 'Editorial cartoon in the style of a Brazilian newspaper sports comic: bold black ink outlines, flat bright colors, ' +
  'exaggerated funny expressions, one single clear scene, simple background. ';
const MEME_SEM_TEXTO = ' Absolutely no text anywhere: no letters, no words, no signs, no posters, no papers, no screens, no scoreboards, no speech bubbles, no captions, no artist signature in the corners, no logos. Jersey numbers are the only allowed characters.';

const MEME_INSTRUCOES = `
Você é o chargista e humorista da Tapitas News, o jornal da Tapitas League (fantasy
football entre amigos desde 2014). A partir do DOSSIÊ DA RODADA, faça o MEME DA
SEMANA: só zoação, nada de análise séria.

ESCOLHA UMA história engraçada da rodada (ou duas, se combinarem): o lanterna, a
maior goleada, quem perdeu fazendo muitos pontos, quem venceu jogando mal, o
"bagre" da semana (titular que zerou ou quase), a briga pelo Unicórnio, uma
sequência de derrotas, uma trade que deu errado. Use SÓ fatos do dossiê; não
invente números. A LORE (piadas internas do grupo) é ótima aqui, respeitando a
época e os itens "Proibido". Zoação leve, de amigos: nada de ofensa pesada.

A CHARGE: descreva UMA cena simples, em INGLÊS, para um desenhista que não sabe
nada de fantasy football:
  - no máximo 2 personagens, escolhidos entre os MASCOTES (copie a descrição
    deles exatamente, sem citar o nome do time);
  - uma ação clara e engraçada que conte a piada sozinha (alguém chorando com um
    troféu de unicórnio, sendo atropelado, dormindo no banco, fugindo...);
  - cenário simples (vestiário, campo, banco de reservas, escritório...);
  - nada de texto, placar, número ou palavra escrita na cena, e nenhum objeto
    que costuma ter escrita (placas, cartazes, papéis, quadros, telas, jornais):
    o desenhista inventa letras sem sentido neles.

RESPOSTA: só um JSON, sem texto em volta:
{
  "titulo": "título curto e engraçado do post",
  "legenda": "a frase da charge, em português, até 15 palavras",
  "times": ["time(s) da piada"],
  "cena": "the scene in English, 2 to 4 sentences",
  "texto": "o post em português do Brasil, Markdown, 120 a 250 palavras, contando a piada com os fatos da rodada"
}
`;

// -----------------------------------------------------------------------------
// Entradas
// -----------------------------------------------------------------------------

function testaMemeSemana() {
  const inicio = Date.now();
  const feitas = slugsDaAba_(MATERIA_ABA_TESTE);
  for (const [season, week] of MEME_SEMANAS_TESTE) {
    if (feitas.has(slugMeme_(season, week, true))) {
      Logger.log(`[MEME] Teste ${season} semana ${week} já existe (apague a linha na ${MATERIA_ABA_TESTE} para refazer).`);
      continue;
    }
    if (Date.now() - inicio > MATERIA_TEMPO_MAX_MS - 90 * 1000) {
      Logger.log('[MEME] Tempo quase no limite: rode de novo para continuar.');
      return;
    }
    geraMeme_(String(season), String(week), true);
  }
}

function publicaMemeSemana(season, week) {
  if (!season || !week) throw new Error('Informe a temporada e a semana, ex.: publicaMemeSemana("2026", "4")');
  geraMeme_(String(season), String(week), false);
}

function instalaMemeSemanal() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'memeDaSemanaAutomatico')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('memeDaSemanaAutomatico').timeBased().everyDays(1).atHour(MEME_HORA).create();
  Logger.log(`[MEME] Gatilho diário (${MEME_HORA}h) criado. Ele só publica quando há rodada nova fechada sem meme.`);
}

// Gatilho diário: gera o meme da rodada como TESTE e avisa por e-mail; a
// publicação fica com você (publicaTestesMeme)
function memeDaSemanaAutomatico() {
  const { season, week } = ultimaRodadaFechada_();
  if (!season) return;
  if (slugsDaAba_(MATERIA_ABA).has(slugMeme_(season, week, false))) { Logger.log(`[MEME] ${season} semana ${week} já tem meme publicado.`); return; }
  if (slugsDaAba_(MATERIA_ABA_TESTE).has(slugMeme_(season, week, true))) { Logger.log(`[MEME] ${season} semana ${week} já está esperando aprovação.`); return; }
  if (!recapsProntos_(season, week)) { Logger.log(`[MEME] ${season} semana ${week}: recaps ainda não escritos. Tento amanhã.`); return; }
  geraMeme_(season, week, true);
  const site = (PropertiesService.getScriptProperties().getProperty('SITE_URL') || '').replace(/\/+$/, '');
  const link = `${site}/news/${slugMeme_(season, week, true)}`;
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), `Meme da semana ${week} pronto para aprovar`,
      `O meme da rodada ${season}, semana ${week}, está pronto.\n\nPrévia (com as duas charges): ${link}\n\n` +
      'Para publicar: na aba MATERIAS_TESTE, deixe na célula imageUrl só a charge escolhida e rode publicaTestesMeme().\n' +
      'Não gostou? Apague a linha e rode memeDaSemanaAutomatico para gerar outro.');
  } catch (e) {
    Logger.log(`[MEME] Não consegui mandar o e-mail: ${e}`);
  }
}

// Publica os memes de teste aprovados (aba MATERIAS_TESTE), com a data da rodada
function publicaTestesMeme() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MATERIA_ABA_TESTE);
  if (!sh || sh.getLastRow() < 2) { Logger.log('[MEME] A aba MATERIAS_TESTE está vazia.'); return; }
  const [h, ...rows] = sh.getDataRange().getValues();
  const head = h.map(x => semAcento_(String(x).trim()));
  const col = k => head.findIndex(x => MATERIA_COLUNAS[k].map(semAcento_).includes(x));
  const publicadas = slugsDaAba_(MATERIA_ABA);
  let n = 0;
  rows.forEach(r => {
    const m = String(r[col('slug')] || '').trim().match(/^teste-meme-(\d{4})-semana-([\d-]+)$/);
    if (!m) return;
    const slug = slugMeme_(m[1], m[2], false);
    if (publicadas.has(slug)) { Logger.log(`[MEME] ${slug} já está publicado.`); return; }
    gravaMateria_(MATERIA_ABA, {
      title: String(r[col('title')] || ''),
      subtitle: col('subtitle') >= 0 ? String(r[col('subtitle')] || '') : '',
      slug,
      category: MEME_CATEGORIA,
      date: dataDaRodada_(m[1], m[2]),
      imageUrl: String(r[col('imageUrl')] || '').split('|')[0].trim(),
      content: String(r[col('content')] || ''),
      author: MATERIA_AUTOR,
    }, false);
    n++;
    Logger.log(`[MEME] Publicado: ${slug}`);
  });
  if (n && typeof avisaSiteNovaNoticia_ === 'function') avisaSiteNovaNoticia_();
  Logger.log(`[MEME] ${n} meme(s) publicado(s).`);
}

// -----------------------------------------------------------------------------
// Geração
// -----------------------------------------------------------------------------

function geraMeme_(season, week, teste) {
  const cfg = recapConfig_();
  Logger.log(`[MEME] ${teste ? 'TESTE ' : ''}${season} semana ${week}: montando o dossiê...`);
  const base = `${cfg.site}/api/recap/context?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}&mode=week${cfg.token ? `&token=${encodeURIComponent(cfg.token)}` : ''}`;
  const dossie = buscaTexto_(base);
  const dados = JSON.parse(buscaTexto_(`${base}&format=json`));
  const times = Array.from(new Set((dados.matchups || []).flatMap(m => m.teams)));

  const mascotes = Object.keys(MEME_MASCOTES).map(t => `- ${t}: ${MEME_MASCOTES[t]}`).join('\n');
  const texto = [
    `Faça o meme da rodada (${season}, semana ${week}).`,
    '',
    dossie,
    loreTexto_(cfg, times, season, week),
    `\n\n## MASCOTES (para a cena; copie a descrição em inglês)\n${mascotes}`,
  ].join('\n');

  const { texto: resposta, modelo } = chamaGemini_(cfg, MEME_INSTRUCOES, texto);
  const meme = parseMeme_(resposta);
  if (!meme.titulo || !meme.cena || !meme.texto) throw new Error(`Resposta do Gemini fora do formato:\n${resposta.slice(0, 500)}`);

  // Duas versões da charge: o modelo não aceita "seed", então a variação vem
  // do enquadramento (plano aberto x mais perto dos personagens)
  const enquadramentos = [' Wide shot showing the whole scene.', ' Close-up on the characters\' faces and reactions.'];
  const imagens = [];
  [1, 2].forEach(i => {
    const blob = desenhaCharge_(MEME_ESTILO + meme.cena + enquadramentos[i - 1] + MEME_SEM_TEXTO);
    if (blob) imagens.push(salvaImagemMeme_(blob.setName(`meme-${season}-w${week}-${i}.jpg`), cfg.site));
  });
  if (!imagens.length) throw new Error('A Cloudflare não devolveu nenhuma imagem (veja o log acima).');

  const corpo = `> ${meme.legenda}\n\n${meme.texto}`.trim();
  gravaMateria_(teste ? MATERIA_ABA_TESTE : MATERIA_ABA, {
    title: meme.titulo,
    subtitle: meme.legenda,
    slug: slugMeme_(season, week, teste),
    category: MEME_CATEGORIA,
    date: teste ? `'${Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd')}` : new Date(),
    // No teste vão as duas charges (carrossel na prévia); publicado, só a 1ª
    imageUrl: teste ? imagens.join('|') : imagens[0],
    content: corpo,
    author: MATERIA_AUTOR,
  }, teste);
  Logger.log(`[MEME] "${meme.titulo}" (${imagens.length} charge(s), modelo ${modelo}). Cena: ${meme.cena}`);
  if (teste) {
    Logger.log(`[MEME] Prévia: ${cfg.site}/news/${slugMeme_(season, week, true)}`);
  } else {
    if (typeof avisaSiteNovaNoticia_ === 'function') avisaSiteNovaNoticia_();
    Logger.log(`[MEME] Publicado: ${cfg.site}/news/${slugMeme_(season, week, false)}`);
  }
}

function parseMeme_(resposta) {
  const t = String(resposta || '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) return {};
  try {
    const j = JSON.parse(t.slice(a, b + 1));
    return {
      titulo: String(j.titulo || '').trim(),
      legenda: String(j.legenda || '').trim(),
      cena: String(j.cena || '').trim(),
      texto: String(j.texto || '').trim(),
      times: Array.isArray(j.times) ? j.times : [],
    };
  } catch (e) {
    return {};
  }
}

// Cloudflare Workers AI (Flux, cota diária grátis): devolve a imagem ou null
function desenhaCharge_(prompt) {
  const props = PropertiesService.getScriptProperties();
  const conta = props.getProperty('CF_ACCOUNT_ID');
  const token = props.getProperty('CF_API_TOKEN');
  if (!conta || !token) throw new Error('Faltam CF_ACCOUNT_ID e CF_API_TOKEN nas Propriedades do script.');
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const res = UrlFetchApp.fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
      payload: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 8 }),
    });
    const json = JSON.parse(res.getContentText() || '{}');
    if (json.success && json.result && json.result.image) return Utilities.newBlob(Utilities.base64Decode(json.result.image), 'image/jpeg');
    Logger.log(`[MEME] Cloudflare (tentativa ${tentativa}) respondeu ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`);
    Utilities.sleep(3000);
  }
  return null;
}

function salvaImagemMeme_(blob, site) {
  const it = DriveApp.getFoldersByName(MEME_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(MEME_PASTA);
  const file = pasta.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `${site}/api/pr-photo/${file.getId()}`;
}

function slugMeme_(season, week, teste) {
  return `${teste ? 'teste-' : ''}meme-${season}-semana-${String(week).replace(/[^0-9]+/g, '-')}`;
}
