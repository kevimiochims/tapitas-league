'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TeamLogo, PositionBadge, getTeamAbbr } from '../ui'
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
          if (data?.live) timer = setTimeout(load, 60000)
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
    <button type="button" onClick={onToggle} className={`w-[8.25rem] flex-shrink-0 rounded-lg px-2 py-1.5 text-left transition-colors ${open ? 'bg-[#EEF3FF] ring-1 ring-[#02275F]/20' : 'bg-[#F4F5F7] hover:bg-[#ECEEF1]'}`}>
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
        {count > 0 ? <span className="font-medium text-[#02275F]">{count} Tapitas</span> : <span>No Tapitas</span>}
        {count > 0 && <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </div>
    </button>
  )
}

function NflDetail({ game }) {
  const weather = weatherSummary(game.weather)
  // Pontos do jogador só depois que o jogo começou
  const showPoints = game.state !== 'pre'
  // Jogadores agrupados por franquia da liga (titulares primeiro)
  const groups = new Map()
  ;(game.leaguePlayers || []).forEach(p => {
    if (!groups.has(p.fantasyTeam)) groups.set(p.fantasyTeam, [])
    groups.get(p.fantasyTeam).push(p)
  })
  const byTeam = Array.from(groups.entries())
    .map(([team, players]) => [team, [...players].sort((a, b) => Number(b.starter) - Number(a.starter) || a.name.localeCompare(b.name))])
    .sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="border-t border-[#EEF0F2] px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B7280]">
        <span className="font-semibold text-[#111]">{game.away.name} @ {game.home.name}</span>
        {game.venue && <span>{game.venue}</span>}
        {weather && <span className={`flex items-center gap-1 ${game.weather?.alert ? 'font-medium text-[#B3171F]' : ''}`}><WeatherIcon weather={game.weather} /> {weather}</span>}
        {game.downDistance && game.state === 'in' && <span className="text-[#D01F2D]">{game.downDistance}</span>}
      </div>
      {byTeam.length ? (
        <div className="flex flex-wrap gap-2">
          {byTeam.map(([team, players]) => (
            <div key={team} className="w-full rounded-lg bg-[#F7F8FA] px-2.5 py-2 sm:w-[15.5rem]">
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#111]">
                <TeamLogo name={team} size={16} />
                <span className="truncate">{team}</span>
              </div>
              <div className="space-y-0.5">
                {players.map(p => (
                  <div key={p.id} className="flex min-w-0 items-center gap-1.5 text-[12px]">
                    <PositionBadge position={p.pos} />
                    <span className={`truncate ${p.starter ? 'font-semibold text-[#111]' : 'text-[#6B7280]'}`}>{p.name}</span>
                    {!p.starter && <span className="flex-shrink-0 text-[10px] text-[#9CA3AF]">BN</span>}
                    {showPoints && p.points != null && <span className={`ml-auto flex-shrink-0 tabular-nums ${p.starter ? 'font-semibold text-[#111]' : 'text-[#9CA3AF]'}`}>{p.points.toFixed(2)}</span>}
                  </div>
                ))}
              </div>
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
  const label = m.live ? 'Live' : status === 'final' ? 'Final' : status === 'upcoming' ? 'Upcoming' : played ? 'In progress' : 'This week'
  return (
    <a href={matchupHref(season, m)} className="w-[8.75rem] flex-shrink-0 rounded-lg bg-[#F4F5F7] px-2 py-1.5 transition-colors hover:bg-[#ECEEF1]">
      <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px] font-medium">
        <span className={m.live ? 'text-[#D01F2D]' : 'text-[#6B7280]'}>
          {m.live && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D01F2D] align-middle" />}
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
      <div className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-[#02275F]">Details<ChevronRight className="h-3 w-3" /></div>
    </a>
  )
}

// Seletor de semana discreto: só o texto e uma seta leve (como os números da Home)
function WeekSelect({ week, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="group flex items-center gap-0.5 text-[12px] font-medium text-[#3F4757] hover:text-[#111]">
        {week ? `Week ${week}` : 'Week'}
        <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform group-hover:text-[#D01F2D] ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-28 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          {WEEKS.map(w => (
            <button
              key={w}
              type="button"
              onClick={() => { onChange(w); setOpen(false) }}
              className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-[#F4F5F7] ${String(week) === w ? 'font-semibold text-[#D01F2D]' : 'text-[#3F4757]'}`}
            >
              Week {w}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ logo, name, week, onWeek, live }) {
  return (
    <div className="flex w-[6.5rem] flex-shrink-0 flex-col items-start justify-center gap-1 border-r border-[#EEF0F2] py-1.5 pl-3 pr-2">
      <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#111]">
        <img src={logo} alt="" className="h-4 w-4 object-contain" />{name}
        {live && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D01F2D]" title="Live" />}
      </span>
      <WeekSelect week={week} onChange={onWeek} />
    </div>
  )
}

const chipsRow = 'scroll-hide flex min-h-[84px] min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto p-2'
const skeleton = n => Array.from({ length: n }).map((_, i) => <div key={i} className="w-[8.25rem] flex-shrink-0 animate-pulse rounded-lg bg-[#F4F5F7]" />)

// Placares do topo da Home: NFL à esquerda (3 jogos visíveis, o resto rola) e
// Tapitas League à direita, cada liga com o seu seletor de semana.
export default function ScoreStrip({ onTapitasWeek }) {
  const [nflWeek, setNflWeek] = useState(null)
  const [tapWeek, setTapWeek] = useState(null)
  const [openId, setOpenId] = useState(null)

  const nfl = useWeekData(`/api/nfl/scoreboard${nflWeek ? `?week=${nflWeek}` : ''}`)
  const tap = useWeekData(`/api/league/week${tapWeek ? `?week=${tapWeek}` : ''}`)

  const games = nfl.data?.games || []
  const matchups = tap.data?.matchups || []
  const open = games.find(g => g.id === openId)

  return (
    <div className="relative z-20 border-b border-[#E6E8EB] bg-white">
      <div className="flex flex-col lg:flex-row">
        <div className="flex min-w-0 border-b border-[#EEF0F2] lg:w-[calc(41.625rem+1px)] lg:flex-none lg:border-b-0 lg:border-r">
          <SectionLabel
            logo="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png"
            name="NFL"
            week={nflWeek || nfl.data?.week}
            onWeek={w => { setNflWeek(Number(w)); setOpenId(null) }}
            live={nfl.data?.live}
          />
          <div className={chipsRow}>
            {nfl.loading && skeleton(4)}
            {!nfl.loading && !games.length && <div className="flex items-center px-2 text-[12px] text-[#6B7280]">No NFL games this week.</div>}
            {!nfl.loading && games.map(g => <NflChip key={g.id} game={g} open={g.id === openId} onToggle={() => setOpenId(id => (id === g.id ? null : g.id))} />)}
          </div>
        </div>
        <div className="flex min-w-0 flex-1">
          <SectionLabel
            logo="/images/LogoFinalBlack.png"
            name="Tapitas"
            week={tapWeek || tap.data?.week}
            onWeek={w => { setTapWeek(Number(w)); onTapitasWeek?.(Number(w)) }}
            live={tap.data?.live}
          />
          <div className={chipsRow}>
            {tap.loading && skeleton(5)}
            {!tap.loading && !matchups.length && <div className="flex items-center px-2 text-[12px] text-[#6B7280]">No Tapitas matchups this week.</div>}
            {!tap.loading && matchups.map(m => <TapitasChip key={`${m.week}-${m.teams[0].team}`} season={tap.data.season} status={tap.data.status} m={m} />)}
          </div>
        </div>
      </div>
      {open && <NflDetail game={open} />}
    </div>
  )
}
