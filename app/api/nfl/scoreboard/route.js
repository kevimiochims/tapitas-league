import { getScoreboard } from '@/app/lib/espn'
import { getKickoffWeather } from '@/app/lib/weather'
import { getLeagueRosters, rosterIndex } from '@/app/lib/leagueRosters'
import { getLeagueInfo, getSleeperWeek } from '@/app/lib/leagueSchedule'
import { getSleeperPlayers, getNflState } from '@/app/lib/sleeper'
import { cdnHeaders, liveHeaders } from '@/app/lib/cache'

// Jogos de uma rodada da NFL (?week=, padrão: a atual) + clima no estádio +
// jogadores da liga em campo
export async function GET(request) {
  const requested = Number(new URL(request.url).searchParams.get('week')) || null
  let board
  try {
    // Sem semana pedida, usa a semana do calendário do site (vira na quarta)
    const state = await getNflState().catch(() => null)
    const week = requested && requested >= 1 && requested <= 23 ? requested : state?.seasonType === 'regular' || state?.seasonType === 'post' ? state.week : null
    board = await getScoreboard({ week, season: state?.season })
  } catch (err) {
    console.error('[api/nfl/scoreboard]', err)
    // Mesmo sem a ESPN, devolve a semana atual para o seletor da Home
    const state = await getNflState().catch(() => null)
    return Response.json({ error: `Failed to load scoreboard: ${err.message}`, week: requested || state?.week || null, games: [], live: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // Jogadores da liga por time da NFL, com o elenco de cada franquia NAQUELA
  // semana e os pontos de cada um (confrontos do Sleeper). Se não der, usa os
  // elencos atuais, sem pontos.
  const byNflTeam = new Map()
  const push = (nflTeam, entry) => {
    if (!nflTeam) return
    if (!byNflTeam.has(nflTeam)) byNflTeam.set(nflTeam, [])
    byNflTeam.get(nflTeam).push(entry)
  }
  try {
    const players = await getSleeperPlayers()
    const info = board.season ? await getLeagueInfo().catch(() => null) : null
    const weekMatchups = info?.season === board.season && board.week
      ? await getSleeperWeek(board.week).catch(() => [])
      : []
    if (weekMatchups.length) {
      weekMatchups.forEach(m => m.teams.forEach(t => t.players.forEach(id => {
        const p = players.get(id)
        if (!p) return
        const pts = t.playersPoints?.[id]
        push(p.team, { id, name: p.name, pos: p.pos, nflTeam: p.team, fantasyTeam: t.team, starter: t.starters.includes(id), points: typeof pts === 'number' ? pts : null })
      })))
    } else {
      const rosters = await getLeagueRosters()
      rosterIndex(rosters).forEach((owners, id) => {
        const p = players.get(id)
        owners.forEach(o => push(p?.team, { id, name: p?.name, pos: p?.pos, nflTeam: p?.team, fantasyTeam: o.team, starter: o.starter, points: null }))
      })
    }
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
  const state = await getNflState().catch(() => null)
  const pending = games.some(g => !g.completed)
  return Response.json({ ...board, games, live, currentWeek: state?.week || null }, { headers: live ? liveHeaders(10) : pending ? liveHeaders(30) : cdnHeaders(300) })
}
