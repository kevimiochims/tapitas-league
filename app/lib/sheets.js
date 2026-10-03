// Leitura da planilha da liga no servidor.
//
// Com GOOGLE_SHEETS_API_KEY definida, lê direto da API oficial do Google Sheets.
// Sem a chave, usa o opensheet.elk.sh como antes — só que agora pelo servidor,
// com cache, em vez de cada visitante chamar o opensheet no navegador.

export const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'

// Abas que o site pode pedir (evita que /api/sheet vire proxy aberto da planilha)
export const SHEET_TABS = new Set([
  'CALENDAR',
  'DRAFT_BOARD',
  'DRAFT_NOTES',
  'GAME_FACTS_ALL',
  'HEAD_TO_HEAD_SORTED',
  'PR_FOTOS',
  'TEAM_ALL_TIME',
  'TEAM_HISTORY_RAW',
  'TEAM_HISTORY_SORTED',
  '_PLAYER_CACHE',
])

// Tempo (segundos) que uma aba fica em cache antes de buscar de novo no Google
export const SHEET_TTL = 300

const UPSTREAM_TIMEOUT_MS = 20000

// Mesmo formato do opensheet: primeira linha vira as chaves de cada objeto
function rowsToObjects(values = []) {
  const [headers = [], ...rows] = values
  return rows.map(row => {
    const obj = {}
    row.forEach((cell, i) => { obj[headers[i]] = cell })
    return obj
  })
}

async function fetchJson(url) {
  // no-store: abas grandes (GAME_FACTS_ALL) passam do limite de 2MB do cache
  // de fetch do Next; o cache fica na memória abaixo e no CDN (Cache-Control).
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url.split('?')[0]}`)
  return res.json()
}

async function fetchSheetFromUpstream(tab) {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (apiKey) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tab)}?key=${apiKey}`
    const json = await fetchJson(url)
    return rowsToObjects(json.values)
  }
  const json = await fetchJson(`https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`)
  if (!Array.isArray(json)) throw new Error(`Unexpected opensheet response for ${tab}`)
  return json
}

// Cache em memória por instância do servidor. Se o Google falhar, devolve a
// última versão boa em vez de deixar o site sem dados.
const memory = new Map()
const inflight = new Map()

export async function getSheetRows(tab) {
  const hit = memory.get(tab)
  if (hit && Date.now() - hit.at < SHEET_TTL * 1000) return hit.rows

  // Várias requisições simultâneas da mesma aba compartilham uma única busca
  if (!inflight.has(tab)) {
    inflight.set(tab, fetchSheetFromUpstream(tab)
      .then(rows => {
        memory.set(tab, { rows, at: Date.now() })
        return rows
      })
      .finally(() => inflight.delete(tab)))
  }

  try {
    return await inflight.get(tab)
  } catch (err) {
    if (hit) {
      console.error(`[sheets] ${tab}: ${err.message} — servindo versão anterior`)
      return hit.rows
    }
    throw err
  }
}
