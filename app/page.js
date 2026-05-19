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
// Adicione este estado junto aos outros no componente principal
const [h2hData, setH2hData] = useState([])
const [selectedTeamA, setSelectedTeamA] = useState('')
const [selectedTeamB, setSelectedTeamB] = useState('')


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

function GameRow({ game }) {
  return (
    <div className="flex flex-col border-b border-white/5 py-[6px] last:border-0">
      <div className="flex items-center gap-1">
        <span
          className={`text-[13px] font-black ${
            game.result === 'W' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {game.result}
        </span>
        <span className="truncate text-[13px] text-slate-300">
          &nbsp;vs {game.opp}
        </span>
      </div>
      <span className="text-[11px] text-slate-500">
        {game.score.toFixed(2)} – {game.oppScore.toFixed(2)}
      </span>
    </div>
  )
}

function ChampionCard({ champ, index, isOpen, onToggle }) {
  const half = Math.ceil(champ.regGames.length / 2)
  const regCol1 = champ.regGames.slice(0, half)
  const regCol2 = champ.regGames.slice(half)

  return (
    <div
      className={`overflow-hidden rounded-[28px] border transition-all duration-200 ${
        isOpen
          ? 'border-cyan-400/30'
          : 'border-white/5 hover:border-white/10'
      } bg-[linear-gradient(180deg,rgba(12,20,38,0.9),rgba(5,10,25,0.95))]`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-6 py-5 text-left transition-all"
      >
        {!isOpen && (
          <Trophy className="h-5 w-5 flex-shrink-0 text-cyan-400" />
        )}

        <span
          className={`flex-shrink-0 font-black leading-none transition-all ${
            isOpen ? 'text-[42px] text-white' : 'text-[28px] text-slate-400'
          }`}
          style={{ fontFamily: '"Bebas Neue", sans-serif' }}
        >
          {champ.season}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-black text-white transition-all ${
              isOpen ? 'text-xl' : 'text-base'
            }`}
          >
            {champ.team}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {champ.wins}–{champ.losses} reg season
            {champ.playoffWins > 0 || champ.playoffLosses > 0
              ? ` • ${champ.playoffWins}–${champ.playoffLosses} playoffs`
              : ''}
            {champ.pf > 0 ? ` • ${Math.round(champ.pf)} pts` : ''}
          </div>
        </div>

        {index === 0 && !isOpen && (
          <span className="flex-shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-300">
            Reigning
          </span>
        )}

        <ChevronRight
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/5 px-6 pb-6 pt-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Reg Season
              </div>
              {regCol1.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] opacity-0">
                &nbsp;
              </div>
              {regCol2.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-400">
                Playoffs
              </div>
              {champ.playoffGames.length > 0 ? (
                champ.playoffGames.map((g, i) => (
                  <GameRow key={i} game={g} />
                ))
              ) : (
                <div className="text-[11px] text-slate-600">Sem dados</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChampionsWall({ champions }) {
  const [openSet, setOpenSet] = useState(new Set())

  const toggle = (index) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <section className="mt-8 mb-8">
      <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

        <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
              <Trophy className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                Champions Wall
              </div>
              <div className="text-base text-slate-400">
                Every title. Every campaign.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3 items-start">
          {champions.map((champ, index) => (
            <ChampionCard
              key={champ.season}
              champ={champ}
              index={index}
              isOpen={openSet.has(index)}
              onToggle={() => toggle(index)}
            />
          ))}
        </div>

      </div>
    </section>
  )
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

  // ===== CHAMPIONS WALL =====
// Adicione este useEffect e estado junto aos outros no componente principal

const [championsData, setChampionsData] = useState([])

useEffect(() => {
  let mounted = true

  async function loadChampionsData() {
    try {
      const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
      const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

      const [historyJson, gamesJson] = await Promise.all([
        safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])

      if (!mounted) return

      // Filtra apenas os campeões de cada temporada
      const champions = historyJson
        .filter((row) => {
          const isChamp = String(
            row?.Champion || row?.champion || ''
          ).trim().toUpperCase()
          return isChamp === 'TRUE'
        })
        .map((row) => ({
          season: String(row?.Season || row?.season || '').trim(),
          team: String(row?.Team || row?.team || '').trim(),
          wins: parseNumber(row?.Wins || row?.wins || row?.W || 0),
          losses: parseNumber(row?.Losses || row?.losses || row?.L || 0),
          pf: parseNumber(row?.PF || row?.Points || row?.points_for || 0),
          playoffWins: parseNumber(row?.PlayoffWins || row?.playoff_wins || row?.POW || 0),
          playoffLosses: parseNumber(row?.PlayoffLosses || row?.playoff_losses || row?.POL || 0),
          playoffPF: parseNumber(row?.PlayoffPF || row?.playoff_pf || row?.POPF || 0),
        }))
        .sort((a, b) => Number(b.season) - Number(a.season))

      // Para cada campeão, busca os jogos daquela temporada
      const championsWithGames = champions.map((champ) => {
        const seasonGames = gamesJson.filter((game) => {
          const season = String(game?.Season || game?.season || '').trim()
          const team = String(game?.Team || game?.team || '').trim()
          const stage = String(game?.gameStage || game?.GameStage || '').trim()
          return (
            season === champ.season &&
            normalizeString(team) === normalizeString(champ.team) &&
            (stage === 'Reg Season' || stage === 'Playoffs')
          )
        })

        // Ordena por semana cronologicamente
        const sorted = seasonGames.sort((a, b) => {
          const wA = parseNumber(String(a?.Week || a?.week || '0').replace(/\D/g, ''))
          const wB = parseNumber(String(b?.Week || b?.week || '0').replace(/\D/g, ''))
          return wA - wB
        })

        const regGames = sorted.filter((g) => {
          const stage = String(g?.gameStage || g?.GameStage || '').trim()
          return stage === 'Reg Season'
        })

        const playoffGames = sorted.filter((g) => {
          const stage = String(g?.gameStage || g?.GameStage || '').trim()
          return stage === 'Playoffs'
        })

        const mapGame = (game) => {
          const score = parseNumber(game?.Score || game?.score || game?.PF || 0)
          const oppScore = parseNumber(game?.OpponentScore || game?.opponent_score || game?.OppPF || game?.PA || 0)
          const opp = String(game?.Opponent || game?.opponent || '').trim()
          const week = String(game?.Week || game?.week || '').trim()
          const result = score > oppScore ? 'W' : 'L'
          return { result, opp, score, oppScore, week }
        }

        return {
          ...champ,
          regGames: regGames.map(mapGame),
          playoffGames: playoffGames.map(mapGame),
        }
      })

      if (mounted) setChampionsData(championsWithGames)
    } catch (error) {
      console.error(error)
    }
  }

  loadChampionsData()
  return () => { mounted = false }
}, [])

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
          setH2hData(h2hSortedJson)
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

  // Lista única de times extraída do h2h
const allTeams = useMemo(() => {
  const teams = new Set()
  h2hData.forEach((row) => {
    const keys = Object.keys(row)
    const a = String(row[keys[0]] || '').trim()
    const b = String(row[keys[1]] || '').trim()
    if (a) teams.add(a)
    if (b) teams.add(b)
  })
  return Array.from(teams).sort()
}, [h2hData])

// Times disponíveis para o segundo dropdown (exclui o time A)
const teamsForB = useMemo(() => {
  if (!selectedTeamA) return allTeams.filter((t) => t !== selectedTeamA)
  // Só mostra times que têm confronto com teamA na planilha
  return h2hData
    .filter((row) => {
      const keys = Object.keys(row)
      const a = String(row[keys[0]] || '').trim()
      return normalizeString(a) === normalizeString(selectedTeamA)
    })
    .map((row) => {
      const keys = Object.keys(row)
      return String(row[keys[1]] || '').trim()
    })
    .filter(Boolean)
    .sort()
}, [h2hData, selectedTeamA])

// Confronto selecionado
const selectedRivalry = useMemo(() => {
  if (!selectedTeamA || !selectedTeamB) return null

  const row = h2hData.find((r) => {
    const keys = Object.keys(r)
    const a = String(r[keys[0]] || '').trim()
    const b = String(r[keys[1]] || '').trim()
    return (
      normalizeString(a) === normalizeString(selectedTeamA) &&
      normalizeString(b) === normalizeString(selectedTeamB)
    )
  })

  if (!row) return null

  const lastMatch = String(row['Last Match'] || row['last match'] || '')
  const scoreMatch = lastMatch.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  const weekMatch = lastMatch.match(/W(\d+)/i)
  const yearMatch = lastMatch.match(/(20\d{2})/)

  const winsA = parseNumber(
    row['A W'] || row['A_W'] || row['A_WINS'] || row['A Wins'] || row['A'] || 0
  )
  const winsB = parseNumber(
    row['B W'] || row['B_W'] || row['B_WINS'] || row['B Wins'] || row['B'] || 0
  )
  const poWinsA = parseNumber(row['A PO_W'] || 0)
  const poWinsB = parseNumber(row['B PO_W'] || 0)
  const avgMargin = String(
    row['Avg Margin'] || row['AVG_MARGIN'] || row['Average Margin'] || row['Margin'] || '0.0'
  )
  const streak = String(row['Current Streak'] || '--')

  const totalGames = winsA + winsB
  const recordGap = Math.abs(winsA - winsB)
  const margin = Math.abs(parseFloat(avgMargin) || 0)
  let rivalryScore = 0
  if (recordGap === 0) rivalryScore += 7
  else if (recordGap === 1) rivalryScore += 5
  else if (recordGap === 2) rivalryScore += 3
  else if (recordGap === 3) rivalryScore += 1
  else rivalryScore -= 3
  if (totalGames >= 14) rivalryScore += 5
  else if (totalGames >= 10) rivalryScore += 4
  else if (totalGames >= 6) rivalryScore += 2
  if (margin <= 3) rivalryScore += 5
  else if (margin <= 7) rivalryScore += 3
  else if (margin <= 12) rivalryScore += 1
  const heat =
    rivalryScore >= 13 ? 'Legendary' :
    rivalryScore >= 10 ? 'Elite' :
    rivalryScore >= 7  ? 'High' :
    rivalryScore >= 4  ? 'Medium' : 'Low'

  const shortName = (name) => {
    const mappings = {
      'i am megatron': 'Megatron', 'h-lera do mahl': 'H-Lera',
      'peytão da massa': 'Peytao', 'peytao da massa': 'Peytao',
      'ocupa meu slot': 'Ocupa', 'green bay pequers': 'Pequers',
      'settlers of rincão': 'Rincão', 'settlers of rincao': 'Rincão',
      'old brady bunch': 'OldBrady', 'moneyball fc': 'Moneyball',
      'patrolão': 'Patrolao', 'patrolao': 'Patrolao',
      'how much is the fish': 'Howmuch',
    }
    const n = normalizeString(name)
    return mappings[n] || String(name).split(' ')[0]
  }

  const formattedStreak = streak
    .replace(selectedTeamA, shortName(selectedTeamA))
    .replace(selectedTeamB, shortName(selectedTeamB))
  const streakParts = formattedStreak.split(' ')
  const streakVal = streakParts.pop()
  const streakTeam = streakParts.join(' ')

  return {
    teamA: selectedTeamA,
    teamB: selectedTeamB,
    record: `${winsA}-${winsB}`,
    playoffRecord: `${poWinsA}-${poWinsB}`,
    avgMargin,
    heat,
    streak: `${streakTeam} ${streakVal}`,
    lastMeeting: {
      score: scoreMatch ? `${scoreMatch[1]} vs ${scoreMatch[2]}` : '-- vs --',
      meta: weekMatch || yearMatch
        ? `W${weekMatch ? weekMatch[1] : '?'} • ${yearMatch ? yearMatch[1] : ''}`
        : '',
    },
  }
}, [h2hData, selectedTeamA, selectedTeamB])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      
{/* ===== HEADER ===== */}
<header className="relative z-20 mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
  <div className="flex items-center gap-3">
    <Image
      src="/images/LogoFinalBlack.png"
      alt="Tapitas League"
      width={44}
      height={44}
      className="rounded-xl invert"
    />
    <span className="text-lg font-black tracking-[-0.04em] text-white">
      Tapitas<span className="text-cyan-400">League</span>
    </span>
  </div>

  <nav className="hidden items-center gap-1 md:flex">
    {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map((item) => (
      <button
        key={item}
        className="rounded-xl px-4 py-2 text-sm font-bold text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white"
      >
        {item}
      </button>
    ))}
  </nav>

  <button className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition-all hover:bg-cyan-400/20">
    2024 Season
    <ChevronRight className="h-4 w-4" />
  </button>
</header>

{/* ===== HERO ===== */}
<section className="relative z-10 mx-auto max-w-[1680px] px-6 pb-16 pt-8">
  <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f_0%,#0b1422_50%,#0d1028_100%)] p-10 md:p-14">

    {/* fundo decorativo */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[38px]">
      <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.06] blur-[80px]" />
      <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-cyan-400/[0.04] blur-[60px]" />
    </div>

    <div className="relative flex flex-col items-center gap-12 xl:flex-row xl:items-center xl:justify-between">

      {/* texto */}
      <div className="flex-1">
        {/* badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
          <Flame className="h-4 w-4 text-cyan-300" />
          <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            EST. 2014 &nbsp;|&nbsp; A LEAGUE. A HISTORY.
          </span>
        </div>

       {/* título Bebas Neue */}
<h1
  className="mb-5 leading-[0.88]"
  style={{
    fontFamily: '"Bebas Neue", sans-serif',
    fontSize: 'clamp(64px, 9vw, 120px)',
    letterSpacing: '0.02em',
  }}
>
  <span
    style={{
      display: 'block',
      background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    THE HOME OF
  </span>
  <span
    style={{
      display: 'block',
      background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 40%, #0891b2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.3))',
    }}
  >
    TAPITAS{' '}
    <span
      style={{
        background: 'linear-gradient(160deg, #e2e8f0 0%, #64748b 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'none',
      }}
    >
      HISTORY
    </span>
  </span>
</h1>

     {/* subtítulo */}
        <p className="mb-8 max-w-lg text-base font-medium leading-relaxed text-slate-400 md:text-lg">
          All the stats. All the moments. All the rivalry.
          <br />
          <span className="text-slate-500">Explore the history that built the league.</span>
        </p>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-cyan-400 px-6 text-sm font-black text-[#020617] transition-all hover:bg-cyan-300">
            <Trophy className="h-4 w-4" />
            Ver Standings
          </button>
          <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-black text-white transition-all hover:bg-white/[0.08]">
            <Swords className="h-4 w-4" />
            Rivalries
          </button>
        </div>
      </div>

      {/* imagem */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ animation: 'heroFloat 5s ease-in-out infinite' }}
      >
        <Image
          src="/images/LogoFinalBlack.png"
          alt="Tapitas League Logo"
          width={580}
          height={580}
          style={{
            width: 'clamp(200px, 28vw, 580px)',
            height: 'clamp(200px, 28vw, 580px)',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  </div>

  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

    @keyframes heroFloat {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
  `}</style>


</section>

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

        {/* ===== CHAMPIONS WALL ===== */}
        {championsData.length > 0 && (
          <ChampionsWall champions={championsData} />
        )}

        <div className="flex flex-col gap-8 xl:flex-row">
          {/* RIVALRY SPOTLIGHT */}
        <div className="w-full overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] xl:flex-[1.15]">
          <div className="flex h-full flex-col p-5 sm:p-7 xl:p-8">

            {/* Header */}
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Swords className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                    Rivalry Spotlight
                  </div>
                  <div className="text-base text-slate-400">
                    The league's fiercest matchup.
                  </div>
                </div>
              </div>
            </div>

            {/* Seletores */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <select
                value={selectedTeamA}
                onChange={(e) => {
                  setSelectedTeamA(e.target.value)
                  setSelectedTeamB('')
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:bg-white/[0.07] focus:border-cyan-400/40"
              >
                <option value="" className="bg-slate-900">Select a team...</option>
                {allTeams.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>

              <div className="flex-shrink-0 text-center text-lg font-black text-cyan-400">
                vs
              </div>

              <select
                value={selectedTeamB}
                onChange={(e) => setSelectedTeamB(e.target.value)}
                disabled={!selectedTeamA}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:bg-white/[0.07] focus:border-cyan-400/40 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-slate-900">Select opponent...</option>
                {teamsForB.map((t) => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
            </div>

            {/* Estado vazio */}
            {!selectedRivalry && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[26px] border border-white/5 bg-white/[0.02] py-12 text-center">
                <Swords className="h-8 w-8 text-slate-600" />
                <p className="text-sm font-bold text-slate-600">
                  Select two teams to see their rivalry stats
                </p>
              </div>
            )}

            {/* Stats do confronto */}
            {selectedRivalry && (
              <>
                <h2 className="mb-6 break-words text-[28px] font-black leading-[0.95] tracking-[-0.05em] sm:text-[36px] lg:text-[44px]">
                  {selectedRivalry.teamA}
                  <span className="mx-3 text-cyan-400">vs</span>
                  {selectedRivalry.teamB}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    [Target,   'Record',                         selectedRivalry.record],
                    [Trophy,   'Playoffs',                       selectedRivalry.playoffRecord],
                    [Activity, 'Avg Margin',                     `${selectedRivalry.avgMargin} ppg`],
                    [Stars,    `Last Meeting (${selectedRivalry.lastMeeting.meta})`, selectedRivalry.lastMeeting.score],
                    [Radar,    'Current Streak',                 selectedRivalry.streak],
                    [Flame,    'Rivalry Heat',                   selectedRivalry.heat],
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
                      <div className="flex flex-wrap items-center text-2xl font-black leading-none xl:text-[30px]">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

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