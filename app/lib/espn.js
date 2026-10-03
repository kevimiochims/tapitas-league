import { cached, fetchJson } from './cache'
import { normalizeNflTeam } from './nflTeams'
import { getSleeperPlayers } from './sleeper'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// Placar da rodada atual da NFL (API pública da ESPN, a mesma do site deles).
// Cache curto porque os placares mudam durante os jogos.
// `week`: semana da NFL (1–18 temporada regular; 19+ = playoffs). Sem semana,
// a ESPN devolve a rodada atual.
export function getScoreboard({ week, season } = {}) {
  const w = Number(week) || null
  const query = w
    ? `?seasontype=${w > 18 ? 3 : 2}&week=${w > 18 ? w - 18 : w}${season ? `&dates=${season}` : ''}`
    : ''
  return cached(`espn:scoreboard:${w || 'current'}:${season || ''}`, 10, async () => {
    const data = await fetchJson(`${SITE}/scoreboard${query}`)
    const games = (data?.events || []).map(event => {
      const comp = event?.competitions?.[0] || {}
      const side = homeAway => {
        const c = (comp.competitors || []).find(x => x?.homeAway === homeAway) || {}
        return {
          team: normalizeNflTeam(c?.team?.abbreviation),
          espnId: c?.team?.id ? String(c.team.id) : null,
          name: c?.team?.shortDisplayName || c?.team?.displayName || '',
          logo: c?.team?.logo || null,
          score: c?.score != null && c.score !== '' ? Number(c.score) : null,
          record: c?.records?.[0]?.summary || null,
        }
      }
      const status = event?.status?.type || comp?.status?.type || {}
      return {
        id: String(event?.id || ''),
        date: event?.date || comp?.date || null,
        state: status.state || 'pre', // pre | in | post
        detail: status.shortDetail || status.detail || '',
        completed: Boolean(status.completed),
        home: side('home'),
        away: side('away'),
        neutralSite: Boolean(comp?.neutralSite),
        indoor: comp?.venue?.indoor ?? null,
        venue: comp?.venue?.fullName || null,
        possession: comp?.situation?.possession ? String(comp.situation.possession) : null,
        downDistance: comp?.situation?.shortDownDistanceText || comp?.situation?.downDistanceText || null,
        broadcast: (comp?.broadcasts || []).flatMap(b => b?.names || [])[0] || null,
      }
    })
    return {
      season: data?.season?.year ? String(data.season.year) : null,
      seasonType: data?.season?.type ?? null,
      week: data?.week?.number != null ? (data?.season?.type === 3 ? data.week.number + 18 : data.week.number) : w,
      games,
    }
  })
}

// Manchetes recentes de um jogador (ID da ESPN, que o Sleeper informa).
// Tenta o feed de notícias do fantasy da ESPN e, se falhar, o feed geral da NFL.
export function getPlayerNews(espnId) {
  return cached(`espn:news:${espnId}`, 1800, async () => {
    const id = encodeURIComponent(espnId)
    const urls = [
      `https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?playerId=${id}&limit=8`,
      `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/overview`,
      `${SITE}/news?athletes=${id}&limit=8`,
      `${SITE}/news?athlete=${id}&limit=8`,
    ]
    let lastError = null
    let answered = false
    for (const url of urls) {
      try {
        const data = await fetchJson(url)
        answered = true
        const items = mapNews(data)
        if (items.length) return items.slice(0, 8)
      } catch (err) {
        lastError = err
      }
    }
    if (!answered && lastError) throw lastError
    return []
  })
}

// IDs de atletas citados numa notícia (o formato varia entre os feeds da ESPN)
function athleteIds(a) {
  const ids = new Set()
  ;[a?.playerId, a?.athleteId, a?.athlete?.id].forEach(v => v && ids.add(String(v)))
  ;(a?.categories || []).forEach(c => {
    if (c?.athleteId) ids.add(String(c.athleteId))
    if (c?.type === 'athlete' && c?.athlete?.id) ids.add(String(c.athlete.id))
  })
  return Array.from(ids)
}

function mapNews(data) {
  const list = data?.feed || data?.articles || data?.headlines || data?.news?.articles || data?.news || []
  return (Array.isArray(list) ? list : []).map(a => ({
    id: String(a?.id || a?.dataSourceIdentifier || a?.headline || ''),
    headline: a?.headline || a?.title || '',
    description: a?.description || '',
    published: a?.published || a?.lastModified || null,
    url: a?.links?.web?.href || a?.link?.href || null,
    image: a?.images?.[0]?.url || null,
    athleteIds: athleteIds(a),
    source: 'ESPN',
  })).filter(a => a.headline)
}

// Feed geral de notícias de fantasy da ESPN (todas as notícias recentes de jogadores)
export function getFantasyNewsFeed() {
  return cached('espn:news:feed', 900, async () => {
    const data = await fetchJson('https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?limit=150')
    return mapNews(data)
  })
}

// ID da ESPN pelo nome (quando o Sleeper não informa ou o ID não traz notícias).
// Tenta o nome como está e sem apóstrofos/hífens ("De'Von" → "DeVon").
export function findEspnIdByName(name) {
  const variants = Array.from(new Set([String(name || '').trim(), String(name || '').replace(/['’`.-]/g, '').trim()])).filter(Boolean)
  return cached(`espn:search:${variants[0]}`, 24 * 3600, async () => {
    for (const q of variants) {
      try {
        const data = await fetchJson(`https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=5&type=player&sport=football&league=nfl`)
        const list = data?.items || data?.results?.flatMap(r => r?.contents || []) || []
        const hit = list.find(x => /football/i.test(String(x?.sport || x?.league || x?.uid || 'football')))
        const id = hit?.id || String(hit?.uid || '').match(/a:(\d+)/)?.[1]
        if (id) return String(id)
      } catch { /* tenta a próxima variação */ }
    }
    return null
  })
}

const nameKey = v => String(v || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/\./g, '')
  .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
  .replace(/[^a-z0-9]/g, '')

// IDs da ESPN pelos elencos atuais dos 32 times (nome → [{ id, team }]).
// O Sleeper não traz o ID da ESPN de boa parte dos jogadores (ex.: Jahmyr
// Gibbs), e sem ele não há foto recortada; este mapa completa o que falta.
export function getEspnRosterIds() {
  return cached('espn:roster-ids', 24 * 3600, async () => {
    const teams = await fetchJson(`${SITE}/teams`)
    const list = (teams?.sports?.[0]?.leagues?.[0]?.teams || []).map(t => t?.team).filter(Boolean)
    const byName = new Map()
    await Promise.all(list.map(t => fetchJson(`${SITE}/teams/${t.id}/roster`)
      .then(r => (r?.athletes || []).forEach(group => (group?.items || []).forEach(a => {
        const key = nameKey(a?.fullName)
        if (!key || !a?.id) return
        if (!byName.has(key)) byName.set(key, [])
        byName.get(key).push({ id: String(a.id), team: normalizeNflTeam(t.abbreviation) })
      })))
      .catch(() => {})))
    return byName
  })
}

export { nameKey as espnNameKey }

const FANTASY_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K'])

// Mapa ID do Sleeper → ID da ESPN. O Sleeper informa a maioria; quem falta é
// completado pelos elencos da ESPN (mesmo nome; com homônimo, mesmo time).
export function getEspnIdMap() {
  return cached('espn:id-map', 6 * 3600, async () => {
    const [players, rosterIds] = await Promise.all([getSleeperPlayers(), getEspnRosterIds().catch(() => new Map())])
    const ids = {}
    players.forEach(p => {
      if (!FANTASY_POS.has(p.pos)) return
      if (p.espnId) { ids[p.id] = p.espnId; return }
      const matches = rosterIds.get(nameKey(p.name)) || []
      const hit = matches.length === 1 ? matches[0] : matches.find(m => m.team && m.team === p.team)
      if (hit) ids[p.id] = hit.id
    })
    return ids
  })
}

// Fotos publicadas pela ESPN nas notícias de fantasy de um jogador: fotos de
// verdade (a.espncdn.com/photo) e, marcadas como `still`, quadros de vídeo
// (a legenda é o título do vídeo). Cada foto vem com legenda e data.
export function getPlayerPhotos(espnId) {
  return cached(`espn:player-photos:v2:${espnId}`, 3600, async () => {
    const id = encodeURIComponent(espnId)
    // Duas fontes por jogador: o feed de notícias de fantasy e as notícias da
    // página do atleta (cada uma traz fotos que a outra não tem)
    const [feed, overview] = await Promise.all([
      fetchJson(`https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?playerId=${id}&limit=50`).catch(() => null),
      fetchJson(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/overview`).catch(() => null),
    ])
    const list = [...(feed?.feed || feed?.articles || []), ...(overview?.news || [])]
    const out = []
    const seen = new Set()
    list.forEach(a => {
      const published = Date.parse(a?.published || a?.lastModified || '') || null
      ;(a?.images || []).forEach(img => {
        const url = String(img?.url || '')
        if (seen.has(url)) return
        const photo = /^https:\/\/a\.espncdn\.com\/photo\//.test(url)
        const still = /^https:\/\/espnmedia-cdn\.akamaized\.net\/espn\/media\//.test(url)
        if (!photo && !still) return
        seen.add(url)
        out.push({ url, caption: String(img?.caption || img?.name || a?.headline || ''), published, width: Number(img?.width) || 0, still })
      })
    })
    return out
  })
}
