import { getTrending, getSleeperPlayers } from '@/app/lib/sleeper'
import { getLeagueRosters, rosterIndex } from '@/app/lib/leagueRosters'
import { cdnHeaders } from '@/app/lib/cache'

// Mais adicionados e mais cortados no Sleeper nas últimas 24h
export async function GET() {
  try {
    const [adds, drops, players, rosters] = await Promise.all([
      getTrending('add'),
      getTrending('drop'),
      getSleeperPlayers(),
      getLeagueRosters().catch(() => []),
    ])
    const owners = rosterIndex(rosters)
    const enrich = list => list.map(r => {
      const info = players.get(r.id)
      return {
        id: r.id,
        count: r.count,
        name: info?.name || r.id,
        pos: info?.pos || null,
        nflTeam: info?.team || null,
        injury: info?.injuryStatus || null,
        leagueTeams: (owners.get(r.id) || []).map(o => o.team),
      }
    }).filter(p => ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.pos))
    return Response.json({ adds: enrich(adds), drops: enrich(drops) }, { headers: cdnHeaders(1800) })
  } catch (err) {
    console.error('[api/nfl/trending]', err)
    return Response.json({ error: 'Failed to load trending players' }, { status: 502 })
  }
}
