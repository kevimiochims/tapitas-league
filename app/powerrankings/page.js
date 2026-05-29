'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Star,
} from 'lucide-react'

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
  const [notes, setNotes] = useState([])

  const [loading, setLoading] = useState(true)

  const [season, setSeason] = useState('')
  const [week, setWeek] = useState('')

  const [expanded, setExpanded] = useState(null)

  const seasonsRef = useRef(null)
  const weeksRef = useRef(null)
  const historyRefs = useRef({})
  const formRefs = useRef({})

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

    if (!rankings.length) return

    const timeout = setTimeout(() => {

      Object.values(formRefs.current).forEach(container => {

        if (!container) return

        container.scrollTo({
          left: container.scrollWidth,
          behavior: 'smooth',
        })

      })

    }, 100)

    return () => clearTimeout(timeout)

  }, [rankings])

  useEffect(() => {

    async function load() {

      const gameData = await safeFetch(
        `${BASE_URL}/GAME_FACTS_ALL`
      )

      // OPCIONAL:
      // criar uma aba POWER_RANKING_NOTES
      // com colunas:
      // Season | Week | Team | Note

      const notesData = await safeFetch(
        `${BASE_URL}/POWER_RANKING_NOTES`
      )

      setGames(gameData)
      setNotes(notesData)

      const allSeasons = [
        ...new Set(
          gameData
            .map(g => String(g?.Season || '').trim())
            .filter(Boolean)
        )
      ].sort((a, b) => Number(a) - Number(b))

      if (allSeasons.length > 0) {

        const latestSeason =
          allSeasons[allSeasons.length - 1]

        setSeason(latestSeason)

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

  const seasons = useMemo(() => {

    return [
      ...new Set(
        games
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
    ].sort((a, b) => parseFloat(a) - parseFloat(b))

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

      const noteRow = notes.find(n =>
        String(n?.Season || '').trim() === season &&
        String(n?.Week || '').trim() === week &&
        String(n?.Team || '').trim() === String(g?.Team || '').trim()
      )

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

        note: String(noteRow?.Note || '').trim(),
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

  }, [games, notes, season, week])

  const totalTeams = rankings.length

  function getSeasonResults(teamName) {

    return games
      .filter(g => {

        const sameSeason =
          String(g?.Season || '').trim() === season

        const sameTeam =
          String(g?.Team || '').trim() === teamName

        const gameWeek =
          parseFloat(g?.Week || 0)

        const currentWeek =
          parseFloat(week || 0)

        return (
          sameSeason &&
          sameTeam &&
          gameWeek <= currentWeek
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
    const currentWeek = parseNumber(week)

    // procura qualquer jogo FUTURO do time
    const futureGames = games
      .filter(g => {

        const gameSeason =
          parseNumber(g?.Season)

        const gameWeek =
          parseNumber(g?.Week)

        const team =
          String(g?.Team || '').trim()

        return (
          team === teamName &&
          gameSeason === currentSeason &&
          gameWeek > currentWeek
        )
      })
      .sort((a, b) =>
        parseNumber(a?.Week) -
        parseNumber(b?.Week)
      )

    if (futureGames.length === 0) {
      return null
    }

    const nextGame = futureGames[0]

    const opponent =
      String(nextGame?.Opponent || '').trim()

    if (!opponent) return null

    // pega o record ATUAL do adversário
    const opponentCurrent = games.find(g => {

      return (
        String(g?.Season || '').trim() === season &&
        String(g?.Week || '').trim() === week &&
        String(g?.Team || '').trim() === opponent
      )
    })

    return {
      week: parseNumber(nextGame?.Week),
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
        parseNumber(g?.Week)

      const currentSeason =
        parseNumber(season)

      const currentWeek =
        parseNumber(week)

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

    const relevantGames = games.filter(g => {

      const t =
        String(g?.Team || '').trim()

      const o =
        String(g?.Opponent || '').trim()

      const matchup =
        (
          t === teamA &&
          o === teamB
        ) ||
        (
          t === teamB &&
          o === teamA
        )

      if (!matchup) return false

      const gameSeason =
        parseNumber(g?.Season)

      const gameWeek =
        parseNumber(g?.Week)

      const currentSeason =
        parseNumber(season)

      const currentWeek =
        parseNumber(week)

      return (
        gameSeason < currentSeason ||
        (
          gameSeason === currentSeason &&
          gameWeek <= currentWeek
        )
      )
    })

    let aWins = 0
    let bWins = 0

    relevantGames.forEach(g => {

      const result =
        String(g?.Result || '')
          .trim()
          .toUpperCase()

      if (result !== 'W') return

      const winner =
        String(g?.Team || '').trim()

      if (winner === teamA) aWins++
      if (winner === teamB) bWins++
    })

    const orderedGames =
      relevantGames.sort((a, b) => {

        const sa = parseNumber(a.Season)
        const sb = parseNumber(b.Season)

        if (sa !== sb) return sa - sb

        return parseNumber(a.Week) - parseNumber(b.Week)
      })

    let streakWinner = null
    let streakCount = 0

    orderedGames.forEach(g => {

      const result =
        String(g?.Result || '')
          .trim()
          .toUpperCase()

      if (result !== 'W') return

      const winner =
        String(g?.Team || '').trim()

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

    const currentWeek =
      parseNumber(week)

    return games
      .filter(g => {

        const sameSeason =
          String(g?.Season || '').trim() === season

        const sameTeam =
          String(g?.Team || '').trim() === teamName

        const validRank =
          parseNumber(g?.['Power Ranking']) > 0

        const gameWeek =
          parseNumber(g?.Week)

        return (
          sameSeason &&
          sameTeam &&
          validRank &&
          gameWeek <= currentWeek
        )
      })
      .sort((a, b) =>
        parseFloat(a?.Week || 0) -
        parseFloat(b?.Week || 0)
      )
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

      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">

        <a href="/" className="flex items-center gap-3">

          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={36}
            height={36}
            style={{ filter: 'invert(1)' }}
          />

          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas
            <span className="text-cyan-400">
              League
            </span>
          </span>
        </a>
      </header>

      <section className="mx-auto max-w-[1680px] px-4 pb-20">

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

                            <div>
                              <span className="text-slate-500">
                                ALL:
                              </span>{' '}
                              <span className="font-black text-white">
                                {allTime.wins}-{allTime.losses}
                              </span>
                            </div>
                          </div>

                          {/* FORM */}

                          <div
  className="mt-4 overflow-x-auto border-2 border-red-500"
>
  <div className="flex items-center gap-1 min-w-max border-2 border-green-500">

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

                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">

                            {/* THIS WEEK */}

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
                                  ({team.wins}-{team.losses})
                                </span>
                              </div>

                              <div className="mt-2 text-sm font-semibold text-slate-400">
                                {team.pf.toFixed(1)} - {team.pa.toFixed(1)}
                              </div>
                            </div>

                            {/* NEXT WEEK */}

                            {nextOpponent && h2h && (

                              <div className="rounded-2xl border border-white/5 bg-black/20 p-3">

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

                            <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">

                              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                                Power Take
                              </div>

                              <p className="text-sm leading-relaxed text-slate-300">
                                {team.note}
                              </p>
                            </div>
                          )}
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

                    <div className="border-t border-white/5 px-5 pb-5 pt-5">

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
    </main>
  )
}