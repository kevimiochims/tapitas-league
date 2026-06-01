'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo } from 'react'
import { Trophy, Flame, Swords, Activity, Star, Zap, Shield, Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseMarginVal(val) {
  const cleaned = String(val || '0').replace(',', '.').replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
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

function RecordCard({ label, value, sub, sub2, accent, icon: Icon, top5, wide }) {
  const [expanded, setExpanded] = useState(false)

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

  const subArr = Array.isArray(sub) ? sub : sub ? [sub] : []

  return (
    <div className={`rounded-[24px] border transition-all ${a.border} ${a.bg} ${wide ? 'col-span-2' : ''}`}>
      <div className="p-5 md:p-6">
        {Icon && (
          <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${a.icon}`}>
            <Icon className={`h-5 w-5 ${a.text}`} />
          </div>
        )}
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <div className={`font-black leading-none ${a.text}`}
          style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(32px, 4vw, 56px)' }}>
          {value}
        </div>
        {subArr.length > 0 && (
          <div className="mt-3 flex flex-col gap-0.5">
            {subArr.map((s, i) => (
              <div key={i} className="font-black text-white" style={{ fontSize: 'clamp(12px, 1.4vw, 16px)' }}>{s}</div>
            ))}
          </div>
        )}
        {sub2 && <div className="mt-1 text-xs text-slate-500">{sub2}</div>}
      </div>

      {top5 && top5.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex w-full items-center justify-between border-t border-white/5 px-5 py-3 text-left transition-all hover:bg-white/[0.02]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {expanded ? 'Hide' : 'Show Top 5'}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />}
          </button>
          {expanded && (
            <div className="border-t border-white/5 px-5 pb-4">
              {top5.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className={`text-xs font-black flex-shrink-0 w-4 ${i === 0 ? a.text : 'text-slate-600'}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white leading-tight">
                        {Array.isArray(item.label) ? item.label.join(', ') : item.label}
                      </div>
                      {item.sub && <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.sub}</div>}
                    </div>
                  </div>
                  <span className={`text-sm font-black flex-shrink-0 ${i === 0 ? a.text : 'text-slate-400'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RecordSection({ title, children }) {
  return (
    <div className="mb-10">
      <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">{title}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

  // ── FRANCHISE ──────────────────────────────────────────────────────
  const franchiseRecords = useMemo(() => {
    if (!allTime.length) return {}

    const topN = (arr, key, n = 5, asc = false, fmt = v => v) => {
      const sorted = [...arr].sort((a, b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      const winners = sorted.filter(r => parseNumber(r[key]) === topVal).map(r => String(r.Team || '').trim())
      return {
        value: fmt(topVal),
        teams: winners,
        top5: sorted.slice(0, n).map(r => ({ label: String(r.Team || '').trim(), value: fmt(parseNumber(r[key])) }))
      }
    }

    const parseWinPct = r => parseNumber(String(r?.['W%'] || '0').replace('%', ''))
    const sortedByWP = [...allTime].sort((a, b) => parseWinPct(b) - parseWinPct(a))
    const topWP = parseWinPct(sortedByWP[0])
    const bestWinPct = {
      value: String(sortedByWP[0]?.['W%'] || ''),
      teams: sortedByWP.filter(r => parseWinPct(r) === topWP).map(r => String(r.Team || '').trim()),
      top5: sortedByWP.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), value: String(r['W%'] || '') }))
    }

    // 10W seasons
    const tenWSeasons = {}, tenWTotal = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      if (parseNumber(r?.RS_W) >= 10) tenWSeasons[team] = (tenWSeasons[team] || 0) + 1
      if (parseNumber(r?.W) >= 10) tenWTotal[team] = (tenWTotal[team] || 0) + 1
    })
    const mkObj = obj => {
      const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1])
      const topVal = sorted[0]?.[1] || 0
      return { value: topVal, teams: sorted.filter(e => e[1] === topVal).map(e => e[0]), top5: sorted.slice(0, 5).map(([l, v]) => ({ label: l, value: v })) }
    }

    // PR #1 weeks
    const pr1All = {}, pr1from21 = {}, pr1from23 = {}
    games.forEach(g => {
      if (parseNumber(g?.['Power Ranking']) !== 1) return
      const team = String(g?.Team || '').trim()
      const season = Number(String(g?.Season || '0').trim())
      pr1All[team] = (pr1All[team] || 0) + 1
      if (season >= 2021) pr1from21[team] = (pr1from21[team] || 0) + 1
      if (season >= 2023) pr1from23[team] = (pr1from23[team] || 0) + 1
    })

    return {
      mostWins: topN(allTime, 'W'),
      mostLosses: topN(allTime, 'L'),
      bestWinPct,
      mostPF: topN(allTime, 'PF', 5, false, v => Math.round(v).toLocaleString()),
      mostPoApps: topN(allTime, 'Playoff Apps'),
      mostFinals: topN(allTime, 'Finals'),
      mostTitles: topN(allTime, 'Titles'),
      mostPoW: topN(allTime, 'PO_W'),
      topTenRS: mkObj(tenWSeasons),
      topTenTot: mkObj(tenWTotal),
      pr1All: mkObj(pr1All),
      pr1from21: mkObj(pr1from21),
      pr1from23: mkObj(pr1from23),
    }
  }, [allTime, history, games])

  // ── STREAKS ────────────────────────────────────────────────────────
  const streakRecords = useMemo(() => {
    if (!allTime.length || !games.length) return {}

    const parseStrVal = val => parseNumber(String(val || '0').replace(/[WL]/i, ''))

    const mkStreakTop = key => {
      const sorted = [...allTime].sort((a, b) => parseStrVal(b[key]) - parseStrVal(a[key]))
      const topVal = parseStrVal(sorted[0]?.[key])
      return {
        value: String(sorted[0]?.[key] || '—'),
        teams: sorted.filter(r => parseStrVal(r[key]) === topVal).map(r => String(r.Team || '').trim()),
        top5: sorted.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), value: String(r[key] || '') }))
      }
    }

    // Single season — calcula pela coluna Result
    const byTeamSeason = {}
    games.forEach(g => {
      const team = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const key = `${team}|${season}`
      if (!byTeamSeason[key]) byTeamSeason[key] = []
      byTeamSeason[key].push({
        week: parseFloat(String(g?.Week || '0').replace(/[^0-9.]/g, '')) || 0,
        result: String(g?.Result || '').trim().toUpperCase(),
        team, season,
      })
    })

    const seasonWList = [], seasonLList = []

    Object.entries(byTeamSeason).forEach(([, gamesArr]) => {
      const sorted = gamesArr.sort((a, b) => a.week - b.week)
      const { team, season } = sorted[0]

      let curW = 0, maxW = 0, curL = 0, maxL = 0
      sorted.forEach(g => {
        if (g.result === 'W') { curW++; curL = 0; if (curW > maxW) maxW = curW }
        else if (g.result === 'L') { curL++; curW = 0; if (curL > maxL) maxL = curL }
      })

      if (maxW > 0) seasonWList.push({ team, season, val: maxW, display: `W${maxW}` })
      if (maxL > 0) seasonLList.push({ team, season, val: maxL, display: `L${maxL}` })
    })

    seasonWList.sort((a, b) => b.val - a.val)
    seasonLList.sort((a, b) => b.val - a.val)

    const topWVal = seasonWList[0]?.val || 0
    const topLVal = seasonLList[0]?.val || 0

    const bestSeasonW = {
      value: seasonWList[0]?.display || '—',
      teams: seasonWList.filter(r => r.val === topWVal).map(r => `${r.team} (${r.season})`),
      top5: seasonWList.slice(0, 5).map(r => ({ label: r.team, sub: r.season, value: r.display }))
    }
    const bestSeasonL = {
      value: seasonLList[0]?.display || '—',
      teams: seasonLList.filter(r => r.val === topLVal).map(r => `${r.team} (${r.season})`),
      top5: seasonLList.slice(0, 5).map(r => ({ label: r.team, sub: r.season, value: r.display }))
    }

    return {
      bestWTotal: mkStreakTop('W Streak Total'),
      bestWRS: mkStreakTop('W Streak RS'),
      bestLTotal: mkStreakTop('L Streak Total'),
      bestLRS: mkStreakTop('L Streak RS'),
      bestSeasonW,
      bestSeasonL,
    }
  }, [allTime, games])

  // ── GAMES ──────────────────────────────────────────────────────────
  const gameRecords = useMemo(() => {
    if (!games.length) return {}

    const isDoubleWeek = g => { const w = String(g?.Week || ''); return w.includes('-') || w.includes('&') }

    const dedup = arr => {
      const seen = new Set()
      return arr.filter(g => {
        const key = [String(g?.Season || ''), String(g?.Week || ''), String(g?.Team || ''), String(g?.Opponent || '')].sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const allDedup = dedup(games)
    const regDedup = dedup(games.filter(g => String(g?.GameStage || '').trim() === 'Reg Season'))
    const poDedup = dedup(games.filter(g => String(g?.GameStage || '').trim() === 'Playoffs'))
    const noDouble = allDedup.filter(g => !isDoubleWeek(g))
    const regNoDb = regDedup.filter(g => !isDoubleWeek(g))
    const poNoDb = poDedup.filter(g => !isDoubleWeek(g))

    const mkHighest = arr => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a, b) => parseNumber(b.PF) - parseNumber(a.PF))
      const topVal = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team || '').trim()),
        sub2: sorted[0] ? `vs ${String(sorted[0].Opponent || '').trim()} · W${sorted[0].Week} ${sorted[0].Season}` : '',
        top5: sorted.slice(0, 5).map(g => ({ label: String(g.Team || '').trim(), sub: `vs ${String(g.Opponent || '').trim()} · W${g.Week} ${g.Season}`, value: parseNumber(g.PF).toFixed(2) }))
      }
    }

    const mkLowest = arr => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a, b) => parseNumber(a.PF) - parseNumber(b.PF))
      const topVal = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team || '').trim()),
        sub2: sorted[0] ? `vs ${String(sorted[0].Opponent || '').trim()} · W${sorted[0].Week} ${sorted[0].Season}` : '',
        top5: sorted.slice(0, 5).map(g => ({ label: String(g.Team || '').trim(), sub: `vs ${String(g.Opponent || '').trim()} · W${g.Week} ${g.Season}`, value: parseNumber(g.PF).toFixed(2) }))
      }
    }

    const mkClosest = arr => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > 0 && parseNumber(g?.PA) > 0)
        .map(g => ({ ...g, margin: Math.abs(parseNumber(g.PF) - parseNumber(g.PA)) }))
        .sort((a, b) => a.margin - b.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => Math.abs(g.margin - topVal) < 0.001).map(g => `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`),
        sub2: sorted[0] ? `W${sorted[0].Week} ${sorted[0].Season}` : '',
        top5: sorted.slice(0, 5).map(g => ({ label: `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`, sub: `W${g.Week} ${g.Season}`, value: g.margin.toFixed(2) }))
      }
    }

    const mkBiggest = arr => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > parseNumber(g?.PA))
        .map(g => ({ ...g, margin: parseNumber(g.PF) - parseNumber(g.PA) }))
        .sort((a, b) => b.margin - a.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => Math.abs(g.margin - topVal) < 0.001).map(g => `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`),
        sub2: sorted[0] ? `W${sorted[0].Week} ${sorted[0].Season}` : '',
        top5: sorted.slice(0, 5).map(g => ({ label: `${String(g.Team || '').trim()} vs ${String(g.Opponent || '').trim()}`, sub: `W${g.Week} ${g.Season}`, value: g.margin.toFixed(2) }))
      }
    }

    return {
      highAll: mkHighest(allDedup),
      highNoDouble: mkHighest(noDouble),
      highReg: mkHighest(regDedup),
      highRegNoDb: mkHighest(regNoDb),
      highPO: mkHighest(poDedup),
      highPONoDb: mkHighest(poNoDb),
      lowAll: mkLowest(allDedup),
      lowNoDouble: mkLowest(noDouble),
      closestAll: mkClosest(allDedup),
      closestNoDouble: mkClosest(noDouble),
      biggestAll: mkBiggest(allDedup),
      biggestNoDouble: mkBiggest(noDouble),
    }
  }, [games])

  // ── SEASONS ────────────────────────────────────────────────────────
  const seasonRecords = useMemo(() => {
    if (!history.length) return {}

    const mkTop = (arr, key, n = 5, asc = false, fmt = v => v) => {
      const sorted = [...arr].filter(r => parseNumber(r[key]) > 0).sort((a, b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      return {
        value: sorted[0],
        topVal,
        teams: sorted.filter(r => parseNumber(r[key]) === topVal).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, n).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: fmt(parseNumber(r[key])) }))
      }
    }

    const from21 = history.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const from23 = history.filter(r => Number(String(r?.Season || '0')) >= 2023)

    // Avg pts/week
    const withAvg = history.map(r => ({
      ...r,
      avgPF: parseNumber(r?.RS_GP) > 0 ? parseNumber(r?.RS_PF) / parseNumber(r?.RS_GP) : 0
    })).filter(r => r.avgPF > 0)

    const withAvg21 = withAvg.filter(r => Number(String(r?.Season || '0')) >= 2021)
    const withAvg23 = withAvg.filter(r => Number(String(r?.Season || '0')) >= 2023)

    const mkAvg = arr => {
      const sorted = [...arr].sort((a, b) => b.avgPF - a.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: r.avgPF.toFixed(2) }))
      }
    }

    const mkAvgLow = arr => {
      const sorted = [...arr].sort((a, b) => a.avgPF - b.avgPF)
      const topVal = sorted[0]?.avgPF || 0
      return {
        value: sorted[0],
        avgVal: topVal,
        teams: sorted.filter(r => Math.abs(r.avgPF - topVal) < 0.001).map(r => `${String(r.Team || '').trim()} (${String(r.Season || '')})`),
        top5: sorted.slice(0, 5).map(r => ({ label: String(r.Team || '').trim(), sub: String(r.Season || ''), value: r.avgPF.toFixed(2) }))
      }
    }

    return {
      byWin: mkTop(history, 'RS_W'),
      byLoss: mkTop(history, 'RS_L'),
      byTotW: mkTop(history, 'W'),
      byTotL: mkTop(history, 'L'),
      byPF: mkTop(history, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byPF21: mkTop(from21, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byPF23: mkTop(from23, 'RS_PF', 5, false, v => Math.round(v).toLocaleString()),
      byLowPF: mkTop(history, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      byLow21: mkTop(from21, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      byLow23: mkTop(from23, 'RS_PF', 5, true, v => Math.round(v).toLocaleString()),
      avgHigh: mkAvg(withAvg),
      avgHigh21: mkAvg(withAvg21),
      avgHigh23: mkAvg(withAvg23),
      avgLow: mkAvgLow(withAvg),
      avgLow21: mkAvgLow(withAvg21),
      avgLow23: mkAvgLow(withAvg23),
    }
  }, [history])

  // ── RIVALRY ────────────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => {
    if (!h2h.length) return {}
    const seen = new Set()
    const dedup = h2h.filter(r => {
      const key = [normalizeString(r?.['Team A'] || ''), normalizeString(r?.['Team B'] || '')].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const parseStreakVal = val => {
      const m = String(val || '').match(/^[WL](\d+)/)
      return m ? parseInt(m[1]) : 0
    }

    // Most games
    const mgSorted = [...dedup].sort((a, b) => parseNumber(b.Games) - parseNumber(a.Games))
    const topMG = parseNumber(mgSorted[0]?.Games)
    const mostGames = {
      value: topMG,
      teams: mgSorted.filter(r => parseNumber(r.Games) === topMG).map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      top5: mgSorted.slice(0, 5).map(r => ({ label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`, value: parseNumber(r.Games) }))
    }

    // Best H2H streak — compara todas as linhas corretamente
    const allStreaks = []
    dedup.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const sA = String(r?.['Best Streak Team A'] || '').trim()
      const sB = String(r?.['Best Streak Team B'] || '').trim()
      const vA = parseStreakVal(sA)
      const vB = parseStreakVal(sB)
      if (sA && vA > 0) allStreaks.push({ team: a, opponent: b, streak: sA, val: vA })
      if (sB && vB > 0) allStreaks.push({ team: b, opponent: a, streak: sB, val: vB })
    })
    allStreaks.sort((a, b) => b.val - a.val)
    const topSV = allStreaks[0]?.val || 0
    const bestH2HStreak = {
      value: allStreaks[0]?.streak || '—',
      teams: allStreaks.filter(s => s.val === topSV).map(s => `vs ${s.opponent}`),
      top5: allStreaks.slice(0, 5).map(s => ({ label: s.team, sub: `vs ${s.opponent}`, value: s.streak }))
    }

    // Most balanced
    const balSorted = [...dedup]
      .filter(r => parseNumber(r.Games) >= 6)
      .map(r => ({
        ...r,
        diff: Math.abs(parseNumber(r['A Wins']) - parseNumber(r['B Wins'])),
        recA: parseNumber(r['A Wins']),
        recB: parseNumber(r['B Wins']),
      }))
      .sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff
        // Desempate: mais jogos = mais equilibrado
        return parseNumber(b.Games) - parseNumber(a.Games)
      })

    const topRec = `${balSorted[0]?.recA}–${balSorted[0]?.recB}`

    const mostBalanced = {
      value: topRec,
      // Só mostra no sub os que têm exatamente o mesmo record (ex: ambos 4-4)
      teams: balSorted
        .filter(r => r.recA === balSorted[0].recA && r.recB === balSorted[0].recB)
        .map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      top5: balSorted.slice(0, 5).map(r => ({
        label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`,
        value: `${r.recA}–${r.recB}`
      }))
    }

    // Highest avg margin
    const hmSorted = [...dedup].sort((a, b) => parseMarginVal(b['Avg Margin']) - parseMarginVal(a['Avg Margin']))
    const topHM = parseMarginVal(hmSorted[0]?.['Avg Margin'])
    const highestMargin = {
      value: `${String(hmSorted[0]?.['Avg Margin'] || '').trim()} pts`,
      teams: hmSorted.filter(r => Math.abs(parseMarginVal(r['Avg Margin']) - topHM) < 0.01).map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      top5: hmSorted.slice(0, 5).map(r => ({ label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`, value: `${String(r['Avg Margin'] || '').trim()} pts` }))
    }

    // Lowest avg margin — sorted ascending
    const lmSorted = [...dedup]
      .filter(r => parseMarginVal(r['Avg Margin']) > 0)
      .sort((a, b) => parseMarginVal(a['Avg Margin']) - parseMarginVal(b['Avg Margin']))
    const topLM = parseMarginVal(lmSorted[0]?.['Avg Margin'])
    const lowestMargin = {
      value: `${String(lmSorted[0]?.['Avg Margin'] || '').trim()} pts`,
      teams: lmSorted.filter(r => Math.abs(parseMarginVal(r['Avg Margin']) - topLM) < 0.01).map(r => `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`),
      top5: lmSorted.slice(0, 5).map(r => ({ label: `${String(r['Team A'] || '').trim()} vs ${String(r['Team B'] || '').trim()}`, value: `${String(r['Avg Margin'] || '').trim()} pts` }))
    }

    return { mostGames, bestH2HStreak, mostBalanced, highestMargin, lowestMargin }
  }, [h2h])

  // ── GLORY ──────────────────────────────────────────────────────────
  const gloryRecords = useMemo(() => {
    if (!history.length) return {}

    const champions = history
      .filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE')
      .sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    // Unicórnios — último colocado por temporada
    const unicorns = []
    const seasonGroups = {}
    history.forEach(r => {
      const s = String(r?.Season || '').trim()
      if (!seasonGroups[s]) seasonGroups[s] = []
      seasonGroups[s].push(r)
    })
    Object.entries(seasonGroups).forEach(([season, rows]) => {
      const total = rows.length
      // Tenta usar Standing primeiro
      const byStanding = rows.filter(r => parseNumber(r?.Standing) > 0)
      if (byStanding.length > 0) {
        const last = byStanding.sort((a, b) => parseNumber(b.Standing) - parseNumber(a.Standing))[0]
        if (parseNumber(last.Standing) === total) { unicorns.push(last); return }
      }
      // Fallback: menor RS_W e maior RS_L
      const sorted = [...rows].sort((a, b) => {
        const wDiff = parseNumber(a.RS_W) - parseNumber(b.RS_W)
        if (wDiff !== 0) return wDiff
        return parseNumber(b.RS_L) - parseNumber(a.RS_L)
      })
      if (sorted[0]) unicorns.push(sorted[0])
    })
    unicorns.sort((a, b) => Number(String(b?.Season || '0')) - Number(String(a?.Season || '0')))

    // Counts + anos
    const titleYears = {}, finalsYears = {}, unicornYears = {}
    champions.forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!titleYears[t]) titleYears[t] = []
      titleYears[t].push(s)
    })
    history.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE').forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!finalsYears[t]) finalsYears[t] = []
      finalsYears[t].push(s)
    })
    unicorns.forEach(r => {
      const t = String(r?.Team || '').trim(); const s = String(r?.Season || '').trim()
      if (!unicornYears[t]) unicornYears[t] = []
      unicornYears[t].push(s)
    })

    const mkGlory = (yearsObj) => {
      const entries = Object.entries(yearsObj).map(([team, years]) => ({ team, count: years.length, years: years.sort() }))
      entries.sort((a, b) => b.count - a.count)
      const topVal = entries[0]?.count || 0
      const top5thresh = entries[4]?.count || 0
      // Mostra todos os empatados com o 5º lugar
      const showAll = entries.filter(e => e.count >= top5thresh)
      return {
        value: topVal,
        teams: entries.filter(e => e.count === topVal).map(e => e.team),
        top5: showAll.map(e => ({ label: e.team, sub: e.years.join(', '), value: e.count }))
      }
    }

    return {
      champions,
      unicorns,
      mostTitles: mkGlory(titleYears),
      mostFinals: mkGlory(finalsYears),
      mostUnicorn: mkGlory(unicornYears),
    }
  }, [history])

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">Tapitas<span className="text-cyan-400">League</span></span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'Records', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            const isActive = item === 'Records'
            return (
              <a key={item} href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >{item}</a>
            )
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10" style={{ background: '#020617', minHeight: '280px' }}>
          <div className="absolute inset-0 overflow-hidden rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect key={i} x={x} y="-80" width={i % 2 === 0 ? 55 : 22} height="450" fill="#22d3ee" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 140)`} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z", "M460 85 L540 200 L460 315 L380 200 Z", "M540 -30 L620 85 L540 200 L460 85 Z", "M620 85 L700 200 L620 315 L540 200 Z", "M700 -30 L780 85 L700 200 L620 85 Z", "M780 85 L860 200 L780 315 L700 200 Z"].map((d, i) => <path key={i} d={d} />)}
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
          <div className="relative z-10 p-10 md:p-14">
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
                className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-6 py-4 text-sm font-black transition-all ${tab === t.key ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
              >
                <t.Icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] p-8">

            {/* FRANCHISE */}
            {tab === 'franchise' && (
              <>
                <RecordSection title="All-Time Wins & Losses">
                  <RecordCard label="Most Wins All-Time" value={franchiseRecords.mostWins?.value} sub={franchiseRecords.mostWins?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostWins?.top5} />
                  <RecordCard label="Most Losses All-Time" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.teams} accent="red" icon={TrendingDown} top5={franchiseRecords.mostLosses?.top5} />
                  <RecordCard label="Best Win % All-Time" value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.teams} accent="cyan" icon={Target} top5={franchiseRecords.bestWinPct?.top5} />
                  <RecordCard label="Most Points All-Time" value={franchiseRecords.mostPF?.value} sub={franchiseRecords.mostPF?.teams} accent="emerald" icon={Activity} top5={franchiseRecords.mostPF?.top5} />
                </RecordSection>
                <RecordSection title="Playoff Dominance">
                  <RecordCard label="Most Playoff Apps" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.teams} accent="purple" icon={Star} top5={franchiseRecords.mostPoApps?.top5} />
                  <RecordCard label="Most Finals Apps" value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostFinals?.top5} />
                  <RecordCard label="Most Titles" value={franchiseRecords.mostTitles?.value} sub={franchiseRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={franchiseRecords.mostTitles?.top5} />
                  <RecordCard label="Most Playoff Wins" value={franchiseRecords.mostPoW?.value} sub={franchiseRecords.mostPoW?.teams} accent="cyan" icon={TrendingUp} top5={franchiseRecords.mostPoW?.top5} />
                </RecordSection>
                <RecordSection title="10-Win Seasons">
                  <RecordCard label="Most 10W Seasons (RS)" value={franchiseRecords.topTenRS?.value} sub={franchiseRecords.topTenRS?.teams} accent="emerald" icon={Star} top5={franchiseRecords.topTenRS?.top5} />
                  <RecordCard label="Most 10W Seasons (Total)" value={franchiseRecords.topTenTot?.value} sub={franchiseRecords.topTenTot?.teams} accent="cyan" icon={Star} top5={franchiseRecords.topTenTot?.top5} />
                </RecordSection>
                <RecordSection title="Power Rankings — Most Weeks at #1">
                  <RecordCard label="All-Time" value={franchiseRecords.pr1All?.value} sub={franchiseRecords.pr1All?.teams} sub2="All seasons" accent="gold" icon={Zap} top5={franchiseRecords.pr1All?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.pr1from21?.value} sub={franchiseRecords.pr1from21?.teams} sub2="From 2021 on" accent="orange" icon={Zap} top5={franchiseRecords.pr1from21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.pr1from23?.value} sub={franchiseRecords.pr1from23?.teams} sub2="New era (2023+)" accent="cyan" icon={Zap} top5={franchiseRecords.pr1from23?.top5} />
                </RecordSection>
              </>
            )}

            {/* STREAKS */}
            {tab === 'streaks' && (
              <>
                <RecordSection title="All-Time Win Streaks">
                  <RecordCard label="Best Winning Streak (Total)" value={streakRecords.bestWTotal?.value} sub={streakRecords.bestWTotal?.teams} accent="gold" icon={Flame} top5={streakRecords.bestWTotal?.top5} />
                  <RecordCard label="Best Winning Streak (Reg Season)" value={streakRecords.bestWRS?.value} sub={streakRecords.bestWRS?.teams} accent="emerald" icon={Flame} top5={streakRecords.bestWRS?.top5} />
                </RecordSection>
                <RecordSection title="All-Time Loss Streaks">
                  <RecordCard label="Worst Losing Streak (Total)" value={streakRecords.bestLTotal?.value} sub={streakRecords.bestLTotal?.teams} accent="red" icon={TrendingDown} top5={streakRecords.bestLTotal?.top5} />
                  <RecordCard label="Worst Losing Streak (Reg Season)" value={streakRecords.bestLRS?.value} sub={streakRecords.bestLRS?.teams} accent="orange" icon={TrendingDown} top5={streakRecords.bestLRS?.top5} />
                </RecordSection>
                <RecordSection title="Single Season Streaks">
                  <RecordCard label="Best Win Streak in a Single Season" value={streakRecords.bestSeasonW?.value} sub={streakRecords.bestSeasonW?.teams} accent="gold" icon={Flame} top5={streakRecords.bestSeasonW?.top5} />
                  <RecordCard label="Worst Loss Streak in a Single Season" value={streakRecords.bestSeasonL?.value} sub={streakRecords.bestSeasonL?.teams} accent="red" icon={TrendingDown} top5={streakRecords.bestSeasonL?.top5} />
                </RecordSection>
              </>
            )}

            {/* GAMES */}
            {tab === 'games' && (
              <>
                <RecordSection title="Highest Scores — Including Double Weeks">
                  <RecordCard label="All-Time" value={gameRecords.highAll?.value} sub={gameRecords.highAll?.teams} sub2={gameRecords.highAll?.sub2} accent="gold" icon={Flame} top5={gameRecords.highAll?.top5} />
                  <RecordCard label="Reg Season" value={gameRecords.highReg?.value} sub={gameRecords.highReg?.teams} sub2={gameRecords.highReg?.sub2} accent="cyan" icon={Flame} top5={gameRecords.highReg?.top5} />
                  <RecordCard label="Playoffs" value={gameRecords.highPO?.value} sub={gameRecords.highPO?.teams} sub2={gameRecords.highPO?.sub2} accent="purple" icon={Flame} top5={gameRecords.highPO?.top5} />
                </RecordSection>
                <RecordSection title="Highest Scores — Single Weeks Only">
                  <RecordCard label="All-Time" value={gameRecords.highNoDouble?.value} sub={gameRecords.highNoDouble?.teams} sub2={gameRecords.highNoDouble?.sub2} accent="gold" icon={Flame} top5={gameRecords.highNoDouble?.top5} />
                  <RecordCard label="Reg Season" value={gameRecords.highRegNoDb?.value} sub={gameRecords.highRegNoDb?.teams} sub2={gameRecords.highRegNoDb?.sub2} accent="cyan" icon={Flame} top5={gameRecords.highRegNoDb?.top5} />
                  <RecordCard label="Playoffs" value={gameRecords.highPONoDb?.value} sub={gameRecords.highPONoDb?.teams} sub2={gameRecords.highPONoDb?.sub2} accent="purple" icon={Flame} top5={gameRecords.highPONoDb?.top5} />
                </RecordSection>
                <RecordSection title="Lowest Scores">
                  <RecordCard label="Lowest Score (inc. doubles)" value={gameRecords.lowAll?.value} sub={gameRecords.lowAll?.teams} sub2={gameRecords.lowAll?.sub2} accent="red" icon={TrendingDown} top5={gameRecords.lowAll?.top5} />
                  <RecordCard label="Lowest Score (single weeks only)" value={gameRecords.lowNoDouble?.value} sub={gameRecords.lowNoDouble?.teams} sub2={gameRecords.lowNoDouble?.sub2} accent="orange" icon={TrendingDown} top5={gameRecords.lowNoDouble?.top5} />
                </RecordSection>
                <RecordSection title="Notable Games">
                  <RecordCard label="Closest Game (inc. doubles)" value={gameRecords.closestAll?.value} sub={gameRecords.closestAll?.teams} sub2={gameRecords.closestAll?.sub2} accent="emerald" icon={Target} top5={gameRecords.closestAll?.top5} />
                  <RecordCard label="Closest Game (single weeks only)" value={gameRecords.closestNoDouble?.value} sub={gameRecords.closestNoDouble?.teams} sub2={gameRecords.closestNoDouble?.sub2} accent="cyan" icon={Target} top5={gameRecords.closestNoDouble?.top5} />
                  <RecordCard label="Biggest Win (inc. doubles)" value={gameRecords.biggestAll?.value} sub={gameRecords.biggestAll?.teams} sub2={gameRecords.biggestAll?.sub2} accent="gold" icon={Zap} top5={gameRecords.biggestAll?.top5} />
                  <RecordCard label="Biggest Win (single weeks only)" value={gameRecords.biggestNoDouble?.value} sub={gameRecords.biggestNoDouble?.teams} sub2={gameRecords.biggestNoDouble?.sub2} accent="orange" icon={Zap} top5={gameRecords.biggestNoDouble?.top5} />
                </RecordSection>
              </>
            )}

            {/* SEASONS */}
            {tab === 'seasons' && (
              <>
                <RecordSection title="Best & Worst Records">
                  <RecordCard label="Best RS Record" value={`${parseNumber(seasonRecords.byWin?.value?.RS_W)}–${parseNumber(seasonRecords.byWin?.value?.RS_L)}`} sub={seasonRecords.byWin?.teams} accent="gold" icon={Trophy} top5={seasonRecords.byWin?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                  <RecordCard label="Worst RS Record" value={`${parseNumber(seasonRecords.byLoss?.value?.RS_W)}–${parseNumber(seasonRecords.byLoss?.value?.RS_L)}`} sub={seasonRecords.byLoss?.teams} accent="red" icon={TrendingDown} top5={seasonRecords.byLoss?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
                  <RecordCard label="Best Overall Record" value={`${parseNumber(seasonRecords.byTotW?.value?.W)}–${parseNumber(seasonRecords.byTotW?.value?.L)}`} sub={seasonRecords.byTotW?.teams} accent="cyan" icon={Star} top5={seasonRecords.byTotW?.top5?.map(r => ({ ...r, value: `${r.value}W` }))} />
                  <RecordCard label="Worst Overall Record" value={`${parseNumber(seasonRecords.byTotL?.value?.W)}–${parseNumber(seasonRecords.byTotL?.value?.L)}`} sub={seasonRecords.byTotL?.teams} accent="orange" icon={TrendingDown} top5={seasonRecords.byTotL?.top5?.map(r => ({ ...r, value: `${r.value}L` }))} />
                </RecordSection>
                <RecordSection title="Most Points in a Season (RS)">
                  <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF?.teams} accent="gold" icon={Flame} top5={seasonRecords.byPF?.top5} />
                  <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byPF21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF21?.teams} accent="cyan" icon={Flame} top5={seasonRecords.byPF21?.top5} />
                  <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byPF23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byPF23?.teams} accent="emerald" icon={Flame} top5={seasonRecords.byPF23?.top5} />
                </RecordSection>
                <RecordSection title="Fewest Points in a Season (RS)">
                  <RecordCard label="All-Time" value={Math.round(parseNumber(seasonRecords.byLowPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLowPF?.teams} accent="red" icon={TrendingDown} top5={seasonRecords.byLowPF?.top5} />
                  <RecordCard label="Since 2021" value={Math.round(parseNumber(seasonRecords.byLow21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow21?.teams} accent="orange" icon={TrendingDown} top5={seasonRecords.byLow21?.top5} />
                  <RecordCard label="Since 2023" value={Math.round(parseNumber(seasonRecords.byLow23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow23?.teams} accent="purple" icon={TrendingDown} top5={seasonRecords.byLow23?.top5} />
                </RecordSection>
                <RecordSection title="Best Avg Points/Week in a Season (RS)">
                  <RecordCard label="All-Time" value={seasonRecords.avgHigh?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh?.teams} accent="gold" icon={Activity} top5={seasonRecords.avgHigh?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgHigh21?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh21?.teams} accent="cyan" icon={Activity} top5={seasonRecords.avgHigh21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgHigh23?.avgVal?.toFixed(2)} sub={seasonRecords.avgHigh23?.teams} accent="emerald" icon={Activity} top5={seasonRecords.avgHigh23?.top5} />
                </RecordSection>
                <RecordSection title="Fewest Avg Points/Week in a Season (RS)">
                  <RecordCard label="All-Time" value={seasonRecords.avgLow?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow?.teams} accent="red" icon={TrendingDown} top5={seasonRecords.avgLow?.top5} />
                  <RecordCard label="Since 2021" value={seasonRecords.avgLow21?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow21?.teams} accent="orange" icon={TrendingDown} top5={seasonRecords.avgLow21?.top5} />
                  <RecordCard label="Since 2023" value={seasonRecords.avgLow23?.avgVal?.toFixed(2)} sub={seasonRecords.avgLow23?.teams} accent="purple" icon={TrendingDown} top5={seasonRecords.avgLow23?.top5} />
                </RecordSection>
              </>
            )}

            {/* RIVALRY */}
            {tab === 'rivalry' && (
              <>
                <RecordSection title="Most Played">
                  <RecordCard label="Most H2H Games" value={rivalryRecords.mostGames?.value} sub={rivalryRecords.mostGames?.teams} accent="gold" icon={Swords} top5={rivalryRecords.mostGames?.top5} wide />
                </RecordSection>
                <RecordSection title="H2H Streaks">
                  <RecordCard label="Longest H2H Winning Streak" value={rivalryRecords.bestH2HStreak?.value} sub={rivalryRecords.bestH2HStreak?.teams} accent="gold" icon={Flame} top5={rivalryRecords.bestH2HStreak?.top5} wide />
                </RecordSection>
                <RecordSection title="Dominance & Balance">
                  <RecordCard label="Most Balanced Rivalry" value={rivalryRecords.mostBalanced?.value} sub={rivalryRecords.mostBalanced?.teams} accent="emerald" icon={Target} top5={rivalryRecords.mostBalanced?.top5} />
                  <RecordCard label="Highest Avg Margin H2H" value={rivalryRecords.highestMargin?.value} sub={rivalryRecords.highestMargin?.teams} accent="red" icon={TrendingUp} top5={rivalryRecords.highestMargin?.top5} />
                  <RecordCard label="Closest Avg Margin H2H" value={rivalryRecords.lowestMargin?.value} sub={rivalryRecords.lowestMargin?.teams} accent="cyan" icon={Target} top5={rivalryRecords.lowestMargin?.top5} />
                </RecordSection>
              </>
            )}

            {/* GLORY */}
            {tab === 'glory' && (
              <>
                <RecordSection title="Championship Leaders">
                  <RecordCard label="Most Titles" value={gloryRecords.mostTitles?.value} sub={gloryRecords.mostTitles?.teams} accent="gold" icon={Trophy} top5={gloryRecords.mostTitles?.top5} />
                  <RecordCard label="Most Finals Apps" value={gloryRecords.mostFinals?.value} sub={gloryRecords.mostFinals?.teams} accent="purple" icon={Star} top5={gloryRecords.mostFinals?.top5} />
                  <RecordCard label="Most Unicorn Years 🦄" value={gloryRecords.mostUnicorn?.value} sub={gloryRecords.mostUnicorn?.teams} accent="slate" icon={TrendingDown} top5={gloryRecords.mostUnicorn?.top5} />
                </RecordSection>

                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Champions</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 mb-10">
                  {gloryRecords.champions?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-yellow-400/20 bg-yellow-400/5 p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">🏆 {String(r?.Season || '').trim()}</div>
                      <div className="font-black text-white leading-tight" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>{String(r?.Team || '').trim()}</div>
                      <div className="mt-1 text-xs text-slate-500">{parseNumber(r?.W)}–{parseNumber(r?.L)} overall</div>
                    </div>
                  ))}
                </div>

                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Unicorns 🦄</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {gloryRecords.unicorns?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-white/5 bg-white/[0.02] p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">🦄 {String(r?.Season || '').trim()}</div>
                      <div className="font-black text-slate-400 leading-tight" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>{String(r?.Team || '').trim()}</div>
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
    </main>
  )
}
