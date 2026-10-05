// Calendário das rodadas da NFL usado pelo site.
// - A semana N começa na quarta-feira (a semana anterior fica em destaque
//   durante toda a terça, com os resultados).
// - O confronto da semana N termina na madrugada de terça, depois do Monday
//   Night (usado só para o rótulo Final / In progress dos placares do Sleeper).
// As estatísticas vêm só da GAME_FACTS_ALL; este calendário não filtra a planilha.
// Horários em UTC: a semana vira na quarta 09:00 UTC; o confronto termina na
// terça 06:00 UTC (03:00 em Brasília).

const DAY = 86400000

// A semana 1 começa na quarta-feira do kickoff (a quarta igual ou anterior ao
// season_start_date do Sleeper). O Sleeper nem sempre manda a quinta: em 2026
// veio a quarta (09/09), e subtrair um dia jogava o calendário um dia para
// trás (confronto "Final" na segunda, antes do Monday Night). Assim bate com o
// script semanal da planilha (quarta antes da quinta do kickoff)
export function weekOneStart(seasonStartDate) {
  const d = new Date(`${seasonStartDate}T09:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  const back = (d.getUTCDay() - 3 + 7) % 7 // dias desde a quarta
  return new Date(d.getTime() - back * DAY)
}

export function weekStart(seasonStartDate, week) {
  const start = weekOneStart(seasonStartDate)
  return start ? new Date(start.getTime() + (week - 1) * 7 * DAY) : null
}

// Semana em destaque agora (1–22), ou null fora da temporada
export function displayWeek(seasonStartDate, now = Date.now()) {
  const start = weekOneStart(seasonStartDate)
  if (!start) return null
  const diff = now - start.getTime()
  if (diff < 0) return null
  return Math.min(22, Math.floor(diff / (7 * DAY)) + 1)
}

// O confronto da semana já terminou? (terça 06:00 UTC = 03:00 em Brasília,
// depois do Monday Night; mesma regra do script semanal da planilha)
export function isWeekFinal(seasonStartDate, week, now = Date.now()) {
  const start = weekStart(seasonStartDate, week)
  if (!start) return true
  return now >= start.getTime() + 6 * DAY - 3 * 3600000
}

// Kickoff da temporada pela regra da NFL: a quinta-feira depois do Labor Day
// (primeira segunda de setembro). Usado quando o Sleeper não informa a data.
export function kickoffDate(season) {
  const year = Number(season)
  if (!year) return null
  const sept1 = new Date(Date.UTC(year, 8, 1))
  const laborDay = 1 + ((8 - sept1.getUTCDay()) % 7) // 1ª segunda de setembro
  return `${year}-09-${String(laborDay + 3).padStart(2, '0')}`
}
