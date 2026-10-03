import { getPowerRankingPhotos } from '@/app/lib/prPhotos'
import { cdnHeaders } from '@/app/lib/cache'

// ?season=2026&week=3 → { time: { url, caption, player, playerId, pts } }
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const season = String(searchParams.get('season') || '').trim()
  const week = String(searchParams.get('week') || '').trim()
  if (!/^\d{4}$/.test(season) || !/^\d+(-\d+)?$/.test(week)) {
    return Response.json({ error: 'season and week required' }, { status: 400 })
  }
  try {
    return Response.json(await getPowerRankingPhotos(season, week), { headers: cdnHeaders(3 * 3600) })
  } catch (err) {
    console.error('[api/league/pr-photos]', err)
    return Response.json({}, { status: 502 })
  }
}
