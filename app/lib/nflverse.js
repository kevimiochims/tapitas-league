import { cached, fetchJson, fetchText } from './cache'
import { normalizeNflTeam } from './nflTeams'
import { normalizePlayerKey } from './leagueRosters'

// Estatísticas avançadas a partir da nflverse (base aberta de dados da NFL,
// publicada como CSV nos releases do GitHub) e red zone a partir do Sleeper.

const RELEASES = 'https://github.com/nflverse/nflverse-data/releases/download'

// CSV simples com suporte a campos entre aspas
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const [header = [], ...body] = rows
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

const num = v => {
  const n = Number(v)
  return v === '' || v == null || !Number.isFinite(n) ? null : n
}
const pct = v => {
  const n = num(v)
  if (n == null) return null
  return n <= 1 ? n * 100 : n // alguns arquivos usam fração (0.85), outros porcentagem (85)
}

async function firstCsv(urls) {
  let lastError = null
  for (const url of urls) {
    try { return parseCsv(await fetchText(url, { timeoutMs: 45000 })) } catch (err) { lastError = err }
  }
  throw lastError
}

// Estatísticas semanais por jogador, indexadas pelo gsis_id (o Sleeper informa esse ID)
function getWeeklyStatsIndex(season) {
  return cached(`nflverse:stats:${season}`, 6 * 3600, async () => {
    const rows = await firstCsv([
      `${RELEASES}/stats_player/stats_player_week_${season}.csv`,
      `${RELEASES}/player_stats/player_stats_${season}.csv`,
    ])
    const index = new Map()
    rows.forEach(r => {
      const id = String(r.player_id || '').trim()
      if (!id) return
      if (!index.has(id)) index.set(id, [])
      index.get(id).push({
        week: num(r.week),
        seasonType: r.season_type || 'REG',
        team: normalizeNflTeam(r.team || r.recent_team),
        opponent: normalizeNflTeam(r.opponent_team),
        targets: num(r.targets),
        receptions: num(r.receptions),
        carries: num(r.carries),
        targetShare: pct(r.target_share),
        airYardsShare: pct(r.air_yards_share),
        wopr: num(r.wopr),
      })
    })
    return index
  })
}

// Snaps por jogador. O arquivo não tem gsis_id, então o índice é nome + time.
function getSnapIndex(season) {
  return cached(`nflverse:snaps:${season}`, 6 * 3600, async () => {
    const rows = await firstCsv([`${RELEASES}/snap_counts/snap_counts_${season}.csv`])
    const index = new Map()
    rows.forEach(r => {
      const key = `${normalizePlayerKey(r.player)}|${normalizeNflTeam(r.team)}`
      if (!index.has(key)) index.set(key, [])
      index.get(key).push({
        week: num(r.week),
        seasonType: r.game_type || 'REG',
        snaps: num(r.offense_snaps),
        snapPct: pct(r.offense_pct),
      })
    })
    return index
  })
}

// Jogadas na red zone por semana, do endpoint de estatísticas do Sleeper
function getRedZone(sleeperId, season) {
  return cached(`sleeper:rz:${sleeperId}:${season}`, 3 * 3600, async () => {
    const data = await fetchJson(`https://api.sleeper.com/stats/nfl/player/${encodeURIComponent(sleeperId)}?season=${encodeURIComponent(season)}&season_type=regular&grouping=week`)
    const rows = Array.isArray(data) ? data : Object.values(data || {})
    const byWeek = new Map()
    rows.forEach(row => {
      if (!row) return
      const s = row.stats || row
      const week = num(row.week)
      if (week == null) return
      const targets = num(s.rec_rz_tgt)
      const carries = num(s.rush_rz_att)
      const passes = num(s.pass_rz_att)
      if (targets == null && carries == null && passes == null) return
      byWeek.set(week, { rzTargets: targets, rzCarries: carries, rzPasses: passes })
    })
    return byWeek
  })
}

const avg = values => {
  const list = values.filter(v => v != null)
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null
}
const sum = values => {
  const list = values.filter(v => v != null)
  return list.length ? list.reduce((a, b) => a + b, 0) : null
}

export async function getAdvancedStats({ sleeperId, gsisId, name, team, season }) {
  const [statsIndex, snapIndex, redZone] = await Promise.all([
    getWeeklyStatsIndex(season).catch(err => { console.error('[nflverse] stats', err.message); return null }),
    getSnapIndex(season).catch(err => { console.error('[nflverse] snaps', err.message); return null }),
    sleeperId ? getRedZone(sleeperId, season).catch(() => null) : null,
  ])

  const statRows = (gsisId && statsIndex?.get(gsisId)) || []
  // Snaps: procura pelo nome em qualquer time em que o jogador atuou na temporada
  const teams = new Set([normalizeNflTeam(team), ...statRows.map(r => r.team)].filter(Boolean))
  const snapRows = Array.from(teams).flatMap(t => snapIndex?.get(`${normalizePlayerKey(name)}|${t}`) || [])

  const weeks = new Map()
  const at = (week, seasonType = 'REG') => {
    const key = `${seasonType}|${week}`
    if (!weeks.has(key)) weeks.set(key, { week, seasonType })
    return weeks.get(key)
  }
  statRows.forEach(r => Object.assign(at(r.week, r.seasonType), r))
  snapRows.forEach(r => Object.assign(at(r.week, r.seasonType), { snaps: r.snaps, snapPct: r.snapPct }))
  redZone?.forEach((rz, week) => Object.assign(at(week, 'REG'), rz))

  const list = Array.from(weeks.values())
    .filter(w => w.week != null)
    .sort((a, b) => (a.seasonType === b.seasonType ? 0 : a.seasonType === 'REG' ? -1 : 1) || a.week - b.week)

  return {
    season,
    weeks: list,
    summary: {
      games: list.length,
      snapPct: avg(list.map(w => w.snapPct)),
      targetShare: avg(list.map(w => w.targetShare)),
      airYardsShare: avg(list.map(w => w.airYardsShare)),
      targets: sum(list.map(w => w.targets)),
      rzTargets: sum(list.map(w => w.rzTargets)),
      rzCarries: sum(list.map(w => w.rzCarries)),
      rzPasses: sum(list.map(w => w.rzPasses)),
    },
    sources: { nflverseStats: Boolean(statsIndex), nflverseSnaps: Boolean(snapIndex), sleeperRedZone: Boolean(redZone?.size) },
  }
}
