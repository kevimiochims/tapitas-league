import { cached } from './cache'
import { getScoreboard } from './espn'

// Arquivo de fotos da ESPN para temporadas antigas (as notícias por jogador
// só guardam as recentes). Duas fontes, ambas com fotos de jogo de verdade:
//   - o recap de cada partida: uma foto do jogo, e o nome do arquivo traz o
//     jogador em destaque ("nfl_u_rodgers04jr_C_576x324.jpg");
//   - as notícias da NFL de cada dia (now.core.api.espn.com?dates=AAAAMMDD),
//     com foto e legenda ("Odell Beckham Jr. takes over as Eli Manning's...").
// Conteúdo antigo não muda: fica no cache de dados do Next por 30 dias.

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const DAY = 24 * 3600 * 1000

async function fetchArchived(url, timeoutMs = 20000) {
  const res = await fetch(url, { next: { revalidate: 30 * 86400 }, signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) {
    const err = new Error(`${res.status} from ${url.split('?')[0]}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

const isPhoto = url => /^https:\/\/a\.espncdn\.com\/photo\//.test(String(url || ''))
const fileOf = url => String(url || '').split('/').pop().toLowerCase()

// Partidas de uma semana: id, data e os dois times (siglas da ESPN)
export function getWeekEvents(season, week) {
  return cached(`espn-archive:events:${season}:${week}`, 30 * 86400, async () => {
    const board = await getScoreboard({ week: Number(week), season })
    return (board?.games || []).map(g => ({ id: g.id, date: g.date, teams: [g.home?.team, g.away?.team].filter(Boolean) }))
  })
}

// Fotos do recap de uma partida (com a manchete, para contexto)
export function getRecapPhotos(eventId) {
  return cached(`espn-archive:recap:${eventId}`, 30 * 86400, async () => {
    const d = await fetchArchived(`${SITE}/summary?event=${encodeURIComponent(eventId)}`)
    const a = d?.article || {}
    return (a.images || [])
      .filter(img => isPhoto(img?.url))
      .map(img => ({ url: img.url, caption: String(img.caption || ''), headline: String(a.headline || ''), file: fileOf(img.url), width: Number(img.width) || 0, height: Number(img.height) || 0, source: 'recap', eventId: String(eventId) }))
  })
}

// Notícias da NFL de um dia (AAAAMMDD), todas as páginas
export function getDayPhotos(yyyymmdd) {
  return cached(`espn-archive:day:${yyyymmdd}`, 30 * 86400, async () => {
    const out = []
    for (let offset = 0; offset < 300; offset += 50) {
      let d
      try {
        d = await fetchArchived(`https://now.core.api.espn.com/v1/sports/news?sport=football&league=nfl&dates=${yyyymmdd}&limit=50&offset=${offset}`)
      } catch (err) {
        if (err.status === 404) break // passou do fim da lista
        throw err
      }
      const list = d?.headlines || []
      list.forEach(a => (a.images || []).forEach(img => {
        if (!isPhoto(img?.url)) return
        out.push({
          url: img.url,
          caption: String(img.caption || ''),
          headline: String(a.headline || ''),
          file: fileOf(img.url),
          width: Number(img.width) || 0,
          height: Number(img.height) || 0,
          published: Date.parse(a.published || '') || null,
          source: 'day',
        })
      }))
      if (list.length < 50) break
    }
    return out
  })
}

const ymd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '')

// Dias da semana do jogo: da véspera do primeiro jogo a 3 dias depois do último
export async function getWeekDays(season, weekLabel) {
  const weeks = (String(weekLabel).match(/\d+/g) || []).map(Number)
  const dates = []
  for (const w of weeks) (await getWeekEvents(season, w).catch(() => [])).forEach(e => { const t = Date.parse(e.date || ''); if (t) dates.push(t) })
  if (!dates.length) return []
  const days = []
  for (let t = Math.min(...dates) - DAY; t <= Math.max(...dates) + 3 * DAY; t += DAY) days.push(ymd(t))
  return Array.from(new Set(days))
}

// Versão maior da mesma foto (a ESPN guarda 1296x729 para as de 16:9)
export async function largestEspnPhoto(url) {
  const m = String(url).match(/^(.*)_\d+x\d+(_16-9)?\.jpg$/)
  if (!m) return url
  for (const size of ['1296x729', '576x324']) {
    const candidate = `${m[1]}_${size}${m[2] || ''}.jpg`
    if (candidate === url) return url
    const ok = await fetch(candidate, { method: 'HEAD', signal: AbortSignal.timeout(5000) }).then(r => r.ok).catch(() => false)
    if (ok) return candidate
  }
  return url
}

// Time da NFL do jogador em cada semana da temporada (Sleeper): { 6: 'GB', ... }
export function getPlayerWeekTeams(sleeperId, season) {
  return cached(`espn-archive:teams:${sleeperId}:${season}`, 7 * 86400, async () => {
    const d = await fetchArchived(`https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(sleeperId)}?season=${encodeURIComponent(season)}&season_type=regular&grouping=week`)
    const out = {}
    Object.values(d || {}).forEach(w => { if (w?.week && w?.team) out[Number(w.week)] = String(w.team).toUpperCase() })
    return out
  })
}
