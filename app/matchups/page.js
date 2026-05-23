'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronRight, ChevronLeft, Swords, Activity } from 'lucide-react'
import React from 'react'
import ReactMarkdown from 'react-markdown'

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

const ROSTER_CONFIG = {
  2014: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2015: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2016: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, def: 1 },
  2021: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2022: { qb: 2, rb: 3, wr: 3, te: 1, flex: 2, k: 1, def: 1 },
  2023: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
  2024: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
  2025: { qb: 2, rb: 2, wr: 2, te: 1, flex: 3, k: 1, def: 1 },
}

function getRosterPositions(seasonYear) {
  const config = ROSTER_CONFIG[Number(seasonYear)] || ROSTER_CONFIG[2025]
  const positions = []
  const add = (pos, count) => { for (let i = 0; i < count; i++) positions.push(pos) }
  add('QB', config.qb)
  add('RB', config.rb)
  add('WR', config.wr)
  add('TE', config.te)
  add('FLEX', config.flex)
  add('K', config.k)
  add('DEF', config.def)
  return positions
}

// Extrai jogadores de uma linha do GAME_FACTS_ALL
function extractPlayers(game, prefix) {
  const players = []
  for (let i = 1; i <= 13; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    const pts  = game?.[`${prefix}${i}_Pts`]
    if (name && name !== '--empty--' && name !== '') {
      players.push({ name: String(name).trim(), pts: parseNumber(pts) })
    }
  }
  return players
}

export default function MatchupsPage() {
  const [games,     setGames]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [season,    setSeason]    = useState('')
  const [week,      setWeek]      = useState('')
  const [selected,  setSelected]  = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef   = useRef(null)

  useEffect(() => {
  async function load() {
    const data = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`)
    setGames(data)

    const allSeasons = [...new Set(data.map(g => String(g?.Season || '').trim()).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))

    if (allSeasons.length > 0) {
      const latestSeason = allSeasons[allSeasons.length - 1]
      setSeason(latestSeason)

      const ws = [...new Set(
        data
          .filter(g => String(g?.Season || '').trim() === latestSeason)
          .map(g => String(g?.Week || '').trim())
          .filter(w => w !== '' && w !== '0')
      )].sort((a, b) => {
        const numA = parseFloat(a)
        const numB = parseFloat(b)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        if (!isNaN(numA)) return -1
        if (!isNaN(numB)) return 1
        return a.localeCompare(b)
      })

      if (ws.length > 0) {
        const latestWeek = ws[ws.length - 1]
        setWeek(latestWeek)

        // Seleciona o primeiro matchup automaticamente
        const seen = new Set()
        for (const g of data) {
          if (
            String(g?.Season || '').trim() === latestSeason &&
            String(g?.Week || '').trim() === latestWeek
          ) {
            const team = String(g?.Team || '').trim()
            const opp  = String(g?.Opponent || '').trim()
            const key  = [team, opp].sort().join('|')
            if (!seen.has(key)) {
              setSelected(g)
              break
            }
          }
        }
      }
    }

    setLoading(false)
  }
  load()
}, [])

  const seasons = useMemo(() => {
  return [...new Set(games.map(g => String(g?.Season || '').trim()).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b))
}, [games])

  const weeks = useMemo(() => {
  if (!season) return []
  const raw = [...new Set(
    games
      .filter(g => String(g?.Season || '').trim() === season)
      .map(g => String(g?.Week || '').trim())
      .filter(w => w !== '' && w !== '0')
  )]
  // Ordena: números simples primeiro, depois os compostos (14-15)
  return raw.sort((a, b) => {
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    if (!isNaN(numA)) return -1
    if (!isNaN(numB)) return 1
    return a.localeCompare(b)
  })
}, [games, season])

  // Matchups da semana selecionada — deduplicados (pega só um lado de cada confronto)
  const matchups = useMemo(() => {
    if (!season || !week) return []
    const filtered = games.filter(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week
    )
    // Deduplicar: pega só os jogos onde Result === 'W' ou só um lado
    const seen = new Set()
    const result = []
    filtered.forEach(g => {
      const team = String(g?.Team || '').trim()
      const opp  = String(g?.Opponent || '').trim()
      const key  = [team, opp].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        result.push(g)
      }
    })
    return result
  }, [games, season, week])

  // Jogo do outro lado do confronto selecionado (para pegar os jogadores do oponente)
  const selectedOpponentGame = useMemo(() => {
    if (!selected) return null
    const team = String(selected?.Team || '').trim()
    const opp  = String(selected?.Opponent || '').trim()
    return games.find(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      String(g?.Team || '').trim() === opp &&
      String(g?.Opponent || '').trim() === team
    ) || null
  }, [selected, games, season, week])

  const handleSeasonClick = (s) => {
    setSeason(s)
    setWeek('')
    setSelected(null)
    const ws = [...new Set(
      games
        .filter(g => String(g?.Season || '').trim() === s)
        .map(g => String(g?.Week || '').trim())
        .filter(w => w !== '' && w !== '0')
    )].sort((a, b) => {
      const numA = parseFloat(a)
      const numB = parseFloat(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      if (!isNaN(numA)) return -1
      if (!isNaN(numB)) return 1
      return a.localeCompare(b)
    })
    if (ws.length > 0) setWeek(String(ws[ws.length - 1]))
    // Seleciona o primeiro matchup da nova temporada automaticamente
    const seen = new Set()
    for (const g of games) {
      if (
        String(g?.Season || '').trim() === s &&
        String(g?.Week || '').trim() === String(ws[ws.length - 1])
      ) {
        const team = String(g?.Team || '').trim()
        const opp  = String(g?.Opponent || '').trim()
        const key  = [team, opp].sort().join('|')
        if (!seen.has(key)) {
          setSelected(g)
          break
        }
      }
    }
  }

  const handleWeekClick = (w) => {
  setWeek(String(w))
  setSelected(null)
  // Seleciona o primeiro matchup da semana automaticamente
  const seen = new Set()
  for (const g of games) {
    if (
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === String(w)
    ) {
      const team = String(g?.Team || '').trim()
      const opp  = String(g?.Opponent || '').trim()
      const key  = [team, opp].sort().join('|')
      if (!seen.has(key)) {
        setSelected(g)
        break
      }
    }
  }
}

  const teamPF  = selected ? parseNumber(selected?.PF) : 0
  const teamPA  = selected ? parseNumber(selected?.PA) : 0
  const teamWon = selected ? String(selected?.Result || '').trim().toUpperCase() === 'W' : false

  const starters = selected ? extractPlayers(selected, 'S') : []
  const bench    = selected ? extractPlayers(selected, 'B') : []
  const oppStarters = selected ? extractPlayers(selected, 'OS') : []
  const oppBench    = selected ? extractPlayers(selected, 'OB') : []

  const recap = selected
    ? String(selected?.['Recap da Partida'] || '').trim()
    : ''

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas<span className="text-cyan-400">League</span>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            const isActive = item === 'Matchups'
            return (
              <a
                key={item}
                href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >
                {item}
              </a>
            )
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)] p-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
            <Swords className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
              Game by Game
            </span>
          </div>
          <h1
            className="leading-[0.9] tracking-[-0.02em]"
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 'clamp(48px, 7vw, 96px)',
              background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Match
            <span style={{
              background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>ups</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-slate-400">
            Every game. Every score. Every moment.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <>
            {/* Seletor de temporada */}
            <div className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
              <div className="border-b border-white/5 px-6 py-4">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Season</div>
              </div>
              <div ref={seasonsRef} className="scroll-hide flex justify-center gap-2 overflow-x-auto px-6 py-4">
                {seasons.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSeasonClick(s)}
                    className={`flex-shrink-0 rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${
                      season === s
                        ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                        : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de semana */}
            {season && (
              <div className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                <div className="border-b border-white/5 px-6 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Week</div>
                </div>
                <div ref={weeksRef} className="scroll-hide flex justify-center gap-2 overflow-x-auto px-6 py-4">
                  {weeks.map(w => (
                    <button
                      key={w}
                      onClick={() => handleWeekClick(w)}
                      className={`flex-shrink-0 h-11 w-11 rounded-2xl text-sm font-black transition-all ${
                        week === String(w)
                          ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                          : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cards de matchups */}
            {week && matchups.length > 0 && (
              <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                <div className="border-b border-white/5 px-6 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                    {season} — Week {week}
                  </div>
                </div>
                <div className="scroll-hide flex justify-center gap-4 overflow-x-auto p-6">
                  {matchups.map((g, i) => {
                    const pf  = parseNumber(g?.PF)
                    const pa  = parseNumber(g?.PA)
                    const won = String(g?.Result || '').trim().toUpperCase() === 'W'
                    const isSelected = selected === g
                    const team = String(g?.Team || '').trim()
                    const opp  = String(g?.Opponent || '').trim()
                    const stage = String(g?.GameStage || g?.GameType || '').trim()

                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(isSelected ? null : g)}
                        className={`flex-shrink-0 w-56 rounded-[24px] border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-cyan-400/40 bg-cyan-400/[0.06]'
                            : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]'
                        }`}
                      >
                        {/* Stage badge */}
                        {(() => {
                          const gameType = String(g?.GameType || '').trim()
                          if (!gameType || gameType === 'Reg Season') return null
                          return (
                            <div className="mb-2 inline-block rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-300">
                              {gameType}
                            </div>
                          )
                        })()}

                        {/* Time A */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-black truncate max-w-[120px] ${won ? 'text-white' : 'text-slate-400'}`}>
                            {team}
                          </span>
                          <span className={`text-lg font-black ml-2 ${won ? 'text-cyan-300' : 'text-slate-400'}`}>
                            {pf.toFixed(2)}
                          </span>
                        </div>

                        <div className="my-1 h-px bg-white/5" />

                        {/* Time B */}
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-sm font-black truncate max-w-[120px] ${!won ? 'text-white' : 'text-slate-400'}`}>
                            {opp}
                          </span>
                          <span className={`text-lg font-black ml-2 ${!won ? 'text-cyan-300' : 'text-slate-400'}`}>
                            {pa.toFixed(2)}
                          </span>
                        </div>

                        {/* Margem */}
                        <div className="mt-3 text-[10px] font-bold text-slate-600">
                          Margin: {Math.abs(pf - pa).toFixed(2)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Detalhe do matchup selecionado */}
            {selected && (
              <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

                {/* Header do confronto */}
                <div className="border-b border-white/5 px-8 py-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300 mb-2">
                        {season} · Week {week}{selected?.GameType && selected.GameType !== 'Reg Season' ? ` · ${selected.GameType}` : ''}
                      </div>
                      <div
                        className="font-black leading-none"
                        style={{
                          fontFamily: '"Bebas Neue", sans-serif',
                          fontSize: 'clamp(28px, 5vw, 56px)',
                        }}
                      >
                        <span className={teamWon ? 'text-white' : 'text-slate-500'}>
                          {String(selected?.Team || '').trim()}
                        </span>
                        <span className="mx-3 text-cyan-400" style={{ fontSize: '0.6em' }}>vs</span>
                        <span className={!teamWon ? 'text-white' : 'text-slate-500'}>
                          {String(selected?.Opponent || '').trim()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="font-black leading-none"
                        style={{
                          fontFamily: '"Bebas Neue", sans-serif',
                          fontSize: 'clamp(32px, 5vw, 64px)',
                        }}
                      >
                        <span className={teamWon ? 'text-cyan-300' : 'text-slate-500'}>{teamPF.toFixed(2)}</span>
                        <span className="mx-2 text-slate-600 text-2xl">—</span>
                        <span className={!teamWon ? 'text-cyan-300' : 'text-slate-500'}>{teamPA.toFixed(2)}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-1">
                        Margin: {Math.abs(teamPF - teamPA).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Starters */}
                  <div className="px-8 py-6 border-b border-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300 mb-4">Starters</div>

                    {/* Header colunas */}
                    <div className="grid grid-cols-[1fr_60px_1fr] gap-2 mb-3">
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5">
                        {String(selected?.Team || '').trim()}
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5 text-center">
                        Pos
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5 text-right">
                        {String(selected?.Opponent || '').trim()}
                      </div>
                    </div>

                    {/* Jogadores */}
                    {(() => {
                      const positions = getRosterPositions(season)
                      const rows = Math.max(starters.length, oppStarters.length, positions.length)
                      return Array.from({ length: rows }).map((_, i) => {
                        const home = starters[i]
                        const away = oppStarters[i]
                        const pos  = positions[i] || ''
                        return (
                          <React.Fragment key={i}>
                            <div className="grid grid-cols-[1fr_60px_1fr] gap-2 mb-2 items-center">
                              {/* Time A — Nome → Pts */}
                              <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${home ? 'bg-white/[0.03] border border-white/5' : 'opacity-0'}`}>
                                <span className="text-sm font-bold text-white truncate max-w-[140px]">{home?.name ?? ''}</span>
                                <span className={`text-sm font-black ml-2 flex-shrink-0 ${(home?.pts ?? 0) > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>
                                  {home ? home.pts.toFixed(1) : ''}
                                </span>
                              </div>

                              {/* Posição central */}
                              <div className="flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1">
                                  {pos}
                                </span>
                              </div>

                              {/* Time B — Pts → Nome (espelhado) */}
                              <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${away ? 'bg-white/[0.03] border border-white/5' : 'opacity-0'}`}>
                                <span className={`text-sm font-black mr-2 flex-shrink-0 ${(away?.pts ?? 0) > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>
                                  {away ? away.pts.toFixed(1) : ''}
                                </span>
                                <span className="text-sm font-bold text-white truncate max-w-[140px] text-right">{away?.name ?? ''}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        )
                      })
                    })()}
                  </div>

                {/* Bench */}
                {(bench.length > 0 || oppBench.length > 0) && (
                  <div className="px-8 py-6 border-b border-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Bench</div>

                    <div className="grid grid-cols-[1fr_60px_1fr] gap-2 mb-3">
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 pb-2 border-b border-white/5">
                        {String(selected?.Team || '').trim()}
                      </div>
                      <div className="pb-2 border-b border-white/5" />
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-600 pb-2 border-b border-white/5 text-right">
                        {String(selected?.Opponent || '').trim()}
                      </div>
                    </div>

                    {Array.from({ length: Math.max(bench.length, oppBench.length) }).map((_, i) => {
                      const home = bench[i]
                      const away = oppBench[i]
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_60px_1fr] gap-2 mb-2 items-center">
                            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${home ? 'bg-white/[0.02] border border-white/[0.03]' : 'opacity-0'}`}>
                              <span className="text-sm font-bold text-slate-400 truncate max-w-[140px]">{home?.name ?? ''}</span>
                              <span className={`text-sm font-black ml-2 flex-shrink-0 ${(home?.pts ?? 0) > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                {home ? home.pts.toFixed(1) : ''}
                              </span>
                            </div>
                            <div />
                            <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${away ? 'bg-white/[0.02] border border-white/[0.03]' : 'opacity-0'}`}>
                              <span className={`text-sm font-black mr-2 flex-shrink-0 ${(away?.pts ?? 0) > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                {away ? away.pts.toFixed(1) : ''}
                              </span>
                              <span className="text-sm font-bold text-slate-400 truncate max-w-[140px] text-right">{away?.name ?? ''}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}

                {/* Recap */}
                {recap && (
                  <div className="px-8 py-6">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300 mb-4">
                      📝 Game Recap
                    </div>
                    <div className="text-slate-300 text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({children}) => <h1 className="text-2xl font-black text-white mb-4 mt-6 leading-tight">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-black text-white mb-3 mt-5 leading-tight">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-black text-white mb-2 mt-4">{children}</h3>,
                          p:  ({children}) => <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>,
                          strong: ({children}) => <strong className="text-white font-black">{children}</strong>,
                          em: ({children}) => <em className="text-cyan-300 not-italic font-bold">{children}</em>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-3 text-slate-300 space-y-1">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-3 text-slate-300 space-y-1">{children}</ol>,
                          li: ({children}) => <li className="text-slate-300">{children}</li>,
                          hr: () => <hr className="border-white/10 my-4" />,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-cyan-400 pl-4 my-3 text-slate-400 italic">{children}</blockquote>,
                        }}
                      >
                        {recap}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}

      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-30" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>

    </main>
  )
}
