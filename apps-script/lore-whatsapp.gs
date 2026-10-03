// =============================================================================
// LORE A PARTIR DO GRUPO DO WHATSAPP
// -----------------------------------------------------------------------------
// Lê a conversa exportada do grupo da liga e sugere itens de LORE (apelidos,
// piadas internas, rivalidades, promessas, trades polêmicas) com o Gemini.
// As sugestões entram na aba LORE da planilha privada com Ativo = "Não":
// você revisa e troca para "Sim" o que quiser que os recaps usem.
//
// CUIDADOS DE PRIVACIDADE (tudo feito ANTES de enviar qualquer coisa):
//   1. Só vão as mensagens que falam da liga (times, jogadores, termos de
//      fantasy: trade, draft, waiver, escalação, Unicórnio...) e as reações
//      logo depois delas ("kkkkk", "chora"). Papo pessoal fica de fora.
//   2. Ninguém vai pelo nome: cada pessoa vira o time dela (aba
//      WHATSAPP_PESSOAS), inclusive quando é citada no meio da mensagem.
//      Telefones, e-mails e links são apagados.
//   3. Quem marcar "Ignorar = Sim" na aba WHATSAPP_PESSOAS não tem nenhuma
//      mensagem enviada.
//   4. O arquivo exportado vai para a lixeira do Drive depois de processado.
//   5. testaWhatsAppLore() mostra no log exatamente o que SERIA enviado, sem
//      enviar nada. Rode antes da primeira vez.
// O Gemini usado é o mesmo dos recaps (GEMINI_API_KEY). Com a chave gratuita,
// o Google pode usar o conteúdo enviado para melhorar os produtos dele; com
// faturamento ativado (chave paga), não usa.
//
// COMO USAR
//   1. No WhatsApp: grupo → Mais → Exportar conversa → "Sem mídia". Salve o
//      arquivo (.txt ou .zip) na pasta do Drive "Tapitas - WhatsApp" (o script
//      cria a pasta na primeira execução, se não existir).
//   2. Rode processaWhatsAppLore(). Na primeira vez ele cria a aba
//      WHATSAPP_PESSOAS na planilha da LORE com todo mundo que aparece na
//      conversa: preencha a coluna Time de cada um (e "Sim" em Ignorar para
//      quem não quiser participar) e rode de novo.
//   3. Se a conversa for grande, ele para perto do limite de 6 minutos e
//      continua de onde parou na próxima execução (rode de novo até o log
//      dizer que terminou). Das próximas vezes, exporte de novo: só as
//      mensagens novas (depois da última processada) são lidas.
//   Pode ter mais de um grupo na pasta (ex.: o grupo antigo, até 2023, e o
//   atual): cada arquivo é lido, do grupo mais antigo para o mais novo, e cada
//   grupo guarda separado até onde já foi processado.
// Precisa: GEMINI_API_KEY, SITE_URL e LORE_SHEET_ID (as mesmas dos recaps).
// =============================================================================

const WA_PASTA = 'Tapitas - WhatsApp';
const WA_ABA_PESSOAS = 'WHATSAPP_PESSOAS';
const WA_TEMPO_MAX_MS = 4.5 * 60 * 1000;
const WA_TAMANHO_BLOCO = 24000; // caracteres por envio ao Gemini

// Termos de fantasy/liga (sem acento, minúsculos). Palavras comuns do dia a
// dia, como "semana", "final", "banco" ou "liga", ficam de fora de propósito:
// puxariam conversa pessoal.
const WA_TERMOS = [
  'trade', 'troca', 'trocar', 'trocou', 'draft', 'pick', 'waiver', 'waivers', 'faab', 'free agent', 'escalei', 'escalou',
  'escalacao', 'escalar', 'titular', 'bench', 'start', 'sit', 'pontos', 'pts', 'placar', 'rodada', 'week', 'matchup',
  'playoff', 'playoffs', 'semifinal', 'titulo', 'campeao', 'campeonato', 'tapitas', 'bowl', 'unicornio',
  'power ranking', 'ranking', 'recap', 'sleeper', 'fantasy', 'manager', 'comissario', 'lesao', 'lesionado',
  'injury', 'bye', 'qb', 'rb', 'wr', 'kicker', 'flex', 'projecao', 'h2h', 'rival', 'rivalidade',
  'hiato', 'fundador', 'zebra', 'secou', 'secar', 'touchdown', 'td', 'nfl', 'temporada', 'tank',
];
const WA_NFL_TIMES = ['cardinals', 'falcons', 'ravens', 'bills', 'panthers', 'bears', 'bengals', 'browns', 'cowboys', 'broncos',
  'lions', 'packers', 'texans', 'colts', 'jaguars', 'chiefs', 'raiders', 'chargers', 'rams', 'dolphins', 'vikings', 'patriots',
  'saints', 'giants', 'jets', 'eagles', 'steelers', '49ers', 'niners', 'seahawks', 'buccaneers', 'bucs', 'titans', 'commanders'];

// Mensagens que são só mídia/aviso (a mensagem inteira é isso)
const WA_MIDIA = /^(<(m[ií]dia oculta|media omitted)>|imagem ocultada|image omitted|v[ií]deo (omitido|ocultado)|video omitted|figurinha (omitida|ocultada)|sticker omitted|[aá]udio (omitido|ocultado)|audio omitted|gif (omitido|ocultado)|documento omitido|document omitted|.*mensagem (foi )?apagada|this message was deleted|voc[eê] apagou.*|null)$/i;
// Marca de mensagem editada, que vem grudada no texto
const WA_EDITADA = /\s*<(esta mensagem foi editada|mensagem editada|this message was edited)>\s*$/i;
const WA_PARTICULAS = new Set(['dos', 'das', 'del', 'van', 'von', 'the']);

const waSemAcento_ = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// -----------------------------------------------------------------------------
// Execução
// -----------------------------------------------------------------------------

function processaWhatsAppLore() {
  waExecuta_(false);
}

// Mostra no log o que seria enviado ao Gemini (nada é enviado nem gravado)
function testaWhatsAppLore() {
  waExecuta_(true);
}

// Recomeça a leitura do zero (esquece até onde já foi processado em cada grupo)
function recomecaWhatsAppLore() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).filter(k => k.indexOf('LORE_WA_ULTIMA') === 0).forEach(k => props.deleteProperty(k));
  Logger.log('[LORE WA] Próxima execução lê as conversas desde o começo.');
}

function waExecuta_(simulacao) {
  const inicio = Date.now();
  const cfg = recapConfig_(); // mesma configuração dos recaps (GEMINI_API_KEY etc.)
  if (!cfg.loreSheetId) throw new Error('Falta LORE_SHEET_ID nas Propriedades do script.');
  const lore = SpreadsheetApp.openById(cfg.loreSheetId);

  // Todas as conversas da pasta (ex.: o grupo antigo, até 2023, e o atual),
  // da mais antiga para a mais nova
  const arquivos = waArquivos_();
  if (!arquivos.length) {
    Logger.log(`[LORE WA] Nenhuma conversa na pasta "${WA_PASTA}" do Drive. Exporte o grupo (sem mídia) e salve o arquivo lá.`);
    return;
  }
  arquivos.forEach(a => Logger.log(`[LORE WA] ${a.nome}: ${a.mensagens.length} mensagens (${a.periodo}).`));

  // Pessoas → times (de todos os grupos juntos)
  const pessoas = waPessoas_(lore, [].concat(...arquivos.map(a => a.mensagens)));
  if (pessoas.faltando.length) {
    Logger.log(`[LORE WA] Preencha a coluna Time (ou Ignorar = Sim) na aba ${WA_ABA_PESSOAS} para: ${pessoas.faltando.join(', ')}. Depois rode de novo.`);
    if (!simulacao) return;
  }

  const props = PropertiesService.getScriptProperties();
  const existentes = simulacao ? [] : waLoreExistente_(lore);
  let sugestoes = 0;
  for (const arquivo of arquivos) {
    // Cada grupo guarda até onde já foi lido (exportar de novo só lê o que é novo)
    const ultima = Number(props.getProperty(arquivo.chave) || 0);
    const novas = arquivo.mensagens.filter(m => m.quando > ultima);
    const filtradas = waFiltra_(novas, pessoas);
    Logger.log(`[LORE WA] ${arquivo.nome}: ${novas.length} mensagens novas; ${filtradas.length} sobre a liga (as outras não são enviadas).`);
    if (!filtradas.length) {
      if (!simulacao) waTerminaArquivo_(arquivo, props, novas);
      continue;
    }

    const blocos = waBlocos_(filtradas);
    if (simulacao) {
      Logger.log(`[LORE WA] SIMULAÇÃO: seriam ${blocos.length} envios ao Gemini. Início do primeiro:\n` + blocos[0].texto.slice(0, 3000));
      continue;
    }

    for (let i = 0; i < blocos.length; i++) {
      if (Date.now() - inicio > WA_TEMPO_MAX_MS) {
        Logger.log(`[LORE WA] Parei perto do limite de tempo (${arquivo.nome}: ${i} de ${blocos.length} partes; ${sugestoes} sugestões até aqui). Rode de novo para continuar.`);
        return;
      }
      if (sugestoes || i) Utilities.sleep(RECAP_PAUSA_MS);
      const itens = waPedeSugestoes_(cfg, blocos[i].texto, existentes, pessoas.times);
      const novosItens = itens.filter(it => !existentes.some(e => waParecido_(e, it.texto)));
      novosItens.forEach(it => existentes.push(it.texto));
      waGravaSugestoes_(lore, novosItens, blocos[i].periodo);
      sugestoes += novosItens.length;
      props.setProperty(arquivo.chave, String(blocos[i].ate));
    }
    waTerminaArquivo_(arquivo, props, novas);
  }
  if (!simulacao) Logger.log(`[LORE WA] Pronto: ${sugestoes} sugestões novas na aba LORE (Ativo = Não). Revise e troque para "Sim" o que quiser usar.`);
}

function waTerminaArquivo_(arquivo, props, mensagens) {
  if (mensagens.length) props.setProperty(arquivo.chave, String(Math.max(...mensagens.map(m => m.quando))));
  arquivo.file.setTrashed(true);
  Logger.log(`[LORE WA] ${arquivo.nome} processado e enviado para a lixeira do Drive.`);
}

// -----------------------------------------------------------------------------
// Arquivos e leitura
// -----------------------------------------------------------------------------

function waArquivos_() {
  const it = DriveApp.getFoldersByName(WA_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(WA_PASTA);
  const out = [];
  const files = pasta.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.isTrashed() || !/\.(txt|zip)$/i.test(f.getName())) continue;
    let texto;
    if (/\.zip$/i.test(f.getName())) {
      const txt = Utilities.unzip(f.getBlob()).find(b => /\.txt$/i.test(b.getName()));
      if (!txt) continue;
      texto = txt.getDataAsString('UTF-8');
    } else {
      texto = f.getBlob().getDataAsString('UTF-8');
    }
    const mensagens = waLeConversa_(texto);
    if (!mensagens.length) {
      Logger.log(`[LORE WA] ${f.getName()}: não reconheci nenhuma mensagem (é a exportação do WhatsApp?).`);
      continue;
    }
    // O grupo é reconhecido pela primeira mensagem (não pelo nome do arquivo,
    // que pode se repetir entre grupos, como "_chat.txt")
    const primeira = mensagens[0];
    const chave = 'LORE_WA_ULTIMA_' + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, `${primeira.quando}|${primeira.autor}`)).slice(0, 16);
    const f2 = t => Utilities.formatDate(new Date(t), 'America/Sao_Paulo', 'dd/MM/yyyy');
    out.push({ file: f, nome: f.getName(), mensagens, chave, periodo: `${f2(primeira.quando)} a ${f2(mensagens[mensagens.length - 1].quando)}` });
  }
  return out.sort((a, b) => a.mensagens[0].quando - b.mensagens[0].quando);
}

// Formatos do WhatsApp (iPhone e Android, em português):
//   [03/10/2026, 18:15:32] Fulano: texto      (iPhone)
//   03/10/2026 18:15 - Fulano: texto          (Android)
function waLeConversa_(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const re = /^[‎‏]?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(?:-\s*)?(.*)$/;
  const out = [];
  let atual = null;
  linhas.forEach(linha => {
    const m = linha.match(re);
    if (m) {
      const resto = m[7];
      const sep = resto.indexOf(': ');
      if (sep < 1) { atual = null; return; } // aviso do sistema ("Fulano entrou"), sem autor
      const ano = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      const quando = new Date(ano, Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0)).getTime();
      atual = { quando, autor: resto.slice(0, sep).replace(/[‎‏~]/g, '').trim(), texto: resto.slice(sep + 2) };
      out.push(atual);
    } else if (atual) {
      atual.texto += '\n' + linha; // continuação de mensagem com várias linhas
    }
  });
  out.forEach(m => { m.texto = m.texto.replace(/[‎‏]/g, '').replace(WA_EDITADA, '').trim(); });
  return out.filter(m => m.texto && !WA_MIDIA.test(m.texto));
}

// -----------------------------------------------------------------------------
// Pessoas, filtro e anonimização
// -----------------------------------------------------------------------------

function waPessoas_(lore, mensagens) {
  let sh = lore.getSheetByName(WA_ABA_PESSOAS);
  if (!sh) {
    sh = lore.insertSheet(WA_ABA_PESSOAS);
    sh.appendRow(['Nome no WhatsApp', 'Time', 'Ignorar']);
  }
  const linhas = sh.getDataRange().getValues().slice(1);
  const conhecidos = new Set(linhas.map(r => String(r[0]).trim()));
  const autores = Array.from(new Set(mensagens.map(m => m.autor)));
  autores.filter(a => !conhecidos.has(a)).forEach(a => { sh.appendRow([a, '', 'Não']); linhas.push([a, '', 'Não']); });

  const mapa = {};
  const ignorar = new Set();
  const faltando = [];
  linhas.forEach(r => {
    const nome = String(r[0]).trim();
    const time = String(r[1] || '').trim();
    if (/^(s|sim|yes|true|1)$/i.test(String(r[2] || '').trim())) { ignorar.add(nome); return; }
    if (time) mapa[nome] = time;
    else if (autores.includes(nome)) faltando.push(nome);
  });
  // Partes do nome de cada pessoa (primeiro nome, apelido) para trocar quando
  // ela é citada no meio de uma mensagem
  const apelidos = {};
  Object.keys(mapa).forEach(nome => {
    waSemAcento_(nome).split(/[^a-z0-9]+/)
      .filter(p => p.length >= 3 && !/^\d+$/.test(p) && !WA_PARTICULAS.has(p))
      .forEach(p => { apelidos[p] = mapa[nome]; });
  });
  return { mapa, ignorar, faltando, apelidos, times: Array.from(new Set(Object.values(mapa))) };
}

function waPalavrasDaLiga_() {
  const palavras = new Set(WA_TERMOS.concat(WA_NFL_TIMES));
  try {
    const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
    const h = values[0].map(v => String(v).trim());
    const iTeam = h.indexOf('Team');
    const nomes = h.map((v, i) => (/^(S|B)\d+_Name$/.test(v) ? i : -1)).filter(i => i >= 0);
    values.slice(1).forEach(r => {
      waSemAcento_(r[iTeam]).split(/[^a-z0-9]+/).filter(p => p.length >= 4).forEach(p => palavras.add(p));
      nomes.forEach(i => {
        const partes = waSemAcento_(r[i]).split(/[^a-z0-9]+/).filter(Boolean);
        const sobrenome = partes[partes.length - 1];
        if (sobrenome && sobrenome.length >= 5) palavras.add(sobrenome);
      });
    });
  } catch (e) {
    Logger.log('[LORE WA] Não consegui ler times/jogadores da GAME_FACTS_ALL: ' + e);
  }
  return palavras;
}

function waAnonimiza_(texto, pessoas) {
  return String(texto)
    .replace(/(https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    // Telefones (+55 11 98765-4321, (11) 98765-4321) e qualquer sequência
    // longa de dígitos; placares como "142.56 - 138.20" continuam
    .replace(/(\+?\d{1,3}[\s-]?)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g, '[telefone]')
    .replace(/\d{8,}/g, '[telefone]')
    .replace(/@\[telefone\]/g, '[menção]')
    // Nomes das pessoas citadas no meio da mensagem viram o time delas
    .replace(/@?[\p{L}\p{N}]+/gu, palavra => pessoas.apelidos[waSemAcento_(palavra.replace(/^@/, ''))] || palavra)
    .trim();
}

function waFiltra_(mensagens, pessoas) {
  const palavras = waPalavrasDaLiga_();
  const lista = Array.from(palavras);
  const daLiga = texto => {
    const t = ` ${waSemAcento_(texto).replace(/[^a-z0-9]+/g, ' ')} `;
    return lista.some(p => t.includes(` ${p} `));
  };
  const out = [];
  let ultimaDaLiga = 0;
  let reacoes = 0;
  mensagens.forEach(m => {
    if (pessoas.ignorar.has(m.autor)) return;
    const autor = pessoas.mapa[m.autor] || 'Membro do grupo';
    if (daLiga(m.texto)) {
      ultimaDaLiga = m.quando;
      reacoes = 0;
      out.push({ quando: m.quando, autor, texto: waAnonimiza_(m.texto, pessoas) });
    } else if (ultimaDaLiga && m.quando - ultimaDaLiga <= 5 * 60 * 1000 && reacoes < 3 && m.texto.length <= 140) {
      // Reação curta logo depois de uma mensagem da liga ("kkkkk", "chora")
      reacoes++;
      out.push({ quando: m.quando, autor, texto: waAnonimiza_(m.texto, pessoas) });
    }
  });
  return out;
}

function waBlocos_(mensagens) {
  const blocos = [];
  let atual = null;
  mensagens.forEach(m => {
    const data = Utilities.formatDate(new Date(m.quando), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
    const linha = `[${data}] ${m.autor}: ${m.texto.replace(/\n+/g, ' / ')}\n`;
    if (!atual || atual.texto.length + linha.length > WA_TAMANHO_BLOCO) {
      atual = { texto: '', de: m.quando, ate: m.quando };
      blocos.push(atual);
    }
    atual.texto += linha;
    atual.ate = m.quando;
  });
  blocos.forEach(b => {
    const f = t => Utilities.formatDate(new Date(t), 'America/Sao_Paulo', 'dd/MM/yyyy');
    b.periodo = `WhatsApp ${f(b.de)}–${f(b.ate)}`;
  });
  return blocos;
}

// -----------------------------------------------------------------------------
// Gemini e gravação
// -----------------------------------------------------------------------------

function waLoreExistente_(lore) {
  const sh = lore.getSheetByName('LORE') || lore.getSheets()[0];
  const [head, ...rows] = sh.getDataRange().getValues();
  const iX = head.map(h => String(h).trim().toLowerCase()).indexOf('texto');
  return rows.map(r => String(r[iX] || '').trim()).filter(Boolean);
}

const waNormaliza_ = t => waSemAcento_(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function waParecido_(a, b) {
  const pa = new Set(waNormaliza_(a).split(' ').filter(w => w.length > 3));
  const pb = new Set(waNormaliza_(b).split(' ').filter(w => w.length > 3));
  const inter = Array.from(pa).filter(w => pb.has(w)).length;
  return inter / Math.max(1, Math.min(pa.size, pb.size)) >= 0.7;
}

function waPedeSugestoes_(cfg, trecho, existentes, times) {
  const sistema = [
    'Você ajuda a montar a LORE de uma liga de fantasy football entre amigos (Tapitas League): apelidos, piadas internas,',
    'rivalidades, provocações marcantes, promessas e apostas ("se eu perder, ..."), trades polêmicas e momentos históricos',
    'que um narrador pode citar nos resumos dos jogos.',
    'Você recebe um trecho da conversa do grupo, já filtrado e anônimo: cada pessoa aparece pelo nome do time dela.',
    'REGRAS:',
    '- Use só o que aparece no trecho. Não invente nada.',
    '- Ignore qualquer assunto pessoal ou sensível (saúde, família, trabalho, política, religião, dinheiro fora da liga,',
    '  endereços, relacionamentos). Se o trecho tiver isso, simplesmente não use.',
    '- Nada de ofensa pesada nem de expor alguém; zoeira leve de fantasy, sim.',
    '- Cada item: 1 ou 2 frases em português, escritas como contexto para o narrador (como nos exemplos da LORE).',
    '- Só o que tiver cara de piada recorrente ou história marcante; no máximo 12 itens. Pode devolver lista vazia.',
    '- Não repita itens que já existem na LORE (lista abaixo).',
    'RESPOSTA: só um JSON, sem texto em volta, no formato',
    '[{"tipo": "Apelido|Piada interna|Rivalidade|Narrativa|Promessa|Geral", "alvo": "nome do time ou vazio", "texto": "..."}]',
    `Times da liga: ${times.join(', ')}.`,
  ].join('\n');
  const texto = `## LORE QUE JÁ EXISTE\n${existentes.slice(0, 120).map(t => `- ${t}`).join('\n')}\n\n## TRECHO DA CONVERSA\n${trecho}`;
  const { texto: resposta } = chamaGemini_(cfg, sistema, texto);
  const a = resposta.indexOf('['), b = resposta.lastIndexOf(']');
  if (a < 0 || b < a) return [];
  try {
    return JSON.parse(resposta.slice(a, b + 1))
      .filter(it => it && String(it.texto || '').trim())
      .map(it => ({ tipo: String(it.tipo || 'Geral').trim(), alvo: String(it.alvo || '').trim(), texto: String(it.texto).trim() }));
  } catch (e) {
    Logger.log('[LORE WA] Resposta do Gemini fora do formato; parte ignorada.');
    return [];
  }
}

function waGravaSugestoes_(lore, itens, periodo) {
  if (!itens.length) return;
  const sh = lore.getSheetByName('LORE') || lore.getSheets()[0];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  // Coluna extra "Origem" (os recaps ignoram): de onde veio a sugestão
  let iOrigem = head.findIndex(h => h.toLowerCase() === 'origem');
  if (iOrigem < 0) {
    iOrigem = head.length;
    sh.getRange(1, iOrigem + 1).setValue('Origem');
    head.push('Origem');
  }
  const col = name => head.findIndex(h => h.toLowerCase() === name);
  const linhas = itens.map(it => {
    const linha = new Array(head.length).fill('');
    linha[col('tipo')] = it.tipo;
    linha[col('alvo')] = it.alvo;
    linha[col('texto')] = it.texto;
    linha[col('ativo')] = 'Não';
    linha[iOrigem] = periodo;
    return linha;
  });
  sh.getRange(sh.getLastRow() + 1, 1, linhas.length, head.length).setValues(linhas);
}
