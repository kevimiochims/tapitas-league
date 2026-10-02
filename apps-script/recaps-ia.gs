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
- RECAPS ANTERIORES / JÁ ESCRITOS NESTA SEMANA: servem para dar continuidade a
  histórias ("a crise continua") e, principalmente, para você NÃO repetir
  aberturas, piadas, metáforas, estrutura ou tom. Se outro recap da semana abriu
  com uma frase curta, abra de outro jeito. Se outro foi sarcástico, tente outro tom.
`

// LORE: planilha privada (só o dono acessa; o Apps Script roda como o dono).
// Colunas: Tipo | Alvo | Texto | Ativo. Alvo vazio = vale para todos os jogos.
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
    const iT = idx('tipo'), iA = idx('alvo'), iX = idx('texto'), iOn = idx('ativo')
    LORE_CACHE_ = rows
      .filter(r => String(r[iX] || '').trim())
      .filter(r => iOn < 0 || !/^(n|não|nao|no|false|0)$/i.test(String(r[iOn]).trim()))
      .map(r => ({ tipo: String(r[iT] || 'Geral').trim(), alvo: String(r[iA] || '').trim(), texto: String(r[iX]).trim() }))
  } catch (e) {
    Logger.log(`[LORE] Não consegui ler a planilha da LORE: ${e.message}`)
  }
  return LORE_CACHE_
}

const semAcento_ = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Itens gerais + os que citam algum dos times do jogo
function loreTexto_(cfg, times) {
  const chaves = times.filter(Boolean).map(semAcento_)
  const itens = loreRows_(cfg).filter(r => !r.alvo || chaves.some(k => semAcento_(r.alvo).includes(k)))
  if (!itens.length) return ''
  return '\n\n## LORE DA LIGA (piadas internas, apelidos e histórias do grupo — use só quando encaixar com o que aconteceu; respeite os itens "Proibido")\n' +
    itens.map(r => `- [${r.tipo}${r.alvo ? ` · ${r.alvo}` : ''}] ${r.texto}`).join('\n')
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

// Chama o Gemini passando pela fila de modelos: se um estiver sobrecarregado
// (503/500) depois de uma nova tentativa, ou sem cota do dia (429), vai para o
// próximo. Um modelo que falhou fica de fora no resto desta execução.
// Devolve { texto, modelo }. Se todos falharem, lança o último erro.
const MODELOS_FORA_ = new Set()
function chamaGemini_(cfg, sistema, texto) {
  const fila = cfg.modelos.filter(m => !MODELOS_FORA_.has(m))
  let ultimoErro = new Error('Gemini 503: nenhum modelo disponível nesta execução')
  for (let k = 0; k < fila.length; k++) {
    const modelo = fila[k]
    const esperas = [0, 10000]
    for (let t = 0; t < esperas.length; t++) {
      if (esperas[t]) {
        Logger.log(`[GEMINI] ${modelo} ocupado, tentando de novo em ${esperas[t] / 1000}s...`)
        Utilities.sleep(esperas[t])
      }
      try {
        return { texto: chamaGeminiUmaVez_(cfg, modelo, sistema, texto), modelo }
      } catch (e) {
        ultimoErro = e
        if (/Gemini 429/.test(e.message)) break // sem cota hoje: próximo modelo
        if (!/Gemini (500|503)/.test(e.message)) throw e // outros erros: não adianta insistir
      }
    }
    MODELOS_FORA_.add(modelo)
    const motivo = /Gemini 429/.test(ultimoErro.message) ? 'sem cota hoje' : 'continua ocupado'
    Logger.log(`[GEMINI] ${modelo} ${motivo}${fila[k + 1] ? `: tentando ${fila[k + 1]}` : ''}.`)
  }
  throw ultimoErro
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
function gerarRecapsDaLiga() {
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
    if (Date.now() - inicio > RECAP_TEMPO_MAX_MS) { Logger.log('[RECAP] Tempo quase no limite: parando aqui. Rode de novo para continuar.'); break }
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
      const texto = `Escreva o recap desta partida.\n\n${dossie}${loreTexto_(cfg, [team, opp])}${outros}`
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
}

// -----------------------------------------------------------------------------
// VERBETE DE POWER RANKING → coluna "Note" (uma linha por time)
// -----------------------------------------------------------------------------
function gerarRecapsDoPowerRanking() {
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
    if (Date.now() - inicio > RECAP_TEMPO_MAX_MS) { Logger.log('[PR] Tempo quase no limite: parando aqui. Rode de novo para continuar.'); break }
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
      const texto = `Escreva o verbete de Power Ranking de ${team} nesta semana.\n\n${dossie}${loreTexto_(cfg, [team, String(r[cOpp]).trim()])}${outros}`
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
}

// Para testar: mostra no log o dossiê de um jogo, sem chamar o Gemini
function testarDossie() {
  const cfg = recapConfig_()
  Logger.log(fetchDossie_(cfg, { season: 2025, week: 1, team: 'Moneyball' }) + loreTexto_(cfg, ['Moneyball']))
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
