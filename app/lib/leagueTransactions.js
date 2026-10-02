import { cached, fetchJson } from './cache'
import { getLeagueRosters, SLEEPER_LEAGUE_ID } from './leagueRosters'
import { getSleeperPlayers } from './sleeper'

// Histórico de transações (trades, waivers e free agents) da liga no Sleeper.
// O Sleeper guarda uma liga por temporada, ligadas por `previous_league_id`;
// percorremos a corrente a partir da liga atual. Cada roster vira a franquia
// da planilha pelo dono (owner_id), usando a ligação já feita para a liga atual.

const API = 'https://api.sleeper.app/v1'
const WEEKS = Array.from({ length: 19 }, (_, i) => i) // 0 = pré-temporada

const teamKey = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Temporadas da liga no Sleeper, da atual para trás
function getLeagueChain() {
  return cached('sleeper:league-chain', 12 * 3600, async () => {
    const chain = []
    let id = SLEEPER_LEAGUE_ID
    for (let i = 0; i < 15 && id && id !== '0'; i++) {
      const league = await fetchJson(`${API}/league/${id}`)
      chain.push({ leagueId: String(id), season: String(league?.season || '') })
      id = league?.previous_league_id ? String(league.previous_league_id) : null
    }
    return chain
  })
}

// Dono do Sleeper → franquia da planilha (vem da ligação da temporada atual)
async function getOwnerTeams() {
  const [rosters, current] = await Promise.all([
    getLeagueRosters(),
    fetchJson(`${API}/league/${SLEEPER_LEAGUE_ID}/rosters`).catch(() => []),
  ])
  const teamByRoster = new Map(rosters.filter(r => r.rosterId != null).map(r => [Number(r.rosterId), r.team]))
  const byOwner = new Map()
  ;(Array.isArray(current) ? current : []).forEach(r => {
    const team = teamByRoster.get(Number(r?.roster_id))
    if (!team) return
    ;[r?.owner_id, ...(r?.co_owners || [])].filter(Boolean).forEach(o => byOwner.set(String(o), team))
  })
  return { byOwner, teamNames: rosters.map(r => r.team) }
}

async function getSeasonTransactions({ leagueId, season }, ownerTeams, players) {
  const [rosters, users] = await Promise.all([
    fetchJson(`${API}/league/${leagueId}/rosters`).catch(() => []),
    fetchJson(`${API}/league/${leagueId}/users`).catch(() => []),
  ])
  const usersById = new Map((Array.isArray(users) ? users : []).map(u => [String(u?.user_id), u]))

  // roster_id → franquia: pelo dono; se o dono mudou, pelo nome do time no Sleeper
  const teamOfRoster = new Map()
  ;(Array.isArray(rosters) ? rosters : []).forEach(r => {
    const owner = String(r?.owner_id || '')
    const user = usersById.get(owner) || {}
    const byName = ownerTeams.teamNames.find(t => [user?.metadata?.team_name, user?.display_name].some(n => n && teamKey(n) === teamKey(t)))
    teamOfRoster.set(Number(r?.roster_id), ownerTeams.byOwner.get(owner) || byName || user?.metadata?.team_name || user?.display_name || `Team ${r?.roster_id}`)
  })
  const teamOf = rid => teamOfRoster.get(Number(rid)) || `Team ${rid}`

  const player = id => {
    const p = players.get(String(id))
    return { id: String(id), name: p?.name || String(id), pos: p?.pos || '', nflTeam: p?.team || '' }
  }

  const weeks = await Promise.all(WEEKS.map(w => fetchJson(`${API}/league/${leagueId}/transactions/${w}`).catch(() => [])))
  return weeks.flat()
    .filter(t => t?.status === 'complete' && ['trade', 'waiver', 'free_agent'].includes(t?.type))
    .map(t => {
      const rosterIds = (t.roster_ids || []).map(Number)
      const moves = rosterIds.map(rid => ({
        team: teamOf(rid),
        adds: Object.entries(t.adds || {}).filter(([, r]) => Number(r) === rid).map(([id]) => player(id)),
        drops: Object.entries(t.drops || {}).filter(([, r]) => Number(r) === rid).map(([id]) => player(id)),
        picksIn: (t.draft_picks || []).filter(p => Number(p.owner_id) === rid).map(p => ({ season: String(p.season), round: Number(p.round), from: teamOf(p.roster_id) })),
        picksOut: (t.draft_picks || []).filter(p => Number(p.previous_owner_id) === rid).map(p => ({ season: String(p.season), round: Number(p.round), from: teamOf(p.roster_id) })),
        faabIn: (t.waiver_budget || []).filter(b => Number(b.receiver) === rid).reduce((s, b) => s + Number(b.amount || 0), 0),
      }))
      return {
        id: String(t.transaction_id),
        season,
        week: Number(t.leg) || 0,
        type: t.type,
        date: t.status_updated || t.created || null,
        bid: t.type === 'waiver' ? Number(t?.settings?.waiver_bid || 0) : null,
        teams: moves.map(m => m.team),
        moves,
      }
    })
}

export function getLeagueTransactions() {
  return cached('league:transactions', 1800, async () => {
    const [chain, ownerTeams, players] = await Promise.all([getLeagueChain(), getOwnerTeams(), getSleeperPlayers()])
    const perSeason = await Promise.all(chain.map(l => getSeasonTransactions(l, ownerTeams, players).catch(err => {
      console.error(`[transactions] ${l.season}`, err.message)
      return []
    })))
    const transactions = perSeason.flat().sort((a, b) => (b.date || 0) - (a.date || 0))
    // Data de cada draft da liga no Sleeper (para ordenar o draft junto das
    // transações no histórico do jogador)
    const draftDates = {}
    await Promise.all(chain.map(l => fetchJson(`${API}/league/${l.leagueId}/drafts`)
      .then(list => (Array.isArray(list) ? list : []).forEach(d => {
        if (d?.start_time) draftDates[String(d.season || l.season)] = Number(d.start_time)
      }))
      .catch(() => {})))
    return {
      seasons: chain.map(l => l.season),
      draftDates,
      transactions,
    }
  })
}
