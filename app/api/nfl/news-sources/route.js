import { getRssSources } from '@/app/lib/rssNews'
import { getFantasyNewsFeed, getPlayerNews } from '@/app/lib/espn'
import { getSleeperPlayers } from '@/app/lib/sleeper'

// Diagnóstico das fontes de notícias: quantas notícias cada uma trouxe e os
// erros de cada endereço. Com ?id=<Sleeper ID>, mostra as da ESPN do jogador.
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  const [rss, espnFeed] = await Promise.all([
    getRssSources().catch(err => [{ error: err.message }]),
    getFantasyNewsFeed().then(items => ({ items: items.length, sample: items.slice(0, 3).map(n => n.headline) })).catch(err => ({ error: err.message })),
  ])
  let player = null
  if (id) {
    const info = (await getSleeperPlayers().catch(() => new Map())).get(id)
    player = { id, name: info?.name, espnId: info?.espnId }
    if (info?.espnId) player.espn = await getPlayerNews(info.espnId).then(n => n.map(x => x.headline)).catch(err => ({ error: err.message }))
  }
  return Response.json({
    espnFantasyFeed: espnFeed,
    rss: rss.map(s => ({ name: s.name, items: s.items?.length ?? 0, attempts: s.attempts, sample: (s.items || []).slice(0, 3).map(n => n.headline) })),
    player,
  })
}
