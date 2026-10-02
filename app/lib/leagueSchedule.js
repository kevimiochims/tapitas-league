import { cached, fetchJson } from './cache'
import { getSheetRows } from './sheets'
import { getLeagueRosters, getSheetNames, SLEEPER_LEAGUE_ID } from './leagueRosters'
import { getNflState, getSleeperPlayers } from './sleeper'
import { getScoreboard } from './espn'
import { isWeekFinal } from './nflCalendar'

// Calendário e placares da Tapitas League por semana.
// - Semanas já registradas na planilha (GAME_FACTS_ALL): placar final da planilha.
// - Semana em andamento e semanas futuras: confrontos e pontos ao vivo do Sleeper.

const BASE = `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}`

export function getLeagueInfo() {
  return cached('sleeper:league-info', 3600, async () => {
    const l = await fetchJson(BASE)
    return {
      season: String(l?.season || ''),
      status: l?.status || null,
      playoffWeekStart: Number(l?.settings?.playoff_week_start) || null,
      lastWeek: Number(l?.settings?.last_scored_leg) || null,
    }
  })
}

const num = v => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function weekNumbers(label) {
  return (String(label || '').match(/\d+/g) || []).map(Number)
}

function sheetGameType(row) {
  const raw = String(row?.GameType || row?.gameType || row?.GameStage || '').trim()
  return raw && !/^reg/i.test(raw) ? raw : null
}

// Confrontos de uma semana na planilha (uma linha por time; juntamos os pares)
async function getSheetWeek(season, week) {
  const rows = await getSheetRows('GAME_FACTS_ALL')
  const pairs = new Map()
  rows.forEach(r => {
    if (Number(r?.Season) !== Number(season) || !weekNumbers(r?.Week).includes(week)) return
    const team = String(r?.Team || '').trim()
    const opp = String(r?.Opponent || '').trim()
    if (!team || !opp) return
    const key = [team, opp].sort().join('|')
    if (pairs.has(key)) return
    pairs.set(key, {
      week: String(r?.Week || week).trim(),
      gameType: sheetGameType(r),
      teams: [
        { team, score: num(r?.PF ?? r?.Score) },
        { team: opp, score: num(r?.PA ?? r?.OpponentScore) },
      ],
    })
  })
  return Array.from(pairs.values()).filter(p => p.teams.some(t => t.score > 0))
}

// Confrontos de uma semana no Sleeper (pares pelo matchup_id)
export function getSleeperWeek(week) {
  // Pontos ao vivo: guarda só 15s (o Sleeper atualiza durante os jogos)
  return cached(`sleeper:matchups:${week}`, 15, async () => {
    const [entries, rosters] = await Promise.all([fetchJson(`${BASE}/matchups/${week}`), getLeagueRosters()])
    const teamByRoster = new Map(rosters.filter(r => r.rosterId != null).map(r => [String(r.rosterId), r.team]))
    const groups = new Map()
    ;(Array.isArray(entries) ? entries : []).forEach(e => {
      if (e?.matchup_id == null) return
      if (!groups.has(e.matchup_id)) groups.set(e.matchup_id, [])
      groups.get(e.matchup_id).push({
        team: teamByRoster.get(String(e.roster_id)) || `Team ${e.roster_id}`,
        rosterId: e.roster_id,
        score: num(e.custom_points ?? e.points),
        starters: (e.starters || []).map(String),
        players: (e.players || []).map(String),
        startersPoints: e.starters_points || [],
        playersPoints: e.players_points || {},
      })
    })
    return Array.from(groups.entries())
      .filter(([, teams]) => teams.length === 2)
      .map(([matchupId, teams]) => ({ matchupId, week: String(week), gameType: null, teams }))
  })
}

// Função que diz se um jogador (ID do Sleeper) está num jogo da NFL em andamento
async function getLiveStarterCheck() {
  const [board, players] = await Promise.all([getScoreboard().catch(() => ({ games: [] })), getSleeperPlayers().catch(() => new Map())])
  const liveTeams = new Set(board.games.filter(g => g.state === 'in').flatMap(g => [g.home.team, g.away.team]))
  if (!liveTeams.size) return () => false
  return id => liveTeams.has(players.get(String(id))?.team)
}

// Semana da liga: status (final / current / upcoming) + confrontos
export async function getLeagueWeek(requestedWeek) {
  const [info, state] = await Promise.all([getLeagueInfo().catch(() => null), getNflState().catch(() => null)])
  const season = info?.season || state?.season
  const currentWeek = state?.seasonType === 'regular' || state?.seasonType === 'post' ? state.week : null
  const week = Number(requestedWeek) || currentWeek || 1

  const sheet = season ? await getSheetWeek(season, week).catch(() => []) : []
  if (sheet.length) {
    return { season, week, currentWeek, source: 'sheet', status: 'final', matchups: sheet }
  }

  const sleeper = await getSleeperWeek(week).catch(err => { console.error('[league-week]', err.message); return [] })
  // final: semana encerrada · current: semana em andamento · upcoming: futura
  const final = state?.seasonStartDate ? isWeekFinal(state.seasonStartDate, week) : !currentWeek || week < currentWeek
  const status = final ? 'final' : week === currentWeek ? 'current' : 'upcoming'
  const liveIds = status === 'current' ? await getLiveStarterCheck() : null
  const matchups = sleeper.map(m => ({
    ...m,
    // "Live" só quando há jogo da NFL rolando com algum titular do confronto
    live: Boolean(liveIds && m.teams.some(t => t.starters.some(liveIds))),
    // Na lista resumida não mandamos a escalação completa
    teams: m.teams.map(({ starters, startersPoints, playersPoints, players, ...t }) => t),
  }))
  return { season, week, currentWeek, source: 'sleeper', status, live: matchups.some(m => m.live), matchups }
}

// Confronto completo do Sleeper (escalação e pontos por jogador) para a página Matchups
export async function getSleeperMatchup(week, team) {
  const list = await getSleeperWeek(week)
  const key = String(team || '').toLowerCase()
  return list.find(m => m.teams.some(t => t.team.toLowerCase() === key)) || null
}

// Números no formato da planilha (vírgula decimal), como a página Matchups espera
const br = n => (Number(n) || 0).toFixed(2).replace('.', ',')

// "Alvin Kamara" → "A. Kamara" (formato dos nomes no GAME_FACTS_ALL)
function abbreviate(name, pos) {
  const parts = String(name || '').trim().split(/\s+/)
  if (pos === 'DEF' || parts.length < 2) return String(name || '').trim()
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

// Linhas no formato da aba GAME_FACTS_ALL para a semana em andamento (e alguma
// semana já encerrada que ainda não foi para a planilha), montadas com as
// escalações do Sleeper. A página Matchups junta essas linhas às da planilha só
// para exibir o confronto; elas não entram em estatísticas.
export function getSleeperSeasonRows() {
  return cached('league:sleeper-rows', 15, async () => {
    const [info, state, sheetRows, sheetNames, players] = await Promise.all([
      getLeagueInfo(),
      getNflState().catch(() => null),
      getSheetRows('GAME_FACTS_ALL'),
      getSheetNames(),
      getSleeperPlayers(),
    ])
    const season = info.season
    if (!season) return []
    const lastRegular = info.playoffWeekStart ? info.playoffWeekStart - 1 : 17
    const inSheet = new Set(sheetRows
      .filter(r => Number(r?.Season) === Number(season) && num(r?.PF) > 0)
      .flatMap(r => weekNumbers(r?.Week)))
    const currentWeek = state?.seasonType === 'regular' ? state.week : state?.seasonType === 'pre' ? 1 : null
    // Todas as semanas da temporada que ainda não estão (terminadas) na planilha
    const startWeek = 1

    const name = id => {
      const info = players.get(id)
      return sheetNames.get(id) || abbreviate(info?.name || id, info?.pos)
    }
    const rows = []
    const weeks = []
    // Só até a semana em andamento: semanas futuras não entram (nada de 0 a 0
    // no game log nem confrontos que ainda não aconteceram)
    const lastWeek = Math.min(lastRegular, currentWeek || 0)
    for (let week = startWeek; week <= lastWeek; week++) if (!inSheet.has(week)) weeks.push(week)
    const allMatchups = await Promise.all(weeks.map(w => getSleeperWeek(w).catch(() => [])))
    const isLive = currentWeek && weeks.includes(currentWeek) ? await getLiveStarterCheck() : () => false
    weeks.forEach((week, wi) => {
      const matchups = allMatchups[wi]
      const weekFinal = state?.seasonStartDate ? isWeekFinal(state.seasonStartDate, week) : week < (currentWeek || 0)
      const weekStatus = weekFinal ? 'final' : week === currentWeek ? 'current' : 'upcoming'
      matchups.forEach(m => {
        const status = weekStatus === 'current' && m.teams.some(t => t.starters.some(isLive)) ? 'live' : weekStatus
        m.teams.forEach((t, i) => {
          const opp = m.teams[1 - i]
          const row = {
            Season: season,
            Week: String(week),
            Team: t.team,
            Opponent: opp.team,
            PF: br(t.score),
            PA: br(opp.score),
            Result: status === 'final' && (t.score || opp.score) ? (t.score > opp.score ? 'W' : t.score < opp.score ? 'L' : 'T') : '',
            GameType: 'Regular Season',
            GameStage: 'Regular Season',
            Status: status,
            Source: 'sleeper',
          }
          // Escalação do time (S/B) e do adversário (OS/OB), como na planilha
          const lineup = (side, starterPrefix, benchPrefix) => {
            const starters = side.starters.filter(id => id && id !== '0')
            starters.forEach((id, k) => {
              row[`${starterPrefix}${k + 1}_Name`] = name(id)
              row[`${starterPrefix}${k + 1}_Pts`] = br(side.startersPoints?.[side.starters.indexOf(id)] ?? side.playersPoints?.[id])
            })
            side.players.filter(id => !starters.includes(id)).forEach((id, k) => {
              row[`${benchPrefix}${k + 1}_Name`] = name(id)
              row[`${benchPrefix}${k + 1}_Pts`] = br(side.playersPoints?.[id])
            })
          }
          lineup(t, 'S', 'B')
          lineup(opp, 'OS', 'OB')
          rows.push(row)
        })
      })
    })
    return rows
  })
}
