import { getLeagueNews } from '@/app/lib/leagueNews'
import { cdnHeaders } from '@/app/lib/cache'

// Últimas notícias da ESPN sobre jogadores da liga
export async function GET() {
  try {
    return Response.json({ news: await getLeagueNews() }, { headers: cdnHeaders(900) })
  } catch (err) {
    console.error('[api/nfl/league-news]', err)
    return Response.json({ error: 'Failed to load league news' }, { status: 502 })
  }
}
