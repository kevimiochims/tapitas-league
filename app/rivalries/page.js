'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import {
  Activity,
  ChevronDown,
  Flame,
  Stars,
  Swords
} from 'lucide-react'

import { motion } from 'framer-motion'

const SHEET_ID =
  '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'

const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

/* =====================================================
UTILS
===================================================== */

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  const text = String(value)
    .replace(',', '.')
    .trim()

  const parsed = parseFloat(text)

  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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

function getRivalryHeat(
  games,
  aWins,
  bWins,
  avgMargin
) {
  const totalGames = parseNumber(games)

  const winsA = parseNumber(aWins)

  const winsB = parseNumber(bWins)

  const recordGap = Math.abs(winsA - winsB)

  const margin =
    Math.abs(parseFloat(String(avgMargin).replace(',', '.')) || 0)

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

  if (score >= 13) return 'LEGENDARY'

  if (score >= 10) return 'ELITE'

  if (score >= 7) return 'HIGH'

  if (score >= 4) return 'MEDIUM'

  return 'LOW'
}

/* =====================================================
PARSERS
===================================================== */

function parseCurrentStreak(streak) {
  if (!streak || streak === '—') return null

  const text = String(streak)

  const match = text.match(
    /(.*?)\s([WL])(\d+)/i
  )

  if (!match) {
    return {
      raw: text,
      team: text,
      result: '',
      count: ''
    }
  }

  return {
    raw: text,


    team: match[1].trim(),

    result: match[2],

    count: match[3]


  }
}

function parseBestStreak(streak) {
  if (!streak || streak === '—') return null

  const text = String(streak)

  const match = text.match(
    /(.*?)\s([WL])(\d+)\s((.*?)\s→\s(.*?))/i
  )

  if (!match) {
    return {
      raw: text
    }
  }

  return {
    team: match[1].trim(),


    result: match[2],

    count: match[3],

    start: match[4].replace(
      /W(\d+)/,
      'Week $1'
    ),

    end: match[5].replace(
      /W(\d+)/,
      'Week $1'
    )


  }
}

function parseBiggestWin(value) {
  if (!value || value === '—') return null

  const text = String(value)

  const scoreMatch = text.match(
    /(\d+(?:.\d+)?)\s*-\s*(\d+(?:.\d+)?)/
  )

  const marginMatch = text.match(
    /(+?(\d+(?:.\d+)?))/
  )

  const weekMatch = text.match(
    /(\d{4}\sW\d+)/
  )

  return {
    raw: text,


    scoreA: scoreMatch?.[1] || '0',

    scoreB: scoreMatch?.[2] || '0',

    margin: marginMatch?.[1] || '0',

    game: weekMatch?.[1]
      ? weekMatch[1].replace(
        /W(\d+)/,
        'Week $1'
      )
      : ''


  }
}

/* =====================================================
BADGE
===================================================== */

function HeatBadge({ heat }) {
  const colors = {
    LEGENDARY:
      'bg-yellow-400/15 text-yellow-300 border-yellow-400/20',


    ELITE:
      'bg-orange-400/15 text-orange-300 border-orange-400/20',

    HIGH:
      'bg-cyan-400/15 text-cyan-300 border-cyan-400/20',

    MEDIUM:
      'bg-slate-400/15 text-slate-300 border-slate-400/20',

    LOW:
      'bg-slate-700/20 text-slate-500 border-slate-700/20'


  }

  return (
    <div
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.3em] ${colors[heat]}`}
    >
      {heat} </div>
  )
}

/* =====================================================
PAGE
===================================================== */

export default function RivalriesPage() {
  const [h2hData, setH2hData] = useState([])

  const [gamesData, setGamesData] = useState([])

  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(null)

  const [filterHeat, setFilterHeat] =
    useState('ALL')

  const [teamFilterA, setTeamFilterA] =
    useState('ALL')

  const [teamFilterB, setTeamFilterB] =
    useState('ALL')

  const [mobileSidebar, setMobileSidebar] =
    useState(false)

  /* =====================================================
  LOAD
  ===================================================== */

  useEffect(() => {
    async function load() {
      const [h2h, games] = await Promise.all([
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),


        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`)
      ])

      setH2hData(h2h)

      setGamesData(games)

      setLoading(false)
    }

    load()


  }, [])

  /* =====================================================
  TEAMS
  ===================================================== */

  const allTeams = useMemo(() => {
    return [
      ...new Set(
        h2hData.flatMap((r) => [
          String(r['Team A'] || ''),
          String(r['Team B'] || '')
        ])
      )
    ]
      .filter(Boolean)
      .sort()
  }, [h2hData])

  /* =====================================================
  RIVALRIES
  ===================================================== */

  const rivalries = useMemo(() => {
    const seen = new Set()


    const result = []

    h2hData.forEach((r) => {
      const a = String(r?.['Team A'] || '').trim()

      const b = String(r?.['Team B'] || '').trim()

      if (!a || !b) return

      const key = [normalizeString(a), normalizeString(b)]
        .sort()
        .join('|')

      if (seen.has(key)) return

      seen.add(key)

      const heat = getRivalryHeat(
        r?.Games,
        r?.['A Wins'],
        r?.['B Wins'],
        r?.['Avg Margin']
      )

      result.push({
        teamA: a,

        teamB: b,

        games: parseNumber(r?.Games),

        aWins: parseNumber(r?.['A Wins']),

        bWins: parseNumber(r?.['B Wins']),

        avgMargin: String(
          r?.['Avg Margin'] || '0'
        ),

        aPoW: parseNumber(r?.['A PO_W']),

        bPoW: parseNumber(r?.['B PO_W']),

        aRsW: parseNumber(r?.['A RS_W']),

        bRsW: parseNumber(r?.['B RS_W']),

        streak: String(
          r?.['Current Streak'] || '—'
        ),

        biggestA: String(
          r?.['Biggest Win Team A'] || '—'
        ),

        biggestB: String(
          r?.['Biggest Win Team B'] || '—'
        ),

        bestA: String(
          r?.['Best Streak Team A'] || '—'
        ),

        bestB: String(
          r?.['Best Streak Team B'] || '—'
        ),

        heat
      })
    })

    return result
      .filter((r) => {
        const matchA =
          teamFilterA === 'ALL' ||
          r.teamA === teamFilterA ||
          r.teamB === teamFilterA

        const matchB =
          teamFilterB === 'ALL' ||
          (r.teamA === teamFilterA &&
            r.teamB === teamFilterB) ||
          (r.teamA === teamFilterB &&
            r.teamB === teamFilterA)

        const matchesHeat =
          filterHeat === 'ALL' ||
          r.heat === filterHeat

        return (
          matchA &&
          matchB &&
          matchesHeat
        )
      })
      .sort((a, b) => b.games - a.games)


  }, [
    h2hData,
    filterHeat,
    teamFilterA,
    teamFilterB
  ])

  /* =====================================================
  AUTO SELECT
  ===================================================== */

  useEffect(() => {
    if (!selected && rivalries.length > 0) {
      setSelected(rivalries[0])
    }
  }, [rivalries, selected])

  /* =====================================================
  HISTORY
  ===================================================== */

  const history = useMemo(() => {
    if (!selected) return []


    const games = gamesData.filter((g) => {
      const team = normalizeString(g.Team)

      const opp = normalizeString(g.Opponent)

      const a = normalizeString(selected.teamA)

      const b = normalizeString(selected.teamB)

      return (
        (team === a && opp === b) ||
        (team === b && opp === a)
      )
    })

    const uniqueGames = []

    const seen = new Set()

    games.forEach((g) => {
      const season = String(g.Season || '')

      const week = String(g.Week || '')

      const teams = [
        normalizeString(g.Team),
        normalizeString(g.Opponent)
      ]
        .sort()
        .join('|')

      const key = `${season}-${week}-${teams}`

      if (seen.has(key)) return

      seen.add(key)

      uniqueGames.push({
        season,

        week,

        team: String(g.Team || ''),

        opponent: String(g.Opponent || ''),

        pf: parseNumber(g.PF),

        pa: parseNumber(g.PA),

        result: String(g.Result || '')
          .trim()
          .toUpperCase(),

        stage:
          String(g.GameStage || '') ||
          String(g.GameType || '')
      })
    })

    return uniqueGames.sort((a, b) => {
      if (a.season !== b.season) {
        return Number(b.season) - Number(a.season)
      }

      return Number(b.week) - Number(a.week)
    })


  }, [selected, gamesData])

  /* =====================================================
  PARSED
  ===================================================== */

  const currentStreak = selected
    ? parseCurrentStreak(selected.streak)
    : null

  const bestA = selected
    ? parseBestStreak(selected.bestA)
    : null

  const bestB = selected
    ? parseBestStreak(selected.bestB)
    : null

  const biggestA = selected
    ? parseBiggestWin(selected.biggestA)
    : null

  const biggestB = selected
    ? parseBiggestWin(selected.biggestB)
    : null

  /* =====================================================
  RENDER
  ===================================================== */

  return (<main className="min-h-screen overflow-x-hidden bg-[#020617] text-white"> <style>{`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');


    body {
      background: #020617;
    }
  `}</style>

    {/* HEADER */}

    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 py-4 md:px-6">
        <a
          href="/"
          className="flex items-center gap-3"
        >
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas"
            width={34}
            height={34}
            style={{ filter: 'invert(1)' }}
          />

          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas
            <span className="text-cyan-400">
              League
            </span>
          </span>
        </a>

        <button
          onClick={() =>
            setMobileSidebar(!mobileSidebar)
          }
          className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black text-white shadow-2xl lg:hidden"
        >
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Rivalries
          </div>
        </button>
      </div>
    </header>

    {/* BODY */}

    <section className="mx-auto flex max-w-[1700px] gap-6 px-4 py-6 md:px-6">
      {/* SIDEBAR */}

      <aside
        className={`
        fixed bottom-0 left-0 top-[73px] z-40 w-[88vw] max-w-[380px]
        transform border-r border-white/10 bg-[#071120]
        transition-transform duration-300
        lg:sticky lg:top-[90px]
        lg:h-[calc(100vh-120px)]
        lg:translate-x-0
        lg:overflow-hidden
        ${mobileSidebar
            ? 'translate-x-0'
            : '-translate-x-full'
          }
      `}
      >
        <div className="flex h-full flex-col">
          {/* FILTERS */}

          <div className="border-b border-white/5 p-5">
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300">
              Rivalries
            </div>

            {/* TEAM FILTERS */}

            <div className="space-y-3">
              <select
                value={teamFilterA}
                onChange={(e) =>
                  setTeamFilterA(e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="ALL">
                  Select Team
                </option>

                {allTeams.map((team) => (
                  <option
                    key={team}
                    value={team}
                  >
                    {team}
                  </option>
                ))}
              </select>

              <select
                value={teamFilterB}
                onChange={(e) =>
                  setTeamFilterB(e.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="ALL">
                  Select Opponent
                </option>

                {allTeams.map((team) => (
                  <option
                    key={team}
                    value={team}
                  >
                    {team}
                  </option>
                ))}
              </select>
            </div>

            {/* HEAT */}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                'ALL',
                'LEGENDARY',
                'ELITE',
                'HIGH',
                'MEDIUM',
                'LOW'
              ].map((heat) => (
                <button
                  key={heat}
                  onClick={() =>
                    setFilterHeat(heat)
                  }
                  className={`rounded-xl border px-2 py-2 text-[10px] font-black tracking-[0.15em] transition-all ${filterHeat === heat
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                      : 'border-white/5 bg-white/[0.03] text-slate-500'
                    }`}
                >
                  {heat}
                </button>
              ))}
            </div>
          </div>

          {/* LIST */}

          <div className="flex-1 overflow-y-auto">
            {rivalries.map((r, i) => {
              const active = selected === r

              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelected(r)

                    setMobileSidebar(false)
                  }}
                  className={`w-full border-b border-white/[0.03] px-5 py-5 text-left transition-all ${active
                      ? 'bg-cyan-400/[0.05]'
                      : 'hover:bg-white/[0.03]'
                    }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <HeatBadge heat={r.heat} />

                    <ChevronDown
                      className={`h-4 w-4 text-slate-600 transition-transform ${active ? 'rotate-180' : ''
                        }`}
                    />
                  </div>

                  <div
                    style={{
                      fontFamily:
                        '"Bebas Neue", sans-serif',
                      fontSize: '32px',
                      lineHeight: 0.9
                    }}
                  >
                    {r.teamA}
                  </div>

                  <div className="my-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
                    vs
                  </div>

                  <div
                    style={{
                      fontFamily:
                        '"Bebas Neue", sans-serif',
                      fontSize: '32px',
                      lineHeight: 0.9
                    }}
                  >
                    {r.teamB}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* OVERLAY */}

      {mobileSidebar && (
        <div
          onClick={() =>
            setMobileSidebar(false)
          }
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
        />
      )}

      {/* MAIN */}

      <div className="min-w-0 flex-1 overflow-hidden">
        {selected && (
          <>
            {/* HERO */}

            <motion.section
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.5
              }}
              className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#071120]"
            >
              <div className="absolute inset-0">
                <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-purple-500/10 blur-3xl" />
              </div>

              <div className="relative z-10 p-6 md:p-10">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <HeatBadge heat={selected.heat} />

                  <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                    Historic Rivalry
                  </div>
                </div>

                <div
                  className="leading-[0.82]"
                  style={{
                    fontFamily:
                      '"Bebas Neue", sans-serif',
                    fontSize:
                      'clamp(38px,11vw,120px)'
                  }}
                >
                  <div>{selected.teamA}</div>

                  <div className="text-cyan-400">
                    VS
                  </div>

                  <div>{selected.teamB}</div>
                </div>

                <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                      Overall Record
                    </div>

                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <div className="text-[54px] font-black leading-none sm:text-[72px] md:text-[120px]">
                        {selected.aWins}
                      </div>

                      <div className="pb-3 text-4xl font-black text-cyan-400 md:pb-5 md:text-6xl">
                        —
                      </div>

                      <div className="text-[54px] font-black leading-none sm:text-[72px] md:text-[120px]">
                        {selected.bWins}
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-[360px] rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-300" />

                      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300">
                        Current Streak
                      </div>
                    </div>

                    <div className="text-6xl font-black leading-none text-orange-300">
                      {currentStreak?.result}
                      {currentStreak?.count}
                    </div>

                    <div className="mt-3 text-lg font-black">
                      {currentStreak?.team}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* BIGGEST WINS */}

            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              {[{
                team: selected.teamA,
                data: biggestA,
                color: 'yellow'
              }, {
                team: selected.teamB,
                data: biggestB,
                color: 'orange'
              }].map((item, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-[32px] border border-white/10 bg-[#071120]"
                >
                  <div className="border-b border-white/5 p-6">
                    <div className={`mb-2 flex items-center gap-2 text-${item.color}-300`}>
                      <Stars className="h-5 w-5" />

                      <div className="text-[10px] font-black uppercase tracking-[0.35em]">
                        Biggest Win
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily:
                          '"Bebas Neue", sans-serif',
                        fontSize: '54px',
                        lineHeight: 0.9
                      }}
                    >
                      {item.team}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-end gap-3">
                      <div className="text-[58px] font-black leading-none sm:text-[80px] md:text-[110px]">
                        {item.data?.scoreA}
                      </div>

                      <div className="pb-3 text-4xl font-black text-slate-600">
                        —
                      </div>

                      <div className="pb-3 text-5xl font-black text-slate-500">
                        {item.data?.scoreB}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-white/5 pt-5">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Game
                      </div>

                      <div className="mt-2 text-lg font-black">
                        {item.data?.game}
                      </div>

                      <div className="mt-2 text-sm text-slate-500">
                        +{item.data?.margin} margin
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* BEST STREAKS */}

            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              {[{
                data: bestA,
                color: 'cyan'
              }, {
                data: bestB,
                color: 'purple'
              }].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-[32px] border border-white/10 bg-[#071120] p-6"
                >
                  <div className={`text-[10px] font-black uppercase tracking-[0.35em] text-${item.color}-300`}>
                    Best Streak
                  </div>

                  <div
                    className="mt-4 leading-[0.9]"
                    style={{
                      fontFamily:
                        '"Bebas Neue", sans-serif',
                      fontSize: '54px'
                    }}
                  >
                    {item.data?.team}
                  </div>

                  <div className={`mt-6 text-7xl font-black text-${item.color}-300`}>
                    {item.data?.result}
                    {item.data?.count}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Started
                      </div>

                      <div className="mt-2 text-sm font-bold">
                        {item.data?.start}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Ended
                      </div>

                      <div className="mt-2 text-sm font-bold">
                        {item.data?.end}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* TIMELINE */}

            <section className="mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-[#071120]">
              <div className="border-b border-white/5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-cyan-300" />

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                      Rivalry Timeline
                    </div>

                    <div className="mt-2 text-3xl font-black md:text-5xl">
                      Every Chapter
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {history.map((g, i) => {
                  const won = g.result === 'W'

                  const winner = won
                    ? g.team
                    : g.opponent

                  const loser = won
                    ? g.opponent
                    : g.team

                  const winnerScore = won
                    ? g.pf
                    : g.pa

                  const loserScore = won
                    ? g.pa
                    : g.pf

                  const winnerIsA =
                    normalizeString(winner) ===
                    normalizeString(selected.teamA)

                  return (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 0,
                        y: 20
                      }}
                      whileInView={{
                        opacity: 1,
                        y: 0
                      }}
                      viewport={{
                        once: true
                      }}
                      transition={{
                        duration: 0.35
                      }}
                      className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${winnerIsA
                              ? 'bg-cyan-400'
                              : 'bg-purple-400'
                            }`}
                        />

                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                          {g.season} · Week{' '}
                          {g.week}
                        </div>
                      </div>

                      {g.stage &&
                        g.stage !==
                        'Reg Season' && (
                          <div className="mb-4 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">
                            PLAYOFF
                          </div>
                        )}

                      <div className="text-xl font-black leading-tight">
                        <span
                          className={
                            winnerIsA
                              ? 'text-cyan-300'
                              : 'text-purple-300'
                          }
                        >
                          {winner}
                        </span>

                        <span className="mx-2 text-slate-600">
                          def.
                        </span>

                        <span>{loser}</span>
                      </div>

                      <div className="mt-5 flex items-baseline gap-2">
                        <div className="text-5xl font-black leading-none">
                          {winnerScore.toFixed(1)}
                        </div>

                        <div className="pb-1 text-2xl font-black text-slate-600">
                          —
                        </div>

                        <div className="pb-1 text-3xl font-black text-slate-500">
                          {loserScore.toFixed(1)}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </section>
  </main>


  )
}
