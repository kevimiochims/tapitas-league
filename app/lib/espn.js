import { cached, fetchJson } from './cache'
import { normalizeNflTeam } from './nflTeams'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// Placar da rodada atual da NFL (API pública da ESPN, a mesma do site deles).
// Cache curto porque os placares mudam durante os jogos.
export function getScoreboard() {
  return cached('espn:scoreboard', 30, async () => {
    const data = await fetchJson(`${SITE}/scoreboard`)
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
      week: data?.week?.number ?? null,
      games,
    }
  })
}

// Manchetes recentes de um jogador (ID da ESPN, que o Sleeper informa).
// Tenta o feed de notícias do fantasy da ESPN e, se falhar, o feed geral da NFL.
export function getPlayerNews(espnId) {
  return cached(`espn:news:${espnId}`, 1800, async () => {
    const urls = [
      `https://site.api.espn.com/apis/fantasy/v2/games/ffl/news/players?playerId=${encodeURIComponent(espnId)}&limit=8`,
      `${SITE}/news?athlete=${encodeURIComponent(espnId)}&limit=8`,
    ]
    let lastError = null
    let answered = false
    for (const url of urls) {
      try {
        const data = await fetchJson(url)
        answered = true
        const items = (data?.feed || data?.articles || data?.headlines || []).map(a => ({
          id: String(a?.id || a?.dataSourceIdentifier || a?.headline || ''),
          headline: a?.headline || a?.title || '',
          description: a?.description || '',
          published: a?.published || a?.lastModified || null,
          url: a?.links?.web?.href || a?.link?.href || null,
          image: a?.images?.[0]?.url || null,
        })).filter(a => a.headline)
        if (items.length) return items.slice(0, 8)
      } catch (err) {
        lastError = err
      }
    }
    if (!answered && lastError) throw lastError
    return []
  })
}
