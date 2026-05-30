'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Flag,
  Flame,
  Swords,
  ChevronDown,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Header from '../components/Header'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const TEAM_LOGOS = {
  'H-Lera do Mahl': '/images/teams/h-lera-do-mahl.png',
  'Peytao da Massa': '/images/teams/peytao-da-massa.png',
  'Moneyball': '/images/teams/moneyball.png',
  'OldBrady': '/images/teams/oldbrady.png',
  'I am Megatron': '/images/teams/i-am-megatron.png',
  'Ocupa e Resiste': '/images/teams/ocupa-e-resiste.png',
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

function getSeasonTheme(season, latestSeason) {
  const s = Number(season)
  const latest = Number(latestSeason)

  // Current season
  if (s === latest) {
    return {
      accent: 'amber',
      border: 'border-amber-400/20',
      glow: 'from-amber-500/20',
      text: 'text-amber-300',
      bg: 'bg-amber-400/10',
    }
  }

  // Original era (2014–2016)
  if (s >= 2014 && s <= 2016) {
    return {
      accent: 'cyan',
      border: 'border-cyan-400/20',
      glow: 'from-cyan-500/20',
      text: 'text-cyan-300',
      bg: 'bg-cyan-400/10',
    }
  }

  // Modern era (2021+)
  return {
    accent: 'emerald',
    border: 'border-emerald-400/20',
    glow: 'from-emerald-500/20',
    text: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
  }
}

function GameRow({ game }) {
  return (
    <div className="flex flex-col border-b border-white/5 py-[6px] last:border-0">
      <div className="flex items-center gap-1">
        <span
          className={`text-[13px] font-black ${game.result === 'W'
            ? 'text-emerald-400'
            : 'text-red-400'
            }`}
        >
          {game.result}
        </span>

        <span className="truncate text-[13px] text-slate-300">
          &nbsp;vs {game.opp}
        </span>
      </div>

      <span className="text-[11px] text-slate-500">
        {game.score.toFixed(2)} –{' '}
        {game.oppScore.toFixed(2)}
      </span>
    </div>
  )
}

export default function HistoryPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [openSeason, setOpenSeason] = useState(null)

  useEffect(() => {
    async function load() {
      const data = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`)
      setGames(data)

      const seasons = [
        ...new Set(
          games
            .filter(g => {
              const gameType = String(g?.GameType || '').trim()

              return gameType === 'Finals'
            })
            .map(g => String(g?.Season || '').trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => Number(b) - Number(a))

      if (seasons.length > 0) {
        setOpenSeason(seasons[0])
      }

      setLoading(false)
    }

    load()
  }, [])

  const seasonData = useMemo(() => {
    const seasons = [
      ...new Set(
        games
          .map(g => String(g?.Season || '').trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(b) - Number(a))

    return seasons.map(season => {
      const seasonGames = games.filter(
        g => String(g?.Season || '').trim() === season
      )


      const uniqueTeams = [
        ...new Set(
          seasonGames.map(g => String(g?.Team || '').trim())
        ),
      ]

      // TEAM RECORDS
      const records = {}

      uniqueTeams.forEach(team => {
        const tg = seasonGames.filter(
          g => String(g?.Team || '').trim() === team
        )

        const wins = tg.filter(
          g =>
            String(g?.Result || '')
              .trim()
              .toUpperCase() === 'W'
        ).length

        const losses = tg.filter(
          g =>
            String(g?.Result || '')
              .trim()
              .toUpperCase() === 'L'
        ).length

        const points = tg.reduce(
          (sum, g) => sum + parseNumber(g?.PF),
          0
        )

        records[team] = {
          wins,
          losses,
          points,
        }
      })

      // CHAMPION
      const finalsGames = seasonGames.filter(g =>
        String(g?.GameType || '')
          .trim()
          .toLowerCase() === 'tapitas bowl'
      )

      const finalsWinner = finalsGames.find(
        g =>
          String(g?.Result || '')
            .trim()
            .toUpperCase() === 'W'
      )

      const champion = finalsWinner
        ? String(finalsWinner?.Team || '').trim()
        : null

      const championGames = seasonGames
        .filter(
          g =>
            String(g?.Team || '').trim() ===
            champion
        )
        .sort((a, b) => {
          return (
            parseFloat(a?.Week || 0) -
            parseFloat(b?.Week || 0)
          )
        })

      const regGames = championGames
        .filter(g => {
          const stage = String(
            g?.GameStage || ''
          ).trim()

          return (
            !stage ||
            stage === 'Reg Season'
          )
        })
        .map(g => ({
          result:
            String(g?.Result || '')
              .trim()
              .toUpperCase(),

          opp: g?.Opponent,

          score: parseNumber(g?.PF),

          oppScore: parseNumber(g?.PA),
        }))

      const playoffGames =
        championGames
          .filter(g => {
            const stage = String(
              g?.GameStage || ''
            ).trim()

            return stage === 'Playoffs'
          })
          .map(g => ({
            result:
              String(g?.Result || '')
                .trim()
                .toUpperCase(),

            opp: g?.Opponent,

            score: parseNumber(g?.PF),

            oppScore: parseNumber(g?.PA),
          }))

      const half = Math.ceil(
        regGames.length / 2
      )

      const regCol1 =
        regGames.slice(0, half)

      const regCol2 =
        regGames.slice(half)


      // UNICORN
      let unicorn = null

      const sortedWorst = Object.entries(records).sort((a, b) => {
        if (a[1].wins !== b[1].wins) {
          return a[1].wins - b[1].wins
        }

        return a[1].points - b[1].points
      })

      if (sortedWorst.length > 0) {
        unicorn = sortedWorst[0][0]
      }

      // HIGHEST SCORE
      const highestScoreGame = [...seasonGames].sort(
        (a, b) =>
          parseNumber(b?.PF) - parseNumber(a?.PF)
      )[0]

      // CLOSEST GAME
      const closestGame = [...seasonGames].sort((a, b) => {
        const marginA = Math.abs(
          parseNumber(a?.PF) - parseNumber(a?.PA)
        )

        const marginB = Math.abs(
          parseNumber(b?.PF) - parseNumber(b?.PA)
        )

        return marginA - marginB
      })[0]

      // BIGGEST BLOWOUT
      const biggestBlowout = [...seasonGames]
        .filter(
          g =>
            String(g?.Result || '')
              .trim()
              .toUpperCase() === 'W'
        )
        .sort((a, b) => {
          const marginA =
            parseNumber(a?.PF) - parseNumber(a?.PA)

          const marginB =
            parseNumber(b?.PF) - parseNumber(b?.PA)

          return marginB - marginA
        })[0]

      // SEASON RECAP
      const seasonRecapRow = [...seasonGames]
        .reverse()
        .find(g => {
          const recap = String(g?.Season_Recap || '').trim()
          return recap.length > 0
        })

      const recap =
        String(seasonRecapRow?.Season_Recap || '')
          .trim() || null

      // BEST RECORD
      const bestRecord = Object.entries(records).sort((a, b) => {
        if (a[1].wins !== b[1].wins) {
          return b[1].wins - a[1].wins
        }

        return b[1].points - a[1].points
      })[0]

      return {
        season,
        champion,
        unicorn,
        highestScoreGame,
        closestGame,
        biggestBlowout,
        recap,
        bestRecord,
        regGames,
        playoffGames,
        regCol1,
        regCol2,
      }
    })
  }, [games])

  return (
    <main className="min-h-screen bg-[#020617] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      `}</style>

      {/* HEADER */}
      <Header />

      <section className="px-3 md:px-6 pb-20">
        {/* HERO */}
        <div className="relative mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">

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
                x="790"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#22d3ee"
                opacity="0.02"
                textAnchor="middle"
              >
                XII
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

            {/* Badge */}
            <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />

              <span
                className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
              >
                League Archive
              </span>
            </div>

            {/* Title */}
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
              League
              <span
                style={{
                  background:
                    'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {' '}History
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-slate-400 leading-relaxed"
              style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}
            >
              Every season tells a story.
              Every champion becomes immortal.
              The complete history of the Tapitas League since 2014.
            </p>

          </div>
        </div>

        {/* TIMELINE */}
        {loading ? (
          <div className="flex justify-center py-20 text-slate-500 font-bold">
            Loading history...
          </div>
        ) : (
          <div className="relative mx-auto max-w-6xl">
            {/* CENTER LINE */}
            <div className="absolute left-5 md:left-1/2 top-0 h-full w-px md:-translate-x-1/2 bg-cyan-400/10" />

            <div className="space-y-8">
              {seasonData.map((s, i) => {
                const open = openSeason === s.season
                const theme = getSeasonTheme(
                  s.season,
                  seasonData[0]?.season
                )

                return (
                  <motion.div
                    key={s.season}
                    initial={{
                      opacity: 0,
                      y: 50,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.7,
                    }}
                    className={`relative flex ${i % 2 === 0
                      ? 'md:justify-start'
                      : 'md:justify-end'
                      }`}
                  >
                    {/* DOT */}
                    <div className="absolute left-5 md:left-1/2 top-12 z-20 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[#020617] bg-cyan-300" />
                    {/* CARD */}
                    <div className="w-full pl-14 pr-2 md:px-0 md:w-[calc(50%-40px)]">
                      <div
                        className={`relative overflow-hidden rounded-[32px] border bg-[linear-gradient(180deg,rgba(8,15,30,0.96),rgba(2,6,23,0.98))] ${theme.border}`}
                      >
                        {/* YEAR GHOST */}
                        <div
                          className={`absolute right-5 top-2 font-black opacity-[0.04] ${theme.text}`}
                          style={{
                            fontFamily:
                              '"Bebas Neue", sans-serif',
                            fontSize: '120px',
                            lineHeight: 1,
                          }}
                        >
                          {s.season}
                        </div>

                        {/* HEADER */}
                        <button
                          onClick={() =>
                            setOpenSeason(
                              open ? null : s.season
                            )
                          }
                          className="relative z-10 w-full p-6 text-left"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <>
                              {/* LEFT */}
                              <div>

                                <div
                                  className={`mb-3 inline-flex items-center gap-2 rounded-xl border px-3 py-1 ${theme.border} ${theme.bg}`}
                                >
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.text}`}
                                  >
                                    {Number(s.season) === Number(seasonData[0]?.season)
                                      ? 'Reigning'
                                      : 'Archive'}
                                  </span>
                                </div>

                                <h2
                                  className="leading-none tracking-tight"
                                  style={{
                                    fontFamily:
                                      '"Bebas Neue", sans-serif',
                                    fontSize:
                                      'clamp(48px,6vw,82px)',
                                  }}
                                >
                                  {s.season}
                                </h2>

                                {s.champion && (
                                  <div className="mt-3 flex items-center gap-2 text-slate-400">
                                    <Trophy className="h-4 w-4 text-amber-300" />

                                    <span className="text-sm font-bold">
                                      Champion:{' '}
                                      <span className="text-white">
                                        {s.champion}
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* RIGHT */}
                              <div className="flex items-center gap-4">

                                {/* Champion Logo */}
                                <div className="relative shrink-0">

                                  {/* Trophy Corner */}
                                  <div className="absolute -left-1 -top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-[#0f172a] shadow-lg shadow-black/40">
                                    <Trophy className="h-3.5 w-3.5 text-amber-300" />
                                  </div>

                                  {/* Logo */}
                                  <div
                                    className={`relative h-20 w-20 overflow-hidden rounded-full border-2 ${theme.border} bg-white/[0.04]`}
                                  >
                                    <Image
                                      src={
                                        TEAM_LOGOS[s.champion] ||
                                        '/images/teams/default.png'
                                      }
                                      alt={s.champion || 'Champion'}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>

                                  {/* Glow */}
                                  <div
                                    className={`absolute inset-0 rounded-full blur-xl opacity-20 ${theme.bg}`}
                                  />
                                </div>

                                {/* Chevron */}
                                <ChevronDown
                                  className={`h-6 w-6 text-slate-500 transition-transform ${open ? 'rotate-180' : ''
                                    }`}
                                />

                              </div>
                            </>
                          </div>
                        </button>

                        {/* EXPANDED */}
                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{
                                height: 0,
                                opacity: 0,
                              }}
                              animate={{
                                height: 'auto',
                                opacity: 1,
                              }}
                              exit={{
                                height: 0,
                                opacity: 0,
                              }}
                              transition={{
                                duration: 0.35,
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6">
                                {/* STATS GRID */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  {/* CHAMP */}
                                  <div className="rounded-3xl border border-amber-400/15 bg-amber-400/5 p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                      <Crown className="h-4 w-4 text-amber-300" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">
                                        Champion
                                      </span>
                                    </div>

                                    <div className="text-2xl font-black text-white">
                                      {s.champion || '—'}
                                    </div>

                                    {(() => {
                                      if (!s.champion) return null

                                      const championGames = games.filter(g =>
                                        String(g?.Season || '').trim() === s.season &&
                                        String(g?.Team || '').trim() === s.champion
                                      )

                                      const regSeasonGames = championGames.filter(g =>
                                        String(g?.GameType || '').trim() === 'Reg Season'
                                      )

                                      const playoffGames = championGames.filter(g =>
                                        String(g?.GameType || '').trim() !== 'Reg Season'
                                      )

                                      const regWins = regSeasonGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'W'
                                      ).length

                                      const regLosses = regSeasonGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'L'
                                      ).length

                                      const poWins = playoffGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'W'
                                      ).length

                                      const poLosses = playoffGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'L'
                                      ).length

                                      return (
                                        <div className="mt-4 flex flex-wrap gap-2">

                                          {/* Regular Season */}
                                          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                              Reg Season
                                            </div>

                                            <div className="mt-1 text-sm font-black text-white">
                                              {regWins}-{regLosses}
                                            </div>
                                          </div>

                                          {/* Playoffs */}
                                          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                              Playoffs
                                            </div>

                                            <div className="mt-1 text-sm font-black text-white">
                                              {poWins}-{poLosses}
                                            </div>
                                          </div>

                                        </div>
                                      )
                                    })()}
                                  </div>

                                  {/* UNICORN */}
                                  <div className="rounded-3xl border border-pink-400/15 bg-pink-400/5 p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                      🦄
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-300">
                                        Unicorn
                                      </span>
                                    </div>

                                    {(() => {

                                      // Procura o Unicorn Game
                                      const unicornGames = games.filter(g =>
                                        String(g?.Season || '').trim() === s.season &&
                                        String(g?.GameType || '').trim() === 'Unicórnio'
                                      )

                                      // Perdedor do Unicorn Game
                                      const loser = unicornGames.find(g =>
                                        String(g?.Result || '')
                                          .trim()
                                          .toUpperCase() === 'L'
                                      )

                                      const unicornTeam = loser
                                        ? String(loser?.Team || '').trim()
                                        : null

                                      if (!unicornTeam) {
                                        return (
                                          <div className="text-2xl font-black text-white">
                                            —
                                          </div>
                                        )
                                      }

                                      // Jogos do time
                                      const teamGames = games.filter(g =>
                                        String(g?.Season || '').trim() === s.season &&
                                        String(g?.Team || '').trim() === unicornTeam
                                      )

                                      // Regular Season
                                      const regGames = teamGames.filter(g =>
                                        String(g?.GameType || '').trim() === 'Reg Season'
                                      )

                                      // Consolation
                                      const consolationGames = teamGames.filter(g =>
                                        String(g?.GameStage || '').trim() === 'Consolation'
                                      )

                                      const regWins = regGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'W'
                                      ).length

                                      const regLosses = regGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'L'
                                      ).length

                                      const conWins = consolationGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'W'
                                      ).length

                                      const conLosses = consolationGames.filter(
                                        g =>
                                          String(g?.Result || '')
                                            .trim()
                                            .toUpperCase() === 'L'
                                      ).length

                                      return (
                                        <>
                                          <div className="text-2xl font-black text-white">
                                            {unicornTeam}
                                          </div>

                                          <div className="mt-4 flex flex-wrap gap-2">

                                            {/* Regular Season */}
                                            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                                Reg Season
                                              </div>

                                              <div className="mt-1 text-sm font-black text-white">
                                                {regWins}-{regLosses}
                                              </div>
                                            </div>

                                            {/* Consolation */}
                                            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                                Consolation
                                              </div>

                                              <div className="mt-1 text-sm font-black text-white">
                                                {conWins}-{conLosses}
                                              </div>
                                            </div>

                                          </div>
                                        </>
                                      )
                                    })()}
                                  </div>

                                  {/* HIGHEST SCORE */}
                                  <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                      <Flame className="h-4 w-4 text-cyan-300" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                                        Highest Score
                                      </span>
                                    </div>

                                    {/* Main Score */}
                                    <div className="text-4xl font-black text-white">
                                      {parseNumber(
                                        s.highestScoreGame?.PF
                                      ).toFixed(2)}
                                    </div>

                                    {/* Team */}
                                    <div className="mt-3 text-xl font-black text-cyan-300">
                                      {s.highestScoreGame?.Team}
                                    </div>

                                    {/* Final Score */}
                                    <div className="mt-2 text-sm font-bold text-slate-300">
                                      {parseNumber(s.highestScoreGame?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.highestScoreGame?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.highestScoreGame?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.highestScoreGame?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.highestScoreGame?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* CLOSEST GAME */}
                                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-5">
                                    <div className="mb-4 flex items-center gap-2">
                                      <Swords className="h-4 w-4 text-emerald-300" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                                        Closest Game
                                      </span>
                                    </div>

                                    {/* Margin */}
                                    <div className="text-4xl font-black text-white">
                                      {Math.abs(
                                        parseNumber(s.closestGame?.PF) -
                                        parseNumber(s.closestGame?.PA)
                                      ).toFixed(2)}
                                    </div>

                                    {/* Matchup */}
                                    <div className="mt-3 text-lg font-black text-emerald-300">
                                      {s.closestGame?.Team}
                                    </div>

                                    {/* Score */}
                                    <div className="mt-2 text-sm font-bold text-slate-300">
                                      {parseNumber(s.closestGame?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.closestGame?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.closestGame?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.closestGame?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.closestGame?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* BIGGEST WIN */}
                                  <div className="rounded-3xl border border-violet-400/15 bg-violet-400/5 p-5 md:col-span-2">
                                    <div className="mb-4 flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-violet-300" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">
                                        Biggest Win
                                      </span>
                                    </div>

                                    {/* Margin */}
                                    <div className="text-4xl font-black text-white">
                                      {Math.abs(
                                        parseNumber(s.biggestBlowout?.PF) -
                                        parseNumber(s.biggestBlowout?.PA)
                                      ).toFixed(2)}
                                    </div>

                                    {/* Winner */}
                                    <div className="mt-3 text-xl font-black text-violet-300">
                                      {s.biggestBlowout?.Team}
                                    </div>

                                    {/* Final Score */}
                                    <div className="mt-2 text-sm font-bold text-slate-300">
                                      {parseNumber(s.biggestBlowout?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.biggestBlowout?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.biggestBlowout?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.biggestBlowout?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-white">
                                          {s.biggestBlowout?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* =====================================================
                                  GAME LOG
                                  ===================================================== */}

                                  <div className="mt-5 rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-5 md:col-span-2">
                                    <div className="mb-5 flex items-center gap-2">
                                      <Flag className="h-4 w-4 text-cyan-300" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
                                        Championship Run
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      {/* REG SEASON COL 1 */}

                                      <div>
                                        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                                          Reg Season
                                        </div>

                                        {s.regCol1.map((g, i) => (
                                          <GameRow
                                            key={i}
                                            game={g}
                                          />
                                        ))}
                                      </div>

                                      {/* REG SEASON COL 2 */}

                                      <div>
                                        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] opacity-0">
                                          &nbsp;
                                        </div>

                                        {s.regCol2.map((g, i) => (
                                          <GameRow
                                            key={i}
                                            game={g}
                                          />
                                        ))}
                                      </div>

                                      {/* PLAYOFFS */}

                                      <div>
                                        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-400">
                                          Playoffs
                                        </div>

                                        {s.playoffGames.length > 0 ? (
                                          s.playoffGames.map(
                                            (g, i) => (
                                              <GameRow
                                                key={i}
                                                game={g}
                                              />
                                            )
                                          )
                                        ) : (
                                          <div className="text-[11px] text-slate-600">
                                            Sem dados
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* RECAP */}
                                {s.recap && (
                                  <div className="mt-5 rounded-[28px] border border-white/5 bg-white/[0.03] p-6">

                                    <div className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                      Season Recap
                                    </div>

                                    <div className="text-sm leading-relaxed text-justify">
                                      <ReactMarkdown
                                        components={{
                                          h1: ({ children }) => (
                                            <h1 className="text-2xl font-black text-white mb-4 mt-6 leading-tight">
                                              {children}
                                            </h1>
                                          ),

                                          h2: ({ children }) => (
                                            <h2 className="text-xl font-black text-white mb-3 mt-5 leading-tight">
                                              {children}
                                            </h2>
                                          ),

                                          h3: ({ children }) => (
                                            <h3 className="text-lg font-black text-white mb-2 mt-4">
                                              {children}
                                            </h3>
                                          ),

                                          p: ({ children }) => (
                                            <p className="text-slate-300 mb-3 leading-relaxed text-justify">
                                              {children}
                                            </p>
                                          ),

                                          strong: ({ children }) => (
                                            <strong className="text-white font-black">
                                              {children}
                                            </strong>
                                          ),

                                          em: ({ children }) => (
                                            <em className="text-cyan-300 not-italic font-bold">
                                              {children}
                                            </em>
                                          ),

                                          ul: ({ children }) => (
                                            <ul className="list-disc list-inside mb-3 text-slate-300 space-y-1">
                                              {children}
                                            </ul>
                                          ),

                                          ol: ({ children }) => (
                                            <ol className="list-decimal list-inside mb-3 text-slate-300 space-y-1">
                                              {children}
                                            </ol>
                                          ),

                                          li: ({ children }) => (
                                            <li className="text-slate-300">
                                              {children}
                                            </li>
                                          ),

                                          hr: () => (
                                            <hr className="border-white/10 my-4" />
                                          ),

                                          blockquote: ({ children }) => (
                                            <blockquote className="border-l-2 border-cyan-400 pl-4 my-3 text-slate-400 italic">
                                              {children}
                                            </blockquote>
                                          ),
                                        }}
                                      >
                                        {s.recap}
                                      </ReactMarkdown>
                                    </div>

                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="px-2 py-6 md:px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={24}
            height={24}
            style={{ filter: 'invert(1)' }}
            className="opacity-30"
          />

          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>
    </main>
  )
}