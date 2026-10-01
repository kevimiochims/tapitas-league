'use client'

import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind, Home } from 'lucide-react'

const ICONS = { clear: Sun, cloudy: Cloud, rain: CloudRain, snow: CloudSnow, storm: CloudLightning, fog: CloudFog }
const LABELS = { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow', storm: 'Storm', fog: 'Fog' }

export function WeatherIcon({ weather, className = 'h-3.5 w-3.5' }) {
  if (!weather) return null
  if (weather.indoor) return <Home className={className} />
  const Icon = ICONS[weather.condition] || Cloud
  return <Icon className={className} />
}

export function weatherLabel(w) {
  if (!w) return null
  if (w.indoor) return 'Indoor'
  return LABELS[w.condition] || 'Forecast'
}

// "12°C · 70% rain · 28 km/h wind"
export function weatherSummary(w) {
  if (!w || w.indoor) return w?.indoor ? 'Indoor stadium' : null
  const parts = []
  if (w.tempC != null) parts.push(`${Math.round(w.tempC)}°C`)
  if (w.snowCm > 0) parts.push(`${w.snowCm.toFixed(1)} cm snow`)
  else if (w.precipProb != null) parts.push(`${Math.round(w.precipProb)}% rain`)
  if (w.windKmh != null) parts.push(`${Math.round(w.windKmh)} km/h wind`)
  return parts.join(' · ')
}

export { Wind }
