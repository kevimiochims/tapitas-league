import { cached } from './cache'
import { getLeagueRosters } from './leagueRosters'
import { getNflState, getSchedule, getSleeperPlayers } from './sleeper'
import { NFL_TEAMS } from './nflTeams'

// Status severity order for the injury report
export const INJURY_ORDER = ['IR', 'Out', 'PUP', 'Sus', 'NA', 'DNR', 'Doubtful', 'Questionable']

function byeTeamsForWeek(schedule, week) {
  if (!week || !schedule.length) return []
  const weekGames = schedule.filter(g => g.week === week)
  if (!weekGames.length) return [] // semana fora da temporada regular
  const playing = new Set(weekGames.flatMap(g => [g.home, g.away]))
  return NFL_TEAMS.filter(t => !playing.has(t))
}

// Elencos da liga com lesões e folgas (bye) da semana atual e da próxima.
export function getLeagueStatus() {
  return cached('league:status', 600, async () => {
    const [state, rosters, players] = await Promise.all([getNflState(), getLeagueRosters(), getSleeperPlayers()])
    const season = state.season || String(rosters[0]?.season || '')
    const week = state.seasonType === 'regular' ? state.week : null
    const schedule = season ? await getSchedule(season).catch(() => []) : []

    const byeNow = byeTeamsForWeek(schedule, week)
    const byeNext = byeTeamsForWeek(schedule, week ? week + 1 : null)

    const teams = rosters.map(r => ({
      team: r.team,
      lineupSeason: r.season,
      lineupWeek: r.week,
      players: r.players.map(p => {
        const info = p.id ? players.get(p.id) : null
        const nflTeam = info?.team || null
        return {
          id: p.id,
          name: info?.name || p.sheetName,
          sheetName: p.sheetName,
          pos: info?.pos || null,
          nflTeam,
          starter: p.starter,
          injury: info?.injuryStatus ? { status: info.injuryStatus, bodyPart: info.injuryBodyPart, notes: info.injuryNotes } : null,
          byeThisWeek: Boolean(nflTeam && byeNow.includes(nflTeam)),
          byeNextWeek: Boolean(nflTeam && byeNext.includes(nflTeam)),
        }
      }),
    }))

    return { season, seasonType: state.seasonType, week, byeTeams: byeNow, nextWeekByeTeams: byeNext, teams }
  })
}
