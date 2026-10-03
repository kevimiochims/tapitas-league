import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'
import { getEspnRosterIds, espnNameKey } from '@/app/lib/espn'

const FANTASY = new Set(['QB', 'RB', 'WR', 'TE', 'K'])

// Mapa ID do Sleeper → ID da ESPN (para as fotos recortadas da ESPN)
export async function GET() {
  try {
    const [players, rosterIds] = await Promise.all([getSleeperPlayers(), getEspnRosterIds().catch(() => new Map())])
    const ids = {}
    players.forEach(p => {
      if (!FANTASY.has(p.pos)) return
      if (p.espnId) { ids[p.id] = p.espnId; return }
      // Sem ID no Sleeper: pelo elenco da ESPN (mesmo nome; com homônimo, mesmo time)
      const matches = rosterIds.get(espnNameKey(p.name)) || []
      const hit = matches.length === 1 ? matches[0] : matches.find(m => m.team && m.team === p.team)
      if (hit) ids[p.id] = hit.id
    })
    return Response.json(ids, { headers: cdnHeaders(86400) })
  } catch (err) {
    console.error('[api/nfl/espn-ids]', err)
    return Response.json({}, { status: 502 })
  }
}
