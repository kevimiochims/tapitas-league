import { buildMatchupContext, buildPowerRankingContext, buildWeekContext, renderContext, renderWeekContext } from '@/app/lib/recapContext'

// Dossiê de um confronto (ou de um time, no Power Ranking) para os recaps de IA.
// Usado pelo Apps Script antes de chamar o Gemini.
//   /api/recap/context?season=2026&week=5&team=Moneyball            → confronto
//   /api/recap/context?season=2026&week=5&team=Moneyball&mode=pr    → Power Ranking
//   /api/recap/context?season=2026&week=5&mode=week                  → rodada inteira (matéria da Tapitas News)
//   &format=json devolve os dados estruturados em vez do texto.
// Só usa dados que já são públicos no site. Opcional: com RECAP_TOKEN definido
// na Vercel, exige &token=... (não é necessário).
export async function GET(request) {
  const params = request.nextUrl.searchParams
  const token = process.env.RECAP_TOKEN
  if (token && params.get('token') !== token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const season = params.get('season')
  const week = params.get('week')
  const team = params.get('team')
  if (params.get('mode') === 'week') {
    if (!season || !week) return Response.json({ error: 'season and week are required' }, { status: 400 })
    try {
      const ctx = await buildWeekContext({ season, week })
      if (!ctx) return Response.json({ error: 'Week not found' }, { status: 404 })
      if (params.get('format') === 'json') return Response.json(ctx, { headers: { 'Cache-Control': 'no-store' } })
      return new Response(renderWeekContext(ctx), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
    } catch (err) {
      console.error('[api/recap/context] week', err)
      return Response.json({ error: 'Failed to build week context' }, { status: 502 })
    }
  }
  if (!season || !week || !team) {
    return Response.json({ error: 'season, week and team are required' }, { status: 400 })
  }
  try {
    const args = { season, week, team, opp: params.get('opp') || undefined }
    const ctx = params.get('mode') === 'pr' ? await buildPowerRankingContext(args) : await buildMatchupContext(args)
    if (!ctx) return Response.json({ error: 'Game not found' }, { status: 404 })
    if (params.get('format') === 'json') return Response.json(ctx, { headers: { 'Cache-Control': 'no-store' } })
    return new Response(renderContext(ctx), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[api/recap/context]', err)
    return Response.json({ error: 'Failed to build recap context' }, { status: 502 })
  }
}
