'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Flame, Swords } from 'lucide-react'
import { PageShell, CardShell, FilterPill, ToggleChip, Tag, TeamLogo } from '../components/ui'

const BASE_URL = '/api/sheet'

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

function HeatBadge({ heat, large = false }) {
  const tone = { LEGENDARY: 'gold', ELITE: 'navy', HIGH: 'red' }[heat]
  const label = { LEGENDARY: '🔥 Legendary', ELITE: 'Elite', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }[heat] || heat
  return large
    ? <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${{ gold: 'bg-[#FFF2B8] text-[#6B5A00]', navy: 'bg-[#EEF3FF] text-[#16274F]', red: 'bg-[#FDECEE] text-[#B3171F]' }[tone] || 'bg-[#F1F2F4] text-[#4B5563]'}`}>{label} rivalry</span>
    : <Tag tone={tone}>{label}</Tag>
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

    // Pré-seleciona a rivalidade via ?teamA=X&teamB=Y (ex: vindo da página Teams)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const paramA = params.get('teamA')
      const paramB = params.get('teamB')
      if (paramA) setTeamFilterA(paramA)
      if (paramB) setTeamFilterB(paramB)
    }
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

  const selectRivalry = (r) => {
    setSelected(r)
    setSeasonFilter('ALL')
    if (typeof window !== 'undefined' && window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isSameRivalry = (r) => selected && (
    (normalizeString(r.teamA) === normalizeString(selected.teamA) && normalizeString(r.teamB) === normalizeString(selected.teamB)) ||
    (normalizeString(r.teamA) === normalizeString(selected.teamB) && normalizeString(r.teamB) === normalizeString(selected.teamA))
  )

  const selectClass = 'h-9 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-[#F4F5F7] pl-3 pr-8 text-[13px] font-medium text-[#111] outline-none hover:bg-[#ECEEF1]'

  const listCard = (
    <CardShell title="Rivalries" subtitle={`${rivalries.length} matchups · sorted by ${sortBy === 'HEAT' ? 'heat' : sortBy === 'GAMES' ? 'games played' : 'closest record'}`}>
      <div className="py-1">
        {rivalries.map((r, i) => {
          const active = isSameRivalry(r)
          const aLead = r.aWins > r.bWins
          const bLead = r.bWins > r.aWins
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectRivalry(r)}
              className={`group flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors lg:px-4 ${active ? 'bg-[#EEF3FF]' : 'hover:bg-[#F7F8FA]'}`}
            >
              <div className="flex -space-x-1.5">
                <TeamLogo name={r.teamA} size={26} />
                <TeamLogo name={r.teamB} size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{r.teamA} <span className="text-[#9CA3AF]">vs</span> {r.teamB}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <HeatBadge heat={r.heat} />
                  <span>{r.aWins + r.bWins} games</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-[14px] font-semibold tabular-nums">
                <span className={aLead ? 'text-[#1E8E3E]' : bLead ? 'text-[#D01F2D]' : 'text-[#111]'}>{r.aWins}</span>
                <span className="text-[#9CA3AF]">–</span>
                <span className={bLead ? 'text-[#1E8E3E]' : aLead ? 'text-[#D01F2D]' : 'text-[#111]'}>{r.bWins}</span>
              </div>
            </button>
          )
        })}
        {rivalries.length === 0 && <div className="py-10 text-center text-[13px] text-[#6B7280]">No rivalries found</div>}
      </div>
    </CardShell>
  )

  const detail = selected && (
    <>
      {/* Placar histórico (mesmo padrão do placar da Matchups) */}
      <div className="mb-2 overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between px-3 pt-3 lg:px-4">
          <button type="button" onClick={() => { setSelected(null); setTeamFilterA('ALL'); setTeamFilterB('ALL') }} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#6B7280] hover:text-[#111] lg:invisible">
            <ChevronLeft className="h-4 w-4" /> All rivalries
          </button>
          <HeatBadge heat={selected.heat} large />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pb-4 pt-2">
          <a href={`/teams?team=${encodeURIComponent(selected.teamA)}`} className="flex flex-col items-center gap-2">
            <TeamLogo name={selected.teamA} size={48} />
            <span className={`text-center text-[14px] font-semibold leading-tight hover:underline sm:text-[16px] ${aLeads || !bLeads ? 'text-[#111]' : 'text-[#6B7280]'}`}>{selected.teamA}</span>
            <span className={`font-bold leading-none tabular-nums ${aLeads ? 'text-[#111]' : 'text-[#9CA3AF]'}`} style={{ fontSize: 'clamp(40px, 7vw, 56px)' }}>{wA}</span>
          </a>
          <div className="flex flex-col items-center gap-1 self-center">
            <div className="text-[14px] font-semibold text-[#9CA3AF]">VS</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">all-time</div>
            <div className="text-[11px] tabular-nums text-[#6B7280]">{wA + wB} games</div>
          </div>
          <a href={`/teams?team=${encodeURIComponent(selected.teamB)}`} className="flex flex-col items-center gap-2">
            <TeamLogo name={selected.teamB} size={48} />
            <span className={`text-center text-[14px] font-semibold leading-tight hover:underline sm:text-[16px] ${bLeads || !aLeads ? 'text-[#111]' : 'text-[#6B7280]'}`}>{selected.teamB}</span>
            <span className={`font-bold leading-none tabular-nums ${bLeads ? 'text-[#111]' : 'text-[#9CA3AF]'}`} style={{ fontSize: 'clamp(40px, 7vw, 56px)' }}>{wB}</span>
          </a>
        </div>
        {currentStreak && (
          <div className="flex justify-center border-t border-[#EEF0F2] py-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <Flame className="h-3.5 w-3.5 text-[#D01F2D]" />
              {currentStreak.team} on a <span className="font-semibold text-[#111]">{currentStreak.result}{currentStreak.count}</span> streak
            </span>
          </div>
        )}
      </div>

      {/* Comparativo */}
      <CardShell title="Head to head" subtitle="Side by side">
        <div className="divide-y divide-[#F1F2F4]">
          {statRows.map(row => {
            const sub = (text) => {
              if (!text) return null
              if (row.greenMargin && text.includes('·')) {
                const [a, b] = text.split('·')
                return <>{a.trim()} · <span className="text-[#1E8E3E]">{b.trim()}</span></>
              }
              return row.breakArrow ? formatRangeWithBreak(text) : text
            }
            return (
              <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] items-start gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] lg:px-4">
                <div className="min-w-0 text-left">
                  <div className={`whitespace-nowrap text-[18px] font-bold leading-tight tabular-nums sm:text-[20px] ${row.leftLead ? 'text-[#1E8E3E]' : 'text-[#111]'}`}>{row.left}</div>
                  {row.subLeft && <div className="mt-0.5 text-[11px] text-[#6B7280] sm:text-[12px]">{sub(row.subLeft)}</div>}
                </div>
                <div className="pt-1 text-center text-[11px] font-medium text-[#6B7280] sm:text-[12px]">{row.label}</div>
                <div className="min-w-0 text-right">
                  <div className={`whitespace-nowrap text-[18px] font-bold leading-tight tabular-nums sm:text-[20px] ${row.rightLead ? 'text-[#1E8E3E]' : 'text-[#111]'}`}>{row.right}</div>
                  {row.subRight && <div className="mt-0.5 text-[11px] text-[#6B7280] sm:text-[12px]">{sub(row.subRight)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </CardShell>

      {/* Linha do tempo */}
      <CardShell
        title="Rivalry timeline"
        subtitle={`${filteredHistory.length} game${filteredHistory.length === 1 ? '' : 's'}`}
        action={<FilterPill value={seasonFilter === 'ALL' ? 'All' : seasonFilter} onChange={v => setSeasonFilter(v === 'All' ? 'ALL' : v)} options={['All', ...seasons.filter(s => s !== 'ALL')]} label="Season" allLabel="All seasons" />}
        withMenus
      >
        <div className="overflow-hidden rounded-b-xl">
          {filteredHistory.map((g, i) => {
            const won = g.Result === 'W'
            const winner = won ? g.Team : g.Opponent
            const loser = won ? g.Opponent : g.Team
            const winnerScore = won ? parseNumber(g.PF) : parseNumber(g.PA)
            const loserScore = won ? parseNumber(g.PA) : parseNumber(g.PF)
            const isPlayoff = g.GameStage && g.GameStage !== 'Reg Season'
            const gameType = String(g.GameType || g.GameStage || '').trim()
            const typeKey = normalizeString(gameType)
            const tag = !isPlayoff || !gameType ? null
              : typeKey.includes('unicornio') ? <Tag tone="red">🦄 {gameType}</Tag>
              : typeKey.includes('tapitas bowl') ? <Tag tone="gold">🏆 Tapitas Bowl</Tag>
              : g.GameStage === 'Consolation' ? <Tag>{typeKey === 'consolation bracket' ? 'Consolation' : gameType}</Tag>
              : <Tag tone="navy">{gameType}</Tag>
            const href = `/matchups?season=${encodeURIComponent(g.Season)}&week=${encodeURIComponent(g.Week)}&team=${encodeURIComponent(g.Team)}&opp=${encodeURIComponent(g.Opponent)}`
            return (
              <a key={i} href={href} className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 border-b border-[#F1F2F4] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[#F7F8FA] lg:px-4">
                <div>
                  <div className="text-[13px] font-semibold text-[#111]">{g.Season}</div>
                  <div className="text-[11px] text-[#6B7280]">Week {g.Week}</div>
                  {tag && <div className="mt-1">{tag}</div>}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo name={winner} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#111]">{winner}</span>
                    <span className="text-[14px] font-bold tabular-nums text-[#111]">{winnerScore.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo name={loser} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#6B7280]">{loser}</span>
                    <span className="text-[14px] tabular-nums text-[#9CA3AF]">{loserScore.toFixed(1)}</span>
                  </div>
                </div>
              </a>
            )
          })}
          {filteredHistory.length === 0 && <div className="py-8 text-center text-[13px] text-[#6B7280]">No games found</div>}
        </div>
      </CardShell>
    </>
  )

  return (
    <PageShell>
      {/* Seletor de times + ordenação */}
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 sm:p-2.5">
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="relative min-w-0">
            <span className="sr-only">Team</span>
            <select value={teamFilterA} onChange={(e) => { setTeamFilterA(e.target.value); setSelected(null) }} className={selectClass}>
              <option value="ALL">Any team</option>
              {allTeams.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          </label>
          <span className="text-[12px] text-[#9CA3AF]">vs</span>
          <label className="relative min-w-0">
            <span className="sr-only">Opponent</span>
            <select value={teamFilterB} onChange={(e) => { setTeamFilterB(e.target.value); setSelected(null) }} className={selectClass}>
              <option value="ALL">Any opponent</option>
              {allTeams.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          </label>
        </div>
        <div className="flex gap-1.5">
          {[['HEAT', '🔥 Heat'], ['GAMES', 'Games'], ['CLOSEST', 'Closest']].map(([value, label]) => (
            <ToggleChip key={value} active={sortBy === value} onClick={() => setSortBy(value)}>{label}</ToggleChip>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-5">
        <div className={selected ? 'hidden lg:block' : ''}>{listCard}</div>
        <div className="min-w-0">
          {detail || (
            <div className="hidden min-h-[320px] flex-col items-center justify-center rounded-xl bg-white text-center lg:flex">
              <Swords className="mb-3 h-8 w-8 text-[#9CA3AF]" />
              <div className="text-[16px] font-semibold text-[#111]">Select a rivalry</div>
              <p className="mt-1 text-[13px] text-[#6B7280]">Explore the greatest battles in league history.</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
