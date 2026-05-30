'use client'

import Image from 'next/image'
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
      <div className="flex items-center gap-1 text-emerald-400">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-black">
          +{Math.abs(delta)}
        </span>
      </div>
    )
  }

  if (delta < 0) {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-black">
          -{Math.abs(delta)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-slate-500">
      <Minus className="h-4 w-4" />
    </div>
  )
}

function getTierColor(rank, total) {

  const pct = rank / total

  if (rank === 1) return 'text-yellow-400'

  if (pct <= 0.25) return 'text-cyan-400'

  if (pct <= 0.5) return 'text-emerald-400'

  if (pct <= 0.75) return 'text-orange-400'

  return 'text-slate-400'
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

      const gameData = await safeFetch(
        `${BASE_URL}/GAME_FACTS_ALL`
      )

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
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition-all hover:bg-cyan-400/20"
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

    const mapped = filtered.map(g => {


      return {

        team: String(g?.Team || '').trim(),

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

        next: String(g?.Next || '').trim(),

        note: String(g?.Note || '').trim(),
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

  }, [games, season, week])

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

    // busca todas as semanas futuras com jogos desse time, com ou sem Power Ranking
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

    if (futureGames.length === 0) return null

    const nextGame = futureGames[0]
    const opponent = String(nextGame?.Opponent || '').trim()

    if (!opponent) return null

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
    <main className="min-h-screen bg-[#020617] text-white">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

        .scroll-hide::-webkit-scrollbar {
          display: none;
        }

        .scroll-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Header onSummaryOpen={() => setDrawerOpen(true)} />

      <section className="mx-auto max-w-[1680px] px-4 pb-20">

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
              <text x="790" y="310" fontFamily="'Bebas Neue', sans-serif" fontSize="340" fill="#22d3ee" opacity="0.02" textAnchor="middle">1</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)' }} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-300 shrink-0" />
              <span className="font-black uppercase tracking-[0.25em] text-cyan-300 whitespace-nowrap" style={{ fontSize: 'clamp(10px, 1.2vw, 12px)' }}>
                Weekly Rankings
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
              Power
              <span style={{ background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {' '}Rankings
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-xs sm:max-w-2xl text-slate-400 leading-relaxed" style={{ fontSize: 'clamp(14px, 1.5vw, 17px)' }}>
              Who's hot, who's not. The definitive weekly power rankings
              of the Tapitas League — based on performance, not just record.
            </p>
          </div>
        </div>

        {/* SEASON */}
        <div className="mb-5">

          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Season
          </div>

          <div
            ref={seasonsRef}
            className="scroll-hide flex gap-2 overflow-x-auto"
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
                className={`px-4 py-2 rounded-xl border text-sm font-black whitespace-nowrap transition-all ${season === s
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300'
                  : 'border-white/5 bg-white/[0.03] text-slate-400'
                  }`}
              >
                {s}
              </button>

            ))}
          </div>
        </div>

        {/* WEEK */}

        <div className="mb-8">

          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Week
          </div>

          <div
            ref={weeksRef}
            className="scroll-hide flex gap-2 overflow-x-auto"
          >

            {weeks.map(w => (

              <button
                key={w}
                data-active={week === w}
                onClick={() => setWeek(w)}
                className={`h-10 w-10 rounded-xl border text-sm font-black flex-shrink-0 transition-all ${week === w
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300'
                  : 'border-white/5 bg-white/[0.03] text-slate-400'
                  }`}
              >
                {w}
              </button>

            ))}
          </div>
        </div>

        {loading ? (

          <div className="py-20 text-center text-slate-500">
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
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]"
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

                      <div className="flex gap-4">

                        <div className="w-12 flex-shrink-0 text-center">

                          <div
                            className={`text-4xl font-black leading-none ${tierColor}`}
                            style={{
                              fontFamily:
                                '"Bebas Neue", sans-serif'
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

                            <div className="text-xl font-black text-white uppercase">
                              {team.team}
                            </div>

                            {team.rank === 1 && (
                              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>

                          <div className="text-sm font-semibold uppercase text-slate-400">
                            {team.owner}
                          </div>

                          {/* STATS */}

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">

                            <div>
                              <span className="text-slate-500">
                                REC:
                              </span>{' '}
                              <span className="font-black text-white">
                                {team.wins}-{team.losses}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                STRK:
                              </span>{' '}
                              <span className={`font-black ${team.streak.startsWith('W')
                                ? 'text-emerald-400'
                                : 'text-red-400'
                                }`}>
                                {team.streak}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                AVG:
                              </span>{' '}
                              <span className="font-black text-white">
                                {team.avgPF.toFixed(1)}
                              </span>{' '}
                              <span className="text-slate-500">
                                (#{team.avgRank})
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                OVW:
                              </span>{' '}
                              <span className="font-black text-white">
                                {team.ovw.toFixed(0)}
                              </span>{' '}
                              <span className="text-slate-500">
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
                                  className={`h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-black border flex-shrink-0 ${r === 'W'
                                    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400'
                                    : 'border-red-400/30 bg-red-400/15 text-red-400'
                                    }`}
                                >
                                  {r}
                                </div>

                              ))}
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform ${expandedOpen
                            ? 'rotate-90'
                            : ''
                            }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* HISTORY */}

                  {expandedOpen && (

                    <div className="border-t border-white/5 px-5 pb-10 pt-3">

                      {/* THIS WEEK */}
                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-4">

                        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">

                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            This Week
                          </div>

                          <div className="text-sm font-black leading-tight">

                            <span className={
                              team.result === 'W'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }>
                              {team.result}
                            </span>

                            <span className="ml-1 text-white uppercase">
                              vs {team.opponent}
                            </span>

                            <span className="ml-1 text-slate-400">
                              {opponentRecord
                                ? `(${opponentRecord.wins}-${opponentRecord.losses})`
                                : ''
                              }
                            </span>
                          </div>

                          <div className="mt-2 text-sm font-semibold text-slate-400">
                            {team.pf.toFixed(1)} - {team.pa.toFixed(1)}
                          </div>
                        </div>

                        {/* NEXT WEEK */}
                        {nextOpponent && h2h && (

                          <div className="mt-2 rounded-2xl border border-white/5 bg-black/20 p-3 mb-5">

                            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                              Next Week
                            </div>

                            <div className="text-sm font-black leading-tight text-white uppercase">

                              <span>
                                vs {nextOpponent.team}
                              </span>

                              <span className="ml-1 text-slate-400">
                                ({nextOpponent.wins}-{nextOpponent.losses})
                              </span>
                            </div>

                            <div className="mt-2 text-sm font-semibold leading-tight">

                              <span className="text-slate-500">
                                H2H:
                              </span>

                              <span className="ml-1 text-white">
                                ({h2h.aWins}-{h2h.bWins})
                              </span>

                              <span className={`ml-2 font-black ${h2h.streak.startsWith('W')
                                ? 'text-emerald-400'
                                : 'text-red-400'
                                }`}>
                                {h2h.streak}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* EDITORIAL */}
                      {team.note && (

                        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 mb-5">

                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                            Power Take
                          </div>

                          <p className="text-sm leading-relaxed text-slate-300">
                            {team.note}
                          </p>
                        </div>
                      )}

                      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
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
                                ? 'text-white'
                                : 'text-slate-500'
                                }`}>
                                {r}
                              </div>

                              <div
                                className={`w-8 rounded-t-lg ${r <= 3
                                  ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                  : r <= 6
                                    ? 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                                    : r <= 10
                                      ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                                      : 'bg-gradient-to-t from-red-700 to-red-500'
                                  } ${current
                                    ? 'ring-2 ring-white/50'
                                    : ''
                                  }`}
                                style={{
                                  height: `${height}px`
                                }}
                              />

                              <div className={`text-[10px] font-bold ${current
                                ? 'text-white'
                                : 'text-slate-600'
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