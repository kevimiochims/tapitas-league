'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronRight, ChevronLeft, Flame, Trophy, Activity, TrendingUp, TrendingDown, Minus, Star, Zap } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

function getTierInfo(rank, total) {
  const pct = rank / total
  if (rank === 1) return { tier: 'S', color: 'from-yellow-400 to-amber-500', text: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/5', glow: 'shadow-yellow-400/20' }
  if (pct <= 0.2) return { tier: 'A', color: 'from-cyan-400 to-blue-500', text: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/5', glow: 'shadow-cyan-400/20' }
  if (pct <= 0.5) return { tier: 'B', color: 'from-emerald-400 to-teal-500', text: 'text-emerald-400', border: 'border-emerald-400/30', bg: 'bg-emerald-400/5', glow: 'shadow-emerald-400/20' }
  if (pct <= 0.75) return { tier: 'C', color: 'from-orange-400 to-red-500', text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/5', glow: 'shadow-orange-400/20' }
  return { tier: 'D', color: 'from-slate-400 to-slate-600', text: 'text-slate-400', border: 'border-slate-400/20', bg: 'bg-slate-400/5', glow: 'shadow-slate-400/10' }
}

function TrendIcon({ trend, delta }) {
  const d = parseNumber(delta)
  if (trend === '↑' || d > 0) return (
    <div className="flex items-center gap-1 text-emerald-400">
      <TrendingUp className="h-4 w-4" />
      {d !== 0 && <span className="text-xs font-black">+{Math.abs(d)}</span>}
    </div>
  )
  if (trend === '↓' || d < 0) return (
    <div className="flex items-center gap-1 text-red-400">
      <TrendingDown className="h-4 w-4" />
      {d !== 0 && <span className="text-xs font-black">-{Math.abs(d)}</span>}
    </div>
  )
  return (
    <div className="flex items-center gap-1 text-slate-500">
      <Minus className="h-4 w-4" />
    </div>
  )
}

function FormBadge({ streak }) {
  if (!streak) return null
  // Pega os últimos 5 resultados do streak (ex: W3 L1 W2 → [W,W,W,L,W,W])
  const matches = String(streak).match(/([WL])(\d+)/g) || []
  const results = []
  matches.forEach(m => {
    const letter = m[0]
    const count  = parseInt(m.slice(1)) || 1
    for (let i = 0; i < count && results.length < 5; i++) results.push(letter)
  })
  const last5 = results.slice(-5)
  return (
    <div className="flex items-center gap-1">
      {last5.map((r, i) => (
        <div key={i} className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black ${
          r === 'W' ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' : 'bg-red-400/20 text-red-400 border border-red-400/30'
        }`}>
          {r}
        </div>
      ))}
    </div>
  )
}

export default function PowerRankingsPage() {
  const [games,   setGames]   = useState([])
  const [loading, setLoading] = useState(true)
  const [season,  setSeason]  = useState('')
  const [week,    setWeek]    = useState('')
  const [expanded, setExpanded] = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef   = useRef(null)

  useEffect(() => {
    async function load() {
      const data = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`)
      setGames(data)

      const allSeasons = [...new Set(data.map(g => String(g?.Season || '').trim()).filter(Boolean))]
        .sort((a, b) => Number(b) - Number(a))

      if (allSeasons.length > 0) {
        const latest = allSeasons[0]
        setSeason(latest)
        const ws = [...new Set(
          data.filter(g => String(g?.Season || '').trim() === latest && parseNumber(g?.['Power Ranking']) > 0)
            .map(g => String(g?.Week || '').trim())
            .filter(Boolean)
        )].sort((a, b) => parseFloat(a) - parseFloat(b))
        if (ws.length > 0) setWeek(ws[ws.length - 1])
      }
      setLoading(false)
    }
    load()
  }, [])

  const seasons = useMemo(() => {
    return [...new Set(games.map(g => String(g?.Season || '').trim()).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a))
  }, [games])

  const weeks = useMemo(() => {
    if (!season) return []
    return [...new Set(
      games
        .filter(g => String(g?.Season || '').trim() === season && parseNumber(g?.['Power Ranking']) > 0)
        .map(g => String(g?.Week || '').trim())
        .filter(Boolean)
    )].sort((a, b) => parseFloat(a) - parseFloat(b))
  }, [games, season])

  const rankings = useMemo(() => {
    if (!season || !week) return []
    const filtered = games.filter(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      parseNumber(g?.['Power Ranking']) > 0
    )
    return filtered
      .map(g => ({
        team:        String(g?.Team || '').trim(),
        rank:        parseNumber(g?.['Power Ranking']),
        score:       parseNumber(g?.['Power Ranking Score']),
        delta:       parseNumber(g?.['PR Delta']),
        trend:       String(g?.Trend || '→').trim(),
        wins:        parseNumber(g?.Wins),
        losses:      parseNumber(g?.Losses),
        ovw:         parseNumber(g?.OVW),
        avgPF:       parseNumber(g?.AVG_PF),
        consistency: parseNumber(g?.Consistency),
        streak:      String(g?.Streak_Total || g?.Streak || '').trim(),
        result:      String(g?.Result || '').trim().toUpperCase(),
        opponent:    String(g?.Opponent || '').trim(),
        pf:          parseNumber(g?.PF),
        pa:          parseNumber(g?.PA),
      }))
      .sort((a, b) => a.rank - b.rank)
  }, [games, season, week])

  const total = rankings.length

  const handleSeasonClick = (s) => {
    setSeason(s)
    setWeek('')
    setExpanded(null)
    const ws = [...new Set(
      games.filter(g => String(g?.Season || '').trim() === s && parseNumber(g?.['Power Ranking']) > 0)
        .map(g => String(g?.Week || '').trim()).filter(Boolean)
    )].sort((a, b) => parseFloat(a) - parseFloat(b))
    if (ws.length > 0) setWeek(ws[ws.length - 1])
  }

  const handleWeekClick = (w) => {
    setWeek(w)
    setExpanded(null)
  }

  // Calcula o histórico semanal do ranking de um time
  const getTeamHistory = (teamName) => {
    return games
      .filter(g =>
        String(g?.Season || '').trim() === season &&
        String(g?.Team || '').trim() === teamName &&
        parseNumber(g?.['Power Ranking']) > 0
      )
      .map(g => ({
        week:  String(g?.Week || '').trim(),
        rank:  parseNumber(g?.['Power Ranking']),
        score: parseNumber(g?.['Power Ranking Score']),
      }))
      .sort((a, b) => parseFloat(a.week) - parseFloat(b.week))
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeSlideIn 0.3s ease forwards; }
        @keyframes rankGlow { 0%,100%{box-shadow:0 0 20px rgba(34,211,238,0.1)} 50%{box-shadow:0 0 40px rgba(34,211,238,0.2)} }
        .rank-1 { animation: rankGlow 3s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">Tapitas<span className="text-cyan-400">League</span></span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'Power Rankings', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : item === 'Power Rankings' ? '/power-rankings' : `/${item.toLowerCase()}`
            const isActive = item === 'Power Rankings'
            return (
              <a key={item} href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >{item}</a>
            )
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10" style={{ background: '#020617', minHeight: '300px' }}>
          <div className="absolute inset-0 overflow-hidden rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280,355,400,475,520,595,640,715,760,835].map((x, i) => (
                  <rect key={i} x={x} y="-80" width={i%2===0?55:22} height="480" fill="#22d3ee" transform={`rotate(-18 ${x+(i%2===0?27:11)} 150)`}/>
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z","M460 85 L540 200 L460 315 L380 200 Z","M540 -30 L620 85 L540 200 L460 85 Z","M620 85 L700 200 L620 315 L540 200 Z","M700 -30 L780 85 L700 200 L620 85 Z","M780 85 L860 200 L780 315 L700 200 Z","M860 -30 L940 85 L860 200 L780 85 Z","M460 200 L540 315 L460 430 L380 315 Z","M620 200 L700 315 L620 430 L540 315 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.08" fill="#22d3ee">
                {["M420 20 L440 50 L420 80 L400 50 Z","M580 20 L600 50 L580 80 L560 50 Z","M740 20 L760 50 L740 80 L720 50 Z","M500 110 L520 140 L500 170 L480 140 Z","M660 110 L680 140 L660 170 L640 140 Z","M820 110 L840 140 L820 170 L800 140 Z","M460 200 L480 230 L460 260 L440 230 Z","M700 200 L720 230 L700 260 L680 230 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinejoin="round">
                {[500,545,590,635].map((x,i)=><polyline key={i} points={`${x},0 ${x+150},150 ${x},300`}/>)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,130 770,0"/>
                <polygon points="900,300 900,170 770,300"/>
                <polygon points="280,0 370,0 280,85"/>
                <polygon points="280,300 370,300 280,215"/>
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30,52,74].map(r=><circle key={r} cx="860" cy="50" r={r}/>)}
                {[22,40,58].map(r=><circle key={r} cx="310" cy="260" r={r}/>)}
              </g>
              <g opacity="0.09" fill="#22d3ee">
                {[40,60,80,100].map(y=>[310,330,350].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="2"/>))}
                {[200,220,240,260].map(y=>[800,820,840,860].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="2"/>))}
              </g>
              <g opacity="0.05" stroke="#22d3ee" strokeWidth="0.5">
                {[75,150,225].map(y=><line key={y} x1="0" y1={y} x2="900" y2={y}/>)}
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                <polygon points="850,130 870,116 890,130 890,158 870,172 850,158"/>
                <polygon points="320,140 340,126 360,140 360,168 340,182 320,168"/>
                <polygon points="580,240 600,226 620,240 620,268 600,282 580,268"/>
              </g>
              <text x="820" y="280" fontFamily="'Bebas Neue',sans-serif" fontSize="300" fill="#22d3ee" opacity="0.025" textAnchor="middle">#1</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.15) 100%)' }} />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-8 p-10 md:p-14">
            <div className="flex-1">
              <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2">
                <Zap className="h-4 w-4 text-yellow-300" />
                <span className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">
                  Weekly Rankings
                </span>
              </div>
              <h1 className="mb-5 leading-[0.88]"
                style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(56px, 8vw, 110px)', letterSpacing: '0.02em' }}>
                <span style={{ display: 'block', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  POWER
                </span>
                <span style={{ display: 'block', background: 'linear-gradient(160deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.3))' }}>
                  RANKINGS
                </span>
              </h1>
              <p className="max-w-lg text-base font-medium leading-relaxed text-slate-400">
                Who's hot. Who's not. The definitive weekly power rankings.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <>
            {/* Seletor de temporada */}
            <div className="mb-4 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
              <div className="border-b border-white/5 px-6 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Season</div>
              </div>
              <div ref={seasonsRef} className="scroll-hide flex gap-2 overflow-x-auto px-6 py-4">
                {seasons.map(s => (
                  <button key={s} onClick={() => handleSeasonClick(s)}
                    className={`flex-shrink-0 rounded-2xl px-5 py-2 text-sm font-black transition-all ${
                      season === s
                        ? 'bg-yellow-400/10 border border-yellow-400/25 text-yellow-300'
                        : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Seletor de semana */}
            {season && (
              <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                <div className="border-b border-white/5 px-6 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Week</div>
                </div>
                <div ref={weeksRef} className="scroll-hide flex gap-2 overflow-x-auto px-6 py-4">
                  {weeks.map(w => (
                    <button key={w} onClick={() => handleWeekClick(w)}
                      className={`flex-shrink-0 h-10 w-10 rounded-2xl text-sm font-black transition-all ${
                        week === w
                          ? 'bg-yellow-400/10 border border-yellow-400/25 text-yellow-300'
                          : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >{w}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Rankings */}
            {rankings.length > 0 && (
              <div className="flex flex-col gap-3">
                {rankings.map((team, i) => {
                  const tier = getTierInfo(team.rank, total)
                  const isExpanded = expanded === team.team
                  const history = isExpanded ? getTeamHistory(team.team) : []
                  const isFirst = team.rank === 1

                  return (
                    <div
                      key={team.team}
                      className={`overflow-hidden rounded-[28px] border transition-all duration-300 fade-in ${tier.border} ${tier.bg} ${isFirst ? 'rank-1' : ''}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Card principal */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : team.team)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-4 px-6 py-5">

                          {/* Rank number */}
                          <div className="flex-shrink-0 flex flex-col items-center w-14">
                            <div className={`text-4xl font-black leading-none ${tier.text}`}
                              style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                              {team.rank}
                            </div>
                            <div className={`mt-1 text-[9px] font-black rounded-md px-1.5 py-0.5 border ${tier.border} ${tier.text} bg-black/20`}>
                              {tier.tier}
                            </div>
                          </div>

                          {/* Trend */}
                          <div className="flex-shrink-0 w-10 flex justify-center">
                            <TrendIcon trend={team.trend} delta={team.delta} />
                          </div>

                          {/* Team name + form */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xl font-black text-white" style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}>
                                {team.team}
                              </span>
                              {isFirst && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                            </div>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-bold text-slate-500">
                                {team.wins}–{team.losses}
                              </span>
                              <span className="text-slate-700">·</span>
                              <FormBadge streak={team.streak} />
                              <span className="text-slate-700">·</span>
                              <span className="text-xs font-bold text-slate-500">
                                {team.result === 'W' ? (
                                  <span className="text-emerald-400">W</span>
                                ) : (
                                  <span className="text-red-400">L</span>
                                )} vs {team.opponent} ({team.pf.toFixed(1)}–{team.pa.toFixed(1)})
                              </span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex-shrink-0 text-right hidden sm:block">
                            <div className={`text-2xl font-black ${tier.text}`}
                              style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                              {team.score.toFixed(1)}
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">score</div>
                          </div>

                          {/* Stats rápidas */}
                          <div className="flex-shrink-0 hidden md:flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-sm font-black text-white">{team.avgPF.toFixed(1)}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">avg pts</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-black text-white">{team.ovw.toFixed(1)}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">ovw</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-black text-white">{team.consistency.toFixed(1)}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">consist.</div>
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded — histórico semanal */}
                      {isExpanded && (
                        <div className="border-t border-white/5 px-6 pb-6 pt-5">
                          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
                            {[
                              ['Power Score',  team.score.toFixed(2),   tier.text],
                              ['Avg Pts',      team.avgPF.toFixed(2),   'text-white'],
                              ['OVW',          team.ovw.toFixed(2),     'text-white'],
                              ['Consistency',  team.consistency.toFixed(2), 'text-white'],
                            ].map(([label, value, color]) => (
                              <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</div>
                                <div className={`text-2xl font-black ${color}`}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Histórico do ranking na temporada */}
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Ranking history — {season}
                          </div>
                          <div className="flex items-end gap-2 overflow-x-auto scroll-hide pb-2">
                            {history.map((h, idx) => {
                              const isCurrentWeek = h.week === week
                              const maxRank = total
                              const barHeight = Math.round(((maxRank - h.rank + 1) / maxRank) * 60) + 20
                              const hTier = getTierInfo(h.rank, total)
                              return (
                                <div key={idx} className="flex flex-col items-center gap-1 flex-shrink-0">
                                  <div className={`text-[9px] font-black ${hTier.text}`}>{h.rank}</div>
                                  <div
                                    className={`w-8 rounded-t-lg transition-all ${isCurrentWeek ? `bg-gradient-to-t ${hTier.color}` : 'bg-white/10'}`}
                                    style={{ height: `${barHeight}px` }}
                                  />
                                  <div className={`text-[9px] font-bold ${isCurrentWeek ? 'text-white' : 'text-slate-600'}`}>
                                    W{h.week}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12 pt-8">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-30" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}
