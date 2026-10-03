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
  return cached('league:news:v5', 900, async () => {
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

    return dedupeStories(Array.from(items.values()))
      .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
      .slice(0, 40)
  })
}

// A mesma notícia chega por vários sites (PFT, RotoWire, RotoBaller...):
// "Seahawks place RB Jadarian Price on IR", "Jadarian Price: Placed on injured
// reserve" e "Seahawks Place Jadarian Price on Injured Reserve" viram uma só.
// Duas manchetes são a mesma história quando falam do mesmo jogador, saíram
// com até 36h de diferença e têm quase as mesmas palavras (tirando o nome dele).
const STOP = new Set(['a', 'an', 'the', 'on', 'in', 'of', 'to', 'for', 'and', 'with', 'at', 'as', 'is', 'his', 'by', 'from', 'after', 'be', 'will', 'has', 'have', 'rb', 'wr', 'qb', 'te', 'k'])
const SOURCE_RANK = ['ESPN', 'Pro Football Talk', 'CBS Sports', 'RotoWire', 'RotoBaller', 'FantasyPros']
function storyWords(n) {
  let t = String(n.headline || '').toLowerCase()
    .replace(/injured reserve/g, 'ir')
    .replace(/[^a-z0-9 ]/g, ' ')
  ;(n.players || [n.player]).filter(Boolean).forEach(p => {
    String(p.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).forEach(w => { t = t.replace(new RegExp(`\\b${w}\\b`, 'g'), ' ') })
  })
  return new Set(t.split(/\s+/).filter(w => w && !STOP.has(w)).map(w => (w.length > 4 ? w.slice(0, 4) : w))) // raiz: "placed" = "place" = "plac"
}
function similar(a, b) {
  const inter = [...a].filter(w => b.has(w)).length
  const small = Math.min(a.size, b.size)
  return small > 0 && inter / small >= 0.6
}
function dedupeStories(list) {
  const kept = []
  const rank = n => (n.image ? 0 : 10) + (SOURCE_RANK.indexOf(n.source) >= 0 ? SOURCE_RANK.indexOf(n.source) : 9)
  list
    .map(n => ({ n, words: storyWords(n), at: new Date(n.published || 0).getTime() }))
    .sort((x, y) => rank(x.n) - rank(y.n))
    .forEach(item => {
      const twin = kept.find(k =>
        k.n.player?.id && k.n.player.id === item.n.player?.id &&
        Math.abs(k.at - item.at) <= 36 * 3600 * 1000 &&
        similar(k.words, item.words))
      if (!twin) { kept.push(item); return }
      // Junta os jogadores citados e fica com o horário mais recente
      ;(item.n.players || []).forEach(p => { if (!twin.n.players.some(x => x.id === p.id)) twin.n.players.push(p) })
      if (item.at > twin.at) { twin.at = item.at; twin.n.published = item.n.published }
    })
  return kept.map(k => k.n)
}
