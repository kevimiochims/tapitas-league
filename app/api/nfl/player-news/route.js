import { getPlayerNews } from '@/app/lib/espn'
import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'

// Últimas manchetes de um jogador (ID do Sleeper → ID da ESPN)
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return Response.json({ error: 'Missing player id' }, { status: 400 })
  try {
    const players = await getSleeperPlayers()
    const espnId = players.get(id)?.espnId
    const news = espnId ? await getPlayerNews(espnId) : []
    return Response.json({ news }, { headers: cdnHeaders(1800) })
  } catch (err) {
    console.error('[api/nfl/player-news]', err)
    return Response.json({ error: 'Failed to load player news' }, { status: 502 })
  }
}
