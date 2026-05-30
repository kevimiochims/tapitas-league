'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import { ChevronRight, ChevronLeft, Swords, Activity } from 'lucide-react'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import Header from '../components/Header'

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

function getPosColor(pos) {
  const colors = {
    'QB': 'text-red-400 border-red-400/20 bg-red-400/10',
    'RB': 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
    'WR': 'text-blue-400 border-blue-400/20 bg-blue-400/10',
    'TE': 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10',
    'FLEX': 'text-pink-400 border-pink-400/20 bg-pink-400/10',
    'K': 'text-purple-400 border-purple-400/20 bg-purple-400/10',
    'DEF': 'text-orange-400 border-orange-400/20 bg-orange-400/10',
  }
  return colors[pos] ?? 'text-slate-500 border-white/10 bg-white/[0.04]'
}

// Extrai jogadores de uma linha do GAME_FACTS_ALL
function extractPlayers(game, prefix) {
  const players = []
  for (let i = 1; i <= 13; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    const pts = game?.[`${prefix}${i}_Pts`]
    if (name && name !== '--empty--' && name !== '') {
      players.push({ name: String(name).trim(), pts: parseNumber(pts) })
    }
  }
  return players
}

export default function MatchupsPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')
  const [selected, setSelected] = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef = useRef(null)
  const activeSeasonRef = useRef(null)
  const activeWeekRef = useRef(null)
  const activeGameRef = useRef(null)


  // Efeito para rolar até a Semana Ativa
  useEffect(() => {
    if (week && activeWeekRef.current) {
      const timer = setTimeout(() => {
        activeWeekRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [week]); // Roda sempre que a semana mudar

  // Efeito para rolar até o Jogo Ativo (Matchup)
  useEffect(() => {
    // Ajuste o termo "selected" se a sua variável de estado do jogo ativo tiver outro nome
    if (selected && activeGameRef.current) {
      const timer = setTimeout(() => {
        activeGameRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 120); // 120ms para dar uma leve fração de tempo a mais pro layout assíncrono se ajustar
      return () => clearTimeout(timer);
    }
  }, [selected]); // Roda sempre que o jogo selecionado mudar


  // Deixe este efeito SEPARADO do seu useEffect de load
  useEffect(() => {
    if (season && activeSeasonRef.current) {
      const timer = setTimeout(() => {
        activeSeasonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [season]);

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
              const opp = String(g?.Opponent || '').trim()
              const key = [team, opp].sort().join('|')
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
      const opp = String(g?.Opponent || '').trim()
      const key = [team, opp].sort().join('|')
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
    const opp = String(selected?.Opponent || '').trim()
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
        const opp = String(g?.Opponent || '').trim()
        const key = [team, opp].sort().join('|')
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
        const opp = String(g?.Opponent || '').trim()
        const key = [team, opp].sort().join('|')
        if (!seen.has(key)) {
          setSelected(g)
          break
        }
      }
    }
  }

  const teamPF = selected ? parseNumber(selected?.PF) : 0
  const teamPA = selected ? parseNumber(selected?.PA) : 0
  const teamWon = selected ? String(selected?.Result || '').trim().toUpperCase() === 'W' : false

  const starters = selected ? extractPlayers(selected, 'S') : []
  const bench = selected ? extractPlayers(selected, 'B') : []
  const oppStarters = selected ? extractPlayers(selected, 'OS') : []
  const oppBench = selected ? extractPlayers(selected, 'OB') : []

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
      <Header />

      <section className="px-3 md:px-6 mx-auto">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">

          {/* Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-[38px]">

            <svg
              className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 900 340"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >

              {/* Listras diagonais */}
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y="-80"
                    width={i % 2 === 0 ? 55 : 22}
                    height="520"
                    fill="#22d3ee"
                    transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                  />
                ))}
              </g>

              {/* Losangos */}
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[
                  "M380 -30 L460 85 L380 200 L300 85 Z",
                  "M460 85 L540 200 L460 315 L380 200 Z",
                  "M540 -30 L620 85 L540 200 L460 85 Z",
                  "M620 85 L700 200 L620 315 L540 200 Z",
                  "M700 -30 L780 85 L700 200 L620 85 Z",
                  "M780 85 L860 200 L780 315 L700 200 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Losangos preenchidos */}
              <g opacity="0.08" fill="#22d3ee">
                {[
                  "M420 30 L440 58 L420 86 L400 58 Z",
                  "M500 120 L520 148 L500 176 L480 148 Z",
                  "M580 30 L600 58 L580 86 L560 58 Z",
                  "M660 120 L680 148 L660 176 L640 148 Z",
                  "M740 30 L760 58 L740 86 L720 58 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Chevrons */}
              <g
                opacity="0.07"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                {[520, 600, 680].map((x, i) => (
                  <polyline
                    key={i}
                    points={`${x},0 ${x + 160},170 ${x},340`}
                  />
                ))}
              </g>

              {/* Triângulos */}
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>

              {/* Círculos */}
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30, 50, 70].map((r) => (
                  <circle key={r} cx="870" cy="60" r={r} />
                ))}
              </g>

              {/* Grid pontos */}
              <g opacity="0.09" fill="#22d3ee">
                {[40, 60, 80, 100].map((y) =>
                  [310, 330, 350].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                  ))
                )}
              </g>

              {/* Linhas */}
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => (
                  <line key={y} x1="0" y1={y} x2="900" y2={y} />
                ))}
              </g>

              {/* Número fantasma */}
              <text
                x="820"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#22d3ee"
                opacity="0.02"
                textAnchor="middle"
              >
                12
              </text>
            </svg>

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10">

            {/* Bloco "Game by Game" Responsivo */}
            <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <Swords className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
              <span
                className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
              >
                Game by Game
              </span>
            </div>

            {/* Título Principal */}
            <h1
              className="leading-[0.9] tracking-[-0.02em]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
                background:
                  'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Match
              <span
                style={{
                  background:
                    'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ups
              </span>
            </h1>

            {/* Subtítulo */}
            <p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-lg text-slate-400"
              style={{ fontSize: 'clamp(14px, 1.5vw, 16px)' }}
            >
              Every game. Every score. Every moment.
            </p>

          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <>
            {/* Seletor de temporada */}
            <div className="mb-6 overflow-hidden rounded-2xl md:rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
              <div className="border-b border-white/5 px-6 py-4">
                <div
                  className="font-black uppercase tracking-[0.3em] text-cyan-300"
                  style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                >
                  Season
                </div>
              </div>

              {/* Container com o scroll horizontal ajustado */}
              <div
                ref={seasonsRef}
                className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4"
              >
                {seasons.map(s => {
                  const isActive = season === s;
                  return (
                    <button
                      key={s}
                      // ESSA LINHA É CRUCIAL: Ela liga o botão ativo à referência do JS
                      ref={isActive ? activeSeasonRef : null}
                      onClick={() => handleSeasonClick(s)}
                      className={`flex-shrink-0 rounded-2xl px-5 py-2.5 text-sm font-black transition-all ${isActive
                          ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                          : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de semana */}
            {season && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: false,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }} className="mb-6 overflow-hidden rounded-2xl md:rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                <div className="border-b border-white/5 px-6 py-4">
                  <div
                    className="font-black uppercase tracking-[0.3em] text-cyan-300"
                    style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                  >
                    Week
                  </div>
                </div>

                {/* Mudado de justify-center para justify-start md:justify-center */}
                <div ref={weeksRef} className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4">
                  {weeks.map(w => {
                    const isActive = week === String(w);
                    return (
                      <button
                        key={w}
                        // LIGAÇÃO DA REF: Identifica qual semana está ativa
                        ref={isActive ? activeWeekRef : null}
                        onClick={() => handleWeekClick(w)}
                        className={`flex-shrink-0 h-11 w-11 rounded-2xl text-sm font-black transition-all ${isActive
                            ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                            : 'border border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                          }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Cards de matchups */}
            {week && matchups.length > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: false,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }} className="mb-8 overflow-hidden rounded-2xl md:rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                <div className="border-b border-white/5 px-6 py-4">
                  <div
                    className="font-black uppercase tracking-[0.3em] text-cyan-300"
                    style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                  >
                    {season} — Week {week}
                  </div>
                </div>

                {/* Mudado de justify-center para justify-start md:justify-center */}
                <div className="scroll-hide flex justify-start md:justify-center gap-4 overflow-x-auto p-6">
                  {matchups.map((g, i) => {
                    const pf = parseNumber(g?.PF)
                    const pa = parseNumber(g?.PA)
                    const won = String(g?.Result || '').trim().toUpperCase() === 'W'
                    const isSelected = selected === g
                    const team = String(g?.Team || '').trim()
                    const opp = String(g?.Opponent || '').trim()
                    const stage = String(g?.GameStage || g?.GameType || '').trim()

                    return (
                      <button
                        key={i}
                        // LIGAÇÃO DA REF: Identifica qual card de confronto está ativo
                        ref={isSelected ? activeGameRef : null}
                        onClick={() => setSelected(isSelected ? null : g)}
                        className={`flex-shrink-0 w-56 rounded-[24px] border p-4 text-left transition-all ${isSelected
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
              </motion.div>
            )}

            {/* Detalhe do matchup selecionado */}
            {selected && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(10px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                viewport={{
                  once: false,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

                {/* Header do confronto */}
                {(() => {
                  // Calcula record até aquela semana para cada time
                  const calcRecord = (teamName) => {
                    const teamGames = games.filter(g => {
                      const s = String(g?.Season || '').trim()
                      const w = parseFloat(String(g?.Week || '0'))
                      const currentW = parseFloat(String(week || '0'))
                      const t = String(g?.Team || '').trim()
                      return s === season && w <= currentW && t === teamName
                    })
                    const w = teamGames.filter(g => String(g?.Result || '').trim().toUpperCase() === 'W').length
                    const l = teamGames.filter(g => String(g?.Result || '').trim().toUpperCase() === 'L').length
                    return { w, l }
                  }

                  const teamName = String(selected?.Team || '').trim()
                  const oppName = String(selected?.Opponent || '').trim()
                  const teamRecord = calcRecord(teamName)
                  const oppRecord = calcRecord(oppName)
                  const teamStreak = String(selected?.Streak_Total || '').trim()

                  // Streak do oponente — busca o jogo oposto
                  const oppGame = games.find(g =>
                    String(g?.Season || '').trim() === season &&
                    String(g?.Week || '').trim() === week &&
                    String(g?.Team || '').trim() === oppName &&
                    String(g?.Opponent || '').trim() === teamName
                  )
                  const oppStreak = String(oppGame?.Streak_Total || '').trim()

                  const gameType = String(selected?.GameType || '').trim()

                  return (
                    <div className="border-b border-white/5 px-6 py-8">

                      {/* Badge do tipo de jogo */}
                      <div className="flex justify-center mb-6">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                            {season} · Week {week}{gameType && gameType !== 'Reg Season' ? ` · ${gameType}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Confronto principal */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

                        {/* Time A */}
                        <div className="flex flex-col items-center gap-2">
                          <div className={`text-center font-black leading-tight ${teamWon ? 'text-white' : 'text-slate-400'}`}
                            style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
                            {teamName}
                          </div>
                          <div className={`font-black leading-none ${teamWon ? 'text-cyan-300' : 'text-slate-500'}`}
                            style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(42px, 7vw, 80px)' }}>
                            {teamPF.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-black text-slate-500">
                              {teamRecord.w}–{teamRecord.l}
                            </span>
                            <span className={`text-[10px] font-black rounded-lg px-2 py-0.5 border ${teamStreak.startsWith('W')
                                ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                                : 'text-red-400 border-red-400/20 bg-red-400/10'
                              }`}>
                              {teamStreak}
                            </span>
                          </div>
                        </div>

                        {/* VS central */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-slate-600 font-black text-lg">VS</div>
                          <div className="text-[10px] font-bold text-slate-600">
                            {Math.abs(teamPF - teamPA).toFixed(2)}
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">margin</div>
                          {teamWon ? (
                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">← WIN</div>
                          ) : (
                            <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-cyan-400">WIN →</div>
                          )}
                        </div>

                        {/* Time B */}
                        <div className="flex flex-col items-center gap-2">
                          <div className={`text-center font-black leading-tight ${!teamWon ? 'text-white' : 'text-slate-400'}`}
                            style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
                            {oppName}
                          </div>
                          <div className={`font-black leading-none ${!teamWon ? 'text-cyan-300' : 'text-slate-500'}`}
                            style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(42px, 7vw, 80px)' }}>
                            {teamPA.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-black text-slate-500">
                              {oppRecord.w}–{oppRecord.l}
                            </span>
                            <span className={`text-[10px] font-black rounded-lg px-2 py-0.5 border ${oppStreak.startsWith('W')
                                ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                                : 'text-red-400 border-red-400/20 bg-red-400/10'
                              }`}>
                              {oppStreak}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )
                })()}

                {/* Starters */}
                {/* Ajustado: px-3 no mobile para economizar espaço nas bordas, px-8 no desktop */}
                <div className="px-3 md:px-8 py-6 border-b border-white/5">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300 mb-4">Starters</div>

                  {/* Header colunas */}
                  <div className="grid grid-cols-[1fr_60px_1fr] gap-1 md:gap-2 mb-3">
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5 truncate">
                      {String(selected?.Team || '').trim()}
                    </div>
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5 text-center">
                      Pos
                    </div>
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-500 pb-2 border-b border-white/5 text-right truncate">
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
                      const pos = positions[i] || ''
                      return (
                        <React.Fragment key={i}>
                          {/* Mantido o grid original, apenas reduzindo o gap no mobile */}
                          <div className="grid grid-cols-[1fr_60px_1fr] gap-1 md:gap-2 mb-2 items-center">

                            {/* Time A — Nome → Pts */}
                            {/* Ajustado: px-2 no mobile, text-xs no mobile, min-w-0 para o truncate funcionar */}
                            <div className={`flex items-center justify-between rounded-2xl px-2 md:px-4 py-3 min-w-0 ${home ? 'bg-white/[0.03] border border-white/5' : 'opacity-0'}`}>
                              <span className="text-xs md:text-sm font-bold text-white truncate mr-1">{home?.name ?? ''}</span>
                              <span className={`text-xs md:text-sm font-black flex-shrink-0 ${(home?.pts ?? 0) > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>
                                {home ? home.pts.toFixed(1) : ''}
                              </span>
                            </div>

                            {/* Posição central — Sempre centralizada perfeitamente */}
                            <div className="flex items-center justify-center">
                              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg px-1.5 md:px-2 py-1 border ${getPosColor(pos)} whitespace-nowrap`}>
                                {pos}
                              </span>
                            </div>

                            {/* Time B — Pts → Nome (espelhado) */}
                            {/* Ajustado: px-2 no mobile, text-xs no mobile, min-w-0 para o truncate funcionar */}
                            <div className={`flex items-center justify-between rounded-2xl px-2 md:px-4 py-3 min-w-0 ${away ? 'bg-white/[0.03] border border-white/5' : 'opacity-0'}`}>
                              <span className={`text-xs md:text-sm font-black flex-shrink-0 ${(away?.pts ?? 0) > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>
                                {away ? away.pts.toFixed(1) : ''}
                              </span>
                              <span className="text-xs md:text-sm font-bold text-white truncate text-right ml-1">{away?.name ?? ''}</span>
                            </div>
                          </div>
                        </React.Fragment>
                      )
                    })
                  })()}
                </div>

                {/* Bench */}
                {(bench.length > 0 || oppBench.length > 0) && (
                  <div className="px-3 md:px-8 py-6 border-b border-white/5">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Bench</div>

                    <div className="grid grid-cols-[1fr_60px_1fr] gap-1 md:gap-2 mb-3">
                      <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-600 pb-2 border-b border-white/5 truncate">
                        {String(selected?.Team || '').trim()}
                      </div>
                      <div className="pb-2 border-b border-white/5" />
                      <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-600 pb-2 border-b border-white/5 text-right truncate">
                        {String(selected?.Opponent || '').trim()}
                      </div>
                    </div>

                    {Array.from({ length: Math.max(bench.length, oppBench.length) }).map((_, i) => {
                      const home = bench[i]
                      const away = oppBench[i]
                      return (
                        <React.Fragment key={i}>
                          <div className="grid grid-cols-[1fr_60px_1fr] gap-1 md:gap-2 mb-2 items-center">

                            <div className={`flex items-center justify-between rounded-2xl px-2 md:px-4 py-3 min-w-0 ${home ? 'bg-white/[0.02] border border-white/[0.03]' : 'opacity-0'}`}>
                              <span className="text-xs md:text-sm font-bold text-slate-400 truncate mr-1">{home?.name ?? ''}</span>
                              <span className={`text-xs md:text-sm font-black flex-shrink-0 ${(home?.pts ?? 0) > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                {home ? home.pts.toFixed(1) : ''}
                              </span>
                            </div>

                            <div className="flex items-center justify-center">
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white/[0.03] border border-white/[0.06] rounded-lg px-1.5 md:px-2 py-1 whitespace-nowrap">
                                BN
                              </span>
                            </div>

                            <div className={`flex items-center justify-between rounded-2xl px-2 md:px-4 py-3 min-w-0 ${away ? 'bg-white/[0.02] border border-white/[0.03]' : 'opacity-0'}`}>
                              <span className={`text-xs md:text-sm font-black flex-shrink-0 ${(away?.pts ?? 0) > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                                {away ? away.pts.toFixed(1) : ''}
                              </span>
                              <span className="text-xs md:text-sm font-bold text-slate-400 truncate text-right ml-1">{away?.name ?? ''}</span>
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
                    <div className="text-slate-300 text-sm leading-relaxed text-justify">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-black text-white mb-4 mt-6 leading-tight">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-black text-white mb-3 mt-5 leading-tight">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-black text-white mb-2 mt-4">{children}</h3>,
                          p: ({ children }) => <p className="text-slate-300 mb-3 leading-relaxed text-justify">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-black">{children}</strong>,
                          em: ({ children }) => <em className="text-cyan-300 not-italic font-bold">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-slate-300 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-slate-300 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-slate-300">{children}</li>,
                          hr: () => <hr className="border-white/10 my-4" />,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-cyan-400 pl-4 my-3 text-slate-400 italic">{children}</blockquote>,
                        }}
                      >
                        {recap}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </>
        )}

      </section>

      {/* Footer */}
      <footer className="px-2 py-6 md:px-6 max-w-5xl mx-auto">
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
