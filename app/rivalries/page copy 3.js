'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bebas_Neue } from 'next/font/google'
import {
  Activity,
  ChevronDown,
  Flame,
  Stars,
  Swords
} from 'lucide-react'
import Header from '../components/Header'

const SHEET_ID =
  '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'

const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400'
})

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

  const margin = Math.abs(
    parseFloat(
      String(avgMargin).replace(',', '.')
    ) || 0
  )

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
  if (!streak || streak === '—') {
    return null
  }

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
  if (!streak || streak === '—') {
    return null
  }

  const text = String(streak).trim()

  const firstMatch = text.match(
    /^(.*?)\s([WL])([\d/-]+)/
  )

  const rangeMatch = text.match(
    /\((.*?)\)/
  )

  if (!firstMatch) {
    return {
      raw: text
    }
  }

  let start = ''
  let end = ''

  if (rangeMatch) {
    const cleaned = rangeMatch[1]

    const parts = cleaned.split(
      /\s*(?:→|=>|⇒)\s*/
    )

    if (parts.length >= 2) {
      start = parts[0]
        .replace(/\s+/g, ' ')
        .trim()
        .replace(
          /W\s*([\d/-]+)/i,
          'Week $1'
        )

      end = parts[1]
        .replace(/\s+/g, ' ')
        .trim()
        .replace(
          /W\s*([\d/-]+)/i,
          'Week $1'
        )
    }
  }

  return {
    raw: text,

    team: firstMatch[1].trim(),

    result: firstMatch[2],

    count: firstMatch[3],

    start,

    end
  }
}

function parseBiggestWin(value) {
  if (!value || value === '—') {
    return null
  }

  const text = String(value)

  const scoreMatch = text.match(
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/
  )

  const marginMatch = text.match(
    /\(\+?(\d+(?:\.\d+)?)\)/
  )

  const seasonMatch = text.match(/\b(20\d{2})\b/)

  const weekMatch = text.match(
    /(?:Week|W)\s*([\d/-]+)/i
  )

  return {
    raw: text,

    scoreA: scoreMatch
      ? scoreMatch[1]
      : '0',

    scoreB: scoreMatch
      ? scoreMatch[2]
      : '0',

    margin: marginMatch
      ? marginMatch[1]
      : '0',

    season: seasonMatch
      ? seasonMatch[1]
      : '',

    week: weekMatch
      ? weekMatch[1]
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
      {heat}
    </div>
  )
}

/* =====================================================
PAGE
===================================================== */

export default function RivalriesPage() {
  const [h2hData, setH2hData] =
    useState([])

  const [gamesData, setGamesData] =
    useState([])

  const [selected, setSelected] =
    useState(null)

  const [teamFilterA, setTeamFilterA] =
    useState('ALL')

  const [teamFilterB, setTeamFilterB] =
    useState('ALL')

  const [sortBy, setSortBy] =
    useState('HEAT')

  const [seasonFilter, setSeasonFilter] =
    useState('ALL')

  /* =====================================================
  LOAD
  ===================================================== */

  useEffect(() => {
    async function load() {
      const [h2h, games] =
        await Promise.all([
          safeFetch(
            `${BASE_URL}/HEAD_TO_HEAD_SORTED`
          ),

          safeFetch(
            `${BASE_URL}/GAME_FACTS_ALL`
          )
        ])

      setH2hData(h2h)

      setGamesData(games)
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

  const heatRank = {
    LEGENDARY: 5,
    ELITE: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  }

  const rivalries = useMemo(() => {
    const result = []

    const seen = new Set()

    h2hData.forEach((r) => {
      const a = String(
        r?.['Team A'] || ''
      ).trim()

      const b = String(
        r?.['Team B'] || ''
      ).trim()

      if (!a || !b) return

      const key = `${normalizeString(a)}|${normalizeString(b)}`

      if (seen.has(key)) return

      seen.add(key)

      let teamA = a
      let teamB = b

      let aWins = parseNumber(
        r?.['A Wins']
      )

      let bWins = parseNumber(
        r?.['B Wins']
      )

      const swapped =
        teamFilterA !== 'ALL' &&
        b === teamFilterA

      result.push({
        teamA,
        teamB,

        aWins,
        bWins,

        games: parseNumber(r?.Games),

        avgMargin: String(
          r?.['Avg Margin'] || '0'
        ),

        streak: String(
          r?.['Current Streak'] || '—'
        ),

        biggestA: swapped
          ? String(
            r?.['Biggest Win Team B'] || '—'
          )
          : String(
            r?.['Biggest Win Team A'] || '—'
          ),

        biggestB: swapped
          ? String(
            r?.['Biggest Win Team A'] || '—'
          )
          : String(
            r?.['Biggest Win Team B'] || '—'
          ),

        bestA: swapped
          ? String(
            r?.['Best Streak Team B'] || '—'
          )
          : String(
            r?.['Best Streak Team A'] || '—'
          ),

        bestB: swapped
          ? String(
            r?.['Best Streak Team A'] || '—'
          )
          : String(
            r?.['Best Streak Team B'] || '—'
          ),

        heat: getRivalryHeat(
          r?.Games,
          r?.['A Wins'],
          r?.['B Wins'],
          r?.['Avg Margin']
        )
      })
    })

    return result
      .filter((r) => {
        const matchA =
          teamFilterA === 'ALL' ||
          r.teamA === teamFilterA

        const matchB =
          teamFilterB === 'ALL' ||
          r.teamB === teamFilterB

        return matchA && matchB
      })
      .sort((a, b) => {
        if (sortBy === 'GAMES') {
          return b.games - a.games
        }

        if (sortBy === 'CLOSEST') {
          const diffA = Math.abs(
            a.aWins - a.bWins
          )

          const diffB = Math.abs(
            b.aWins - b.bWins
          )

          if (diffA !== diffB) {
            return diffA - diffB
          }

          const gamesA =
            a.aWins + a.bWins

          const gamesB =
            b.aWins + b.bWins

          if (gamesA !== gamesB) {
            return gamesB - gamesA
          }

          const marginA = Math.abs(
            parseFloat(a.avgMargin)
          )

          const marginB = Math.abs(
            parseFloat(b.avgMargin)
          )

          return marginA - marginB
        }

        if (sortBy === 'HEAT') {
          const heatDiff =
            heatRank[b.heat] -
            heatRank[a.heat]

          if (heatDiff !== 0) {
            return heatDiff
          }

          return b.games - a.games
        }

        return 0
      })
  }, [
    h2hData,
    teamFilterA,
    teamFilterB,
    sortBy
  ])

  /* =====================================================
  AUTO SELECT
  ===================================================== */

  useEffect(() => {
    if (rivalries.length === 1) {
      setSelected(rivalries[0])
    } else {
      setSelected(null)
    }
  }, [teamFilterA, teamFilterB])

  /* =====================================================
  HISTORY
  ===================================================== */

  const history = useMemo(() => {
    if (!selected) return []

    const seen = new Set()

    return gamesData.filter((g) => {
      const team = normalizeString(g.Team)

      const opp = normalizeString(
        g.Opponent
      )

      const a = normalizeString(
        selected.teamA
      )

      const b = normalizeString(
        selected.teamB
      )

      const isMatch =
        (team === a && opp === b) ||
        (team === b && opp === a)

      if (!isMatch) return false

      const key = [
        g.Season,
        g.Week,
        a,
        b
      ]
        .sort()
        .join('|')

      if (seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })
  }, [selected, gamesData])

  const seasons = [
    'ALL',

    ...new Set(
      history.map((g) => g.Season)
    )
  ]

  const filteredHistory =
    seasonFilter === 'ALL'
      ? history
      : history.filter(
        (g) =>
          g.Season === seasonFilter
      )

  /* =====================================================
  PARSED
  ===================================================== */

  const currentStreak = selected
    ? parseCurrentStreak(selected.streak)
    : null

  const parsedBestA = selected
    ? parseBestStreak(selected.bestA)
    : null

  const parsedBestB = selected
    ? parseBestStreak(selected.bestB)
    : null

  const bestA =
    parsedBestA?.team ===
      selected?.teamA
      ? parsedBestA
      : parsedBestB

  const bestB =
    parsedBestA?.team ===
      selected?.teamA
      ? parsedBestB
      : parsedBestA

  const biggestA = selected
    ? parseBiggestWin(selected.biggestA)
    : null

  const biggestB = selected
    ? parseBiggestWin(selected.biggestB)
    : null

  const titleFont = {
    fontFamily: bebas.style.fontFamily
  }

  const teamABg = 'bg-cyan-400'
  const teamBBg = 'bg-purple-400'

  /* =====================================================
  DETAIL — stat rows (padrão Spotlight)
  ===================================================== */

  const wA = selected?.aWins ?? 0
  const wB = selected?.bWins ?? 0
  const aLeads = wA > wB
  const bLeads = wB > wA

  // streak por lado
  const streakTeamIsA = selected
    ? normalizeString(currentStreak?.team || '') === normalizeString(selected.teamA)
    : false

  const leftStreak = streakTeamIsA
    ? (currentStreak ? `${currentStreak.result}${currentStreak.count}` : '—')
    : '—'
  const rightStreak = !streakTeamIsA && currentStreak
    ? `${currentStreak.result}${currentStreak.count}`
    : '—'

  const leftStreakScore =
    leftStreak === '—' ? null
      : (leftStreak.startsWith('W') ? 1 : -1) * parseNumber(leftStreak.replace(/[^\d]/g, ''))
  const rightStreakScore =
    rightStreak === '—' ? null
      : (rightStreak.startsWith('W') ? 1 : -1) * parseNumber(rightStreak.replace(/[^\d]/g, ''))

  const leftStreakLead =
    leftStreakScore !== null && rightStreakScore !== null && leftStreakScore > rightStreakScore
  const rightStreakLead =
    leftStreakScore !== null && rightStreakScore !== null && rightStreakScore > leftStreakScore

  // best streak leads
  const bestStreakLeftScore =
    bestA?.count ? (String(bestA.result).toUpperCase() === 'W' ? Number(bestA.count) : -Number(bestA.count)) : null
  const bestStreakRightScore =
    bestB?.count ? (String(bestB.result).toUpperCase() === 'W' ? Number(bestB.count) : -Number(bestB.count)) : null

  const leftBestStreakLead =
    bestStreakLeftScore !== null && bestStreakRightScore !== null && bestStreakLeftScore > bestStreakRightScore
  const rightBestStreakLead =
    bestStreakLeftScore !== null && bestStreakRightScore !== null && bestStreakRightScore > bestStreakLeftScore

  // avg margin
  const avgMarginValue = parseNumber(selected?.avgMargin)
  const hasAvgMargin =
    selected?.avgMargin !== null &&
    selected?.avgMargin !== undefined &&
    String(selected?.avgMargin ?? '').trim() !== ''

  const leftAvgMarginRaw = hasAvgMargin ? avgMarginValue : null
  const rightAvgMarginRaw = hasAvgMargin ? avgMarginValue * -1 : null

  const leftAvgMargin =
    leftAvgMarginRaw === null
      ? '—'
      : `${leftAvgMarginRaw > 0 ? '+' : leftAvgMarginRaw < 0 ? '' : ''}${leftAvgMarginRaw}`
  const rightAvgMargin =
    rightAvgMarginRaw === null
      ? '—'
      : `${rightAvgMarginRaw > 0 ? '+' : rightAvgMarginRaw < 0 ? '' : ''}${rightAvgMarginRaw}`

  const leftAvgMarginLead =
    leftAvgMarginRaw !== null && rightAvgMarginRaw !== null && leftAvgMarginRaw > rightAvgMarginRaw
  const rightAvgMarginLead =
    leftAvgMarginRaw !== null && rightAvgMarginRaw !== null && rightAvgMarginRaw > leftAvgMarginRaw

  const formatMarginText = (scoreA, scoreB) => {
    const a = Number(scoreA)
    const b = Number(scoreB)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return ''
    return `+${Math.abs(a - b).toFixed(1).replace('.', ',')} pts`
  }

  const formatRangeWithBreak = (text) => {
    if (!text) return ''
    const parts = String(text).split(/\s*→\s*/)
    if (parts.length < 2) return text
    return (
      <>
        <span>{parts[0]}</span>
        <span className="inline sm:hidden">{' '}→<br /></span>
        <span className="hidden sm:inline">{' → '}</span>
        <span>{parts.slice(1).join(' → ')}</span>
      </>
    )
  }

  const statRows = selected ? [
    {
      label: 'Biggest Win',
      left: biggestA ? `${biggestA.scoreA}–${biggestA.scoreB}` : '—',
      right: biggestB ? `${biggestB.scoreA}–${biggestB.scoreB}` : '—',
      subLeft: biggestA ? `S${biggestA.season} W${biggestA.week} · ${formatMarginText(biggestA.scoreA, biggestA.scoreB)}` : '',
      subRight: biggestB ? `S${biggestB.season} W${biggestB.week} · ${formatMarginText(biggestB.scoreA, biggestB.scoreB)}` : '',
      leftLead: false,
      rightLead: false,
      breakArrow: false,
    },
    {
      label: 'Best Streak',
      left: bestA?.count ? `${bestA.result}${bestA.count}` : '—',
      right: bestB?.count ? `${bestB.result}${bestB.count}` : '—',
      subLeft: bestA?.start ? `${bestA.start}${bestA.end ? ` → ${bestA.end}` : ''}` : '',
      subRight: bestB?.start ? `${bestB.start}${bestB.end ? ` → ${bestB.end}` : ''}` : '',
      leftLead: leftBestStreakLead,
      rightLead: rightBestStreakLead,
      breakArrow: true,
    },
    {
      label: 'Current Streak',
      left: leftStreak,
      right: rightStreak,
      subLeft: '',
      subRight: '',
      leftLead: leftStreakLead,
      rightLead: rightStreakLead,
      breakArrow: false,
    },
    {
      label: 'Avg Margin',
      left: leftAvgMargin,
      right: rightAvgMargin,
      subLeft: '',
      subRight: '',
      leftLead: leftAvgMarginLead,
      rightLead: rightAvgMarginLead,
      breakArrow: false,
    },
  ] : []

  /* =====================================================
RENDER
===================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] text-white">
      {/* HEADER */}
      <Header />

      <section className="px-3 md:px-6 pb-20">
        {/* HERO */}
        <div className="relative mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl md:rounded-[38px]">
            <svg
              className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 900 340"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="520" fill="#22d3ee" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z", "M460 85 L540 200 L460 315 L380 200 Z", "M540 -30 L620 85 L540 200 L460 85 Z", "M620 85 L700 200 L620 315 L540 200 Z", "M700 -30 L780 85 L700 200 L620 85 Z", "M780 85 L860 200 L780 315 L700 200 Z"].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g opacity="0.08" fill="#22d3ee">
                {["M420 30 L440 58 L420 86 L400 58 Z", "M500 120 L520 148 L500 176 L480 148 Z", "M580 30 L600 58 L580 86 L560 58 Z", "M660 120 L680 148 L660 176 L640 148 Z", "M740 30 L760 58 L740 86 L720 58 Z"].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                {[520, 600, 680].map((x, i) => (
                  <polyline key={i} points={`${x},0 ${x + 160},170 ${x},340`} />
                ))}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30, 50, 70].map((r) => <circle key={r} cx="870" cy="60" r={r} />)}
              </g>
              <g opacity="0.09" fill="#22d3ee">
                {[40, 60, 80, 100].map((y) => [310, 330, 350].map((x) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                )))}
              </g>
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => <line key={y} x1="0" y1={y} x2="900" y2={y} />)}
              </g>
              <text x="790" y="310" fontFamily="'Bebas Neue', sans-serif" fontSize="340" fill="#22d3ee" opacity="0.02" textAnchor="middle">⚔</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)' }} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <Swords className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
              <span className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                Head to Head
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
              Historic
              <span style={{ background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {' '}Rivalries
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-slate-400 leading-relaxed" style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}>
              Explore every head-to-head in Tapitas League history.
            </p>
          </div>
        </div>

        {/* SELETOR DE TIMES */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-white/10 bg-[#071120] px-5 py-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Team
            </div>
            <select
              value={teamFilterA}
              onChange={(e) => {
                setTeamFilterA(e.target.value)
                setSelected(null)
              }}
              className="w-full bg-transparent text-base font-black outline-none"
            >
              <option value="ALL">Select team...</option>
              {allTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#071120] px-5 py-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Opponent
            </div>
            <select
              value={teamFilterB}
              onChange={(e) => {
                setTeamFilterB(e.target.value)
                setSelected(null)
              }}
              className="w-full bg-transparent text-base font-black outline-none"
            >
              <option value="ALL">vs opponent...</option>
              {allTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SORT */}
        <div className="mb-6 flex gap-2">
          {[
            { label: 'Heat', value: 'HEAT', icon: '🔥' },
            { label: 'Games', value: 'GAMES', icon: '📊' },
            { label: 'Closest', value: 'CLOSEST', icon: '⚔️' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSortBy(item.value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-black transition-all ${sortBy === item.value
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                : 'border-white/10 bg-white/[0.03] text-slate-500'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* LISTA DE RIVALIDADES */}
        {!selected && (
          <div className="flex flex-col gap-3 mb-6">
            {rivalries.map((r, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(r)}
                className="w-full rounded-[28px] border border-white/10 bg-[#071120] p-5 text-left transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <HeatBadge heat={r.heat} />
                  <div className="text-slate-500 text-sm font-black">
                    {r.aWins + r.bWins} jogos
                  </div>
                </div>

                <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '28px', lineHeight: 0.9 }}>
                  {r.teamA}
                </div>

                <div className="my-1 text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
                  vs
                </div>

                <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '28px', lineHeight: 0.9 }}>
                  {r.teamB}
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-3xl font-black">{r.aWins}</div>
                  <div className="text-3xl font-black text-slate-600">—</div>
                  <div className="text-3xl font-black text-slate-600">{r.bWins}</div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* CONTEÚDO DO HEAD TO HEAD */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {selected ? (
            <>
              {/* BOTÃO VOLTAR */}
              <button
                onClick={() => {
                  setSelected(null)
                  setTeamFilterA('ALL')
                  setTeamFilterB('ALL')
                }}
                className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-black text-slate-400 transition-all hover:text-white"
              >
                ← Voltar
              </button>

              {/* ── CARD PRINCIPAL — padrão Spotlight ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.97),rgba(2,6,23,0.99))] p-3"
              >
                {/* header do card */}
                <div className="mb-4 flex items-center justify-between gap-3 px-4 pb-1.5 pt-3 sm:px-5 sm:pb-1 sm:pt-4">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] sm:h-14 sm:w-14 sm:rounded-[20px]">
                      <Swords className="h-5 w-5 text-rose-300" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate uppercase leading-none text-rose-300"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', letterSpacing: '0.06em', fontWeight: 900 }}
                      >
                        Historic Rivalry
                      </div>
                      <div className="mt-1 truncate text-[12px] font-bold tracking-[0.02em] text-slate-300 sm:mt-1.5 sm:text-sm">
                        All-time H2H
                      </div>
                    </div>
                  </div>
                  <HeatBadge heat={selected.heat} />
                </div>

                {/* placar */}
                <div className="mb-4 px-4 sm:px-5">
                  <div className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                    <div className="flex items-center justify-between gap-4">

                      {/* Time A */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                          className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-cyan-300"
                        >
                          {selected.teamA}
                        </span>
                        <span
                          className="text-[52px] font-black leading-none sm:text-[68px]"
                          style={{ color: aLeads ? '#86efac' : bLeads ? '#fca5a5' : '#e2e8f0', fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                          {wA}
                        </span>
                      </div>

                      {/* centro */}
                      <div className="flex flex-shrink-0 flex-col items-center gap-1">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">All-Time</div>
                        <div className="h-px w-6 bg-white/10" />
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Record</div>
                      </div>

                      {/* Time B */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                          className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-purple-300"
                        >
                          {selected.teamB}
                        </span>
                        <span
                          className="text-[52px] font-black leading-none sm:text-[68px]"
                          style={{ color: bLeads ? '#86efac' : aLeads ? '#fca5a5' : '#e2e8f0', fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                          {wB}
                        </span>
                      </div>
                    </div>

                    {/* streak badge */}
                    {currentStreak && (
                      <div className="mt-3 flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5">
                          <Flame className="h-3.5 w-3.5 text-orange-300" />
                          <span className="text-[11px] font-black text-slate-300">
                            {currentStreak.team}
                          </span>
                          <span className="text-[11px] font-black text-orange-300">
                            {currentStreak.result}{currentStreak.count} streak
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* tabela de stats */}
                <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                  {statRows.map((row, idx, arr) => (
                    <div key={row.label}>
                      <div className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:gap-4">

                        {/* esquerda */}
                        <div className="min-w-0 text-left">
                          <div
                            className="whitespace-nowrap text-[22px] leading-none sm:text-[30px]"
                            style={{
                              fontFamily: '"Bebas Neue", sans-serif',
                              fontWeight: 900,
                              color: row.leftLead ? '#6ee7b7' : '#f1f5f9',
                            }}
                          >
                            {row.left}
                          </div>
                          {row.subLeft ? (
                            <div className="mt-1 text-[11px] font-bold leading-snug text-slate-400 sm:text-[12px]">
                              {row.breakArrow ? formatRangeWithBreak(row.subLeft) : row.subLeft}
                            </div>
                          ) : null}
                        </div>

                        {/* label central */}
                        <div className="w-full justify-self-center pt-1 text-center">
                          <div className="whitespace-normal break-words text-[10px] font-black uppercase leading-[1.1] tracking-[0.12em] text-slate-500 sm:text-[11px]">
                            {row.label}
                          </div>
                        </div>

                        {/* direita */}
                        <div className="min-w-0 text-right">
                          <div
                            className="whitespace-nowrap text-[22px] leading-none sm:text-[30px]"
                            style={{
                              fontFamily: '"Bebas Neue", sans-serif',
                              fontWeight: 900,
                              color: row.rightLead ? '#6ee7b7' : '#f1f5f9',
                            }}
                          >
                            {row.right}
                          </div>
                          {row.subRight ? (
                            <div className="mt-1 text-[11px] font-bold leading-snug text-slate-400 sm:text-[12px]">
                              {row.breakArrow ? formatRangeWithBreak(row.subRight) : row.subRight}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {idx < arr.length - 1 && (
                        <div className="mt-4 h-px w-full bg-white/[0.06]" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* TIMELINE */}
              <section className="mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-[#071120]">
                <div className="border-b border-white/5 p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <Activity className="h-6 w-6 text-cyan-300" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                        Rivalry Timeline
                      </div>
                      <div className="mt-2" style={{ ...titleFont, fontSize: 'clamp(42px,7vw,62px)', lineHeight: 0.9 }}>
                        Every Chapter
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pt-5 md:px-8">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {seasons.map((season) => (
                      <button
                        key={season}
                        onClick={() => setSeasonFilter(season)}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition-all ${seasonFilter === season ? 'bg-cyan-400 text-black' : 'bg-white/[0.03] text-slate-400'
                          }`}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-5 md:p-8">
                  {filteredHistory.map((g, i) => {
                    const won = g.Result === 'W'
                    const winner = won ? g.Team : g.Opponent
                    const loser = won ? g.Opponent : g.Team
                    const winnerScore = won ? parseNumber(g.PF) : parseNumber(g.PA)
                    const loserScore = won ? parseNumber(g.PA) : parseNumber(g.PF)
                    const winnerIsA = normalizeString(winner) === normalizeString(selected.teamA)
                    const marginValue = Math.abs(winnerScore - loserScore)
                    const marginStyle =
                      marginValue >= 40
                        ? { border: 'border-red-400/30', bg: 'bg-red-400/15', text: 'text-red-300', label: 'text-red-200' }
                        : marginValue >= 25
                          ? { border: 'border-orange-400/30', bg: 'bg-orange-400/15', text: 'text-orange-300', label: 'text-orange-200' }
                          : marginValue >= 15
                            ? { border: 'border-yellow-400/25', bg: 'bg-yellow-400/10', text: 'text-yellow-300', label: 'text-yellow-200' }
                            : marginValue >= 8
                              ? { border: 'border-cyan-400/20', bg: 'bg-cyan-400/10', text: 'text-cyan-300', label: 'text-cyan-200' }
                              : { border: 'border-emerald-400/20', bg: 'bg-emerald-400/10', text: 'text-emerald-300', label: 'text-emerald-200' }

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35 }}
                        className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${winnerIsA ? teamABg : teamBBg}`} />
                          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                            {g.Season} · Week {g.Week}
                          </div>
                        </div>

                        {g.GameStage && g.GameStage !== 'Reg Season' && (
                          <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${g.GameStage === 'Playoffs'
                            ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                            : 'border-slate-400/20 bg-slate-400/10 text-slate-300'
                            }`}>
                            {g.GameStage === 'Playoffs' ? 'PLAYOFF' : 'CONSOLATION'}
                          </div>
                        )}

                        <div className="text-xl font-black leading-tight">
                          <span className={winnerIsA ? 'text-cyan-300' : 'text-purple-300'}>{winner}</span>
                          <span className="mx-2 text-slate-600">def.</span>
                          <span>{loser}</span>
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-3 overflow-hidden">
                          <div className="min-w-0 flex flex-1 items-baseline gap-1.5">
                            <div className="text-[44px] font-black leading-none sm:text-[62px]">
                              {winnerScore.toFixed(1)}
                            </div>
                            <div className="pb-1 text-lg font-black text-slate-600 sm:text-2xl">—</div>
                            <div className="pb-1 text-[30px] font-black text-slate-500 sm:text-[42px]">
                              {loserScore.toFixed(1)}
                            </div>
                          </div>

                          <div className={`shrink-0 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 transition-all ${marginStyle.border} ${marginStyle.bg}`}>
                            <div className={`text-[9px] uppercase tracking-[0.25em] ${marginStyle.label}`}>Margin</div>
                            <div className={`mt-1 text-base sm:text-lg font-black ${marginStyle.text}`}>
                              +{marginValue.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center rounded-[34px] border border-white/10 bg-[#071120]">
              <div className="text-center">
                <Swords className="mx-auto mb-6 h-14 w-14 text-slate-700" />
                <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '64px' }}>
                  SELECT A RIVALRY
                </div>
                <p className="mt-2 text-slate-500">
                  Explore the greatest battles in league history
                </p>
              </div>
            </div>
          )}
        </div>
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

      </section>
    </main>
  )
}
