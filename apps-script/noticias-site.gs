// =============================================================================
// AVISO DE NOTÍCIA NOVA PARA O SITE (Tapitas News, aba MEMES)
// -----------------------------------------------------------------------------
// O site guarda as notícias em cache por até 1 dia e só chama o doGet do
// Apps Script quando o cache vence. Para uma notícia nova aparecer na hora,
// este script avisa o site sempre que:
//   - alguém envia o Google Form das notícias (gatilho "ao enviar formulário");
//   - alguém edita a aba MEMES direto na planilha (gatilho "ao editar").
// O aviso só limpa o cache do site (/api/news/refresh); a próxima visita
// busca a lista nova.
//
// COMO INSTALAR (uma vez só): cole este arquivo no Apps Script da planilha e
// rode instalaAvisoNoticiasSite(). Precisa da propriedade SITE_URL (a mesma
// usada pelos recaps e pelas fotos do Power Rankings).
// =============================================================================

const ABA_NOTICIAS = 'MEMES';

function instalaAvisoNoticiasSite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers()
    .filter(t => ['avisaSiteNoticiaForm', 'avisaSiteNoticiaEdicao'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('avisaSiteNoticiaForm').forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger('avisaSiteNoticiaEdicao').forSpreadsheet(ss).onEdit().create();
  Logger.log('[NOTÍCIAS] Gatilhos criados. Testando o aviso agora...');
  avisaSiteNovaNoticia_();
}

// Qualquer Form ligado à planilha (avisar a mais não tem custo: só faz o
// site buscar a lista de notícias de novo uma vez)
function avisaSiteNoticiaForm() {
  avisaSiteNovaNoticia_();
}

// Edição manual na aba MEMES
function avisaSiteNoticiaEdicao(e) {
  if (!e || !e.range || e.range.getSheet().getName() !== ABA_NOTICIAS) return;
  // Várias edições seguidas viram um aviso só (no máximo 1 a cada 30 s)
  const cache = CacheService.getScriptCache();
  if (cache.get('aviso-noticias')) return;
  cache.put('aviso-noticias', '1', 30);
  avisaSiteNovaNoticia_();
}

function avisaSiteNovaNoticia_() {
  const site = (PropertiesService.getScriptProperties().getProperty('SITE_URL') || '').replace(/\/+$/, '');
  if (!site) throw new Error('Falta SITE_URL nas Propriedades do script.');
  const res = UrlFetchApp.fetch(`${site}/api/news/refresh`, { muteHttpExceptions: true });
  Logger.log(`[NOTÍCIAS] Site avisado (${res.getResponseCode()}).`);
}
