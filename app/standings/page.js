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
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all w-full ${disabled ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
          : open ? 'border-cyan-400/40 bg-white/[0.07] text-white'
            : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
          }`}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>
          {value || placeholder}
        </span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1525] shadow-2xl">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition-all hover:bg-white/[0.06] ${opt === value ? 'text-cyan-300' : 'text-slate-300'}`}
              >
                {opt === value && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />}
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
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <text x={xScale(i)} y={H - padB + 14} textAnchor="middle" fontSize={fsAxis} fill="#f4f6f8">
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
          <circle cx={xScale(i)} cy={yScale(d.value)} r="3.5" fill="#22d3ee" />
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
    return historyData
      .filter(r => normalizeString(r?.Team || r?.team || '') === normalizeString(chartTeam))
      .map(r => ({
        season: String(r?.Season || r?.season || '').trim(),
        value: parseNumber(String(r?.[key] || '0').replace('%', '')),
        champion: String(r?.Champion || '').trim().toUpperCase() === 'TRUE',
      }))
      .sort((a, b) => Number(a.season) - Number(b.season))
  }, [historyData, chartTeam, chartStat, chartScope])

  const chartStats = useMemo(() => {
    if (!chartData.length) return null
    const vals = chartData.map(d => d.value)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const isLoss = chartStat === 'Losses'

    const bestVal = isLoss ? Math.min(...vals) : Math.max(...vals)
    const worstVal = isLoss ? Math.max(...vals) : Math.min(...vals)

    const bestSeasons = chartData.filter(d => d.value === bestVal).map(d => d.season)
    const worstSeasons = chartData.filter(d => d.value === worstVal).map(d => d.season)

    // Descobre quais foram as temporadas de título
    const championSeasons = chartData.filter(d => d.champion).map(d => d.season)
    // Mantém a contagem total baseada no tamanho desse novo array
    const titles = championSeasons.length

    return {
      bestVal,
      worstVal,
      bestSeasons,
      worstSeasons,
      avg: Math.round(avg * 10) / 10,
      titles,
      championSeasons // Agora você tem a lista exata de temporadas campeãs aqui!
    }
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
      setSortDir('desc')
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

    <main className="min-h-screen bg-[#020617] text-white">

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <Header onSummaryOpen={() => setDrawerOpen(true)} />

      <section className="mx-auto max-w-[1680px] px-4 pb-8">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]">

          {/* Background */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[38px]">

            <svg
              className="absolute inset-y-0 left-1/2 -translate-x-[60%] h-full w-[140%] max-w-none"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 900 340"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >

              {/* Listras diagonais */}
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect
                    key={i}
                    x={x}
                    y="-80"
                    width={i % 2 === 0 ? 55 : 22}
                    height="520"
                    fill="#22d3ee"
                    transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 170)`}
                  />
                ))}
              </g>

              {/* Losangos */}
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[
                  "M380 -30 L460 85 L380 200 L300 85 Z",
                  "M460 85 L540 200 L460 315 L380 200 Z",
                  "M540 -30 L620 85 L540 200 L460 85 Z",
                  "M620 85 L700 200 L620 315 L540 200 Z",
                  "M700 -30 L780 85 L700 200 L620 85 Z",
                  "M780 85 L860 200 L780 315 L700 200 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Losangos preenchidos */}
              <g opacity="0.08" fill="#22d3ee">
                {[
                  "M420 30 L440 58 L420 86 L400 58 Z",
                  "M500 120 L520 148 L500 176 L480 148 Z",
                  "M580 30 L600 58 L580 86 L560 58 Z",
                  "M660 120 L680 148 L660 176 L640 148 Z",
                  "M740 30 L760 58 L740 86 L720 58 Z",
                ].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Chevrons */}
              <g
                opacity="0.07"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinejoin="round"
              >
                {[520, 600, 680].map((x, i) => (
                  <polyline
                    key={i}
                    points={`${x},0 ${x + 160},170 ${x},340`}
                  />
                ))}
              </g>

              {/* Triângulos */}
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,140 760,0" />
                <polygon points="900,340 900,200 760,340" />
              </g>

              {/* Círculos */}
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30, 50, 70].map((r) => (
                  <circle key={r} cx="870" cy="60" r={r} />
                ))}
              </g>

              {/* Grid pontos */}
              <g opacity="0.09" fill="#22d3ee">
                {[40, 60, 80, 100].map((y) =>
                  [310, 330, 350].map((x) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />
                  ))
                )}
              </g>

              {/* Linhas */}
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[56, 113, 226, 284].map((y) => (
                  <line key={y} x1="0" y1={y} x2="900" y2={y} />
                ))}
              </g>

              {/* Número fantasma */}
              <text
                x="820"
                y="310"
                fontFamily="'Bebas Neue', sans-serif"
                fontSize="340"
                fill="#22d3ee"
                opacity="0.02"
                textAnchor="middle"
              >
                12
              </text>
            </svg>

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.88) 48%, rgba(2,6,23,0.18) 100%)',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8 md:p-10">

            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
              <Medal className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                All-Time Records
              </span>
            </div>

            <h1
              className="leading-[0.9] tracking-[-0.02em]"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: 'clamp(48px, 7vw, 96px)',
                background:
                  'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              League{' '}
              <span
                style={{
                  background:
                    'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Standings
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-base text-slate-400">
              Every team. Every season. Every stat.
            </p>

          </div>
        </div>

        {/* Tabela */}
        <motion.div
          initial={{
            opacity: 0,
            y: 50,
            filter: 'blur(10px)',
          }}
          whileInView={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          viewport={{
            once: false,
            amount: 0.15,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}

          className="mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Medal className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Team Rankings</div>
                <div className="text-base text-slate-400">
                  {season === 'All-Time' ? 'All-Time standings' : `Season ${season}`}
                </div>
              </div>
            </div>
            <div className="w-48">
              <Select value={season} onChange={setSeason} options={seasons} placeholder="Season..." />
            </div>
          </div>

          <div className="flex gap-2 border-b border-white/5 px-8 py-4">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${tab === t
                  ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
                  : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th
                      onClick={() => season !== 'All-Time' && handleSort('Pos')}
                      className={`px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${season !== 'All-Time' ? 'cursor-pointer hover:text-cyan-300' : 'cursor-default'
                        }`}
                      style={{ color: sortCol === 'Pos' && season !== 'All-Time' ? '#22d3ee' : '#94a3b8' }}
                    >
                      <span className="inline-flex items-center gap-1">
                        Pos
                        {sortCol === 'Pos' && season !== 'All-Time' && (
                          <span className="text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Franchise
                    </th>
                    {tabCols[tab].map(col => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="cursor-pointer px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-cyan-300"
                        style={{ color: sortCol === col ? '#22d3ee' : '#94a3b8' }}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {col}
                          {sortCol === col && (
                            <span className="text-cyan-400">{sortDir === 'desc' ? '↓' : '↑'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, i) => {
                    const rank = page * PER_PAGE + i + 1
                    return (
                      <tr key={row.team} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <span className={`text-sm font-black ${(season !== 'All-Time' ? row.standing : rank) <= 3 ? 'text-cyan-300' : 'text-slate-600'
                            }`}>
                            {season !== 'All-Time' && row.standing
                              ? ['1st', '2nd', '3rd'][row.standing - 1] ?? `${row.standing}th`
                              : rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white" style={{ fontSize: 'clamp(13px, 2vw, 16px)' }}>
                              {row.team}
                            </span>
                            {row.champion && (
                              <span title="Champion">🏆</span>
                            )}
                          </div>
                        </td>
                        {tabCols[tab].map(col => (
                          <td
                            key={col}
                            className={`px-4 py-4 text-right text-sm font-bold ${col === sortCol ? 'text-base font-black text-cyan-300' : 'text-slate-400'}`}
                          >
                            {getCol(row, col)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-8 py-4">
              <span className="text-xs font-black text-slate-500">
                Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, tableData.length)} of {tableData.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-black text-slate-500">{page + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-all hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Gráfico */}
        <motion.div
          initial={{
            opacity: 0,
            y: 50,
            filter: 'blur(10px)',
          }}
          whileInView={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          viewport={{
            once: false,
            amount: 0.15,
          }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Activity className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Team Evolution</div>
                <div className="text-base text-slate-400">Year by year performance</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="w-36">
                <Select
                  value={chartStat}
                  onChange={setChartStat}
                  options={CHART_STATS.map(s => s.label)}
                  placeholder="Stat..."
                />
              </div>
              <div className="w-36">
                <Select
                  value={chartScope}
                  onChange={setChartScope}
                  options={['Reg Season', 'Playoffs', 'Total']}
                  placeholder="Scope..."
                />
              </div>
              <div className="w-56">
                <Select value={chartTeam} onChange={setChartTeam} options={allTeams} placeholder="Select Team..." />
              </div>
            </div>
          </div>
          {/* LEGENDA DO GRÁFICO */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs tracking-wider">
            {/* Campeão */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-slate-300">Championships</span>
            </div>

            {/* Melhores Temporadas */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-slate-300">Best Seasons</span>
            </div>

            {/* Piores Temporadas */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-slate-300">Worst Seasons</span>
            </div>
          </div>

          <div className="overflow-x-auto px-6 pb-2 pt-6">
            <div style={{ minWidth: '360px' }}>
              <WinChart data={chartData} chartStats={chartStats} />
            </div>
          </div>

          {chartStats && (
            <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Best Season</div>
                <div className="text-3xl font-black text-cyan-300">{chartStats.bestVal}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  {chartStats.bestSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Worst Season</div>
                <div className="text-3xl font-black text-cyan-300">{chartStats.worstVal}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  {chartStats.worstSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Season Avg</div>
                <div className="text-3xl font-black text-cyan-300">{chartStats.avg}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">per season</div>
              </div>
              <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Championships</div>
                <div className="text-3xl font-black text-cyan-300">{chartStats.titles}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  {chartStats.championSeasons.map(s => `'${String(s).slice(2)}`).join(', ')}
                </div>
              </div>
            </div>
          )}
        </motion.div>

      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-3 pb-6">
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

      <SummaryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        allSeasons={allSeasons}
      />

    </main>
  )
}