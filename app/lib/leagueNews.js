import { cached } from './cache'
import { getFantasyNewsFeed, getPlayerNews } from './espn'
import { getLeagueRosters } from './leagueRosters'
import { getSleeperPlayers } from './sleeper'

// Notícias recentes da ESPN sobre jogadores dos elencos da liga.
// 1) Filtra o feed geral de fantasy da ESPN pelos jogadores da liga.
// 2) Se vier pouca coisa, completa com o feed individual dos titulares.
export function getLeagueNews() {
  return cached('league:news', 900, async () => {
    const [rosters, players] = await Promise.all([getLeagueRosters(), getSleeperPlayers()])

    const byEspn = new Map()
    rosters.forEach(r => r.players.forEach(p => {
      const info = p.id ? players.get(p.id) : null
      if (!info?.espnId || byEspn.has(info.espnId)) return
      byEspn.set(info.espnId, { id: p.id, name: info.name, pos: info.pos, nflTeam: info.team, sheetName: p.sheetName, fantasyTeam: r.team, starter: p.starter })
    }))

    const items = new Map()
    const add = (n, player) => {
      const key = n.url || n.id || n.headline
      if (!items.has(key)) items.set(key, { ...n, athleteIds: undefined, player })
    }

    const feed = await getFantasyNewsFeed().catch(err => { console.error('[league-news] feed', err.message); return [] })
    feed.forEach(n => {
      const id = n.athleteIds.find(a => byEspn.has(a))
      if (id) add(n, byEspn.get(id))
    })

    if (items.size < 8) {
      const starters = Array.from(byEspn.entries()).filter(([, p]) => p.starter).slice(0, 40)
      for (let i = 0; i < starters.length; i += 6) {
        await Promise.all(starters.slice(i, i + 6).map(([espnId, player]) =>
          getPlayerNews(espnId).then(list => list.slice(0, 2).forEach(n => add(n, player))).catch(() => {})))
      }
    }

    return Array.from(items.values())
      .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
      .slice(0, 25)
  })
}
