'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Swords, Flame, Trophy, Target, Activity, ChevronRight, Radar, Stars } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeString(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

function getRivalryHeat(games, aWins, bWins, avgMargin) {
  const totalGames = parseNumber(games)
  const winsA = parseNumber(aWins)
  const winsB = parseNumber(bWins)
  const recordGap = Math.abs(winsA - winsB)
  const margin = Math.abs(parseFloat(String(avgMargin).replace(',', '.')) || 0)
  let score = 0
  if (recordGap === 0) score += 7
  else if (recordGap === 1) score += 5
  else if (recordGap === 2) score += 3
  else if (recordGap === 3) score += 1
  else score -= 3
  if (totalGames >= 14) score += 5
  else if (totalGames >= 10) score += 4
  else if (totalGames >= 6) score += 2
  if (margin <= 3) score += 5
  else if (margin <= 7) score += 3
  else if (margin <= 12) score += 1
  if (score >= 13) return { label: 'Legendary', color: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' }
  if (score >= 10) return { label: 'Elite',     color: 'text-orange-400 border-orange-400/20 bg-orange-400/10' }
  if (score >= 7)  return { label: 'High',      color: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10' }
  if (score >= 4)  return { label: 'Medium',    color: 'text-slate-300 border-slate-300/20 bg-slate-300/10' }
  return { label: 'Low', color: 'text-slate-500 border-slate-500/20 bg-slate-500/10' }
}

function Select({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all w-full ${
          disabled ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
          : open ? 'border-cyan-400/40 bg-white/[0.07] text-white'
          : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
        }`}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>{value || placeholder}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1525] shadow-2xl">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt || '__empty__'}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition-all hover:bg-white/[0.06] ${opt === value ? 'text-cyan-300' : 'text-slate-300'}`}
              >
                {opt === value && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />}
                <span className={opt === value ? '' : 'ml-[14px]'}>{opt || 'All teams'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RivalriesPage() {
  const [h2hData,    setH2hData]    = useState([])
  const [gamesData,  setGamesData]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filterTeamA, setFilterTeamA] = useState('')
  const [filterTeamB, setFilterTeamB] = useState('')
  const [selected,   setSelected]   = useState(null)
  const [sortBy,     setSortBy]     = useState('heat')

  useEffect(() => {
    async function load() {
      const [h2h, games] = await Promise.all([
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])
      setH2hData(h2h)
      setGamesData(games)
      setLoading(false)
    }
    load()
  }, [])

  const allTeams = useMemo(() => {
    const teams = new Set()
    h2hData.forEach(r => {
      if (r?.['Team A']) teams.add(String(r['Team A']).trim())
      if (r?.['Team B']) teams.add(String(r['Team B']).trim())
    })
    return Array.from(teams).sort()
  }, [h2hData])

  // Times disponíveis para o segundo filtro
  const teamsForB = useMemo(() => {
    if (!filterTeamA) return allTeams
    const rivals = new Set()
    h2hData.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      if (normalizeString(a) === normalizeString(filterTeamA)) rivals.add(b)
      if (normalizeString(b) === normalizeString(filterTeamA)) rivals.add(a)
    })
    return Array.from(rivals).sort()
  }, [h2hData, filterTeamA, allTeams])

  const rivalries = useMemo(() => {
    const seen = new Set()
    const result = []
    h2hData.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      if (!a || !b) return
      const key = [normalizeString(a), normalizeString(b)].sort().join('|')
      if (seen.has(key)) return
      seen.add(key)

      const heat = getRivalryHeat(r?.Games, r?.['A Wins'], r?.['B Wins'], r?.['Avg Margin'])
      const heatScore = heat.label === 'Legendary' ? 5 : heat.label === 'Elite' ? 4 : heat.label === 'High' ? 3 : heat.label === 'Medium' ? 2 : 1

      result.push({
        teamA: a, teamB: b,
        games:       parseNumber(r?.Games),
        aWins:       parseNumber(r?.['A Wins']),
        bWins:       parseNumber(r?.['B Wins']),
        pfA:         parseNumber(r?.['PF A']),
        pfB:         parseNumber(r?.['PF B']),
        avgMargin:   String(r?.['Avg Margin'] || '0'),
        aRsW:        parseNumber(r?.['A RS_W']),
        bRsW:        parseNumber(r?.['B RS_W']),
        aPoW:        parseNumber(r?.['A PO_W']),
        bPoW:        parseNumber(r?.['B PO_W']),
        streak:      String(r?.['Current Streak'] || '—'),
        bestStreakA:  String(r?.['Best Streak Team A'] || '—'),
        bestStreakB:  String(r?.['Best Streak Team B'] || '—'),
        lastMatch:   String(r?.['Last Match'] || ''),
        biggestWinA: String(r?.['Biggest Win Team A'] || '—'),
        biggestWinB: String(r?.['Biggest Win Team B'] || '—'),
        heat, heatScore,
      })
    })

    const filtered = result.filter(r => {
      const matchA = !filterTeamA || normalizeString(r.teamA) === normalizeString(filterTeamA) || normalizeString(r.teamB) === normalizeString(filterTeamA)
      const matchB = !filterTeamB || normalizeString(r.teamA) === normalizeString(filterTeamB) || normalizeString(r.teamB) === normalizeString(filterTeamB)
      return matchA && matchB
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'heat')  return b.heatScore - a.heatScore
      if (sortBy === 'games') return b.games - a.games
      if (sortBy === 'close') return Math.abs(a.aWins - a.bWins) - Math.abs(b.aWins - b.bWins)
      return 0
    })
  }, [h2hData, filterTeamA, filterTeamB, sortBy])

  const matchHistory = useMemo(() => {
    if (!selected) return []
    const seen = new Set()
    return gamesData
      .filter(g => {
        const team = normalizeString(g?.Team || '')
        const opp  = normalizeString(g?.Opponent || '')
        const a    = normalizeString(selected.teamA)
        const b    = normalizeString(selected.teamB)
        return (team === a && opp === b) || (team === b && opp === a)
      })
      .filter(g => {
        const key = [String(g?.Season||'').trim(), String(g?.Week||'').trim(), normalizeString(g?.Team||''), normalizeString(g?.Opponent||'')].sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(g => ({
        season:   String(g?.Season || '').trim(),
        week:     String(g?.Week || '').trim(),
        team:     String(g?.Team || '').trim(),
        opponent: String(g?.Opponent || '').trim(),
        pf:       parseNumber(g?.PF || 0),
        pa:       parseNumber(g?.PA || 0),
        result:   String(g?.Result || '').trim().toUpperCase(),
        stage:    String(g?.GameType || g?.GameStage || '').trim(),
      }))
      .sort((a, b) => {
        if (a.season !== b.season) return Number(a.season) - Number(b.season)
        return parseFloat(a.week) - parseFloat(b.week)
      })
  }, [selected, gamesData])

  // Stats agregadas para cada time no confronto
  const teamAWins = selected ? matchHistory.filter(g => {
    const won = g.result === 'W'
    return (normalizeString(g.team) === normalizeString(selected.teamA) && won) ||
           (normalizeString(g.opponent) === normalizeString(selected.teamA) && !won)
  }).length : 0

  const teamBWins = selected ? matchHistory.length - teamAWins : 0

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">Tapitas<span className="text-cyan-400">League</span></span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            const isActive = item === 'Rivalries'
            return (
              <a key={item} href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >{item}</a>
            )
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero com padrão geométrico */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10" style={{ background: '#020617', minHeight: '280px' }}>
          <div className="absolute inset-0 overflow-hidden rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280,355,400,475,520,595,640,715,760,835].map((x, i) => (
                  <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="450" fill="#22d3ee" transform={`rotate(-18 ${x + (i%2===0?27:11)} 140)`} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z","M460 85 L540 200 L460 315 L380 200 Z","M540 -30 L620 85 L540 200 L460 85 Z","M620 85 L700 200 L620 315 L540 200 Z","M700 -30 L780 85 L700 200 L620 85 Z","M780 85 L860 200 L780 315 L700 200 Z","M860 -30 L940 85 L860 200 L780 85 Z"].map((d,i) => <path key={i} d={d}/>)}
              </g>
              <g opacity="0.08" fill="#22d3ee">
                {["M420 30 L440 58 L420 86 L400 58 Z","M580 30 L600 58 L580 86 L560 58 Z","M740 30 L760 58 L740 86 L720 58 Z","M500 120 L520 148 L500 176 L480 148 Z","M660 120 L680 148 L660 176 L640 148 Z","M820 120 L840 148 L820 176 L800 148 Z"].map((d,i) => <path key={i} d={d}/>)}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                {[500,540,580,620].map((x,i) => <polyline key={i} points={`${x},0 ${x+140},140 ${x},280`}/>)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,120 780,0"/>
                <polygon points="900,280 900,160 780,280"/>
                <polygon points="280,0 360,0 280,80"/>
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[25,45,65].map(r => <circle key={r} cx="860" cy="50" r={r}/>)}
              </g>
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[70,140,210].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y}/>)}
              </g>
              <text x="820" y="260" fontFamily="'Bebas Neue',sans-serif" fontSize="280" fill="#22d3ee" opacity="0.025" textAnchor="middle">H2H</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.9) 48%, rgba(2,6,23,0.15) 100%)' }} />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-8 p-10 md:p-14">
            <div className="flex-1">
              <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
                <Swords className="h-4 w-4 text-cyan-300" />
                <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Head to Head</span>
              </div>
              <h1 className="mb-4 leading-[0.88]"
                style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(56px, 8vw, 96px)', letterSpacing: '0.02em' }}>
                <span style={{ display: 'block', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  ALL
                </span>
                <span style={{ display: 'block', background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  RIVALRIES
                </span>
              </h1>
              <p className="max-w-lg text-base font-medium leading-relaxed text-slate-400">
                Every matchup. Every grudge. Every chapter of the league's fiercest battles.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">

            {/* Coluna esquerda */}
            <div className="w-full xl:w-[420px] flex-shrink-0">
              <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

                <div className="border-b border-white/5 p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex-shrink-0">
                      <Swords className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Rivalries</div>
                      <div className="text-base text-slate-400">{rivalries.length} matchups</div>
                    </div>
                  </div>

                  {/* Filtro time A */}
                  <Select
                    value={filterTeamA}
                    onChange={(val) => { setFilterTeamA(val); setFilterTeamB('') }}
                    options={['', ...allTeams]}
                    placeholder="Filter by team..."
                  />

                  {/* Filtro time B */}
                  <Select
                    value={filterTeamB}
                    onChange={setFilterTeamB}
                    options={['', ...teamsForB]}
                    placeholder="vs opponent..."
                    disabled={!filterTeamA}
                  />

                  <div className="flex gap-2">
                    {[
                      { key: 'heat',  label: '🔥 Heat' },
                      { key: 'games', label: '📊 Games' },
                      { key: 'close', label: '⚔️ Closest' },
                    ].map(s => (
                      <button key={s.key} onClick={() => setSortBy(s.key)}
                        className={`flex-1 rounded-2xl px-3 py-2 text-xs font-black transition-all ${
                          sortBy === s.key
                            ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                            : 'border border-white/5 bg-white/[0.03] text-slate-500 hover:text-slate-300'
                        }`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {rivalries.map((r, i) => {
                    const isSelected = selected === r
                    const leader = r.aWins > r.bWins ? r.teamA : r.bWins > r.aWins ? r.teamB : null
                    return (
                      <button key={i} onClick={() => setSelected(isSelected ? null : r)}
                        className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all border-b border-white/[0.03] last:border-0 ${
                          isSelected ? 'bg-cyan-400/[0.05]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className={`flex-shrink-0 rounded-xl border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${r.heat.color}`}>
                          {r.heat.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-white truncate">
                            {r.teamA} <span className="text-cyan-400 mx-1">vs</span> {r.teamB}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {r.aWins}–{r.bWins} · {r.games} games
                            {leader ? ` · ${leader.split(' ')[0]} leads` : ' · Tied'}
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Coluna direita */}
            {selected ? (
              <div className="flex-1 flex flex-col gap-6">

                {/* Header do confronto */}
                <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                  <div className="border-b border-white/5 px-8 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h2 className="font-black leading-tight"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(22px, 4vw, 44px)' }}>
                        {selected.teamA}
                        <span className="mx-3 text-cyan-400" style={{ fontSize: '0.6em' }}>vs</span>
                        {selected.teamB}
                      </h2>
                      <div className={`rounded-2xl border px-4 py-1.5 text-sm font-black uppercase tracking-widest ${selected.heat.color}`}>
                        {selected.heat.label} Rivalry
                      </div>
                    </div>
                  </div>

                  {/* Stats com cards coloridos estilo History */}
                  <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">

                    {/* Overall Record — cyan */}
                    <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Target className="h-4 w-4 text-cyan-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Overall Record</span>
                      </div>
                      <div className="text-4xl font-black text-white">{selected.aWins}–{selected.bWins}</div>
                      <div className="mt-3 text-lg font-black text-cyan-300">
                        {selected.aWins > selected.bWins ? selected.teamA : selected.bWins > selected.aWins ? selected.teamB : 'Tied'}
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-400">{selected.games} total games</div>
                    </div>

                    {/* Avg Margin — emerald */}
                    <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Avg Margin</span>
                      </div>
                      <div className="text-4xl font-black text-white">{selected.avgMargin}</div>
                      <div className="mt-3 text-lg font-black text-emerald-300">points per game</div>
                      <div className="mt-2 text-sm font-bold text-slate-400">average difference</div>
                    </div>

                    {/* Playoff Record — purple */}
                    <div className="rounded-3xl border border-purple-400/15 bg-purple-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-purple-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300">Playoff Record</span>
                      </div>
                      <div className="text-4xl font-black text-white">{selected.aPoW}–{selected.bPoW}</div>
                      <div className="mt-3 text-lg font-black text-purple-300">
                        {selected.aPoW > selected.bPoW ? selected.teamA.split(' ')[0] : selected.bPoW > selected.aPoW ? selected.teamB.split(' ')[0] : 'Tied'}
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-400">in playoff matchups</div>
                    </div>

                    {/* RS Record — blue */}
                    <div className="rounded-3xl border border-blue-400/15 bg-blue-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Radar className="h-4 w-4 text-blue-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Reg Season</span>
                      </div>
                      <div className="text-4xl font-black text-white">{selected.aRsW}–{selected.bRsW}</div>
                      <div className="mt-3 text-lg font-black text-blue-300">
                        {selected.aRsW > selected.bRsW ? selected.teamA.split(' ')[0] : selected.bRsW > selected.aRsW ? selected.teamB.split(' ')[0] : 'Tied'}
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-400">regular season only</div>
                    </div>

                    {/* Current Streak — orange */}
                    <div className="rounded-3xl border border-orange-400/15 bg-orange-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-300">Current Streak</span>
                      </div>
                      <div className="text-4xl font-black text-white">{selected.streak}</div>
                      <div className="mt-3 text-lg font-black text-orange-300">active streak</div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Best A</div>
                          <div className="text-sm font-black text-white">{selected.bestStreakA}</div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-1.5">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Best B</div>
                          <div className="text-sm font-black text-white">{selected.bestStreakB}</div>
                        </div>
                      </div>
                    </div>

                    {/* Biggest Wins — yellow */}
                    <div className="rounded-3xl border border-yellow-400/15 bg-yellow-400/5 p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Stars className="h-4 w-4 text-yellow-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Biggest Wins</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selected.teamA.split(' ')[0]}</div>
                          <div className="text-sm font-black text-white">{selected.biggestWinA}</div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selected.teamB.split(' ')[0]}</div>
                          <div className="text-sm font-black text-white">{selected.biggestWinB}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Game History */}
                <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                  <div className="border-b border-white/5 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                        <Activity className="h-5 w-5 text-cyan-300" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Game History</div>
                        <div className="text-base text-slate-400">{matchHistory.length} games played</div>
                      </div>
                    </div>
                    {/* Mini record */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">{selected.teamA.split(' ')[0]}</div>
                        <div className="text-2xl font-black text-cyan-300">{teamAWins}</div>
                      </div>
                      <div className="text-slate-600 font-black text-xl">—</div>
                      <div className="text-left">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-500">{selected.teamB.split(' ')[0]}</div>
                        <div className="text-2xl font-black text-cyan-300">{teamBWins}</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Season</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Week</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Type</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Winner</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Score</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((g, i) => {
                          const won = g.result === 'W'
                          const winner = won ? g.team : g.opponent
                          const loser  = won ? g.opponent : g.team
                          const winnerScore = won ? g.pf : g.pa
                          const loserScore  = won ? g.pa : g.pf
                          const margin = Math.abs(g.pf - g.pa)
                          const isPlayoff = g.stage && g.stage !== 'Reg Season'

                          // Cor da linha baseada em qual time venceu
                          const winnerIsA = normalizeString(winner) === normalizeString(selected.teamA)
                          const rowBg = winnerIsA ? 'hover:bg-cyan-400/[0.03]' : 'hover:bg-purple-400/[0.03]'
                          const winnerColor = winnerIsA ? 'text-cyan-300' : 'text-purple-300'
                          const markerColor = winnerIsA ? 'bg-cyan-400' : 'bg-purple-400'

                          return (
                            <tr key={i} className={`border-b border-white/[0.03] transition-colors ${rowBg}`}>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${markerColor} opacity-60`} />
                                  <span className="text-sm font-black text-white">{g.season}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-400">W{g.week}</td>
                              <td className="px-4 py-3">
                                {isPlayoff ? (
                                  <span className="text-[9px] font-black uppercase tracking-widest rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-cyan-300">
                                    {g.stage}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-600">Reg</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-black ${winnerColor}`}>{winner}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-bold ${winnerColor}`}>{winnerScore.toFixed(2)}</span>
                                <span className="text-slate-600 mx-1">–</span>
                                <span className="text-sm font-bold text-slate-500">{loserScore.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-slate-500">{margin.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-[38px] border border-white/5 bg-white/[0.02] py-20">
                <div className="text-center">
                  <Swords className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-600 font-bold">Select a rivalry to see the full history</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-30" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}