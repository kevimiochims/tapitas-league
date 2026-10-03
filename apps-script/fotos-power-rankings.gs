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
// um link) e pronto. Temporada e semana em branco = semana atual do Power
// Rankings. Para trocar, é só enviar de novo: vale a última foto enviada para
// aquele time naquela semana. Em alguns minutos aparece no site.
//
// O que acontece por trás: cada envio vira uma linha na aba PR_FOTOS
// (Season, Week, Team, FileId, Url, Enviado), e o arquivo enviado fica
// público "qualquer pessoa com o link pode ver", para o site conseguir exibir.
// =============================================================================

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

  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {
      Logger.log('[FOTOS PR] Não consegui deixar a foto pública: ' + err);
    }
  }

  abaFotosPR_(ss).appendRow([season, week, team, fileId, url, new Date()]);
  Logger.log(`[FOTOS PR] Foto salva: ${team} · ${season} semana ${week}`);
}

function abaFotosPR_(ss) {
  let sheet = ss.getSheetByName(PR_FOTOS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(PR_FOTOS_TAB);
    sheet.appendRow(['Season', 'Week', 'Team', 'FileId', 'Url', 'Enviado']);
    // Texto puro: semana "14-15" não pode virar data
    sheet.getRange('A:B').setNumberFormat('@');
  }
  return sheet;
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
