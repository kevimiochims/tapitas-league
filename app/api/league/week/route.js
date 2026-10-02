import { getLeagueWeek } from '@/app/lib/leagueSchedule'
import { cdnHeaders, liveHeaders } from '@/app/lib/cache'

// Confrontos da Tapitas League numa semana (?week=, padrão: a atual)
export async function GET(request) {
  const week = Number(new URL(request.url).searchParams.get('week')) || null
  try {
    const data = await getLeagueWeek(week && week >= 1 && week <= 23 ? week : null)
    // Semana em andamento: cache curtíssimo (placar ao vivo); semanas fechadas podem ficar mais tempo
    return Response.json(data, { headers: data.live || data.status === 'current' ? liveHeaders(5) : cdnHeaders(data.status === 'final' ? 600 : 300) })
  } catch (err) {
    console.error('[api/league/week]', err)
    return Response.json({ error: 'Failed to load league week' }, { status: 502 })
  }
}
