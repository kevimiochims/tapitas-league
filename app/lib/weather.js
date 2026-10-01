import { cached, fetchJson } from './cache'
import { STADIUMS } from './nflTeams'

// Previsão do tempo no estádio na hora do kickoff (Open-Meteo, gratuito, sem chave).
// Só para jogos em estádio aberto e dentro do horizonte de previsão (16 dias).

const HOURLY = 'temperature_2m,precipitation_probability,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,weather_code'

export async function getKickoffWeather(homeTeam, kickoffIso) {
  const stadium = STADIUMS[homeTeam]
  if (!stadium) return null
  if (stadium.roof !== 'open') return { indoor: true, stadium: stadium.name }

  const kickoff = new Date(kickoffIso)
  if (Number.isNaN(kickoff.getTime())) return null
  const daysAhead = (kickoff.getTime() - Date.now()) / 86400000
  if (daysAhead > 15) return null

  const day = kickoff.toISOString().slice(0, 10)
  const forecast = await cached(`weather:${homeTeam}:${day}`, 1800, () => fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${stadium.lat}&longitude=${stadium.lon}` +
    `&hourly=${HOURLY}&timezone=UTC&start_date=${day}&end_date=${day}`,
  ))

  const times = forecast?.hourly?.time || []
  if (!times.length) return null
  // Hora cheia mais próxima do kickoff (horários em UTC, formato "2026-10-04T17:00")
  let best = 0
  times.forEach((t, i) => {
    if (Math.abs(new Date(`${t}Z`) - kickoff) < Math.abs(new Date(`${times[best]}Z`) - kickoff)) best = i
  })
  const pick = key => {
    const v = forecast.hourly?.[key]?.[best]
    return typeof v === 'number' ? v : null
  }

  const w = {
    indoor: false,
    stadium: stadium.name,
    tempC: pick('temperature_2m'),
    precipProb: pick('precipitation_probability'),
    precipMm: pick('precipitation'),
    snowCm: pick('snowfall'),
    windKmh: pick('wind_speed_10m'),
    gustKmh: pick('wind_gusts_10m'),
    code: pick('weather_code'),
  }
  w.condition = describeWeather(w)
  w.alert = isWeatherAlert(w)
  return w
}

// Códigos WMO usados pelo Open-Meteo
function describeWeather(w) {
  const c = w.code
  if (w.snowCm > 0 || [71, 73, 75, 77, 85, 86].includes(c)) return 'snow'
  if ([95, 96, 99].includes(c)) return 'storm'
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (w.precipProb ?? 0) >= 50) return 'rain'
  if ([45, 48].includes(c)) return 'fog'
  if (c === 0 || c === 1) return 'clear'
  return 'cloudy'
}

// Condição que pode afetar o jogo (e a pontuação no fantasy)
function isWeatherAlert(w) {
  return (w.windKmh ?? 0) >= 25 || (w.gustKmh ?? 0) >= 45 || (w.precipProb ?? 0) >= 50 ||
    (w.snowCm ?? 0) > 0 || (w.tempC ?? 10) <= -5 || w.condition === 'storm'
}
