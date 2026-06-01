'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo } from 'react'
import { Trophy, Flame, Swords, Activity, Star, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import Header from '../components/Header'
import SummaryDrawer from '../components/SummaryDrawer'
import { useDrawer } from '../context/DrawerContext'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeString(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

// Card de recorde individual
function RecordCard({ label, value, sub, sub2, accent, icon: Icon, wide }) {
  const accents = {
    gold: { border: 'border-yellow-400/25', bg: 'bg-yellow-400/5', text: 'text-yellow-400', icon: 'bg-yellow-400/10 border-yellow-400/20' },
    cyan: { border: 'border-cyan-400/25', bg: 'bg-cyan-400/5', text: 'text-cyan-400', icon: 'bg-cyan-400/10 border-cyan-400/20' },
    emerald: { border: 'border-emerald-400/25', bg: 'bg-emerald-400/5', text: 'text-emerald-400', icon: 'bg-emerald-400/10 border-emerald-400/20' },
    red: { border: 'border-red-400/25', bg: 'bg-red-400/5', text: 'text-red-400', icon: 'bg-red-400/10 border-red-400/20' },
    purple: { border: 'border-purple-400/25', bg: 'bg-purple-400/5', text: 'text-purple-400', icon: 'bg-purple-400/10 border-purple-400/20' },
    orange: { border: 'border-orange-400/25', bg: 'bg-orange-400/5', text: 'text-orange-400', icon: 'bg-orange-400/10 border-orange-400/20' },
    slate: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-slate-300', icon: 'bg-white/[0.06] border-white/10' },
  }
  const a = accents[accent] || accents.slate

  return (
    <div className={`rounded-[24px] border p-5 ${a.border} ${a.bg} ${wide ? 'col-span-2' : ''}`}>
      {Icon && (
        <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl border ${a.icon}`}>
          <Icon className={`h-4 w-4 ${a.text}`} />
        </div>
      )}
      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className={`text-3xl font-black leading-none ${a.text}`} style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
        {value}
      </div>
      {sub && <div className="mt-2 text-sm font-bold text-white">{sub}</div>}
      {sub2 && <div className="mt-0.5 text-xs text-slate-500">{sub2}</div>}
    </div>
  )
}

// Seção com título
function RecordSection({ title, children }) {
  return (
    <div className="mb-8">
      <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

const TABS = [
  { key: 'franchise', label: 'Franchise', Icon: Shield },
  { key: 'streaks', label: 'Streaks', Icon: Flame },
  { key: 'games', label: 'Games', Icon: Activity },
  { key: 'seasons', label: 'Seasons', Icon: Star },
  { key: 'rivalry', label: 'Rivalries', Icon: Swords },
  { key: 'glory', label: 'Glory', Icon: Trophy },
]

export default function RecordsPage() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [games, setGames] = useState([])
  const [h2h, setH2h] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('franchise')
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allSeasons, setAllSeasons] = useState([])
  const { setLeftSlot } = useDrawer()

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
    async function load() {
      const [at, hi, ga, h2hData] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
      ])
      setAllTime(at)
      setHistory(hi)
      setGames(ga)
      setH2h(h2hData)
      setLoading(false)
      
    }
    load()
  }, [])


  // ── FRANCHISE RECORDS ──────────────────────────────────────────────
  const franchiseRecords = useMemo(() => {
    if (!allTime.length) return {}

    const sorted = (key, asc = false) => [...allTime].sort((a, b) =>
      asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
    )

    const top = (key, asc = false) => {
      const s = sorted(key, asc)
      return { team: String(s[0]?.Team || '').trim(), value: parseNumber(s[0]?.[key]) }
    }

    // 10W seasons por time (reg season W >= 10)
    const tenWSeasons = {}
    const tenWTotal = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      const rsW = parseNumber(r?.RS_W)
      const totW = parseNumber(r?.W)
      if (rsW >= 10) tenWSeasons[team] = (tenWSeasons[team] || 0) + 1
      if (totW >= 10) tenWTotal[team] = (tenWTotal[team] || 0) + 1
    })
    const bestTenRS = Object.entries(tenWSeasons).sort((a, b) => b[1] - a[1])[0] || ['—', 0]
    const bestTenTot = Object.entries(tenWTotal).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    // Power Rankings #1 weeks
    const pr1All = {}, pr1from21 = {}, pr1from23 = {}
    games.forEach(g => {
      if (parseNumber(g?.['Power Ranking']) !== 1) return
      const team = String(g?.Team || '').trim()
      const season = Number(String(g?.Season || '0').trim())
      pr1All[team] = (pr1All[team] || 0) + 1
      if (season >= 2021) pr1from21[team] = (pr1from21[team] || 0) + 1
      if (season >= 2023) pr1from23[team] = (pr1from23[team] || 0) + 1
    })
    const bestPR1All = Object.entries(pr1All).sort((a, b) => b[1] - a[1])[0] || ['—', 0]
    const bestPR1_21 = Object.entries(pr1from21).sort((a, b) => b[1] - a[1])[0] || ['—', 0]
    const bestPR1_23 = Object.entries(pr1from23).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    return {
      mostWins: top('W'),
      mostLosses: top('L'),
      bestWinPct: { team: String([...allTime].sort((a, b) => parseNumber(b['W%']?.toString().replace('%', '')) - parseNumber(a['W%']?.toString().replace('%', '')))[0]?.Team || '').trim(), value: String([...allTime].sort((a, b) => parseNumber(b['W%']?.toString().replace('%', '')) - parseNumber(a['W%']?.toString().replace('%', '')))[0]?.['W%'] || '') },
      mostPF: top('PF'),
      mostPoApps: top('Playoff Apps'),
      mostFinals: top('Finals'),
      mostTitles: top('Titles'),
      mostPoW: top('PO_W'),
      bestTenRS: { team: bestTenRS[0], value: bestTenRS[1] },
      bestTenTot: { team: bestTenTot[0], value: bestTenTot[1] },
      pr1All: { team: bestPR1All[0], value: bestPR1All[1] },
      pr1from21: { team: bestPR1_21[0], value: bestPR1_21[1] },
      pr1from23: { team: bestPR1_23[0], value: bestPR1_23[1] },
    }
  }, [allTime, history, games])

  // ── STREAK RECORDS ─────────────────────────────────────────────────
  const streakRecords = useMemo(() => {
    if (!allTime.length) return {}
    const parseStreak = (val) => parseNumber(String(val || '0').replace(/[WL]/i, ''))

    const bestWTotal = [...allTime].sort((a, b) => parseStreak(b['W Streak Total']) - parseStreak(a['W Streak Total']))[0]
    const bestWRS = [...allTime].sort((a, b) => parseStreak(b['W Streak RS']) - parseStreak(a['W Streak RS']))[0]
    const bestLTotal = [...allTime].sort((a, b) => parseStreak(b['L Streak Total']) - parseStreak(a['L Streak Total']))[0]
    const bestLRS = [...allTime].sort((a, b) => parseStreak(b['L Streak RS']) - parseStreak(a['L Streak RS']))[0]

    // Melhor streak em uma única temporada
    const seasonStreaks = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const streak = parseStreak(g?.Streak_Total)
      const key = `${team}|${season}`
      if (!seasonStreaks[key] || streak > seasonStreaks[key].streak)
        seasonStreaks[key] = { team, season, streak }
    })
    const allSeasonStreaks = Object.values(seasonStreaks).sort((a, b) => b.streak - a.streak)
    const bestSeasonW = allSeasonStreaks[0] || { team: '—', season: '—', streak: 0 }

    // Pior streak em uma única temporada
    const lSeasonStreaks = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const raw = String(g?.Streak_Total || '').trim()
      if (!raw.startsWith('L')) return
      const streak = parseStreak(raw)
      const key = `${team}|${season}`
      if (!lSeasonStreaks[key] || streak > lSeasonStreaks[key].streak)
        lSeasonStreaks[key] = { team, season, streak }
    })
    const bestSeasonL = Object.values(lSeasonStreaks).sort((a, b) => b.streak - a.streak)[0] || { team: '—', season: '—', streak: 0 }

    return {
      bestWTotal: { team: String(bestWTotal?.Team || '').trim(), value: String(bestWTotal?.['W Streak Total'] || '—') },
      bestWRS: { team: String(bestWRS?.Team || '').trim(), value: String(bestWRS?.['W Streak RS'] || '—') },
      bestLTotal: { team: String(bestLTotal?.Team || '').trim(), value: String(bestLTotal?.['L Streak Total'] || '—') },
      bestLRS: { team: String(bestLRS?.Team || '').trim(), value: String(bestLRS?.['L Streak RS'] || '—') },
      bestSeasonW,
      bestSeasonL,
    }
  }, [allTime, games])

  // ── GAME RECORDS ───────────────────────────────────────────────────
  const gameRecords = useMemo(() => {
    if (!games.length) return {}
    const regGames = games.filter(g => String(g?.GameStage || '').trim() === 'Reg Season')
    const poGames = games.filter(g => String(g?.GameStage || '').trim() === 'Playoffs')

    // Deduplicar — pega só um lado
    const dedup = (arr) => {
      const seen = new Set()
      return arr.filter(g => {
        const key = [String(g?.Season || ''), String(g?.Week || ''), String(g?.Team || ''), String(g?.Opponent || '')].sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const allDedup = dedup(games)
    const regDedup = dedup(regGames)
    const poDedup = dedup(poGames)

    const highest = (arr) => arr.reduce((best, g) => {
      const pf = parseNumber(g?.PF)
      return pf > (best?.pf ?? 0) ? { ...g, pf } : best
    }, null)

    const lowest = (arr) => arr.reduce((best, g) => {
      const pf = parseNumber(g?.PF)
      if (pf === 0) return best
      return pf < (best?.pf ?? 9999) ? { ...g, pf } : best
    }, null)

    const closest = (arr) => arr.reduce((best, g) => {
      const pf = parseNumber(g?.PF), pa = parseNumber(g?.PA)
      if (!pf || !pa) return best
      const margin = Math.abs(pf - pa)
      return margin < (best?.margin ?? 9999) ? { ...g, pf, pa, margin } : best
    }, null)

    const biggest = (arr) => arr.reduce((best, g) => {
      const pf = parseNumber(g?.PF), pa = parseNumber(g?.PA)
      if (pf <= pa) return best
      const margin = pf - pa
      return margin > (best?.margin ?? 0) ? { ...g, pf, pa, margin } : best
    }, null)

    const hAll = highest(allDedup)
    const hReg = highest(regDedup)
    const hPO = highest(poDedup)
    const lAll = lowest(allDedup)
    const cl = closest(allDedup)
    const big = biggest(allDedup)

    return { hAll, hReg, hPO, lAll, cl, big }
  }, [games])

  // ── SEASON RECORDS ─────────────────────────────────────────────────
  const seasonRecords = useMemo(() => {
    if (!history.length) return {}

    const byWin = [...history].sort((a, b) => parseNumber(b.RS_W) - parseNumber(a.RS_W))[0]
    const byLoss = [...history].sort((a, b) => parseNumber(b.RS_L) - parseNumber(a.RS_L))[0]
    const byPF = [...history].sort((a, b) => parseNumber(b.RS_PF) - parseNumber(a.RS_PF))[0]
    const byLowPF = [...history].filter(r => parseNumber(r.RS_PF) > 0).sort((a, b) => parseNumber(a.RS_PF) - parseNumber(b.RS_PF))[0]
    const byTotW = [...history].sort((a, b) => parseNumber(b.W) - parseNumber(a.W))[0]
    const byTotL = [...history].sort((a, b) => parseNumber(b.L) - parseNumber(a.L))[0]

    // Maior média de pontos por semana numa temporada
    const avgByTeamSeason = history.map(r => ({
      team: String(r?.Team || '').trim(),
      season: String(r?.Season || '').trim(),
      avgPF: parseNumber(r?.RS_GP) > 0 ? parseNumber(r?.RS_PF) / parseNumber(r?.RS_GP) : 0,
    })).filter(r => r.avgPF > 0).sort((a, b) => b.avgPF - a.avgPF)[0] || { team: '—', season: '—', avgPF: 0 }

    return { byWin, byLoss, byPF, byLowPF, byTotW, byTotL, avgByTeamSeason }
  }, [history])

  // ── RIVALRY RECORDS ────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => {
    if (!h2h.length) return {}
    const seen = new Set()
    const dedup = h2h.filter(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const key = [normalizeString(a), normalizeString(b)].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const mostGames = [...dedup].sort((a, b) => parseNumber(b.Games) - parseNumber(a.Games))[0]
    const parseStreak = (val) => parseNumber(String(val || '0').replace(/[WL]/gi, ''))
    const bestStreakA = [...dedup].sort((a, b) => parseStreak(b['Best Streak Team A']) - parseStreak(a['Best Streak Team A']))[0]
    const bestStreakB = [...dedup].sort((a, b) => parseStreak(b['Best Streak Team B']) - parseStreak(a['Best Streak Team B']))[0]

    // Mais equilibrado — menor diferença absoluta de wins
    const mostBalanced = [...dedup]
      .filter(r => parseNumber(r.Games) >= 6)
      .sort((a, b) => Math.abs(parseNumber(a['A Wins']) - parseNumber(a['B Wins'])) - Math.abs(parseNumber(b['A Wins']) - parseNumber(b['B Wins'])))[0]

    // Mais dominante — maior diferença
    const mostDominant = [...dedup].sort((a, b) =>
      Math.abs(parseNumber(b['A Wins']) - parseNumber(b['B Wins'])) - Math.abs(parseNumber(a['A Wins']) - parseNumber(a['B Wins']))
    )[0]

    // Maior margem média
    const parseMargin = (val) => parseNumber(String(val || '0').replace(',', '.'))
    const highestMargin = [...dedup].sort((a, b) => parseMargin(b['Avg Margin']) - parseMargin(a['Avg Margin']))[0]
    const lowestMargin = [...dedup].filter(r => parseMargin(r['Avg Margin']) > 0).sort((a, b) => parseMargin(a['Avg Margin']) - parseMargin(b['Avg Margin']))[0]

    // Melhor streak H2H (entre bestStreakA e bestStreakB)
    let bestH2HStreak = { teamA: '—', teamB: '—', streak: '—', streakVal: 0 }
    dedup.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const sA = parseStreak(r['Best Streak Team A'])
      const sB = parseStreak(r['Best Streak Team B'])
      if (sA > bestH2HStreak.streakVal) bestH2HStreak = { teamA: a, teamB: b, streak: String(r['Best Streak Team A']), streakVal: sA }
      if (sB > bestH2HStreak.streakVal) bestH2HStreak = { teamA: b, teamB: a, streak: String(r['Best Streak Team B']), streakVal: sB }
    })

    return { mostGames, bestStreakA, bestStreakB, mostBalanced, mostDominant, highestMargin, lowestMargin, bestH2HStreak }
  }, [h2h])

  // ── GLORY RECORDS ──────────────────────────────────────────────────
  const gloryRecords = useMemo(() => {
    if (!allTime.length || !history.length) return {}

    const champions = history
      .filter(r => String(r?.Champion || '').trim().toUpperCase() === 'TRUE')
      .sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    const unicorns = history
      .filter(r => parseNumber(r?.Standing) === history.filter(h => String(h?.Season || '').trim() === String(r?.Season || '').trim()).length)
      .sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    // Quem mais foi campeão
    const titleCount = {}
    champions.forEach(r => {
      const t = String(r?.Team || '').trim()
      titleCount[t] = (titleCount[t] || 0) + 1
    })
    const mostTitles = Object.entries(titleCount).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    // Quem mais foi ao Tapitas Bowl (Finals)
    const finalsCount = {}
    history.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim()
      finalsCount[t] = (finalsCount[t] || 0) + 1
    })
    const mostFinals = Object.entries(finalsCount).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    // Quem mais foi unicórnio
    const unicornCount = {}
    unicorns.forEach(r => {
      const t = String(r?.Team || '').trim()
      unicornCount[t] = (unicornCount[t] || 0) + 1
    })
    const mostUnicorn = Object.entries(unicornCount).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

    return { champions, unicorns, mostTitles, mostFinals, mostUnicorn }
  }, [allTime, history])

  const fmt = (g, field) => String(g?.[field] || '').trim()

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
      `}</style>

      <Header onSummaryOpen={() => setDrawerOpen(true)} />

      <section className="px-3 md:px-6 pb-20">

        {/* Hero com padrão geométrico */}
        <div
          className="relative mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10"
          style={{ background: '#020617', minHeight: '280px' }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="450" fill="#22d3ee" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 140)`} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z", "M460 85 L540 200 L460 315 L380 200 Z", "M540 -30 L620 85 L540 200 L460 85 Z", "M620 85 L700 200 L620 315 L540 200 Z", "M700 -30 L780 85 L700 200 L620 85 Z", "M780 85 L860 200 L780 315 L700 200 Z", "M860 -30 L940 85 L860 200 L780 85 Z"].map((d, i) => <path key={i} d={d} />)}
              </g>
              <g opacity="0.08" fill="#22d3ee">
                {["M420 30 L440 58 L420 86 L400 58 Z", "M580 30 L600 58 L580 86 L560 58 Z", "M740 30 L760 58 L740 86 L720 58 Z", "M500 120 L520 148 L500 176 L480 148 Z", "M660 120 L680 148 L660 176 L640 148 Z", "M820 120 L840 148 L820 176 L800 148 Z"].map((d, i) => <path key={i} d={d} />)}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                {[500, 540, 580, 620].map((x, i) => <polyline key={i} points={`${x},0 ${x + 140},140 ${x},280`} />)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,120 780,0" />
                <polygon points="900,280 900,160 780,280" />
                <polygon points="280,0 360,0 280,80" />
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30, 50, 70].map(r => <circle key={r} cx="860" cy="50" r={r} />)}
              </g>
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[70, 140, 210].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y} />)}
              </g>
              <text x="820" y="260" fontFamily="'Bebas Neue',sans-serif" fontSize="280" fill="#22d3ee" opacity="0.025" textAnchor="middle">REC</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.9) 48%, rgba(2,6,23,0.15) 100%)' }} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
              <Trophy className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Hall of Records</span>
            </div>
            <h1 className="mb-4 leading-[0.88]"
              style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(56px, 8vw, 100px)', letterSpacing: '0.02em' }}>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LEAGUE</span>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>RECORDS</span>
            </h1>
            <p className="max-w-lg text-base text-slate-400">The numbers that define a decade of glory, rivalry and heartbreak.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-6 py-4 text-sm font-black transition-all ${tab === t.key
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                <t.Icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] p-8">

            {/* ── FRANCHISE ── */}
            {tab === 'franchise' && (
              <>
                <RecordSection title="All-Time Wins & Losses">
                  <RecordCard label="Most Wins All-Time" value={franchiseRecords.mostWins?.value} sub={franchiseRecords.mostWins?.team} accent="gold" icon={Trophy} />
                  <RecordCard label="Most Losses All-Time" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.team} accent="red" icon={TrendingDown} />
                  <RecordCard label="Best Win %" value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.team} accent="cyan" icon={Target} />
                  <RecordCard label="Most Points All-Time" value={franchiseRecords.mostPF?.value && Math.round(franchiseRecords.mostPF.value).toLocaleString()} sub={franchiseRecords.mostPF?.team} accent="emerald" icon={Activity} />
                </RecordSection>
                <RecordSection title="Playoff Dominance">
                  <RecordCard label="Most Playoff Apps" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.team} accent="purple" icon={Star} />
                  <RecordCard label="Most Finals Apps" value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.team} accent="gold" icon={Trophy} />
                  <RecordCard label="Most Titles" value={franchiseRecords.mostTitles?.value} sub={franchiseRecords.mostTitles?.team} accent="gold" icon={Trophy} />
                  <RecordCard label="Most Playoff Wins" value={franchiseRecords.mostPoW?.value} sub={franchiseRecords.mostPoW?.team} accent="cyan" icon={TrendingUp} />
                </RecordSection>
                <RecordSection title="10-Win Seasons">
                  <RecordCard label="Most 10W Seasons (RS)" value={franchiseRecords.bestTenRS?.value} sub={franchiseRecords.bestTenRS?.team} accent="emerald" icon={Star} />
                  <RecordCard label="Most 10W Seasons (Total)" value={franchiseRecords.bestTenTot?.value} sub={franchiseRecords.bestTenTot?.team} accent="cyan" icon={Star} />
                </RecordSection>
                <RecordSection title="Power Rankings #1">
                  <RecordCard label="Most Weeks #1 (All-Time)" value={franchiseRecords.pr1All?.value} sub={franchiseRecords.pr1All?.team} sub2="All seasons" accent="gold" icon={Zap} />
                  <RecordCard label="Most Weeks #1 (2021+)" value={franchiseRecords.pr1from21?.value} sub={franchiseRecords.pr1from21?.team} sub2="Since 2021" accent="orange" icon={Zap} />
                  <RecordCard label="Most Weeks #1 (2023+)" value={franchiseRecords.pr1from23?.value} sub={franchiseRecords.pr1from23?.team} sub2="New era (2023+)" accent="cyan" icon={Zap} />
                </RecordSection>
              </>
            )}

            {/* ── STREAKS ── */}
            {tab === 'streaks' && (
              <>
                <RecordSection title="All-Time Win Streaks">
                  <RecordCard label="Best Winning Streak (Total)" value={streakRecords.bestWTotal?.value} sub={streakRecords.bestWTotal?.team} accent="gold" icon={Flame} />
                  <RecordCard label="Best Winning Streak (Reg Season)" value={streakRecords.bestWRS?.value} sub={streakRecords.bestWRS?.team} accent="emerald" icon={Flame} />
                </RecordSection>
                <RecordSection title="All-Time Losing Streaks">
                  <RecordCard label="Worst Losing Streak (Total)" value={streakRecords.bestLTotal?.value} sub={streakRecords.bestLTotal?.team} accent="red" icon={TrendingDown} />
                  <RecordCard label="Worst Losing Streak (Reg Season)" value={streakRecords.bestLRS?.value} sub={streakRecords.bestLRS?.team} accent="orange" icon={TrendingDown} />
                </RecordSection>
                <RecordSection title="Single Season Streaks">
                  <RecordCard label="Best Winning Streak in a Season" value={`W${streakRecords.bestSeasonW?.streak}`} sub={streakRecords.bestSeasonW?.team} sub2={streakRecords.bestSeasonW?.season} accent="gold" icon={Flame} />
                  <RecordCard label="Worst Losing Streak in a Season" value={`L${streakRecords.bestSeasonL?.streak}`} sub={streakRecords.bestSeasonL?.team} sub2={streakRecords.bestSeasonL?.season} accent="red" icon={TrendingDown} />
                </RecordSection>
              </>
            )}

            {/* ── GAMES ── */}
            {tab === 'games' && (
              <>
                <RecordSection title="Highest Scores">
                  <RecordCard label="Highest Score All-Time" value={gameRecords.hAll?.pf?.toFixed(2)} sub={fmt(gameRecords.hAll, 'Team')} sub2={`vs ${fmt(gameRecords.hAll, 'Opponent')} · W${fmt(gameRecords.hAll, 'Week')} ${fmt(gameRecords.hAll, 'Season')}`} accent="gold" icon={Flame} />
                  <RecordCard label="Highest Score Reg Season" value={gameRecords.hReg?.pf?.toFixed(2)} sub={fmt(gameRecords.hReg, 'Team')} sub2={`vs ${fmt(gameRecords.hReg, 'Opponent')} · W${fmt(gameRecords.hReg, 'Week')} ${fmt(gameRecords.hReg, 'Season')}`} accent="cyan" icon={Flame} />
                  <RecordCard label="Highest Score Playoffs" value={gameRecords.hPO?.pf?.toFixed(2)} sub={fmt(gameRecords.hPO, 'Team')} sub2={`vs ${fmt(gameRecords.hPO, 'Opponent')} · W${fmt(gameRecords.hPO, 'Week')} ${fmt(gameRecords.hPO, 'Season')}`} accent="purple" icon={Flame} />
                  <RecordCard label="Lowest Score All-Time" value={gameRecords.lAll?.pf?.toFixed(2)} sub={fmt(gameRecords.lAll, 'Team')} sub2={`vs ${fmt(gameRecords.lAll, 'Opponent')} · W${fmt(gameRecords.lAll, 'Week')} ${fmt(gameRecords.lAll, 'Season')}`} accent="red" icon={TrendingDown} />
                </RecordSection>
                <RecordSection title="Notable Games">
                  <RecordCard label="Closest Game (Smallest Margin)" value={gameRecords.cl?.margin?.toFixed(2)} sub={`${fmt(gameRecords.cl, 'Team')} vs ${fmt(gameRecords.cl, 'Opponent')}`} sub2={`W${fmt(gameRecords.cl, 'Week')} ${fmt(gameRecords.cl, 'Season')}`} accent="emerald" icon={Target} />
                  <RecordCard label="Biggest Win (Largest Margin)" value={gameRecords.big?.margin?.toFixed(2)} sub={`${fmt(gameRecords.big, 'Team')} vs ${fmt(gameRecords.big, 'Opponent')}`} sub2={`W${fmt(gameRecords.big, 'Week')} ${fmt(gameRecords.big, 'Season')}`} accent="orange" icon={Zap} />
                </RecordSection>
              </>
            )}

            {/* ── SEASONS ── */}
            {tab === 'seasons' && (
              <>
                <RecordSection title="Best & Worst Records in a Single Season">
                  <RecordCard label="Best RS Record" value={`${parseNumber(seasonRecords.byWin?.RS_W)}–${parseNumber(seasonRecords.byWin?.RS_L)}`} sub={String(seasonRecords.byWin?.Team || '').trim()} sub2={String(seasonRecords.byWin?.Season || '')} accent="gold" icon={Trophy} />
                  <RecordCard label="Worst RS Record" value={`${parseNumber(seasonRecords.byLoss?.RS_W)}–${parseNumber(seasonRecords.byLoss?.RS_L)}`} sub={String(seasonRecords.byLoss?.Team || '').trim()} sub2={String(seasonRecords.byLoss?.Season || '')} accent="red" icon={TrendingDown} />
                  <RecordCard label="Best Overall Record" value={`${parseNumber(seasonRecords.byTotW?.W)}–${parseNumber(seasonRecords.byTotW?.L)}`} sub={String(seasonRecords.byTotW?.Team || '').trim()} sub2={String(seasonRecords.byTotW?.Season || '')} accent="cyan" icon={Star} />
                  <RecordCard label="Worst Overall Record" value={`${parseNumber(seasonRecords.byTotL?.W)}–${parseNumber(seasonRecords.byTotL?.L)}`} sub={String(seasonRecords.byTotL?.Team || '').trim()} sub2={String(seasonRecords.byTotL?.Season || '')} accent="orange" icon={TrendingDown} />
                </RecordSection>
                <RecordSection title="Scoring Records in a Season">
                  <RecordCard label="Most Points in a Season (RS)" value={Math.round(parseNumber(seasonRecords.byPF?.RS_PF)).toLocaleString()} sub={String(seasonRecords.byPF?.Team || '').trim()} sub2={String(seasonRecords.byPF?.Season || '')} accent="gold" icon={Flame} />
                  <RecordCard label="Fewest Points in a Season (RS)" value={Math.round(parseNumber(seasonRecords.byLowPF?.RS_PF)).toLocaleString()} sub={String(seasonRecords.byLowPF?.Team || '').trim()} sub2={String(seasonRecords.byLowPF?.Season || '')} accent="red" icon={TrendingDown} />
                  <RecordCard label="Best Avg Points/Week in a Season" value={seasonRecords.avgByTeamSeason?.avgPF?.toFixed(2)} sub={seasonRecords.avgByTeamSeason?.team} sub2={seasonRecords.avgByTeamSeason?.season} accent="emerald" icon={Activity} />
                </RecordSection>
              </>
            )}

            {/* ── RIVALRY ── */}
            {tab === 'rivalry' && (
              <>
                <RecordSection title="Most Played">
                  <RecordCard label="Most H2H Games" value={parseNumber(rivalryRecords.mostGames?.Games)} sub={`${String(rivalryRecords.mostGames?.['Team A'] || '').trim()} vs ${String(rivalryRecords.mostGames?.['Team B'] || '').trim()}`} sub2={`${parseNumber(rivalryRecords.mostGames?.['A Wins'])}–${parseNumber(rivalryRecords.mostGames?.['B Wins'])}`} accent="gold" icon={Swords} wide />
                </RecordSection>
                <RecordSection title="H2H Streaks">
                  <RecordCard label="Longest H2H Winning Streak" value={rivalryRecords.bestH2HStreak?.streak} sub={rivalryRecords.bestH2HStreak?.teamA} sub2={`vs ${rivalryRecords.bestH2HStreak?.teamB}`} accent="gold" icon={Flame} wide />
                </RecordSection>
                <RecordSection title="Dominance & Balance">
                  <RecordCard label="Most Balanced Rivalry" value={`${parseNumber(rivalryRecords.mostBalanced?.['A Wins'])}–${parseNumber(rivalryRecords.mostBalanced?.['B Wins'])}`} sub={`${String(rivalryRecords.mostBalanced?.['Team A'] || '').trim()} vs ${String(rivalryRecords.mostBalanced?.['Team B'] || '').trim()}`} accent="emerald" icon={Target} />
                  <RecordCard label="Most Dominant Rivalry" value={`${parseNumber(rivalryRecords.mostDominant?.['A Wins'])}–${parseNumber(rivalryRecords.mostDominant?.['B Wins'])}`} sub={`${String(rivalryRecords.mostDominant?.['Team A'] || '').trim()} vs ${String(rivalryRecords.mostDominant?.['Team B'] || '').trim()}`} accent="orange" icon={Zap} />
                  <RecordCard label="Highest Avg Margin H2H" value={`${String(rivalryRecords.highestMargin?.['Avg Margin'] || '').trim()} pts`} sub={`${String(rivalryRecords.highestMargin?.['Team A'] || '').trim()} vs ${String(rivalryRecords.highestMargin?.['Team B'] || '').trim()}`} accent="red" icon={TrendingUp} />
                  <RecordCard label="Closest Avg Margin H2H" value={`${String(rivalryRecords.lowestMargin?.['Avg Margin'] || '').trim()} pts`} sub={`${String(rivalryRecords.lowestMargin?.['Team A'] || '').trim()} vs ${String(rivalryRecords.lowestMargin?.['Team B'] || '').trim()}`} accent="cyan" icon={Target} />
                </RecordSection>
              </>
            )}

            {/* ── GLORY ── */}
            {tab === 'glory' && (
              <>
                <RecordSection title="Championship Leaders">
                  <RecordCard label="Most Titles" value={gloryRecords.mostTitles?.[1]} sub={gloryRecords.mostTitles?.[0]} accent="gold" icon={Trophy} />
                  <RecordCard label="Most Finals Apps" value={gloryRecords.mostFinals?.[1]} sub={gloryRecords.mostFinals?.[0]} accent="purple" icon={Star} />
                  <RecordCard label="Most Unicorn Years 🦄" value={gloryRecords.mostUnicorn?.[1]} sub={gloryRecords.mostUnicorn?.[0]} accent="slate" icon={TrendingDown} />
                </RecordSection>

                {/* Champions por ano */}
                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Champions</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 mb-8">
                  {gloryRecords.champions?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-yellow-400/20 bg-yellow-400/5 p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">🏆 {String(r?.Season || '').trim()}</div>
                      <div className="text-lg font-black text-white leading-tight">{String(r?.Team || '').trim()}</div>
                      <div className="mt-1 text-xs text-slate-500">{parseNumber(r?.W)}–{parseNumber(r?.L)} overall</div>
                    </div>
                  ))}
                </div>

                {/* Unicórnios por ano */}
                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Unicorns 🦄</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {gloryRecords.unicorns?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-white/5 bg-white/[0.02] p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">🦄 {String(r?.Season || '').trim()}</div>
                      <div className="text-lg font-black text-slate-400 leading-tight">{String(r?.Team || '').trim()}</div>
                      <div className="mt-1 text-xs text-slate-600">{parseNumber(r?.RS_W)}–{parseNumber(r?.RS_L)} reg season</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={24} height={24} style={{ filter: 'invert(1)' }} className="opacity-30" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
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
