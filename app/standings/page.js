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
                ? "#f59e0b" // 🏆 Amarelo Ouro se foi Campeão
                : chartStats?.bestSeasons?.includes(d.season)
                  ? "#17e287" // 🟢 Verde Esmeralda para as Melhores Temporadas (Recorde do time)
                  : chartStats?.worstSeasons?.includes(d.season)
                    ? "#ef4444" // 🔴 Vermelho Vivo para as Piores Temporadas (Fundo do poço do time)
                    : "#22d3ee" // 🔵 Ciano padrão para as temporadas regulares
            }
            className={
              d.champion ||
                chartStats?.bestSeasons?.includes(d.season) ||
                chartStats?.worstSeasons?.includes(d.season)
                ? "font-black"
                : ""
            }
          >
            {Math.round(d.value)}
          </text>
          <circle cx={xScale(i)} cy={yScale(d.value)} r="3.5" fill="#16274F" />
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

export default function StandingsPage() {
  const [allTimeData, setAllTimeData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overall')
  const [season, setSeason] = useState('All-Time')
  const [chartTeam, setChartTeam] = useState('')
  const [page, setPage] = useState(0)
  const [sortCol, setSortCol] = useState('W')
  const [sortDir, setSortDir] = useState('desc')
  const [chartStat, setChartStat] = useState('Wins')
  const [chartScope, setChartScope] = useState('Reg Season')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [allSeasons, setAllSeasons] = useState([])
  const { setLeftSlot } = useDrawer()

  const TABS = ['Overall', 'Reg Season', 'Playoffs']
  const PER_PAGE = 10

  useEffect(() => {
    async function load() {
      const [allTime, history] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
      ])
      setAllTimeData(allTime)
      setHistoryData(history)
      if (allTime.length > 0) {
        setChartTeam(String(allTime[0]?.Team || allTime[0]?.team || '').trim())
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

  useEffect(() => {
    if (season === 'All-Time' && sortCol === 'Pos') {
      setSortCol('W')
      setSortDir('desc')
    }
  }, [season])

  const seasons = useMemo(() => {
    const s = new Set()
    historyData.forEach(r => {
      const v = String(r?.Season || r?.season || '').trim()
      // Only include seasons that have Standing data (completed)
      if (v && parseNumber(r?.Standing) > 0) s.add(v)
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
        champion: false,
      }))
    } else {
      console.log('Filtrando season:', season)
      console.log('Seasons disponíveis:', historyData.map(r => r.Season).slice(0, 5))
      rows = historyData
        .filter(r => {
          const s = String(r?.Season || r?.season || '').trim()
          return s === season
        })
        .map(r => {
          const team = String(r?.Team || r?.team || '').trim()
          console.log('Row:', team, 'RS_W:', r?.RS_W, 'RS_L:', r?.RS_L, 'RS_PF:', r?.RS_PF)
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
          return row.w
        }
        const diff = sortDir === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b)
        if (diff !== 0) return diff
        if (b.w !== a.w) return b.w - a.w
        if (a.l !== b.l) return a.l - b.l
        return b.pf - a.pf
      })
  }, [allTimeData, historyData, tab, season, sortCol, sortDir])

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

  const tabCols = {
    'Overall': ['W', 'L', 'W%', 'PF', 'PO Apps', 'Finals', 'Titles'],
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

  const getCol = (row, col) => {
    if (col === 'Pos') return row.standing ? (['1st', '2nd', '3rd'][row.standing - 1] ?? `${row.standing}th`) : '—'
    if (col === 'W') return row.w
    if (col === 'L') return row.l
    if (col === 'W%') return `${row.winPct.toFixed(1)}%`
    if (col === 'PF') return Math.round(row.pf).toLocaleString()
    if (col === 'Titles') return row.titles
    if (col === 'Finals') return row.finals
    if (col === 'PO Apps') return row.poApps
    return '—'
  }


  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <Header onSummaryOpen={() => setDrawerOpen(true)} />

      <section className="mx-auto max-w-[1680px] px-3 pb-16 pt-4 sm:px-5 md:px-6">
        {/* HERO */}
        <div className="relative mb-10 min-h-[280px] overflow-hidden border-2 border-[#0A0A0A] bg-[#F7F6F2] shadow-[6px_6px_0_#16274F]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="absolute right-0 top-0 h-full w-[62%]" viewBox="0 0 900 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="2">
                {[80, 150, 220, 290, 360, 430, 500, 570, 640, 710, 780].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x + 220} y2="340" />
                ))}
              </g>
              <g opacity="0.08" fill="none" stroke="#D01F2D" strokeWidth="1.5">
                {[
                  "M460 0 L560 85 L460 170 L360 85 Z",
                  "M600 85 L700 170 L600 255 L500 170 Z",
                  "M740 0 L840 85 L740 170 L640 85 Z",
                  "M740 170 L840 255 L740 340 L640 255 Z",
                ].map((d, i) => <path key={i} d={d} />)}
              </g>
              <g opacity="0.07" fill="#D01F2D">
                <circle cx="700" cy="72" r="5" />
                <circle cx="760" cy="130" r="5" />
                <circle cx="640" cy="190" r="5" />
                <circle cx="820" cy="220" r="5" />
              </g>
              <text x="785" y="305" textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="310" fill="#16274F" opacity="0.035">12</text>
            </svg>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#F7F6F2_0%,#F7F6F2_40%,rgba(247,246,242,0.9)_56%,rgba(247,246,242,0.15)_100%)]" />
          </div>

          <div className="relative z-10 flex min-h-[280px] items-center p-6 sm:p-10 md:p-12">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 border-2 border-[#D01F2D] bg-[#D01F2D] px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-white">
                <Medal className="h-4 w-4" />
                League
              </div>

              <h1
                className="leading-[0.82] tracking-[-0.02em]"
                style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(56px, 8vw, 110px)' }}
              >
                <span className="text-[#16274F]">League</span>{' '}
                <span className="text-[#D01F2D]" style={{ textShadow: '3px 3px 0 #0A0A0A' }}>Standings</span>
              </h1>

              <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-[#4B5563] sm:text-lg">
                Every team. Every season. Every stat.
              </p>
            </div>
          </div>
        </div>

        {/* STANDINGS */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="mb-10 overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[5px_5px_0_#16274F]"
        >
          <div className="flex flex-col gap-5 border-b-2 border-[#0A0A0A] bg-[#16274F] px-5 py-5 text-white sm:px-7 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center border-2 border-white/30 bg-white/10">
                  <Medal className="h-4.5 w-4.5" />
                </div>
                <div className="text-sm font-black uppercase tracking-[0.24em] text-[#F5C518]">Team Rankings</div>
              </div>
              <div className="mt-1 text-lg font-bold text-white/80">
                {season === 'All-Time' ? 'All-Time standings' : `Season ${season}`}
              </div>
            </div>
            <div className="w-full md:w-56">
              <Select value={season} onChange={setSeason} options={seasons} placeholder="Season..." />
            </div>
          </div>

          <div className="flex overflow-x-auto border-b-2 border-[#0A0A0A] bg-[#F7F6F2] px-5 sm:px-7">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-r-2 border-[#0A0A0A] px-5 py-4 text-xs font-black uppercase tracking-[0.18em] transition-colors first:border-l-2 ${
                  tab === t
                    ? 'bg-[#D01F2D] text-white'
                    : 'bg-transparent text-[#6B7280] hover:bg-white hover:text-[#16274F]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm font-black uppercase tracking-[0.2em] text-[#6B7280]">Loading...</div>
          ) : (
            <div className="p-3 sm:p-5">
              {/* Desktop table heading */}
              <div
                className="hidden border-b-2 border-[#D7D5CF] px-4 pb-3 md:grid md:items-end md:gap-3"
                style={{ gridTemplateColumns: `2.25rem minmax(0,1fr) ${tabCols[tab].map(() => '4.5rem').join(' ')}` }}
              >
                <button
                  onClick={() => season !== 'All-Time' && handleSort('Pos')}
                  className={`text-left text-[10px] font-black uppercase tracking-[0.18em] ${season !== 'All-Time' ? 'text-[#6B7280] hover:text-[#D01F2D]' : 'cursor-default text-[#B5B5AF]'}`}
                >
                  #
                </button>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6B7280]">Franchise</div>
                {tabCols[tab].map(col => (
                  <button
                    key={col}
                    onClick={() => handleSort(col)}
                    className="text-right text-[10px] font-black uppercase tracking-[0.14em] transition-colors"
                    style={{ color: sortCol === col ? '#D01F2D' : '#6B7280' }}
                  >
                    {col}{sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                ))}
              </div>

              {/* Mobile sort controls */}
              <div className="flex gap-2 overflow-x-auto px-1 pb-3 pt-1 md:hidden">
                {season !== 'All-Time' && (
                  <button
                    onClick={() => handleSort('Pos')}
                    className={`shrink-0 border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ${sortCol === 'Pos' ? 'border-[#D01F2D] bg-[#D01F2D] text-white' : 'border-[#D7D5CF] bg-white text-[#6B7280]'}`}
                  >
                    #{sortCol === 'Pos' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                )}
                {tabCols[tab].map(col => (
                  <button
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`shrink-0 border-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ${sortCol === col ? 'border-[#D01F2D] bg-[#D01F2D] text-white' : 'border-[#D7D5CF] bg-white text-[#6B7280]'}`}
                  >
                    {col}{sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {paged.map((row, i) => {
                  const rank = page * PER_PAGE + i + 1
                  const pos = season !== 'All-Time' && row.standing ? row.standing : rank
                  const avatar = getTeamAvatar(row.team)
                  const rankClass = pos === 1 ? 'bg-[#F5C518] text-[#0A0A0A]' : pos === 2 ? 'bg-[#E8E8E8] text-[#0A0A0A]' : pos === 3 ? 'bg-[#E6D0B4] text-[#0A0A0A]' : 'bg-[#F7F6F2] text-[#6B7280]'

                  return (
                    <a
                      key={row.team}
                      href={`/teams?team=${encodeURIComponent(row.team)}`}
                      className="block border-2 border-[#D7D5CF] bg-white p-3 transition-transform hover:-translate-y-0.5 hover:border-[#16274F] hover:shadow-[3px_3px_0_#D01F2D] sm:p-4"
                    >
                      <div
                        className="hidden md:grid md:items-center md:gap-3"
                        style={{ gridTemplateColumns: `2.25rem minmax(0,1fr) ${tabCols[tab].map(() => '4.5rem').join(' ')}` }}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center text-sm font-black ${rankClass}`} style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                          {pos}
                        </span>

                        <div className="flex min-w-0 items-center gap-3">
                          {avatar ? (
                            <img src={avatar} alt={row.team} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#0A0A0A] object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2] text-[10px] font-black text-[#16274F]">
                              {row.team.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black uppercase tracking-tight text-[#16274F]">{row.team}</div>
                            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">{season === 'All-Time' ? 'All-Time' : `Season ${season}`}</div>
                          </div>
                          {row.champion && <span className="ml-auto text-base">🏆</span>}
                        </div>

                        {tabCols[tab].map(col => (
                          <div key={col} className="text-right">
                            <span className={`text-sm font-black ${sortCol === col ? 'text-[#D01F2D]' : 'text-[#4B5563]'}`}>
                              {getCol(row, col)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="md:hidden">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center text-sm font-black ${rankClass}`} style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                            {pos}
                          </span>
                          {avatar ? (
                            <img src={avatar} alt={row.team} className="h-10 w-10 shrink-0 rounded-full border-2 border-[#0A0A0A] object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2] text-[10px] font-black text-[#16274F]">
                              {row.team.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-black uppercase leading-snug text-[#16274F]">{row.team}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                              {season === 'All-Time' ? 'All-Time ranking' : `Season ${season}`}
                            </div>
                          </div>
                          {row.champion && <span className="text-base">🏆</span>}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 pl-0 sm:grid-cols-4">
                          {tabCols[tab].map(col => (
                            <div key={col} className={`border-2 px-3 py-2 ${sortCol === col ? 'border-[#D01F2D] bg-[#FFF1F1]' : 'border-[#E4E2DB] bg-[#F7F6F2]'}`}>
                              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#9CA3AF]">{col}</div>
                              <div className={`mt-0.5 text-sm font-black ${sortCol === col ? 'text-[#D01F2D]' : 'text-[#374151]'}`}>{getCol(row, col)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t-2 border-[#0A0A0A] bg-[#F7F6F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6B7280]">
                Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, tableData.length)} of {tableData.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-9 w-9 items-center justify-center border-2 border-[#0A0A0A] bg-white text-[#16274F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-12 text-center text-xs font-black text-[#16274F]">{page + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-9 w-9 items-center justify-center border-2 border-[#0A0A0A] bg-white text-[#16274F] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* TEAM EVOLUTION */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[5px_5px_0_#16274F]"
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
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-[#0A0A0A] bg-[#F5C518]" /> Championships</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#1E8E3E]" /> Best Seasons</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#D01F2D]" /> Worst Seasons</div>
          </div>

          <div className="overflow-x-auto px-3 pb-1 pt-6 sm:px-6">
            <div style={{ minWidth: '360px' }}>
              <WinChart data={chartData} chartStats={chartStats} />
            </div>
          </div>

          {chartStats && (
            <div className="grid grid-cols-2 gap-0 border-t-2 border-[#0A0A0A] md:grid-cols-4">
              <div className="border-b-2 border-r-2 border-[#0A0A0A] bg-[#F7F6F2] p-5 md:border-b-0">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">Best Season</div>
                <div className="text-3xl font-black text-[#16274F]">{chartStats.bestVal}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">{chartStats.bestSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}</div>
              </div>
              <div className="border-b-2 border-[#0A0A0A] bg-[#FFF6F6] p-5 md:border-b-0 md:border-r-2">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">Worst Season</div>
                <div className="text-3xl font-black text-[#D01F2D]">{chartStats.worstVal}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">{chartStats.worstSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}</div>
              </div>
              <div className="border-r-2 border-[#0A0A0A] bg-white p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">Season Avg</div>
                <div className="text-3xl font-black text-[#16274F]">{chartStats.avg}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">per season</div>
              </div>
              <div className="bg-[#FFF9E7] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A8A84]">Championships</div>
                <div className="text-3xl font-black text-[#0A0A0A]">{chartStats.titles}</div>
                <div className="mt-1 text-xs font-bold text-[#6B7280]">{chartStats.championSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}</div>
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
