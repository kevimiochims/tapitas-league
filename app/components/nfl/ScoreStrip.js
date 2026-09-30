'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TeamLogo, PositionBadge, FilterPill, getTeamAbbr } from '../ui'
import { WeatherIcon, weatherSummary } from './weatherUi'
import { nflLogo } from './shared'

const WEEKS = Array.from({ length: 18 }, (_, i) => String(i + 1))

function kickoffLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} ${time}`
}

// Busca os dados da semana e, com jogos ao vivo, atualiza a cada 60s
function useWeekData(url) {
  const [state, setState] = useState({ url: null, data: null, error: null })
  useEffect(() => {
    let cancelled = false
    let timer = null
    const load = () => {
      fetch(url, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
        .then(data => {
          if (cancelled) return
          setState({ url, data, error: null })
          if (data?.live || data?.status === 'live') timer = setTimeout(load, 60000)
        })
        .catch(error => { if (!cancelled) setState(s => ({ url, data: s.url === url ? s.data : null, error })) })
    }
    load()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [url])
  const loading = state.url !== url
  return { data: loading ? null : state.data, loading, error: loading ? null : state.error }
}

// ── NFL ─────────────────────────────────────────────────────────────
function NflChip({ game, open, onToggle }) {
  const { away, home, state } = game
  const showScore = state !== 'pre'
  const awayWon = game.completed && away.score > home.score
  const homeWon = game.completed && home.score > away.score
  const status = state === 'pre' ? kickoffLabel(game.date) : game.detail
  const count = game.leaguePlayers?.length || 0
  const possessionTeam = game.possession ? [home, away].find(s => String(s.espnId) === String(game.possession))?.team : null

  return (
    <button type="button" onClick={onToggle} className={`w-[11.5rem] flex-shrink-0 rounded-lg px-2.5 py-2 text-left transition-colors ${open ? 'bg-[#EEF3FF] ring-1 ring-[#02275F]/20' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}>
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
            {state === 'in' && possessionTeam === side.team && <span className="ml-1 text-[#B8860B]">●</span>}
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

function NflDetail({ game }) {
  const weather = weatherSummary(game.weather)
  return (
    <div className="border-t border-[#EEF0F2] px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B7280]">
        <span className="font-semibold text-[#111]">{game.away.name} @ {game.home.name}</span>
        {game.venue && <span>{game.venue}</span>}
        {game.broadcast && <span>{game.broadcast}</span>}
        {weather && <span className={`flex items-center gap-1 ${game.weather?.alert ? 'font-medium text-[#B3171F]' : ''}`}><WeatherIcon weather={game.weather} /> {weather}</span>}
        {game.downDistance && game.state === 'in' && <span className="text-[#D01F2D]">{game.downDistance}</span>}
      </div>
      {game.leaguePlayers?.length ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {game.leaguePlayers.map(p => (
            <div key={`${p.id}-${p.fantasyTeam}`} className="flex min-w-0 items-center gap-1.5 text-[12px]">
              <PositionBadge position={p.pos} />
              <span className={`flex-shrink-0 ${p.starter ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{p.name}</span>
              <span className="text-[#9CA3AF]">{p.nflTeam}</span>
              <span className="flex min-w-0 items-center gap-1 text-[#6B7280]"><span className="text-[#D1D5DB]">·</span><TeamLogo name={p.fantasyTeam} size={14} /><span className="truncate">{p.fantasyTeam}</span></span>
            </div>
          ))}
        </div>
      ) : <div className="text-[12px] text-[#6B7280]">No Tapitas players in this game.</div>}
    </div>
  )
}

// ── Tapitas League ──────────────────────────────────────────────────
function matchupHref(season, m) {
  const [a, b] = m.teams
  return `/matchups?season=${encodeURIComponent(season)}&week=${encodeURIComponent(m.week)}&team=${encodeURIComponent(a.team)}&opp=${encodeURIComponent(b.team)}`
}

function TapitasChip({ season, status, m }) {
  const [a, b] = m.teams
  const played = status !== 'upcoming' && (a.score > 0 || b.score > 0)
  const final = status === 'final'
  const aWon = final && a.score > b.score
  const bWon = final && b.score > a.score
  const label = status === 'live' ? 'Live' : status === 'upcoming' ? 'Upcoming' : 'Final'
  return (
    <a href={matchupHref(season, m)} className="w-[11.5rem] flex-shrink-0 rounded-lg bg-[#F4F5F7] px-2.5 py-2 transition-colors hover:bg-[#ECEEF1]">
      <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px] font-medium">
        <span className={status === 'live' ? 'text-[#D01F2D]' : 'text-[#6B7280]'}>
          {status === 'live' && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D01F2D] align-middle" />}
          {label}
        </span>
        {m.gameType && <span className="truncate text-[#6B7280]">{m.gameType}</span>}
      </div>
      {[[a, aWon], [b, bWon]].map(([t, won]) => (
        <div key={t.team} className="flex items-center gap-1.5 text-[13px] leading-5" title={t.team}>
          <TeamLogo name={t.team} size={16} />
          <span className={`min-w-0 flex-1 truncate ${won || !final ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{getTeamAbbr(t.team)}</span>
          <span className={`tabular-nums ${won || !final ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{played ? t.score.toFixed(2) : '–'}</span>
        </div>
      ))}
      <div className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-[#02275F]">Matchup details<ChevronRight className="h-3 w-3" /></div>
    </a>
  )
}

function ModeSwitch({ mode, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-[#F1F2F4] p-0.5">
      {[['nfl', 'NFL'], ['tapitas', 'Tapitas']].map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} className={`h-6 rounded-full px-2 text-[11px] transition-colors ${mode === key ? 'bg-white font-semibold text-[#111] shadow-sm' : 'text-[#6B7280] hover:text-[#111]'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

// Faixa de placares do topo: NFL ou Tapitas League, com seletor de semana único.
export default function ScoreStrip({ onTapitasWeek }) {
  const [mode, setMode] = useState('nfl')
  const [week, setWeek] = useState(null)
  const [openId, setOpenId] = useState(null)

  const url = mode === 'nfl'
    ? `/api/nfl/scoreboard${week ? `?week=${week}` : ''}`
    : `/api/league/week${week ? `?week=${week}` : ''}`
  const { data, loading } = useWeekData(url)
  const shownWeek = week || data?.week || null

  const changeWeek = w => {
    setWeek(Number(w))
    setOpenId(null)
    if (mode === 'tapitas') onTapitasWeek?.(Number(w))
  }
  const changeMode = m => {
    setMode(m)
    setOpenId(null)
    if (!week && data?.week) setWeek(Number(data.week))
    if (m === 'tapitas' && (week || data?.week)) onTapitasWeek?.(Number(week || data.week))
  }

  const games = mode === 'nfl' ? data?.games || [] : []
  const matchups = mode === 'tapitas' ? data?.matchups || [] : []
  const open = games.find(g => g.id === openId)
  const empty = !loading && (mode === 'nfl' ? !games.length : !matchups.length)

  return (
    <div className="relative z-20 border-b border-[#E6E8EB] bg-white">
      <div className="flex items-stretch">
        <div className="flex w-[7.25rem] flex-shrink-0 flex-col items-start justify-center gap-1 border-r border-[#EEF0F2] px-2 py-1.5">
          <ModeSwitch mode={mode} onChange={changeMode} />
          <div className="flex items-center gap-1">
            <FilterPill
              value={String(shownWeek || '')}
              onChange={changeWeek}
              options={WEEKS}
              displayOption={w => `Week ${w}`}
              label="Week"
              neutral
              hideLabel
            />
            {mode === 'nfl' && data?.live && <span className="text-[10px] font-semibold text-[#D01F2D]">LIVE</span>}
          </div>
        </div>
        <div className="scroll-hide flex min-h-[92px] min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto p-2">
          {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-[11.5rem] flex-shrink-0 animate-pulse rounded-lg bg-[#F4F5F7]" />)}
          {empty && <div className="flex items-center px-2 text-[12px] text-[#6B7280]">{mode === 'nfl' ? 'No NFL games this week.' : 'No Tapitas matchups this week.'}</div>}
          {!loading && games.map(g => <NflChip key={g.id} game={g} open={g.id === openId} onToggle={() => setOpenId(id => (id === g.id ? null : g.id))} />)}
          {!loading && matchups.map(m => <TapitasChip key={`${m.week}-${m.teams[0].team}`} season={data.season} status={data.status} m={m} />)}
        </div>
      </div>
      {open && <NflDetail game={open} />}
    </div>
  )
}
