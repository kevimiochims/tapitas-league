'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TeamLogo, PositionBadge } from '../ui'
import { useScoreboard } from './useNflData'
import { WeatherIcon, weatherSummary } from './weatherUi'
import { nflLogo } from './shared'

function kickoffLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

function GameChip({ game, open, onToggle }) {
  const { away, home, state } = game
  const showScore = state !== 'pre'
  const awayWon = game.completed && away.score > home.score
  const homeWon = game.completed && home.score > away.score
  const status = state === 'pre' ? kickoffLabel(game.date) : game.detail
  const count = game.leaguePlayers?.length || 0

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-[11.5rem] flex-shrink-0 rounded-lg px-2.5 py-2 text-left transition-colors ${open ? 'bg-[#EEF3FF] ring-1 ring-[#02275F]/20' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}
    >
      <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px] font-medium">
        <span className={`truncate ${state === 'in' ? 'text-[#D01F2D]' : 'text-[#6B7280]'}`}>
          {state === 'in' && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D01F2D] align-middle" />}
          {status}
        </span>
        {game.weather && !game.completed && (
          <span className={`flex flex-shrink-0 items-center gap-0.5 ${game.weather.alert ? 'text-[#B3171F]' : 'text-[#6B7280]'}`} title={weatherSummary(game.weather)}>
            <WeatherIcon weather={game.weather} className="h-3 w-3" />
            {!game.weather.indoor && game.weather.tempC != null && <span className="tabular-nums">{Math.round(game.weather.tempC)}°</span>}
          </span>
        )}
      </div>
      {[[away, awayWon], [home, homeWon]].map(([side, won]) => (
        <div key={side.team} className="flex items-center gap-1.5 text-[13px] leading-5">
          <img src={side.logo || nflLogo(side.team)} alt="" className="h-4 w-4 flex-shrink-0 object-contain" />
          <span className={`min-w-0 flex-1 truncate ${won || !game.completed ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>
            {side.team}
            {game.possession && state === 'in' && side.team && game.possessionTeam === side.team && <span className="ml-1 text-[#B8860B]">●</span>}
          </span>
          {showScore && <span className={`tabular-nums ${won || !game.completed ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{side.score ?? '-'}</span>}
        </div>
      ))}
      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B7280]">
        {count > 0 ? <span className="font-medium text-[#02275F]">{count} Tapitas player{count > 1 ? 's' : ''}</span> : <span>No Tapitas players</span>}
        {count > 0 && <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </div>
    </button>
  )
}

function GameDetail({ game }) {
  const weather = weatherSummary(game.weather)
  return (
    <div className="border-t border-[#EEF0F2] px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B7280]">
        <span className="font-semibold text-[#111]">{game.away.name} @ {game.home.name}</span>
        {game.venue && <span>{game.venue}</span>}
        {game.broadcast && <span>{game.broadcast}</span>}
        {weather && (
          <span className={`flex items-center gap-1 ${game.weather?.alert ? 'font-medium text-[#B3171F]' : ''}`}>
            <WeatherIcon weather={game.weather} /> {weather}
          </span>
        )}
        {game.downDistance && game.state === 'in' && <span className="text-[#D01F2D]">{game.downDistance}</span>}
      </div>
      {game.leaguePlayers?.length ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {game.leaguePlayers.map(p => (
            <div key={`${p.id}-${p.fantasyTeam}`} className="flex min-w-0 items-center gap-1.5 text-[12px]">
              <PositionBadge position={p.pos} />
              <span className={`flex-shrink-0 ${p.starter ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{p.name}</span>
              <span className="text-[#9CA3AF]">{p.nflTeam}</span>
              <span className="flex min-w-0 flex-shrink items-center gap-1 text-[#6B7280]"><span className="text-[#D1D5DB]">·</span><TeamLogo name={p.fantasyTeam} size={14} /><span className="truncate">{p.fantasyTeam}</span></span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-[#6B7280]">No Tapitas players in this game.</div>
      )}
    </div>
  )
}

// Faixa com os jogos da rodada da NFL (ESPN), clima no estádio e os jogadores
// da liga em campo em cada jogo.
export default function NflScoreStrip() {
  const { data } = useScoreboard()
  const [openId, setOpenId] = useState(null)
  const games = (data?.games || []).map(g => ({
    ...g,
    possessionTeam: g.possession ? [g.home, g.away].find(s => s && String(g.possession) === String(s.espnId))?.team : null,
  }))
  if (!games.length) return null
  const open = games.find(g => g.id === openId)

  return (
    <div className="border-b border-[#E6E8EB] bg-white">
      <div className="flex items-stretch">
        <div className="flex w-[5.75rem] flex-shrink-0 flex-col items-start justify-center gap-0.5 border-r border-[#EEF0F2] py-1.5 pl-3 pr-2">
          <span className="flex items-center gap-1 text-[12px] font-bold text-[#111]">
            <img src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png" alt="" className="h-4 w-4 object-contain" /> NFL
          </span>
          <span className="text-[11px] text-[#6B7280]">{data?.week ? `Week ${data.week}` : ''}{data?.live && <span className="ml-1 font-semibold text-[#D01F2D]">LIVE</span>}</span>
        </div>
        <div className="scroll-hide flex min-w-0 flex-1 gap-1.5 overflow-x-auto p-2">
          {games.map(g => <GameChip key={g.id} game={g} open={g.id === openId} onToggle={() => setOpenId(id => (id === g.id ? null : g.id))} />)}
        </div>
      </div>
      {open && <GameDetail game={open} />}
    </div>
  )
}
