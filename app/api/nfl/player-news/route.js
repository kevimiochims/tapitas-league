import { getPlayerNews, findEspnIdByName } from '@/app/lib/espn'
import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'
import { getRssNews, matchNewsToPlayers } from '@/app/lib/rssNews'

// Últimas manchetes de um jogador: ESPN (pelo ID) + RSS de outros sites (pelo nome)
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return Response.json({ error: 'Missing player id' }, { status: 400 })
  try {
    const players = await getSleeperPlayers()
    const info = players.get(id)
    // ESPN pelo ID do Sleeper; se não houver ID ou nada vier, procura o jogador pelo nome
    const espnNews = async () => {
      const byId = info?.espnId ? await getPlayerNews(info.espnId).catch(() => []) : []
      if (byId.length || !info?.name) return byId
      const found = await findEspnIdByName(info.name).catch(() => null)
      return found && found !== info.espnId ? getPlayerNews(found).catch(() => []) : []
    }
    const [espn, rss] = await Promise.all([
      espnNews(),
      info ? getRssNews().then(items => matchNewsToPlayers(items, [info], { loose: true })).catch(() => []) : [],
    ])
    const seen = new Set()
    const news = [...espn, ...rss]
      .filter(n => {
        const key = String(n.headline).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(({ athleteIds, player, ...n }) => n)
      .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
      .slice(0, 12)
    // 10 min: a lista do jogador não pode ficar atrás da Home (que renova a cada 15)
    return Response.json({ news }, { headers: cdnHeaders(600) })
  } catch (err) {
    console.error('[api/nfl/player-news]', err)
    return Response.json({ error: 'Failed to load player news' }, { status: 502 })
  }
}
