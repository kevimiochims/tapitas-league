'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Star
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

function getTier(rank, total) {
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

  useEffect(() => {

    async function load() {

      const data = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`)

      setGames(data)

      const allSeasons = [
        ...new Set(
          data
            .map(g => String(g?.Season || '').trim())
            .filter(Boolean)
        )
      ].sort((a, b) => Number(a) - Number(b))

      if (allSeasons.length > 0) {

        const latestSeason = allSeasons[allSeasons.length - 1]

        setSeason(latestSeason)

        const ws = [
          ...new Set(
            data
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

    const activeBtn = seasonsRef.current.querySelector(
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

    const activeBtn = weeksRef.current.querySelector(
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

    const mapped = filtered.map(g => ({
      team: String(g?.Team || '').trim(),

      owner: String(g?.Owner || '').trim(),

      rank: parseNumber(g?.['Power Ranking']),

      delta: parseNumber(g?.['PR Delta']),

      wins: parseNumber(g?.Wins),

      losses: parseNumber(g?.Losses),

      ovw: parseNumber(g?.OVW),

      avgPF: parseNumber(g?.AVG_PF),

      streak: String(
        g?.Streak_Total ||
        g?.Streak ||
        ''
      ).trim(),

      opponent: String(g?.Opponent || '').trim(),

      result: String(g?.Result || '').trim().toUpperCase(),

      pf: parseNumber(g?.PF),

      pa: parseNumber(g?.PA),
    }))

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
          ovwRank
        }
      })

  }, [games, season, week])

  const totalTeams = rankings.length

  function getRecentResults(teamName, limit = 5) {

    return games
      .filter(g =>
        String(g?.Season || '').trim() === season &&
        String(g?.Team || '').trim() === teamName
      )
      .sort((a, b) =>
        parseFloat(a?.Week || 0) -
        parseFloat(b?.Week || 0)
      )
      .slice(-limit)
      .map(g =>
        String(g?.Result || '')
          .trim()
          .toUpperCase()
      )
  }

  function getNextOpponentData(teamName) {

    const currentGame = games.find(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      String(g?.Team || '').trim() === teamName
    )

    if (!currentGame) return null

    const nextOpponent = String(currentGame?.Next || '').trim()

    if (!nextOpponent) return null

    const opponentGame = games.find(g =>
      String(g?.Season || '').trim() === season &&
      String(g?.Week || '').trim() === week &&
      String(g?.Team || '').trim() === nextOpponent
    )

    return {
      team: nextOpponent,
      wins: parseNumber(opponentGame?.Wins),
      losses: parseNumber(opponentGame?.Losses),
    }
  }

  function getH2H(teamA, teamB) {

    const allGames = games.filter(g => {

      const seasonNum = parseNumber(g?.Season)
      const weekNum = parseNumber(g?.Week)

      const currentSeason = parseNumber(season)
      const currentWeek = parseNumber(week)

      const isBefore =
        seasonNum < currentSeason ||
        (
          seasonNum === currentSeason &&
          weekNum <= currentWeek
        )

      if (!isBefore) return false

      const t = String(g?.Team || '').trim()
      const o = String(g?.Opponent || '').trim()

      return (
        (t === teamA && o === teamB) ||
        (t === teamB && o === teamA)
      )
    })

    let aWins = 0
    let bWins = 0

    allGames.forEach(g => {

      const t = String(g?.Team || '').trim()

      const result = String(g?.Result || '')
        .trim()
        .toUpperCase()

      if (result !== 'W') return

      if (t === teamA) aWins++
      if (t === teamB) bWins++
    })

    const ordered = allGames.sort((a, b) => {

      const sa = parseNumber(a.Season)
      const sb = parseNumber(b.Season)

      if (sa !== sb) return sa - sb

      return parseNumber(a.Week) - parseNumber(b.Week)
    })

    let streakTeam = null
    let streakCount = 0

    ordered.forEach(g => {

      const result = String(g?.Result || '')
        .trim()
        .toUpperCase()

      if (result !== 'W') return

      const winner = String(g?.Team || '').trim()

      if (winner === streakTeam) {
        streakCount++
      } else {
        streakTeam = winner
        streakCount = 1
      }
    })

    return {
      aWins,
      bWins,
      streak:
        streakTeam === teamA
          ? `W${streakCount}`
          : `L${streakCount}`
    }
  }

  function getTeamHistory(teamName) {

    return games
      .filter(g =>
        String(g?.Season || '').trim() === season &&
        String(g?.Team || '').trim() === teamName &&
        parseNumber(g?.['Power Ranking']) > 0
      )
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

        <div className="mb-6">

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
                className={`px-4 py-2 rounded-xl text-sm font-black border transition-all whitespace-nowrap ${
                  season === s
                    ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
                    : 'border-white/5 bg-white/[0.03] text-slate-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

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
                className={`h-10 w-10 rounded-xl text-sm font-black border transition-all flex-shrink-0 ${
                  week === w
                    ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
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

              const tierColor = getTier(
                team.rank,
                totalTeams
              )

              const expandedOpen = expanded === team.team

              const recentResults =
                getRecentResults(team.team, 5)

              const nextOpponent =
                getNextOpponentData(team.team)

              const h2h =
                nextOpponent
                  ? getH2H(team.team, nextOpponent.team)
                  : null

              const history =
                getTeamHistory(team.team)

              return (

                <div
                  key={team.team}
                  className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]"
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

                    <div className="flex gap-4 p-4 md:p-5">

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

                        <div className="mt-1">
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

                        <div className="text-sm text-slate-400 font-semibold uppercase">
                          {team.owner}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">

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
                            <span className={`font-black ${
                              team.streak.startsWith('W')
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
                              (#{
                                team.avgRank
                              })
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
                              (#{
                                team.ovwRank
                              })
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1">

                          {recentResults.map((r, idx) => (

                            <div
                              key={idx}
                              className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black border ${
                                r === 'W'
                                  ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-400'
                                  : 'border-red-400/30 bg-red-400/15 text-red-400'
                              }`}
                            >
                              {r}
                            </div>

                          ))}
                        </div>

                        {nextOpponent && (

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">

                            <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">

                              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">
                                Next
                              </div>

                              <div className="font-black text-white uppercase">
                                {nextOpponent.team}
                              </div>

                              <div className="text-slate-400 text-xs">
                                {nextOpponent.wins}-
                                {nextOpponent.losses}
                              </div>
                            </div>

                            {h2h && (

                              <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">

                                <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">
                                  H2H
                                </div>

                                <div className="font-black text-white">
                                  {h2h.aWins}-
                                  {h2h.bWins}
                                </div>

                                <div className={`text-xs font-black ${
                                  h2h.streak.startsWith('W')
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}>
                                  {h2h.streak}
                                </div>
                              </div>

                            )}

                            <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">

                              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">
                                Last Game
                              </div>

                              <div className={`font-black ${
                                team.result === 'W'
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}>
                                {team.result}
                              </div>

                              <div className="text-xs text-slate-400">
                                vs {team.opponent}
                              </div>

                              <div className="text-xs text-slate-400">
                                {team.pf.toFixed(1)}-
                                {team.pa.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight
                        className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform ${
                          expandedOpen
                            ? 'rotate-90'
                            : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expandedOpen && (

                    <div className="border-t border-white/5 px-4 pb-5 pt-5">

                      <div className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                        Ranking History
                      </div>

                      <div className="flex items-end gap-2 overflow-x-auto scroll-hide">

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

                              <div className={`text-[10px] font-black ${
                                current
                                  ? 'text-white'
                                  : 'text-slate-500'
                              }`}>
                                {r}
                              </div>

                              <div
                                className={`w-8 rounded-t-lg ${
                                  current
                                    ? 'bg-gradient-to-t from-cyan-500 to-cyan-300'
                                    : 'bg-white/10'
                                }`}
                                style={{
                                  height: `${height}px`
                                }}
                              />

                              <div className={`text-[10px] font-bold ${
                                current
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