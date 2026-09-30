'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { SummaryButton, PageShell, PageBar, BarTab, CardShell, FilterBar, FilterPill, MultiFilterPill, ToggleChip, SortHeader, StatGrid, StatTile, Tag, ResultBadge, StreakBadge, TeamLogo, Pager, LoadingState } from '../components/ui'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const BASE_URL = '/api/sheet'

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseStreak(value) {
  if (value === null || value === undefined || value === '') return 0
  const raw = String(value).trim()
  if (!raw) return 0

  // GAME_FACTS_ALL stores Streak_Total as a signed number. Keep the sign
  // intact; a negative value is a loss streak (L5), never a win streak.
  const numeric = Number(raw.replace(',', '.'))
  if (!Number.isNaN(numeric)) return numeric

  // Be tolerant of presentation-style values such as W5 / L5 as well.
  const magnitude = Math.abs(parseNumber(raw))
  if (/^L/i.test(raw)) return -magnitude
  if (/^W/i.test(raw)) return magnitude
  return parseNumber(raw)
}

function normalizeString(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

const TEAM_AVATARS = {
  'howmuch': '/images/howmuch.png',
  'how much is the fish': '/images/howmuch.png',
  'i am megatron': '/images/megatron.png',
  'moneyball': '/images/moneyball.png',
  'moneyball fc': '/images/moneyball.png',
  'ocupa e resiste': '/images/ocupa.png',
  'ocupa meu slot': '/images/ocupa.png',
  'oldbrady': '/images/oldbrady.png',
  'old brady bunch': '/images/oldbrady.png',
  'patrolao squad': '/images/patrolao.png',
  'patrolao': '/images/patrolao.png',
  'patrolão': '/images/patrolao.png',
  'pequers verde': '/images/pequers.png',
  'green bay pequers': '/images/pequers.png',
  'peytao da massa': '/images/peytao.png',
  'peytão da massa': '/images/peytao.png',
  'rincao settlers': '/images/rincao.png',
  'settlers of rincao': '/images/rincao.png',
  'settlers of rincão': '/images/rincao.png',
  'h-lera do mahl': '/images/hlera.png',
}

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch (err) {
    console.error('Erro:', err)
    return []
  }
}


// ── Gráficos do painel (SVG simples, sem biblioteca) ─────────────────

// Barras horizontais com escudo do time.
function HBarChart({ rows, format = v => v, highlightTop = true, center = null }) {
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 1)
  const span = center === null ? max : Math.max(...rows.map(r => Math.abs(r.value - center)), 1)
  return (
    <div className="space-y-1.5 px-3 py-3 lg:px-4">
      {rows.map((r, i) => {
        const positive = center === null || r.value >= center
        const width = center === null ? (r.value / max) * 100 : (Math.abs(r.value - center) / span) * 50
        return (
          <a key={r.team} href={`/teams?team=${encodeURIComponent(r.team)}`} className="group grid grid-cols-[112px_minmax(0,1fr)_56px] items-center gap-2 sm:grid-cols-[150px_minmax(0,1fr)_60px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <TeamLogo name={r.team} size={18} />
              <span className="truncate text-[12px] font-medium text-[#111] group-hover:text-[#D01F2D]">{r.team}</span>
            </span>
            <span className="relative h-4 rounded bg-[#F1F2F4]">
              {center !== null && <span className="absolute inset-y-0 left-1/2 w-px bg-[#C4C7CC]" />}
              <span
                className={`absolute inset-y-0 rounded ${center !== null ? (positive ? 'bg-[#1E8E3E]' : 'bg-[#D01F2D]') : highlightTop && i === 0 ? 'bg-[#B8860B]' : 'bg-[#02275F]'}`}
                style={center === null ? { left: 0, width: `${width}%` } : positive ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
              />
            </span>
            <span className="text-right text-[12px] font-semibold tabular-nums text-[#111]">{format(r.value)}</span>
          </a>
        )
      })}
    </div>
  )
}

// Colunas verticais com rótulo embaixo e valor em cima.
function ColumnChart({ data, format = v => v, height = 180, width = 640, accentIndex = -1, line = null }) {
  const W = width, H = height, padB = 26, padT = 20, padX = 8
  const max = Math.max(...data.map(d => d.value), ...(line ? data.map(d => d[line.key] || 0) : []), 1)
  const bw = (W - padX * 2) / data.length
  const y = v => padT + (1 - v / max) * (H - padT - padB)
  const linePoints = line ? data.map((d, i) => `${padX + bw * i + bw / 2},${y(d[line.key] || 0)}`).join(' ') : ''
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img">
      {data.map((d, i) => {
        const x = padX + bw * i + bw * 0.18
        const w = bw * 0.64
        return (
          <g key={d.label}>
            <rect x={x} y={y(d.value)} width={w} height={H - padB - y(d.value)} rx="3" fill={i === accentIndex ? '#B8860B' : '#02275F'} opacity={i === accentIndex ? 1 : 0.9} />
            <text x={x + w / 2} y={y(d.value) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#111">{format(d.value)}</text>
            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{d.label}</text>
          </g>
        )
      })}
      {line && (
        <>
          <polyline points={linePoints} fill="none" stroke="#D01F2D" strokeWidth="2" strokeLinejoin="round" />
          {data.map((d, i) => <circle key={i} cx={padX + bw * i + bw / 2} cy={y(d[line.key] || 0)} r="3" fill="#D01F2D" />)}
        </>
      )}
    </svg>
  )
}

function WinChart({ data, chartStats }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!data || data.length === 0) return null

  const W = 520, H = 180, padL = 40, padR = 16, padT = 24, padB = 28
  const maxV = Math.max(...data.map(d => d.value), 1)
  const xScale = (i) => padL + (i / (data.length - 1)) * (W - padL - padR)
  const yScale = (v) => padT + (1 - v / (maxV + 1)) * (H - padT - padB)
  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ')
  const areaPoints = `${xScale(0)},${H - padB} ${points} ${xScale(data.length - 1)},${H - padB}`
  const gridVals = [0, Math.round(maxV * 0.33), Math.round(maxV * 0.66), Math.round(maxV)]
  const fsAxis = isMobile ? 16 : 9
  const fsValue = isMobile ? 15 : 8
  return (

    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
      <polyline points={areaPoints} fill="#02275F" fillOpacity="0.06" stroke="none" />
      <polyline points={points} fill="none" stroke="#02275F" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <text x={xScale(i)} y={H - padB + 14} textAnchor="middle" fontSize={fsAxis} fill="#3F4757">
            {`'${String(d.season).slice(2)}`}
          </text>
          <text
            x={xScale(i)}
            y={yScale(d.value) - 10}
            textAnchor="middle"
            fontSize={fsValue}
            fill={
              d.champion
                ? "#B8860B" // dourado se foi Campeão
                : chartStats?.bestSeasons?.includes(d.season)
                  ? "#1E8E3E" // verde para as Melhores Temporadas
                  : chartStats?.worstSeasons?.includes(d.season)
                    ? "#D01F2D" // vermelho para as Piores Temporadas
                    : "#16274F" // navy padrão para temporadas regulares
            }
            fontWeight={d.champion || chartStats?.bestSeasons?.includes(d.season) || chartStats?.worstSeasons?.includes(d.season) ? 700 : 400}
          >
            {Math.round(d.value)}
          </text>
          <circle cx={xScale(i)} cy={yScale(d.value)} r="3.5" fill={d.champion ? "#B8860B" : "#02275F"} stroke="#fff" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

const CHART_STATS = [
  { label: 'Wins', keys: { 'Reg Season': 'RS_W', 'Playoffs': 'PO_W', 'Total': 'W' } },
  { label: 'Losses', keys: { 'Reg Season': 'RS_L', 'Playoffs': 'PO_L', 'Total': 'L' } },
  { label: 'Points', keys: { 'Reg Season': 'RS_PF', 'Playoffs': 'PO_PF', 'Total': 'PF' } },
  { label: 'Win %', keys: { 'Reg Season': 'RS_W%', 'Playoffs': 'PO_W%', 'Total': 'W%' } },
]

export default function StatsPage() {
  const router = useRouter()
  const [allTimeData, setAllTimeData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [gamesData, setGamesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('overview')
  const [tab, setTab] = useState('Overall')
  const [season, setSeason] = useState('All-Time')
  const [chartTeam, setChartTeam] = useState('Moneyball')
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState('W')
  const [sortDir, setSortDir] = useState('desc')
  const [chartStat, setChartStat] = useState('Wins')
  const [chartScope, setChartScope] = useState('Reg Season')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allSeasons, setAllSeasons] = useState([])

  // Game Log database controls
  const [gfSeason, setGfSeason] = useState([])
  const [gfTeam, setGfTeam] = useState([])
  const [gfOpponent, setGfOpponent] = useState([])
  const [gfStage, setGfStage] = useState([])
  const [gfResult, setGfResult] = useState([])
  const [gfPowerRanking, setGfPowerRanking] = useState([])
  const [gfHS, setGfHS] = useState([])
  const [gfIncludeDoubleWeeks, setGfIncludeDoubleWeeks] = useState(true)
  const [gfInclude200Plus, setGfInclude200Plus] = useState(false)
  const [gfSortCol, setGfSortCol] = useState('Season')
  const [gfSortDir, setGfSortDir] = useState('desc')
  const [gfPage, setGfPage] = useState(0)

  const { setLeftSlot } = useDrawer()

  const TABS = ['Overall', 'Reg Season', 'Playoffs']
  const PER_PAGE = 10

  useEffect(() => {
    async function load() {
      const [allTime, history, games] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])
      setAllTimeData(allTime)
      setHistoryData(history)
      setGamesData(games)
      if (allTime.length > 0) {
        const availableTeams = allTime.map(r => String(r?.Team || r?.team || '').trim()).filter(Boolean)
        const preferredTeam = availableTeams.find(t => normalizeString(t) === normalizeString('Moneyball'))
        setChartTeam(preferredTeam || String(allTime[0]?.Team || allTime[0]?.team || '').trim())
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

  useEffect(() => {
    if (season === 'All-Time' && sortCol === 'Pos') {
      setSortCol('W')
      setSortDir('desc')
    }
  }, [season])

  // Semanas em que o time foi #1 no Power Ranking e semanas em que foi o maior pontuador —
  // apenas temporada regular e apenas semanas únicas (exclui semanas duplas tipo "14-15")
  const { prFirstAllTime, prFirstBySeason, highScorerAllTime, highScorerBySeason } = useMemo(() => {
    const isSingleWeek = (w) => /^\d+$/.test(String(w || '').trim())
    const isRegSeason = (g) => {
      const stage = normalizeString(g?.GameType || g?.GameStage || '')
      return !stage || stage === 'reg season' || stage === 'regular season'
    }

    const regGames = gamesData.filter(g => isRegSeason(g) && isSingleWeek(g?.Week))

    const prFirstAllTime = {}
    const prFirstBySeason = {}
    regGames.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      if (!team || !season) return
      if (parseNumber(g?.['Power Ranking']) === 1) {
        prFirstAllTime[team] = (prFirstAllTime[team] || 0) + 1
        const key = `${team}|${season}`
        prFirstBySeason[key] = (prFirstBySeason[key] || 0) + 1
      }
    })

    // Maior pontuador da semana: agrupa por Season+Week e acha o maior PF
    const byWeek = {}
    regGames.forEach(g => {
      const key = `${g?.Season}|${g?.Week}`
      const pf = parseNumber(g?.PF)
      if (!byWeek[key] || pf > byWeek[key].pf) {
        byWeek[key] = { pf, team: String(g?.Team || '').trim(), season: String(g?.Season || '').trim() }
      }
    })

    const highScorerAllTime = {}
    const highScorerBySeason = {}
    Object.values(byWeek).forEach(({ team, season }) => {
      if (!team) return
      highScorerAllTime[team] = (highScorerAllTime[team] || 0) + 1
      const key = `${team}|${season}`
      highScorerBySeason[key] = (highScorerBySeason[key] || 0) + 1
    })

    return { prFirstAllTime, prFirstBySeason, highScorerAllTime, highScorerBySeason }
  }, [gamesData])

  const seasons = useMemo(() => {
    const s = new Set()
    historyData.forEach(r => {
      const v = String(r?.Season || r?.season || '').trim()
      if (v) s.add(v)
    })
    return ['All-Time', ...Array.from(s).sort((a, b) => Number(b) - Number(a))]
  }, [historyData])

  useEffect(() => {
    const numericSeasons = seasons
      .filter(s => s !== 'All-Time')
      .map(s => Number(s))
      .filter(s => !Number.isNaN(s))
      .sort((a, b) => a - b)
    setAllSeasons(numericSeasons)
  }, [seasons])

  const allTeams = useMemo(() => {
    const t = new Set()
    allTimeData.forEach(r => {
      const v = String(r?.Team || r?.team || '').trim()
      if (v) t.add(v)
    })
    return Array.from(t).sort()
  }, [allTimeData])

  const tableData = useMemo(() => {
    let rows = []
    if (season === 'All-Time') {
      rows = allTimeData.map(r => ({
        team: String(r?.Team || r?.team || '').trim(),
        w: parseNumber(tab === 'Overall' ? r?.W : tab === 'Reg Season' ? r?.RS_W : r?.PO_W),
        l: parseNumber(tab === 'Overall' ? r?.L : tab === 'Reg Season' ? r?.RS_L : r?.PO_L),
        pf: parseNumber(tab === 'Overall' ? r?.PF : tab === 'Reg Season' ? r?.RS_PF : r?.PO_PF),
        winPct: parseNumber(String(tab === 'Overall' ? r?.['W%'] : tab === 'Reg Season' ? r?.['RS_W%'] : r?.['PO_W%'] || '0').replace('%', '')),
        titles: parseNumber(r?.Titles || 0),
        finals: parseNumber(r?.Finals || 0),
        poApps: parseNumber(r?.['Playoff Apps'] || 0),
        prFirst: prFirstAllTime[String(r?.Team || r?.team || '').trim()] || 0,
        highScorer: highScorerAllTime[String(r?.Team || r?.team || '').trim()] || 0,
        champion: false,
      }))
    } else {
      rows = historyData
        .filter(r => {
          const s = String(r?.Season || r?.season || '').trim()
          return s === season
        })
        .map(r => {
          const team = String(r?.Team || r?.team || '').trim()
          return {
            team,
            standing: parseNumber(r?.Standing || r?.standing || 0),
            w: parseNumber(tab === 'Overall' ? r?.W : tab === 'Reg Season' ? r?.RS_W : r?.PO_W),
            l: parseNumber(tab === 'Overall' ? r?.L : tab === 'Reg Season' ? r?.RS_L : r?.PO_L),
            pf: parseNumber(tab === 'Overall' ? r?.PF : tab === 'Reg Season' ? r?.RS_PF : r?.PO_PF),
            winPct: parseNumber(String(tab === 'Overall' ? r?.['W%'] : tab === 'Reg Season' ? r?.['RS_W%'] : r?.['PO_W%'] || '0').replace('%', '')),
            titles: String(r?.Champion || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            finals: String(r?.Reached_Final || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            poApps: String(r?.Made_Playoffs || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            prFirst: prFirstBySeason[`${team}|${season}`] || 0,
            highScorer: highScorerBySeason[`${team}|${season}`] || 0,
            champion: String(r?.Champion || '').trim().toUpperCase() === 'TRUE',
          }
        })
    }
    return rows
      .filter(r => r.team)
      .sort((a, b) => {
        const getVal = (row) => {
          if (sortCol === 'Pos') return row.standing || 999
          if (sortCol === 'W') return row.w
          if (sortCol === 'L') return row.l
          if (sortCol === 'W%') return row.winPct
          if (sortCol === 'PF') return row.pf
          if (sortCol === 'Titles') return row.titles
          if (sortCol === 'Finals') return row.finals
          if (sortCol === 'PO Apps') return row.poApps
          if (sortCol === 'PR #1') return row.prFirst
          if (sortCol === 'High Score') return row.highScorer
          return row.w
        }
        const diff = sortDir === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b)
        if (diff !== 0) return diff
        if (b.w !== a.w) return b.w - a.w
        if (a.l !== b.l) return a.l - b.l
        return b.pf - a.pf
      })
  }, [allTimeData, historyData, tab, season, sortCol, sortDir, prFirstAllTime, prFirstBySeason, highScorerAllTime, highScorerBySeason])


  // GAME LOG: GAME_FACTS_ALL stores mirrored matchup rows. Keep BOTH
  // performances. This page is intentionally a row-level view of the source
  // table so every team's Streak / Power Ranking / Max PF stays immediately
  // visible. Matchup grouping is used only to keep a selected side on the
  // left; it never deduplicates the two source rows.
  const gameFactTeams = useMemo(() => {
    return gamesData
      .map((g, sourceIndex) => {
        const season = String(g?.Season || '').trim()
        const week = String(g?.Week || '').trim()
        const team = String(g?.Team || '').trim()
        const opponent = String(g?.Opponent || '').trim()
        if (!season || !week || !team || !opponent) return null

        const pf = parseNumber(g?.PF)
        const pa = parseNumber(g?.PA)
        const stageRaw = String(g?.GameType || g?.GameStage || '').trim()
        const stageNorm = normalizeString(stageRaw)
        const stage =
          stageNorm === 'reg season' || stageNorm === 'regular season'
            ? 'Reg Season'
            : stageNorm === 'playoffs' || stageNorm === 'playoff'
              ? 'Playoffs'
              : stageRaw || 'Other'

        const computedResult = pf > pa ? 'W' : pf < pa ? 'L' : 'T'
        const rawResult = normalizeString(g?.Result || '')
        const result = rawResult === 'w' || rawResult === 'win' || rawResult === 'yes'
          ? 'W'
          : rawResult === 'l' || rawResult === 'loss' || rawResult === 'no'
            ? 'L'
            : rawResult === 't' || rawResult === 'tie' || rawResult === 'draw'
              ? 'T'
              : computedResult

        const maxPF = parseNumber(g?.MaxPF)
        return {
          id: `${season}|${week}|${normalizeString(team)}|${sourceIndex}`,
          season,
          week,
          team,
          opponent,
          pf,
          pa,
          margin: pf - pa,
          result,
          stage,
          streak: parseStreak(g?.['Streak_Total']),
          powerRanking: parseNumber(g?.['Power Ranking']),
          weeklyHighScorer: String(g?.['Weekly_High_Scorer'] || '').trim(),
          maxPF,
          startersAccuracy: maxPF > 0 ? (pf / maxPF) * 100 : 0,
          sourceIndex,
        }
      })
      .filter(Boolean)
  }, [gamesData])

  const gameFactMatchups = useMemo(() => {
    const grouped = new Map()

    gameFactTeams.forEach(row => {
      const teamsKey = [normalizeString(row.team), normalizeString(row.opponent)].sort().join('|')
      const key = `${row.season}|${row.week}|${teamsKey}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(row)
    })

    return Array.from(grouped.values()).map(rows => {
      const ordered = [...rows].sort((a, b) => a.sourceIndex - b.sourceIndex)
      const first = ordered[0]
      return {
        id: `${first.season}|${first.week}|${ordered.map(r => normalizeString(r.team)).sort().join('|')}`,
        season: first.season,
        week: first.week,
        team: first.team,
        opponent: first.opponent,
        pf: first.pf,
        pa: first.pa,
        margin: first.margin,
        result: first.result,
        stage: first.stage,
        streak: first.streak,
        powerRanking: first.powerRanking,
        weeklyHighScorer: first.weeklyHighScorer,
        maxPF: first.maxPF,
        startersAccuracy: first.startersAccuracy,
        participants: Array.from(new Map(ordered.flatMap(r => [r.team, r.opponent]).map(name => [normalizeString(name), name])).values()),
        sides: ordered,
      }
    })
  }, [gameFactTeams])

  const gameFactFilterOptions = useMemo(() => {
    const seasons = [...new Set(gameFactTeams.map(r => r.season))]
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a))
    const teams = [...new Set(gameFactTeams.map(r => r.team))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
    const opponents = [...new Set(gameFactTeams.map(r => r.opponent))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
    const stages = [...new Set(gameFactTeams.map(r => r.stage))]
      .filter(Boolean)
      .sort()
    const powerRankings = [...new Set(gameFactTeams.map(r => parseNumber(r.powerRanking)).filter(v => v > 0))]
      .sort((a, b) => a - b)
      .map(v => `#${v}`)
    return { seasons, teams, opponents, stages, powerRankings }
  }, [gameFactTeams])

  const filteredGameFacts = useMemo(() => {
    const matchesAny = (selected, candidates) => {
      if (!Array.isArray(selected) || selected.length === 0) return true
      const values = Array.isArray(candidates) ? candidates : [candidates]
      return values.some(value =>
        selected.some(item => normalizeString(item) === normalizeString(value))
      )
    }

    // GAME_FACTS_ALL stores every matchup twice: one row for each side.
    // IMPORTANT FILTER BEHAVIOR:
    // - With no side-specific filter active, keep BOTH mirrored rows.
    // - Team filters apply ONLY to the Team column. Therefore selecting
    //   OldBrady returns only the OldBrady row of each matchup, never the
    //   mirrored row where OldBrady is the Opponent.
    // - Opponent filters apply ONLY to the Opponent column.
    // - HS / Power Ranking / Result are also row-level filters. They naturally
    //   collapse to the relevant mirrored row when appropriate.
    // This keeps the complete database available for sorting, while making
    // side-specific filters behave like an actual spreadsheet column filter.
    const filtered = gameFactTeams.filter(row => {
      if (!matchesAny(gfSeason, row.season)) return false
      if (!matchesAny(gfStage, row.stage)) return false
      if (!gfIncludeDoubleWeeks && String(row.week).includes('-')) return false
      // 200+ filter: only single-week games.
      if (gfInclude200Plus && (String(row.week).includes('-') || row.pf < 200)) return false

      // Team = left side only.
      if (!matchesAny(gfTeam, row.team)) return false

      // Opponent = right side only.
      if (!matchesAny(gfOpponent, row.opponent)) return false

      if (gfPowerRanking.length > 0 && !matchesAny(gfPowerRanking, `#${row.powerRanking}`)) {
        return false
      }

      if (gfHS.length > 0) {
        const isHS = normalizeString(row.weeklyHighScorer) === normalizeString(row.team)
        if (!matchesAny(gfHS, isHS ? 'HS' : '')) return false
      }

      if (!matchesAny(gfResult, row.result)) return false

      return true
    })

    const getVal = row => {
      if (gfSortCol === 'Season') return Number(row.season) || 0
      if (gfSortCol === 'Week') return Number(String(row.week).split('-')[0]) || 0
      if (gfSortCol === 'PF') return row.pf
      if (gfSortCol === 'PA') return row.pa
      if (gfSortCol === 'Margin') return row.margin
      if (gfSortCol === 'Streak') return row.streak
      if (gfSortCol === 'Max PF') return row.maxPF
      if (gfSortCol === 'Starters Accuracy') return row.startersAccuracy
      return row.pf
    }

    filtered.sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      const diff = gfSortDir === 'asc' ? av - bv : bv - av
      if (diff !== 0) return diff

      const seasonDiff = Number(b.season) - Number(a.season)
      if (seasonDiff !== 0) return seasonDiff
      const weekDiff = Number(String(b.week).split('-')[0]) - Number(String(a.week).split('-')[0])
      if (weekDiff !== 0) return weekDiff
      return a.sourceIndex - b.sourceIndex
    })

    return filtered
  }, [
    gameFactTeams,
    gfSeason,
    gfTeam,
    gfOpponent,
    gfStage,
    gfResult,
    gfPowerRanking,
    gfHS,
    gfIncludeDoubleWeeks,
    gfInclude200Plus,
    gfSortCol,
    gfSortDir,
  ])

  const GAME_FACT_PAGE_SIZE = 15
  const gameFactTotalPages = Math.max(1, Math.ceil(filteredGameFacts.length / GAME_FACT_PAGE_SIZE))
  const pagedGameFacts = filteredGameFacts.slice(
    gfPage * GAME_FACT_PAGE_SIZE,
    gfPage * GAME_FACT_PAGE_SIZE + GAME_FACT_PAGE_SIZE
  )

  const handleGameFactSort = (col) => {
    if (!['Season', 'Week', 'PF', 'PA', 'Margin', 'Streak', 'Max PF', 'Starters Accuracy'].includes(col)) return
    if (gfSortCol === col) setGfSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else {
      setGfSortCol(col)
      setGfSortDir('desc')
    }
  }

  const getGameFactMatchupHref = (row) => {
    if (!row) return '/matchups'

    const season = String(row.season || '').trim()
    const week = String(row.week || '').trim()
    const team = String(row.team || '').trim()
    const opponent = String(row.opponent || '').trim()

    // Always send Matchups the FIRST source row of this matchup.
    // GAME_FACTS_ALL contains mirrored rows; the earliest sourceIndex is the
    // canonical row that Matchups should receive so it opens the same matchup
    // already selected regardless of which side was clicked here.
    const firstRow = gameFactTeams
      .filter(candidate => {
        if (candidate.season !== season || candidate.week !== week) return false
        const samePair =
          (normalizeString(candidate.team) === normalizeString(team) &&
            normalizeString(candidate.opponent) === normalizeString(opponent)) ||
          (normalizeString(candidate.team) === normalizeString(opponent) &&
            normalizeString(candidate.opponent) === normalizeString(team))
        return samePair
      })
      .sort((a, b) => a.sourceIndex - b.sourceIndex)[0] || row

    return `/matchups?season=${encodeURIComponent(firstRow.season)}&week=${encodeURIComponent(firstRow.week)}&team=${encodeURIComponent(firstRow.team)}&opp=${encodeURIComponent(firstRow.opponent)}`
  }

  const handleGameFactClick = (row) => {
    router.push(getGameFactMatchupHref(row))
  }

  const chartData = useMemo(() => {
    if (!chartTeam) return []
    const stat = CHART_STATS.find(s => s.label === chartStat)
    const key = stat?.keys?.[chartScope] ?? 'RS_W'

    // Build a map of season -> reg season game count to detect incomplete seasons
    const gamesPerSeason = {}
    historyData.forEach(r => {
      if (normalizeString(r?.Team || r?.team || '') !== normalizeString(chartTeam)) return
      const s = String(r?.Season || '').trim()
      if (!s) return
      const hasStanding = parseNumber(r?.Standing) > 0
      const gp = parseNumber(r?.RS_GP || r?.GP || 0)
      gamesPerSeason[s] = { hasStanding, gp }
    })

    return historyData
      .filter(r => {
        if (normalizeString(r?.Team || r?.team || '') !== normalizeString(chartTeam)) return false
        const s = String(r?.Season || '').trim()
        const info = gamesPerSeason[s]
        if (!info) return false
        // Include if: season is complete (has Standing) OR has at least 8 games played
        return info.hasStanding || info.gp >= 8
      })
      .map(r => ({
        season: String(r?.Season || r?.season || '').trim(),
        value: parseNumber(String(r?.[key] || '0').replace('%', '')),
        champion: String(r?.Champion || '').trim().toUpperCase() === 'TRUE',
        incomplete: !gamesPerSeason[String(r?.Season || '').trim()]?.hasStanding,
      }))
      .sort((a, b) => Number(a.season) - Number(b.season))
  }, [historyData, chartTeam, chartStat, chartScope])

  const chartStats = useMemo(() => {
    if (!chartData.length) return null

    // For best/worst/avg: only use completed seasons
    const completedData = chartData.filter(d => !d.incomplete)
    const vals = completedData.length > 0
      ? completedData.map(d => d.value)
      : chartData.map(d => d.value)

    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const isLoss = chartStat === 'Losses'

    const bestVal = isLoss ? Math.min(...vals) : Math.max(...vals)
    const worstVal = isLoss ? Math.max(...vals) : Math.min(...vals)

    const sourceData = completedData.length > 0 ? completedData : chartData
    const bestSeasons = sourceData.filter(d => d.value === bestVal).map(d => d.season)
    const worstSeasons = sourceData.filter(d => d.value === worstVal).map(d => d.season)
    const championSeasons = chartData.filter(d => d.champion).map(d => d.season)
    const titles = championSeasons.length

    return { bestVal, worstVal, bestSeasons, worstSeasons, avg: Math.round(avg * 10) / 10, titles, championSeasons }
  }, [chartData, chartStat])

  const paged = tableData.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const totalPages = Math.ceil(tableData.length / PER_PAGE)

  useEffect(() => { setPage(0) }, [tab, season, sortCol, sortDir])

  useEffect(() => {
    setGfPage(0)
  }, [gfSeason, gfTeam, gfOpponent, gfStage, gfResult, gfPowerRanking, gfHS, gfSortCol, gfSortDir])

  const tabCols = {
    'Overall': ['W', 'L', 'W%', 'PF', 'PO Apps', 'Finals', 'Titles', 'PR #1', 'High Score'],
    'Reg Season': ['W', 'L', 'W%', 'PF'],
    'Playoffs': ['W', 'L', 'PF'],
  }

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCol(col)
      setSortDir(col === 'Pos' ? 'asc' : 'desc')
    }
  }

  useEffect(() => { setGfPage(0) }, [gfSeason, gfTeam, gfOpponent, gfStage, gfResult, gfPowerRanking, gfHS, gfIncludeDoubleWeeks, gfInclude200Plus, gfSortCol, gfSortDir])

  const getCol = (row, col) => {
    if (col === 'Pos') return row.standing ? (['1st', '2nd', '3rd'][row.standing - 1] ?? `${row.standing}th`) : '—'
    if (col === 'W') return row.w
    if (col === 'L') return row.l
    if (col === 'W%') return `${row.winPct.toFixed(1)}%`
    if (col === 'PF') return Math.round(row.pf).toLocaleString()
    if (col === 'Titles') return row.titles
    if (col === 'Finals') return row.finals
    if (col === 'PO Apps') return row.poApps
    if (col === 'PR #1') return row.prFirst
    if (col === 'High Score') return row.highScorer
    return '—'
  }


  // ── Painel (aba Overview) ───────────────────────────────────────────
  const overview = useMemo(() => {
    const current = new Set(allTimeData.map(r => normalizeString(r?.Team || r?.team)))
    const singleWeek = g => !String(g?.Week || '').includes('-')
    const rows = gamesData.filter(g => parseNumber(g?.PF) > 0 && singleWeek(g))

    // Pontos por jogo e distribuição de placares (só semanas simples)
    const perTeam = {}
    const bins = {}
    rows.forEach(g => {
      const team = String(g?.Team || '').trim()
      const pf = parseNumber(g?.PF)
      if (current.has(normalizeString(team))) {
        perTeam[team] = perTeam[team] || { pts: 0, games: 0 }
        perTeam[team].pts += pf
        perTeam[team].games += 1
      }
      const bin = Math.floor(pf / 20) * 20
      bins[bin] = (bins[bin] || 0) + 1
    })
    const ppg = Object.entries(perTeam).map(([team, v]) => ({ team, value: v.pts / v.games })).sort((a, b) => b.value - a.value)
    const distribution = Object.entries(bins).map(([bin, count]) => ({ label: `${bin}`, value: count })).sort((a, b) => Number(a.label) - Number(b.label))

    // Pontuação média e máxima da liga por temporada
    const bySeason = {}
    rows.forEach(g => {
      const s = String(g?.Season || '').trim()
      bySeason[s] = bySeason[s] || { pts: 0, games: 0, max: 0 }
      bySeason[s].pts += parseNumber(g?.PF)
      bySeason[s].games += 1
      bySeason[s].max = Math.max(bySeason[s].max, parseNumber(g?.PF))
    })
    const seasonScoring = Object.entries(bySeason).sort((a, b) => Number(a[0]) - Number(b[0])).map(([s, v]) => ({ label: `'${s.slice(2)}`, value: v.pts / v.games, max: v.max }))

    const winPct = allTimeData.map(r => ({ team: String(r?.Team || r?.team || '').trim(), value: parseNumber(String(r?.['W%'] || '0').replace('%', '')) / (String(r?.['W%'] || '').includes('%') ? 1 : 1) }))
      .filter(r => r.team).sort((a, b) => b.value - a.value)
    const titles = allTimeData.map(r => ({ team: String(r?.Team || r?.team || '').trim(), value: parseNumber(r?.Titles || 0) })).filter(r => r.team && r.value > 0).sort((a, b) => b.value - a.value)
    const playoffApps = allTimeData.map(r => ({ team: String(r?.Team || r?.team || '').trim(), value: parseNumber(r?.['Playoff Apps'] || 0) })).filter(r => r.team).sort((a, b) => b.value - a.value)

    const allScores = rows.map(g => parseNumber(g?.PF))
    const leagueAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0
    const games = new Set(gamesData.map(g => `${g?.Season}|${g?.Week}|${[g?.Team, g?.Opponent].sort().join('|')}`)).size
    return { ppg, distribution, seasonScoring, winPct, titles, playoffApps, leagueAvg, maxScore: Math.max(0, ...allScores), games, over200: allScores.filter(v => v >= 200).length }
  }, [allTimeData, gamesData])

  const overviewTab = (
    <>
      <StatGrid className="mb-2 grid-cols-2 overflow-hidden rounded-xl sm:grid-cols-4">
        <StatTile label="Matchups played" value={overview.games.toLocaleString()} sub="All stages" />
        <StatTile label="League average" value={overview.leagueAvg.toFixed(1)} sub="Points per team per week" />
        <StatTile label="Highest score ever" value={overview.maxScore.toFixed(2)} sub="Single week" valueClass="text-[#1E8E3E]" />
        <StatTile label="200+ games" value={overview.over200} sub="Single weeks" valueClass="text-[#B8860B]" />
      </StatGrid>

      <div className="grid gap-2 lg:grid-cols-2">
        <CardShell title="Scoring by season" subtitle="Average points per team per week · red line = highest score" className="lg:col-span-2">
          <div className="px-2 pb-2 pt-3 lg:px-3">
            <ColumnChart data={overview.seasonScoring} width={1200} height={220} format={v => v.toFixed(0)} line={{ key: 'max' }} accentIndex={overview.seasonScoring.reduce((best, d, i, arr) => d.value > arr[best].value ? i : best, 0)} />
          </div>
        </CardShell>

        <CardShell title="Points per game" subtitle="All-time · single weeks">
          <HBarChart rows={overview.ppg} format={v => v.toFixed(1)} />
        </CardShell>

        <CardShell title="Win % all-time" subtitle="Green above .500 · red below">
          <HBarChart rows={overview.winPct} format={v => `${v.toFixed(1)}%`} center={50} />
        </CardShell>

        <CardShell title="Score distribution" subtitle="How many weekly scores fall in each 20-point range">
          <div className="px-2 pb-2 pt-3 lg:px-3">
            <ColumnChart data={overview.distribution} height={200} accentIndex={overview.distribution.reduce((best, d, i, arr) => d.value > arr[best].value ? i : best, 0)} />
          </div>
        </CardShell>

        <CardShell title="Playoff appearances" subtitle={`All-time${overview.titles.length ? ` · ${overview.titles.reduce((a, t) => a + t.value, 0)} titles handed out` : ''}`}>
          <HBarChart rows={overview.playoffApps} />
        </CardShell>
      </div>
    </>
  )

  const multi = (state, setter, opts, label, displayOption) => (
    <MultiFilterPill
      value={state.length ? state : ['All']}
      onChange={v => setter(v.includes('All') ? [] : v)}
      options={['All', ...opts]}
      label={label}
      displayOption={displayOption}
    />
  )
  const gfHasFilters = gfSeason.length || gfTeam.length || gfOpponent.length || gfStage.length || gfResult.length || gfPowerRanking.length || gfHS.length || !gfIncludeDoubleWeeks || gfInclude200Plus
  const clearGameFilters = () => { setGfSeason([]); setGfTeam([]); setGfOpponent([]); setGfStage([]); setGfResult([]); setGfPowerRanking([]); setGfHS([]); setGfIncludeDoubleWeeks(true); setGfInclude200Plus(false) }

  const th = 'whitespace-nowrap px-3 py-2 text-[11px] font-medium text-[#6B7280] lg:px-4'
  const seasonsLabel = list => list.map(s => `'${String(s).slice(2)}`).join(', ')

  return (
    <PageShell headerProps={{ onSummaryOpen: () => setDrawerOpen(true) }}>
      <PageBar title="Stats">
        {[['overview', 'Overview'], ['standings', 'Standings'], ['evolution', 'Team Evolution'], ['games', 'Game Log']].map(([key, label]) => (
          <BarTab key={key} active={section === key} onClick={() => setSection(key)}>{label}</BarTab>
        ))}
      </PageBar>

      {section === 'overview' && (loading ? <LoadingState rows={8} /> : overviewTab)}

      {section === 'standings' && (
        <CardShell
          title="Standings"
          subtitle={season === 'All-Time' ? 'All-time · click a team to open its page' : `Season ${season} · click a team to open its page`}
          withMenus
        >
          <FilterBar>
            <FilterPill value={season} onChange={setSeason} options={seasons} label="Season" neutral />
            {TABS.map(t => <ToggleChip key={t} active={tab === t} onClick={() => setTab(t)}>{t}</ToggleChip>)}
          </FilterBar>
          {loading ? <LoadingState /> : (
            <div className="overflow-hidden rounded-b-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#EEF0F2]">
                      <th className={`${th} sticky left-0 z-10 w-10 bg-white text-left`}>
                        {season !== 'All-Time'
                          ? <SortHeader label="#" active={sortCol === 'Pos'} dir={sortDir} onClick={() => handleSort('Pos')} />
                          : '#'}
                      </th>
                      <th className={`${th} sticky left-10 z-10 bg-white text-left`}>Team</th>
                      {tabCols[tab].map(col => (
                        <th key={col} className={`${th} text-right`}>
                          <SortHeader label={col} active={sortCol === col} dir={sortDir} onClick={() => handleSort(col)} align="right" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, i) => {
                      const rank = page * PER_PAGE + i + 1
                      const pos = season !== 'All-Time' && row.standing ? row.standing : rank
                      return (
                        <tr key={row.team} onClick={() => router.push(`/teams?team=${encodeURIComponent(row.team)}`)} className="group cursor-pointer border-b border-[#F1F2F4] bg-white transition-colors hover:bg-[#F7F8FA]">
                          <td className={`sticky left-0 z-10 bg-inherit px-3 py-2.5 text-[13px] font-semibold tabular-nums lg:px-4 ${pos === 1 ? 'text-[#B8860B]' : 'text-[#111]'}`}>{pos}</td>
                          <td className="sticky left-10 z-10 bg-inherit px-3 py-2.5 lg:px-4">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <TeamLogo name={row.team} size={24} />
                              <span className="max-w-[110px] truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D] sm:max-w-[220px]">{row.team}</span>
                              {row.champion && <span className="flex-shrink-0 text-[12px]">🏆</span>}
                            </div>
                          </td>
                          {tabCols[tab].map(col => (
                            <td key={col} className={`whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums lg:px-4 ${sortCol === col ? 'font-semibold text-[#111]' : 'text-[#3F4757]'}`}>
                              {getCol(row, col)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <Pager page={page} totalPages={totalPages} total={tableData.length} pageSize={PER_PAGE} onPrev={() => setPage(p => Math.max(0, p - 1))} onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))} />
              )}
            </div>
          )}
        </CardShell>
      )}

      {section === 'evolution' && (
        <CardShell title="Team evolution" subtitle={`${chartTeam} · ${chartStat.toLowerCase()} per season (${chartScope.toLowerCase()})`} withMenus>
          <FilterBar>
            <FilterPill value={chartTeam} onChange={setChartTeam} options={allTeams} label="Team" neutral />
            <FilterPill value={chartStat} onChange={setChartStat} options={CHART_STATS.map(s => s.label)} label="Stat" neutral />
            <FilterPill value={chartScope} onChange={setChartScope} options={['Reg Season', 'Playoffs', 'Total']} label="Scope" neutral />
          </FilterBar>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-3 pt-3 text-[12px] text-[#6B7280]">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#B8860B]" /> Championship</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1E8E3E]" /> Best season</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#D01F2D]" /> Worst season</span>
          </div>
          <div className="overflow-x-auto px-3 pb-2 pt-4 sm:px-6">
            <div className="mx-auto max-w-[760px]" style={{ minWidth: '360px' }}>
              <WinChart data={chartData} chartStats={chartStats} />
            </div>
          </div>
          {chartStats && (
            <StatGrid className="grid-cols-2 border-t border-[#EEF0F2] md:grid-cols-4">
              <StatTile label="Best season" value={chartStats.bestVal} sub={seasonsLabel(chartStats.bestSeasons)} valueClass="text-[#1E8E3E]" />
              <StatTile label="Worst season" value={chartStats.worstVal} sub={seasonsLabel(chartStats.worstSeasons)} valueClass="text-[#D01F2D]" />
              <StatTile label="Season average" value={chartStats.avg} sub="per season" />
              <StatTile label="Championships" value={chartStats.titles} sub={seasonsLabel(chartStats.championSeasons) || '—'} valueClass={chartStats.titles ? 'text-[#B8860B]' : 'text-[#111]'} />
            </StatGrid>
          )}
        </CardShell>
      )}

      {section === 'games' && (
        <CardShell
          title="Game log"
          subtitle={`${filteredGameFacts.length.toLocaleString()} team performances · ${gameFactMatchups.length.toLocaleString()} matchups · 1 row = 1 team`}
          action={gfHasFilters ? <button type="button" onClick={clearGameFilters} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">Clear filters</button> : null}
          withMenus
        >
          <FilterBar>
            {multi(gfSeason, setGfSeason, gameFactFilterOptions.seasons, 'Season')}
            {multi(gfTeam, setGfTeam, gameFactFilterOptions.teams, 'Team')}
            {multi(gfOpponent, setGfOpponent, gameFactFilterOptions.opponents, 'Opponent')}
            {multi(gfStage, setGfStage, gameFactFilterOptions.stages, 'Stage')}
            {multi(gfResult, setGfResult, ['W', 'L', 'T'], 'Result')}
            {multi(gfPowerRanking, setGfPowerRanking, gameFactFilterOptions.powerRankings, 'Power ranking')}
            <ToggleChip active={gfHS.includes('HS')} onClick={() => setGfHS(gfHS.includes('HS') ? [] : ['HS'])}>Week high scorer</ToggleChip>
            <ToggleChip active={gfInclude200Plus} onClick={() => setGfInclude200Plus(v => !v)}>200+ pts</ToggleChip>
            <ToggleChip active={!gfIncludeDoubleWeeks} onClick={() => setGfIncludeDoubleWeeks(v => !v)}>Hide double weeks</ToggleChip>
          </FilterBar>
          {loading ? <LoadingState /> : (
            <div className="overflow-hidden rounded-b-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-[#EEF0F2]">
                      {['Season', 'Week', 'Team', 'Opponent', 'PF', 'PA', 'Margin', 'Result', 'Stage', 'Streak', 'Power Ranking', 'HS', 'Max PF', 'Starters Accuracy'].map(col => {
                        const sortable = ['Season', 'Week', 'PF', 'PA', 'Margin', 'Streak', 'Max PF', 'Starters Accuracy'].includes(col)
                        const right = ['PF', 'PA', 'Margin', 'Streak', 'Power Ranking', 'Max PF', 'Starters Accuracy'].includes(col)
                        const label = { 'Power Ranking': 'PR', 'Starters Accuracy': 'Accuracy' }[col] || col
                        return (
                          <th key={col} className={`${th} ${right ? 'text-right' : 'text-left'}`}>
                            {sortable ? <SortHeader label={label} active={gfSortCol === col} dir={gfSortDir} onClick={() => handleGameFactSort(col)} align={right ? 'right' : 'left'} /> : label}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGameFacts.map(row => {
                      const isHS = row.weeklyHighScorer && normalizeString(row.weeklyHighScorer) === normalizeString(row.team)
                      return (
                        <tr key={row.id} onClick={() => handleGameFactClick(row)} title="Open matchup" className="cursor-pointer border-b border-[#F1F2F4] transition-colors hover:bg-[#F7F8FA]">
                          <td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-semibold text-[#111] lg:px-4">{row.season}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[13px] tabular-nums text-[#6B7280] lg:px-4">{row.week}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 lg:px-4"><div className="flex items-center gap-2 text-[13px] font-medium text-[#111]"><TeamLogo name={row.team} size={20} />{row.team}</div></td>
                          <td className="whitespace-nowrap px-3 py-2.5 lg:px-4"><div className="flex items-center gap-2 text-[13px] text-[#3F4757]"><TeamLogo name={row.opponent} size={20} />{row.opponent}</div></td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#111] lg:px-4">{row.pf.toFixed(2)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums text-[#6B7280] lg:px-4">{row.pa.toFixed(2)}</td>
                          <td className={`whitespace-nowrap px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums lg:px-4 ${row.margin >= 0 ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>{row.margin > 0 ? '+' : ''}{row.margin.toFixed(2)}</td>
                          <td className="px-3 py-2.5 lg:px-4"><ResultBadge result={row.result} /></td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[#6B7280] lg:px-4">{row.stage}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right lg:px-4">{row.streak ? <StreakBadge streak={row.streak > 0 ? `W${row.streak}` : `L${Math.abs(row.streak)}`} /> : <span className="text-[12px] text-[#9CA3AF]">—</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums text-[#111] lg:px-4">{row.powerRanking > 0 ? `#${row.powerRanking}` : '—'}</td>
                          <td className="px-3 py-2.5 lg:px-4">{isHS ? <Tag tone="gold">HS</Tag> : <span className="text-[12px] text-[#C4C7CC]">—</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums text-[#3F4757] lg:px-4">{row.maxPF > 0 ? row.maxPF.toFixed(2) : '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right text-[13px] tabular-nums text-[#111] lg:px-4">{row.maxPF > 0 ? `${row.startersAccuracy.toFixed(1)}%` : '—'}</td>
                        </tr>
                      )
                    })}
                    {pagedGameFacts.length === 0 && <tr><td colSpan="14" className="py-16 text-center text-[13px] text-[#6B7280]">No games found</td></tr>}
                  </tbody>
                </table>
              </div>
              {gameFactTotalPages > 1 && (
                <Pager page={gfPage} totalPages={gameFactTotalPages} total={filteredGameFacts.length} pageSize={GAME_FACT_PAGE_SIZE} onPrev={() => setGfPage(p => Math.max(0, p - 1))} onNext={() => setGfPage(p => Math.min(gameFactTotalPages - 1, p + 1))} />
              )}
            </div>
          )}
        </CardShell>
      )}

      <SummaryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} allSeasons={allSeasons} />
    </PageShell>
  )
}
