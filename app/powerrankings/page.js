'use client'

import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTeamFocus } from '../context/TeamFocus'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronDown,
  Star,
} from 'lucide-react'
import { BrandBackdrop, Podium, SummaryButton, PageShell, CardShell, CardGroup, StatRow, ResultBadge, StreakBadge, TeamLogo } from '../components/ui'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const BASE_URL = '/api/sheet'

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
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

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function TeamAvatar({ team, size = 'md' }) {
  const px = { sm: 28, md: 36, lg: 48 }[size] || 36
  return <TeamLogo name={team} size={px} />
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

// Faixas do ranking (6 vagas de playoff)
const TIERS = [
  { max: 3, label: 'Contenders', color: '#B8860B' },
  { max: 6, label: 'Playoff hunt', color: '#02275F' },
  { max: 8, label: 'On the bubble', color: '#9CA3AF' },
  { max: 99, label: 'Rebuilding', color: '#C8102E' },
]
const tierOf = rank => TIERS.find(t => rank <= t.max) || TIERS[TIERS.length - 1]

// "Season race": posição de cada time semana a semana (bump chart).
// Linhas cinza; o top 3 da semana em cores e o time destacado em azul forte.
function BumpChart({ weeks, series, active, onPick }) {
  const [hover, setHover] = useState(null)
  const W = 320, H = 300, padL = 22, padR = 34, padT = 12, padB = 22
  const n = weeks.length
  const maxRank = Math.max(10, ...series.flatMap(s => s.ranks.filter(Boolean)))
  const x = i => (n > 1 ? padL + (i * (W - padL - padR)) / (n - 1) : (padL + W - padR) / 2)
  const y = r => padT + ((r - 1) * (H - padT - padB)) / (maxRank - 1)
  const focus = hover || active
  const colorOf = s => s.team === focus ? '#02275F' : s.final === 1 ? '#B8860B' : s.final === 2 ? '#3B5B9A' : s.final === 3 ? '#C8102E' : '#C9CED6'
  const ordered = [...series].sort((a, b) => (a.team === focus) - (b.team === focus) || (b.final > 3) - (a.final > 3))
  const step = n > 8 ? Math.ceil(n / 8) : 1
  return (
    <div className="relative aspect-[320/300] w-full" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
        {Array.from({ length: maxRank }, (_, r) => (
          <g key={r}>
            <line x1={padL} x2={W - padR} y1={y(r + 1)} y2={y(r + 1)} stroke="#EEF0F2" strokeWidth="1" />
            <text x={padL - 8} y={y(r + 1) + 3.5} textAnchor="end" fontSize="10" fill="#9CA3AF">{r + 1}</text>
          </g>
        ))}
        {weeks.map((w, i) => (i % step === 0 || i === n - 1) && (
          <text key={w} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">W{w}</text>
        ))}
        {ordered.map(s => {
          const pts = s.ranks.map((r, i) => r ? [x(i), y(r)] : null).filter(Boolean)
          const isFocus = s.team === focus
          const c = colorOf(s)
          return (
            <g key={s.team} onMouseEnter={() => setHover(s.team)} onClick={() => onPick?.(s.team)} className="cursor-pointer">
              <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth="12" />
              <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={isFocus ? 3.5 : s.final <= 3 ? 2.5 : 1.5} strokeLinejoin="round" strokeLinecap="round" opacity={focus && !isFocus ? 0.55 : 1} />
              {pts.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={isFocus ? 3.5 : 2.5} fill="#fff" stroke={c} strokeWidth="1.5" />)}
            </g>
          )
        })}
      </svg>
      {/* Logos no fim de cada linha */}
      {series.map(s => s.final && (
        <button
          key={s.team}
          type="button"
          onMouseEnter={() => setHover(s.team)}
          onClick={() => onPick?.(s.team)}
          title={s.team}
          className={`absolute -translate-y-1/2 rounded-full bg-white p-0.5 transition-transform hover:scale-110 ${s.team === focus ? 'ring-2 ring-[#02275F]' : 'ring-1 ring-[#E6E8EB]'}`}
          style={{ left: `${((W - padR + 6) / W) * 100}%`, top: `${(y(s.final) / H) * 100}%` }}
        >
          <TeamLogo name={s.team} size={18} />
        </button>
      ))}
    </div>
  )
}

function TrendIcon({ delta }) {
  if (delta > 0) return <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#1E8E3E]"><TrendingUp className="h-3 w-3" />{Math.abs(delta)}</span>
  if (delta < 0) return <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#D01F2D]"><TrendingDown className="h-3 w-3" />{Math.abs(delta)}</span>
  return <span className="text-[#9CA3AF]"><Minus className="h-3 w-3" /></span>
}

function getTierColor(rank, total) {

  const pct = rank / total

  if (rank === 1) return 'text-[#B8860B]'

  if (pct <= 0.25) return 'text-[#16274F]'

  if (pct <= 0.5) return 'text-[#1E8E3E]'

  if (pct <= 0.75) return 'text-[#6B7280]'

  return 'text-[#D01F2D]'
}

function getHistoryColor(rank, total) {
  const numericRank = Number(rank)

  if (numericRank === 1) return 'bg-[#F5C518]'
  if (numericRank >= 2 && numericRank <= 3) return 'bg-[#1E8E3E]'
  if (numericRank >= 4 && numericRank <= 6) return 'bg-[#16274F]'
  if (numericRank >= 7 && numericRank <= 10) return 'bg-[#D01F2D]'

  return 'bg-[#16274F]'
}

function matchupHref(row, allGames = []) {
  if (!row) return '/matchups'

  const season = String(row?.Season || '').trim()
  const week = String(row?.Week || '').trim()
  const team = String(row?.Team || '').trim()
  const opponent = String(row?.Opponent || '').trim()

  // O matchup canônico é SEMPRE a primeira linha daquele confronto
  // específico (mesma Season + Week + dupla de times), e não a primeira
  // linha da semana inteira. GAME_FACTS_ALL possui as duas linhas espelhadas.
  const canonicalRow = allGames.find(g => {
    const gSeason = String(g?.Season || '').trim()
    const gWeek = String(g?.Week || '').trim()
    const gTeam = String(g?.Team || '').trim()
    const gOpponent = String(g?.Opponent || '').trim()

    if (gSeason !== season || gWeek !== week) return false

    return (
      (gTeam === team && gOpponent === opponent) ||
      (gTeam === opponent && gOpponent === team)
    )
  }) || row

  return `/matchups?season=${encodeURIComponent(String(canonicalRow?.Season || '').trim())}&week=${encodeURIComponent(String(canonicalRow?.Week || '').trim())}&team=${encodeURIComponent(String(canonicalRow?.Team || '').trim())}&opp=${encodeURIComponent(String(canonicalRow?.Opponent || '').trim())}`
}

function PowerRankingsPageContent() {

  const searchParams = useSearchParams()
  const urlSeason = searchParams.get('season')
  const [teamFocus] = useTeamFocus()
  const urlWeek = searchParams.get('week')

  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')
  const [expanded, setExpanded] = useState(null)
  const seasonsRef = useRef(null)
  const weeksRef = useRef(null)
  const historyRefs = useRef({})
  const formRefs = useRef({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allSeasons, setAllSeasons] = useState([])
  const [calendar, setCalendar] = useState([])
  const { setLeftSlot } = useDrawer()



  useEffect(() => {

    if (!expanded) return

    const container =
      historyRefs.current[expanded]

    if (!container) return

    container.scrollTo({
      left: container.scrollWidth,
      behavior: 'smooth',
    })

  }, [expanded])

  useEffect(() => {

    async function load() {

      const [gameData, calendarData] = await Promise.all([
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/CALENDAR`),
      ])

      setCalendar(calendarData)

      // OPCIONAL:
      // criar uma aba POWER_RANKING_NOTES
      // com colunas:
      // Season | Week | Team | Note


      setGames(gameData)

      const allSeasonsArr = [
        ...new Set(
          gameData
            .filter(g => parseNumber(g?.['Power Ranking']) > 0)
            .map(g => String(g?.Season || '').trim())
            .filter(Boolean)
        )
      ].sort((a, b) => Number(a) - Number(b))

      if (allSeasonsArr.length > 0) {

        const latestSeason =
          allSeasonsArr[allSeasonsArr.length - 1]

        // Se veio da página de Matchups (?season=X&week=Y), respeita a seleção
        // em vez de sempre cair na temporada/semana mais recente.
        const chosenSeason =
          urlSeason && allSeasonsArr.includes(urlSeason) ? urlSeason : latestSeason

        setSeason(chosenSeason)
        setAllSeasons(allSeasonsArr.map(s => Number(s)))


        const ws = [
          ...new Set(
            gameData
              .filter(g =>
                String(g?.Season || '').trim() === chosenSeason &&
                parseNumber(g?.['Power Ranking']) > 0
              )
              .map(g => String(g?.Week || '').trim())
              .filter(Boolean)
          )
        ].sort((a, b) => parseFloat(a) - parseFloat(b))

        if (ws.length > 0) {
          const chosenWeek =
            urlWeek && ws.includes(urlWeek) ? urlWeek : ws[ws.length - 1]
          setWeek(chosenWeek)
        }
      }

      setLoading(false)
    }

    load()

  }, [])

  useEffect(() => {
    setLeftSlot(
      <SummaryButton onClick={() => setDrawerOpen(true)} compact />
    )
    return () => setLeftSlot(null)
  }, [])

  const seasons = useMemo(() => {
    return [
      ...new Set(
        games
          .filter(g => parseNumber(g?.['Power Ranking']) > 0)
          .map(g => String(g?.Season || '').trim())
          .filter(Boolean)
      )
    ].sort((a, b) => Number(a) - Number(b))
  }, [games])

  const weeks = useMemo(() => {

    if (!season) return []

    return [
      ...new Set(
        games
          .filter(g =>
            String(g?.Season || '').trim() === season &&
            parseNumber(g?.['Power Ranking']) > 0
          )
          .map(g => String(g?.Week || '').trim())
          .filter(Boolean)
      )
    ].sort((a, b) => getWeekStart(a) - getWeekStart(b))

  }, [games, season])

  useEffect(() => {

    if (!season || !seasonsRef.current) return

    const activeBtn =
      seasonsRef.current.querySelector(
        '[data-active="true"]'
      )

    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      })
    }

  }, [season])

  useEffect(() => {

    if (!week || !weeksRef.current) return

    const activeBtn =
      weeksRef.current.querySelector(
        '[data-active="true"]'
      )

    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      })
    }

  }, [week])

  const rankings = useMemo(() => {

    if (!season || !week) return []

    const filtered = games.filter(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      parseNumber(g?.['Power Ranking']) > 0
    )

    // Build a lookup from CALENDAR for the next week after `week`
    // CALENDAR columns expected: Season | Week | Team A | Team B
    const currentWeekStart = getWeekStart(week)
    const nextWeekFromCalendar = (teamName) => {
      // Find calendar rows for this season, weeks strictly after current week
      const futureRows = calendar.filter(r => {
        const calSeason = String(r?.Season || r?.season || '').trim()
        const calWeek = String(r?.Week || r?.week || '').trim()
        return calSeason === season && getWeekStart(calWeek) > currentWeekStart
      }).sort((a, b) =>
        getWeekStart(String(a?.Week || '')) - getWeekStart(String(b?.Week || ''))
      )

      for (const r of futureRows) {
        const teamA = String(r?.['Team A'] || r?.TeamA || r?.team_a || r?.Home || '').trim()
        const teamB = String(r?.['Team B'] || r?.TeamB || r?.team_b || r?.Away || '').trim()
        const calWeek = String(r?.Week || r?.week || '').trim()
        if (teamA.toLowerCase() === teamName.toLowerCase()) {
          return `${teamB} (Week ${calWeek})`
        }
        if (teamB.toLowerCase() === teamName.toLowerCase()) {
          return `${teamA} (Week ${calWeek})`
        }
      }
      return ''
    }

    const mapped = filtered.map(g => {

      const teamName = String(g?.Team || '').trim()
      const nextFromGame = String(g?.Next || '').trim()
      // Fall back to CALENDAR when Next column is empty
      const next = nextFromGame || nextWeekFromCalendar(teamName)

      return {

        team: teamName,

        owner: String(g?.Owner || '').trim(),

        rank: parseNumber(g?.['Power Ranking']),

        delta: parseNumber(g?.['PR Delta']),

        wins: parseNumber(g?.Wins),

        losses: parseNumber(g?.Losses),

        avgPF: parseNumber(g?.AVG_PF),

        ovw: parseNumber(g?.OVW),

        streak: String(
          g?.Streak_Total ||
          g?.Streak ||
          ''
        ).trim(),

        opponent: String(g?.Opponent || '').trim(),

        result: String(g?.Result || '')
          .trim()
          .toUpperCase(),

        pf: parseNumber(g?.PF),

        pa: parseNumber(g?.PA),

        next,

        note: String(g?.Note || '').trim(),

        matchupRow: {
          Season: g?.Season,
          Week: g?.Week,
          Team: g?.Team,
          Opponent: g?.Opponent,
        },
      }
    })

    return mapped
      .sort((a, b) => a.rank - b.rank)
      .map(team => {

        const avgRank =
          [...mapped]
            .sort((a, b) => b.avgPF - a.avgPF)
            .findIndex(t => t.team === team.team) + 1

        const ovwRank =
          [...mapped]
            .sort((a, b) => b.ovw - a.ovw)
            .findIndex(t => t.team === team.team) + 1

        return {
          ...team,
          avgRank,
          ovwRank,
        }
      })

  }, [games, season, week, calendar])

  const totalTeams = rankings.length

  useEffect(() => {

    if (!rankings.length) return

    requestAnimationFrame(() => {

      Object.values(formRefs.current).forEach(el => {

        if (!el) return

        el.scrollLeft = el.scrollWidth

      })

    })

  }, [rankings])

  function getWeekStart(w) {
    return parseFloat(String(w || '').split('-')[0])
  }

  function getSeasonResults(teamName) {

    return games
      .filter(g => {

        const sameSeason =
          String(g?.Season || '').trim() === season

        const sameTeam =
          String(g?.Team || '').trim() === teamName

        const gameWeek =
          getWeekStart(g?.Week)

        return (
          sameSeason &&
          sameTeam &&
          gameWeek <= getWeekStart(week)
        )
      })
      .sort((a, b) =>
        parseFloat(a?.Week || 0) -
        parseFloat(b?.Week || 0)
      )
      .map(g =>
        String(g?.Result || '')
          .trim()
          .toUpperCase()
      )
  }

  function getNextOpponentData(teamName) {

    const currentSeason = parseNumber(season)
    const currentWeekStart = getWeekStart(week)

    // First: look in GAME_FACTS_ALL for future games
    const futureGames = games
      .filter(g => {
        const t = String(g?.Team || '').trim()
        const gameSeason = parseNumber(g?.Season)
        const gameWeek = getWeekStart(g?.Week)

        return (
          t === teamName &&
          gameSeason === currentSeason &&
          gameWeek > currentWeekStart &&
          String(g?.Opponent || '').trim() !== ''
        )
      })
      .sort((a, b) => getWeekStart(a?.Week) - getWeekStart(b?.Week))

    if (futureGames.length > 0) {
      const nextGame = futureGames[0]
      const opponent = String(nextGame?.Opponent || '').trim()
      if (opponent) {
        const opponentCurrent = games.find(g =>
          String(g?.Season || '').trim() === season &&
          String(g?.Week || '').trim() === week &&
          String(g?.Team || '').trim() === opponent
        )
        return {
          week: nextGame?.Week,
          team: opponent,
          wins: parseNumber(opponentCurrent?.Wins),
          losses: parseNumber(opponentCurrent?.Losses),
        }
      }
    }

    // Fallback: look in CALENDAR for next matchup
    const futureCalendar = calendar
      .filter(r => {
        const calSeason = String(r?.Season || r?.season || '').trim()
        const calWeek = String(r?.Week || r?.week || '').trim()
        return (
          parseNumber(calSeason) === currentSeason &&
          getWeekStart(calWeek) > currentWeekStart
        )
      })
      .sort((a, b) =>
        getWeekStart(String(a?.Week || a?.week || '')) -
        getWeekStart(String(b?.Week || b?.week || ''))
      )

    for (const r of futureCalendar) {
      const teamA = String(r?.['Team A'] || r?.TeamA || r?.team_a || r?.Home || r?.['Team_A'] || '').trim()
      const teamB = String(r?.['Team B'] || r?.TeamB || r?.team_b || r?.Away || r?.['Team_B'] || '').trim()
      const calWeek = String(r?.Week || r?.week || '').trim()

      let opponent = ''
      if (teamA.toLowerCase() === teamName.toLowerCase()) opponent = teamB
      else if (teamB.toLowerCase() === teamName.toLowerCase()) opponent = teamA

      if (opponent) {
        const opponentCurrent = games.find(g =>
          String(g?.Season || '').trim() === season &&
          String(g?.Week || '').trim() === week &&
          String(g?.Team || '').trim() === opponent
        )
        return {
          week: calWeek,
          team: opponent,
          wins: parseNumber(opponentCurrent?.Wins),
          losses: parseNumber(opponentCurrent?.Losses),
        }
      }
    }

    return null
  }

  function getAllTimeRecord(teamName) {

    let wins = 0
    let losses = 0

    games.forEach(g => {

      const team =
        String(g?.Team || '').trim()

      if (team !== teamName) return

      const gameSeason =
        parseNumber(g?.Season)

      const gameWeek =
        getWeekStart(g?.Week)

      const currentWeek =
        getWeekStart(week)

      const currentSeason =
        parseNumber(season)

      const validGame =
        gameSeason < currentSeason ||
        (
          gameSeason === currentSeason &&
          gameWeek <= currentWeek
        )

      if (!validGame) return

      const result =
        String(g?.Result || '')
          .trim()
          .toUpperCase()

      if (result === 'W') wins++
      if (result === 'L') losses++
    })

    return {
      wins,
      losses,
    }
  }

  function getH2H(teamA, teamB) {

    if (!teamA || !teamB) return null

    const gamesAsA = games.filter(g => {
      const t = String(g?.Team || '').trim()
      const o = String(g?.Opponent || '').trim()
      if (!(t === teamA && o === teamB)) return false
      const gameSeason = parseNumber(g?.Season)
      const gameWeek = getWeekStart(g?.Week)
      const currentSeason = parseNumber(season)
      const currentWeek = getWeekStart(week)
      return (
        gameSeason < currentSeason ||
        (gameSeason === currentSeason && gameWeek <= currentWeek)
      )
    })

    const gamesAsB = games.filter(g => {
      const t = String(g?.Team || '').trim()
      const o = String(g?.Opponent || '').trim()
      if (!(t === teamB && o === teamA)) return false
      const gameSeason = parseNumber(g?.Season)
      const gameWeek = getWeekStart(g?.Week)
      const currentSeason = parseNumber(season)
      const currentWeek = getWeekStart(week)
      return (
        gameSeason < currentSeason ||
        (gameSeason === currentSeason && gameWeek <= currentWeek)
      )
    })

    const aWins = gamesAsA.filter(g =>
      String(g?.Result || '').trim().toUpperCase() === 'W'
    ).length

    const bWins = gamesAsB.filter(g =>
      String(g?.Result || '').trim().toUpperCase() === 'W'
    ).length

    const orderedGames = gamesAsA.sort((a, b) => {
      const sa = parseNumber(a.Season)
      const sb = parseNumber(b.Season)
      if (sa !== sb) return sa - sb
      return getWeekStart(a.Week) - getWeekStart(b.Week)
    })

    let streakWinner = null
    let streakCount = 0

    orderedGames.forEach(g => {
      const result = String(g?.Result || '').trim().toUpperCase()
      const winner = result === 'W' ? teamA : teamB

      if (winner === streakWinner) {
        streakCount++
      } else {
        streakWinner = winner
        streakCount = 1
      }
    })

    return {
      aWins,
      bWins,
      streak:
        streakWinner === teamA
          ? `W${streakCount}`
          : `L${streakCount}`
    }
  }

  function getTeamHistory(teamName) {

    return games
      .filter(g => {

        const sameSeason =
          String(g?.Season || '').trim() === season

        const sameTeam =
          String(g?.Team || '').trim() === teamName

        const validRank =
          parseNumber(g?.['Power Ranking']) > 0

        const gameWeek = getWeekStart(g?.Week)
        const currentWeekStart = getWeekStart(week)

        return (
          sameSeason &&
          sameTeam &&
          validRank &&
          gameWeek <= currentWeekStart
        )
      })
      .sort((a, b) =>
        getWeekStart(a?.Week) -
        getWeekStart(b?.Week)
      )
  }

  function getOpponentRecord(opponentName) {

    const opponentGame = games.find(g => {

      return (
        String(g?.Season || '').trim() === season &&
        String(g?.Week || '').trim() === week &&
        String(g?.Team || '').trim() === opponentName
      )
    })

    if (!opponentGame) {
      return null
    }

    return {
      wins: parseNumber(opponentGame?.Wins),
      losses: parseNumber(opponentGame?.Losses),
    }
  }

  const handleSeasonChange = (s) => {
    setSeason(s)
    const ws = [...new Set(games.filter(g => String(g?.Season || '').trim() === s && parseNumber(g?.['Power Ranking']) > 0).map(g => String(g?.Week || '').trim()).filter(Boolean))]
      .sort((a, b) => parseFloat(a) - parseFloat(b))
    if (ws.length > 0) setWeek(ws[ws.length - 1])
  }

  // Posição de cada time em todas as semanas até a semana escolhida
  const raceWeeks = weeks.filter(w => getWeekStart(w) <= getWeekStart(week))
  // Todos os times da temporada (nos playoffs só alguns seguem ranqueados)
  const raceTeams = [...new Set(games
    .filter(x => String(x?.Season || '').trim() === season && parseNumber(x?.['Power Ranking']) > 0 && raceWeeks.includes(String(x?.Week || '').trim()))
    .map(x => String(x?.Team || '').trim()))]
  const raceSeries = raceTeams.map(team => {
    const ranks = raceWeeks.map(w => {
      const g = games.find(x => String(x?.Season || '').trim() === season && String(x?.Week || '').trim() === w && String(x?.Team || '').trim() === team)
      const r = parseNumber(g?.['Power Ranking'])
      return r > 0 ? r : null
    })
    const final = [...ranks].reverse().find(Boolean) || null
    return { team, final, ranks }
  })

  const risers = [...rankings].filter(t => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const fallers = [...rankings].filter(t => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)
  const topScorer = [...rankings].sort((a, b) => b.pf - a.pf)[0]
  const bestAvg = [...rankings].sort((a, b) => b.avgPF - a.avgPF)[0]

  const markdownComponents = {
    h1: ({ children }) => <h3 className="mb-2 mt-3 text-[16px] font-bold text-[#111]">{children}</h3>,
    h2: ({ children }) => <h3 className="mb-2 mt-3 text-[15px] font-bold text-[#111]">{children}</h3>,
    h3: ({ children }) => <h3 className="mb-2 mt-3 text-[14px] font-bold text-[#111]">{children}</h3>,
    p: ({ children }) => <p className="mb-2 leading-[1.65] text-[#2F3542] last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-[#111]">{children}</strong>,
    em: ({ children }) => <em className="font-semibold not-italic text-[#02275F]">{children}</em>,
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-[#2F3542]">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-[#2F3542]">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    hr: () => <hr className="my-3 border-[#E6E8EB]" />,
    blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-[#02275F] pl-3 text-[#3F4757]">{children}</blockquote>,
  }

  const moversCard = rankings.length > 0 && (
    <CardShell title="This week" subtitle={`${season} · Week ${week}`} sidebar>
      {risers.length > 0 && (
        <CardGroup label="Biggest risers" first>
          {risers.map(t => (
            <StatRow key={t.team} onClick={() => setExpanded(t.team)} left={<TeamAvatar team={t.team} size="sm" />} title={t.team} subtitle={`#${t.rank} · ${t.wins}–${t.losses}`} value={`▲ ${t.delta}`} valueClass="text-[#1E8E3E]" />
          ))}
        </CardGroup>
      )}
      {fallers.length > 0 && (
        <CardGroup label="Biggest fallers" first={risers.length === 0}>
          {fallers.map(t => (
            <StatRow key={t.team} onClick={() => setExpanded(t.team)} left={<TeamAvatar team={t.team} size="sm" />} title={t.team} subtitle={`#${t.rank} · ${t.wins}–${t.losses}`} value={`▼ ${Math.abs(t.delta)}`} valueClass="text-[#D01F2D]" />
          ))}
        </CardGroup>
      )}
      <CardGroup label="Scoring" first={risers.length === 0 && fallers.length === 0}>
        {topScorer && <StatRow href={matchupHref(topScorer.matchupRow, games)} left={<TeamAvatar team={topScorer.team} size="sm" />} eyebrow="Week high" title={topScorer.team} subtitle={`vs ${topScorer.opponent}`} value={topScorer.pf.toFixed(2)} />}
        {bestAvg && <StatRow onClick={() => setExpanded(bestAvg.team)} left={<TeamAvatar team={bestAvg.team} size="sm" />} eyebrow="Best average" title={bestAvg.team} subtitle="Season points per week" value={bestAvg.avgPF.toFixed(1)} />}
      </CardGroup>
      <div className="h-2 lg:h-3" />
    </CardShell>
  )

  return (
    <PageShell loading={loading} headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }}>
      {/* Temporada + semana (mesmo padrão da Matchups) */}
      <div className="mb-2 flex items-stretch overflow-hidden rounded-xl bg-white">
        <label className="relative flex flex-shrink-0 items-center border-r border-[#EEF0F2] pl-3 pr-7">
          <span className="sr-only">Season</span>
          <select value={season} onChange={e => handleSeasonChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent py-3 text-[14px] font-bold text-[#111] outline-none">
            {[...seasons].reverse().map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#6B7280]" />
        </label>
        <span className="flex-shrink-0 self-center pl-3 pr-1 text-[12px] text-[#6B7280]">Week</span>
        <div ref={weeksRef} className="scroll-hide flex min-w-0 flex-1 overflow-x-auto">
          {weeks.map(w => (
            <button
              key={w}
              data-active={week === w}
              onClick={() => setWeek(w)}
              className={`flex-shrink-0 border-b-2 px-2.5 py-3 text-[13px] tabular-nums transition-colors ${week === w ? 'border-[#D01F2D] font-semibold text-[#111]' : 'border-transparent text-[#6B7280] hover:text-[#111]'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Hero da semana: o líder, os destaques e o pódio do top 3 */}
      {rankings.length >= 3 && (() => {
        const leader = rankings[0]
        const riser = risers[0]
        return (
          <div className="relative mb-2 overflow-hidden rounded-xl text-white">
            <BrandBackdrop />
            <div className="relative flex min-h-[176px] items-stretch gap-4 px-4 pt-4 sm:px-6 sm:pt-5">
              <div className="min-w-0 flex-1 pb-4 sm:pb-5">
                <div className="text-[12px] font-medium text-white/70">{season} · Week {week} · Power Rankings</div>
                <div className="mt-2 flex min-w-0 items-center gap-3">
                  <span className="flex-shrink-0 rounded-full bg-white p-1 shadow-lg sm:hidden"><TeamLogo name={leader.team} size={40} /></span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8C766]">#1 this week</div>
                    <h1 className="truncate text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">{leader.team}</h1>
                  </div>
                </div>
                <div className="mt-1 text-[13px] text-white/80">
                  <span className="font-semibold tabular-nums text-white">{leader.wins}–{leader.losses}</span> · {leader.avgPF.toFixed(1)} pts per week
                  {leader.delta > 0 ? ` · ▲ ${leader.delta}` : leader.delta < 0 ? ` · ▼ ${Math.abs(leader.delta)}` : ' · holds the top spot'}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {riser && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px]"><span className="text-white/70">Biggest riser</span><TeamLogo name={riser.team} size={14} /><span className="font-semibold">{riser.team}</span><span className="text-[#7FD18A]">▲ {riser.delta}</span></span>}
                  {topScorer && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px]"><span className="text-white/70">Week high</span><TeamLogo name={topScorer.team} size={14} /><span className="font-semibold">{topScorer.team}</span><span className="tabular-nums text-[#E8C766]">{topScorer.pf.toFixed(2)}</span></span>}
                </div>
              </div>
              <div className="hidden flex-shrink-0 self-end sm:block"><Podium rows={rankings.slice(0, 3)} /></div>
            </div>
          </div>
        )
      })()}

      <div data-sticky-cols className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
        <div className="min-w-0">
          <CardShell title="Power Rankings" subtitle={`${season} · Week ${week} · tap a team for details`}>
            <div>
              {rankings.map((team, ti) => {
                const tier = tierOf(team.rank)
                const isFocus = team.team === teamFocus
                const newTier = ti === 0 || tierOf(rankings[ti - 1].rank).label !== tier.label
                const expandedOpen = expanded === team.team
                const seasonResults = getSeasonResults(team.team)
                const nextOpponent = expandedOpen ? getNextOpponentData(team.team) : null
                const h2h = nextOpponent ? getH2H(team.team, nextOpponent.team) : null
                const history = expandedOpen ? getTeamHistory(team.team) : []
                const opponentRecord = expandedOpen ? getOpponentRecord(team.opponent) : null

                return (
                  <React.Fragment key={team.team}>
                  {newTier && (
                    <div className="flex items-center gap-2 border-b border-[#F1F2F4] bg-[#FAFBFC] px-3 py-1.5 lg:px-4">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: tier.color }} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tier.color === '#9CA3AF' ? '#6B7280' : tier.color }}>{tier.label}</span>
                    </div>
                  )}
                  <div className={`relative border-b border-[#F1F2F4] last:border-b-0 ${expandedOpen ? 'bg-[#F9FAFB]' : team.team === teamFocus ? 'bg-[#FFF8E1]' : ''}`}>
                    <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: tier.color }} />
                    <button onClick={() => setExpanded(expandedOpen ? null : team.team)} className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#F7F8FA] lg:gap-4 lg:px-4">
                      <div className="w-9 flex-shrink-0 text-center">
                        <div className="text-[26px] font-bold leading-none tabular-nums" style={{ color: tier.color === '#9CA3AF' ? '#6B7280' : tier.color }}>{team.rank}</div>
                        <div className="mt-1 flex justify-center"><TrendIcon delta={team.delta} /></div>
                      </div>
                      <TeamAvatar team={team.team} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[14px] font-semibold text-[#111] group-hover:text-[#D01F2D] sm:text-[15px]">{team.team}</span>
                          {isFocus && <span className="flex-shrink-0 rounded bg-[#B8860B] px-1.5 py-0.5 text-[10px] font-semibold text-white">Your team</span>}
                          {team.rank === 1 && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-[#F5C518] text-[#F5C518]" />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[#6B7280]">
                          {team.owner && <span className="truncate">{team.owner}</span>}
                          {team.owner && <span>·</span>}
                          <span className="font-semibold tabular-nums text-[#111]">{team.wins}–{team.losses}</span>
                          <StreakBadge streak={team.streak} />
                        </div>
                        <div
                          ref={(el) => { if (el) formRefs.current[team.team] = el }}
                          className="scroll-hide mt-1.5 overflow-x-auto"
                        >
                          <div className="flex min-w-max items-center gap-0.5">
                            {seasonResults.map((r, idx) => (
                              <span key={idx} title={`Week ${idx + 1}`} className={`h-1.5 w-4 rounded-full ${r === 'W' ? 'bg-[#1E8E3E]' : r === 'L' ? 'bg-[#D01F2D]' : 'bg-[#C4C7CC]'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="hidden flex-shrink-0 gap-5 text-right sm:flex">
                        <div>
                          <div className="text-[11px] text-[#6B7280]">Avg</div>
                          <div className="text-[14px] font-semibold tabular-nums text-[#111]">{team.avgPF.toFixed(1)}</div>
                          <div className="text-[11px] text-[#9CA3AF]">#{team.avgRank}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-[#6B7280]">OVW</div>
                          <div className="text-[14px] font-semibold tabular-nums text-[#111]">{team.ovw.toFixed(0)}</div>
                          <div className="text-[11px] text-[#9CA3AF]">#{team.ovwRank}</div>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#A0A5AD] transition-transform ${expandedOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {expandedOpen && (
                      <div className="space-y-3 px-3 pb-4 lg:px-4">
                        {/* Números no mobile */}
                        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[#EEF0F2] sm:hidden">
                          <div className="bg-white px-3 py-2"><div className="text-[11px] text-[#6B7280]">Avg pts</div><div className="text-[15px] font-semibold tabular-nums text-[#111]">{team.avgPF.toFixed(1)} <span className="text-[11px] font-normal text-[#9CA3AF]">#{team.avgRank}</span></div></div>
                          <div className="bg-white px-3 py-2"><div className="text-[11px] text-[#6B7280]">OVW</div><div className="text-[15px] font-semibold tabular-nums text-[#111]">{team.ovw.toFixed(0)} <span className="text-[11px] font-normal text-[#9CA3AF]">#{team.ovwRank}</span></div></div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          <Link href={matchupHref(team.matchupRow, games)} className="group/card flex min-w-0 items-center gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-[#EEF0F2] hover:ring-[#D6D9DE]">
                            <TeamAvatar team={team.opponent} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] text-[#6B7280]">This week</div>
                              <div className="truncate text-[13px] font-medium text-[#111] group-hover/card:text-[#D01F2D]">vs {team.opponent} {opponentRecord && <span className="text-[#6B7280]">({opponentRecord.wins}–{opponentRecord.losses})</span>}</div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              <ResultBadge result={team.result} />
                              <span className="text-[13px] font-semibold tabular-nums text-[#111]">{team.pf.toFixed(1)}<span className="font-normal text-[#9CA3AF]"> – {team.pa.toFixed(1)}</span></span>
                            </div>
                          </Link>
                          <div className="flex min-w-0 items-center gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-[#EEF0F2]">
                            {nextOpponent && h2h ? (
                              <>
                                <TeamAvatar team={nextOpponent.team} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] text-[#6B7280]">Next · Week {nextOpponent.week}</div>
                                  <div className="truncate text-[13px] font-medium text-[#111]">vs {nextOpponent.team} <span className="text-[#6B7280]">({nextOpponent.wins}–{nextOpponent.losses})</span></div>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-2 text-[12px] text-[#6B7280]">
                                  H2H <span className="font-semibold tabular-nums text-[#111]">{h2h.aWins}–{h2h.bWins}</span>
                                  <StreakBadge streak={h2h.streak} />
                                </div>
                              </>
                            ) : (
                              <div className="text-[13px] text-[#6B7280]">No upcoming matchup available</div>
                            )}
                          </div>
                        </div>

                        {team.note && (
                          <div className="rounded-lg bg-white px-3 py-3 text-[14px] ring-1 ring-[#EEF0F2] sm:px-4">
                            <div className="mb-1 text-[12px] font-semibold text-[#02275F]">Power take</div>
                            <ReactMarkdown components={markdownComponents}>{team.note}</ReactMarkdown>
                          </div>
                        )}

                        <div className="rounded-lg bg-white px-3 py-3 ring-1 ring-[#EEF0F2] sm:px-4">
                          <div className="mb-2 text-[12px] font-semibold text-[#111]">Ranking history</div>
                          <div ref={(el) => { if (el) historyRefs.current[team.team] = el }} className="scroll-hide flex items-end gap-1.5 overflow-x-auto">
                            {history.map((h, idx) => {
                              const r = parseNumber(h?.['Power Ranking'])
                              const height = ((totalTeams - r + 1) / totalTeams) * 70 + 12
                              const current = String(h?.Week || '').trim() === week
                              return (
                                <div key={idx} className="flex flex-shrink-0 flex-col items-center gap-1">
                                  <div className={`text-[11px] tabular-nums ${current ? 'font-bold text-[#111]' : 'text-[#6B7280]'}`}>{r}</div>
                                  <div className={`w-7 rounded-t ${getHistoryColor(r, totalTeams)} ${current ? '' : 'opacity-70'}`} style={{ height: `${height}px` }} />
                                  <div className={`text-[11px] tabular-nums ${current ? 'font-bold text-[#111]' : 'text-[#6B7280]'}`}>W{h?.Week}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </React.Fragment>
                )
              })}
            </div>
          </CardShell>
        </div>
        <aside className="lg:[&>section]:!bg-[#F6F7F9] lg:[&>section:nth-of-type(even)]:!bg-[#FBFBFC]">
          {raceSeries.length > 0 && (
            <CardShell title="Season race" subtitle={`${season} · rank week by week · tap a line`} sidebar>
              <div className="px-2 pb-3 pt-3 lg:px-3">
                <BumpChart weeks={raceWeeks} series={raceSeries} active={expanded || teamFocus} onPick={team => setExpanded(team)} />
              </div>
            </CardShell>
          )}
          {moversCard}
        </aside>
      </div>

      <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={allSeasons} />
    </PageShell>
  )
}

export default function PowerRankingsPage() {
  return (
    <Suspense fallback={<PageShell loading />}>
      <PowerRankingsPageContent />
    </Suspense>
  )
}
