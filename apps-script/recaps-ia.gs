// =============================================================================
// RECAPS COM IA (Gemini) — versão com o DOSSIÊ do site
//
// Substitui os arquivos "Recaps.gs" e "Recaps Power Rankings.gs".
//
// O que mudou:
//  - Antes de chamar o Gemini, busca no site o dossiê do confronto
//    (/api/recap/context): histórico do confronto, recordes, sequências,
//    campanha, títulos, trades, recaps anteriores e a aba LORE. Tudo já
//    calculado, só com dados até aquela semana (sem "spoiler" do futuro).
//  - Os recaps da mesma semana são passados para o próximo, para não
//    repetirem abertura, piada ou estrutura.
//  - A chave do Gemini sai do código e vai para as Propriedades do Script.
//  - Usa systemInstruction (o prompt da DB2/DM2) e temperatura mais alta.
//
// CONFIGURAÇÃO (uma vez): no editor do Apps Script → Configurações do projeto
// (engrenagem) → Propriedades do script → adicionar:
//   GEMINI_API_KEY  = a chave NOVA do Google AI Studio (revogue a antiga!)
//   SITE_URL        = https://SEU-SITE.vercel.app   (sem barra no final)
//   RECAP_TOKEN     = o mesmo valor de RECAP_TOKEN configurado na Vercel
//   GEMINI_MODEL    = gemini-2.5-flash   (opcional; teste gemini-2.5-pro)
// =============================================================================

const RECAP_MAX_POR_EXECUCAO = 12   // evita estourar o limite de 6 min do Apps Script
const RECAP_PAUSA_MS = 3000

function recapConfig_() {
  const props = PropertiesService.getScriptProperties()
  const cfg = {
    apiKey: props.getProperty('GEMINI_API_KEY'),
    site: (props.getProperty('SITE_URL') || '').replace(/\/+$/, ''),
    token: props.getProperty('RECAP_TOKEN') || '',
    model: props.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash',
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
- LORE DA LIGA: apelidos, piadas internas e rivalidades escritos pelos próprios
  membros. É o tempero da zoeira: use quando encaixar naturalmente com o que
  aconteceu, nunca force, e respeite os itens marcados como "Proibido".
- RECAPS ANTERIORES / JÁ ESCRITOS NESTA SEMANA: servem para dar continuidade a
  histórias ("a crise continua") e, principalmente, para você NÃO repetir
  aberturas, piadas, metáforas, estrutura ou tom. Se outro recap da semana abriu
  com uma frase curta, abra de outro jeito. Se outro foi sarcástico, tente outro tom.
`

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

function chamaGemini_(cfg, sistema, texto) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`
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
  const processados = new Set()
  for (let i = 1; i < data.length && feitos < RECAP_MAX_POR_EXECUCAO; i++) {
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
      const texto = `Escreva o recap desta partida.\n\n${dossie}${outros}`
      const recap = chamaGemini_(cfg, sistema, texto)

      sheet.getRange(i + 1, cRecap + 1).setValue(recap)
      if (espelho > 0) sheet.getRange(espelho + 1, cRecap + 1).setValue(recap)
      SpreadsheetApp.flush()
      ;(daSemana[key] = daSemana[key] || new Set()).add(recap)
      feitos++
      Utilities.sleep(RECAP_PAUSA_MS)
    } catch (e) {
      Logger.log(`[RECAP] Erro em ${team} x ${opp}: ${e.message}`)
      if (/Gemini (429|403|400)/.test(e.message)) break
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

  const prompt = String(sheet.getRange('DM2').getValue() || '')
  if (!prompt) throw new Error('Prompt não encontrado em DM2.')
  const sistema = prompt + INSTRUCOES_DOSSIE

  const daSemana = {}
  data.slice(1).forEach(r => {
    const note = String(r[cNote] || '').trim()
    if (note) (daSemana[`${r[cSeason]}|${r[cWeek]}`] = daSemana[`${r[cSeason]}|${r[cWeek]}`] || []).push(note)
  })

  let feitos = 0
  for (let i = 1; i < data.length && feitos < RECAP_MAX_POR_EXECUCAO; i++) {
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
      const texto = `Escreva o verbete de Power Ranking de ${team} nesta semana.\n\n${dossie}${outros}`
      const note = chamaGemini_(cfg, sistema, texto)
      sheet.getRange(i + 1, cNote + 1).setValue(note)
      SpreadsheetApp.flush()
      ;(daSemana[key] = daSemana[key] || []).push(note)
      feitos++
      Utilities.sleep(RECAP_PAUSA_MS)
    } catch (e) {
      Logger.log(`[PR] Erro em ${team}: ${e.message}`)
      if (/Gemini (429|403|400)/.test(e.message)) break
    }
  }
  Logger.log(`[PR] ${feitos} verbete(s) gerado(s).`)
}

// Para testar: mostra no log o dossiê de um jogo, sem chamar o Gemini
function testarDossie() {
  const cfg = recapConfig_()
  Logger.log(fetchDossie_(cfg, { season: 2025, week: 1, team: 'Moneyball' }))
}
