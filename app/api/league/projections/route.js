import { getProjectedPoints } from '@/app/lib/liveStats'
import { cdnHeaders } from '@/app/lib/cache'

// Projeção de pontos por jogador (ID do Sleeper) numa semana já jogada:
// ?season=2025&week=5 (semana dupla "15-16" soma as duas). Desde 2018.
export async function GET(request) {
  const params = new URL(request.url).searchParams
  const season = Number(params.get('season'))
  const weeks = String(params.get('week') || '').split(/[-–&]/).map(w => Number(w.trim())).filter(w => w >= 1 && w <= 18)
  if (!season || season < 2018 || !weeks.length) return Response.json({}, { headers: cdnHeaders(86400) })
  try {
    const maps = await Promise.all(weeks.map(w => getProjectedPoints(season, w, { past: true })))
    const out = {}
    maps.forEach(m => m.forEach((pts, id) => { if (pts) out[id] = Math.round(((out[id] || 0) + pts) * 100) / 100 }))
    return Response.json(out, { headers: cdnHeaders(86400) })
  } catch (err) {
    console.error('[api/league/projections]', err)
    return Response.json({}, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }
}
