// =============================================================================
// RECAPS COM IA (Gemini) — versão com o DOSSIÊ do site + LORE
//
// Substitui os arquivos "Recaps.gs" e "Recaps Power Rankings.gs" (apague os dois,
// senão as funções com o mesmo nome entram em conflito).
//
// Como funciona, para cada jogo sem recap:
//  1. Busca no site o DOSSIÊ do confronto (/api/recap/context): histórico do
//     confronto, recordes, sequências, campanha, títulos, trades e recaps
//     anteriores — tudo já calculado, só com dados até aquela semana.
//  2. Lê a LORE (piadas internas, apelidos) numa planilha PRIVADA separada.
//  3. Manda para o Gemini: prompt da DB2 (ou DM2) + dossiê + LORE + as aberturas
//     dos recaps já escritos na semana (para não repetir).
//  4. Grava o texto na planilha, como antes.
//
// CONFIGURAÇÃO (uma vez): editor do Apps Script → Configurações do projeto
// (engrenagem) → Propriedades do script → adicionar:
//   GEMINI_API_KEY  = a chave NOVA do Google AI Studio (revogue a antiga!)
//   SITE_URL        = https://SEU-SITE.vercel.app   (sem barra no final)
//   LORE_SHEET_ID   = ID da planilha privada da LORE (o trecho do link entre
//                     /d/ e /edit). Opcional: sem ela, os recaps saem sem LORE.
//   GEMINI_MODEL    = modelo preferido (opcional; rode listarModelos para ver os nomes)
//   GEMINI_MODEL_RESERVA = segundo da fila (opcional)
//   GEMINI_MODELOS  = (opcional) a fila inteira, separada por vírgula; se não
//                     existir, a fila é: GEMINI_MODEL, GEMINI_MODEL_RESERVA,
//                     gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash, gemini-2.5-flash
//   RECAP_TOKEN     = (opcional, não é necessário)
//
// GATILHO SEMANAL: use completarRecapsDaSemana (no lugar de gerarRecapsDaLiga
// e gerarRecapsDoPowerRanking). Ela escreve os recaps e depois as notas e, se
// o Gemini estiver ocupado ou sem cota, se agenda de novo sozinha até terminar.
//
// PAUTA DO EDITOR (opcional): aba "PAUTA" na mesma planilha privada da LORE,
// para mandar a IA falar de um assunto. Rode criaAbaPauta() uma vez para criar
// a aba com o cabeçalho e exemplos. Colunas:
//   Season | Week | Produto | Time | Instrução | Imagem
//   - Produto: Recap (recap do confronto), Note (verbete do Power Ranking),
//     Matéria (matéria da rodada na News), Meme (charge) ou Todos.
//   - Time: opcional. No Recap vale para o jogo desse time; na Note, só para o
//     verbete dele. Vazio = vale para todos os textos daquele produto.
//   - Season/Week vazios = vale para todas as semanas (até você apagar a linha).
//   - Imagem: só para Meme (usa a sua imagem em vez de desenhar) e Matéria
//     (vira a foto de capa). Cole o link de compartilhamento do Google Drive
//     ou o link de uma imagem da internet; o script faz uma cópia pública por
//     link (pasta "Tapitas League - Imagens da Pauta") e o seu arquivo original
//     não é alterado.
//   A pauta precisa estar preenchida ANTES de o texto ser gerado. Para refazer
//   um texto já gerado: apague a célula (Recap da Partida / Note) e rode de novo.
// =============================================================================

const RECAP_MAX_POR_EXECUCAO = 12   // evita estourar o limite de 6 min do Apps Script
const RECAP_TEMPO_MAX_MS = 4.5 * 60 * 1000  // não começa um recap novo depois de 4,5 min (o Apps Script corta em 6)
const RECAP_PAUSA_MS = 12000         // ~5 pedidos por minuto, o limite gratuito dos modelos Flash

function recapConfig_() {
  const props = PropertiesService.getScriptProperties()
  const cfg = {
    apiKey: props.getProperty('GEMINI_API_KEY'),
    site: (props.getProperty('SITE_URL') || '').replace(/\/+$/, ''),
    token: props.getProperty('RECAP_TOKEN') || '',
    // Fila de modelos, do melhor para o mais disponível. GEMINI_MODELOS (lista
    // separada por vírgula) substitui tudo; senão: GEMINI_MODEL, GEMINI_MODEL_RESERVA
    // e os gratuitos padrão.
    modelos: (props.getProperty('GEMINI_MODELOS')
      ? props.getProperty('GEMINI_MODELOS').split(',')
      : [props.getProperty('GEMINI_MODEL'), props.getProperty('GEMINI_MODEL_RESERVA'), 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'])
      .map(m => String(m || '').trim()).filter((m, i, arr) => m && arr.indexOf(m) === i),
    loreSheetId: props.getProperty('LORE_SHEET_ID') || '',
  }
  if (!cfg.apiKey) throw new Error('Falta GEMINI_API_KEY nas Propriedades do script.')
  if (!cfg.site) throw new Error('Falta SITE_URL nas Propriedades do script.')
  return cfg
}

// Instruções extras sobre o dossiê (somadas ao prompt da DB2/DM2)
const INSTRUCOES_DOSSIE = `
---

# COMO USAR O DOSSIÊ (vale mais que qualquer regra acima em caso de conflito)

Você recebe um DOSSIÊ montado pelo site da liga. Tudo nele é verdadeiro e já foi
calculado — inclusive recordes, sequências, histórico do confronto e campanha.
Não recalcule nada e não use informação que não esteja no dossiê.

- GANCHOS: lista dos fatos mais interessantes do jogo, do mais forte para o mais
  fraco. Escolha UM gancho principal (no máximo dois) e construa a história em
  volta dele. Ignore o resto sem culpa.
- FRANQUIAS e CAMPEÕES: o histórico da liga só até esta semana. É a fonte oficial
  (substitui qualquer tabela de campeões do prompt). Use só se acrescentar algo.
- LORE DA LIGA (quando vier): apelidos, piadas internas e rivalidades escritos
  pelos próprios membros. É o tempero da zoeira: use quando encaixar naturalmente com o que
  aconteceu, nunca force, e respeite os itens marcados como "Proibido".
- ESCALAÇÕES: nunca diga que um jogador estava no FLEX nem comente em que vaga
  ele atuou. Estar no FLEX é estratégia do time, não demérito do jogador.
- PAUTA DO EDITOR (quando vier): pedidos do editor da liga para ESTE texto.
  Cumpra todos, de forma natural, sem dizer que foi pedido. O que o editor
  afirma na pauta é verdade e pode ser usado mesmo que não esteja no dossiê
  (ele conhece a liga); fora isso, continue sem inventar nada.
- RECAPS ANTERIORES / JÁ ESCRITOS NESTA SEMANA: servem para dar continuidade a
  histórias ("a crise continua") e, principalmente, para você NÃO repetir
  aberturas, piadas, metáforas, estrutura ou tom. Se outro recap da semana abriu
  com uma frase curta, abra de outro jeito. Se outro foi sarcástico, tente outro tom.
`

// LORE: planilha privada (só o dono acessa; o Apps Script roda como o dono).
// Colunas: Tipo | Alvo | Texto | Ativo | Origem (opcional). Alvo vazio = vale
// para todos os jogos. Origem com datas (ex.: "WhatsApp 12/09/2022–30/10/2022",
// gravada pelo lore-whatsapp.gs) diz quando o assunto apareceu no grupo.
let LORE_CACHE_ = null
function loreRows_(cfg) {
  if (LORE_CACHE_) return LORE_CACHE_
  LORE_CACHE_ = []
  if (!cfg.loreSheetId) return LORE_CACHE_
  try {
    const ss = SpreadsheetApp.openById(cfg.loreSheetId)
    const sh = ss.getSheetByName('LORE') || ss.getSheets()[0]
    const [head, ...rows] = sh.getDataRange().getValues()
    const idx = name => head.map(h => String(h).trim().toLowerCase()).indexOf(name)
    const iT = idx('tipo'), iA = idx('alvo'), iX = idx('texto'), iOn = idx('ativo'), iO = idx('origem')
    LORE_CACHE_ = rows
      .filter(r => String(r[iX] || '').trim())
      .filter(r => iOn < 0 || !/^(n|não|nao|no|false|0)$/i.test(String(r[iOn]).trim()))
      .map(r => ({ tipo: String(r[iT] || 'Geral').trim(), alvo: String(r[iA] || '').trim(), texto: String(r[iX]).trim(), ...periodoLore_(iO < 0 ? '' : r[iO]) }))
  } catch (e) {
    Logger.log(`[LORE] Não consegui ler a planilha da LORE: ${e.message}`)
  }
  return LORE_CACHE_
}

const semAcento_ = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Período da coluna Origem: { de, ate } (datas) a partir de "dd/mm/aaaa" no
// texto ou de uma célula de data. Sem data reconhecível = item atemporal.
function periodoLore_(origem) {
  if (origem instanceof Date && !isNaN(origem)) return { de: origem, ate: origem }
  const datas = (String(origem || '').match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [])
    .map(d => { const [dia, mes, ano] = d.split('/').map(Number); return new Date(ano, mes - 1, dia) })
    .filter(d => !isNaN(d))
  if (!datas.length) return {}
  return { de: new Date(Math.min(...datas)), ate: new Date(Math.max(...datas)) }
}

const MESES_ = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const mesAno_ = d => `${MESES_[d.getMonth()]}/${d.getFullYear()}`

// Data aproximada do jogo (a temporada da NFL começa no início de setembro)
function dataDoJogo_(season, week) {
  const semana = parseInt(String(week || '1'), 10) || 1
  return new Date(Number(season), 8, 7 + (semana - 1) * 7)
}

// Itens gerais + os que citam algum dos times do jogo. Com season/week, só
// entra o que já existia na época do jogo (nada de piada de 2025 num recap de
// 2022), e cada item com data vai marcado com a época em que surgiu.
function loreTexto_(cfg, times, season, week) {
  const chaves = times.filter(Boolean).map(semAcento_)
  const jogo = season ? dataDoJogo_(season, week) : null
  const limite = jogo ? new Date(jogo.getTime() + 4 * 24 * 3600 * 1000) : null
  const itens = loreRows_(cfg)
    .filter(r => !r.alvo || chaves.some(k => semAcento_(r.alvo).includes(k)))
    .filter(r => !limite || !r.de || r.de <= limite)
  if (!itens.length) return ''
  const quando = r => {
    if (!r.de) return ''
    const de = mesAno_(r.de), ate = mesAno_(r.ate)
    return ` · ${de === ate ? de : `${de} a ${ate}`}`
  }
  const comData = itens.some(r => r.de)
  return '\n\n## LORE DA LIGA (piadas internas, apelidos e histórias do grupo — use só quando encaixar com o que aconteceu; respeite os itens "Proibido")\n' +
    (comData ? `A data no item é quando o assunto rolou no grupo${jogo ? `; este jogo é de ${mesAno_(jogo)}` : ''}. ` +
      'Assunto recente pode ser tratado como atual; o que é bem mais antigo é um clássico da liga (ex.: "lembra quando..."), ' +
      'não algo que acabou de acontecer. Itens sem data valem para qualquer época.\n' : '') +
    itens.map(r => `- [${r.tipo}${r.alvo ? ` · ${r.alvo}` : ''}${quando(r)}] ${r.texto}`).join('\n')
}

// -----------------------------------------------------------------------------
// PAUTA DO EDITOR (aba PAUTA da planilha privada da LORE)
// -----------------------------------------------------------------------------
const PAUTA_ABA = 'PAUTA'
const PAUTA_HEADERS = ['Season', 'Week', 'Produto', 'Time', 'Instrução', 'Imagem']
const PAUTA_PASTA = 'Tapitas League - Imagens da Pauta'
let PAUTA_CACHE_ = null

// Nome do produto como o script entende (aceita variações)
function produtoPauta_(v) {
  const p = semAcento_(v).replace(/[^a-z]/g, '')
  if (!p || p === 'todos' || p === 'tudo') return 'todos'
  if (/^(recap|recapdapartida|recapdoconfronto|confronto|partida)$/.test(p)) return 'recap'
  if (/^(note|notes|nota|verbete|pr|powerranking|powerrankings)$/.test(p)) return 'note'
  if (/^(materia|materiadarodada|recapsemanal|news|noticia)$/.test(p)) return 'materia'
  if (/^(meme|charge|memedasemana)$/.test(p)) return 'meme'
  return p
}

function pautaRows_(cfg) {
  if (PAUTA_CACHE_) return PAUTA_CACHE_
  PAUTA_CACHE_ = []
  if (!cfg.loreSheetId) return PAUTA_CACHE_
  try {
    const sh = SpreadsheetApp.openById(cfg.loreSheetId).getSheetByName(PAUTA_ABA)
    if (!sh || sh.getLastRow() < 2) return PAUTA_CACHE_
    const [head, ...rows] = sh.getDataRange().getValues()
    const h = head.map(x => semAcento_(String(x).trim()))
    const idx = (...nomes) => h.findIndex(x => nomes.includes(x))
    const iS = idx('season', 'temporada'), iW = idx('week', 'semana'), iP = idx('produto')
    const iT = idx('time', 'team'), iI = idx('instrucao', 'instrucoes', 'pedido', 'assunto'), iImg = idx('imagem', 'foto', 'image')
    PAUTA_CACHE_ = rows
      .map(r => ({
        season: iS < 0 ? '' : String(r[iS]).trim(),
        week: iW < 0 ? '' : String(r[iW]).trim(),
        produto: produtoPauta_(iP < 0 ? '' : r[iP]),
        time: iT < 0 ? '' : String(r[iT]).trim(),
        instrucao: iI < 0 ? '' : String(r[iI]).trim(),
        imagem: iImg < 0 ? '' : String(r[iImg]).trim(),
      }))
      .filter(r => (r.instrucao || r.imagem) && !/^\(preencher\)/i.test(r.instrucao))
  } catch (e) {
    Logger.log(`[PAUTA] Não consegui ler a aba PAUTA: ${e.message}`)
  }
  return PAUTA_CACHE_
}

// Itens da pauta para um texto. produto: 'recap' | 'note' | 'materia' | 'meme'.
// times: os times do texto (recap: os dois do jogo; note: só o do verbete;
// matéria/meme: vazio = qualquer time)
function pautaItens_(cfg, produto, season, week, times) {
  const semana = String(week).replace(/\s+/g, '')
  const chaves = (times || []).filter(Boolean).map(semAcento_)
  return pautaRows_(cfg).filter(r =>
    (r.produto === produto || r.produto === 'todos') &&
    (!r.season || r.season === String(season)) &&
    (!r.week || r.week.replace(/\s+/g, '') === semana) &&
    (!r.time || !chaves.length || chaves.includes(semAcento_(r.time))))
}

function pautaTexto_(itens) {
  const lista = itens.filter(r => r.instrucao)
  if (!lista.length) return ''
  return '\n\n## PAUTA DO EDITOR (OBRIGATÓRIO: este texto tem que tratar de cada item abaixo)\n' +
    lista.map(r => `- ${r.time ? `[${r.time}] ` : ''}${r.instrucao}`).join('\n')
}

// Link de foto, GIF ou vídeo (Drive ou internet) → link que o site exibe.
//  - YouTube, arquivo de vídeo (.mp4...) e GIF do Giphy/Tenor: ficam como
//    estão; o site mostra direto da origem (página do Giphy vira o link do GIF).
//  - Arquivo do Drive:
//      foto → CÓPIA pública por link na pasta da pauta (o original fica como
//             está), servida pelo site (/api/pr-photo/ID);
//      GIF  → cópia também; até 4 MB anima pelo site (?gif=1), maior que isso
//             vai no player do Drive (?video=1);
//      vídeo → NÃO copia (vídeo é pesado): o próprio arquivo fica público por
//             link e toca no player do Drive (?video=1).
//  - Foto ou GIF de outro site: baixa e guarda no Drive (como acima).
//  - Link que já é do site (/api/pr-photo/...) fica como está.
// O resultado é lembrado, para não duplicar quando o mesmo link volta.
const MIDIA_GIF_MAX = 4 * 1024 * 1024

function midiaDireta_(url) {
  if (/(?:youtube\.com\/(?:watch|shorts\/|live\/|embed\/)|youtu\.be\/)/i.test(url)) return url
  const giphy = url.match(/^https?:\/\/(?:www\.)?giphy\.com\/(?:gifs|clips|embed)\/([\w-]+)/i)
  if (giphy) return `https://media.giphy.com/media/${giphy[1].split('-').pop()}/giphy.gif`
  if (/^https?:\/\/(?:media\d*|i)\.giphy\.com\//i.test(url)) return url
  if (/^https?:\/\/(?:media\d*|c)\.tenor\.com\//i.test(url)) return url
  if (/^https?:\/\/[^\s]+\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url)) return url
  return ''
}

function sufixoGif_(bytes) {
  return bytes <= MIDIA_GIF_MAX ? '?gif=1' : '?video=1'
}

function imagemParaSite_(link, nome) {
  const url = String(link || '').trim()
  if (!url) return ''
  const site = (PropertiesService.getScriptProperties().getProperty('SITE_URL') || '').replace(/\/+$/, '')
  if (/\/api\/pr-photo\//.test(url)) return url
  const direta = midiaDireta_(url)
  if (direta) return direta
  if (/tenor\.com\/view\//i.test(url)) {
    Logger.log(`[PAUTA] Link de PÁGINA do Tenor não funciona: no Tenor, abra o GIF e use "Copiar link do GIF" (termina em .gif). ${url}`)
    return ''
  }
  const props = PropertiesService.getScriptProperties()
  const chave = 'PAUTA_IMG_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url)).replace(/=+$/, '')
  const salvo = props.getProperty(chave)
  if (salvo) return `${site}/api/pr-photo/${salvo}`
  const it = DriveApp.getFoldersByName(PAUTA_PASTA)
  const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PAUTA_PASTA)
  let file = null
  let sufixo = ''
  try {
    const m = url.match(/(?:\/d\/|[?&]id=)([\w-]{10,})/)
    if (m && /drive\.google|docs\.google/.test(url)) {
      const original = DriveApp.getFileById(m[1])
      const tipo = original.getMimeType()
      if (/^video\//.test(tipo)) {
        file = original
        sufixo = '?video=1'
      } else {
        file = original.makeCopy(nome, pasta)
        if (tipo === 'image/gif') sufixo = sufixoGif_(original.getSize())
      }
    } else if (/^https?:\/\//.test(url)) {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true })
      const tipo = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '')
      if (res.getResponseCode() !== 200 || !/^image\//.test(tipo)) {
        Logger.log(`[PAUTA] O link não é uma foto nem um GIF (${res.getResponseCode()}, ${tipo}). Use o link do ARQUIVO (que abre só a imagem), não o da página: ${url}`)
        return ''
      }
      const gif = /^image\/gif/.test(tipo)
      const blob = res.getBlob().setName(`${nome}.${gif ? 'gif' : 'jpg'}`)
      file = pasta.createFile(blob)
      if (gif) sufixo = sufixoGif_(blob.getBytes().length)
    }
  } catch (e) {
    Logger.log(`[PAUTA] Não consegui usar a mídia ${url}: ${e.message}`)
    return ''
  }
  if (!file) { Logger.log(`[PAUTA] Link de mídia não reconhecido: ${url}`); return '' }
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
  } catch (e) {
    Logger.log(`[PAUTA] Não consegui deixar o arquivo público por link (${e.message}). No Drive, compartilhe como "Qualquer pessoa com o link": ${url}`)
  }
  if (sufixo === '?video=1') Logger.log(`[PAUTA] Vídeo/GIF grande do Drive vai no player do Drive. Se o vídeo acabou de subir, o Drive pode levar alguns minutos para processar antes de tocar.`)
  props.setProperty(chave, file.getId() + sufixo)
  return `${site}/api/pr-photo/${file.getId()}${sufixo}`
}

// Cria a aba PAUTA na planilha privada da LORE (rodar uma vez)
function criaAbaPauta() {
  const id = PropertiesService.getScriptProperties().getProperty('LORE_SHEET_ID')
  if (!id) throw new Error('Falta LORE_SHEET_ID nas Propriedades do script (a planilha privada da LORE).')
  const ss = SpreadsheetApp.openById(id)
  let sh = ss.getSheetByName(PAUTA_ABA)
  if (sh) { Logger.log('[PAUTA] A aba PAUTA já existe: ' + ss.getUrl()); return }
  sh = ss.insertSheet(PAUTA_ABA)
  sh.getRange('A:B').setNumberFormat('@') // semana "14-15" não pode virar data
  sh.getRange(1, 1, 1, PAUTA_HEADERS.length).setValues([PAUTA_HEADERS]).setFontWeight('bold')
  sh.getRange(2, 1, 4, PAUTA_HEADERS.length).setValues([
    ['2026', '5', 'Meme', 'Pequers Verde', '(preencher) Zoar que ele perdeu fazendo 150 pontos', ''],
    ['2026', '5', 'Recap', 'Moneyball', '(preencher) Comentar a trade do Bijan, que estreou bem', ''],
    ['2026', '5', 'Matéria', '', '(preencher) Lembrar que a liga faz aniversário nesta semana', ''],
    ['', '', 'Todos', '', '(preencher) Linha sem temporada/semana vale para todas as semanas', ''],
  ])
  sh.setFrozenRows(1)
  sh.autoResizeColumns(1, PAUTA_HEADERS.length)
  Logger.log('[PAUTA] Aba PAUTA criada (linhas com "(preencher)" são ignoradas): ' + ss.getUrl())
}

function fetchDossie_(cfg, params) {
  const qs = Object.keys(params).filter(k => params[k] !== '' && params[k] != null)
    .map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
  const url = `${cfg.site}/api/recap/context?${qs}${cfg.token ? `&token=${encodeURIComponent(cfg.token)}` : ''}`
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  if (res.getResponseCode() !== 200) {
    throw new Error(`Dossiê ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`)
  }
  return res.getContentText()
}

// Memória entre execuções (Propriedades do script): modelo sem cota (429) fica
// fora até a cota renovar (meia-noite do horário do Pacífico); modelo lotado
// (503/500) fica fora por 15 minutos. Assim cada execução não perde minutos
// perguntando de novo a quem já disse não.
const LOTADO_PAUSA_MS = 15 * 60 * 1000
const diaPacifico_ = () => Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd')
function modeloIndisponivel_(modelo) {
  const props = PropertiesService.getScriptProperties()
  if (props.getProperty(`SEM_COTA_${modelo}`) === diaPacifico_()) return 'sem cota hoje'
  const lotado = Number(props.getProperty(`LOTADO_${modelo}`) || 0)
  if (lotado && Date.now() - lotado < LOTADO_PAUSA_MS) return 'lotado há pouco'
  return ''
}
function marcaModelo_(modelo, erro) {
  const props = PropertiesService.getScriptProperties()
  if (/Gemini 429/.test(erro.message)) props.setProperty(`SEM_COTA_${modelo}`, diaPacifico_())
  else props.setProperty(`LOTADO_${modelo}`, String(Date.now()))
}

// Chama o Gemini passando pela fila de modelos: pula quem está marcado como
// indisponível; se um modelo estiver sobrecarregado (503/500) depois de uma
// nova tentativa, ou sem cota (429), marca e vai para o próximo.
// Devolve { texto, modelo }. Se todos falharem, lança o último erro.
const MODELOS_FORA_ = new Set()
function chamaGemini_(cfg, sistema, texto) {
  const pulados = []
  const fila = cfg.modelos.filter(m => {
    if (MODELOS_FORA_.has(m)) return false
    const motivo = modeloIndisponivel_(m)
    if (motivo) { pulados.push(`${m} (${motivo})`); return false }
    return true
  })
  if (pulados.length && !MODELOS_FORA_.size) Logger.log(`[GEMINI] Pulando: ${pulados.join(', ')}.`)
  pulados.forEach(p => MODELOS_FORA_.add(p.split(' ')[0]))
  let ultimoErro = new Error('Gemini 503: nenhum modelo disponível agora (todos sem cota ou lotados)')
  for (let k = 0; k < fila.length; k++) {
    const modelo = fila[k]
    const esperas = [0, 10000]
    for (let t = 0; t < esperas.length; t++) {
      if (esperas[t]) {
        Logger.log(`[GEMINI] ${modelo} ocupado, tentando de novo em ${esperas[t] / 1000}s...`)
        Utilities.sleep(esperas[t])
      }
      const inicio = Date.now()
      try {
        return { texto: chamaGeminiUmaVez_(cfg, modelo, sistema, texto), modelo }
      } catch (e) {
        ultimoErro = e
        if (/Gemini 429/.test(e.message)) break // sem cota: próximo modelo
        if (!/Gemini (500|503)/.test(e.message)) throw e // outros erros: não adianta insistir
        if (Date.now() - inicio > 30000) break // demorou para dizer "ocupado": não insiste
      }
    }
    MODELOS_FORA_.add(modelo)
    marcaModelo_(modelo, ultimoErro)
    const motivo = /Gemini 429/.test(ultimoErro.message) ? 'sem cota hoje' : 'continua ocupado (fora por 15 min)'
    Logger.log(`[GEMINI] ${modelo} ${motivo}${fila[k + 1] ? `: tentando ${fila[k + 1]}` : ''}.`)
  }
  throw ultimoErro
}

// Para recomeçar do zero (esquece quem estava sem cota/lotado)
function limparMemoriaModelos() {
  const props = PropertiesService.getScriptProperties()
  Object.keys(props.getProperties()).filter(k => /^(SEM_COTA|LOTADO)_/.test(k)).forEach(k => props.deleteProperty(k))
  Logger.log('Memória dos modelos apagada.')
}

function chamaGeminiUmaVez_(cfg, modelo, sistema, texto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${cfg.apiKey}`
  const payload = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: 'user', parts: [{ text: texto }] }],
    generationConfig: { temperature: 1.1, topP: 0.95 },
  }
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  })
  const json = JSON.parse(res.getContentText())
  const parts = json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts
  const text = parts && parts.map(p => p.text || '').join('').trim()
  if (text) return text
  if (json.error) throw new Error(`Gemini ${json.error.code}: ${json.error.message}`)
  throw new Error(`Resposta inesperada do Gemini: ${res.getContentText().slice(0, 300)}`)
}

function colIndex_(headers, name) {
  const i = headers.indexOf(name)
  if (i < 0) throw new Error(`Coluna "${name}" não encontrada na GAME_FACTS_ALL.`)
  return i
}

const primeiraFrase_ = t => String(t || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0].slice(0, 160)

// -----------------------------------------------------------------------------
// RECAP DE CADA CONFRONTO → coluna "Recap da Partida" (nas duas linhas do jogo)
// -----------------------------------------------------------------------------
function gerarRecapsDaLiga(limite) {
  const cfg = recapConfig_()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL')
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const cSeason = colIndex_(headers, 'Season')
  const cWeek = colIndex_(headers, 'Week')
  const cTeam = colIndex_(headers, 'Team')
  const cOpp = colIndex_(headers, 'Opponent')
  const cRecap = colIndex_(headers, 'Recap da Partida')

  const prompt = String(sheet.getRange('DB2').getValue() || '')
  if (!prompt) throw new Error('Prompt não encontrado em DB2.')
  const sistema = prompt + INSTRUCOES_DOSSIE

  // Recaps já escritos por semana (os existentes + os gerados agora)
  const daSemana = {}
  data.slice(1).forEach(r => {
    const key = `${r[cSeason]}|${r[cWeek]}`
    const recap = String(r[cRecap] || '').trim()
    if (recap) (daSemana[key] = daSemana[key] || new Set()).add(recap)
  })

  let feitos = 0
  const inicio = Date.now()
  const processados = new Set()
  for (let i = 1; i < data.length && feitos < RECAP_MAX_POR_EXECUCAO; i++) {
    if (Date.now() > (typeof limite === 'number' ? limite : inicio + RECAP_TEMPO_MAX_MS)) { Logger.log('[RECAP] Tempo quase no limite: parando aqui. Rode de novo para continuar.'); break }
    const r = data[i]
    if (String(r[cRecap] || '').trim()) continue
    const season = r[cSeason], week = r[cWeek], team = String(r[cTeam]).trim(), opp = String(r[cOpp]).trim()
    if (!season || !week || !team) continue
    const jogo = `${season}|${week}|${[team, opp].sort().join('|')}`
    if (processados.has(jogo)) continue
    processados.add(jogo)

    // Linha espelhada (mesmo jogo, times invertidos)
    let espelho = -1
    for (let j = Math.max(1, i - 3); j < Math.min(data.length, i + 4); j++) {
      if (j !== i && data[j][cSeason] === season && String(data[j][cWeek]) === String(week) && String(data[j][cTeam]).trim() === opp && String(data[j][cOpp]).trim() === team) { espelho = j; break }
    }

    try {
      Logger.log(`[RECAP] ${season} W${week}: ${team} x ${opp}`)
      const dossie = fetchDossie_(cfg, { season, week, team, opp })
      const key = `${season}|${week}`
      const escritos = Array.from(daSemana[key] || [])
      const outros = escritos.length
        ? `\n\n## JÁ ESCRITOS NESTA SEMANA (não repita aberturas, piadas nem estrutura)\n${escritos.map(t => `- Abertura usada: "${primeiraFrase_(t)}"`).join('\n')}`
        : ''
      const pauta = pautaTexto_(pautaItens_(cfg, 'recap', season, week, [team, opp]))
      if (pauta) Logger.log('[RECAP] Com pauta do editor')
      const texto = `Escreva o recap desta partida.\n\n${dossie}${loreTexto_(cfg, [team, opp], season, week)}${pauta}${outros}`
      const { texto: recap, modelo } = chamaGemini_(cfg, sistema, texto)

      sheet.getRange(i + 1, cRecap + 1).setValue(recap)
      if (espelho > 0) sheet.getRange(espelho + 1, cRecap + 1).setValue(recap)
      SpreadsheetApp.flush()
      ;(daSemana[key] = daSemana[key] || new Set()).add(recap)
      Logger.log(`[RECAP] ✔ gravado (${modelo})`)
      feitos++
      Utilities.sleep(RECAP_PAUSA_MS)
    } catch (e) {
      Logger.log(`[RECAP] Erro em ${team} x ${opp}: ${e.message}`)
      // Para aqui em vez de pular o jogo: a próxima execução começa deste mesmo
      // jogo, sem deixar buraco na planilha nem bagunçar a ordem dos recaps.
      if (/Gemini/.test(e.message)) { Logger.log('[RECAP] Parando aqui (sem buracos). Rode de novo mais tarde para continuar deste jogo.'); break }
    }
  }
  Logger.log(`[RECAP] ${feitos} recap(s) gerado(s).`)
  return feitos
}

// -----------------------------------------------------------------------------
// VERBETE DE POWER RANKING → coluna "Note" (uma linha por time)
// -----------------------------------------------------------------------------
function gerarRecapsDoPowerRanking(limite) {
  const cfg = recapConfig_()
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL')
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const cSeason = colIndex_(headers, 'Season')
  const cWeek = colIndex_(headers, 'Week')
  const cTeam = colIndex_(headers, 'Team')
  const cPR = colIndex_(headers, 'Power Ranking')
  const cNote = colIndex_(headers, 'Note')
  const cOpp = colIndex_(headers, 'Opponent')

  const prompt = String(sheet.getRange('DM2').getValue() || '')
  if (!prompt) throw new Error('Prompt não encontrado em DM2.')
  const sistema = prompt + INSTRUCOES_DOSSIE

  const daSemana = {}
  data.slice(1).forEach(r => {
    const note = String(r[cNote] || '').trim()
    if (note) (daSemana[`${r[cSeason]}|${r[cWeek]}`] = daSemana[`${r[cSeason]}|${r[cWeek]}`] || []).push(note)
  })

  let feitos = 0
  const inicio = Date.now()
  for (let i = 1; i < data.length && feitos < RECAP_MAX_POR_EXECUCAO; i++) {
    if (Date.now() > (typeof limite === 'number' ? limite : inicio + RECAP_TEMPO_MAX_MS)) { Logger.log('[PR] Tempo quase no limite: parando aqui. Rode de novo para continuar.'); break }
    const r = data[i]
    if (String(r[cNote] || '').trim()) continue
    if (!(Number(r[cPR]) > 0)) continue // só linhas com Power Ranking calculado
    const season = r[cSeason], week = r[cWeek], team = String(r[cTeam]).trim()
    try {
      Logger.log(`[PR] ${season} W${week}: ${team}`)
      const dossie = fetchDossie_(cfg, { season, week, team, mode: 'pr' })
      const key = `${season}|${week}`
      const escritos = daSemana[key] || []
      const outros = escritos.length
        ? `\n\n## VERBETES JÁ ESCRITOS NESTA SEMANA (não repita aberturas, piadas nem estrutura)\n${escritos.map(t => `- "${primeiraFrase_(t)}"`).join('\n')}`
        : ''
      const pauta = pautaTexto_(pautaItens_(cfg, 'note', season, week, [team]))
      if (pauta) Logger.log('[PR] Com pauta do editor')
      const texto = `Escreva o verbete de Power Ranking de ${team} nesta semana.\n\n${dossie}${loreTexto_(cfg, [team, String(r[cOpp]).trim()], season, week)}${pauta}${outros}`
      const { texto: note, modelo } = chamaGemini_(cfg, sistema, texto)
      sheet.getRange(i + 1, cNote + 1).setValue(note)
      SpreadsheetApp.flush()
      ;(daSemana[key] = daSemana[key] || []).push(note)
      Logger.log(`[PR] ✔ gravado (${modelo})`)
      feitos++
      Utilities.sleep(RECAP_PAUSA_MS)
    } catch (e) {
      Logger.log(`[PR] Erro em ${team}: ${e.message}`)
      if (/Gemini/.test(e.message)) { Logger.log('[PR] Parando aqui (sem buracos). Rode de novo mais tarde para continuar deste time.'); break }
    }
  }
  Logger.log(`[PR] ${feitos} verbete(s) gerado(s).`)
  return feitos
}

// -----------------------------------------------------------------------------
// AUTOMAÇÃO COMPLETA DA SEMANA (IA): recaps → notas do PR → matéria → meme
// -----------------------------------------------------------------------------
// COMO INSTALAR (uma vez só): rode instalaAutomacaoIA(). Ela apaga os gatilhos
// antigos (gerarRecapsDaLiga, gerarRecapsDoPowerRanking, completarRecapsDaSemana,
// materiaDaSemanaAutomatica e memeDaSemanaAutomatico) e cria dois:
//   - terça às AUTO_HORA_SEMANAL h: começa a semana;
//   - todo dia às AUTO_HORA_SEGURANCA h: rede de segurança (se algo parou, retoma;
//     se está tudo pronto, só confere e sai em segundos).
// Não mexe no gatilho da rotina semanal (importação).
//
// Cada execução faz o que cabe em ~4,5 min e, se sobrar algo, se agenda de novo
// sozinha, quantas vezes precisar:
//   - semana ainda não importada (a rotina semanal não rodou ou não terminou o
//     Power Ranking) → confere de novo em 20 min;
//   - acabou o tempo desta execução, mas o Gemini está respondendo → continua em
//     ~1 min, numa execução nova;
//   - Gemini lotado/lento (todos os modelos) → tenta de novo em 16 min;
//   - todos os modelos sem cota hoje → logo depois que a cota renova (meia-noite
//     do Pacífico, ~4h/5h em Brasília).
// A matéria e o meme entram assim que os recaps e as notas ficam prontos (não
// esperam o dia seguinte). O meme continua indo como prévia para você aprovar
// (e-mail + publicaTestesMeme), como antes.
// A próxima tentativa fica agendada ANTES de começar cada execução: se o Google
// cortar no limite de 6 min (Gemini demorando), a fila continua mesmo assim.
// E-mail só se der problema: semana não importada depois de 6 h, ou nada
// concluído depois de AUTO_PRAZO_MS.
const AUTO_HANDLER = 'automacaoIADaSemana'
const AUTO_HORA_SEMANAL = 4
const AUTO_HORA_SEGURANCA = 9
const AUTO_PRAZO_MS = 48 * 3600 * 1000
const AUTO_TEMPO_MS = 4.5 * 60 * 1000              // não começa recap/nota novo depois disso
const AUTO_FOLGA_TEXTO_LONGO_MS = 3 * 60 * 1000    // matéria/meme só começam com essa folga antes de 6 min
const AUTO_ESPERA_CONTINUA_MS = 60 * 1000
const AUTO_ESPERA_OCUPADO_MS = 16 * 60 * 1000
const AUTO_ESPERA_IMPORTACAO_MS = 20 * 60 * 1000
const AUTO_AVISO_IMPORTACAO_MS = 6 * 3600 * 1000

function instalaAutomacaoIA() {
  const antigos = ['gerarRecapsDaLiga', 'gerarRecapsDoPowerRanking', 'completarRecapsDaSemana', 'materiaDaSemanaAutomatica', 'memeDaSemanaAutomatico', AUTO_HANDLER]
  const apagados = ScriptApp.getProjectTriggers().filter(t => antigos.includes(t.getHandlerFunction()))
  apagados.forEach(t => ScriptApp.deleteTrigger(t))
  const props = PropertiesService.getScriptProperties()
  ;['AUTO_INICIO', 'AUTO_TENTATIVA', 'AUTO_RETRY_ID', 'AUTO_AVISO_IMPORTACAO', 'RECAP_RETRY_TRIGGER_ID', 'RECAP_TENTATIVAS'].forEach(k => props.deleteProperty(k))
  ScriptApp.newTrigger(AUTO_HANDLER).timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(AUTO_HORA_SEMANAL).create()
  ScriptApp.newTrigger(AUTO_HANDLER).timeBased().everyDays(1).atHour(AUTO_HORA_SEGURANCA).create()
  Logger.log(`[AUTO] ${apagados.length} gatilho(s) antigo(s) apagado(s): ${apagados.map(t => t.getHandlerFunction()).join(', ') || 'nenhum'}.`)
  Logger.log(`[AUTO] Criados: ${AUTO_HANDLER} toda terça às ${AUTO_HORA_SEMANAL}h e todo dia às ${AUTO_HORA_SEGURANCA}h (rede de segurança).`)
  Logger.log('[AUTO] Gatilhos do projeto agora: ' + ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', '))
}

// Nome antigo: se ainda houver gatilho chamando esta função, ela faz o mesmo
function completarRecapsDaSemana() {
  automacaoIADaSemana()
}

function automacaoIADaSemana() {
  const t0 = Date.now()
  const props = PropertiesService.getScriptProperties()
  apagaRetentativaAuto_()
  // Duas execuções ao mesmo tempo (gatilho + você no botão): a segunda sai.
  // Trava do documento, para não brigar com a trava da rotina semanal.
  const trava = LockService.getDocumentLock()
  if (!trava || !trava.tryLock(5000)) {
    Logger.log('[AUTO] Outra execução da automação está rodando. Esta sai sem fazer nada.')
    return
  }
  try {
    if (!props.getProperty('AUTO_INICIO')) {
      props.setProperty('AUTO_INICIO', String(t0))
      props.setProperty('AUTO_TENTATIVA', '0')
      props.deleteProperty('AUTO_AVISO_IMPORTACAO')
    }
    const inicioCadeia = Number(props.getProperty('AUTO_INICIO'))
    const tentativa = Number(props.getProperty('AUTO_TENTATIVA') || 0) + 1
    props.setProperty('AUTO_TENTATIVA', String(tentativa))
    const prazoOk = t0 - inicioCadeia < AUTO_PRAZO_MS
    // Rede de segurança: a próxima já fica agendada (ajustada no fim)
    if (prazoOk) agendaAuto_(AUTO_ESPERA_OCUPADO_MS)

    const r = passoAuto_(t0)
    if (r.feito) {
      apagaRetentativaAuto_()
      ;['AUTO_INICIO', 'AUTO_TENTATIVA', 'AUTO_AVISO_IMPORTACAO'].forEach(k => props.deleteProperty(k))
      Logger.log(`[AUTO] Tudo pronto (${r.texto}). Nada mais agendado.`)
      return
    }
    if (r.importacao && t0 - inicioCadeia > AUTO_AVISO_IMPORTACAO_MS && !props.getProperty('AUTO_AVISO_IMPORTACAO')) {
      props.setProperty('AUTO_AVISO_IMPORTACAO', '1')
      avisaPorEmail_('Tapitas: semana ainda não importada',
        `${r.texto}\n\nA automação de IA está esperando a rotina semanal (importação + Power Ranking) e confere de novo a cada 20 min. ` +
        'Veja o log da executaRotinaSemanal em Execuções.')
    }
    if (!prazoOk) {
      apagaRetentativaAuto_()
      ;['AUTO_INICIO', 'AUTO_TENTATIVA', 'AUTO_AVISO_IMPORTACAO'].forEach(k => props.deleteProperty(k))
      Logger.log(`[AUTO] Prazo de ${AUTO_PRAZO_MS / 3600000} h estourado. Parei. Falta: ${r.texto}`)
      avisaPorEmail_('Tapitas: automação de IA não terminou',
        `Depois de ${tentativa} tentativas em ${AUTO_PRAZO_MS / 3600000} h ainda falta: ${r.texto}\n\n` +
        `Veja o log do Apps Script (Execuções). O gatilho diário das ${AUTO_HORA_SEGURANCA}h tenta de novo, ou rode ${AUTO_HANDLER}() na mão.`)
      return
    }
    agendaAuto_(r.espera)
    Logger.log(`[AUTO] Tentativa ${tentativa}. Falta: ${r.texto}. Próxima em ${Math.max(1, Math.round(r.espera / 60000))} min (${r.motivo}).`)
  } finally {
    trava.releaseLock()
  }
}

// Uma rodada de trabalho. Devolve { feito, texto, espera, motivo, importacao }
function passoAuto_(t0) {
  const limite = t0 + AUTO_TEMPO_MS
  const cabeTextoLongo = () => Date.now() < t0 + 6 * 60 * 1000 - AUTO_FOLGA_TEXTO_LONGO_MS

  // 1) A semana precisa estar importada e com o Power Ranking calculado
  const imp = semanaImportada_()
  if (!imp.ok) {
    return { feito: false, importacao: true, texto: imp.texto, espera: AUTO_ESPERA_IMPORTACAO_MS, motivo: 'esperando a rotina semanal' }
  }

  // 2) Recaps dos confrontos e 3) notas do Power Ranking
  let pend = contaPendentesRecaps_()
  const antes = pend.recaps + pend.notas
  Logger.log(`[AUTO] Faltam ${pend.recaps} recap(s) e ${pend.notas} nota(s).`)
  if (pend.recaps > 0) gerarRecapsDaLiga(limite)
  pend = contaPendentesRecaps_()
  if (pend.recaps === 0 && pend.notas > 0 && Date.now() < limite) gerarRecapsDoPowerRanking(limite)
  pend = contaPendentesRecaps_()
  if (pend.recaps > 0 || pend.notas > 0) {
    // Nada andou nesta execução sem ser culpa do Gemini (ex.: o site não
    // devolveu o dossiê): espera 16 min em vez de tentar a cada minuto
    const semAvanco = pend.recaps + pend.notas >= antes && Date.now() < limite
    return { feito: false, texto: `${pend.recaps} recap(s) e ${pend.notas} nota(s)`, ...esperaGemini_(semAvanco) }
  }

  // 4) Matéria e 5) meme da rodada (só quando os recaps e as notas estão prontos)
  if (typeof ultimaRodadaFechada_ !== 'function') return { feito: true, texto: 'recaps e notas (matéria/meme não instalados)' }
  const { season, week } = ultimaRodadaFechada_()
  if (!season) return { feito: true, texto: 'recaps e notas (nenhuma rodada fechada)' }

  const materiaFeita = () => slugsDaAba_(MATERIA_ABA).has(slugMateria_(season, week, false))
  if (typeof geraMateria_ === 'function' && !materiaFeita()) {
    if (!cabeTextoLongo()) return { feito: false, texto: `matéria e meme da semana ${week}`, espera: AUTO_ESPERA_CONTINUA_MS, motivo: 'sem tempo nesta execução para um texto longo' }
    try {
      geraMateria_(season, week, false)
    } catch (e) {
      Logger.log(`[AUTO] Matéria falhou: ${e.message}`)
      return { feito: false, texto: `matéria e meme da semana ${week}`, ...esperaGemini_(!/Gemini (429|500|503)/.test(e.message)) }
    }
  }

  const memeFeito = () => typeof slugMeme_ !== 'function' ||
    slugsDaAba_(MATERIA_ABA).has(slugMeme_(season, week, false)) || slugsDaAba_(MATERIA_ABA_TESTE).has(slugMeme_(season, week, true))
  if (typeof memeDaSemanaAutomatico === 'function' && !memeFeito()) {
    if (!cabeTextoLongo()) return { feito: false, texto: `meme da semana ${week}`, espera: AUTO_ESPERA_CONTINUA_MS, motivo: 'sem tempo nesta execução para o meme' }
    try {
      memeDaSemanaAutomatico()
    } catch (e) {
      Logger.log(`[AUTO] Meme falhou: ${e.message}`)
      return { feito: false, texto: `meme da semana ${week}`, ...esperaGemini_(!/Gemini (429|500|503)/.test(e.message)) }
    }
    if (!memeFeito()) return { feito: false, texto: `meme da semana ${week}`, espera: AUTO_ESPERA_OCUPADO_MS, motivo: 'o meme não foi gravado (veja o log)' }
  }
  return { feito: true, texto: `recaps, notas, matéria e meme da semana ${week} de ${season}` }
}

// Quanto esperar depois de parar com trabalho sobrando
function esperaGemini_(outroErro) {
  const cfg = recapConfig_()
  const estados = cfg.modelos.map(m => modeloIndisponivel_(m))
  if (estados.length && estados.every(s => s === 'sem cota hoje')) {
    return { espera: msAteCotaRenovar_() + 10 * 60 * 1000, motivo: 'todos os modelos sem cota hoje; volta depois que a cota renova' }
  }
  if (!estados.some(s => !s)) return { espera: AUTO_ESPERA_OCUPADO_MS, motivo: 'Gemini lotado ou lento' }
  if (outroErro) return { espera: AUTO_ESPERA_OCUPADO_MS, motivo: 'erro (resposta fora do formato, site ou Cloudflare: veja o log)' }
  return { espera: AUTO_ESPERA_CONTINUA_MS, motivo: 'acabou o tempo desta execução; continua numa nova' }
}

// A última semana encerrada (pelo calendário da rotina semanal) já está na
// GAME_FACTS_ALL com o Power Ranking calculado?
function semanaImportada_() {
  if (typeof ultimaSemanaEncerrada2026_ !== 'function' || typeof CONFIG_2026 === 'undefined') return { ok: true }
  const semana = ultimaSemanaEncerrada2026_(Date.now())
  if (semana < 1 || semana > CONFIG_2026.TOTAL_WEEKS) return { ok: true }
  const values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL').getDataRange().getValues()
  const h = values[0].map(v => String(v).trim())
  const iS = h.indexOf('Season'), iW = h.indexOf('Week'), iPR = h.indexOf('Power Ranking')
  const linhas = values.slice(1).filter(r => String(r[iS]).trim() === String(CONFIG_2026.YEAR) && String(r[iW]).trim() === String(semana))
  if (!linhas.length) return { ok: false, texto: `a semana ${semana} de ${CONFIG_2026.YEAR} ainda não foi importada` }
  if (iPR >= 0 && !linhas.every(r => Number(String(r[iPR]).replace(',', '.')) > 0)) {
    return { ok: false, texto: `a semana ${semana} foi importada, mas o Power Ranking ainda não foi calculado` }
  }
  return { ok: true }
}

function agendaAuto_(espera) {
  apagaRetentativaAuto_()
  const t = ScriptApp.newTrigger(AUTO_HANDLER).timeBased().after(Math.max(60 * 1000, espera)).create()
  PropertiesService.getScriptProperties().setProperty('AUTO_RETRY_ID', t.getUniqueId())
}

function apagaRetentativaAuto_() {
  const props = PropertiesService.getScriptProperties()
  const ids = [props.getProperty('AUTO_RETRY_ID'), props.getProperty('RECAP_RETRY_TRIGGER_ID')].filter(Boolean)
  if (!ids.length) return
  ScriptApp.getProjectTriggers().filter(t => ids.includes(t.getUniqueId())).forEach(t => ScriptApp.deleteTrigger(t))
  props.deleteProperty('AUTO_RETRY_ID')
  props.deleteProperty('RECAP_RETRY_TRIGGER_ID')
}

function avisaPorEmail_(assunto, texto) {
  try {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), assunto, texto)
  } catch (err) {
    Logger.log(`[AUTO] Não consegui mandar o e-mail: ${err}`)
  }
}

// Quantos recaps de confronto e notas do Power Ranking ainda faltam (mesmos
// critérios de gerarRecapsDaLiga e gerarRecapsDoPowerRanking)
function contaPendentesRecaps_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('GAME_FACTS_ALL')
  const data = sheet.getDataRange().getValues()
  const h = data[0]
  const cS = colIndex_(h, 'Season'), cW = colIndex_(h, 'Week'), cT = colIndex_(h, 'Team')
  const cR = colIndex_(h, 'Recap da Partida'), cPR = colIndex_(h, 'Power Ranking'), cN = colIndex_(h, 'Note')
  let recaps = 0, notas = 0
  data.slice(1).forEach(r => {
    if (r[cS] && r[cW] && String(r[cT]).trim() && !String(r[cR] || '').trim()) recaps++
    if (Number(r[cPR]) > 0 && !String(r[cN] || '').trim()) notas++
  })
  // Recap é gravado nas duas linhas do jogo: conta jogos, não linhas
  return { recaps: Math.ceil(recaps / 2), notas }
}

// Milissegundos até a meia-noite do horário do Pacífico (quando a cota do Gemini renova)
function msAteCotaRenovar_() {
  const [hh, mm] = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'HH:mm').split(':').map(Number)
  return ((24 * 60) - (hh * 60 + mm)) * 60 * 1000
}

// Para testar: mostra no log o dossiê de um jogo, sem chamar o Gemini
function testarDossie() {
  const cfg = recapConfig_()
  Logger.log(fetchDossie_(cfg, { season: 2025, week: 1, team: 'Moneyball' }) + loreTexto_(cfg, ['Moneyball'], 2025, 1))
}

// Mostra no log os modelos que a sua chave pode usar, com o nome técnico
// para colocar em GEMINI_MODEL (ex.: "gemini-3.8-flash").
function listarModelos() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')
  if (!key) throw new Error('Falta GEMINI_API_KEY nas Propriedades do script.')
  let pageToken = ''
  const nomes = []
  do {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`
    const json = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText())
    if (json.error) throw new Error(`Gemini ${json.error.code}: ${json.error.message}`)
    ;(json.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .forEach(m => nomes.push(`${m.name.replace('models/', '')}  —  ${m.displayName || ''}`))
    pageToken = json.nextPageToken || ''
  } while (pageToken)
  Logger.log(`Modelos que geram texto com a sua chave (${nomes.length}):\n${nomes.join('\n')}`)
}
