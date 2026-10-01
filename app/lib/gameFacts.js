import { getSheetRows } from './sheets'
import { getNflState } from './sleeper'
import { isWeekFinal } from './nflCalendar'

// GAME_FACTS_ALL sem as semanas da temporada atual que ainda não terminaram
// (o confronto só acaba na madrugada de terça). Assim nenhuma página conta
// placar parcial, empate em 0 a 0 ou "último confronto" de uma semana em andamento.
export async function getFinishedGameFacts() {
  const [rows, state] = await Promise.all([getSheetRows('GAME_FACTS_ALL'), getNflState().catch(() => null)])
  if (!state?.season || !state.seasonStartDate) return rows
  return rows.filter(r => {
    if (String(r?.Season || '').trim() !== state.season) return true
    const weeks = (String(r?.Week || '').match(/\d+/g) || []).map(Number)
    return !weeks.length || weeks.every(w => isWeekFinal(state.seasonStartDate, w))
  })
}
