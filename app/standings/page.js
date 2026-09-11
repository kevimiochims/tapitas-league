'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Medal, Activity, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  if (String(value).includes(',')) console.log('parseNumber:', value, '->', cleaned, '->', parsed)
  return Number.isNaN(parsed) ? 0 : parsed
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
    console.log('Fetching:', url)
    const res = await fetch(url)
    console.log('Status:', res.status, url)
    if (!res.ok) return []
    const json = await res.json()
    console.log('Resultado:', Array.isArray(json) ? json.length : typeof json, url)
    return Array.isArray(json) ? json : []
  } catch (err) {
    console.error('Erro:', err)
    return []
  }
}


function Select({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(p => !p)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 border-2 px-4 py-2.5 text-sm font-black transition-all ${
          disabled
            ? 'cursor-not-allowed border-white/20 bg-white/5 text-white/40'
            : open
              ? 'border-[#F5C518] bg-white text-[#16274F]'
              : 'border-white/30 bg-white/10 text-white hover:bg-white/15'
        }`}
      >
        <span className={value ? 'truncate text-white' : 'text-white/50'}>
          {value || placeholder}
        </span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[4px_4px_0_#16274F]">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-3 border-b border-[#E5E3DC] px-4 py-2.5 text-left text-sm font-black transition-colors last:border-0 hover:bg-[#F7F6F2] ${
                  opt === value ? 'text-[#D01F2D]' : 'text-[#374151]'
                }`}
              >
                {opt === value && <span className="h-2 w-2 shrink-0 bg-[#D01F2D]" />}
                <span className={opt === value ? '' : 'ml-[14px]'}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
      <polyline points={points} fill="none" stroke="#16274F" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <text x={xScale(i)} y={H - padB + 14} textAnchor="middle" fontSize={fsAxis} fill="#4B5563">
            {`'${String(d.season).slice(2)}`}
          </text>
          <text
            x={xScale(i)}
            y={yScale(d.value) - 10}
            textAnchor="middle"
            fontSize={fsValue}
            fill={
              d.champion
                ? "#f59e0b"
                : chartStats?.bestSeasons?.includes(d.season)
                  ? '#1E8E3E'
                  : chartStats?.worstSeasons?.includes(d.season)
                    ? '#D01F2D'
                    : '#9CA3AF'
            }
          >
            {d.value}
          </text>
          <circle cx={xScale(i)} cy={yScale(d.value)} r="2" fill="#16274F" />
        </g>
      ))}
    </svg>
  )
}

const CHART_STATS = [
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'ties', label: 'Ties' },
  { key: 'pf', label: 'PF' },
  { key: 'pa', label: 'PA' },
  { key: 'avg_pf', label: 'Avg PPW' },
]

export default function StandingsPage() {
  const { drawerOpen, setDrawerOpen } = useDrawer()
  const [allData, setAllData] = useState([])
  const [allSeasons, setAllSeasons] = useState([])
  const [season, setSeason] = useState('All-Time')
  const [tab, setTab] = useState('Wins-Losses')
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState('Pos')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [chartTeam, setChartTeam] = useState('')
  const [chartStat, setChartStat] = useState('Wins')
  const [chartScope, setChartScope] = useState('Reg Season')

  const PER_PAGE = 10

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL?offset=0`)
      setAllData(res)
      const seasons = [...new Set(res.map(r => r.Season))].sort((a, b) => b - a)
      setAllSeasons(seasons)
      setLoading(false)
    }
    load()
  }, [])

  const tabCols = {
    'Wins-Losses': ['W', 'L', 'T', 'Win %'],
    'Points': ['PF', 'PA', 'Margin', 'Avg PPW'],
  }

  const allTeams = useMemo(() => {
    return [...new Set(allData.map(r => r.Team))].sort()
  }, [allData])

  const getCol = (row, col) => {
    const colMap = {
      'W': parseNumber(row.wins),
      'L': parseNumber(row.losses),
      'T': parseNumber(row.ties),
      'Win %': row.winPct ? `${(row.winPct * 100).toFixed(1)}%` : '0%',
      'PF': parseNumber(row.pf).toFixed(1),
      'PA': parseNumber(row.pa).toFixed(1),
      'Margin': parseNumber(row.margin).toFixed(1),
      'Avg PPW': parseNumber(row.avg_pf).toFixed(2),
    }
    return colMap[col] || ''
  }

  const tableData = useMemo(() => {
    const teams = {}
    const allTeamsList = [...new Set(allData.map(r => r.Team))]

    allTeamsList.forEach(team => {
      const rows = season === 'All-Time' ? allData.filter(r => r.Team === team) : allData.filter(r => r.Team === team && r.Season == season)
      if (rows.length === 0) {
        teams[team] = { team, standing: null, wins: 0, losses: 0, ties: 0, winPct: 0, pf: 0, pa: 0, margin: 0, avg_pf: 0, champion: false }
        return
      }

      const uniqueYears = [...new Set(rows.map(r => r.Season))]
      const wins = uniqueYears.reduce((s, y) => s + parseNumber(rows.find(r => r.Season == y)?.Wins ?? 0), 0)
      const losses = uniqueYears.reduce((s, y) => s + parseNumber(rows.find(r => r.Season == y)?.Losses ?? 0), 0)
      const ties = uniqueYears.reduce((s, y) => s + parseNumber(rows.find(r => r.Season == y)?.Ties ?? 0), 0)
      const pf = uniqueYears.reduce((s, y) => s + parseNumber(rows.find(r => r.Season == y)?.PF ?? 0), 0)
      const pa = uniqueYears.reduce((s, y) => s + parseNumber(rows.find(r => r.Season == y)?.PA ?? 0), 0)
      const margin = pf - pa

      const allGames = uniqueYears.reduce((s, y) => s + rows.filter(r => r.Season == y).length, 0)
      const avg_pf = allGames > 0 ? pf / allGames : 0

      const winPct = (wins + ties * 0.5) / (wins + losses + ties) || 0

      teams[team] = {
        team,
        standing: season !== 'All-Time' ? rows[0]?.Pos : null,
        wins,
        losses,
        ties,
        winPct,
        pf,
        pa,
        margin,
        avg_pf,
        champion: season === 'All-Time' ? allTeamsList.some(t => allData.filter(r => r.Team === t && r.Season == season).some(r => r.Champion)) : rows.some(r => r.Champion),
      }
    })

    const teamsArray = Object.values(teams).filter(t => t.wins + t.losses + t.ties > 0)
    teamsArray.sort((a, b) => {
      const aVal = sortCol === 'Pos' ? parseNumber(a.standing || 999) : getCol(a, sortCol)
      const bVal = sortCol === 'Pos' ? parseNumber(b.standing || 999) : getCol(b, sortCol)

      const aNum = parseNumber(aVal)
      const bNum = parseNumber(bVal)

      if (aNum === bNum) return 0
      if (sortCol === 'Pos' || ['W', 'L', 'T'].includes(sortCol)) {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum
      }
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })

    return teamsArray
  }, [allData, season, sortCol, sortDir])

  const totalPages = Math.ceil(tableData.length / PER_PAGE)
  const paged = tableData.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'Pos' ? 'asc' : 'desc')
    }
    setPage(0)
  }

  const chartData = useMemo(() => {
    if (!chartTeam) return []
    const teamData = allData.filter(r => r.Team === chartTeam)
    const seasons = [...new Set(teamData.map(r => r.Season))].sort()

    return seasons.map(s => {
      const rows = teamData.filter(r => r.Season === s)
      let value = 0

      if (chartScope === 'Reg Season') {
        const regRows = rows.filter(r => r.GameStage === 'Reg Season')
        if (chartStat === 'Wins') value = regRows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[0], 0)
        if (chartStat === 'Losses') value = regRows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[1], 0)
        if (chartStat === 'Ties') value = regRows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[2] || 0, 0)
        if (chartStat === 'PF') value = regRows.reduce((sum, r) => sum + parseNumber(r.PF), 0)
        if (chartStat === 'PA') value = regRows.reduce((sum, r) => sum + parseNumber(r.PA), 0)
        if (chartStat === 'Avg PPW') value = regRows.length > 0 ? regRows.reduce((sum, r) => sum + parseNumber(r.PF), 0) / regRows.length : 0
      } else if (chartScope === 'Playoffs') {
        const playRows = rows.filter(r => r.GameStage?.includes('Playoff'))
        if (chartStat === 'Wins') value = playRows.reduce((sum, r) => sum + (r.Result === 'W' ? 1 : 0), 0)
        if (chartStat === 'Losses') value = playRows.reduce((sum, r) => sum + (r.Result === 'L' ? 1 : 0), 0)
        if (chartStat === 'PF') value = playRows.reduce((sum, r) => sum + parseNumber(r.PF), 0)
        if (chartStat === 'PA') value = playRows.reduce((sum, r) => sum + parseNumber(r.PA), 0)
        if (chartStat === 'Avg PPW') value = playRows.length > 0 ? playRows.reduce((sum, r) => sum + parseNumber(r.PF), 0) / playRows.length : 0
      } else {
        if (chartStat === 'Wins') value = rows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[0], 0)
        if (chartStat === 'Losses') value = rows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[1], 0)
        if (chartStat === 'Ties') value = rows.reduce((sum, r) => sum + parseNumber(r.Result).split('-')[2] || 0, 0)
        if (chartStat === 'PF') value = rows.reduce((sum, r) => sum + parseNumber(r.PF), 0)
        if (chartStat === 'PA') value = rows.reduce((sum, r) => sum + parseNumber(r.PA), 0)
        if (chartStat === 'Avg PPW') value = rows.length > 0 ? rows.reduce((sum, r) => sum + parseNumber(r.PF), 0) / rows.length : 0
      }

      return { season: s, value, champion: rows.some(r => r.Champion) }
    })
  }, [chartTeam, chartStat, chartScope, allData])

  const chartStats = useMemo(() => {
    if (!chartTeam) return null
    const teamData = allData.filter(r => r.Team === chartTeam)
    const seasons = [...new Set(teamData.map(r => r.Season))].sort()
    const values = {}

    seasons.forEach(s => {
      const rows = teamData.filter(r => r.Season === s)
      const key = chartStat

      if (key === 'Wins') values[s] = rows.reduce((sum, r) => sum + parseNumber(r.Result?.split('-')[0] || 0), 0)
      if (key === 'Losses') values[s] = rows.reduce((sum, r) => sum + parseNumber(r.Result?.split('-')[1] || 0), 0)
      if (key === 'Ties') values[s] = rows.reduce((sum, r) => sum + parseNumber(r.Result?.split('-')[2] || 0), 0)
      if (key === 'PF') values[s] = rows.reduce((sum, r) => sum + parseNumber(r.PF), 0)
      if (key === 'PA') values[s] = rows.reduce((sum, r) => sum + parseNumber(r.PA), 0)
      if (key === 'Avg PPW') values[s] = rows.length > 0 ? rows.reduce((sum, r) => sum + parseNumber(r.PF), 0) / rows.length : 0
    })

    const vals = Object.values(values)
    const bestVal = Math.max(...vals)
    const worstVal = Math.min(...vals)
    const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0

    const bestSeasons = Object.entries(values).filter(([, v]) => v === bestVal).map(([s]) => s)
    const worstSeasons = Object.entries(values).filter(([, v]) => v === worstVal).map(([s]) => s)
    const titles = teamData.filter(r => r.Champion).reduce((s, r) => (s.includes(r.Season) ? s : [...s, r.Season]), [])

    return { bestVal: bestVal.toFixed(2), worstVal: worstVal.toFixed(2), avg, bestSeasons, worstSeasons, championSeasons: titles, titles: titles.length }
  }, [chartTeam, chartStat, allData])

  return (
    <main className="min-h-screen bg-[#F7F6F2]">
      <Header />

      <section className="mx-auto max-w-[1680px] px-3 py-8 sm:px-5 md:py-10 md:px-6">
        {/* STANDINGS */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[5px_5px_0_#16274F]"
        >
          {/* Header seção */}
          <div className="flex flex-col gap-4 border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-5 text-white sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border-2 border-white/30 bg-white/10">
                <Medal className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.24em] text-[#F5C518]">Standings</div>
                <div className="mt-1 text-lg font-bold text-white/80">League rankings & statistics</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                value={season}
                onChange={s => { setSeason(s); setPage(0) }}
                options={['All-Time', ...allSeasons]}
                placeholder="Select Season..."
              />
              <Select
                value={tab}
                onChange={t => { setTab(t); setPage(0) }}
                options={Object.keys(tabCols)}
                placeholder="Select Stats..."
              />
              <div className="flex gap-2 sm:col-span-3">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white/60 flex items-center">Sort by:</span>
              </div>
            </div>
          </div>

          {/* Mobile sort buttons */}
          <div className="flex gap-2 overflow-x-auto border-b-2 border-[#E4E2DB] bg-[#F7F6F2] px-5 py-3 sm:px-7 md:hidden">
            {season !== 'All-Time' && (
              <button
                onClick={() => { handleSort('Pos'); setPage(0) }}
                className={`shrink-0 border-2 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition-all ${
                  sortCol === 'Pos'
                    ? 'border-[#D01F2D] bg-[#D01F2D] text-white'
                    : 'border-[#C4C0B8] bg-white text-[#6B7280] hover:border-[#16274F]'
                }`}
              >
                Rank {sortCol === 'Pos' && (sortDir === 'desc' ? '↓' : '↑')}
              </button>
            )}
            {tabCols[tab].map(col => (
              <button
                key={col}
                onClick={() => { handleSort(col); setPage(0) }}
                className={`shrink-0 border-2 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition-all ${
                  sortCol === col
                    ? 'border-[#D01F2D] bg-[#D01F2D] text-white'
                    : 'border-[#C4C0B8] bg-white text-[#6B7280] hover:border-[#16274F]'
                }`}
              >
                {col} {sortCol === col && (sortDir === 'desc' ? '↓' : '↑')}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm font-black uppercase tracking-[0.2em] text-[#6B7280]">
              Loading...
            </div>
          ) : (
            <div>
              {/* Desktop table header */}
              <div
                className="hidden gap-3 border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:grid md:items-center md:px-7"
                style={{ gridTemplateColumns: `2.25rem 1fr ${tabCols[tab].map(() => '5rem').join(' ')}` }}
              >
                <button
                  onClick={() => season !== 'All-Time' && (handleSort('Pos'), setPage(0))}
                  className={`text-left transition-colors ${
                    season !== 'All-Time'
                      ? sortCol === 'Pos'
                        ? 'text-[#F5C518]'
                        : 'text-white/70 hover:text-white'
                      : 'cursor-default text-white/40'
                  }`}
                >
                  # {sortCol === 'Pos' && (sortDir === 'desc' ? '↓' : '↑')}
                </button>
                <div className="text-white/70">Franchise</div>
                {tabCols[tab].map(col => (
                  <button
                    key={col}
                    onClick={() => { handleSort(col); setPage(0) }}
                    className={`text-right transition-colors ${
                      sortCol === col
                        ? 'text-[#F5C518]'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {col} {sortCol === col && (sortDir === 'desc' ? '↓' : '↑')}
                  </button>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-2 p-5 sm:p-7">
                {paged.map((row, i) => {
                  const rank = page * PER_PAGE + i + 1
                  const pos = season !== 'All-Time' && row.standing ? row.standing : rank
                  const avatar = getTeamAvatar(row.team)
                  const rankClass = pos === 1 ? 'bg-[#F5C518] text-[#0A0A0A]' : pos === 2 ? 'bg-[#E8E8E8] text-[#0A0A0A]' : pos === 3 ? 'bg-[#E6D0B4] text-[#0A0A0A]' : 'bg-[#F7F6F2] text-[#6B7280] border border-[#D7D5CF]'

                  return (
                    <a
                      key={row.team}
                      href={`/teams?team=${encodeURIComponent(row.team)}`}
                      className="block border-2 border-[#D7D5CF] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#16274F] hover:shadow-[3px_3px_0_#D01F2D] sm:p-5"
                    >
                      {/* Desktop view */}
                      <div
                        className="hidden md:grid md:items-center md:gap-3"
                        style={{ gridTemplateColumns: `2.25rem 1fr ${tabCols[tab].map(() => '5rem').join(' ')}` }}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center text-xs font-black ${rankClass}`}
                          style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '16px' }}
                        >
                          {pos}
                        </span>

                        <div className="flex min-w-0 items-center gap-3">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={row.team}
                              className="h-10 w-10 shrink-0 rounded-full border-2 border-[#0A0A0A] object-contain"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2] text-[9px] font-black text-[#16274F]">
                              {row.team.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black uppercase tracking-tight text-[#16274F]">
                              {row.team}
                            </div>
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                              {season === 'All-Time' ? 'All-Time' : `Season ${season}`}
                            </div>
                          </div>
                          {row.champion && <span className="ml-auto text-lg">🏆</span>}
                        </div>

                        {tabCols[tab].map(col => (
                          <div key={col} className="text-right">
                            <span
                              className={`text-sm font-black ${
                                sortCol === col ? 'text-[#D01F2D]' : 'text-[#4B5563]'
                              }`}
                            >
                              {getCol(row, col)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Mobile view */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-black ${rankClass}`}
                            style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '16px' }}
                          >
                            {pos}
                          </span>
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={row.team}
                              className="h-10 w-10 shrink-0 rounded-full border-2 border-[#0A0A0A] object-contain"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2] text-[9px] font-black text-[#16274F]">
                              {row.team.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-black uppercase leading-snug text-[#16274F]">
                              {row.team}
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                              {season === 'All-Time' ? 'All-Time' : `Season ${season}`}
                            </div>
                          </div>
                          {row.champion && <span className="text-lg">🏆</span>}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {tabCols[tab].map(col => (
                            <div
                              key={col}
                              className={`border-2 px-3 py-2 ${
                                sortCol === col
                                  ? 'border-[#D01F2D] bg-[#FFF1F1]'
                                  : 'border-[#E4E2DB] bg-[#F7F6F2]'
                              }`}
                            >
                              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9CA3AF]">
                                {col}
                              </div>
                              <div
                                className={`mt-0.5 text-sm font-black ${
                                  sortCol === col ? 'text-[#D01F2D]' : 'text-[#374151]'
                                }`}
                              >
                                {getCol(row, col)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t-2 border-[#0A0A0A] bg-[#F7F6F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                    Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, tableData.length)} of {tableData.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex h-9 w-9 items-center justify-center border-2 border-[#0A0A0A] bg-white text-[#16274F] transition-all hover:bg-[#F7F6F2] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 text-center text-xs font-black text-[#16274F]">
                      {page + 1}/{totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="flex h-9 w-9 items-center justify-center border-2 border-[#0A0A0A] bg-white text-[#16274F] transition-all hover:bg-[#F7F6F2] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* TEAM EVOLUTION */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="mt-8 overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[5px_5px_0_#16274F]"
        >
          <div className="flex flex-col gap-5 border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-5 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center border-2 border-white/30 bg-white/10">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.24em] text-[#F5C518]">Team Evolution</div>
                <div className="mt-1 text-lg font-bold text-white/80">Year by year performance</div>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[520px]">
              <Select value={chartStat} onChange={setChartStat} options={CHART_STATS.map(s => s.label)} placeholder="Stat..." />
              <Select value={chartScope} onChange={setChartScope} options={['Reg Season', 'Playoffs', 'Total']} placeholder="Scope..." />
              <Select value={chartTeam} onChange={setChartTeam} options={allTeams} placeholder="Select Team..." />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-b-2 border-[#D7D5CF] bg-[#F7F6F2] px-4 py-4 text-xs font-black uppercase tracking-[0.1em]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-[#0A0A0A] bg-[#F5C518]" />
              Championships
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#1E8E3E]" />
              Best Seasons
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#D01F2D]" />
              Worst Seasons
            </div>
          </div>

          <div className="overflow-x-auto px-3 pb-1 pt-6 sm:px-6">
            <div style={{ minWidth: '360px' }}>
              <WinChart data={chartData} chartStats={chartStats} />
            </div>
          </div>

          {chartStats && (
            <div className="grid grid-cols-2 gap-0 border-t-2 border-[#0A0A0A] md:grid-cols-4">
              <div className="border-b-2 border-r-2 border-[#0A0A0A] bg-[#F7F6F2] p-5 md:border-b-0">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">
                  Best Season
                </div>
                <div className="text-3xl font-black text-[#16274F]">{chartStats.bestVal}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">
                  {chartStats.bestSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
              <div className="border-b-2 border-[#0A0A0A] bg-[#FFF6F6] p-5 md:border-b-0 md:border-r-2">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">
                  Worst Season
                </div>
                <div className="text-3xl font-black text-[#D01F2D]">{chartStats.worstVal}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">
                  {chartStats.worstSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
              <div className="border-r-2 border-[#0A0A0A] bg-white p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">
                  Season Avg
                </div>
                <div className="text-3xl font-black text-[#16274F]">{chartStats.avg}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">per season</div>
              </div>
              <div className="bg-[#FFF9E7] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">
                  Championships
                </div>
                <div className="text-3xl font-black text-[#0A0A0A]">{chartStats.titles}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">
                  {chartStats.championSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <footer className="mx-auto max-w-[1680px] px-3 pb-6 sm:px-5 md:px-6">
        <div className="flex items-center justify-center gap-3 border-2 border-[#D7D5CF] bg-white py-5">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} className="opacity-40" />
          <span className="text-xs font-black uppercase tracking-[0.24em] text-[#8A8A84]">
            Tapitas League · Est. 2014
          </span>
        </div>
      </footer>

      <SummaryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allSeasons={allSeasons}
      />
    </main>
  )
}
