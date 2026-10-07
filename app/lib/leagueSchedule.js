import { cached, fetchJson } from './cache'
import { getSheetRows } from './sheets'
import { getLeagueRosters, getSheetNames, SLEEPER_LEAGUE_ID } from './leagueRosters'
import { getNflState, getSleeperPlayers } from './sleeper'
import { getScoreboard } from './espn'
import { isWeekFinal } from './nflCalendar'
import { getLivePoints, getProjectedPoints } from './liveStats'

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
  // Pontos ao vivo: guarda 15s. Os pontos de cada jogador vêm das
  // estatísticas ao vivo (mais rápidas que o endpoint de confrontos), com a
  // projeção da semana junto.
  return cached(`sleeper:matchups:${week}`, 15, async () => {
    const info = await getLeagueInfo().catch(() => null)
    const season = info?.season
    const [entries, rosters, live, proj] = await Promise.all([
      fetchJson(`${BASE}/matchups/${week}`),
      getLeagueRosters(),
      season ? getLivePoints(season, week).catch(() => new Map()) : new Map(),
      season ? getProjectedPoints(season, week).catch(() => new Map()) : new Map(),
    ])
    const teamByRoster = new Map(rosters.filter(r => r.rosterId != null).map(r => [String(r.rosterId), r.team]))
    const groups = new Map()
    ;(Array.isArray(entries) ? entries : []).forEach(e => {
      if (e?.matchup_id == null) return
      if (!groups.has(e.matchup_id)) groups.set(e.matchup_id, [])
      const starters = (e.starters || []).map(String)
      const players = (e.players || []).map(String)
      // Pontos de cada jogador: estatística ao vivo quando existir
      const playersPoints = { ...(e.players_points || {}) }
      players.forEach(id => { if (live.has(id)) playersPoints[id] = live.get(id) })
      const startersPoints = starters.map((id, k) => (live.has(id) ? live.get(id) : (e.starters_points || [])[k] ?? 0))
      const liveScore = Math.round(startersPoints.reduce((sum, p) => sum + (Number(p) || 0), 0) * 100) / 100
      const projections = {}
      players.forEach(id => { if (proj.has(id)) projections[id] = proj.get(id) })
      groups.get(e.matchup_id).push({
        team: teamByRoster.get(String(e.roster_id)) || `Team ${e.roster_id}`,
        rosterId: e.roster_id,
        // Ajuste manual do comissário (custom_points) continua valendo
        score: e.custom_points != null ? num(e.custom_points) : (live.size ? liveScore : num(e.points)),
        projected: Math.round(starters.reduce((sum, id) => sum + (proj.get(id) || 0), 0) * 100) / 100,
        starters,
        players,
        startersPoints,
        playersPoints,
        projections,
      })
    })
    return Array.from(groups.entries())
      .filter(([, teams]) => teams.length === 2)
      .map(([matchupId, teams]) => ({ matchupId, week: String(week), gameType: null, teams }))
  })
}

// Estado do jogo da NFL de um jogador (ID do Sleeper) na rodada atual:
// 'pre' (ainda vai jogar) · 'in' (em campo) · 'post' (já jogou) · 'bye'
async function getStarterGameState() {
  const [board, players] = await Promise.all([getScoreboard().catch(() => ({ games: [] })), getSleeperPlayers().catch(() => new Map())])
  const byTeam = new Map()
  board.games.forEach(g => [g.home.team, g.away.team].filter(Boolean).forEach(t => byTeam.set(t, g.state)))
  if (!byTeam.size) return () => null
  return id => byTeam.get(players.get(String(id))?.team) || 'bye'
}

// Função que diz se um jogador (ID do Sleeper) está num jogo da NFL em andamento
async function getLiveStarterCheck() {
  const stateOf = await getStarterGameState()
  return id => stateOf(id) === 'in'
}

// Ainda tem jogo da NFL por jogar (ou rolando) nesta semana? Só olhamos a
// semana em destaque: é ela que pode ter o Monday Night pendente. Serve de
// trava para o calendário e para uma semana que entrou na planilha antes da
// hora: enquanto houver jogo pendente, o confronto não é Final.
async function nflWeekPending(season, week, currentWeek) {
  if (!season || !week || week !== currentWeek) return false
  const board = await getScoreboard({ week, season }).catch(() => null)
  const games = board?.games || []
  return games.length > 0 && games.some(g => g.state !== 'post')
}

// Semana da liga: status (final / current / upcoming) + confrontos
export async function getLeagueWeek(requestedWeek) {
  const [info, state] = await Promise.all([getLeagueInfo().catch(() => null), getNflState().catch(() => null)])
  const season = info?.season || state?.season
  const currentWeek = state?.seasonType === 'regular' || state?.seasonType === 'post' ? state.week : null
  const week = Number(requestedWeek) || currentWeek || 1

  const [sheet, pending] = await Promise.all([
    season ? getSheetWeek(season, week).catch(() => []) : [],
    nflWeekPending(season, week, currentWeek),
  ])
  if (sheet.length && !pending) {
    return { season, week, currentWeek, source: 'sheet', status: 'final', matchups: sheet }
  }

  const sleeper = await getSleeperWeek(week).catch(err => { console.error('[league-week]', err.message); return [] })
  // final: semana encerrada · current: semana em andamento · upcoming: futura
  const final = !pending && (state?.seasonStartDate ? isWeekFinal(state.seasonStartDate, week) : !currentWeek || week < currentWeek)
  const status = final ? 'final' : week === currentWeek ? 'current' : 'upcoming'
  const stateOf = status === 'current' ? await getStarterGameState() : null
  const starterIds = t => t.starters.filter(id => id && id !== '0')
  const matchups = sleeper.map(m => ({
    ...m,
    // "Live" só quando há jogo da NFL rolando com algum titular do confronto
    live: Boolean(stateOf && m.teams.some(t => starterIds(t).some(id => stateOf(id) === 'in'))),
    // Na lista resumida não mandamos a escalação completa; só quantos
    // titulares ainda vão jogar e quantos estão em campo
    teams: m.teams.map(({ starters, startersPoints, playersPoints, players, projections, ...t }) => (stateOf
      ? { ...t, toPlay: starterIds({ starters }).filter(id => stateOf(id) === 'pre').length, playing: starterIds({ starters }).filter(id => stateOf(id) === 'in').length }
      : t)),
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

// Nome no formato do GAME_FACTS_ALL: completo ("Alvin Kamara"); defesa pelo
// apelido ("Broncos")
function sheetStyleName(name, pos) {
  const parts = String(name || '').trim().split(/\s+/)
  if (pos === 'DEF' && parts.length >= 2) return parts[parts.length - 1]
  return String(name || '').trim()
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
    const currentWeek = state?.seasonType === 'regular' ? state.week : state?.seasonType === 'pre' ? 1 : null
    // Semana em destaque com jogo da NFL ainda por jogar: segue ao vivo pelo
    // Sleeper mesmo que já tenha linhas na planilha (a página Matchups dá
    // preferência a estas linhas enquanto o confronto não termina)
    const pending = await nflWeekPending(season, currentWeek, currentWeek)
    const inSheet = new Set(sheetRows
      .filter(r => Number(r?.Season) === Number(season) && num(r?.PF) > 0)
      .flatMap(r => weekNumbers(r?.Week)))
    if (pending) inSheet.delete(currentWeek)
    // Todas as semanas da temporada que ainda não estão (terminadas) na planilha
    const startWeek = 1

    const name = id => {
      const info = players.get(id)
      return sheetNames.get(id) || sheetStyleName(info?.name || id, info?.pos)
    }
    const rows = []
    const weeks = []
    // Só até a semana em andamento: semanas futuras não entram (nada de 0 a 0
    // no game log nem confrontos que ainda não aconteceram)
    const lastWeek = Math.min(lastRegular, currentWeek || 0)
    for (let week = startWeek; week <= lastWeek; week++) if (!inSheet.has(week)) weeks.push(week)
    const allMatchups = await Promise.all(weeks.map(w => getSleeperWeek(w).catch(() => [])))
    const isLive = currentWeek && weeks.includes(currentWeek) ? await getLiveStarterCheck() : () => false
    // Jogo da NFL de cada time na semana em andamento: estado (pre/in/post) e
    // rótulo (horário do kickoff ou relógio do jogo), para a página Matchups
    // mostrar quem está em campo, quem já jogou e quem ainda vai jogar
    const gameByNflTeam = new Map()
    if (currentWeek && weeks.includes(currentWeek)) {
      const board = await getScoreboard().catch(() => ({ games: [] }))
      ;(board.games || []).forEach(g => [g.home?.team, g.away?.team].filter(Boolean).forEach(t => gameByNflTeam.set(t, g)))
    }
    const gameState = (id, week) => {
      if (week !== currentWeek) return null
      const g = gameByNflTeam.get(players.get(String(id))?.team)
      if (!g) return { st: 'bye', label: 'Bye' }
      return g.state === 'in' ? { st: 'in', label: g.detail || 'Live' } : g.state === 'post' ? { st: 'post', label: 'Final' } : { st: 'pre', label: g.date || '' }
    }
    weeks.forEach((week, wi) => {
      const matchups = allMatchups[wi]
      const weekFinal = !(pending && week === currentWeek) && (state?.seasonStartDate ? isWeekFinal(state.seasonStartDate, week) : week < (currentWeek || 0))
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
            ProjPF: br(t.projected),
            ProjPA: br(opp.projected),
          }
          // Escalação do time (S/B) e do adversário (OS/OB), como na planilha
          const lineup = (side, starterPrefix, benchPrefix) => {
            const starters = side.starters.filter(id => id && id !== '0')
            // ID do Sleeper e estado do jogo de cada jogador (nomes abreviados repetem)
            const extra = (prefix, id) => {
              row[`${prefix}_Id`] = id
              const gs = gameState(id, week)
              if (gs) { row[`${prefix}_GS`] = gs.st; row[`${prefix}_GT`] = gs.label }
            }
            starters.forEach((id, k) => {
              extra(`${starterPrefix}${k + 1}`, id)
              row[`${starterPrefix}${k + 1}_Name`] = name(id)
              row[`${starterPrefix}${k + 1}_Pts`] = br(side.startersPoints?.[side.starters.indexOf(id)] ?? side.playersPoints?.[id])
              if (side.projections?.[id] != null) row[`${starterPrefix}${k + 1}_Proj`] = br(side.projections[id])
            })
            side.players.filter(id => !starters.includes(id)).forEach((id, k) => {
              extra(`${benchPrefix}${k + 1}`, id)
              row[`${benchPrefix}${k + 1}_Name`] = name(id)
              row[`${benchPrefix}${k + 1}_Pts`] = br(side.playersPoints?.[id])
              if (side.projections?.[id] != null) row[`${benchPrefix}${k + 1}_Proj`] = br(side.projections[id])
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
