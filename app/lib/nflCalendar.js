// Calendário das rodadas da NFL usado pelo site.
// - A semana N começa na quarta-feira (a semana anterior fica em destaque
//   durante toda a terça, com os resultados).
// - O confronto da semana N só termina na madrugada de terça, depois do último
//   jogo da rodada (Monday Night). Antes disso a semana está em andamento e não
//   pode entrar em resultados, sequências nem confrontos diretos.
// Horários em UTC: quarta 09:00 UTC ≈ 05:00/06:00 em Nova York; terça 10:00 UTC
// ≈ 06:00/05:00 em Nova York.

const DAY = 86400000

// season_start_date do Sleeper é a quinta do kickoff; a semana 1 começa na quarta anterior
export function weekOneStart(seasonStartDate) {
  const d = new Date(`${seasonStartDate}T09:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getTime() - DAY)
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

// O confronto da semana já terminou? (terça 10:00 UTC depois do início da semana)
export function isWeekFinal(seasonStartDate, week, now = Date.now()) {
  const start = weekStart(seasonStartDate, week)
  if (!start) return true
  return now >= start.getTime() + 6 * DAY + 1 * 3600000
}
