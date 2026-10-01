// Siglas dos times da NFL. O padrão do site é o do Sleeper (WAS, LAR, JAX…);
// ESPN e nflverse usam algumas siglas diferentes.
const ALIASES = { WSH: 'WAS', LA: 'LAR', JAC: 'JAX', OAK: 'LV', SD: 'LAC', STL: 'LAR' }

export function normalizeNflTeam(abbr) {
  const up = String(abbr || '').trim().toUpperCase()
  return ALIASES[up] || up
}

export const NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
]

// Estádio de cada time (mandante): coordenadas para a previsão do tempo e tipo
// de cobertura. Retrátil conta como coberto, porque o teto costuma fechar com
// tempo ruim.
export const STADIUMS = {
  ARI: { name: 'State Farm Stadium', lat: 33.5276, lon: -112.2626, roof: 'retractable' },
  ATL: { name: 'Mercedes-Benz Stadium', lat: 33.7554, lon: -84.4008, roof: 'retractable' },
  BAL: { name: 'M&T Bank Stadium', lat: 39.2780, lon: -76.6227, roof: 'open' },
  BUF: { name: 'Highmark Stadium', lat: 42.7738, lon: -78.7870, roof: 'open' },
  CAR: { name: 'Bank of America Stadium', lat: 35.2258, lon: -80.8528, roof: 'open' },
  CHI: { name: 'Soldier Field', lat: 41.8623, lon: -87.6167, roof: 'open' },
  CIN: { name: 'Paycor Stadium', lat: 39.0955, lon: -84.5161, roof: 'open' },
  CLE: { name: 'Huntington Bank Field', lat: 41.5061, lon: -81.6995, roof: 'open' },
  DAL: { name: 'AT&T Stadium', lat: 32.7473, lon: -97.0945, roof: 'retractable' },
  DEN: { name: 'Empower Field', lat: 39.7439, lon: -105.0201, roof: 'open' },
  DET: { name: 'Ford Field', lat: 42.3400, lon: -83.0456, roof: 'dome' },
  GB: { name: 'Lambeau Field', lat: 44.5013, lon: -88.0622, roof: 'open' },
  HOU: { name: 'NRG Stadium', lat: 29.6847, lon: -95.4107, roof: 'retractable' },
  IND: { name: 'Lucas Oil Stadium', lat: 39.7601, lon: -86.1639, roof: 'retractable' },
  JAX: { name: 'EverBank Stadium', lat: 30.3239, lon: -81.6373, roof: 'open' },
  KC: { name: 'Arrowhead Stadium', lat: 39.0489, lon: -94.4839, roof: 'open' },
  LAC: { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, roof: 'dome' },
  LAR: { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, roof: 'dome' },
  LV: { name: 'Allegiant Stadium', lat: 36.0909, lon: -115.1833, roof: 'dome' },
  MIA: { name: 'Hard Rock Stadium', lat: 25.9580, lon: -80.2389, roof: 'open' },
  MIN: { name: 'U.S. Bank Stadium', lat: 44.9737, lon: -93.2581, roof: 'dome' },
  NE: { name: 'Gillette Stadium', lat: 42.0909, lon: -71.2643, roof: 'open' },
  NO: { name: 'Caesars Superdome', lat: 29.9511, lon: -90.0812, roof: 'dome' },
  NYG: { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, roof: 'open' },
  NYJ: { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, roof: 'open' },
  PHI: { name: 'Lincoln Financial Field', lat: 39.9008, lon: -75.1675, roof: 'open' },
  PIT: { name: 'Acrisure Stadium', lat: 40.4468, lon: -80.0158, roof: 'open' },
  SEA: { name: 'Lumen Field', lat: 47.5952, lon: -122.3316, roof: 'open' },
  SF: { name: "Levi's Stadium", lat: 37.4030, lon: -121.9700, roof: 'open' },
  TB: { name: 'Raymond James Stadium', lat: 27.9759, lon: -82.5033, roof: 'open' },
  TEN: { name: 'Nissan Stadium', lat: 36.1665, lon: -86.7713, roof: 'open' },
  WAS: { name: 'Northwest Stadium', lat: 38.9077, lon: -76.8645, roof: 'open' },
}
