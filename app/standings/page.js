'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import {
  Medal, Activity, ChevronRight, ChevronLeft,
} from 'lucide-react'

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
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all w-full ${
          disabled ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600'
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

function WinChart({ data }) {
  if (!data || data.length === 0) return null

  const W = 560, H = 180, padL = 36, padR = 16, padT = 24, padB = 28
  const maxV = Math.max(...data.map(d => d.value), 1)
  const xScale = (i) => padL + (i / (data.length - 1)) * (W - padL - padR)
  const yScale = (v) => padT + (1 - v / (maxV + 1)) * (H - padT - padB)
  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ')
  const areaPoints = `${xScale(0)},${H - padB} ${points} ${xScale(data.length - 1)},${H - padB}`
  const gridVals = [0, Math.round(maxV * 0.33), Math.round(maxV * 0.66), Math.round(maxV)]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
      {gridVals.map(v => (
        <g key={v}>
          <line x1={padL} y1={yScale(v)} x2={W - padR} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <text x={padL - 6} y={yScale(v) + 4} textAnchor="end" fontSize="9" fill="#475569">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <polygon points={areaPoints} fill="#22d3ee" opacity="0.07" />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <text x={xScale(i)} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#475569">
            {`'${String(d.season).slice(2)}`}
          </text>
          {d.champion && (
            <text x={xScale(i)} y={yScale(d.value) - 22} textAnchor="middle" fontSize="10">🏆</text>
          )}
          <text x={xScale(i)} y={yScale(d.value) - 10} textAnchor="middle" fontSize="8" fill="#22d3ee">
            {Math.round(d.value)}
          </text>
          <circle cx={xScale(i)} cy={yScale(d.value)} r="3.5" fill="#22d3ee" />
        </g>
      ))}
    </svg>
  )
}

const CHART_STATS = [
  { label: 'Wins',   keys: { 'Reg Season': 'RS_W',  'Playoffs': 'PO_W',  'Total': 'W'   } },
  { label: 'Losses', keys: { 'Reg Season': 'RS_L',  'Playoffs': 'PO_L',  'Total': 'L'   } },
  { label: 'Points', keys: { 'Reg Season': 'RS_PF', 'Playoffs': 'PO_PF', 'Total': 'PF'  } },
  { label: 'Win %',  keys: { 'Reg Season': 'RS_W%', 'Playoffs': 'PO_W%', 'Total': 'W%'  } },
]

export default function StandingsPage() {
  const [allTimeData, setAllTimeData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('Overall')
  const [season,      setSeason]      = useState('All-Time')
  const [chartTeam,   setChartTeam]   = useState('')
  const [page,        setPage]        = useState(0)
  const [sortCol, setSortCol] = useState('W')
  const [sortDir, setSortDir] = useState('desc')
  const [chartStat,  setChartStat]  = useState('Wins')
  const [chartScope, setChartScope] = useState('Reg Season')

  const TABS = ['Overall', 'Reg Season', 'Playoffs']
  const PER_PAGE = 10

  useEffect(() => {
    console.log('useEffect executando!')
    async function load() {
      const [allTime, history] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
      ])
      setAllTimeData(allTime)
      setHistoryData(history)
      console.log('history[0]:', history[0])
      console.log('history keys:', Object.keys(history[0] || {}))
      if (allTime.length > 0) {
        setChartTeam(String(allTime[0]?.Team || allTime[0]?.team || '').trim())
      }
      setLoading(false)
    }
    load()
  }, [])

  const seasons = useMemo(() => {
    const s = new Set()
    historyData.forEach(r => {
      const v = String(r?.Season || r?.season || '').trim()
      if (v) s.add(v)
    })
    return ['All-Time', ...Array.from(s).sort((a, b) => Number(b) - Number(a))]
  }, [historyData])

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
        team:    String(r?.Team || r?.team || '').trim(),
        w:       parseNumber(tab === 'Overall' ? r?.W : tab === 'Reg Season' ? r?.RS_W : r?.PO_W),
        l:       parseNumber(tab === 'Overall' ? r?.L : tab === 'Reg Season' ? r?.RS_L : r?.PO_L),
        pf:      parseNumber(tab === 'Overall' ? r?.PF : tab === 'Reg Season' ? r?.RS_PF : r?.PO_PF),
        winPct:  parseNumber(String(tab === 'Overall' ? r?.['W%'] : tab === 'Reg Season' ? r?.['RS_W%'] : r?.['PO_W%'] || '0').replace('%', '')),
        titles:  parseNumber(r?.Titles || 0),
        finals:  parseNumber(r?.Finals || 0),
        poApps:  parseNumber(r?.['Playoff Apps'] || 0),
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
            w:        parseNumber(tab === 'Overall' ? r?.W : tab === 'Reg Season' ? r?.RS_W : r?.PO_W),
            l:        parseNumber(tab === 'Overall' ? r?.L : tab === 'Reg Season' ? r?.RS_L : r?.PO_L),
            pf:       parseNumber(tab === 'Overall' ? r?.PF : tab === 'Reg Season' ? r?.RS_PF : r?.PO_PF),
            winPct:   parseNumber(String(tab === 'Overall' ? r?.['W%'] : tab === 'Reg Season' ? r?.['RS_W%'] : r?.['PO_W%'] || '0').replace('%', '')),
            titles:   String(r?.Champion || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            finals:   String(r?.Reached_Final || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            poApps:   String(r?.Made_Playoffs || '').trim().toUpperCase() === 'TRUE' ? 1 : 0,
            champion: String(r?.Champion || '').trim().toUpperCase() === 'TRUE',
          }
        })
    }
    return rows
  .filter(r => r.team)
  .sort((a, b) => {
    const getVal = (row) => {
      if (sortCol === 'W')       return row.w
      if (sortCol === 'L')       return row.l
      if (sortCol === 'W%')      return row.winPct
      if (sortCol === 'PF')      return row.pf
      if (sortCol === 'Titles')  return row.titles
      if (sortCol === 'Finals')  return row.finals
      if (sortCol === 'PO Apps') return row.poApps
      return row.w
    }
    const diff = sortDir === 'desc' ? getVal(b) - getVal(a) : getVal(a) - getVal(b)
    if (diff !== 0) return diff
    if (b.w !== a.w) return b.w - a.w
    return b.pf - a.pf
  })
  }, [allTimeData, historyData, tab, season, sortCol, sortDir])

  const chartData = useMemo(() => {
  if (!chartTeam) return []
  const stat = CHART_STATS.find(s => s.label === chartStat)
  const key  = stat?.keys?.[chartScope] ?? 'RS_W'
  return historyData
    .filter(r => normalizeString(r?.Team || r?.team || '') === normalizeString(chartTeam))
    .map(r => ({
      season:   String(r?.Season || r?.season || '').trim(),
      value:    parseNumber(String(r?.[key] || '0').replace('%', '')),
      champion: String(r?.Champion || '').trim().toUpperCase() === 'TRUE',
    }))
    .sort((a, b) => Number(a.season) - Number(b.season))
}, [historyData, chartTeam, chartStat, chartScope])

  const chartStats = useMemo(() => {
  if (!chartData.length) return null
  const vals   = chartData.map(d => d.value)
  const titles = chartData.filter(d => d.champion).length
  const best   = chartData.reduce((a, b) => b.value > a.value ? b : a, chartData[0])
  const worst  = chartData.reduce((a, b) => b.value < a.value ? b : a, chartData[0])
  const avg    = vals.reduce((a, b) => a + b, 0) / vals.length
  return { best, worst, avg: Math.round(avg * 10) / 10, titles }
}, [chartData])

  const paged      = tableData.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const totalPages = Math.ceil(tableData.length / PER_PAGE)

  useEffect(() => { setPage(0) }, [tab, season, sortCol, sortDir])

  const tabCols = {
    'Overall':    ['W', 'L', 'W%', 'PF', 'PO Apps', 'Finals', 'Titles'],
    'Reg Season': ['W', 'L', 'W%', 'PF'],
    'Playoffs':   ['W', 'L', 'PF'],
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
    if (col === 'W')       return row.w
    if (col === 'L')       return row.l
    if (col === 'W%')      return `${row.winPct.toFixed(1)}%`
    if (col === 'PF')      return Math.round(row.pf).toLocaleString()
    if (col === 'Titles')  return row.titles
    if (col === 'Finals')  return row.finals
    if (col === 'PO Apps') return row.poApps
    return '—'
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={36}
            height={36}
            style={{ filter: 'invert(1)' }}
            className="opacity-80"
          />
          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas<span className="text-cyan-400">League</span>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map(item => (
            <a
              key={item}
              href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${item === 'Standings' ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
            >
              {item}
            </a>
          ))}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)] p-10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[38px]">
            <div className="absolute -right-32 -top-32 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
          </div>
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
              background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            League{' '}
            <span style={{
              background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Standings
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-slate-400">
            Every franchise. Every season. Every stat.
          </p>
        </div>

        {/* Tabela */}
        <div className="mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Medal className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Franchise Rankings</div>
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
                className={`rounded-2xl px-4 py-2 text-sm font-black transition-all ${
                  tab === t
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
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">#</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Franchise</th>
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
                          <span className={`text-sm font-black ${rank <= 3 ? 'text-cyan-300' : 'text-slate-600'}`}>
                            {season !== 'All-Time' && row.standing
                              ? ['1st','2nd','3rd'][row.standing - 1] ?? `${row.standing}th`
                              : rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white" style={{ fontSize: 'clamp(13px, 2vw, 16px)' }}>
                              {row.team}
                            </span>
                            {row.champion && (
                              <span className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                                Champion
                              </span>
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
        </div>

        {/* Gráfico */}
        <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Activity className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Franchise Evolution</div>
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
                <Select value={chartTeam} onChange={setChartTeam} options={allTeams} placeholder="Select franchise..." />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-6 pb-2 pt-6">
            <div style={{ minWidth: '620px' }}>
              <WinChart data={chartData} />
            </div>
          </div>

          {chartStats && (
            <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
              {[
                ['Best Season',   Math.round(chartStats.best.value),  `'${String(chartStats.best.season).slice(2)}`],
                ['Worst Season',  Math.round(chartStats.worst.value), `'${String(chartStats.worst.season).slice(2)}`],
                ['Season Avg',    chartStats.avg,                      'per season'],
                ['Championships', chartStats.titles,                   'titles'],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
                  <div className="text-3xl font-black text-cyan-300">{value}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
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

    </main>
  )
}