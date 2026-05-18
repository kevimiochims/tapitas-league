'use client'

import Image from 'next/image'

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
        const SHEET_ID =
          '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'

        const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

        const [teamsJson, gamesJson, h2hSortedJson] =
          await Promise.all([
            safeSheetFetch(`${BASE_URL}/TEAM_ALL_TIME`),
            safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
            safeSheetFetch(
              `${BASE_URL}/HEAD_TO_HEAD_SORTED`
            ),
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

          const team = String(
            game?.Team || game?.team || ''
          ).trim()

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
            ? `'${String(sortedSeasons[0]).slice(
                2
              )}-'${String(
                sortedSeasons[
                  sortedSeasons.length - 1
                ]
              ).slice(2)}`
            : ''

        setLeagueStats({
          franchises: uniqueFranchises.size,
          seasons: uniqueSeasons.size,
          seasonRange,
          games: uniqueGames.size,
          highestScore:
            Math.round(highestScore * 100) / 100,
          highestScoreTeam,
        })

        if (
          Array.isArray(h2hSortedJson) &&
          h2hSortedJson.length > 0
        ) {
          const rivalryRow =
            h2hSortedJson[
              Math.floor(
                Math.random() * h2hSortedJson.length
              )
            ]

          const keys = Object.keys(rivalryRow || {})

          const teamA = String(
            rivalryRow[keys[0]] || ''
          ).trim()

          const teamB = String(
            rivalryRow[keys[1]] || ''
          ).trim()

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
              String(
                parseNumber(
                  rivalryRow['A PO_W'] || 0
                )
              ) +
              '-' +
              String(
                parseNumber(
                  rivalryRow['B PO_W'] || 0
                )
              ),

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
                  ? `W${
                      weekMatch
                        ? weekMatch[1]
                        : '?'
                    } • ${
                      yearMatch
                        ? yearMatch[1]
                        : ''
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

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-4">

          <div className="flex items-center gap-4">

            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League Logo"
              width={52}
              height={52}
              priority
              className="rounded-xl"
            />

            <div>
              <h1 className="text-xl font-black tracking-[0.18em] text-white">
                TAPITAS LEAGUE
              </h1>

              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Fantasy Basketball
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {[
              'Home',
              'Standings',
              'Rivalries',
              'Records',
              'History',
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm font-black uppercase tracking-[0.14em] text-slate-400 transition hover:text-cyan-300"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_40%)]" />

        <div className="relative z-10 mx-auto flex max-w-[1680px] flex-col items-center gap-14 px-6 py-20 lg:flex-row lg:justify-between">

          <div className="max-w-4xl">

            <div className="mb-6 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
              Established 2020
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl lg:text-8xl">

              Home of the

              <span className="mt-2 block text-cyan-300">
                Greatest Rivalries
              </span>

              in Fantasy Basketball.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-400">
              Records. Dynasties. Historic matchups.
              Legendary performances. Welcome to the
              official home of the Tapitas League
              universe.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">

              <button className="rounded-2xl bg-cyan-400 px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-black transition hover:scale-105 hover:bg-cyan-300">
                Explore Stats
              </button>

              <button className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-black uppercase tracking-[0.15em] text-white transition hover:bg-white/10">
                View Rivalries
              </button>
            </div>
          </div>

          <div className="relative flex justify-center">

            <div className="absolute h-[320px] w-[320px] rounded-full bg-cyan-400/20 blur-3xl" />

            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League Logo"
              width={320}
              height={320}
              priority
              className="relative z-10 drop-shadow-[0_0_60px_rgba(34,211,238,0.45)]"
            />
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
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
      </section>
    </main>
  )
}