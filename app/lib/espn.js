import { cached, fetchJson } from './cache'
import { normalizeNflTeam } from './nflTeams'

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
  return cached(`espn:scoreboard:${w || 'current'}:${season || ''}`, 30, async () => {
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
