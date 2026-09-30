import { getLeagueStatus } from '@/app/lib/leagueStatus'
import { cdnHeaders } from '@/app/lib/cache'

// Elencos da liga com relatório de lesões e folgas da semana (Sleeper)
export async function GET() {
  try {
    return Response.json(await getLeagueStatus(), { headers: cdnHeaders(600) })
  } catch (err) {
    console.error('[api/nfl/league]', err)
    return Response.json({ error: 'Failed to load league status' }, { status: 502 })
  }
}
