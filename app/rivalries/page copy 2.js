'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bebas_Neue } from 'next/font/google'
import {
  Activity,
  Flame,
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
    LEGENDARY: 'bg-[#F5C518] text-[#0A0A0A] border-[#0A0A0A]',
    ELITE: 'bg-[#16274F] text-white border-[#0A0A0A]',
    HIGH: 'bg-[#D01F2D] text-white border-[#0A0A0A]',
    MEDIUM: 'bg-white text-[#3F4757] border-[#0A0A0A]',
    LOW: 'bg-[#F7F6F2] text-[#6B7280] border-[#0A0A0A]/30'
  }

  return (
    <div
      className={`border-2 px-3 py-1.5 text-[10px] font-black tracking-[0.3em] ${colors[heat]}`}
    >
      {heat}
    </div>
  )
}

function flipRivalry(r) {
  return {
    ...r,
    teamA: r.teamB,
    teamB: r.teamA,
    aWins: r.bWins,
    bWins: r.aWins,
    biggestA: r.biggestB,
    biggestB: r.biggestA,
    bestA: r.bestB,
    bestB: r.bestA
  }
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

      const key = [normalizeString(a), normalizeString(b)].sort().join('|')

      if (seen.has(key)) return

      seen.add(key)

      result.push({
        teamA: a,
        teamB: b,

        aWins: parseNumber(r?.['A Wins']),
        bWins: parseNumber(r?.['B Wins']),

        games: parseNumber(r?.Games),

        avgMargin: String(
          r?.['Avg Margin'] || '0'
        ),

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
        const directMatch =
          (teamFilterA === 'ALL' || r.teamA === teamFilterA) &&
          (teamFilterB === 'ALL' || r.teamB === teamFilterB)

        const invertedMatch =
          (teamFilterA === 'ALL' || r.teamB === teamFilterA) &&
          (teamFilterB === 'ALL' || r.teamA === teamFilterB)

        return directMatch || invertedMatch
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
      const r = rivalries[0]

      const needsFlip =
        teamFilterA !== 'ALL' && r.teamA !== teamFilterA

      setSelected(needsFlip ? flipRivalry(r) : r)
    } else {
      setSelected(null)
    }
  }, [teamFilterA, teamFilterB, rivalries])

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


  const playoffGames = useMemo(() => {
    if (!selected) return { wA: 0, wB: 0, total: 0 }

    return history.reduce(
      (acc, g) => {
        if (!g.GameStage || g.GameStage === 'Reg Season') return acc

        const won = g.Result === 'W'
        const winner = won ? g.Team : g.Opponent
        const isA = normalizeString(winner) === normalizeString(selected.teamA)

        return {
          wA: acc.wA + (isA ? 1 : 0),
          wB: acc.wB + (isA ? 0 : 1),
          total: acc.total + 1
        }
      },
      { wA: 0, wB: 0, total: 0 }
    )
  }, [history, selected])

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

  const TEAM_AVATARS = {
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
  const getTeamAvatar = (name) =>
    TEAM_AVATARS[normalizeString(name)] || null

  /* =====================================================
  DETAIL — stat rows (padrão Spotlight)
  ===================================================== */

  const wA = selected?.aWins ?? 0
  const wB = selected?.bWins ?? 0
  const aLeads = wA > wB
  const bLeads = wB > wA

  // streak por lado — lado que tem a streak usa o resultado real, lado oposto recebe o inverso
  const streakTeamIsA = selected
    ? normalizeString(currentStreak?.team || '') === normalizeString(selected.teamA)
    : false

  const streakResult = currentStreak?.result ?? ''
  const streakCount = currentStreak?.count ?? ''
  const oppositeResult = streakResult.toUpperCase() === 'W' ? 'L' : 'W'

  const leftStreak = currentStreak
    ? streakTeamIsA
      ? `${streakResult}${streakCount}`
      : `${oppositeResult}${streakCount}`
    : '—'
  const rightStreak = currentStreak
    ? !streakTeamIsA
      ? `${streakResult}${streakCount}`
      : `${oppositeResult}${streakCount}`
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
      label: 'Playoff Record',
      left: playoffGames.total > 0 ? String(playoffGames.wA) : '—',
      right: playoffGames.total > 0 ? String(playoffGames.wB) : '—',
      subLeft: '',
      subRight: '',
      leftLead: playoffGames.wA > playoffGames.wB,
      rightLead: playoffGames.wB > playoffGames.wA,
      breakArrow: false,
      greenMargin: false,
    },
    {
      label: 'Biggest Win',
      left: biggestA ? `${biggestA.scoreA}–${biggestA.scoreB}` : '—',
      right: biggestB ? `${biggestB.scoreA}–${biggestB.scoreB}` : '—',
      subLeft: biggestA ? `${biggestA.season} W${biggestA.week} · ${formatMarginText(biggestA.scoreA, biggestA.scoreB)}` : '',
      subRight: biggestB ? `${biggestB.season} W${biggestB.week} · ${formatMarginText(biggestB.scoreA, biggestB.scoreB)}` : '',
      leftLead: false,
      rightLead: false,
      breakArrow: false,
      greenMargin: true,
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
      greenMargin: false,
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
      greenMargin: false,
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
      greenMargin: false,
    },
  ] : []

  /* =====================================================
RENDER
===================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-red { box-shadow: 6px 6px 0 0 #D01F2D; }
        .tp-shadow-red-sm { box-shadow: 4px 4px 0 0 #D01F2D; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
      `}</style>
      {/* HEADER */}
      <Header />

      <section className="px-3 md:px-6 pb-20">
        {/* HERO */}
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
                  <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="520" fill="#16274F" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`} />
                ))}
              </g>
              <g opacity="0.10" fill="none" stroke="#16274F" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z", "M460 85 L540 200 L460 315 L380 200 Z", "M540 -30 L620 85 L540 200 L460 85 Z", "M620 85 L700 200 L620 315 L540 200 Z", "M700 -30 L780 85 L700 200 L620 85 Z", "M780 85 L860 200 L780 315 L700 200 Z"].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              <g opacity="0.05" fill="#D01F2D">
                {["M420 30 L440 58 L420 86 L400 58 Z", "M500 120 L520 148 L500 176 L480 148 Z", "M580 30 L600 58 L580 86 L560 58 Z", "M660 120 L680 148 L660 176 L640 148 Z", "M740 30 L760 58 L740 86 L720 58 Z"].map((d, i) => (
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
                {[30, 50, 70].map((r) => <circle key={r} cx="870" cy="60" r={r} />)}
              </g>
              <g opacity="0.10" fill="#16274F">
                {[40, 60, 80, 100].map((y) => [310, 330, 350].map((x) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                )))}
              </g>
              <g opacity="0.10" stroke="#16274F" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => <line key={y} x1="0" y1={y} x2="900" y2={y} />)}
              </g>
              <text x="790" y="310" fontFamily="'Bebas Neue', sans-serif" fontSize="340" fill="#16274F" opacity="0.04" textAnchor="middle">⚔</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.90) 48%, rgba(247,246,242,0.25) 100%)' }} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div
              className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 bg-[#D01F2D] px-3 py-1.5 sm:px-4 sm:py-2"
              style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
            >
              <Swords className="h-3 w-3 sm:h-4 sm:w-4 text-white shrink-0" />
              <span className="font-black uppercase tracking-[0.25em] text-white whitespace-nowrap" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                Head to Head
              </span>
            </div>
            <h1
              className="leading-[0.9] tracking-[-0.02em] text-[#16274F]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
              }}
            >
              Historic
              <span className="text-[#D01F2D]">{' '}Rivalries</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-[#3F4757] leading-relaxed" style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}>
              Explore every head-to-head in Tapitas League history.
            </p>
          </div>
        </div>

        {/* SELETOR DE TIMES */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="border-2 border-[#0A0A0A] bg-white px-5 py-4 tp-shadow-navy-sm">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280]">
              Team
            </div>
            <select
              value={teamFilterA}
              onChange={(e) => {
                setTeamFilterA(e.target.value)
                setSelected(null)
              }}
              className="w-full bg-transparent text-base font-black text-[#16274F] outline-none"
            >
              <option value="ALL">Select team...</option>
              {allTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="border-2 border-[#0A0A0A] bg-white px-5 py-4 tp-shadow-navy-sm">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280]">
              Opponent
            </div>
            <select
              value={teamFilterB}
              onChange={(e) => {
                setTeamFilterB(e.target.value)
                setSelected(null)
              }}
              className="w-full bg-transparent text-base font-black text-[#16274F] outline-none"
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
              className={`flex flex-1 items-center justify-center gap-2 border-2 px-4 py-3 text-sm font-black transition-all ${sortBy === item.value
                ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* LISTA DE RIVALIDADES */}
        {!selected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {rivalries.map((r, i) => {
              const rWA = r.aWins
              const rWB = r.bWins
              const rALeads = rWA > rWB
              const rBLeads = rWB > rWA
              const avA = getTeamAvatar(r.teamA)
              const avB = getTeamAvatar(r.teamB)

              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(r)}
                  className="w-full overflow-hidden border-2 border-[#0A0A0A] bg-white text-left tp-shadow-navy-sm transition-all hover:-translate-y-[1px]"
                >
                  {/* header: heat + total de jogos */}
                  <div className="flex items-center justify-between gap-2 px-5 pt-4">
                    <HeatBadge heat={r.heat} />
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7280]">
                      {rWA + rWB} jogos
                    </div>
                  </div>

                  {/* placar com avatares */}
                  <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-3">
                    {/* Time A */}
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      {avA ? (
                        <img src={avA} alt={r.teamA} className="h-12 w-12 flex-shrink-0 object-contain" />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] text-[10px] font-black uppercase text-white">
                          {r.teamA.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-[#16274F]">
                        {r.teamA}
                      </span>
                      <span
                        className="text-[40px] font-black leading-none"
                        style={{
                          color: rALeads ? '#1E8E3E' : rBLeads ? '#D01F2D' : '#16274F',
                          fontFamily: '"Bebas Neue", sans-serif',
                        }}
                      >
                        {rWA}
                      </span>
                    </div>

                    {/* centro */}
                    <div className="flex flex-shrink-0 flex-col items-center gap-1 pt-5">
                      <Swords className="h-4 w-4 text-[#6B7280]" />
                    </div>

                    {/* Time B */}
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      {avB ? (
                        <img src={avB} alt={r.teamB} className="h-12 w-12 flex-shrink-0 object-contain" />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] text-[10px] font-black uppercase text-white">
                          {r.teamB.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-[#16274F]">
                        {r.teamB}
                      </span>
                      <span
                        className="text-[40px] font-black leading-none"
                        style={{
                          color: rBLeads ? '#1E8E3E' : rALeads ? '#D01F2D' : '#16274F',
                          fontFamily: '"Bebas Neue", sans-serif',
                        }}
                      >
                        {rWB}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
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
                className="mb-4 flex items-center gap-2 border-2 border-[#0A0A0A] bg-white px-4 py-2 text-sm font-black text-[#3F4757] transition-all hover:bg-[#F7F6F2]"
              >
                ← Voltar
              </button>

              {/* ── CARD PRINCIPAL — padrão Spotlight ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy p-3"
              >
                {/* header do card */}
                <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-[#0A0A0A]/10 px-4 pb-3 pt-3 sm:px-5 sm:pt-4">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#D01F2D] sm:h-14 sm:w-14">
                      <Swords className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate uppercase leading-none text-[#16274F]"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', letterSpacing: '0.06em', fontWeight: 900 }}
                      >
                        Historic Rivalry
                      </div>
                      <div className="mt-1 truncate text-[12px] font-bold tracking-[0.02em] text-[#3F4757] sm:mt-1.5 sm:text-sm">
                        All-time H2H
                      </div>
                    </div>
                  </div>
                  <HeatBadge heat={selected.heat} />
                </div>

                {/* placar */}
                <div className="mb-4 px-4 sm:px-5">
                  <div className="overflow-hidden border-2 border-[#0A0A0A] bg-[#F7F6F2] p-4 tp-shadow-navy-sm">
                    <div className="flex items-center justify-between gap-4">

                      {/* Time A */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        {(() => {
                          const av = getTeamAvatar(selected.teamA)
                          return av ? (
                            <img src={av} alt={selected.teamA} className="h-12 w-12 flex-shrink-0 object-contain" />
                          ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] text-[10px] font-black uppercase text-white">
                              {selected.teamA.slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <span className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-[#16274F]">
                          {selected.teamA}
                        </span>
                        <span
                          className="text-[52px] font-black leading-none sm:text-[68px]"
                          style={{ color: aLeads ? '#1E8E3E' : bLeads ? '#D01F2D' : '#16274F', fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                          {wA}
                        </span>
                      </div>

                      {/* centro */}
                      <div className="flex flex-shrink-0 flex-col items-center gap-1">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">All-Time</div>
                        <div className="h-px w-6 bg-[#0A0A0A]/15" />
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">Record</div>
                      </div>

                      {/* Time B */}
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        {(() => {
                          const av = getTeamAvatar(selected.teamB)
                          return av ? (
                            <img src={av} alt={selected.teamB} className="h-12 w-12 flex-shrink-0 object-contain" />
                          ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] text-[10px] font-black uppercase text-white">
                              {selected.teamB.slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <span className="max-w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-[#16274F]">
                          {selected.teamB}
                        </span>
                        <span
                          className="text-[52px] font-black leading-none sm:text-[68px]"
                          style={{ color: bLeads ? '#1E8E3E' : aLeads ? '#D01F2D' : '#16274F', fontFamily: '"Bebas Neue", sans-serif' }}
                        >
                          {wB}
                        </span>
                      </div>
                    </div>

                    {/* streak badge */}
                    {currentStreak && (
                      <div className="mt-3 flex justify-center">
                        <div className="inline-flex items-center gap-2 border-2 border-[#0A0A0A] bg-white px-4 py-1.5">
                          <Flame className="h-3.5 w-3.5 text-[#D01F2D]" />
                          <span className="text-[11px] font-black text-[#3F4757]">
                            {currentStreak.team}
                          </span>
                          <span className="text-[11px] font-black text-[#D01F2D]">
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
                              color: row.leftLead ? '#1E8E3E' : '#16274F',
                            }}
                          >
                            {row.left}
                          </div>
                          {row.subLeft ? (
                            <div className="mt-1 text-[11px] font-bold leading-snug text-[#6B7280] sm:text-[12px]">
                              {row.greenMargin ? (
                                <>
                                  <span>{row.subLeft.split('·')[0].trim()}</span>
                                  {row.subLeft.includes('·') && (
                                    <span className="text-[#1E8E3E]"> · {row.subLeft.split('·')[1].trim()}</span>
                                  )}
                                </>
                              ) : row.breakArrow ? formatRangeWithBreak(row.subLeft) : row.subLeft}
                            </div>
                          ) : null}
                        </div>

                        {/* label central */}
                        <div className="w-full justify-self-center pt-1 text-center">
                          <div className="whitespace-normal break-words text-[10px] font-black uppercase leading-[1.1] tracking-[0.12em] text-[#6B7280] sm:text-[11px]">
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
                              color: row.rightLead ? '#1E8E3E' : '#16274F',
                            }}
                          >
                            {row.right}
                          </div>
                          {row.subRight ? (
                            <div className="mt-1 text-[11px] font-bold leading-snug text-[#6B7280] sm:text-[12px]">
                              {row.greenMargin ? (
                                <>
                                  <span>{row.subRight.split('·')[0].trim()}</span>
                                  {row.subRight.includes('·') && (
                                    <span className="text-[#1E8E3E]"> · {row.subRight.split('·')[1].trim()}</span>
                                  )}
                                </>
                              ) : row.breakArrow ? formatRangeWithBreak(row.subRight) : row.subRight}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {idx < arr.length - 1 && (
                        <div className="mt-4 h-px w-full bg-[#0A0A0A]/8" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* TIMELINE */}
              <div className="mt-4 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm p-3">

                {/* header */}
                <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-[#0A0A0A]/10 px-4 pb-3 pt-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] sm:h-14 sm:w-14">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate uppercase leading-none text-[#16274F]"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '20px', letterSpacing: '0.06em', fontWeight: 900 }}
                      >
                        Rivalry Timeline
                      </div>
                      <div className="mt-1 truncate text-[12px] font-bold tracking-[0.02em] text-[#3F4757] sm:mt-1.5 sm:text-sm">
                        Every Chapter
                      </div>
                    </div>
                  </div>
                </div>

                {/* filtros de season */}
                <div className="px-4 pb-3 sm:px-5">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {seasons.map((season) => (
                      <button
                        key={season}
                        onClick={() => setSeasonFilter(season)}
                        className={`whitespace-nowrap border-2 px-4 py-1.5 text-xs font-black transition-all ${seasonFilter === season
                          ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                          : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                          }`}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                </div>

                {/* lista de jogos */}
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <div className="overflow-hidden border-2 border-[#0A0A0A]/10 px-4 py-1 sm:px-5">
                    {filteredHistory.map((g, i) => {
                      const won = g.Result === 'W'
                      const winner = won ? g.Team : g.Opponent
                      const loser = won ? g.Opponent : g.Team
                      const winnerScore = won ? parseNumber(g.PF) : parseNumber(g.PA)
                      const loserScore = won ? parseNumber(g.PA) : parseNumber(g.PF)
                      const winnerIsA = normalizeString(winner) === normalizeString(selected.teamA)
                      const isPlayoff = g.GameStage && g.GameStage !== 'Reg Season'
                      const gameType = String(g.GameType || g.GameStage || '').trim()
                      const isConsolation = g.GameStage === 'Consolation'
                      const matchupHref = `/matchups?season=${encodeURIComponent(g.Season)}&week=${encodeURIComponent(g.Week)}&team=${encodeURIComponent(g.Team)}&opp=${encodeURIComponent(g.Opponent)}`

                      return (
                        <div key={i}>
                          <a
                            href={matchupHref}
                            className="grid grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] items-start gap-2 py-4 transition-colors hover:bg-[#F7F6F2] sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:gap-4"
                          >
                            {/* vencedor — esquerda */}
                            <div className="min-w-0 text-left">
                              <div
                                className="whitespace-nowrap text-[22px] leading-none sm:text-[30px]"
                                style={{
                                  fontFamily: '"Bebas Neue", sans-serif',
                                  fontWeight: 900,
                                  color: winnerIsA ? '#16274F' : '#D01F2D',
                                }}
                              >
                                {winnerScore.toFixed(1)}
                              </div>
                              <div className="mt-1 truncate text-[11px] font-bold leading-snug text-[#6B7280] sm:text-[12px]">
                                {winner}
                              </div>
                            </div>

                            {/* centro — semana + badge */}
                            <div className="w-full justify-self-center pt-1 text-center">
                              <div className="whitespace-normal break-words text-[10px] font-black uppercase leading-[1.1] tracking-[0.12em] text-[#16274F] sm:text-[11px]">
                                {g.Season}
                              </div>
                              <div className="whitespace-normal break-words text-[10px] font-black uppercase leading-[1.3] tracking-[0.12em] text-[#3F4757] sm:text-[11px]">
                                Week {g.Week}
                              </div>
                              {isPlayoff && gameType && (() => {
                                const isUnicornio = normalizeString(gameType).includes('unicornio') || normalizeString(gameType).includes('unicórnio')
                                const isTapitasBowl = normalizeString(gameType).includes('tapitas bowl')
                                const isConsolationBracket = normalizeString(gameType) === 'consolation bracket'

                                const badgeClass = isUnicornio
                                  ? 'bg-white text-[#D01F2D] border-[#0A0A0A]'
                                  : isTapitasBowl
                                    ? 'bg-[#F5C518] text-[#0A0A0A] border-[#0A0A0A]'
                                    : isConsolation
                                      ? 'bg-[#F7F6F2] text-[#6B7280] border-[#0A0A0A]/20'
                                      : 'bg-[#16274F] text-white border-[#0A0A0A]'

                                const label = isUnicornio
                                  ? `🦄 ${gameType}`
                                  : isTapitasBowl
                                    ? '🏆 Tapitas Bowl'
                                    : isConsolationBracket
                                      ? 'Consolation'
                                      : gameType

                                return (
                                  <div className={`mt-1 inline-block border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${badgeClass}`}>
                                    {label}
                                  </div>
                                )
                              })()}
                            </div>

                            {/* perdedor — direita */}
                            <div className="min-w-0 text-right">
                              <div
                                className="whitespace-nowrap text-[22px] leading-none sm:text-[30px]"
                                style={{
                                  fontFamily: '"Bebas Neue", sans-serif',
                                  fontWeight: 900,
                                  color: '#6B7280',
                                }}
                              >
                                {loserScore.toFixed(1)}
                              </div>
                              <div className="mt-1 truncate text-[11px] font-bold leading-snug text-[#6B7280] sm:text-[12px]">
                                {loser}
                              </div>
                            </div>
                          </a>

                          {i < filteredHistory.length - 1 && (
                            <div className="h-px w-full bg-[#0A0A0A]/8" />
                          )}
                        </div>
                      )
                    })}

                    {filteredHistory.length === 0 && (
                      <div className="py-6 text-center text-sm font-black text-[#6B7280]">
                        No games found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
              <div className="text-center">
                <Swords className="mx-auto mb-6 h-14 w-14 text-[#6B7280]" />
                <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '64px', color: '#16274F' }}>
                  SELECT A RIVALRY
                </div>
                <p className="mt-2 text-[#6B7280]">
                  Explore the greatest battles in league history
                </p>
              </div>
            </div>
          )}
        </div>
        {/* FOOTER */}
      </section>

      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={24}
            height={24}
            style={{ filter: 'invert(1)' }}
            className="opacity-70"
          />

          <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>
    </main>
  )
}