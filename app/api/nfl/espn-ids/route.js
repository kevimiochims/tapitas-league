import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'

const FANTASY = new Set(['QB', 'RB', 'WR', 'TE', 'K'])

// Mapa ID do Sleeper → ID da ESPN (para as fotos recortadas da ESPN)
export async function GET() {
  try {
    const players = await getSleeperPlayers()
    const ids = {}
    players.forEach(p => { if (p.espnId && FANTASY.has(p.pos)) ids[p.id] = p.espnId })
    return Response.json(ids, { headers: cdnHeaders(86400) })
  } catch (err) {
    console.error('[api/nfl/espn-ids]', err)
    return Response.json({}, { status: 502 })
  }
}
