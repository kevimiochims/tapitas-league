'use client'

import { CardShell, TeamLogo } from '../ui'
import { useScoreboard } from './useNflData'
import { WeatherIcon, weatherLabel, weatherSummary } from './weatherUi'
import { nflLogo } from './shared'

// Clima nos jogos ao ar livre da rodada (Open-Meteo): destaca chuva, vento,
// neve e frio forte, e quantos jogadores da liga estão nesses jogos.
export default function WeatherWatchCard() {
  const { data } = useScoreboard()
  const outdoor = (data?.games || []).filter(g => g.weather && !g.weather.indoor && !g.completed)
  if (!outdoor.length) return null
  const sorted = [...outdoor].sort((a, b) => Number(b.weather.alert) - Number(a.weather.alert) || new Date(a.date) - new Date(b.date))
  const alerts = outdoor.filter(g => g.weather.alert).length

  return (
    <CardShell title="Weather watch" subtitle={`${outdoor.length} outdoor games${alerts ? ` · ${alerts} with rough weather` : ''} · forecast at kickoff`}>
      <div className="py-1">
        {sorted.map(g => {
          const starters = (g.leaguePlayers || []).filter(p => p.starter)
          const franchises = Array.from(new Set(starters.map(p => p.fantasyTeam)))
          return (
            <div key={g.id} className="flex items-center gap-2 px-3 py-2 lg:gap-3 lg:px-4">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${g.weather.alert ? 'bg-[#FDECEE] text-[#B3171F]' : 'bg-[#F4F5F7] text-[#6B7280]'}`}>
                <WeatherIcon weather={g.weather} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[13px] font-medium text-[#111]">
                  <img src={nflLogo(g.away.team)} alt="" className="h-4 w-4 object-contain" />{g.away.team}
                  <span className="text-[#9CA3AF]">@</span>
                  <img src={nflLogo(g.home.team)} alt="" className="h-4 w-4 object-contain" />{g.home.team}
                  <span className={`ml-1 text-[11px] ${g.weather.alert ? 'font-semibold text-[#B3171F]' : 'text-[#6B7280]'}`}>{weatherLabel(g.weather)}</span>
                </div>
                <div className="truncate text-[11px] text-[#6B7280]">{weatherSummary(g.weather)}</div>
              </div>
              {starters.length > 0 && (
                <div className="flex flex-shrink-0 items-center gap-1 text-[11px] text-[#6B7280]" title={starters.map(p => `${p.name} (${p.fantasyTeam})`).join(', ')}>
                  <div className="flex -space-x-1">{franchises.slice(0, 3).map(t => <TeamLogo key={t} name={t} size={18} />)}</div>
                  <span>{starters.length} starter{starters.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
