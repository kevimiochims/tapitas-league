import { getLeagueTransactions } from '@/app/lib/leagueTransactions'
import { cdnHeaders } from '@/app/lib/cache'

// Histórico de trades, waivers e free agents da liga no Sleeper (todas as temporadas)
export async function GET() {
  try {
    const data = await getLeagueTransactions()
    return Response.json(data, { headers: cdnHeaders(900) })
  } catch (err) {
    console.error('[api/league/transactions]', err)
    return Response.json({ error: 'Failed to load transactions' }, { status: 502 })
  }
}
