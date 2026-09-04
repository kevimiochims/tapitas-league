'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Flag,
  Flame,
  Swords,
  ChevronDown,
  ChevronRight,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Header from '../components/Header'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const TEAM_LOGOS = {
  'howmuch': '/images/howmuch.png',
    'i am megatron': '/images/megatron.png',
    'moneyball': '/images/moneyball.png',
    'ocupa e resiste': '/images/ocupa.png',
    'oldbrady': '/images/oldbrady.png',
    'patrolao squad': '/images/patrolao.png',
    'pequers verde': '/images/pequers.png',
    'peytao da massa': '/images/peytao.png',
    'rincao settlers': '/images/rincao.png',
    'h-lera do mahl': '/images/hlera.png',
}

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getTeamLogo(name) {
  return TEAM_LOGOS[normalizeString(name)] || null
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0

  let text = String(value).trim().replace(/[^0-9,.-]/g, '')
  if (!text) return 0

  const hasComma = text.includes(',')
  const hasDot = text.includes('.')

  if (hasComma && hasDot) {
    // If both separators exist, the last one is treated as the decimal separator.
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else if (hasComma) {
    text = text.replace(',', '.')
  }

  const parsed = Number(text)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getField(row, ...keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return row[key]
  }
  return ''
}

function getGameType(row) {
  return normalizeString(getField(row, 'GameType', 'gameType', 'GAME_TYPE'))
}

function getResult(row) {
  return normalizeString(getField(row, 'Result', 'result')).toUpperCase()
}

function getSeason(row) {
  return String(getField(row, 'Season', 'season')).trim()
}

function getTeam(row) {
  return String(getField(row, 'Team', 'team')).trim()
}

function getOpponent(row) {
  return String(getField(row, 'Opponent', 'opponent')).trim()
}

function getStage(row) {
  return normalizeString(getField(row, 'GameStage', 'gameStage'))
}

function matchupHref(row) {
  if (!row) return '/matchups'
  return `/matchups?season=${encodeURIComponent(getSeason(row))}&week=${encodeURIComponent(getField(row, 'Week', 'week'))}&team=${encodeURIComponent(getTeam(row))}&opp=${encodeURIComponent(getOpponent(row))}`
}

function teamHref(name) {
  return `/teams?team=${encodeURIComponent(String(name || '').trim())}`
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
  const isLatest = Number(season) === Number(latestSeason)

  if (isLatest) {
    return {
      accent: 'red',
      border: 'border-[#D01F2D]/30',
      glow: 'from-[#D01F2D]/10',
      text: 'text-[#D01F2D]',
      bg: 'bg-[#D01F2D]/5',
    }
  }

  return {
    accent: 'neutral',
    border: 'border-[#0A0A0A]/10',
    glow: 'from-[#16274F]/5',
    text: 'text-[#16274F]',
    bg: 'bg-[#16274F]/5',
  }
}

function GameRow({ game }) {
  return (
    <div className="flex flex-col border-b border-[#0A0A0A]/10 py-[6px] last:border-0">
      <div className="flex items-center gap-1">
        <span
          className={`text-[13px] font-black ${game.result === 'W'
            ? 'text-[#1E8E3E]'
            : 'text-[#D01F2D]'
            }`}
        >
          {game.result}
        </span>

        <span className="truncate text-[13px] text-[#4B5563]">
          &nbsp;vs {game.opp}
        </span>
      </div>

      <span className="text-[11px] text-[#6B7280]">
        {game.score.toFixed(2)} –{' '}
        {game.oppScore.toFixed(2)}
      </span>
    </div>
  )
}

function getInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '?'

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return (words[0][0] + words[1][0]).toUpperCase()
}

function TeamAvatar({ name, size = 36, ringClass = '' }) {
  const logo = getTeamLogo(name)

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-[#F7F6F2] ${ringClass}`}
      style={{ height: size, width: size }}
      title={name || ''}
    >
      {logo ? (
        <Image
          src={logo}
          alt={name || 'Team'}
          fill
          className="object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-[#F7F6F2] font-black text-[#4B5563]"
          style={{ fontSize: size * 0.32 }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}

function CardAvatars({ children }) {
  return (
    <div className="absolute right-5 top-5 z-10 flex items-center">
      {children}
    </div>
  )
}

export default function HistoryPage() {
  const [games, setGames] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [openSeason, setOpenSeason] = useState(null)
  const cardRefs = useRef({})

  function handleToggleSeason(season) {
    const willOpen = openSeason !== season
    const el = cardRefs.current[season]

    setOpenSeason(willOpen ? season : null)

    if (willOpen && el) {
      // The collapsing/expanding cards keep shifting layout for the
      // duration of their height animation (~350ms), which moves the
      // target card while we're mid-scroll. Re-issue the scroll a few
      // times across that window so we land in the right place instead
      // of wherever the layout happened to settle when we first asked.
      const reScroll = () =>
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      requestAnimationFrame(reScroll)

      const delays = [100, 200, 320, 450]
      delays.forEach(ms => setTimeout(reScroll, ms))
    }
  }

  useEffect(() => {
    async function load() {
      const [data, historyData] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
      ])

      setGames(data)
      setHistory(historyData)

      const seasons = [
        ...new Set(
          data
            .filter(g => getGameType(g) === 'finals')
            .map(g => getSeason(g))
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
    // Only show seasons that have a completed final (Tapitas Bowl winner)
    const completedSeasons = [
      ...new Set(
        games
          .filter(g =>
            getGameType(g) === 'tapitas bowl' &&
            getResult(g) === 'W'
          )
          .map(g => getSeason(g))
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(b) - Number(a))

    return completedSeasons.map(season => {
      const seasonGames = games.filter(
        g => getSeason(g) === season
      )


      const uniqueTeams = [
        ...new Set(
          seasonGames.map(g => getTeam(g))
        ),
      ]

      // TEAM RECORDS
      const records = {}

      uniqueTeams.forEach(team => {
        const tg = seasonGames.filter(
          g => getTeam(g) === team
        )

        const wins = tg.filter(
          g =>
            getResult(g) === 'W'
        ).length

        const losses = tg.filter(
          g =>
            getResult(g) === 'L'
        ).length

        const points = tg.reduce(
          (sum, g) => sum + parseNumber(getField(g, 'PF', 'pf')),
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
        getGameType(g) === 'tapitas bowl'
      )

      const finalsWinner = finalsGames.find(g => getResult(g) === 'W')

      const champion = finalsWinner ? getTeam(finalsWinner) || null : null

      const championGames = seasonGames
        .filter(
          g =>
            getTeam(g) ===
            champion
        )
        .sort((a, b) => {
          return (
            parseFloat(getField(a, 'Week', 'week') || 0) -
            parseFloat(getField(b, 'Week', 'week') || 0)
          )
        })

      const regGames = championGames
        .filter(g => {
          const stage = getStage(g)

          return (
            !stage ||
            stage === 'reg season'
          )
        })
        .map(g => ({
          result:
            getResult(g),

          opp: getOpponent(g),

          week: getField(g, 'Week', 'week'),

          score: parseNumber(getField(g, 'PF', 'pf')),

          oppScore: parseNumber(getField(g, 'PA', 'pa')),
        }))

      const playoffGames =
        championGames
          .filter(g => getStage(g) === 'playoffs')
          .map(g => ({
            result:
              getResult(g),

            opp: getOpponent(g),

            week: getField(g, 'Week', 'week'),

            score: parseNumber(getField(g, 'PF', 'pf')),

            oppScore: parseNumber(getField(g, 'PA', 'pa')),
            gameType: g?.GameType,
          }))

      const half = Math.ceil(
        regGames.length / 2
      )

      const regCol1 =
        regGames.slice(0, half)

      const regCol2 =
        regGames.slice(half)

      // CHAMPION RECORD / SEASON STATS
      // Keep every value consumed by the UI defined, even when a season has
      // incomplete historical rows.
      const championRecord = {
        wins: regGames.filter(g => g.result === 'W').length,
        losses: regGames.filter(g => g.result === 'L').length,
      }

      const numericChampionRegPF = regGames
        .map(g => Number(g?.score))
        .filter(Number.isFinite)

      const avgPF = numericChampionRegPF.length
        ? numericChampionRegPF.reduce((sum, value) => sum + value, 0) / numericChampionRegPF.length
        : 0

      const bestPFGame = [...seasonGames].sort(
        (a, b) => parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(a, 'PF', 'pf'))
      )[0] || null

      const worstPFGame = [...seasonGames].sort(
        (a, b) => parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(b, 'PF', 'pf'))
      )[0] || null

      // Championship final
      const championshipOpponent = getOpponent(finalsWinner) || null
      const championshipScore = finalsWinner
        ? parseNumber(getField(finalsWinner, 'PF', 'pf'))
        : null
      const championshipOpponentScore = finalsWinner
        ? parseNumber(getField(finalsWinner, 'PA', 'pa'))
        : null


      // UNICORN
      // The Unicorn is the loser of the official Unicorn game.
      // GAME_FACTS_ALL contains mirrored rows, so the losing row is the
      // authoritative team for the season. This avoids confusing the
      // Unicorn with the last regular-season standing.
      const unicornGames = seasonGames.filter(g => {
        const gameType = getGameType(g)
        return gameType === 'unicórnio' || gameType === 'unicornio' || gameType === 'unicorn'
      })

      const unicornLoser = unicornGames.find(g => getResult(g) === 'L')

      const unicorn = unicornLoser ? getTeam(unicornLoser) || null : null

      // HIGHEST SCORE
      const highestScoreGame = [...seasonGames].sort(
        (a, b) =>
          parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(a, 'PF', 'pf'))
      )[0]

      // CLOSEST GAME
      const closestGame = [...seasonGames].sort((a, b) => {
        const marginA = Math.abs(
          parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(a, 'PA', 'pa'))
        )

        const marginB = Math.abs(
          parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(b, 'PA', 'pa'))
        )

        return marginA - marginB
      })[0]

      // BIGGEST BLOWOUT
      const biggestBlowout = [...seasonGames]
        .filter(
          g =>
            getResult(g) === 'W'
        )
        .sort((a, b) => {
          const marginA =
            parseNumber(getField(a, 'PF', 'pf')) - parseNumber(getField(a, 'PA', 'pa'))

          const marginB =
            parseNumber(getField(b, 'PF', 'pf')) - parseNumber(getField(b, 'PA', 'pa'))

          return marginB - marginA
        })[0]

      // SEASON RECAP
      const seasonRecapRow = [...seasonGames]
        .reverse()
        .find(g => {
          const recap = String(getField(g, 'Season_Recap', 'season_recap') || '').trim()
          return recap.length > 0
        })

      const recap =
        String(getField(seasonRecapRow, 'Season_Recap', 'season_recap') || '')
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
        championRecord,
        avgPF,
        bestPFGame,
        worstPFGame,
        championshipOpponent,
        championshipScore,
        championshipOpponentScore,
        championshipFinalGame: finalsWinner,
        regGames,
        playoffGames,
        regCol1,
        regCol2,
      }
    })
  }, [games, history])

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F6F2] text-[#16274F]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>
      <Header />

      <section className="px-3 md:px-6 pb-20">
        <div>
          {/* HERO */}
          <div className="relative mb-10 overflow-hidden border-2 border-[#0A0A0A] shadow-[6px_6px_0_#16274F]">
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <svg
                            className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
                            preserveAspectRatio="xMidYMid slice"
                            viewBox="0 0 900 340"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <g opacity="0.06">
                                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                                    <rect
                                        key={i}
                                        x={x}
                                        y="-80"
                                        width={i % 2 === 0 ? 55 : 22}
                                        height="520"
                                        fill="#16274F"
                                        transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                                    />
                                ))}
                            </g>
                            <g opacity="0.10" fill="none" stroke="#16274F" strokeWidth="1">
                                {[
                                    'M380 -30 L460 85 L380 200 L300 85 Z',
                                    'M460 85 L540 200 L460 315 L380 200 Z',
                                    'M540 -30 L620 85 L540 200 L460 85 Z',
                                    'M620 85 L700 200 L620 315 L540 200 Z',
                                    'M700 -30 L780 85 L700 200 L620 85 Z',
                                    'M780 85 L860 200 L780 315 L700 200 Z',
                                ].map((d, i) => (
                                    <path key={i} d={d} />
                                ))}
                            </g>
                            <g opacity="0.05" fill="#D01F2D">
                                {[
                                    'M420 30 L440 58 L420 86 L400 58 Z',
                                    'M500 120 L520 148 L500 176 L480 148 Z',
                                    'M580 30 L600 58 L580 86 L560 58 Z',
                                    'M660 120 L680 148 L660 176 L640 148 Z',
                                    'M740 30 L760 58 L740 86 L720 58 Z',
                                ].map((d, i) => (
                                    <path key={i} d={d} />
                                ))}
                            </g>
                            <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="2" strokeLinejoin="round">
                                {[520, 600, 680].map((x, i) => (
                                    <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />
                                ))}
                            </g>
                            <g opacity="0.08" fill="#16274F">
                                <polygon points="900,0 900,140 760,0" />
                                <polygon points="900,340 900,200 760,340" />
                            </g>
                            <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="1">
                                {[30, 50, 70].map((r) => (
                                    <circle key={r} cx="870" cy="60" r={r} />
                                ))}
                            </g>
                            <g opacity="0.10" fill="#16274F">
                                {[40, 60, 80, 100].map((y) =>
                                    [310, 330, 350].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />)
                                )}
                            </g>
                            <g opacity="0.10" stroke="#16274F" strokeWidth="0.5">
                                {[56, 113, 226, 284].map((y) => (
                                    <line key={y} x1="0" y1={y} x2="900" y2={y} />
                                ))}
                            </g>
                            <text
                                x="790"
                                y="310"
                                fontFamily="'Bebas Neue', sans-serif"
                                fontSize="340"
                                fill="#16274F"
                                opacity="0.04"
                                textAnchor="middle"
                            >
                                H
                            </text>
                        </svg>
                        <div
                            className="absolute inset-0"
                            style={{
                                background:
                                    'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.90) 48%, rgba(247,246,242,0.25) 100%)',
                            }}
                        />
                    </div>

                    <div className="relative z-10 p-6 sm:p-8 md:p-10">
                        <div
                            className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 bg-[#D01F2D] px-3 py-1.5 sm:px-4 sm:py-2"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
                        >
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-white shrink-0" />
                            <span
                                className="font-black uppercase tracking-[0.25em] text-white whitespace-nowrap"
                                style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
                            >
                                League Archive
                            </span>
                        </div>

                        <h1
                            className="leading-[0.9] tracking-[-0.02em] text-[#16274F]"
                            style={{
                                fontFamily: '"Bebas Neue", sans-serif',
                                fontSize: 'clamp(48px, 7vw, 96px)',
                            }}
                        >
                            League{' '}
                            <span
                                className="inline-block text-[#D01F2D]"
                                style={{ textShadow: '4px 4px 0 #0A0A0A' }}
                            >
                                History
                            </span>
                        </h1>

                        <p
                            className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-[#3F4757] leading-relaxed"
                            style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}
                        >
                            Every season tells a story. Every champion becomes immortal. The complete history of the Tapitas League since 2014.
                        </p>
                    </div>
                </div>

          {/* TIMELINE */}
          {loading ? (
            <div className="flex justify-center py-20 text-sm font-bold text-[#6B7280]">
              Loading history...
            </div>
          ) : seasonData.length === 0 ? (
            <div className="border-2 border-[#0A0A0A]/20 bg-white p-8 text-center shadow-[3px_3px_0_#16274F]">
              <div className="text-sm font-black uppercase tracking-[0.16em] text-[#16274F]">No history data found</div>
              <div className="mt-2 text-xs font-bold text-[#6B7280]">Check the GAME_FACTS_ALL data source and its column names.</div>
            </div>
          ) : (
            <div className="relative pl-7 sm:pl-10">
              <div className="absolute bottom-4 left-[11px] top-3 w-px border-l border-dashed border-[#16274F]/45 sm:left-[18px]" />

              <div className="space-y-4 sm:space-y-5">
                {seasonData.map((s, i) => {
                  const open = openSeason === s.season
                  const isLatest = i === 0
                  const championLogo = getTeamLogo(s.champion)
                  const unicornLogo = getTeamLogo(s.unicorn)
                  const bestPF = s.bestPFGame
                  const worstPF = s.worstPFGame

                  return (
                    <motion.div
                      key={s.season}
                      ref={(el) => { cardRefs.current[s.season] = el }}
                      style={{ scrollMarginTop: 92 }}
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.12 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="relative"
                    >
                      {/* TIMELINE NODE */}
                      <div className="absolute -left-[27px] top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#16274F] bg-[#F7F6F2] sm:-left-[33px]">
                        <div className="h-3 w-3 rounded-full bg-[#D01F2D]" />
                      </div>

                      <div
                        className={`overflow-hidden border-2 border-[#0A0A0A] bg-white ${
                          open ? 'shadow-[6px_6px_0_#16274F]' : 'shadow-[4px_4px_0_#16274F] hover:-translate-y-[1px]'
                        } transition-transform duration-200`}
                      >
                        {/* SEASON HEADER */}
                        <button
                          type="button"
                          onClick={() => handleToggleSeason(s.season)}
                          className={`w-full text-left ${open ? 'px-5 py-5 sm:px-6 sm:py-5' : 'px-4 py-4 sm:px-5 sm:py-4'}`}
                        >
                          {open ? (
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <span
                                    className="text-4xl leading-none text-[#16274F] sm:text-5xl"
                                    style={{ fontFamily: '"Bebas Neue", sans-serif' }}
                                  >
                                    {s.season}
                                  </span>
                                  {isLatest && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#B8860B]">
                                      <Crown className="h-4 w-4" />
                                      Reigning Champion
                                    </span>
                                  )}
                                </div>
                                {s.champion && (
                                  <div className="mt-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#6B7280]">
                                    Champion <span className="text-[#16274F]">{s.champion}</span>
                                  </div>
                                )}
                              </div>
                              <ChevronDown className="h-5 w-5 shrink-0 text-[#16274F]" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                            </div>
                          ) : (
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(270px,1.55fr)_1px_minmax(180px,1.1fr)_minmax(150px,0.9fr)_minmax(150px,0.9fr)_minmax(185px,1fr)]">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="shrink-0 text-3xl leading-none text-[#16274F]" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                                  {s.season}
                                </span>
                                {championLogo ? (
                                  <img src={championLogo} alt={s.champion || 'Champion'} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16274F] text-[9px] font-black text-white">
                                    {String(s.champion || '—').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="whitespace-nowrap text-[13px] font-black uppercase text-[#16274F]">{s.champion || '—'}</div>
                                  <div className="mt-0.5 inline-flex bg-[#F5C518] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#0A0A0A]">🏆 Champion</div>
                                </div>
                              </div>

                              <ChevronDown className="h-4 w-4 shrink-0 text-[#16274F] lg:hidden" />

                              <div className="hidden h-9 border-l border-[#0A0A0A]/15 lg:block" />

                              <div className="hidden lg:grid grid-cols-2 divide-x divide-[#0A0A0A]/10 border border-[#0A0A0A]/10 bg-[#F7F6F2]">
                                <div className="px-3 py-2">
                                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Champion Record</div>
                                  <div className="mt-1 text-xl font-black leading-none">
                                    <span className="text-[#1E8E3E]">{s.championRecord?.wins ?? 0}</span>
                                    <span className="text-[#6B7280]">–</span>
                                    <span className="text-[#D01F2D]">{s.championRecord?.losses ?? 0}</span>
                                  </div>
                                </div>
                                <div className="px-3 py-2">
                                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Champion PF Avg</div>
                                  <div className="mt-1 text-xl font-black leading-none text-[#16274F]">{(s.avgPF ?? 0).toFixed(1)}</div>
                                </div>
                              </div>

                              <div className="hidden lg:flex min-w-0 items-center gap-2 border-l border-[#0A0A0A]/10 pl-3">
                                {getTeamLogo(getTeam(bestPF)) ? (
                                  <img src={getTeamLogo(getTeam(bestPF))} alt={getTeam(bestPF) || ''} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-[#F4FAF5]" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-[#1E8E3E]">Best PF</div>
                                  <div className="mt-0.5 text-lg font-black leading-none text-[#1E8E3E]">{parseNumber(getField(bestPF, 'PF', 'pf')).toFixed(2)}</div>
                                  <div className="mt-0.5 truncate text-[7px] font-black uppercase text-[#6B7280]">{getTeam(bestPF) || '—'}</div>
                                </div>
                              </div>

                              <div className="hidden lg:flex min-w-0 items-center gap-2 border-l border-[#0A0A0A]/10 pl-3">
                                {getTeamLogo(getTeam(worstPF)) ? (
                                  <img src={getTeamLogo(getTeam(worstPF))} alt={getTeam(worstPF) || ''} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-[#FDEDEE]" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-[#D01F2D]">Worst PF</div>
                                  <div className="mt-0.5 text-lg font-black leading-none text-[#D01F2D]">{parseNumber(getField(worstPF, 'PF', 'pf')).toFixed(2)}</div>
                                  <div className="mt-0.5 truncate text-[7px] font-black uppercase text-[#6B7280]">{getTeam(worstPF) || '—'}</div>
                                </div>
                              </div>

                              <div className="hidden lg:grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-l border-[#0A0A0A]/10 pl-3">
                                {unicornLogo ? (
                                  <img
                                    src={unicornLogo}
                                    alt={s.unicorn || 'Unicorn'}
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7EAF8] text-base">
                                    🦄
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-[7px] font-black uppercase tracking-[0.15em] text-[#7A3F91]">Unicorn</div>
                                  <div className="truncate text-[10px] font-black uppercase text-[#16274F]">{s.unicorn || '—'}</div>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 justify-self-end text-[#16274F]" />
                              </div>
                            </div>
                          )}
                        </button>

                        {/* EXPANDED SEASON */}
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="border-t-2 border-[#0A0A0A]/10 p-4 sm:p-5">
                                {/* TOP SUMMARY CARDS */}
                                <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
{/* CHAMPION */}
                                  <Link href={teamHref(s.champion)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="h-full border-2 border-[#B8860B]/35 bg-[#FFF9E5] p-4 shadow-[3px_3px_0_#16274F]">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-[#B8860B]" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#B8860B]">Champion</div>
                                      </div>
                                      <span className="bg-[#F5C518] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#0A0A0A]">Title</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {championLogo ? (
                                        <img src={championLogo} alt={s.champion || 'Champion'} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                                      ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#16274F] text-[10px] font-black text-white">
                                          {String(s.champion || '—').slice(0,2).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-lg font-black leading-tight text-[#16274F]">{s.champion || '—'}</div>
                                        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">Season champion</div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                      <div className="border border-[#0A0A0A]/15 bg-white px-2.5 py-2">
                                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Reg Season</div>
                                        <div className="mt-1 text-base font-black text-[#16274F]">{s.championRecord?.wins ?? 0}–{s.championRecord?.losses ?? 0}</div>
                                      </div>
                                      <div className="border border-[#B8860B]/25 bg-[#F7F6F2] px-2.5 py-2">
                                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Playoffs</div>
                                        <div className="mt-1 text-base font-black text-[#16274F]">{s.playoffGames.filter(g => g?.result === 'W').length}–{s.playoffGames.filter(g => g?.result === 'L').length}</div>
                                      </div>
                                    </div>
                                  </div>
                                  </Link>

{/* CHAMPIONSHIP FINAL */}
                                <Link href={matchupHref(s.championshipFinalGame)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="h-full min-w-0 border-2 border-[#B8860B]/35 bg-white p-3.5 sm:p-4 shadow-[4px_4px_0_#16274F]">
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 text-[#B8860B]">
                                        <Trophy className="h-4 w-4 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em]">Tapitas Bowl</span>
                                      </div>
                                    </div>
                                    <span className="shrink-0 bg-[#F5C518] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#0A0A0A]">Final</span>
                                  </div>

                                  {/* MOBILE */}
                                  <div className="grid grid-cols-1 items-center gap-5 min-[560px]:hidden">
                                    <div className="min-w-0 text-center">
                                      {championLogo ? (
                                        <img src={championLogo} alt={s.champion || 'Champion'} className="mx-auto h-14 w-14 rounded-full object-cover" />
                                      ) : (
                                        <div className="mx-auto h-14 w-14 rounded-full bg-[#16274F]" />
                                      )}
                                      <div className="mt-2">
                                        <div className="break-words text-[10px] font-black uppercase leading-tight text-[#16274F]">{s.champion || '—'}</div>
                                        <div className="mt-1.5 text-[19px] font-black leading-none tracking-[-0.04em] text-[#D01F2D]">
                                          {s.championshipScore?.toFixed(2) ?? '—'}
                                        </div>
                                        <div className="mt-1.5 inline-flex bg-[#F5C518] px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-[#0A0A0A]">Champion</div>
                                      </div>
                                    </div>
                                    <div className="min-w-0 border-y border-[#B8860B]/20 px-3 py-3 text-center">
                                      <div className="text-[7px] font-black uppercase tracking-[0.16em] text-[#6B7280]">Final Score</div>
                                      <div className="mt-1 whitespace-nowrap text-[20px] font-black tracking-[-0.05em] text-[#16274F]">
                                        {s.championshipScore?.toFixed(2) ?? '—'}
                                        <span className="mx-1.5 text-[#B8860B]">–</span>
                                        {s.championshipOpponentScore?.toFixed(2) ?? '—'}
                                      </div>
                                    </div>
                                    <div className="min-w-0 text-center">
                                      {getTeamLogo(s.championshipOpponent) ? (
                                        <img src={getTeamLogo(s.championshipOpponent)} alt={s.championshipOpponent || 'Runner-up'} className="mx-auto h-14 w-14 rounded-full object-cover" />
                                      ) : (
                                        <div className="mx-auto h-14 w-14 rounded-full bg-[#16274F]" />
                                      )}
                                      <div className="mt-2">
                                        <div className="break-words text-[10px] font-black uppercase leading-tight text-[#16274F]">{s.championshipOpponent || '—'}</div>
                                        <div className="mt-1.5 text-[19px] font-black leading-none tracking-[-0.04em] text-[#6B7280]">
                                          {s.championshipOpponentScore?.toFixed(2) ?? '—'}
                                        </div>
                                        <div className="mt-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-[#6B7280]">Runner-up</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* TABLET / DESKTOP: matchup layout */}
                                  <div className="hidden min-[520px]:grid grid-cols-[minmax(0,1fr)_58px_minmax(0,1fr)] items-start gap-2 min-[700px]:grid-cols-[minmax(0,1fr)_70px_minmax(0,1fr)] min-[700px]:gap-3">
                                    <div className="min-w-0 text-center">
                                      {championLogo ? (
                                        <img
                                          src={championLogo}
                                          alt={s.champion || 'Champion'}
                                          className="mx-auto h-12 w-12 rounded-full object-cover min-[700px]:h-14 min-[700px]:w-14"
                                        />
                                      ) : (
                                        <div className="mx-auto h-12 w-12 rounded-full bg-[#16274F] min-[700px]:h-14 min-[700px]:w-14" />
                                      )}
                                      <div className="mt-1.5 min-w-0 px-0.5">
                                        <div className="break-words text-[10px] font-black leading-[1.04] text-[#16274F] min-[700px]:text-[11px]">{s.champion || '—'}</div>
                                        <div className="mt-1.5 whitespace-nowrap text-[19px] font-black leading-none tracking-[-0.04em] text-[#D01F2D] min-[700px]:text-[24px]">
                                          {s.championshipScore?.toFixed(2) ?? '—'}
                                        </div>
                                        <div className="mt-1.5 text-[6px] font-black uppercase tracking-[0.07em] text-[#B8860B] min-[700px]:text-[7px]">Champion</div>
                                      </div>
                                    </div>

                                    <div className="flex min-w-0 flex-col items-center justify-start pt-6 text-center min-[700px]:pt-7">
                                      <span className="text-[22px] font-black leading-none uppercase tracking-[-0.04em] text-[#6B7280] min-[700px]:text-[26px]">vs</span>
                                      <span className="mt-2 whitespace-nowrap text-[11px] font-black leading-none text-[#6B7280] min-[700px]:text-[12px]">
                                        {Number.isFinite(s.championshipScore) && Number.isFinite(s.championshipOpponentScore)
                                          ? Math.abs(s.championshipScore - s.championshipOpponentScore).toFixed(2)
                                          : '—'}
                                      </span>
                                      <span className="mt-0.5 text-[6px] font-black uppercase tracking-[0.14em] text-[#6B7280] min-[700px]:text-[7px]">Margin</span>
                                      <span className="mt-2 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.07em] text-[#D01F2D] min-[700px]:text-[9px]">← Win</span>
                                    </div>

                                    <div className="min-w-0 text-center">
                                      {getTeamLogo(s.championshipOpponent) ? (
                                        <img
                                          src={getTeamLogo(s.championshipOpponent)}
                                          alt={s.championshipOpponent || 'Runner-up'}
                                          className="mx-auto h-12 w-12 rounded-full object-cover min-[700px]:h-14 min-[700px]:w-14"
                                        />
                                      ) : (
                                        <div className="mx-auto h-12 w-12 rounded-full bg-[#16274F] min-[700px]:h-14 min-[700px]:w-14" />
                                      )}
                                      <div className="mt-1.5 min-w-0 px-0.5">
                                        <div className="break-words text-[10px] font-black leading-[1.04] text-[#6B7280] min-[700px]:text-[11px]">{s.championshipOpponent || '—'}</div>
                                        <div className="mt-1.5 whitespace-nowrap text-[19px] font-black leading-none tracking-[-0.04em] text-[#6B7280] min-[700px]:text-[24px]">
                                          {s.championshipOpponentScore?.toFixed(2) ?? '—'}
                                        </div>
                                        <div className="mt-1.5 text-[6px] font-black uppercase tracking-[0.07em] text-[#6B7280] min-[700px]:text-[7px]">Runner-up</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                </Link>

                                {/* UNICORN */}
                                  <Link href={teamHref(s.unicorn)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="h-full border-2 border-[#8B5AA8]/35 bg-[#F7EAF8] p-4 shadow-[3px_3px_0_#16274F]">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-base leading-none">🦄</span>
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7A3F91]">Unicorn</div>
                                      </div>
                                      <span className="bg-[#8B5AA8] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">Worst Team</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {unicornLogo ? (
                                        <img src={unicornLogo} alt={s.unicorn || 'Unicorn'} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                                      ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl">🦄</div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-lg font-black leading-tight text-[#16274F]">{s.unicorn || '—'}</div>
                                        <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#7A3F91]">Unicorn team</div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                      <div className="border border-[#0A0A0A]/15 bg-white px-2.5 py-2">
                                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Reg Season</div>
                                        <div className="mt-1 text-base font-black text-[#16274F]">
                                          {(() => {
                                            const uniGames = games.filter(g =>
                                              getSeason(g) === s.season &&
                                              getTeam(g) === String(s.unicorn || '').trim()
                                            )
                                            const rs = uniGames.filter(g => getStage(g) === 'reg season')
                                            return `${rs.filter(g => getResult(g) === 'W').length}–${rs.filter(g => getResult(g) === 'L').length}`
                                          })()}
                                        </div>
                                      </div>
                                      <div className="border border-[#8B5AA8]/25 bg-[#F7F6F2] px-2.5 py-2">
                                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Consolation</div>
                                        <div className="mt-1 text-base font-black text-[#16274F]">
                                          {(() => {
                                            const uniGames = games.filter(g =>
                                              getSeason(g) === s.season &&
                                              getTeam(g) === String(s.unicorn || '').trim()
                                            )
                                            const con = uniGames.filter(g => getStage(g) === 'consolation')
                                            return `${con.filter(g => getResult(g) === 'W').length}–${con.filter(g => getResult(g) === 'L').length}`
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  </Link>
                                </div>                                {/* SEASON HIGHLIGHTS */}
                                <div className="mt-4">
                                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#16274F]">
                                    Season Highlights
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-3">
                                    {/* HIGHEST SCORE */}
                                    <Link href={matchupHref(s.highestScoreGame)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="border-2 border-[#1E8E3E]/25 bg-[#F4FAF5] p-4 shadow-[3px_3px_0_#16274F]">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Flame className="h-4 w-4 text-[#1E8E3E]" />
                                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1E8E3E]">Highest Score</div>
                                        </div>
                                        {getTeam(s.highestScoreGame) && getTeamLogo(getTeam(s.highestScoreGame)) && (
                                          <img src={getTeamLogo(getTeam(s.highestScoreGame))} alt="" className="h-10 w-10 rounded-full object-cover" />
                                        )}
                                      </div>
                                      <div className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#16274F]">{parseNumber(getField(s.highestScoreGame, 'PF', 'pf')).toFixed(2)}</div>
                                      <div className="mt-2 text-lg font-black text-[#1E8E3E]">{getTeam(s.highestScoreGame) || '—'}</div>
                                      <div className="mt-1 text-[11px] font-bold text-[#3F4757]">{parseNumber(getField(s.highestScoreGame, 'PF', 'pf')).toFixed(2)} — {parseNumber(getField(s.highestScoreGame, 'PA', 'pa')).toFixed(2)} vs {getOpponent(s.highestScoreGame) || '—'}</div>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">Week {getField(s.highestScoreGame, 'Week', 'week') || '—'}</span>
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">{getField(s.highestScoreGame, 'GameType', 'gameType') || 'Reg Season'}</span>
                                      </div>
                                    </div>
                                      </Link>

                                    {/* CLOSEST GAME */}
                                    <Link href={matchupHref(s.closestGame)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="border-2 border-[#2D6CDF]/25 bg-[#F3F7FF] p-4 shadow-[3px_3px_0_#16274F]">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Swords className="h-4 w-4 text-[#15805D]" />
                                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#15805D]">Closest Game</div>
                                        </div>
                                        {getTeam(s.closestGame) && (
                                          <div className="flex -space-x-2">
                                            <img src={getTeamLogo(getTeam(s.closestGame)) || '/images/teams/default.png'} alt="" className="h-9 w-9 rounded-full border-2 border-[#F3FBF7] object-cover" />
                                            <img src={getTeamLogo(getOpponent(s.closestGame)) || '/images/teams/default.png'} alt="" className="h-9 w-9 rounded-full border-2 border-[#F3FBF7] object-cover" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#16274F]">{Math.abs(parseNumber(getField(s.closestGame, 'PF', 'pf')) - parseNumber(getField(s.closestGame, 'PA', 'pa'))).toFixed(2)}</div>
                                      <div className="mt-2 text-lg font-black text-[#15805D]">{getTeam(s.closestGame) || '—'}</div>
                                      <div className="mt-1 text-[11px] font-bold text-[#3F4757]">{parseNumber(getField(s.closestGame, 'PF', 'pf')).toFixed(2)} — {parseNumber(getField(s.closestGame, 'PA', 'pa')).toFixed(2)} vs {getOpponent(s.closestGame) || '—'}</div>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">Week {getField(s.closestGame, 'Week', 'week') || '—'}</span>
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">{getField(s.closestGame, 'GameType', 'gameType') || 'Reg Season'}</span>
                                      </div>
                                    </div>
                                      </Link>

                                    {/* BIGGEST WIN */}
                                    <Link href={matchupHref(s.biggestBlowout)} className="block h-full min-w-0 transition-transform hover:-translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16274F]">
<div className="border-2 border-[#D88719]/25 bg-[#FFF6E8] p-4 shadow-[3px_3px_0_#16274F]">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <Zap className="h-4 w-4 text-[#7A3F91]" />
                                          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7A3F91]">Biggest Win</div>
                                        </div>
                                        {getTeam(s.biggestBlowout) && getTeamLogo(getTeam(s.biggestBlowout)) && (
                                          <img src={getTeamLogo(getTeam(s.biggestBlowout))} alt="" className="h-10 w-10 rounded-full object-cover" />
                                        )}
                                      </div>
                                      <div className="mt-4 text-4xl font-black tracking-[-0.04em] text-[#16274F]">{Math.abs(parseNumber(getField(s.biggestBlowout, 'PF', 'pf')) - parseNumber(getField(s.biggestBlowout, 'PA', 'pa'))).toFixed(2)}</div>
                                      <div className="mt-2 text-lg font-black text-[#7A3F91]">{getTeam(s.biggestBlowout) || '—'}</div>
                                      <div className="mt-1 text-[11px] font-bold text-[#3F4757]">{parseNumber(getField(s.biggestBlowout, 'PF', 'pf')).toFixed(2)} — {parseNumber(getField(s.biggestBlowout, 'PA', 'pa')).toFixed(2)} vs {getOpponent(s.biggestBlowout) || '—'}</div>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">Week {getField(s.biggestBlowout, 'Week', 'week') || '—'}</span>
                                        <span className="border border-[#0A0A0A]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">{getField(s.biggestBlowout, 'GameType', 'gameType') || 'Reg Season'}</span>
                                      </div>
                                    </div>
                                      </Link>
                                  </div>
                                </div>

                                {/* FULL CHAMPIONSHIP RUN */}
                                <div className="mt-4 border-2 border-[#0A0A0A]/20 bg-white p-4 shadow-[3px_3px_0_#16274F]">
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Flag className="h-4 w-4 text-[#D01F2D]" />
                                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#16274F]">Championship Run</div>
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-[#6B7280]">Full campaign</div>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                                    <div>
                                      <div className="mb-2 text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Regular Season</div>
                                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                                        {s.regGames.map((g,index)=>(
                                          <div key={`rs-${index}`} className="flex min-w-0 items-center gap-2 border border-[#0A0A0A]/10 bg-[#F7F6F2] px-2.5 py-2">
                                            <span className={`shrink-0 text-[11px] font-black ${g.result==='W'?'text-[#1E8E3E]':'text-[#D01F2D]'}`}>{g.result}</span>
                                            <div className="min-w-0">
                                              <div className="truncate text-[9px] font-bold text-[#3F4757]">vs {g.opp}</div>
                                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-[#9CA3AF]">Week {g.week || '—'}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="lg:border-l lg:border-[#0A0A0A]/10 lg:pl-4">
                                      <div className="mb-2 text-[8px] font-black uppercase tracking-[0.15em] text-[#B8860B]">Playoffs</div>
                                      <div className="space-y-1.5">
                                        {s.playoffGames.map((g,index)=>{
                                          const isFinal=getGameType(g)==='tapitas bowl'
                                          return (
                                            <div key={`po-${index}`} className={`flex items-center justify-between gap-2 border px-2.5 py-2 ${isFinal?'border-[#F5C518] bg-[#FFF9E5]':'border-[#0A0A0A]/10 bg-[#F7F6F2]'}`}>
                                              <div className="flex min-w-0 items-center gap-2">
                                                <span className={`shrink-0 text-[11px] font-black ${g.result==='W'?'text-[#1E8E3E]':'text-[#D01F2D]'}`}>{g.result}</span>
                                                <div className="min-w-0">
                                              <div className="truncate text-[9px] font-bold text-[#3F4757]">vs {g.opp}</div>
                                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-[#9CA3AF]">Week {g.week || '—'}</div>
                                            </div>
                                              </div>
                                              {isFinal && <span className="shrink-0 text-[8px] font-black uppercase tracking-[0.12em] text-[#B8860B]">Final</span>}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* RECAP */}
                                {s.recap && (
                                  <div className="mt-3 border border-[#0A0A0A]/25 bg-white p-4 sm:p-5">
                                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#16274F]">Season Recap</div>
                                    <div className="max-w-5xl text-sm leading-relaxed text-[#3F4757]">
                                      <ReactMarkdown
                                        components={{
                                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                          strong: ({ children }) => <strong className="font-black text-[#16274F]">{children}</strong>,
                                          em: ({ children }) => <em className="font-bold not-italic text-[#D01F2D]">{children}</em>,
                                          h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-black text-[#16274F]">{children}</h3>,
                                          h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-black text-[#16274F]">{children}</h3>,
                                          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-black text-[#16274F]">{children}</h3>,
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
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-50" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C0D0]">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}
