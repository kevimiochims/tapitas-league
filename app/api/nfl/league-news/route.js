import { getLeagueNews } from '@/app/lib/leagueNews'
import { cdnHeaders } from '@/app/lib/cache'
import { isEconomy } from '@/app/lib/economy'

// Últimas notícias da ESPN sobre jogadores da liga. Montar a lista do zero
// (feed individual de cada titular) leva ~10 s; depois fica guardada 15 min.
export const maxDuration = 60

export async function GET() {
  // Modo economia (até 05/11): não monta a lista
  if (isEconomy()) return Response.json({ news: [], paused: true }, { headers: cdnHeaders(3600) })
  try {
    return Response.json({ news: await getLeagueNews() }, { headers: cdnHeaders(1800) })
  } catch (err) {
    console.error('[api/nfl/league-news]', err)
    return Response.json({ error: 'Failed to load league news' }, { status: 502 })
  }
}
