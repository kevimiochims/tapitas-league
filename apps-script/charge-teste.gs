// =============================================================================
// TESTE: CHARGE DA RODADA COM IA GRATUITA
// -----------------------------------------------------------------------------
// Antes de montar o meme semanal, descobre qual gerador de imagem gratuito
// funciona com as suas contas. Cada teste desenha a mesma cena de exemplo e
// salva a imagem na pasta "Tapitas League - Charges" do Drive; o log mostra o
// link para você ver o resultado.
//
//   1. testaChargeGemini(): usa a sua GEMINI_API_KEY (a mesma dos recaps).
//      Tenta os modelos de imagem que a sua chave enxerga e manda os avatares
//      de dois times (Pequers Verde e Patrolao Squad) como referência, para a
//      charge usar os "personagens" da liga. Se o log disser "sem cota" ou 429
//      em todos, a imagem do Gemini não está liberada no plano gratuito.
//
//   2. testaChargeCloudflare(): usa a cota diária grátis da Cloudflare (modelo
//      Flux). Precisa de uma conta gratuita em cloudflare.com e de duas
//      Propriedades do script:
//        CF_ACCOUNT_ID  = o "Account ID" (painel da Cloudflare → Workers AI)
//        CF_API_TOKEN   = um token com permissão "Workers AI" (My Profile →
//                         API Tokens → Create Token → modelo "Workers AI")
//      Esse modelo não recebe os avatares como referência: os times viram
//      mascotes descritos em texto.
// =============================================================================

const CHARGE_PASTA = 'Tapitas League - Charges';
const CHARGE_CENA = 'Editorial cartoon, newspaper comic style, bold ink outlines and flat colors. ' +
  'In a locker room, a sad green goat wearing an american football jersey sits alone on a bench holding a tiny unicorn trophy, ' +
  'while a cheerful yellow bulldozer wearing a football helmet dances under falling confetti behind him. ' +
  'Funny and expressive, clean composition. No text, no letters, no words.';

function testaChargeGemini() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const site = (PropertiesService.getScriptProperties().getProperty('SITE_URL') || '').replace(/\/+$/, '');
  if (!key) throw new Error('Falta GEMINI_API_KEY nas Propriedades do script.');

  // Modelos de imagem que a chave enxerga
  const lista = JSON.parse(UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`, { muteHttpExceptions: true }).getContentText());
  const modelos = (lista.models || [])
    .filter(m => /image/i.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name.replace('models/', ''));
  Logger.log(`[CHARGE] Modelos de imagem na sua chave: ${modelos.join(', ') || 'nenhum'}`);
  if (!modelos.length) return;

  // Avatares de dois times como referência (os "personagens" da charge)
  const refs = [];
  if (site) {
    ['pequers', 'patrolao'].forEach(n => {
      try {
        const blob = UrlFetchApp.fetch(`${site}/images/${n}.png`).getBlob();
        refs.push({ inline_data: { mime_type: 'image/png', data: Utilities.base64Encode(blob.getBytes()) } });
      } catch (e) { Logger.log(`[CHARGE] Avatar ${n}: ${e}`); }
    });
  }
  const pedido = refs.length
    ? 'The two reference images are the mascots of two fantasy football teams: the first is Pequers Verde (the loser), the second is Patrolao Squad (the winner). Draw them as the characters of this scene, keeping their look. ' + CHARGE_CENA
    : CHARGE_CENA;

  for (const modelo of modelos) {
    const res = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [...refs, { text: pedido }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const json = JSON.parse(res.getContentText() || '{}');
    if (json.error) { Logger.log(`[CHARGE] ${modelo}: erro ${json.error.code} — ${String(json.error.message).slice(0, 200)}`); continue; }
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    const img = parts.find(p => p.inlineData || p.inline_data);
    if (!img) { Logger.log(`[CHARGE] ${modelo}: respondeu sem imagem (${parts.map(p => p.text || '').join(' ').slice(0, 200)})`); continue; }
    const data = (img.inlineData || img.inline_data);
    salvaCharge_(Utilities.newBlob(Utilities.base64Decode(data.data), data.mimeType || data.mime_type || 'image/png', `teste-gemini-${modelo}.png`), site);
    return;
  }
  Logger.log('[CHARGE] Nenhum modelo de imagem do Gemini funcionou com a chave gratuita.');
}

function testaChargeCloudflare() {
  const props = PropertiesService.getScriptProperties();
  const conta = props.getProperty('CF_ACCOUNT_ID');
  const token = props.getProperty('CF_API_TOKEN');
  const site = (props.getProperty('SITE_URL') || '').replace(/\/+$/, '');
  if (!conta || !token) throw new Error('Faltam CF_ACCOUNT_ID e CF_API_TOKEN nas Propriedades do script (veja as instruções no topo do arquivo).');
  const res = UrlFetchApp.fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
    payload: JSON.stringify({ prompt: CHARGE_CENA, steps: 8 }),
  });
  const json = JSON.parse(res.getContentText() || '{}');
  if (!json.success || !json.result || !json.result.image) {
    Logger.log(`[CHARGE] Cloudflare respondeu ${res.getResponseCode()}: ${res.getContentText().slice(0, 300)}`);
    return;
  }
  salvaCharge_(Utilities.newBlob(Utilities.base64Decode(json.result.image), 'image/jpeg', 'teste-cloudflare-flux.jpg'), site);
}

function salvaCharge_(blob, site) {
  const it = DriveApp.getFoldersByName(CHARGE_PASTA);
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(CHARGE_PASTA);
  const file = pasta.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log(`[CHARGE] Imagem salva: ${file.getName()}`);
  Logger.log(`[CHARGE] Ver no Drive: ${file.getUrl()}`);
  if (site) Logger.log(`[CHARGE] Ver pelo site: ${site}/api/pr-photo/${file.getId()}`);
}
