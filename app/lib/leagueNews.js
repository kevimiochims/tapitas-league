import { cached } from './cache'
import { getFantasyNewsFeed, getPlayerNews } from './espn'
import { getLeagueRosters } from './leagueRosters'
import { getSleeperPlayers } from './sleeper'
import { getRssNews, matchNewsToPlayers } from './rssNews'

// Notícias recentes sobre jogadores dos elencos da liga.
// 1) Feed geral de fantasy da ESPN, filtrado pelos jogadores da liga.
// 2) RSS de RotoWire, RotoBaller, FantasyPros e CBS, pelo nome do jogador.
// 3) Se vier pouca coisa, completa com o feed individual da ESPN dos titulares.
const normalizeHeadline = h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)

export function getLeagueNews() {
  return cached('league:news:v2', 900, async () => {
    const [rosters, players] = await Promise.all([getLeagueRosters(), getSleeperPlayers()])

    const byEspn = new Map()
    const rosterPlayersWithoutEspn = []
    rosters.forEach(r => r.players.forEach(p => {
      const info = p.id ? players.get(p.id) : null
      if (!info) return
      const entry = { id: p.id, name: info.name, pos: info.pos, nflTeam: info.team, sheetName: p.sheetName, fantasyTeam: r.team, starter: p.starter }
      if (!info.espnId) rosterPlayersWithoutEspn.push(entry)
      else if (!byEspn.has(info.espnId)) byEspn.set(info.espnId, entry)
    }))

    // Cada notícia guarda todos os jogadores da liga citados nela (`players`;
    // `player` é o primeiro), para aparecer no filtro de todos os times envolvidos
    const items = new Map()
    const add = (n, list) => {
      const key = normalizeHeadline(n.headline)
      const players = (Array.isArray(list) ? list : [list]).filter(Boolean)
      if (!players.length) return
      const prev = items.get(key)
      if (prev) {
        players.forEach(p => { if (!prev.players.some(x => x.id === p.id)) prev.players.push(p) })
        return
      }
      items.set(key, { ...n, athleteIds: undefined, player: players[0], players: players.slice() })
    }

    const feed = await getFantasyNewsFeed().catch(err => { console.error('[league-news] feed', err.message); return [] })
    feed.forEach(n => add(n, n.athleteIds.filter(a => byEspn.has(a)).map(a => byEspn.get(a))))

    // RSS: pelos nomes no título e no resumo; o feed da ESPN também passa por
    // aqui para achar quem é citado no texto além dos atletas marcados
    const allPlayers = Array.from(byEspn.values()).concat(rosterPlayersWithoutEspn)
    const rss = await getRssNews().catch(() => [])
    matchNewsToPlayers(rss, allPlayers).forEach(n => add(n, n.players))
    matchNewsToPlayers(feed, allPlayers).forEach(n => add(n, n.players))

    if (items.size < 8) {
      const starters = Array.from(byEspn.entries()).filter(([, p]) => p.starter).slice(0, 40)
      for (let i = 0; i < starters.length; i += 6) {
        await Promise.all(starters.slice(i, i + 6).map(([espnId, player]) =>
          getPlayerNews(espnId).then(list => list.slice(0, 2).forEach(n => add(n, player))).catch(() => {})))
      }
    }

    return Array.from(items.values())
      .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
      .slice(0, 40)
  })
}
