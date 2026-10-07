import { getSleeperSeasonRows } from '@/app/lib/leagueSchedule'
import { liveHeaders } from '@/app/lib/cache'

// Semanas da temporada atual que ainda não estão na planilha (em andamento e
// futuras), no formato da aba GAME_FACTS_ALL, com as escalações do Sleeper
export async function GET() {
  try {
    return Response.json(await getSleeperSeasonRows(), { headers: liveHeaders(15) })
  } catch (err) {
    console.error('[api/league/sleeper-rows]', err)
    return Response.json([], { status: 200 })
  }
}
