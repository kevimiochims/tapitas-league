'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
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
          className={`text-[13px] font-black ${
            game.result === 'W'
              ? 'text-[#1E8E3E]'
              : 'text-[#D01F2D]'
          }`}
        >
          {game.result}
        </span>

        <span className="truncate text-[13px] text-[#3F4757]">
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
          className="flex h-full w-full items-center justify-center bg-[#F7F6F2] font-black text-[#3F4757]"
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
    // Only show seasons that have a completed final (Tapitas Bowl winner)
    const completedSeasons = [
      ...new Set(
        games
          .filter(g =>
            String(g?.GameType || '').trim().toLowerCase() === 'tapitas bowl' &&
            String(g?.Result || '').trim().toUpperCase() === 'W'
          )
          .map(g => String(g?.Season || '').trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(b) - Number(a))

    return completedSeasons.map(season => {
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
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-red { box-shadow: 6px 6px 0 0 #D01F2D; }
        .tp-shadow-red-sm { box-shadow: 4px 4px 0 0 #D01F2D; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
        .tp-stack-title { color: #D01F2D; text-shadow: 4px 4px 0 #0A0A0A; }
      `}</style>

      {/* HEADER */}
      <Header />

      <section className="px-3 md:px-6 pb-20">
        <div className="relative mb-10 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy">
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
                            League
                            <span className="tp-stack-title">{' '}History</span>
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
          <div className="flex justify-center py-20 text-[#6B7280] font-bold">
            Loading history...
          </div>
        ) : (
          <div className="relative mx-auto max-w-6xl">
            {/* CENTER LINE */}
            <div className="absolute left-5 md:left-1/2 top-0 h-full w-px md:-translate-x-1/2 bg-[#16274F]/15" />

            <div className="space-y-12">
              {seasonData.map((s, i) => {
                const open = openSeason === s.season
                const theme = getSeasonTheme(
                  s.season,
                  seasonData[0]?.season
                )
                const alignRight = i % 2 !== 0

                return (
                  <motion.div
                    key={s.season}
                    ref={(el) => {
                      cardRefs.current[s.season] = el
                    }}
                    style={{ scrollMarginTop: 90 }}
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
                    className={`relative flex ${alignRight
                      ? 'md:justify-end'
                      : 'md:justify-start'
                      } ${open ? 'z-30' : 'z-0'}`}
                  >
                    {/* DOT */}
                    <div className="absolute left-5 md:left-1/2 top-12 z-20 h-4 w-4 -translate-x-1/2 rounded-full border-4 border-[#F7F6F2] bg-[#D01F2D] shadow-sm" />
                    {/* CARD */}
                    <motion.div
                      layout
                      transition={{
                        layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                      }}
                      className={`relative pr-2 md:px-0 ${
                        open
                          ? 'w-[calc(100%-12px)] pl-3 md:w-[78%]'
                          : 'w-full pl-14 md:w-[calc(50%-40px)]'
                      }`}
                    >
                      <div
                        className={`relative overflow-hidden  border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm ${theme.border} ${
                          open ? 'tp-shadow-navy' : ''
                        }`}
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
                            handleToggleSeason(s.season)
                          }
                          className="relative z-10 w-full p-6 text-left sm:p-7"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <>
                              {/* LEFT */}
                              <div>

                                <div
                                  className={`mb-3 inline-flex items-center gap-2  border px-3 py-1 ${theme.border} ${theme.bg}`}
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
                                    fontSize:
                                      'clamp(48px,6vw,82px)',
                                  }}
                                >
                                  {s.season}
                                </h2>

                                {s.champion && (
                                  <div className="mt-3 flex items-center gap-2 text-[#6B7280]">
                                    <Trophy className="h-4 w-4 text-[#B8860B]" />

                                    <span className="text-sm font-bold">
                                      Champion:{' '}
                                      <span className="text-[#16274F]">
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
                                  <div className="absolute -left-1 -top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[#D01F2D]/30 bg-[#0f172a] shadow-lg shadow-black/40">
                                    <Trophy className="h-3.5 w-3.5 text-[#D01F2D]" />
                                  </div>

                                  {/* Logo */}
                                  <div
                                    className={`relative h-20 w-20 overflow-hidden rounded-full border-2 ${theme.border} bg-[#F7F6F2]`}
                                  >
                                    <Image
                                      src={
                                        getTeamLogo(s.champion) ||
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
                                  className={`h-6 w-6 text-[#6B7280] transition-transform ${open ? 'rotate-180' : ''
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
                              <div className="px-6 pb-7 sm:px-7">
                                {/* STATS GRID */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  {/* CHAMP */}
                                  <div className="relative  border-2 border-[#0A0A0A] bg-[#FFF9E5] p-5 tp-shadow-navy-sm">
                                    {s.champion && (
                                      <CardAvatars>
                                        <TeamAvatar
                                          name={s.champion}
                                        />
                                      </CardAvatars>
                                    )}

                                    <div className="mb-4 flex items-center gap-2">
                                      <Crown className="h-4 w-4 text-[#B8860B]" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B8860B]">
                                        Champion
                                      </span>
                                    </div>

                                    <div className="text-2xl font-black text-[#16274F]">
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
                                          <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                              Reg Season
                                            </div>

                                            <div className="mt-1 text-sm font-black text-[#16274F]">
                                              {regWins}-{regLosses}
                                            </div>
                                          </div>

                                          {/* Playoffs */}
                                          <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                              Playoffs
                                            </div>

                                            <div className="mt-1 text-sm font-black text-[#16274F]">
                                              {poWins}-{poLosses}
                                            </div>
                                          </div>

                                        </div>
                                      )
                                    })()}
                                  </div>

                                  {/* UNICORN */}
                                  <div className="relative  border-2 border-[#0A0A0A] bg-[#F7EAF8] p-5 tp-shadow-navy-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                      🦄
                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B8860B]">
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
                                          <div className="text-2xl font-black text-[#16274F]">
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
                                          <CardAvatars>
                                            <TeamAvatar
                                              name={unicornTeam}
                                            />
                                          </CardAvatars>

                                          <div className="text-2xl font-black text-[#16274F]">
                                            {unicornTeam}
                                          </div>

                                          <div className="mt-4 flex flex-wrap gap-2">

                                            {/* Regular Season */}
                                            <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                                Reg Season
                                              </div>

                                              <div className="mt-1 text-sm font-black text-[#16274F]">
                                                {regWins}-{regLosses}
                                              </div>
                                            </div>

                                            {/* Consolation */}
                                            <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                                Consolation
                                              </div>

                                              <div className="mt-1 text-sm font-black text-[#16274F]">
                                                {conWins}-{conLosses}
                                              </div>
                                            </div>

                                          </div>
                                        </>
                                      )
                                    })()}
                                  </div>

                                  {/* HIGHEST SCORE */}
                                  <div className="relative  border-2 border-[#0A0A0A] bg-[#FDEDEE] p-5 tp-shadow-navy-sm">
                                    {s.highestScoreGame?.Team && (
                                      <CardAvatars>
                                        <TeamAvatar
                                          name={s.highestScoreGame.Team}
                                        />
                                      </CardAvatars>
                                    )}

                                    <div className="mb-4 flex items-center gap-2">
                                      <Flame className="h-4 w-4 text-[#D01F2D]" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D01F2D]">
                                        Highest Score
                                      </span>
                                    </div>

                                    {/* Main Score */}
                                    <div className="text-4xl font-black text-[#16274F]">
                                      {parseNumber(
                                        s.highestScoreGame?.PF
                                      ).toFixed(2)}
                                    </div>

                                    {/* Team */}
                                    <div className="mt-3 text-xl font-black text-[#D01F2D]">
                                      {s.highestScoreGame?.Team}
                                    </div>

                                    {/* Final Score */}
                                    <div className="mt-2 text-sm font-bold text-[#3F4757]">
                                      {parseNumber(s.highestScoreGame?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.highestScoreGame?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.highestScoreGame?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.highestScoreGame?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.highestScoreGame?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* CLOSEST GAME */}
                                  <div className="relative  border-2 border-[#0A0A0A] bg-[#F7F6F2] p-5 tp-shadow-navy-sm">
                                    {s.closestGame?.Team && (
                                      <CardAvatars>
                                        <div className="flex items-center -space-x-3">
                                          <TeamAvatar
                                            name={s.closestGame.Team}
                                            ringClass="ring-2 ring-[#0a1f17]"
                                          />
                                          <TeamAvatar
                                            name={s.closestGame.Opponent}
                                            ringClass="ring-2 ring-[#0a1f17]"
                                          />
                                        </div>
                                      </CardAvatars>
                                    )}

                                    <div className="mb-4 flex items-center gap-2">
                                      <Swords className="h-4 w-4 text-[#16274F]" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#16274F]">
                                        Closest Game
                                      </span>
                                    </div>

                                    {/* Margin */}
                                    <div className="text-4xl font-black text-[#16274F]">
                                      {Math.abs(
                                        parseNumber(s.closestGame?.PF) -
                                        parseNumber(s.closestGame?.PA)
                                      ).toFixed(2)}
                                    </div>

                                    {/* Matchup */}
                                    <div className="mt-3 text-lg font-black text-[#D01F2D]">
                                      {s.closestGame?.Team}
                                    </div>

                                    {/* Score */}
                                    <div className="mt-2 text-sm font-bold text-[#3F4757]">
                                      {parseNumber(s.closestGame?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.closestGame?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.closestGame?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.closestGame?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.closestGame?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* BIGGEST WIN */}
                                  <div className="relative  border-2 border-[#0A0A0A] bg-white p-5 tp-shadow-navy-sm md:col-span-2">
                                    {s.biggestBlowout?.Team && (
                                      <CardAvatars>
                                        <TeamAvatar
                                          name={s.biggestBlowout.Team}
                                        />
                                      </CardAvatars>
                                    )}

                                    <div className="mb-4 flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-[#D01F2D]" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D01F2D]">
                                        Biggest Win
                                      </span>
                                    </div>

                                    {/* Margin */}
                                    <div className="text-4xl font-black text-[#16274F]">
                                      {Math.abs(
                                        parseNumber(s.biggestBlowout?.PF) -
                                        parseNumber(s.biggestBlowout?.PA)
                                      ).toFixed(2)}
                                    </div>

                                    {/* Winner */}
                                    <div className="mt-3 text-xl font-black text-[#D01F2D]">
                                      {s.biggestBlowout?.Team}
                                    </div>

                                    {/* Final Score */}
                                    <div className="mt-2 text-sm font-bold text-[#3F4757]">
                                      {parseNumber(s.biggestBlowout?.PF).toFixed(2)}
                                      {' — '}
                                      {parseNumber(s.biggestBlowout?.PA).toFixed(2)}
                                      {' vs '}
                                      {s.biggestBlowout?.Opponent}
                                    </div>

                                    {/* Extra Info */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2">

                                      {/* Week */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Week
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.biggestBlowout?.Week}
                                        </div>
                                      </div>

                                      {/* Game Type */}
                                      <div className=" border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                                          Game Type
                                        </div>

                                        <div className="mt-1 text-sm font-black text-[#16274F]">
                                          {s.biggestBlowout?.GameType || 'Reg Season'}
                                        </div>
                                      </div>

                                    </div>
                                  </div>

                                  {/* =====================================================
                                  GAME LOG
                                  ===================================================== */}

                                  <div className="mt-5  border-2 border-[#0A0A0A] bg-white p-5 tp-shadow-navy-sm md:col-span-2">
                                    <div className="mb-5 flex items-center gap-2">
                                      <Flag className="h-4 w-4 text-[#D01F2D]" />

                                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D01F2D]">
                                        Championship Run
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                      {/* TITLES ROW */}
                                      <div className="col-span-2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.15em] text-[#6B7280]">
                                        Reg Season
                                      </div>

                                      <div className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.15em] text-[#D01F2D]">
                                        Playoffs
                                      </div>

                                      {/* REG SEASON COL 1 */}

                                      <div>
                                        {s.regCol1.map((g, i) => (
                                          <GameRow
                                            key={i}
                                            game={g}
                                          />
                                        ))}
                                      </div>

                                      {/* REG SEASON COL 2 */}

                                      <div>
                                        {s.regCol2.map((g, i) => (
                                          <GameRow
                                            key={i}
                                            game={g}
                                          />
                                        ))}
                                      </div>

                                      {/* PLAYOFFS */}

                                      <div>
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
                                          <div className="text-[11px] text-[#6B7280]">
                                            Sem dados
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* RECAP */}
                                {s.recap && (
                                  <div className="mt-5  border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] p-6">

                                    <div className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280]">
                                      Season Recap
                                    </div>

                                    <div className="text-sm leading-relaxed text-justify">
                                      <ReactMarkdown
                                        components={{
                                          h1: ({ children }) => (
                                            <h1 className="text-2xl font-black text-[#16274F] mb-4 mt-6 leading-tight">
                                              {children}
                                            </h1>
                                          ),

                                          h2: ({ children }) => (
                                            <h2 className="text-xl font-black text-[#16274F] mb-3 mt-5 leading-tight">
                                              {children}
                                            </h2>
                                          ),

                                          h3: ({ children }) => (
                                            <h3 className="text-lg font-black text-[#16274F] mb-2 mt-4">
                                              {children}
                                            </h3>
                                          ),

                                          p: ({ children }) => (
                                            <p className="text-[#3F4757] mb-3 leading-relaxed text-justify">
                                              {children}
                                            </p>
                                          ),

                                          strong: ({ children }) => (
                                            <strong className="text-[#16274F] font-black">
                                              {children}
                                            </strong>
                                          ),

                                          em: ({ children }) => (
                                            <em className="text-[#D01F2D] not-italic font-bold">
                                              {children}
                                            </em>
                                          ),

                                          ul: ({ children }) => (
                                            <ul className="list-disc list-inside mb-3 text-[#3F4757] space-y-1">
                                              {children}
                                            </ul>
                                          ),

                                          ol: ({ children }) => (
                                            <ol className="list-decimal list-inside mb-3 text-[#3F4757] space-y-1">
                                              {children}
                                            </ol>
                                          ),

                                          li: ({ children }) => (
                                            <li className="text-[#3F4757]">
                                              {children}
                                            </li>
                                          ),

                                          hr: () => (
                                            <hr className="border-[#0A0A0A]/10 my-4" />
                                          ),

                                          blockquote: ({ children }) => (
                                            <blockquote className="border-l-2 border-[#D01F2D] pl-4 my-3 text-[#6B7280] italic">
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
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={24}
            height={24}
            style={{ filter: 'invert(1)' }}
            className="opacity-50"
          />

          <span className="text-xs font-black uppercase tracking-[0.3em] text-[#B8C0D0]">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>
    </main>
  )
}