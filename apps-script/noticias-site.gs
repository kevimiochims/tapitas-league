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
  try {
    converteMidiasEditadas_(e.range);
  } catch (err) {
    Logger.log(`[NOTÍCIAS] Não consegui converter o link de mídia: ${err.message}`);
  }
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

// Link do Drive (foto, GIF ou vídeo) ou de página do Giphy colado na aba MEMES,
// na coluna imageUrl ou no texto como ![legenda](link): troca na hora pelo
// link que o site exibe (mesma regra da pauta, ver imagemParaSite_ no
// recaps-ia.gs). YouTube, .mp4 e fotos de outros sites ficam como estão: o
// site já mostra direto.
const MIDIA_PARA_CONVERTER = /(?:drive|docs)\.google\.com\/|^https?:\/\/(?:www\.)?giphy\.com\//i;

function converteMidiasEditadas_(range) {
  if (typeof imagemParaSite_ !== 'function') return;
  const sh = range.getSheet();
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const iImg = head.findIndex(h => ['imageurl', 'image', 'imagem', 'image url'].includes(h)) + 1;
  const iTxt = head.findIndex(h => ['content', 'conteudo', 'conteúdo', 'texto'].includes(h)) + 1;
  const r0 = range.getRow(), c0 = range.getColumn();
  const converte = (link, nome) => {
    const url = String(link || '').trim();
    return url && MIDIA_PARA_CONVERTER.test(url) ? (imagemParaSite_(url, nome) || url) : url;
  };
  range.getValues().forEach((linha, i) => {
    const row = r0 + i;
    if (row === 1) return;
    linha.forEach((valor, j) => {
      const col = c0 + j;
      const texto = String(valor || '');
      if (!texto || (col !== iImg && col !== iTxt)) return;
      const nome = `noticia-linha-${row}`;
      const novo = col === iImg
        ? texto.split('|').map(x => converte(x, nome)).join('|')
        : texto.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, (m, legenda, link) => `![${legenda}](${converte(link, nome)})`);
      if (novo !== texto) {
        sh.getRange(row, col).setValue(novo);
        Logger.log(`[NOTÍCIAS] Link de mídia convertido na linha ${row}.`);
      }
    });
  });
}
