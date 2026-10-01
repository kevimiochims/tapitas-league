import { getSheetRows } from './sheets'
import { cached, fetchJson } from './cache'

// Elencos atuais da liga. A fonte principal são os elencos da liga no Sleeper
// (sempre atualizados). Se o Sleeper falhar, usamos a escalação mais recente
// de cada franquia na aba GAME_FACTS_ALL. Os nomes da planilha viram IDs do
// Sleeper pela aba _PLAYER_CACHE.

export const SLEEPER_LEAGUE_ID = '1361545167261138944'

export function normalizePlayerKey(value) {
  return String(value || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// "16-17" / "16 & 17" → 17; "4" → 4
function weekNumber(label) {
  const nums = String(label || '').match(/\d+/g)
  return nums ? Math.max(...nums.map(Number)) : 0
}

function buildNameLookup(cacheRows) {
  const map = new Map()
  cacheRows.forEach(row => {
    const id = String(row?.player_id || '').trim()
    if (!id) return
    const values = [row?.name, row?.full_name, `${row?.first_name || ''} ${row?.last_name || ''}`, row?.search_full_name]
    values.forEach(v => {
      const key = normalizePlayerKey(v)
      if (key && !map.has(key)) map.set(key, id)
    })
  })
  return map
}

function lineupNames(row, prefix) {
  const names = []
  for (let i = 1; i <= 25; i++) {
    const name = String(row?.[`${prefix}${i}_Name`] || '').trim()
    if (name && name !== '--empty--') names.push(name)
  }
  return names
}

// Escalação mais recente de cada franquia na planilha
function getSheetRosters() {
  return cached('league:sheet-rosters', 600, async () => {
    const [games, cacheRows] = await Promise.all([getSheetRows('GAME_FACTS_ALL'), getSheetRows('_PLAYER_CACHE')])
    const lookup = buildNameLookup(cacheRows)

    const season = Math.max(0, ...games.map(g => Number(g?.Season) || 0))
    const seasonGames = games.filter(g => Number(g?.Season) === season)

    const latestByTeam = new Map()
    seasonGames.forEach(g => {
      const team = String(g?.Team || '').trim()
      if (!team) return
      const week = weekNumber(g?.Week)
      const prev = latestByTeam.get(team)
      if (!prev || week > prev.week) latestByTeam.set(team, { week, row: g })
    })

    return Array.from(latestByTeam.entries())
      .map(([team, { week, row }]) => {
        const players = []
        const add = (name, starter) => players.push({ id: lookup.get(normalizePlayerKey(name)) || null, sheetName: name, starter })
        lineupNames(row, 'S').forEach(n => add(n, true))
        lineupNames(row, 'B').forEach(n => add(n, false))
        return { team, season, week, source: 'sheet', players }
      })
      .sort((a, b) => a.team.localeCompare(b.team))
  })
}

// Nome do jogador como aparece na planilha (ex.: "J. Allen"), para o Player Profile
export async function getSheetNames() {
  const rows = await getSheetRows('_PLAYER_CACHE').catch(() => [])
  const map = new Map()
  rows.forEach(r => {
    const id = String(r?.player_id || '').trim()
    const name = String(r?.name || r?.full_name || '').trim()
    if (id && name && !map.has(id)) map.set(id, name)
  })
  return map
}

const teamKey = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Elencos do Sleeper, com cada dono ligado à franquia da planilha. A ligação é
// feita pelos jogadores em comum com a última escalação de cada franquia (mais
// robusto que comparar nomes); o nome do time no Sleeper é o plano B.
async function getSleeperRosters(sheetRosters) {
  const base = `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}`
  const [rosters, users, sheetNames] = await Promise.all([fetchJson(`${base}/rosters`), fetchJson(`${base}/users`), getSheetNames()])
  if (!Array.isArray(rosters) || !rosters.length) throw new Error('Sleeper league has no rosters')

  const usersById = new Map((Array.isArray(users) ? users : []).map(u => [String(u?.user_id), u]))
  const sheetSets = sheetRosters.map(r => ({ team: r.team, ids: new Set(r.players.map(p => p.id).filter(Boolean)) }))

  // Pares (roster, franquia) ordenados por jogadores em comum; atribuição gulosa
  const pairs = []
  rosters.forEach((r, ri) => {
    const ids = (r?.players || []).map(String)
    sheetSets.forEach(s => {
      const overlap = ids.filter(id => s.ids.has(id)).length
      if (overlap >= 3) pairs.push({ ri, team: s.team, overlap })
    })
  })
  pairs.sort((a, b) => b.overlap - a.overlap)
  const teamByRoster = new Map()
  const usedTeams = new Set()
  pairs.forEach(p => {
    if (teamByRoster.has(p.ri) || usedTeams.has(p.team)) return
    teamByRoster.set(p.ri, p.team)
    usedTeams.add(p.team)
  })

  return rosters.map((r, ri) => {
    const user = usersById.get(String(r?.owner_id)) || {}
    const sleeperName = user?.metadata?.team_name || user?.display_name || `Team ${r?.roster_id}`
    const byName = sheetRosters.find(s => !usedTeams.has(s.team) && [user?.metadata?.team_name, user?.display_name].some(n => n && teamKey(n) === teamKey(s.team)))
    const team = teamByRoster.get(ri) || byName?.team || sleeperName
    const starters = new Set((r?.starters || []).map(String))
    const reserve = new Set((r?.reserve || []).map(String))
    const season = sheetRosters[0]?.season || null
    return {
      team,
      rosterId: r?.roster_id ?? null,
      season,
      week: null,
      source: 'sleeper',
      players: (r?.players || []).map(String).map(id => ({ id, sheetName: sheetNames.get(id) || null, starter: starters.has(id), reserve: reserve.has(id) })),
    }
  }).sort((a, b) => a.team.localeCompare(b.team))
}

export function getLeagueRosters() {
  return cached('league:rosters', 600, async () => {
    const sheetRosters = await getSheetRosters().catch(err => { console.error('[rosters] sheet', err.message); return [] })
    try {
      return await getSleeperRosters(sheetRosters)
    } catch (err) {
      console.error('[rosters] sleeper league', err.message)
      if (!sheetRosters.length) throw err
      return sheetRosters
    }
  })
}

// Mapa ID do Sleeper → franquias da liga que têm o jogador
export function rosterIndex(rosters) {
  const index = new Map()
  rosters.forEach(r => r.players.forEach(p => {
    if (!p.id) return
    if (!index.has(p.id)) index.set(p.id, [])
    index.get(p.id).push({ team: r.team, starter: p.starter })
  }))
  return index
}
