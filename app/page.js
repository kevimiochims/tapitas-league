'use client'

import Image from 'next/image'
import {
  Shield, Calendar, Trophy, Flame, ChevronRight, ChevronLeft,
  Swords, Stars, Activity, Radar, Target, Medal
} from 'lucide-react'
import { useEffect, useMemo, useState, useRef } from 'react'


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

function TeamSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white pl-4 pr-10 text-sm font-extrabold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/20"
      >
        {placeholder && (
          <option value="" disabled className="text-slate-500 font-bold">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-slate-900 font-bold">
            {opt}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

function normalizeTeam(team, index) {
  return {
    team: (team && (team.Team || team.team || team.Name)) || `Franchise ${index + 1}`,
    wins:        parseNumber(team?.W      || team?.Wins   || team?.wins  || 0),
    losses:      parseNumber(team?.L      || team?.Losses || team?.losses || 0),
    pf:          parseNumber(team?.PF     || team?.Points || team?.points_for || 0),
    rsW:         parseNumber(team?.RS_W   || 0),
    rsL:         parseNumber(team?.RS_L   || 0),
    rsPF:        parseNumber(team?.RS_PF  || 0),
    poW:         parseNumber(team?.PO_W   || 0),
    poL:         parseNumber(team?.PO_L   || 0),
    poPF:        parseNumber(team?.PO_PF  || 0),
    winPct:   parseNumber(team?.['W%']    || 0),
    rsWinPct: parseNumber(
  team?.['RS_W%'] ?? team?.RS_W_pct ?? team?.['RS_W%'.toString()] ?? 0
),
poWinPct: parseNumber(
  team?.['PO_W%'] ?? team?.PO_W_pct ?? team?.['PO_W%'.toString()] ?? 0
),
    wStreakRS:   parseNumber(team?.['W Streak RS']    || 0),
    wStreakTotal:parseNumber(team?.['W Streak Total'] || 0),
    lStreakRS:   parseNumber(team?.['L Streak RS']    || 0),
    lStreakTotal:parseNumber(team?.['L Streak Total'] || 0),
    playoffApps: parseNumber(team?.['Playoff Apps']   || 0),
    finals:      parseNumber(team?.Finals  || 0),
    titles:      parseNumber(team?.Titles  || 0),
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
  const isWin = game.result === 'W';

  return (
    <div className="flex flex-col border-b border-slate-100 py-1.5 last:border-0">
      <div className="flex items-center gap-2">
        {/* Badge de Resultado: Ganhou fundo colorido e padding para destacar */}
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-black tracking-wide ${
            isWin 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {game.result}
        </span>
        
        {/* Confronto */}
        <span className="truncate text-[12px] font-bold text-slate-700">
          vs {game.opp}
        </span>
      </div>
      
      {/* Placar Secundário */}
      <span className="text-[10.5px] font-medium text-slate-400 mt-1 pl-7">
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
      className={`relative overflow-hidden rounded-[24px] border transition-all duration-300 ${
        isOpen
          ? 'border-cyan-500 bg-white shadow-md'
          : 'border-white/80 bg-white/60 hover:bg-white/90 backdrop-blur-sm hover:border-slate-300 shadow-sm'
      }`}
    >
      {/* Gradiente de Reflexo de Luz Metálica (Estilo sites americanos) */}
      {!isOpen && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 pointer-events-none" />
      )}

      {/* Badge Reigning */}
      {index === 0 && (
        <div className="absolute right-3 top-3 z-10 rounded-lg bg-amber-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
          Reigning
        </div>
      )}

      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-4 px-5 text-left transition-all relative z-10 ${
          index === 0 ? 'pb-4 pt-8' : 'py-4'
        }`}
      >
        {!isOpen && (
          <Trophy className="h-5 w-5 flex-shrink-0 text-amber-500" />
        )}

        <span
          className={`flex-shrink-0 font-['Bebas_Neue'] font-black leading-none transition-all tracking-wide ${
            isOpen ? 'text-[40px] text-cyan-600' : 'text-[32px] text-slate-400'
          }`}
        >
          {champ.season}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-black text-slate-800 transition-all ${
              isOpen ? 'text-lg text-cyan-700' : 'text-base'
            }`}
          >
            {champ.team}
          </div>
          <div className="mt-0.5 text-xs font-bold text-slate-500">
            {champ.wins}–{champ.losses} overall
            {champ.playoffWins > 0 || champ.playoffLosses > 0
              ? ` • ${champ.playoffWins}–${champ.playoffLosses} PO`
              : ''}
            {champ.pf > 0 ? ` • ${Math.round(champ.pf)} pts` : ''}
          </div>
        </div>

        <ChevronRight
          className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90 text-cyan-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        /* O painel interno expandido permanece limpo e ultra legível */
        <div className="border-t border-slate-100 bg-white px-5 pb-5 pt-4 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                Reg Season
              </div>
              {regCol1.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] opacity-0 select-none">
                &nbsp;
              </div>
              {regCol2.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-600">
                Playoffs
              </div>
              {champ.playoffGames.length > 0 ? (
                champ.playoffGames.map((g, i) => (
                  <GameRow key={i} game={g} />
                ))
              ) : (
                <div className="text-[11px] font-medium text-slate-400">Sem dados</div>
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
      {/* CONTAINER COM EFEITO DE VIDRO REFLEXIVO */}
      <div className="overflow-hidden rounded-[38px] border border-white/60 bg-white/70 backdrop-blur-md shadow-lg shadow-slate-100/50">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600/10">
              <Trophy className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600">
                Champions Wall
              </div>
              <div className="text-sm font-bold text-slate-600 mt-0.5">
                Every title. Every campaign.
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Cards — Ajustado para o fundo de vidro */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3 items-start bg-slate-50/30">
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

const TEAM_AVATARS = {
  'peytão da massa':       '/images/peytao.jpg',
  'peytao da massa':       '/images/peytao.jpg',
  'moneyball fc':          '/images/Moneyball.png',
  'old brady bunch':       '/images/oldbrady.png',
  'i am megatron':         '/images/megatron.png',
  'ocupa meu slot':        '/images/ocupa.jpg',
  'ocupa e resiste':       '/images/ocupa.jpg',
  'green bay pequers':     '/images/pequers.png',
  'pequers verde':         '/images/pequers.png',
  'patrolão':              '/images/patrolao.png',
  'patrolao':              '/images/patrolao.png',
  'patrolao squad':        '/images/patrolao.png',
  'how much is the fish':  '/images/howmuch.jpg',
  'settlers of rincão':    '/images/rincao.png',
  'settlers of rincao':    '/images/rincao.png',
  'rincao settlers':       '/images/rincao.png',
  'h-lera do mahl':        '/images/HLera.jpg',
}

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function buildSeasonRanges(years) {
  if (!years || years.length === 0) return ''

  const sorted = [...years].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)
      start = sorted[i]
      end = sorted[i]
    }
  }

  ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)

  return ranges.join(' • ')
}

const SORT_OPTIONS = [
  {
    label: 'Wins',
    subs: [
      { label: 'Total',       key: 'W',      order: 'desc' },
      { label: 'Reg Season',  key: 'RS_W',   order: 'desc' },
      { label: 'Playoffs',    key: 'PO_W',   order: 'desc' },
    ],
  },
  {
    label: 'Losses',
    subs: [
      { label: 'Total',       key: 'L',      order: 'desc' },
      { label: 'Reg Season',  key: 'RS_L',   order: 'desc' },
      { label: 'Playoffs',    key: 'PO_L',   order: 'desc' },
    ],
  },
  {
  label: 'Win %',
    subs: [
      { label: 'Total',      key: 'W%',    order: 'desc' },
      { label: 'Reg Season', key: 'RS_W%', order: 'desc' },
      { label: 'Playoffs',   key: 'PO_W%', order: 'desc' },
    ],
  },
  {
    label: 'Points',
    subs: [
      { label: 'All-Time',    key: 'PF',     order: 'desc' },
      { label: 'Reg Season',  key: 'RS_PF',  order: 'desc' },
      { label: 'Playoffs',    key: 'PO_PF',  order: 'desc' },
    ],
  },
  {
    label: 'Win Streak',
    subs: [
      { label: 'Reg Season',  key: 'W Streak RS',    order: 'desc' },
      { label: 'Total',       key: 'W Streak Total', order: 'desc' },
    ],
  },
  {
    label: 'Loss Streak',
    subs: [
      { label: 'Reg Season',  key: 'L Streak RS',    order: 'desc' },
      { label: 'Total',       key: 'L Streak Total', order: 'desc' },
    ],
  },
  {
  label: 'Playoffs Appearances',
  subs: [
    { label: 'Appearances', key: 'Playoff Apps', order: 'desc' },
  ],
},
{
  label: 'Finals Appearances',
  subs: [
    { label: 'Appearances', key: 'Finals', order: 'desc' },
  ],
},
  {
    label: 'Championships',
    subs: [
      { label: 'Titles',      key: 'Titles', order: 'desc' },
    ],
  },
]

function buildStreakMap(gamesJson, teamsJson) {
  const byTeam = {}

  // Temporada mais recente do banco
  let maxSeason = 0
  gamesJson.forEach((game) => {
    const season = parseNumber(game?.Season || game?.season || 0)
    if (season > maxSeason) maxSeason = season
  })

  // Monta lookup do melhor streak por time vindo do TEAM_ALL_TIME
  const bestStreakByTeam = {}
  teamsJson.forEach((row) => {
    const team = String(row?.Team || row?.team || '').trim()
    if (!team) return
    bestStreakByTeam[team] = {
      wStreakRS:    parseNumber(String(row?.['W Streak RS']    || '0').replace(/[WL]/i, '')),
      wStreakTotal: parseNumber(String(row?.['W Streak Total'] || '0').replace(/[WL]/i, '')),
      lStreakRS:    parseNumber(String(row?.['L Streak RS']    || '0').replace(/[WL]/i, '')),
      lStreakTotal: parseNumber(String(row?.['L Streak Total'] || '0').replace(/[WL]/i, '')),
    }
  })

  // Agrupa jogos por time ordenado cronologicamente
  gamesJson.forEach((game) => {
    const team = String(game?.Team || game?.team || '').trim()
    if (!team) return

    const week        = parseNumber(game?.Week   || game?.week   || 0)
    const season      = parseNumber(game?.Season || game?.season || 0)
    const streakRS    = parseNumber(game?.Streak       || 0)
    const streakTotal = parseNumber(game?.Streak_Total || 0)

    if (!byTeam[team]) byTeam[team] = []
    byTeam[team].push({ week, season, streakRS, streakTotal })
  })

  const result = {}

  Object.entries(byTeam).forEach(([team, games]) => {
    const sorted = games.sort((a, b) =>
      a.season !== b.season ? a.season - b.season : a.week - b.week
    )

    const best = bestStreakByTeam[team]
    if (!best) return

    const findBestStreak = (key, bestVal, isWin) => {
      if (!bestVal || bestVal === 0) return null

      // O valor que buscamos: positivo pra win, negativo pra loss
      const targetVal = isWin ? bestVal : -bestVal

      // Encontra o índice onde o streak atingiu o valor máximo pela PRIMEIRA vez
      let peakIndex = -1
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i][key] === targetVal) {
          peakIndex = i
          break
        }
      }

      if (peakIndex === -1) return null

      const endGame = sorted[peakIndex]

      // Percorre para trás a partir do peak até achar o 1 ou -1
      const startTarget = isWin ? 1 : -1
      let startIndex = peakIndex
      for (let i = peakIndex; i >= 0; i--) {
        if (sorted[i][key] === startTarget) {
          startIndex = i
          break
        }
      }

      const startGame = sorted[startIndex]

      // Streak é ativo se o último jogo do time está na temporada mais recente
      const lastGame = sorted[sorted.length - 1]
      const isActive = lastGame.season === maxSeason && Math.abs(sorted[sorted.length - 1][key]) >= bestVal

      return {
        startWeek:   startGame.week,
        startSeason: startGame.season,
        endWeek:     endGame.week,
        endSeason:   endGame.season,
        active:      isActive,
      }
    }

    result[team] = {
      streakRS:    findBestStreak('streakRS',    best.wStreakRS,    true),
      streakTotal: findBestStreak('streakTotal', best.wStreakTotal, true),
      lStreakRS:   findBestStreak('streakRS',    best.lStreakRS,    false),
      lStreakTotal:findBestStreak('streakTotal', best.lStreakTotal, false),
    }
  })

  return result
}

export default function TapitasLeagueHomepage() {
  const [rawData, setRawData] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [selectedTeamA, setSelectedTeamA] = useState('Peytao da Massa')
  const [selectedTeamB, setSelectedTeamB] = useState('Moneyball')
  const [sortCategory, setSortCategory] = useState('Wins')
  const [sortSub, setSortSub] = useState('Total')
  const [standingsPage, setStandingsPage] = useState(0)
  const [streakMap, setStreakMap] = useState({})

 const [leagueStats, setLeagueStats] = useState({
  franchises: 0,
  seasons: 0,
  seasonRange: '',
  allSeasons: [],  // <-- adicione
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
  const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
  if (cat && !cat.subs.find((s) => s.label === sortSub)) {
    setSortSub(cat.subs[0].label)
  }
  setStandingsPage(0)
}, [sortCategory])

useEffect(() => {
  setStandingsPage(0)
}, [sortSub])

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
        seasonRange:
          sortedSeasons.length > 0
            ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
                sortedSeasons[sortedSeasons.length - 1]
              ).slice(2)}`
            : '',
        allSeasons: sortedSeasons,
        games: uniqueGames.size,
        highestScore: Math.round(highestScore * 100) / 100,
        highestScoreTeam,
      })

      if (mounted) {
        setStreakMap(buildStreakMap(gamesJson, teamsJson))
      }

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
      ? rawData : FALLBACK_TEAMS

  const mapped = base.map(normalizeTeam)
  console.log('rsWinPct exemplo:', mapped[0]?.rsWinPct, 'poWinPct:', mapped[0]?.poWinPct)
 

  const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
  const sub = cat?.subs.find((s) => s.label === sortSub) ?? cat?.subs[0]

  const keyMap = {
    'W':              (t) => t.wins,
    'RS_W':           (t) => t.rsW,
    'PO_W':           (t) => t.poW,
    'L':              (t) => t.losses,
    'RS_L':           (t) => t.rsL,
    'PO_L':           (t) => t.poL,
    'W%':             (t) => t.winPct,
    'RS_W%':          (t) => t.rsWinPct,
    'PO_W%':          (t) => t.poWinPct,
    'PF':             (t) => t.pf,
    'RS_PF':          (t) => t.rsPF,
    'PO_PF':          (t) => t.poPF,
    'W Streak RS':    (t) => t.wStreakRS,
    'W Streak Total': (t) => t.wStreakTotal,
    'L Streak RS':    (t) => t.lStreakRS,
    'L Streak Total': (t) => t.lStreakTotal,
    'Playoff Apps':   (t) => t.playoffApps,
    'Finals':         (t) => t.finals,
    'Titles':         (t) => t.titles,
  }

  const getter = sub ? keyMap[sub.key] : (t) => t.wins
  const order  = sub?.order ?? 'desc'

  return mapped.sort((a, b) => {
    const diff = order === 'desc'
      ? getter(b) - getter(a)
      : getter(a) - getter(b)
    if (diff !== 0) return diff
    // desempate sempre por wins desc → losses asc → pf desc
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return b.pf - a.pf
  })
}, [rawData, sortCategory, sortSub])

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
  <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
    
    {/* ===== HEADER ===== */}
    <header className="relative z-20 mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <Image
          src="/images/LogoFinalBlack.png"
          alt="Tapitas League"
          width={44}
          height={44}
          className="rounded-xl" 
        />
        <span className="text-lg font-black tracking-[-0.04em] text-slate-900">
          Tapitas<span className="text-cyan-600">League</span>
        </span>
      </div>

      <nav className="hidden items-center gap-1 md:flex">
        {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map((item) => (
          <button
            key={item}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200/60 hover:text-slate-900"
          >
            {item}
          </button>
        ))}
      </nav>

      <button className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 text-sm font-black text-cyan-700 transition-all hover:bg-cyan-500/20">
        2024 Season
        <ChevronRight className="h-4 w-4" />
      </button>
    </header>

    {/* ===== HERO ===== */}
    <section className="relative z-10 mx-auto max-w-[1680px] px-6 pb-16 pt-8">
      {/* Container do Hero: Fundo totalmente limpo para dar destaque à imagem */}
      <div className="relative overflow-hidden rounded-[38px] border border-slate-200/80 bg-slate-50 p-10 shadow-md md:p-14">
        
        {/* Camada da Imagem de Fundo — Totalmente visível e nítida de ponta a ponta */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[38px]">
          <Image
            src="/images/Hero_bg.webp"
            alt="Estádio ao fundo"
            layout="fill"
            objectFit="cover"
            className="opacity-100" 
            priority
          />
          
          {/* Luzes internas sutis integradas por cima da foto */}
          <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.08] blur-[80px]" />
          <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-cyan-400/[0.06] blur-[60px]" />
        </div>

        <div className="relative flex flex-col items-center gap-12 xl:flex-row xl:items-center xl:justify-between">

          {/* Texto */}
          <div className="flex-1">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
              <Flame className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
                EST. 2014 &nbsp;|&nbsp; A LEAGUE. A HISTORY. A LEGACY.
              </span>
            </div>

            {/* Título original mantido intacto */}
            <h1 className="mb-5 font-['Bebas_Neue'] text-[clamp(64px,9vw,120px)] leading-[0.88] tracking-wider">
              <span className="block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
                THE HOME OF
              </span>
              <span className="block bg-gradient-to-r from-cyan-500 via-cyan-600 to-cyan-700 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(6,182,212,0.15)]">
                TAPITAS{' '}
                <span className="bg-gradient-to-r from-slate-700 to-slate-400 bg-clip-text text-transparent drop-shadow-none">
                  HISTORY
                </span>
              </span>
            </h1>

            {/* Subtítulo original */}
            <p className="mb-8 max-w-lg text-base font-medium leading-relaxed text-slate-600 md:text-lg">
              All the stats. All the moments. All the rivalry.
              <br />
              <span className="text-slate-400">Explore the history that built the league.</span>
            </p>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex h-12 items-center gap-2 rounded-2xl bg-cyan-600 px-6 text-sm font-black text-white transition-all hover:bg-cyan-700 shadow-md shadow-cyan-600/10">
                <Trophy className="h-4 w-4" />
                Ver Standings
              </button>
              {/* Botão secundário ajustado para ornar com o vidro transparente */}
              <button className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm px-6 text-sm font-black text-slate-700 transition-all hover:bg-white/90">
                <Swords className="h-4 w-4" />
                Rivalries
              </button>
            </div>
          </div>

          {/* Imagem original com sua animação intacta */}
          <div
            className="relative flex-shrink-0 flex items-center justify-center animate-[heroFloat_5s_ease-in-out_infinite]"
          >
            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League Logo"
              width={580}
              height={580}
              className="object-contain"
              style={{
                width: 'clamp(200px, 28vw, 580px)',
                height: 'clamp(200px, 28vw, 580px)',
              }}
            />
          </div>
        </div>
      </div>
    </section>

    {/* ===== STATS SECTION ===== */}
    <section className="relative z-10 mx-auto max-w-[1680px] px-6 pb-24 pt-10">
      <div className="mb-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        
        {/* Usando uma função interna para renderizar os cards de Stats repetitivos de forma limpa */}
        {[
          { label: 'Franchises', value: leagueStats.franchises, sub: 'Current', icon: Shield },
          { label: 'Seasons', value: leagueStats.seasons, sub: buildSeasonRanges(leagueStats.allSeasons), icon: Calendar, isScroll: true },
          { label: 'Games Disputed', value: leagueStats.games, sub: 'All-Time', icon: Radar },
          { label: 'Highest Score', value: leagueStats.highestScore, sub: leagueStats.highestScoreTeam, icon: Flame }
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/10 bg-cyan-500/5">
                <Icon className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{card.label}</div>
              <div className="mb-3 text-4xl font-black lg:text-5xl text-slate-800">{card.value}</div>
              <div className={`${card.isScroll ? 'overflow-x-auto whitespace-nowrap pb-1' : 'truncate'} text-sm font-bold text-cyan-600`} style={card.isScroll ? { scrollbarWidth: 'none' } : {}}>
                {card.sub}
              </div>
            </div>
          )
        })}
      </div>

      {/* ===== CHAMPIONS WALL ===== */}
      {championsData.length > 0 && (
        <ChampionsWall champions={championsData} />
      )}

      {/* ===== TWO COLUMN LAYOUT (Rivalry & Leaders) ===== */}
      <div className="flex flex-col gap-8 xl:flex-row">
        
        {/* RIVALRY SPOTLIGHT */}
        <div className="w-full overflow-hidden rounded-[38px] border border-slate-200 bg-white shadow-sm xl:flex-[1.15]">
          <div className="flex h-full flex-col p-5 sm:p-7 xl:p-8">

            {/* Header */}
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/10 bg-cyan-500/5">
                  <Swords className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-600">
                    Rivalry Spotlight
                  </div>
                  <div className="text-base text-slate-500">
                    The league's fiercest matchup.
                  </div>
                </div>
              </div>
            </div>

            {/* Seletores */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <TeamSelect value={selectedTeamA} onChange={(val) => { setSelectedTeamA(val); setSelectedTeamB(''); }} options={allTeams} placeholder="Select a team..." />
              <div className="flex-shrink-0 text-center text-lg font-black text-cyan-600">vs</div>
              <TeamSelect value={selectedTeamB} onChange={setSelectedTeamB} options={teamsForB} placeholder="Select opponent..." disabled={!selectedTeamA} />
            </div>

            {/* Estado vazio */}
            {!selectedRivalry && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[26px] border border-slate-100 bg-slate-50/50 py-12 text-center">
                <Swords className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-bold text-slate-400">
                  Select two teams to see their rivalry stats
                </p>
              </div>
            )}

            {/* Stats do confronto */}
            {selectedRivalry && (
              <>
                <h2 className="mb-6 font-black leading-tight tracking-[-0.04em] text-slate-800 text-[clamp(18px,4vw,44px)]">
                  {selectedRivalry.teamA}
                  <span className="mx-2 text-cyan-600">vs</span>
                  {selectedRivalry.teamB}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    [Target,   'Record',                                             selectedRivalry.record],
                    [Trophy,   'Playoffs',                                           selectedRivalry.playoffRecord],
                    [Activity, 'Avg Margin',                                         `${selectedRivalry.avgMargin} ppg`],
                    [Stars,    `Last Game${selectedRivalry.lastMeeting.meta ? ` (${selectedRivalry.lastMeeting.meta})` : ''}`, selectedRivalry.lastMeeting.score],
                    [Radar,    'Current Streak',                                     selectedRivalry.streak],
                    [Flame,    'Rivalry Heat',                                       selectedRivalry.heat],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/10 bg-cyan-500/5">
                        <Icon className="h-3.5 w-3.5 text-cyan-600" />
                      </div>
                      <div className="mb-2 text-[9px] font-black uppercase leading-tight tracking-[0.1em] text-slate-400 sm:text-[10px] lg:text-[11px] break-words">
                        {label}
                      </div>
                      <div className="font-black leading-none text-slate-800 text-[clamp(14px,3.5vw,30px)] break-words">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FRANCHISE LEADERS */}
        <div className="w-full overflow-hidden rounded-[38px] border border-slate-200 bg-white shadow-sm xl:flex-[0.85]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/10 bg-cyan-500/5">
                <Medal className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-600">
                  Franchise Leaders
                </div>
                <div className="text-base text-slate-500">League Rankings</div>
              </div>
            </div>

            {/* Paginador */}
            {standings.length > 5 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setStandingsPage((p) => Math.max(0, p - 1))} disabled={standingsPage === 0} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-black text-slate-400">{standingsPage + 1}/{Math.ceil(standings.length / 5)}</span>
                <button onClick={() => setStandingsPage((p) => Math.min(Math.ceil(standings.length / 5) - 1, p + 1))} disabled={standingsPage >= Math.ceil(standings.length / 5) - 1} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Sort By */}
          {/* Sort by — abaixo do header, dois dropdowns lado a lado */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <span className="flex-shrink-0 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Sort by
            </span>
            <TeamSelect
              value={sortCategory}
              onChange={(val) => setSortCategory(val)}
              options={SORT_OPTIONS.map((o) => o.label)}
              placeholder="Category..."
            />
            {SORT_OPTIONS.find((o) => o.label === sortCategory)?.subs.length > 1 && (
              <TeamSelect
                value={sortSub}
                onChange={(val) => setSortSub(val)}
                options={
                  SORT_OPTIONS.find((o) => o.label === sortCategory)?.subs.map((s) => s.label) ?? []
                }
                placeholder="Type..."
              />
            )}
          </div>

          {/* Lista */}
          <div className="space-y-4 p-6">
            {standings
              .slice(standingsPage * 5, standingsPage * 5 + 5)
              .map((team, index) => {
                const globalIndex = standingsPage * 5 + index
                const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
                const sub = cat?.subs.find((s) => s.label === sortSub) ?? cat?.subs[0]
                
                // Garantindo a existência dos mapas declarados localmente dentro do escopo do map loop
                const keyMap = {
                  'W':              (t) => t.wins,
                  'RS_W':           (t) => t.rsW,
                  'PO_W':           (t) => t.poW,
                  'L':              (t) => t.losses,
                  'RS_L':           (t) => t.rsL,
                  'PO_L':           (t) => t.poL,
                  'W%':             (t) => `${t.winPct}%`,
                  'RS_W%':          (t) => `${t.rsWinPct}%`,
                  'PO_W%':          (t) => `${t.poWinPct}%`,
                  'PF':             (t) => Math.round(t.pf),
                  'RS_PF':          (t) => Math.round(t.rsPF),
                  'PO_PF':          (t) => Math.round(t.poPF),
                  'W Streak RS':    (t) => t.wStreakRS,
                  'W Streak Total': (t) => t.wStreakTotal,
                  'L Streak RS':    (t) => t.lStreakRS,
                  'L Streak Total': (t) => t.lStreakTotal,
                  'Playoff Apps':   (t) => t.playoffApps,
                  'Finals':         (t) => t.finals,
                  'Titles':         (t) => t.titles,
                }

                const shortLabelMap = {
                  'W':              'Wins',
                  'RS_W':           'Wins',
                  'PO_W':           'Wins',
                  'L':              'Losses',
                  'RS_L':           'Losses',
                  'PO_L':           'Losses',
                  'W%':             'Win %',
                  'RS_W%':          'Win %',
                  'PO_W%':          'Win %',
                  'PF':             'Points',
                  'RS_PF':          'Points',
                  'PO_PF':          'Points',
                  'W Streak RS':    'Win Streak',
                  'W Streak Total': 'Win Streak',
                  'L Streak RS':    'Loss Streak',
                  'L Streak Total': 'Loss Streak',
                  'Playoff Apps':   'Playoffs',
                  'Finals':         'Finals',
                  'Titles':         'Titles',
                }

                // O console.log agora consegue ler 'sub' e 'cat' sem estourar o erro de escopo
                console.log('cat:', sortCategory, 'sub:', sortSub, 'found:', cat?.subs.find((s) => s.label === sortSub))
                
                const displayValue = sub ? keyMap[sub.key]?.(team) ?? '—' : team.wins
                const shortLabel = sub ? shortLabelMap[sub.key] ?? sortCategory : sortCategory

                return (
                  <div
                    key={`${team.team}-${globalIndex}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[28px] border border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6 sm:py-5"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/5 font-black text-cyan-600 sm:h-14 sm:w-14 text-[clamp(14px,3vw,22px)]">
                      {globalIndex + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="mb-1 truncate font-black text-slate-800 text-[clamp(14px,3.5vw,24px)]">
                        {team.team}
                      </div>

                      {(sub?.key === 'W Streak RS' || sub?.key === 'W Streak Total' ||
                        sub?.key === 'L Streak RS' || sub?.key === 'L Streak Total') ? (() => {
                        const keyLookup = {
                          'W Streak RS':    'streakRS',
                          'W Streak Total': 'streakTotal',
                          'L Streak RS':    'lStreakRS',
                          'L Streak Total': 'lStreakTotal',
                        }
                        const streakInfo = streakMap[team.team]?.[keyLookup[sub.key]]
                        if (!streakInfo) return null
                        return (
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-sm">
                            W{streakInfo.startWeek}, {streakInfo.startSeason}
                            <span className="mx-1 text-slate-300">→</span>
                            W{streakInfo.endWeek}, {streakInfo.endSeason}
                            {streakInfo.active && <span className="ml-1 text-cyan-600">(active)</span>}
                          </div>
                        )
                      })() : (
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-sm">
                          {team.wins}W • {team.losses}L • {Math.round(team.pf)} Pts
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="mb-1 font-black leading-none text-cyan-600 text-[clamp(22px,5vw,40px)]">
                        {displayValue}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                        {shortLabel}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </section>

    {/* ===== FOOTER ===== */}
    <footer className="relative z-10 mx-auto max-w-[1680px] px-6 pb-12 pt-4">
      <div className="flex flex-col items-center gap-8 rounded-[38px] border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
        <h2 className="whitespace-nowrap leading-[0.9] tracking-[-0.03em] font-['Bebas_Neue'] text-[clamp(24px,5vw,96px)] bg-gradient-to-r from-slate-800 via-slate-600 to-cyan-600 bg-clip-text text-transparent">
          The game ends. <span className="bg-gradient-to-r from-cyan-500 to-cyan-700 bg-clip-text text-transparent">The history remains.</span>
        </h2>
        <div className="h-px w-24 bg-slate-200" />
        <div className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={32} height={32} className="opacity-60" />
          <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Tapitas League</span>
        </div>
        <p className="text-xs font-bold text-slate-400">
          © {new Date().getFullYear()} Tapitas League · Est. 2014 · All rights reserved.
        </p>
      </div>
    </footer>

    {/* Injeção global das animações e fontes limpas via tag style do Next */}
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      @keyframes heroFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
    `}</style>
  </main>
)
}