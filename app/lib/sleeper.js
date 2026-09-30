import { cached, fetchJson } from './cache'
import { normalizeNflTeam } from './nflTeams'

const API = 'https://api.sleeper.app'

// Temporada e semana atuais da NFL segundo o Sleeper.
export function getNflState() {
  return cached('sleeper:state', 600, async () => {
    const s = await fetchJson(`${API}/v1/state/nfl`)
    return {
      season: String(s?.season || s?.league_season || ''),
      seasonType: String(s?.season_type || ''),
      week: Number(s?.display_week || s?.week || 0),
    }
  })
}

// Base de jogadores do Sleeper (~15 MB). Guardamos só os campos que o site usa.
export function getSleeperPlayers() {
  return cached('sleeper:players', 6 * 3600, async () => {
    const raw = await fetchJson(`${API}/v1/players/nfl`, { timeoutMs: 45000 })
    const players = new Map()
    for (const [id, p] of Object.entries(raw || {})) {
      if (!p) continue
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
      players.set(String(id), {
        id: String(id),
        name: name || String(id),
        pos: String(p.position || (p.fantasy_positions || [])[0] || '').toUpperCase(),
        team: normalizeNflTeam(p.team),
        injuryStatus: p.injury_status || null,
        injuryBodyPart: p.injury_body_part || null,
        injuryNotes: p.injury_notes || null,
        espnId: p.espn_id ? String(p.espn_id) : null,
        gsisId: p.gsis_id ? String(p.gsis_id).trim() : null,
      })
    }
    return players
  })
}

// Calendário da temporada regular (usado para saber quem está de folga).
export function getSchedule(season) {
  return cached(`sleeper:schedule:${season}`, 12 * 3600, async () => {
    const games = await fetchJson(`${API}/schedule/nfl/regular/${encodeURIComponent(season)}`)
    return (Array.isArray(games) ? games : []).map(g => ({
      week: Number(g?.week),
      home: normalizeNflTeam(g?.home),
      away: normalizeNflTeam(g?.away),
    }))
  })
}

// Mais adicionados / mais cortados em todas as ligas do Sleeper (últimas 24h).
export function getTrending(type) {
  return cached(`sleeper:trending:${type}`, 1800, async () => {
    const rows = await fetchJson(`${API}/v1/players/nfl/trending/${type}?lookback_hours=24&limit=15`)
    return (Array.isArray(rows) ? rows : []).map(r => ({ id: String(r?.player_id || ''), count: Number(r?.count || 0) })).filter(r => r.id)
  })
}
