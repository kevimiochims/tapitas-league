import { getAdvancedStats } from '@/app/lib/nflverse'
import { getNflState, getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'

// Snaps, participação nos alvos e red zone de um jogador na temporada
export async function GET(request) {
  const params = new URL(request.url).searchParams
  const id = params.get('id')
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return Response.json({ error: 'Missing player id' }, { status: 400 })
  try {
    const [players, state] = await Promise.all([getSleeperPlayers(), getNflState().catch(() => null)])
    const info = players.get(id)
    if (!info) return Response.json({ error: 'Unknown player' }, { status: 404 })
    const requested = params.get('season')
    const season = requested && /^\d{4}$/.test(requested) ? requested : (state?.season || String(new Date().getFullYear()))
    const stats = await getAdvancedStats({ sleeperId: id, gsisId: info.gsisId, name: info.name, team: info.team, season })
    return Response.json(stats, { headers: cdnHeaders(3 * 3600) })
  } catch (err) {
    console.error('[api/nfl/player-advanced]', err)
    return Response.json({ error: 'Failed to load advanced stats' }, { status: 502 })
  }
}
