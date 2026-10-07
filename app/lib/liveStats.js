import { cached, fetchJson } from './cache'
import { SLEEPER_LEAGUE_ID } from './leagueRosters'

// Pontos ao vivo e projeções por jogador, calculados com as regras de
// pontuação da liga. As estatísticas ao vivo do Sleeper (api.sleeper.com/stats)
// mudam antes dos pontos do endpoint de confrontos (20–50s antes, medido num
// jogo), então usamos elas durante os jogos.

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(p => `position[]=${p}`).join('&')

// Regras de pontuação de cada temporada da liga no Sleeper (corrente de ligas
// via previous_league_id). Temporadas de antes do Sleeper usam as regras da
// primeira temporada da liga lá.
function getScoringBySeason() {
  return cached('sleeper:scoring-by-season', 6 * 3600, async () => {
    const bySeason = {}
    let id = SLEEPER_LEAGUE_ID
    let earliest = null
    for (let i = 0; i < 15 && id && id !== '0'; i++) {
      const league = await fetchJson(`https://api.sleeper.app/v1/league/${id}`)
      if (league?.season && league?.scoring_settings) {
        bySeason[String(league.season)] = league.scoring_settings
        earliest = league.scoring_settings
      }
      id = league?.previous_league_id ? String(league.previous_league_id) : null
    }
    return { bySeason, earliest: earliest || {} }
  })
}

async function getScoring(season) {
  const { bySeason, earliest } = await getScoringBySeason()
  return bySeason[String(season)] || earliest
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
    getScoring(season),
  ])
  const map = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach(r => {
    if (r?.player_id && r?.stats) map.set(String(r.player_id), pointsOf(r.stats, scoring))
  })
  return map
}

// Pontos ao vivo da semana (guarda 15s: o arquivo de estatísticas é grande)
export function getLivePoints(season, week) {
  return cached(`sleeper:live-points:${season}:${week}`, 15, () => weekPoints('stats', season, week))
}

// Projeção da semana: muda pouco na semana atual (10 min) e nada nas antigas.
// O Sleeper tem projeções a partir de 2018.
export function getProjectedPoints(season, week, { past = false } = {}) {
  return cached(`sleeper:projections:${season}:${week}`, past ? 24 * 3600 : 600, () => weekPoints('projections', season, week))
}
