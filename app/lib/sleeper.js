import { cached, fetchJson } from './cache'
import { normalizeNflTeam } from './nflTeams'
import { displayWeek, kickoffDate } from './nflCalendar'

const API = 'https://api.sleeper.app'

// Temporada e semana atuais. A semana vem do calendário do site (vira na
// quarta-feira); se o Sleeper não informar a data de início, usa a dele.
export async function getNflState() {
  const s = await cached('sleeper:state', 600, async () => {
    const raw = await fetchJson(`${API}/v1/state/nfl`)
    return {
      season: String(raw?.season || raw?.league_season || ''),
      seasonType: String(raw?.season_type || ''),
      sleeperWeek: Number(raw?.display_week || raw?.week || 0),
      seasonStartDate: raw?.season_start_date || kickoffDate(raw?.season || raw?.league_season),
    }
  })
  const week = (s.seasonStartDate && displayWeek(s.seasonStartDate)) || s.sleeperWeek
  return { ...s, week }
}

// Cópia enxuta da base (só posições de fantasy e os campos abaixo), gerada uma
// vez por dia pelo GitHub Actions (scripts/players-cache.mjs). É ~20x menor que
// a base do Sleeper: cada servidor novo da Vercel lê ela em vez dos ~15 MB.
const PLAYERS_CACHE_URL = 'https://raw.githubusercontent.com/kevimiochims/tapitas-league/data/players.json'

async function cachedPlayers() {
  const data = await fetchJson(PLAYERS_CACHE_URL, { timeoutMs: 10000 })
  // Velha demais (a automação parou): melhor buscar no Sleeper
  if (!data?.rows?.length || Date.now() - Date.parse(data.updated || 0) > 3 * 86400000) throw new Error('players cache stale')
  const at = Object.fromEntries((data.fields || []).map((f, i) => [f, i]))
  const players = new Map()
  data.rows.forEach(r => {
    const id = String(r[at.id])
    players.set(id, {
      id,
      name: r[at.name] || id,
      pos: r[at.pos] || '',
      team: normalizeNflTeam(r[at.team]),
      injuryStatus: r[at.injuryStatus] || null,
      injuryBodyPart: r[at.injuryBodyPart] || null,
      injuryNotes: r[at.injuryNotes] || null,
      injuryDate: r[at.injuryDate] || null,
      espnId: r[at.espnId] || null,
      gsisId: r[at.gsisId] || null,
      yearsExp: r[at.yearsExp] ?? null,
    })
  })
  return players
}

// Base de jogadores: a cópia enxuta e, se ela faltar, a base completa do
// Sleeper (~15 MB). Guardamos só os campos que o site usa.
export function getSleeperPlayers() {
  return cached('sleeper:players', 6 * 3600, async () => {
    try {
      return await cachedPlayers()
    } catch (err) {
      console.error('[sleeper] cópia enxuta indisponível, usando a base completa:', err.message)
    }
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
        // Data do relatório de lesão: início da lesão ou, sem ela, a última notícia do jogador
        injuryDate: p.injury_status ? (Date.parse(p.injury_start_date || '') || Number(p.news_updated) || null) : null,
        espnId: p.espn_id ? String(p.espn_id) : null,
        gsisId: p.gsis_id ? String(p.gsis_id).trim() : null,
        yearsExp: Number.isFinite(Number(p.years_exp)) ? Number(p.years_exp) : null,
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
