import { getSheetRows } from './sheets'
import { cached } from './cache'

// Elencos atuais da liga, montados a partir da escalação mais recente de cada
// franquia na aba GAME_FACTS_ALL (preenchida toda semana pelo script do Sleeper).
// Os nomes da planilha viram IDs do Sleeper pela aba _PLAYER_CACHE.

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

export function getLeagueRosters() {
  return cached('league:rosters', 600, async () => {
    const [games, cacheRows] = await Promise.all([getSheetRows('GAME_FACTS_ALL'), getSheetRows('_PLAYER_CACHE')])
    const lookup = buildNameLookup(cacheRows)

    const season = Math.max(0, ...games.map(g => Number(g?.Season) || 0))
    const seasonGames = games.filter(g => Number(g?.Season) === season)

    // Última semana registrada de cada franquia na temporada mais recente
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
        const add = (name, starter) => {
          const id = lookup.get(normalizePlayerKey(name)) || null
          players.push({ id, sheetName: name, starter })
        }
        lineupNames(row, 'S').forEach(n => add(n, true))
        lineupNames(row, 'B').forEach(n => add(n, false))
        return { team, season, week, players }
      })
      .sort((a, b) => a.team.localeCompare(b.team))
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
