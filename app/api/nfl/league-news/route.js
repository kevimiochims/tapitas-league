import { getLeagueNews } from '@/app/lib/leagueNews'
import { cdnHeaders } from '@/app/lib/cache'

// Últimas notícias da ESPN sobre jogadores da liga. Montar a lista do zero
// (feed individual de cada titular) leva ~10 s; depois fica guardada 15 min.
export const maxDuration = 60

export async function GET() {
  try {
    return Response.json({ news: await getLeagueNews() }, { headers: cdnHeaders(900) })
  } catch (err) {
    console.error('[api/nfl/league-news]', err)
    return Response.json({ error: 'Failed to load league news' }, { status: 502 })
  }
}
