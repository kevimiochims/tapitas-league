'use client'

import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Star,
  BarChart2,
} from 'lucide-react'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

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
  const avatar = getTeamAvatar(team)

  const sizeClass =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-14 w-14 rounded-2xl'
        : 'h-10 w-10 rounded-xl'

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={team}
        className={`${sizeClass} flex-shrink-0 object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex flex-shrink-0 items-center justify-center bg-[#16274F] text-[10px] font-black text-white uppercase`}
    >
      {String(team || '').slice(0, 2)}
    </div>
  )
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

function TrendIcon({ delta }) {

  if (delta > 0) {
    return (
      <div className="flex items-center gap-1 text-[#1E8E3E]">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-black">
          +{Math.abs(delta)}
        </span>
      </div>
    )
  }

  if (delta < 0) {
    return (
      <div className="flex items-center gap-1 text-[#D01F2D]">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-black">
          -{Math.abs(delta)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-[#6B7280]">
      <Minus className="h-4 w-4" />
    </div>
  )
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
  const pct = rank / total

  if (pct <= 0.25) return 'bg-[#1E8E3E]'
  if (pct <= 0.60) return 'bg-[#16274F]'
  return 'bg-[#D01F2D]'
}

function matchupHref(row) {
  if (!row) return '/matchups'

  return `/matchups?season=${encodeURIComponent(String(row?.Season || '').trim())}&week=${encodeURIComponent(String(row?.Week || '').trim())}&team=${encodeURIComponent(String(row?.Team || '').trim())}&opp=${encodeURIComponent(String(row?.Opponent || '').trim())}`
}

export default function PowerRankingsPage() {

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

        setSeason(latestSeason)
        setAllSeasons(allSeasonsArr.map(s => Number(s)))


        const ws = [
          ...new Set(
            gameData
              .filter(g =>
                String(g?.Season || '').trim() === latestSeason &&
                parseNumber(g?.['Power Ranking']) > 0
              )
              .map(g => String(g?.Week || '').trim())
              .filter(Boolean)
          )
        ].sort((a, b) => parseFloat(a) - parseFloat(b))

        if (ws.length > 0) {
          setWeek(ws[ws.length - 1])
        }
      }

      setLoading(false)
    }

    load()

  }, [])

  useEffect(() => {
    setLeftSlot(
      <button
        onClick={() => setDrawerOpen(true)}
        className="inline-flex h-10 items-center gap-2 border-2 border-[#0A0A0A] bg-[#D01F2D] px-5 text-sm font-black text-white tp-shadow-black transition-all hover:-translate-y-[1px]"
      >
        Summary
        <ChevronRight className="h-4 w-4" />
      </button>
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

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

        .scroll-hide::-webkit-scrollbar {
          display: none;
        }

        .scroll-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-red { box-shadow: 6px 6px 0 0 #D01F2D; }
        .tp-shadow-red-sm { box-shadow: 4px 4px 0 0 #D01F2D; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
        .tp-stack-title { color: #D01F2D; text-shadow: 4px 4px 0 #0A0A0A; }
      `}</style>

      <Header onSummaryOpen={() => setDrawerOpen(true)} />

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
              <text x="790" y="310" fontFamily="'Bebas Neue', sans-serif" fontSize="340" fill="#16274F" opacity="0.04" textAnchor="middle">1</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.90) 48%, rgba(247,246,242,0.25) 100%)' }} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div
              className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 bg-[#D01F2D] px-3 py-1.5 sm:px-4 sm:py-2"
              style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
            >
              <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4 text-white shrink-0" />
              <span className="font-black uppercase tracking-[0.25em] text-white whitespace-nowrap" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                Weekly Rankings
              </span>
            </div>
            <h1
              className="leading-[0.9] tracking-[-0.02em] text-[#16274F]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
              }}
            >
              Power
              <span className="tp-stack-title">{' '}Rankings</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-[#3F4757] leading-relaxed" style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}>
              Who's hot, who's not. The definitive weekly power rankings
              of the Tapitas League — based on performance, not just record.
            </p>
          </div>
        </div>

        {/* SEASON */}
        <div className="mb-6 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">

          <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
            <div
              className="font-black uppercase tracking-[0.3em] text-[#16274F]"
              style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
            >
              Season
            </div>
          </div>

          <div
            ref={seasonsRef}
            className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4"
          >
            {seasons.map(s => (
              <button
                key={s}
                data-active={season === s}
                onClick={() => {

                  setSeason(s)

                  const ws = [
                    ...new Set(
                      games
                        .filter(g =>
                          String(g?.Season || '').trim() === s &&
                          parseNumber(g?.['Power Ranking']) > 0
                        )
                        .map(g => String(g?.Week || '').trim())
                        .filter(Boolean)
                    )
                  ].sort((a, b) => parseFloat(a) - parseFloat(b))

                  if (ws.length > 0) {
                    setWeek(ws[ws.length - 1])
                  }
                }}
                className={`flex-shrink-0 border-2 px-5 py-2.5 text-sm font-black transition-all ${season === s
                  ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                  : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

        </div>

        {/* WEEK */}
        <div className="mb-8 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">

          <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
            <div
              className="font-black uppercase tracking-[0.3em] text-[#16274F]"
              style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}
            >
              Week
            </div>
          </div>

          <div
            ref={weeksRef}
            className="scroll-hide flex justify-start md:justify-center gap-2 overflow-x-auto px-6 py-4"
          >
            {weeks.map(w => (
              <button
                key={w}
                data-active={week === w}
                onClick={() => setWeek(w)}
                className={`flex-shrink-0 h-11 w-11 border-2 text-sm font-black transition-all ${week === w
                  ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                  : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                  }`}
              >
                {w}
              </button>
            ))}
          </div>

        </div>

        {loading ? (

          <div className="py-20 text-center text-[#6B7280] font-bold">
            Loading...
          </div>

        ) : (

          <div className="flex flex-col gap-4">

            {rankings.map(team => {

              const tierColor =
                getTierColor(
                  team.rank,
                  totalTeams
                )

              const expandedOpen =
                expanded === team.team

              const seasonResults =
                getSeasonResults(team.team)

              const nextOpponent =
                getNextOpponentData(team.team)

              const h2h =
                nextOpponent
                  ? getH2H(
                    team.team,
                    nextOpponent.team
                  )
                  : null

              const allTime =
                getAllTimeRecord(team.team)

              const history =
                getTeamHistory(team.team)

              const opponentRecord =
                getOpponentRecord(team.opponent)

              return (

                <div
                  key={team.team}
                  className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm"
                >

                  <button
                    onClick={() =>
                      setExpanded(
                        expandedOpen
                          ? null
                          : team.team
                      )
                    }
                    className="w-full text-left"
                  >

                    <div className="p-5">

                      {/* TOP */}

                      <div className="flex gap-4 md:gap-5 items-start">

                        <div className="w-14 flex-shrink-0 text-center pt-0.5">
                          <div className="flex w-14 items-center justify-center pt-0.5 pb-2">
                            <TeamAvatar team={team.team} size="lg" />
                          </div>
                          <div
                            className={`text-[42px] font-black leading-none ${tierColor}`}
                            style={{
                              fontFamily: '"Bebas Neue", sans-serif',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {team.rank}
                          </div>

                          <div className="mt-1 flex justify-center">
                            <TrendIcon delta={team.delta} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center gap-2 flex-wrap">

                            <div className="text-xl font-black text-[#16274F] uppercase">
                              {team.team}
                            </div>

                            {team.rank === 1 && (
                              <Star className="h-4 w-4 text-[#F5C518] fill-[#F5C518]" />
                            )}
                          </div>

                          <div className="text-sm font-semibold uppercase text-[#6B7280]">
                            {team.owner}
                          </div>

                          {/* STATS */}

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">

                            <div>
                              <span className="text-[#6B7280]">
                                REC:
                              </span>{' '}
                              <span className="font-black text-[#16274F]">
                                {team.wins}-{team.losses}
                              </span>
                            </div>

                            <div>
                              <span className="text-[#6B7280]">
                                STRK:
                              </span>{' '}
                              <span className={`font-black ${team.streak.startsWith('W')
                                ? 'text-[#1E8E3E]'
                                : 'text-[#D01F2D]'
                                }`}>
                                {team.streak}
                              </span>
                            </div>

                            <div>
                              <span className="text-[#6B7280]">
                                AVG:
                              </span>{' '}
                              <span className="font-black text-[#16274F]">
                                {team.avgPF.toFixed(1)}
                              </span>{' '}
                              <span className="text-[#6B7280]">
                                (#{team.avgRank})
                              </span>
                            </div>

                            <div>
                              <span className="text-[#6B7280]">
                                OVW:
                              </span>{' '}
                              <span className="font-black text-[#16274F]">
                                {team.ovw.toFixed(0)}
                              </span>{' '}
                              <span className="text-[#6B7280]">
                                (#{team.ovwRank})
                              </span>
                            </div>
                          </div>

                          <div
                            ref={(el) => {
                              if (el) {
                                formRefs.current[team.team] = el
                              }
                            }}
                            className="mt-4 overflow-x-auto scroll-hide"
                          >

                            <div className="flex items-center gap-1 min-w-max">

                              {seasonResults.map((r, idx) => (
                                <div
                                  key={idx}
                                  title={`Week ${idx + 1}`}
                                  className={`h-5 w-5 flex items-center justify-center text-[9px] font-black border-2 border-[#0A0A0A] flex-shrink-0 ${r === 'W'
                                    ? 'bg-[#1E8E3E] text-white'
                                    : 'bg-[#D01F2D] text-white'
                                    }`}
                                >
                                  {r}
                                </div>

                              ))}
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-4 w-4 flex-shrink-0 text-[#6B7280] transition-transform ${expandedOpen
                            ? 'rotate-90'
                            : ''
                            }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* HISTORY */}

                  {expandedOpen && (

                    <div className="border-t-2 border-[#0A0A0A]/10 px-5 pb-10 pt-3">

                      {/* THIS WEEK / NEXT WEEK */}
                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 mb-5">

                        <Link
                          href={matchupHref(team.matchupRow)}
                          className="group block border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] p-3 min-w-0 transition-colors hover:bg-white"
                        >
                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">
                            This Week
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <TeamAvatar team={team.opponent} size="sm" />

                            <div className="min-w-0">
                              <div className="text-sm font-black leading-tight uppercase truncate">
                                <span className={
                                  team.result === 'W'
                                    ? 'text-[#1E8E3E]'
                                    : 'text-[#D01F2D]'
                                }>
                                  {team.result}
                                </span>

                                <span className="ml-1 text-[#16274F]">
                                  vs {team.opponent}
                                </span>

                                <span className="ml-1 text-[#6B7280]">
                                  {opponentRecord
                                    ? `(${opponentRecord.wins}-${opponentRecord.losses})`
                                    : ''
                                  }
                                </span>
                              </div>

                              <div className="mt-2 text-sm font-semibold text-[#6B7280] group-hover:text-[#16274F]">
                                {team.pf.toFixed(1)} - {team.pa.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </Link>

                        <div className="border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] p-3 min-w-0">
                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">
                            Next Week
                          </div>

                          {nextOpponent && h2h ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <TeamAvatar team={nextOpponent.team} size="sm" />

                              <div className="min-w-0">
                                <div className="text-sm font-black leading-tight text-[#16274F] uppercase truncate">
                                  <span>
                                    vs {nextOpponent.team}
                                  </span>

                                  <span className="ml-1 text-[#6B7280]">
                                    ({nextOpponent.wins}-{nextOpponent.losses})
                                  </span>
                                </div>

                                <div className="mt-2 text-sm font-semibold leading-tight">
                                  <span className="text-[#6B7280]">
                                    H2H:
                                  </span>

                                  <span className="ml-1 text-[#16274F]">
                                    ({h2h.aWins}-{h2h.bWins})
                                  </span>

                                  <span className={`ml-2 font-black ${h2h.streak.startsWith('W')
                                    ? 'text-[#1E8E3E]'
                                    : 'text-[#D01F2D]'
                                    }`}>
                                    {h2h.streak}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-semibold text-[#6B7280]">
                              No upcoming matchup available
                            </div>
                          )}
                        </div>
                      </div>

                      {/* EDITORIAL */}
                      {team.note && (

                        <div className="border-2 border-[#0A0A0A] bg-[#FDEDEE] p-4 mb-5">

                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#D01F2D]">
                            Power Take
                          </div>
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
                                <blockquote className="border-l-4 border-[#D01F2D] pl-4 my-3 text-[#3F4757] italic">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {team.note}
                          </ReactMarkdown>
                        </div>
                      )}

                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#6B7280]">
                        Ranking History
                      </div>

                      <div
                        ref={(el) => {
                          if (el) {
                            historyRefs.current[team.team] = el
                          }
                        }}
                        className="flex items-end gap-2 overflow-x-auto scroll-hide"
                      >

                        {history.map((h, idx) => {

                          const r =
                            parseNumber(
                              h?.['Power Ranking']
                            )

                          const height =
                            ((totalTeams - r + 1) / totalTeams) * 70 + 15

                          const current =
                            String(h?.Week || '').trim() === week

                          return (

                            <div
                              key={idx}
                              className="flex flex-col items-center gap-1 flex-shrink-0"
                            >

                              <div className={`text-[10px] font-black ${current
                                ? 'text-[#16274F]'
                                : 'text-[#6B7280]'
                                }`}>
                                {r}
                              </div>

                              <div
                                className={`w-8 border-2 border-[#0A0A0A] ${getHistoryColor(
                                  r,
                                  totalTeams
                                )} ${current
                                  ? 'tp-shadow-red-sm'
                                  : ''
                                }`}
                                style={{
                                  height: `${height}px`
                                }}
                              />

                              <div className={`text-[10px] font-bold ${current
                                ? 'text-[#16274F]'
                                : 'text-[#6B7280]'
                                }`}>
                                W{h?.Week}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <SummaryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allSeasons={allSeasons}
      />

      {/* FOOTER */}
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