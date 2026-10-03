// =============================================================================
// FOTOS PERSONALIZADAS DOS CARDS DO POWER RANKINGS
// -----------------------------------------------------------------------------
// Cada card do Power Rankings no site mostra, por padrão, a foto recortada do
// jogador que mais pontuou pelo time na semana. Com este formulário dá para
// trocar essa foto por uma escolhida por você (como nos posts do Instagram).
//
// COMO INSTALAR (uma vez só):
//   1. Cole este arquivo no Apps Script da planilha (arquivo novo).
//   2. Rode criaFormFotosPR(). No log aparecem dois links: o de EDITAR o
//      formulário e o de RESPONDER.
//   3. Abra o link de EDITAR e adicione uma pergunta do tipo
//      "Upload de arquivo" com o título exatamente  Foto  (permitir só
//      imagens, 1 arquivo). O Apps Script não consegue criar esse tipo de
//      pergunta sozinho; é a única parte manual.
//
// COMO USAR: abra o link de RESPONDER, escolha o time, envie a foto (ou cole
// um link de imagem; ele é copiado para o Drive) e pronto. Também dá para
// escrever direto na aba PR_FOTOS: Season, Week, Team e o link na coluna Url
// (deixe FileId vazio); o gatilho diário copia a imagem para o Drive, ou rode
// salvaLinksManuaisPR() para fazer na hora. Temporada e semana em branco = semana atual do Power
// Rankings. Para trocar, é só enviar de novo: vale a última foto enviada para
// aquele time naquela semana. Em alguns minutos aparece no site.
//
// O que acontece por trás: cada envio vira uma linha na aba PR_FOTOS
// (Season, Week, Team, FileId, Url, Enviado, Fonte, Jogador, PlayerId, Pts),
// e o arquivo enviado fica público "qualquer pessoa com o link pode ver",
// para o site conseguir exibir. Foto enviada pelo Form sempre tem prioridade.
//
// FOTOS AUTOMÁTICAS (guardadas no Drive):
// O site acha sozinho uma foto de jogo do destaque de cada time na semana
// (notícias da ESPN), mas a ESPN só mantém as notícias recentes: depois de
// algumas semanas a foto não é mais encontrada. Por isso este script copia
// cada foto encontrada para uma pasta do Drive ("Tapitas League - Fotos PR")
// e registra na PR_FOTOS (Fonte = auto); assim ela fica para sempre.
//   - Rode instalaFotosAutomaticasPR() uma vez: cria um gatilho diário (10h)
//     que guarda as fotos da semana mais recente do Power Rankings.
//   - Rode salvaFotosTemporadaPR() uma vez para guardar também as semanas
//     já jogadas da temporada atual (enquanto a ESPN ainda tem as fotos).
// Uma foto automática já guardada só é trocada se aparecer foto de um jogador
// do time que pontuou mais naquela semana; foto do Form nunca é trocada.
// Precisa da propriedade SITE_URL (a mesma usada pelos recaps).
// =============================================================================

const PR_FOTOS_HEADERS = ['Season', 'Week', 'Team', 'FileId', 'Url', 'Enviado', 'Fonte', 'Jogador', 'PlayerId', 'Pts', 'Credito'];
const PR_FOTOS_PASTA = 'Tapitas League - Fotos PR';

const PR_FOTOS_TAB = 'PR_FOTOS';

function criaFormFotosPR() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('PR_FOTOS_SHEET_ID', ss.getId());

  const form = FormApp.create('Tapitas League · Foto do Power Rankings');
  form.setDescription('Escolha o time e envie a foto que vai no card dele no Power Rankings. ' +
    'Temporada e semana em branco = semana atual. Enviar de novo troca a foto.');
  form.addListItem().setTitle('Time').setChoiceValues(timesAtuaisPR_()).setRequired(true);
  form.addTextItem().setTitle('Temporada').setHelpText('Ex.: 2026. Em branco = temporada atual.');
  form.addTextItem().setTitle('Semana').setHelpText('Ex.: 4. Em branco = última semana com Power Rankings.');
  form.addTextItem().setTitle('Link da foto')
    .setHelpText('Opcional se você enviar o arquivo na pergunta "Foto": link do Google Drive ou de uma imagem na internet.');
  props.setProperty('PR_FOTOS_FORM_ID', form.getId());

  // Gatilho: cada resposta do formulário vira uma linha na PR_FOTOS
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'aoEnviarFotoPR')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('aoEnviarFotoPR').forForm(form).onFormSubmit().create();

  abaFotosPR_(ss);
  Logger.log('EDITAR (adicione a pergunta "Upload de arquivo" chamada Foto): ' + form.getEditUrl());
  Logger.log('RESPONDER (link para usar/compartilhar): ' + form.getPublishedUrl());
}

// Gatilho do formulário
function aoEnviarFotoPR(e) {
  const answers = {};
  e.response.getItemResponses().forEach(r => { answers[r.getItem().getTitle().trim()] = r.getResponse(); });

  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('PR_FOTOS_SHEET_ID'));
  const team = String(answers['Time'] || '').trim();
  let season = String(answers['Temporada'] || '').trim();
  let week = String(answers['Semana'] || '').trim();
  if (!season || !week) {
    const atual = ultimaSemanaPR_(ss);
    season = season || atual.season;
    week = week || atual.week;
  }

  // Arquivo enviado na pergunta "Foto" ou link colado
  let fileId = '';
  let url = '';
  const upload = answers['Foto'];
  if (Array.isArray(upload) && upload.length) fileId = String(upload[0]);
  const link = String(answers['Link da foto'] || '').trim();
  if (!fileId && link) {
    const m = link.match(/(?:\/d\/|[?&]id=)([\w-]{10,})/);
    if (m && /drive\.google|docs\.google/.test(link)) fileId = m[1];
    else url = link;
  }
  if (!team || (!fileId && !url)) {
    Logger.log('[FOTOS PR] Envio ignorado: faltou o time ou a foto.');
    return;
  }

  // Link de fora (Google Imagens, site de notícia...): guarda uma cópia no
  // Drive, para a foto não sumir se o site de origem tirar do ar
  if (!fileId && url) {
    const copia = copiaLinkParaDrivePR_(url, `${season}-W${week}-${team} - manual`);
    if (copia) fileId = copia;
  }
  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {
      Logger.log('[FOTOS PR] Não consegui deixar a foto pública: ' + err);
    }
  }

  abaFotosPR_(ss).appendRow([season, week, team, fileId, url, new Date(), 'form', '', '', '', '']);
  Logger.log(`[FOTOS PR] Foto salva: ${team} · ${season} semana ${week}`);
}

function abaFotosPR_(ss) {
  let sheet = ss.getSheetByName(PR_FOTOS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(PR_FOTOS_TAB);
    // Texto puro: semana "14-15" não pode virar data
    sheet.getRange('A:B').setNumberFormat('@');
  }
  // Cabeçalho completo (abas criadas por versões anteriores ganham as colunas novas)
  sheet.getRange(1, 1, 1, PR_FOTOS_HEADERS.length).setValues([PR_FOTOS_HEADERS]);
  return sheet;
}

// ---------------------------------------------------------------------------
// FOTOS AUTOMÁTICAS
// ---------------------------------------------------------------------------

function instalaFotosAutomaticasPR() {
  PropertiesService.getScriptProperties().setProperty('PR_FOTOS_SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'salvaFotosAutomaticasPR')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('salvaFotosAutomaticasPR').timeBased().everyDays(1).atHour(10).create();
  Logger.log('[FOTOS PR] Gatilho diário criado. Rodando agora a primeira vez...');
  salvaFotosAutomaticasPR();
}

// Semana mais recente do Power Rankings (ou a temporada/semana informadas)
function salvaFotosAutomaticasPR(season, week) {
  const ss = planilhaFotosPR_();
  if (!season || typeof season === 'object') {
    try { salvaLinksManuaisPR(); } catch (err) { Logger.log('[FOTOS PR] Links manuais: ' + err); }
  }
  if (!season || !week || typeof season === 'object') {
    const atual = ultimaSemanaPR_(ss);
    season = atual.season;
    week = atual.week;
  }
  if (!season || !week) return;

  const site = (PropertiesService.getScriptProperties().getProperty('SITE_URL') || '').replace(/\/+$/, '');
  if (!site) throw new Error('Falta SITE_URL nas Propriedades do script.');
  let res;
  try {
    res = UrlFetchApp.fetch(`${site}/api/league/pr-photos?season=${encodeURIComponent(season)}&week=${encodeURIComponent(week)}`, { muteHttpExceptions: true });
  } catch (err) {
    Logger.log(`[FOTOS PR] Sem resposta do site para ${season} semana ${week}: ${err}`);
    return false;
  }
  if (res.getResponseCode() !== 200) {
    Logger.log(`[FOTOS PR] Site respondeu ${res.getResponseCode()} para ${season} semana ${week}.`);
    return false;
  }
  const fotos = JSON.parse(res.getContentText() || '{}');

  const sheet = abaFotosPR_(ss);
  const values = sheet.getDataRange().getValues();
  // Linha existente de cada time nesta semana (a última vale)
  const existentes = {};
  values.slice(1).forEach((r, i) => {
    if (String(r[0]).trim() !== String(season) || String(r[1]).trim() !== String(week)) return;
    existentes[String(r[2]).trim()] = { linha: i + 2, fonte: String(r[6] || '').trim().toLowerCase(), fileId: String(r[3] || ''), pts: Number(String(r[9] || '0').replace(',', '.')) || 0 };
  });
  const pasta = pastaFotosPR_();
  let salvas = 0;

  Object.keys(fotos).forEach(team => {
    const f = fotos[team];
    if (!f || !f.url) return;
    const atual = existentes[team];
    // Foto do Form nunca é trocada. Automática só é trocada por foto de um
    // jogador que pontuou mais (a regra do site é: maior pontuador do time)
    if (atual && (atual.fonte !== 'auto' || !(Number(f.pts) > atual.pts + 0.001))) return;
    try {
      const blob = UrlFetchApp.fetch(f.url).getBlob()
        .setName(`${season}-W${week}-${team} - ${f.player || 'foto'}.jpg`);
      const file = pasta.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const linha = [String(season), String(week), team, file.getId(), f.url, new Date(), 'auto', f.player || '', f.playerId || '', f.pts || '', f.credit || ''];
      if (atual) {
        sheet.getRange(atual.linha, 1, 1, linha.length).setValues([linha]);
        try { DriveApp.getFileById(atual.fileId).setTrashed(true); } catch (e) {}
      } else {
        sheet.appendRow(linha);
      }
      salvas++;
    } catch (err) {
      Logger.log(`[FOTOS PR] Falhou ${team}: ${err}`);
    }
  });
  const total = Object.keys(fotos).length;
  const comFoto = Object.keys(fotos).filter(t => fotos[t] && fotos[t].url).length;
  Logger.log(`[FOTOS PR] ${season} semana ${week}: ${salvas} fotos novas guardadas no Drive (${comFoto} de ${total} times com foto).`);
  // "completa" = todos os times com foto (semanas sem escalação, como 2015/16, não têm o que buscar)
  return { ok: true, completa: comFoto === total };
}

// Todas as semanas já jogadas da temporada atual (rodar uma vez)
function salvaFotosTemporadaPR() {
  const ss = planilhaFotosPR_();
  const atual = ultimaSemanaPR_(ss);
  const values = ss.getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
  const h = values[0].map(v => String(v).trim());
  const iS = h.indexOf('Season'), iW = h.indexOf('Week'), iPR = h.indexOf('Power Ranking');
  const semanas = Array.from(new Set(values.slice(1)
    .filter(r => String(r[iS]) === String(atual.season) && Number(String(r[iPR]).replace(',', '.')) > 0)
    .map(r => String(r[iW]))));
  semanas.forEach(w => salvaFotosAutomaticasPR(atual.season, w));
}

// ---------------------------------------------------------------------------
// HISTÓRICO (temporadas antigas)
// ---------------------------------------------------------------------------
// Semanas antigas: a ESPN não guarda mais as fotos, então o site usa a galeria
// do jogador no Wikimedia Commons (foto livre, com crédito). São mais de 100
// semanas; o Apps Script só pode rodar ~6 min por vez, então o trabalho é
// feito aos poucos:
//   - Rode instalaHistoricoPR() uma vez. Um gatilho roda a cada 15 minutos,
//     guarda as fotos de algumas semanas por vez e se desliga sozinho no fim.
//   - Para recomeçar do zero: refazHistoricoPR() (só preenche o que falta e
//     troca foto por uma de quem pontuou mais) ou limpaERefazHistoricoPR()
//     (apaga as fotos automáticas das temporadas passadas e busca de novo).

function instalaHistoricoPR() {
  PropertiesService.getScriptProperties().setProperty('PR_FOTOS_SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'salvaFotosHistoricoPR')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('salvaFotosHistoricoPR').timeBased().everyMinutes(15).create();
  Logger.log('[FOTOS PR] Histórico: gatilho de 15 em 15 minutos criado. Rodando a primeira leva agora...');
  salvaFotosHistoricoPR();
}

function salvaFotosHistoricoPR() {
  const inicio = Date.now();
  const props = PropertiesService.getScriptProperties();
  const feitas = new Set(JSON.parse(props.getProperty('PR_FOTOS_HIST_FEITAS') || '[]'));
  const ss = planilhaFotosPR_();
  const values = ss.getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
  const h = values[0].map(v => String(v).trim());
  const iS = h.indexOf('Season'), iW = h.indexOf('Week'), iPR = h.indexOf('Power Ranking');
  const semanas = [];
  values.slice(1).forEach(r => {
    if (!(Number(String(r[iPR]).replace(',', '.')) > 0)) return;
    const key = `${r[iS]}|${r[iW]}`;
    if (!semanas.includes(key)) semanas.push(key);
  });
  const pendentes = semanas.filter(k => !feitas.has(k));
  for (const key of pendentes) {
    if (Date.now() - inicio > 4.5 * 60 * 1000) break; // deixa folga no limite de 6 min
    const [season, week] = key.split('|');
    const res = salvaFotosAutomaticasPR(season, week);
    // Semana concluída quando todos os times têm foto; se faltar algum (site
    // demorou, fonte fora do ar), tenta de novo nas próximas rodadas, até 3 vezes
    const tentativas = JSON.parse(props.getProperty('PR_FOTOS_HIST_TENTATIVAS') || '{}');
    tentativas[key] = (tentativas[key] || 0) + 1;
    props.setProperty('PR_FOTOS_HIST_TENTATIVAS', JSON.stringify(tentativas));
    if (res && res.ok && (res.completa || tentativas[key] >= 3)) {
      feitas.add(key);
      props.setProperty('PR_FOTOS_HIST_FEITAS', JSON.stringify(Array.from(feitas)));
    }
  }
  const faltam = semanas.filter(k => !feitas.has(k)).length;
  Logger.log(`[FOTOS PR] Histórico: ${semanas.length - faltam} de ${semanas.length} semanas prontas.`);
  if (!faltam) {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'salvaFotosHistoricoPR')
      .forEach(t => ScriptApp.deleteTrigger(t));
    Logger.log('[FOTOS PR] Histórico completo. Gatilho desligado.');
  }
}

// Refaz semanas específicas: edite a lista e rode refazSemanasPR(). Só
// preenche os times sem foto (ou troca por foto de quem pontuou mais); foto do
// Form/manual nunca é trocada.
const SEMANAS_PARA_REFAZER = [['2021', '9'], ['2021', '10']];

function refazSemanasPR() {
  SEMANAS_PARA_REFAZER.forEach(([season, week]) => salvaFotosAutomaticasPR(String(season), String(week)));
}

// Apaga as fotos AUTOMÁTICAS das temporadas passadas (linhas da PR_FOTOS e
// arquivos no Drive) e refaz o histórico com a busca atual do site. Fotos do
// Form e as da temporada atual não são tocadas.
function limpaERefazHistoricoPR() {
  const ss = planilhaFotosPR_();
  const sheet = abaFotosPR_(ss);
  const atual = String(ultimaSemanaPR_(ss).season);
  const values = sheet.getDataRange().getValues();
  let apagadas = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    const auto = String(r[6] || '').trim().toLowerCase() === 'auto';
    if (!auto || String(r[0]).trim() === atual) continue;
    try { if (r[3]) DriveApp.getFileById(String(r[3])).setTrashed(true); } catch (e) {}
    sheet.deleteRow(i + 1);
    apagadas++;
  }
  Logger.log(`[FOTOS PR] ${apagadas} fotos automáticas antigas apagadas. Refazendo o histórico...`);
  refazHistoricoPR();
}

function refazHistoricoPR() {
  PropertiesService.getScriptProperties().deleteProperty('PR_FOTOS_HIST_FEITAS');
  PropertiesService.getScriptProperties().deleteProperty('PR_FOTOS_HIST_TENTATIVAS');
  instalaHistoricoPR();
}

// Baixa uma imagem de um link e guarda na pasta das fotos; devolve o ID do
// arquivo (ou '' se o link não for uma imagem)
function copiaLinkParaDrivePR_(url, nome) {
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const tipo = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
    if (res.getResponseCode() !== 200 || !/^image\//.test(tipo)) {
      Logger.log(`[FOTOS PR] O link não é uma imagem (${res.getResponseCode()}, ${tipo}): ${url}`);
      return '';
    }
    const file = pastaFotosPR_().createFile(res.getBlob().setName(`${nome}.jpg`));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getId();
  } catch (err) {
    Logger.log(`[FOTOS PR] Não consegui baixar ${url}: ${err}`);
    return '';
  }
}

// Linhas escritas à mão na PR_FOTOS (Season, Week, Team e o link na coluna
// Url, sem FileId): copia a imagem para o Drive e preenche o FileId. Roda
// junto com o gatilho diário; também dá para rodar na hora.
function salvaLinksManuaisPR() {
  const sheet = abaFotosPR_(planilhaFotosPR_());
  const values = sheet.getDataRange().getValues();
  let feitas = 0;
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const fileId = String(r[3] || '').trim();
    const url = String(r[4] || '').trim();
    const fonte = String(r[6] || '').trim().toLowerCase();
    if (fileId || !/^https?:\/\//.test(url) || fonte === 'auto') continue;
    const id = copiaLinkParaDrivePR_(url, `${r[0]}-W${r[1]}-${r[2]} - manual`);
    if (!id) continue;
    sheet.getRange(i + 1, 4).setValue(id);
    if (!fonte) sheet.getRange(i + 1, 7).setValue('manual');
    feitas++;
  }
  Logger.log(`[FOTOS PR] ${feitas} fotos manuais copiadas para o Drive.`);
}

function planilhaFotosPR_() {
  const id = PropertiesService.getScriptProperties().getProperty('PR_FOTOS_SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function pastaFotosPR_() {
  const it = DriveApp.getFoldersByName(PR_FOTOS_PASTA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PR_FOTOS_PASTA);
}

// Temporada e semana mais recentes com Power Ranking na GAME_FACTS_ALL
function ultimaSemanaPR_(ss) {
  const values = ss.getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
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

// Times da temporada mais recente (opções do formulário)
function timesAtuaisPR_() {
  const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL').getDataRange().getValues();
  const h = values[0].map(v => String(v).trim());
  const iS = h.indexOf('Season'), iT = h.indexOf('Team');
  const last = Math.max.apply(null, values.slice(1).map(r => Number(r[iS]) || 0));
  return Array.from(new Set(values.slice(1).filter(r => Number(r[iS]) === last).map(r => String(r[iT]).trim()).filter(Boolean))).sort();
}
