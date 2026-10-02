import { cached, fetchJson } from './cache'
import { SLEEPER_LEAGUE_ID } from './leagueRosters'

// Pontos ao vivo e projeções por jogador, calculados com as regras de
// pontuação da liga. As estatísticas ao vivo do Sleeper (api.sleeper.com/stats)
// mudam antes dos pontos do endpoint de confrontos (20–50s antes, medido num
// jogo), então usamos elas durante os jogos.

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(p => `position[]=${p}`).join('&')

function getScoring() {
  return cached('sleeper:scoring', 3600, async () => {
    const league = await fetchJson(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}`)
    return league?.scoring_settings || {}
  })
}

const pointsOf = (stats, scoring) => {
  let total = 0
  for (const [key, value] of Object.entries(stats || {})) {
    const weight = scoring[key]
    if (weight && typeof value === 'number') total += value * weight
  }
  return Math.round(total * 100) / 100
}

async function weekPoints(kind, season, week) {
  const [rows, scoring] = await Promise.all([
    fetchJson(`https://api.sleeper.com/${kind}/nfl/${season}/${week}?season_type=regular&${POSITIONS}`, { timeoutMs: 10000 }),
    getScoring(),
  ])
  const map = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach(r => {
    if (r?.player_id && r?.stats) map.set(String(r.player_id), pointsOf(r.stats, scoring))
  })
  return map
}

// Pontos ao vivo da semana (guarda só 5s)
export function getLivePoints(season, week) {
  return cached(`sleeper:live-points:${season}:${week}`, 5, () => weekPoints('stats', season, week))
}

// Projeção da semana (muda pouco: guarda 10 min)
export function getProjectedPoints(season, week) {
  return cached(`sleeper:projections:${season}:${week}`, 600, () => weekPoints('projections', season, week))
}
