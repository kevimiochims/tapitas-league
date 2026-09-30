import { getScoreboard } from '@/app/lib/espn'
import { getKickoffWeather } from '@/app/lib/weather'
import { getLeagueRosters, rosterIndex } from '@/app/lib/leagueRosters'
import { getSleeperPlayers } from '@/app/lib/sleeper'
import { cdnHeaders } from '@/app/lib/cache'

// Jogos da rodada da NFL + clima no estádio + jogadores da liga em campo
export async function GET() {
  let board
  try {
    board = await getScoreboard()
  } catch (err) {
    console.error('[api/nfl/scoreboard]', err)
    return Response.json({ error: 'Failed to load scoreboard' }, { status: 502 })
  }

  // Jogadores da liga por time da NFL (se falhar, o placar sai sem essa parte)
  const byNflTeam = new Map()
  try {
    const [rosters, players] = await Promise.all([getLeagueRosters(), getSleeperPlayers()])
    rosterIndex(rosters).forEach((owners, id) => {
      const info = players.get(id)
      if (!info?.team) return
      if (!byNflTeam.has(info.team)) byNflTeam.set(info.team, [])
      owners.forEach(o => byNflTeam.get(info.team).push({ id, name: info.name, pos: info.pos, nflTeam: info.team, fantasyTeam: o.team, starter: o.starter }))
    })
  } catch (err) {
    console.error('[api/nfl/scoreboard] rosters', err.message)
  }

  const games = await Promise.all(board.games.map(async g => {
    let weather = null
    if (!g.completed && !g.neutralSite && g.indoor !== true) {
      weather = await getKickoffWeather(g.home.team, g.date).catch(() => null)
    } else if (g.indoor === true) {
      weather = { indoor: true }
    }
    const leaguePlayers = [...(byNflTeam.get(g.away.team) || []), ...(byNflTeam.get(g.home.team) || [])]
      .sort((a, b) => Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name))
    return { ...g, weather, leaguePlayers }
  }))

  const live = games.some(g => g.state === 'in')
  return Response.json({ ...board, games, live }, { headers: cdnHeaders(live ? 30 : 300) })
}
