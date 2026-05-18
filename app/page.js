'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Calendar,
  Trophy,
  Flame,
  ChevronRight,
  Swords,
  Stars,
  Activity,
  Radar,
  Target,
} from 'lucide-react'

const FALLBACK_TEAMS = [
  {
    team: 'Tapitas Empire',
    wins: 112,
    losses: 54,
    pf: 2145,
  },
  {
    team: 'Peytão da Massa',
    wins: 106,
    losses: 60,
    pf: 2088,
  },
]

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')

  const parsed = Number(cleaned)

  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeTeam(team, index) {
  return {
    team:
      (team && (team.Team || team.team || team.Name)) ||
      `Franchise ${index + 1}`,
    wins: parseNumber(team && (team.Wins || team.wins || team.W)),
    losses: parseNumber(team && (team.Losses || team.losses || team.L)),
    pf: parseNumber(
      team &&
        (team.Points ||
          team.PF ||
          team.PointsFor ||
          team.points_for)
    ),
  }
}

async function safeSheetFetch(url) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const json = await response.json()

    return Array.isArray(json) ? json : []
  } catch (error) {
    console.error(error)
    return []
  }
}

export default function TapitasLeagueHomepage() {
  const [rawData, setRawData] = useState([])

  const [leagueStats, setLeagueStats] = useState({
    franchises: 0,
    seasons: 0,
    seasonRange: '',
    games: 0,
    highestScore: 0,
    highestScoreTeam: '',
  })

  const [rivalryData, setRivalryData] = useState({
    teamA: 'Peytão da Massa',
    teamB: 'Moneyball FC',
    record: '0-0',
    playoffRecord: '0-0',
    avgMargin: '0.0',
    currentStreak: '--',
    lastMeeting: {
      score: '-- vs --',
      meta: '',
    },
  })

  useEffect(() => {
    let mounted = true

    async function loadLeagueData() {
      try {
        const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
        const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

        const [teamsJson, gamesJson, h2hSortedJson] = await Promise.all([
          safeSheetFetch(`${BASE_URL}/TEAM_ALL_TIME`),
          safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
          safeSheetFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        ])

        if (!mounted) {
          return
        }

        setRawData(teamsJson)

        const uniqueFranchises = new Set()
        const uniqueSeasons = new Set()
        const uniqueGames = new Set()

        let highestScore = 0
        let highestScoreTeam = ''

        teamsJson.forEach((teamRow) => {
          const franchiseName = String(
            teamRow?.Team ||
              teamRow?.team ||
              teamRow?.Name ||
              teamRow?.Franchise ||
              ''
          ).trim()

          if (franchiseName) {
            uniqueFranchises.add(franchiseName)
          }
        })

        gamesJson.forEach((game) => {
          const rawWeek = String(game?.Week || game?.week || '')

          const season = String(
            game?.Season || game?.season || game?.Year || ''
          ).trim()

          const team = String(game?.Team || game?.team || '').trim()

          const opponent = String(
            game?.Opponent || game?.opponent || ''
          ).trim()

          const matchupKey = [season, rawWeek, team, opponent]
            .sort()
            .join('|')

          if (season) {
            uniqueSeasons.add(season)
          }

          if (team && opponent && rawWeek) {
            uniqueGames.add(matchupKey)
          }

          const score = parseNumber(
            game?.Score || game?.score || game?.PF
          )

          const isCombinedWeek =
            rawWeek.includes('-') ||
            rawWeek.includes('&')

          if (!isCombinedWeek && score > highestScore) {
            highestScore = score
            highestScoreTeam = team
          }
        })

        const sortedSeasons = Array.from(uniqueSeasons)
          .map((season) => Number(season))
          .filter((season) => !Number.isNaN(season))
          .sort((a, b) => a - b)

        const seasonRange =
          sortedSeasons.length > 0
            ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
                sortedSeasons[sortedSeasons.length - 1]
              ).slice(2)}`
            : ''

        setLeagueStats({
          franchises: uniqueFranchises.size,
          seasons: uniqueSeasons.size,
          seasonRange,
          games: uniqueGames.size,
          highestScore: Math.round(highestScore * 100) / 100,
          highestScoreTeam,
        })

        if (Array.isArray(h2hSortedJson) && h2hSortedJson.length > 0) {
          const rivalryRow =
            h2hSortedJson[
              Math.floor(Math.random() * h2hSortedJson.length)
            ]

          const keys = Object.keys(rivalryRow || {})

          const teamA = String(rivalryRow[keys[0]] || '').trim()
          const teamB = String(rivalryRow[keys[1]] || '').trim()

          const lastMatch = String(
            rivalryRow['Last Match'] ||
              rivalryRow['last match'] ||
              ''
          )

          const scoreMatch = lastMatch.match(
            /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/
          )

          const weekMatch = lastMatch.match(/W(\d+)/i)
          const yearMatch = lastMatch.match(/(20\d{2})/)

          setRivalryData({
            teamA,
            teamB,
            record:
              String(
                parseNumber(
                  rivalryRow['A W'] ||
                    rivalryRow['A_W'] ||
                    rivalryRow['A_WINS'] ||
                    rivalryRow['A Wins'] ||
                    rivalryRow['A'] ||
                    0
                )
              ) +
              '-' +
              String(
                parseNumber(
                  rivalryRow['B W'] ||
                    rivalryRow['B_W'] ||
                    rivalryRow['B_WINS'] ||
                    rivalryRow['B Wins'] ||
                    rivalryRow['B'] ||
                    0
                )
              ),
            playoffRecord:
              String(parseNumber(rivalryRow['A PO_W'] || 0)) +
              '-' +
              String(parseNumber(rivalryRow['B PO_W'] || 0)),
            avgMargin: String(
              rivalryRow['Avg Margin'] ||
                rivalryRow['AVG_MARGIN'] ||
                rivalryRow['Average Margin'] ||
                rivalryRow['Margin'] ||
                rivalryRow['Avg'] ||
                '0.0'
            ),
            currentStreak:
              rivalryRow['Current Streak'] || '--',
            lastMeeting: {
              score: scoreMatch
                ? `${scoreMatch[1]} vs ${scoreMatch[2]}`
                : '-- vs --',
              meta:
                weekMatch || yearMatch
                  ? `W${weekMatch ? weekMatch[1] : '?'} • ${
                      yearMatch ? yearMatch[1] : ''
                    }`
                  : '',
            },
          })
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadLeagueData()

    return () => {
      mounted = false
    }
  }, [])

  const standings = useMemo(() => {
    const base =
      Array.isArray(rawData) && rawData.length > 0
        ? rawData
        : FALLBACK_TEAMS

    return base.slice(0, 5).map(normalizeTeam)
  }, [rawData])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <section className="relative z-10 mx-auto max-w-[1680px] px-6 pb-24 pt-10">
        <div className="mb-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[
            [Shield, 'Franchises', leagueStats.franchises, 'Current'],
            [Calendar, 'Seasons', leagueStats.seasons, leagueStats.seasonRange],
            [Radar, 'Games', leagueStats.games, 'All-Time'],
            [Flame, 'Highest Score', leagueStats.highestScore, leagueStats.highestScoreTeam],
          ].map(([Icon, label, value, sublabel]) => (
            <div
              key={label}
              className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] p-6"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                {label}
              </div>

              <div className="mb-3 text-4xl font-black lg:text-5xl">
                {value}
              </div>

              <div className="truncate text-sm font-bold text-cyan-300">
                {sublabel}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="w-full overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f_0%,#0b1220_45%,#170b14_100%)] xl:flex-[1.15]">
            <div className="flex h-full flex-col p-5 sm:p-7 xl:p-8">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                    <Swords className="h-5 w-5 text-cyan-300" />
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                      Rivalry Spotlight
                    </div>

                    <div className="text-sm text-slate-400">
                      The league's fiercest matchup.
                    </div>
                  </div>
                </div>

                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition-all hover:bg-cyan-400/20">
                  Open Matchup
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-8">
                <h2 className="break-words text-[34px] font-black leading-[0.95] tracking-[-0.05em] sm:text-[42px] lg:text-[52px]">
                  {rivalryData.teamA}
                  <span className="mx-4 text-cyan-400">vs</span>
                  {rivalryData.teamB}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  [Target, 'Record', rivalryData.record],
                  [Trophy, 'Playoffs', rivalryData.playoffRecord],
                  [Activity, 'Avg Margin', `${rivalryData.avgMargin} ppg`],
                  [Stars, `Last Meeting (${rivalryData.lastMeeting.meta})`, rivalryData.lastMeeting.score],
                  [Radar, 'Current Streak', (() => {
                    const rawStreak = String(
                      rivalryData.currentStreak || '--'
                    )

                    const shortName = (teamName) => {
                      const mappings = {
                        'i am megatron': 'Megatron',
                        'h-lera do mahl': 'H-Lera',
                        'peytão da massa': 'Peytao',
                        'peytao da massa': 'Peytao',
                        'ocupa meu slot': 'Ocupa',
                        'green bay pequers': 'Pequers',
                        'settlers of rincão': 'Rincão',
                        'settlers of rincao': 'Rincão',
                        'old brady bunch': 'OldBrady',
                        'moneyball fc': 'Moneyball',
                        'patrolão': 'Patrolao',
                        'patrolao': 'Patrolao',
                        'how much is the fish': 'Howmuch',
                      }

                      const normalized = normalizeString(teamName)

                      if (mappings[normalized]) {
                        return mappings[normalized]
                      }

                      const words = String(teamName).split(' ')
                      return words[0]
                    }

                    const formatted = rawStreak
                      .replace(rivalryData.teamA, shortName(rivalryData.teamA))
                      .replace(rivalryData.teamB, shortName(rivalryData.teamB))

                    const parts = formatted.split(' ')
                    const streakValue = parts.pop()
                    const teamName = parts.join(' ')

                    return `${teamName} ${streakValue}`
                  })()],
                  [Flame, 'Rivalry Heat', (() => {
                    const parts = String(rivalryData.record)
                      .split('-')
                      .map((value) => Number(value) || 0)

                    const winsA = parts[0] || 0
                    const winsB = parts[1] || 0

                    const totalGames = winsA + winsB
                    const recordGap = Math.abs(winsA - winsB)
                    const margin = Math.abs(
                      parseFloat(rivalryData.avgMargin) || 0
                    )

                    let rivalryScore = 0

                    // equilíbrio do record
                    if (recordGap === 0) {
                      rivalryScore += 7
                    } else if (recordGap === 1) {
                      rivalryScore += 5
                    } else if (recordGap === 2) {
                      rivalryScore += 3
                    } else if (recordGap === 3) {
                      rivalryScore += 1
                    } else {
                      rivalryScore -= 3
                    }

                    // quantidade de jogos
                    if (totalGames >= 14) {
                      rivalryScore += 5
                    } else if (totalGames >= 10) {
                      rivalryScore += 4
                    } else if (totalGames >= 6) {
                      rivalryScore += 2
                    }

                    // margem média apertada
                    if (margin <= 3) {
                      rivalryScore += 5
                    } else if (margin <= 7) {
                      rivalryScore += 3
                    } else if (margin <= 12) {
                      rivalryScore += 1
                    }

                    if (rivalryScore >= 13) {
                      return 'Legendary'
                    }

                    if (rivalryScore >= 10) {
                      return 'Elite'
                    }

                    if (rivalryScore >= 7) {
                      return 'High'
                    }

                    if (rivalryScore >= 4) {
                      return 'Medium'
                    }

                    return 'Low'
                  })()],
                ].map(([Icon, label, value]) => (
                  <div
                    key={label}
                    className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                      <Icon className="h-4 w-4 text-cyan-300" />
                    </div>

                    <div className="mb-3 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 lg:text-[11px]">
                      {label}
                    </div>

                    <div className="text-2xl font-black leading-none xl:text-[30px] flex flex-wrap items-center">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] xl:flex-[0.85]">
            <div className="flex items-center justify-between border-b border-white/5 p-8">
              <div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                  Franchise Leaders
                </div>

                <h3 className="text-4xl font-black tracking-tight">
                  League Rankings
                </h3>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {standings.map((team, index) => (
                <div
                  key={`${team.team}-${index}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-5 rounded-[28px] border border-white/5 bg-white/[0.03] px-6 py-5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl font-black text-cyan-300">
                    {index + 1}
                  </div>

                  <div>
                    <div className="mb-1 truncate text-2xl font-black">
                      {team.team}
                    </div>

                    <div className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                      {team.wins} Wins • {team.losses} Losses
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="mb-2 text-4xl font-black leading-none text-cyan-300">
                      {Math.round(team.pf)}
                    </div>

                    <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      Points For
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
