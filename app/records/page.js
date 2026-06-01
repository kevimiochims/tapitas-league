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

// Card expandível com top 5
function RecordCard({ label, value, sub, sub2, accent, icon: Icon, top5, wide }) {
  const [expanded, setExpanded] = useState(false)

  const accents = {
    gold:    { border: 'border-yellow-400/25', bg: 'bg-yellow-400/5',  text: 'text-yellow-400',  icon: 'bg-yellow-400/10 border-yellow-400/20' },
    cyan:    { border: 'border-cyan-400/25',   bg: 'bg-cyan-400/5',    text: 'text-cyan-400',    icon: 'bg-cyan-400/10 border-cyan-400/20' },
    emerald: { border: 'border-emerald-400/25',bg: 'bg-emerald-400/5', text: 'text-emerald-400', icon: 'bg-emerald-400/10 border-emerald-400/20' },
    red:     { border: 'border-red-400/25',    bg: 'bg-red-400/5',     text: 'text-red-400',     icon: 'bg-red-400/10 border-red-400/20' },
    purple:  { border: 'border-purple-400/25', bg: 'bg-purple-400/5',  text: 'text-purple-400',  icon: 'bg-purple-400/10 border-purple-400/20' },
    orange:  { border: 'border-orange-400/25', bg: 'bg-orange-400/5',  text: 'text-orange-400',  icon: 'bg-orange-400/10 border-orange-400/20' },
    slate:   { border: 'border-white/10',      bg: 'bg-white/[0.03]',  text: 'text-slate-300',   icon: 'bg-white/[0.06] border-white/10' },
  }
  const a = accents[accent] || accents.slate

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
        {sub && (
          <div className="mt-3 font-black text-white" style={{ fontSize: 'clamp(13px, 1.5vw, 17px)' }}>
            {Array.isArray(sub) ? sub.join(', ') : sub}
          </div>
        )}
        {sub2 && <div className="mt-1 text-xs text-slate-500">{sub2}</div>}
      </div>

      {/* Top 5 expandível */}
      {top5 && top5.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex w-full items-center justify-between border-t border-white/5 px-5 py-3 text-left transition-all hover:bg-white/[0.02]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {expanded ? 'Hide' : 'Show Top 5'}
            </span>
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
              : <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
            }
          </button>
          {expanded && (
            <div className="border-t border-white/5 px-5 pb-4">
              {top5.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 ${i === 0 ? a.text : 'text-slate-600'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {Array.isArray(item.label) ? item.label.join(', ') : item.label}
                      </div>
                      {item.sub && <div className="text-[10px] text-slate-500">{item.sub}</div>}
                    </div>
                  </div>
                  <span className={`text-sm font-black ${i === 0 ? a.text : 'text-slate-400'}`}>{item.value}</span>
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

const TABS = [
  { key: 'franchise', label: 'Franchise',  Icon: Shield },
  { key: 'streaks',   label: 'Streaks',    Icon: Flame },
  { key: 'games',     label: 'Games',      Icon: Activity },
  { key: 'seasons',   label: 'Seasons',    Icon: Star },
  { key: 'rivalry',   label: 'Rivalries',  Icon: Swords },
  { key: 'glory',     label: 'Glory',      Icon: Trophy },
]

export default function RecordsPage() {
  const [allTime,  setAllTime]  = useState([])
  const [history,  setHistory]  = useState([])
  const [games,    setGames]    = useState([])
  const [h2h,      setH2h]      = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('franchise')

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

    // Agrupa times com mesmo valor no topo
    const topN = (arr, key, n = 5, asc = false, parseVal = parseNumber) => {
      const sorted = [...arr].sort((a, b) =>
        asc ? parseVal(a[key]) - parseVal(b[key]) : parseVal(b[key]) - parseVal(a[key])
      )
      const topVal = parseVal(sorted[0]?.[key])
      const winners = sorted.filter(r => parseVal(r[key]) === topVal).map(r => String(r.Team || '').trim())
      const top5 = sorted.slice(0, n).map(r => ({
        label: String(r.Team || '').trim(),
        value: parseVal(r[key]),
      }))
      return { value: topVal, teams: winners, top5 }
    }

    const parseWinPct = (r) => parseNumber(String(r?.['W%'] || '0').replace('%', ''))

    const mostWins   = topN(allTime, 'W')
    const mostLosses = topN(allTime, 'L')
    const bestWinPct = {
      value: String([...allTime].sort((a,b) => parseWinPct(b) - parseWinPct(a))[0]?.['W%'] || ''),
      teams: (() => {
        const sorted = [...allTime].sort((a,b) => parseWinPct(b) - parseWinPct(a))
        const top = parseWinPct(sorted[0])
        return sorted.filter(r => parseWinPct(r) === top).map(r => String(r.Team||'').trim())
      })(),
      top5: [...allTime].sort((a,b) => parseWinPct(b) - parseWinPct(a)).slice(0,5).map(r => ({
        label: String(r.Team||'').trim(), value: String(r['W%']||'')
      }))
    }
    const mostPF      = topN(allTime, 'PF')
    const mostPoApps  = topN(allTime, 'Playoff Apps')
    const mostFinals  = topN(allTime, 'Finals')
    const mostTitles  = topN(allTime, 'Titles')
    const mostPoW     = topN(allTime, 'PO_W')

    // 10W seasons
    const tenWSeasons = {}, tenWTotal = {}
    history.forEach(r => {
      const team = String(r?.Team || '').trim()
      if (parseNumber(r?.RS_W) >= 10) tenWSeasons[team] = (tenWSeasons[team] || 0) + 1
      if (parseNumber(r?.W)    >= 10) tenWTotal[team]   = (tenWTotal[team]   || 0) + 1
    })
    const mkTop5Obj = (obj) => Object.entries(obj).sort((a,b) => b[1]-a[1])
    const tenRSSorted = mkTop5Obj(tenWSeasons)
    const tenTotSorted = mkTop5Obj(tenWTotal)
    const topTenRS  = { value: tenRSSorted[0]?.[1]||0,  teams: tenRSSorted.filter(e => e[1]===tenRSSorted[0]?.[1]).map(e=>e[0]),  top5: tenRSSorted.slice(0,5).map(([l,v])=>({label:l,value:v})) }
    const topTenTot = { value: tenTotSorted[0]?.[1]||0, teams: tenTotSorted.filter(e => e[1]===tenTotSorted[0]?.[1]).map(e=>e[0]), top5: tenTotSorted.slice(0,5).map(([l,v])=>({label:l,value:v})) }

    // PR #1 weeks
    const pr1All = {}, pr1from21 = {}, pr1from23 = {}
    games.forEach(g => {
      if (parseNumber(g?.['Power Ranking']) !== 1) return
      const team = String(g?.Team || '').trim()
      const season = Number(String(g?.Season || '0').trim())
      pr1All[team]    = (pr1All[team]    || 0) + 1
      if (season >= 2021) pr1from21[team] = (pr1from21[team] || 0) + 1
      if (season >= 2023) pr1from23[team] = (pr1from23[team] || 0) + 1
    })
    const mkPR = (obj) => {
      const sorted = Object.entries(obj).sort((a,b) => b[1]-a[1])
      return { value: sorted[0]?.[1]||0, teams: sorted.filter(e=>e[1]===sorted[0]?.[1]).map(e=>e[0]), top5: sorted.slice(0,5).map(([l,v])=>({label:l,value:v})) }
    }

    return { mostWins, mostLosses, bestWinPct, mostPF, mostPoApps, mostFinals, mostTitles, mostPoW, topTenRS, topTenTot, pr1All: mkPR(pr1All), pr1from21: mkPR(pr1from21), pr1from23: mkPR(pr1from23) }
  }, [allTime, history, games])

  // ── STREAKS ────────────────────────────────────────────────────────
  const streakRecords = useMemo(() => {
    if (!allTime.length) return {}

    const parseStrVal = (val) => parseNumber(String(val||'0').replace(/[WL]/i,''))

    // All-time streaks do TEAM_ALL_TIME
    const mkStreakTop = (key) => {
      const sorted = [...allTime].sort((a,b) => parseStrVal(b[key]) - parseStrVal(a[key]))
      const topVal = parseStrVal(sorted[0]?.[key])
      return {
        value: String(sorted[0]?.[key]||'—'),
        teams: sorted.filter(r => parseStrVal(r[key]) === topVal).map(r => String(r.Team||'').trim()),
        top5: sorted.slice(0,5).map(r => ({ label: String(r.Team||'').trim(), value: String(r[key]||'') }))
      }
    }
    const bestWTotal = mkStreakTop('W Streak Total')
    const bestWRS    = mkStreakTop('W Streak RS')
    const bestLTotal = mkStreakTop('L Streak Total')
    const bestLRS    = mkStreakTop('L Streak RS')

    // Single season streaks — max do Streak_Total dentro de cada temporada
    const seasonWMap = {}, seasonLMap = {}
    games.forEach(g => {
      const team   = String(g?.Team || '').trim()
      const season = String(g?.Season || '').trim()
      const raw    = String(g?.Streak_Total || '').trim()
      const val    = parseStrVal(raw)
      const key    = `${team}|${season}`

      if (raw.startsWith('W') || (!raw.startsWith('L') && val > 0)) {
        if (!seasonWMap[key] || val > seasonWMap[key].val)
          seasonWMap[key] = { team, season, val, display: `W${val}` }
      }
      if (raw.startsWith('L')) {
        if (!seasonLMap[key] || val > seasonLMap[key].val)
          seasonLMap[key] = { team, season, val, display: `L${val}` }
      }
    })

    const topSeasonW = Object.values(seasonWMap).sort((a,b) => b.val - a.val)
    const topSeasonL = Object.values(seasonLMap).sort((a,b) => b.val - a.val)
    const topWVal = topSeasonW[0]?.val || 0
    const topLVal = topSeasonL[0]?.val || 0

    const bestSeasonW = {
      value: topSeasonW[0]?.display || '—',
      teams: topSeasonW.filter(r => r.val === topWVal).map(r => `${r.team} (${r.season})`),
      top5: topSeasonW.slice(0,5).map(r => ({ label: r.team, sub: r.season, value: r.display }))
    }
    const bestSeasonL = {
      value: topSeasonL[0]?.display || '—',
      teams: topSeasonL.filter(r => r.val === topLVal).map(r => `${r.team} (${r.season})`),
      top5: topSeasonL.slice(0,5).map(r => ({ label: r.team, sub: r.season, value: r.display }))
    }

    return { bestWTotal, bestWRS, bestLTotal, bestLRS, bestSeasonW, bestSeasonL }
  }, [allTime, games])

  // ── GAMES ──────────────────────────────────────────────────────────
  const gameRecords = useMemo(() => {
    if (!games.length) return {}

    // Deduplicar confrontos (pega só um lado)
    const dedup = (arr) => {
      const seen = new Set()
      return arr.filter(g => {
        const key = [String(g?.Season||''), String(g?.Week||''), String(g?.Team||''), String(g?.Opponent||'')].sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // Semanas duplas (ex: "14-15", "15&16")
    const isDoubleWeek = (g) => {
      const w = String(g?.Week || '')
      return w.includes('-') || w.includes('&')
    }

    const allDedup    = dedup(games)
    const regDedup    = dedup(games.filter(g => String(g?.GameStage||'').trim() === 'Reg Season'))
    const poDedup     = dedup(games.filter(g => String(g?.GameStage||'').trim() === 'Playoffs'))
    const noDouble    = allDedup.filter(g => !isDoubleWeek(g))
    const withDouble  = allDedup

    // Highest score
    const mkHighest = (arr, n=5) => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a,b) => parseNumber(b.PF) - parseNumber(a.PF))
      const topVal  = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team||'').trim()),
        sub2: `vs ${String(sorted[0]?.Opponent||'').trim()} · W${String(sorted[0]?.Week||'')} ${String(sorted[0]?.Season||'')}`,
        top5: sorted.slice(0,n).map(g => ({
          label: String(g.Team||'').trim(),
          sub: `vs ${String(g.Opponent||'').trim()} · W${g.Week} ${g.Season}`,
          value: parseNumber(g.PF).toFixed(2)
        }))
      }
    }

    // Lowest score
    const mkLowest = (arr, n=5) => {
      const sorted = [...arr].filter(g => parseNumber(g?.PF) > 0).sort((a,b) => parseNumber(a.PF) - parseNumber(b.PF))
      const topVal  = parseNumber(sorted[0]?.PF)
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => parseNumber(g.PF) === topVal).map(g => String(g.Team||'').trim()),
        sub2: `vs ${String(sorted[0]?.Opponent||'').trim()} · W${String(sorted[0]?.Week||'')} ${String(sorted[0]?.Season||'')}`,
        top5: sorted.slice(0,n).map(g => ({
          label: String(g.Team||'').trim(),
          sub: `vs ${String(g.Opponent||'').trim()} · W${g.Week} ${g.Season}`,
          value: parseNumber(g.PF).toFixed(2)
        }))
      }
    }

    // Closest game
    const mkClosest = (arr, n=5) => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > 0 && parseNumber(g?.PA) > 0)
        .map(g => ({ ...g, margin: Math.abs(parseNumber(g.PF) - parseNumber(g.PA)) }))
        .sort((a,b) => a.margin - b.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => g.margin === topVal).map(g => `${String(g.Team||'').trim()} vs ${String(g.Opponent||'').trim()}`),
        sub2: `W${String(sorted[0]?.Week||'')} ${String(sorted[0]?.Season||'')}`,
        top5: sorted.slice(0,n).map(g => ({
          label: `${String(g.Team||'').trim()} vs ${String(g.Opponent||'').trim()}`,
          sub: `W${g.Week} ${g.Season}`,
          value: g.margin.toFixed(2)
        }))
      }
    }

    // Biggest win
    const mkBiggest = (arr, n=5) => {
      const sorted = [...arr]
        .filter(g => parseNumber(g?.PF) > parseNumber(g?.PA))
        .map(g => ({ ...g, margin: parseNumber(g.PF) - parseNumber(g.PA) }))
        .sort((a,b) => b.margin - a.margin)
      const topVal = sorted[0]?.margin || 0
      return {
        value: topVal.toFixed(2),
        teams: sorted.filter(g => g.margin === topVal).map(g => `${String(g.Team||'').trim()} vs ${String(g.Opponent||'').trim()}`),
        sub2: `W${String(sorted[0]?.Week||'')} ${String(sorted[0]?.Season||'')}`,
        top5: sorted.slice(0,n).map(g => ({
          label: `${String(g.Team||'').trim()} vs ${String(g.Opponent||'').trim()}`,
          sub: `W${g.Week} ${g.Season}`,
          value: g.margin.toFixed(2)
        }))
      }
    }

    return {
      highAll:       mkHighest(withDouble),
      highNoDouble:  mkHighest(noDouble),
      highReg:       mkHighest(regDedup),
      highPO:        mkHighest(poDedup),
      lowAll:        mkLowest(withDouble),
      lowNoDouble:   mkLowest(noDouble),
      closestAll:    mkClosest(allDedup),
      biggestAll:    mkBiggest(withDouble),
      biggestNoDouble: mkBiggest(noDouble),
    }
  }, [games])

  // ── SEASONS ────────────────────────────────────────────────────────
  const seasonRecords = useMemo(() => {
    if (!history.length) return {}

    const mkTop = (arr, key, n=5, asc=false) => {
      const sorted = [...arr].filter(r => parseNumber(r[key]) > 0).sort((a,b) =>
        asc ? parseNumber(a[key]) - parseNumber(b[key]) : parseNumber(b[key]) - parseNumber(a[key])
      )
      const topVal = parseNumber(sorted[0]?.[key])
      return {
        value: sorted[0],
        topVal,
        teams: sorted.filter(r => parseNumber(r[key]) === topVal).map(r => `${String(r.Team||'').trim()} (${String(r.Season||'')})`),
        top5: sorted.slice(0,n).map(r => ({
          label: String(r.Team||'').trim(),
          sub: String(r.Season||''),
          value: parseNumber(r[key])
        }))
      }
    }

    const byWin    = mkTop(history, 'RS_W')
    const byLoss   = mkTop(history, 'RS_L', 5, false)
    const byPF     = mkTop(history, 'RS_PF')
    const byLowPF  = mkTop(history, 'RS_PF', 5, true)
    const byTotW   = mkTop(history, 'W')
    const byTotL   = mkTop(history, 'L', 5, false)

    // Fewest points desde 2021 e 2023
    const from21  = history.filter(r => Number(String(r?.Season||'0')) >= 2021)
    const from23  = history.filter(r => Number(String(r?.Season||'0')) >= 2023)
    const byLow21 = mkTop(from21, 'RS_PF', 5, true)
    const byLow23 = mkTop(from23, 'RS_PF', 5, true)

    // Avg pontos por semana
    const withAvg = history.map(r => ({
      ...r,
      avgPF: parseNumber(r?.RS_GP) > 0 ? parseNumber(r?.RS_PF) / parseNumber(r?.RS_GP) : 0
    })).filter(r => r.avgPF > 0)
    const avgSorted = [...withAvg].sort((a,b) => b.avgPF - a.avgPF)
    const topAvg = avgSorted[0]?.avgPF || 0
    const avgRecord = {
      value: avgSorted[0],
      avgVal: topAvg,
      teams: avgSorted.filter(r => r.avgPF === topAvg).map(r => `${String(r.Team||'').trim()} (${String(r.Season||'')})`),
      top5: avgSorted.slice(0,5).map(r => ({ label: String(r.Team||'').trim(), sub: String(r.Season||''), value: r.avgPF.toFixed(2) }))
    }

    return { byWin, byLoss, byPF, byLowPF, byTotW, byTotL, byLow21, byLow23, avgRecord }
  }, [history])

  // ── RIVALRY ────────────────────────────────────────────────────────
  const rivalryRecords = useMemo(() => {
    if (!h2h.length) return {}
    const seen = new Set()
    const dedup = h2h.filter(r => {
      const a = normalizeString(r?.['Team A']||'')
      const b = normalizeString(r?.['Team B']||'')
      const key = [a,b].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const parseMargin = (val) => parseNumber(String(val||'0').replace(',','.'))
    const parseStreakVal = (val) => parseNumber(String(val||'0').replace(/[WL\s\(].*/,''))

    // Most games
    const mgSorted = [...dedup].sort((a,b) => parseNumber(b.Games) - parseNumber(a.Games))
    const topMG = parseNumber(mgSorted[0]?.Games)
    const mostGames = {
      value: topMG,
      teams: mgSorted.filter(r => parseNumber(r.Games) === topMG).map(r => `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`),
      top5: mgSorted.slice(0,5).map(r => ({ label: `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`, value: parseNumber(r.Games) }))
    }

    // Best H2H streak — compara A e B de todas as linhas
    const allStreaks = []
    dedup.forEach(r => {
      const a = String(r?.['Team A']||'').trim()
      const b = String(r?.['Team B']||'').trim()
      const sA = String(r?.['Best Streak Team A']||'')
      const sB = String(r?.['Best Streak Team B']||'')
      const vA = parseStreakVal(sA)
      const vB = parseStreakVal(sB)
      if (sA) allStreaks.push({ team: a, opponent: b, streak: sA, val: vA })
      if (sB) allStreaks.push({ team: b, opponent: a, streak: sB, val: vB })
    })
    allStreaks.sort((a,b) => b.val - a.val)
    const topStreakVal = allStreaks[0]?.val || 0
    const bestH2HStreak = {
      value: allStreaks[0]?.streak || '—',
      teams: allStreaks.filter(s => s.val === topStreakVal).map(s => `vs ${s.opponent}`),
      top5: allStreaks.slice(0,5).map(s => ({ label: s.team, sub: `vs ${s.opponent}`, value: s.streak }))
    }

    // Most balanced (min diff, min 6 games)
    const balSorted = [...dedup].filter(r => parseNumber(r.Games) >= 6)
      .sort((a,b) => Math.abs(parseNumber(a['A Wins'])-parseNumber(a['B Wins'])) - Math.abs(parseNumber(b['A Wins'])-parseNumber(b['B Wins'])))
    const topBal = Math.abs(parseNumber(balSorted[0]?.['A Wins']) - parseNumber(balSorted[0]?.['B Wins']))
    const mostBalanced = {
      value: `${parseNumber(balSorted[0]?.['A Wins'])}–${parseNumber(balSorted[0]?.['B Wins'])}`,
      teams: balSorted.filter(r => Math.abs(parseNumber(r['A Wins'])-parseNumber(r['B Wins'])) === topBal).map(r => `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`),
      top5: balSorted.slice(0,5).map(r => ({ label: `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`, value: `${parseNumber(r['A Wins'])}–${parseNumber(r['B Wins'])}` }))
    }

    // Highest avg margin
    const hmSorted = [...dedup].sort((a,b) => parseMargin(b['Avg Margin']) - parseMargin(a['Avg Margin']))
    const topHM = parseMargin(hmSorted[0]?.['Avg Margin'])
    const highestMargin = {
      value: `${String(hmSorted[0]?.['Avg Margin']||'').trim()} pts`,
      teams: hmSorted.filter(r => parseMargin(r['Avg Margin']) === topHM).map(r => `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`),
      top5: hmSorted.slice(0,5).map(r => ({ label: `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`, value: `${String(r['Avg Margin']||'').trim()} pts` }))
    }

    // Lowest avg margin
    const lmSorted = [...dedup].filter(r => parseMargin(r['Avg Margin']) > 0).sort((a,b) => parseMargin(a['Avg Margin']) - parseMargin(b['Avg Margin']))
    const topLM = parseMargin(lmSorted[0]?.['Avg Margin'])
    const lowestMargin = {
      value: `${String(lmSorted[0]?.['Avg Margin']||'').trim()} pts`,
      teams: lmSorted.filter(r => parseMargin(r['Avg Margin']) === topLM).map(r => `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`),
      top5: lmSorted.slice(0,5).map(r => ({ label: `${String(r['Team A']||'').trim()} vs ${String(r['Team B']||'').trim()}`, value: `${String(r['Avg Margin']||'').trim()} pts` }))
    }

    return { mostGames, bestH2HStreak, mostBalanced, highestMargin, lowestMargin }
  }, [h2h])

  // ── GLORY ──────────────────────────────────────────────────────────
  const gloryRecords = useMemo(() => {
    if (!history.length) return {}

    const champions = history.filter(r => String(r?.Champion||'').toUpperCase() === 'TRUE')
      .sort((a,b) => Number(String(b?.Season||'0')) - Number(String(a?.Season||'0')))

    const unicorns = history.filter(r => {
      const season = String(r?.Season||'').trim()
      const total  = history.filter(h => String(h?.Season||'').trim() === season).length
      return parseNumber(r?.Standing) === total
    }).sort((a,b) => Number(String(b?.Season||'0')) - Number(String(a?.Season||'0')))

    const titleCount = {}, finalsCount = {}, unicornCount = {}
    champions.forEach(r => { const t = String(r?.Team||'').trim(); titleCount[t] = (titleCount[t]||0)+1 })
    history.filter(r => String(r?.Reached_Final||'').toUpperCase() === 'TRUE').forEach(r => { const t = String(r?.Team||'').trim(); finalsCount[t] = (finalsCount[t]||0)+1 })
    unicorns.forEach(r => { const t = String(r?.Team||'').trim(); unicornCount[t] = (unicornCount[t]||0)+1 })

    const mkGlory = (obj) => {
      const sorted = Object.entries(obj).sort((a,b) => b[1]-a[1])
      const topVal = sorted[0]?.[1]||0
      return { value: topVal, teams: sorted.filter(e=>e[1]===topVal).map(e=>e[0]), top5: sorted.slice(0,5).map(([l,v])=>({label:l,value:v})) }
    }

    return { champions, unicorns, mostTitles: mkGlory(titleCount), mostFinals: mkGlory(finalsCount), mostUnicorn: mkGlory(unicornCount) }
  }, [history])

  const fmt = (g, field) => String(g?.[field] || '').trim()

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
                {[280,355,400,475,520,595,640,715,760,835].map((x,i)=>(
                  <rect key={i} x={x} y="-80" width={i%2===0?55:22} height="450" fill="#22d3ee" transform={`rotate(-18 ${x+(i%2===0?27:11)} 140)`}/>
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -30 L460 85 L380 200 L300 85 Z","M460 85 L540 200 L460 315 L380 200 Z","M540 -30 L620 85 L540 200 L460 85 Z","M620 85 L700 200 L620 315 L540 200 Z","M700 -30 L780 85 L700 200 L620 85 Z","M780 85 L860 200 L780 315 L700 200 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.08" fill="#22d3ee">
                {["M420 30 L440 58 L420 86 L400 58 Z","M580 30 L600 58 L580 86 L560 58 Z","M740 30 L760 58 L740 86 L720 58 Z","M500 120 L520 148 L500 176 L480 148 Z","M660 120 L680 148 L660 176 L640 148 Z","M820 120 L840 148 L820 176 L800 148 Z"].map((d,i)=><path key={i} d={d}/>)}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round">
                {[500,540,580,620].map((x,i)=><polyline key={i} points={`${x},0 ${x+140},140 ${x},280`}/>)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,120 780,0"/>
                <polygon points="900,280 900,160 780,280"/>
                <polygon points="280,0 360,0 280,80"/>
              </g>
              <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                {[30,50,70].map(r=><circle key={r} cx="860" cy="50" r={r}/>)}
              </g>
              <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
                {[70,140,210].map(y=><line key={y} x1="0" y1={y} x2="900" y2={y}/>)}
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
                className={`flex flex-shrink-0 items-center gap-2 border-b-2 px-6 py-4 text-sm font-black transition-all ${
                  tab === t.key ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'
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

            {/* FRANCHISE */}
            {tab === 'franchise' && (
              <>
                <RecordSection title="All-Time Wins & Losses">
                  <RecordCard label="Most Wins All-Time"   value={franchiseRecords.mostWins?.value}   sub={franchiseRecords.mostWins?.teams}   accent="gold"    icon={Trophy}       top5={franchiseRecords.mostWins?.top5?.map(r=>({...r,value:r.value}))} />
                  <RecordCard label="Most Losses All-Time" value={franchiseRecords.mostLosses?.value} sub={franchiseRecords.mostLosses?.teams} accent="red"     icon={TrendingDown} top5={franchiseRecords.mostLosses?.top5} />
                  <RecordCard label="Best Win % All-Time"  value={franchiseRecords.bestWinPct?.value} sub={franchiseRecords.bestWinPct?.teams} accent="cyan"    icon={Target}       top5={franchiseRecords.bestWinPct?.top5} />
                  <RecordCard label="Most Points All-Time" value={franchiseRecords.mostPF?.value && Math.round(franchiseRecords.mostPF.value).toLocaleString()} sub={franchiseRecords.mostPF?.teams} accent="emerald" icon={Activity} top5={franchiseRecords.mostPF?.top5?.map(r=>({...r,value:Math.round(r.value).toLocaleString()}))} />
                </RecordSection>
                <RecordSection title="Playoff Dominance">
                  <RecordCard label="Most Playoff Apps" value={franchiseRecords.mostPoApps?.value} sub={franchiseRecords.mostPoApps?.teams} accent="purple" icon={Star}         top5={franchiseRecords.mostPoApps?.top5} />
                  <RecordCard label="Most Finals Apps"  value={franchiseRecords.mostFinals?.value} sub={franchiseRecords.mostFinals?.teams} accent="gold"   icon={Trophy}       top5={franchiseRecords.mostFinals?.top5} />
                  <RecordCard label="Most Titles"       value={franchiseRecords.mostTitles?.value} sub={franchiseRecords.mostTitles?.teams} accent="gold"   icon={Trophy}       top5={franchiseRecords.mostTitles?.top5} />
                  <RecordCard label="Most Playoff Wins" value={franchiseRecords.mostPoW?.value}    sub={franchiseRecords.mostPoW?.teams}    accent="cyan"   icon={TrendingUp}   top5={franchiseRecords.mostPoW?.top5} />
                </RecordSection>
                <RecordSection title="10-Win Seasons">
                  <RecordCard label="Most 10W Seasons (RS)"    value={franchiseRecords.topTenRS?.value}  sub={franchiseRecords.topTenRS?.teams}  accent="emerald" icon={Star} top5={franchiseRecords.topTenRS?.top5} />
                  <RecordCard label="Most 10W Seasons (Total)" value={franchiseRecords.topTenTot?.value} sub={franchiseRecords.topTenTot?.teams} accent="cyan"    icon={Star} top5={franchiseRecords.topTenTot?.top5} />
                </RecordSection>
                <RecordSection title="Power Rankings — Most Weeks at #1">
                  <RecordCard label="All-Time"   value={franchiseRecords.pr1All?.value}   sub={franchiseRecords.pr1All?.teams}   sub2="All seasons"      accent="gold"   icon={Zap} top5={franchiseRecords.pr1All?.top5} />
                  <RecordCard label="Since 2021" value={franchiseRecords.pr1from21?.value} sub={franchiseRecords.pr1from21?.teams} sub2="From 2021 on"    accent="orange" icon={Zap} top5={franchiseRecords.pr1from21?.top5} />
                  <RecordCard label="Since 2023" value={franchiseRecords.pr1from23?.value} sub={franchiseRecords.pr1from23?.teams} sub2="New era (2023+)" accent="cyan"   icon={Zap} top5={franchiseRecords.pr1from23?.top5} />
                </RecordSection>
              </>
            )}

            {/* STREAKS */}
            {tab === 'streaks' && (
              <>
                <RecordSection title="All-Time Win Streaks">
                  <RecordCard label="Best Winning Streak (Total)"      value={streakRecords.bestWTotal?.value} sub={streakRecords.bestWTotal?.teams} accent="gold"    icon={Flame}       top5={streakRecords.bestWTotal?.top5} />
                  <RecordCard label="Best Winning Streak (Reg Season)" value={streakRecords.bestWRS?.value}    sub={streakRecords.bestWRS?.teams}    accent="emerald" icon={Flame}       top5={streakRecords.bestWRS?.top5} />
                </RecordSection>
                <RecordSection title="All-Time Loss Streaks">
                  <RecordCard label="Worst Losing Streak (Total)"      value={streakRecords.bestLTotal?.value} sub={streakRecords.bestLTotal?.teams} accent="red"    icon={TrendingDown} top5={streakRecords.bestLTotal?.top5} />
                  <RecordCard label="Worst Losing Streak (Reg Season)" value={streakRecords.bestLRS?.value}    sub={streakRecords.bestLRS?.teams}    accent="orange" icon={TrendingDown} top5={streakRecords.bestLRS?.top5} />
                </RecordSection>
                <RecordSection title="Single Season Streaks">
                  <RecordCard label="Best Win Streak in a Single Season"  value={streakRecords.bestSeasonW?.value} sub={streakRecords.bestSeasonW?.teams}  accent="gold"   icon={Flame}        top5={streakRecords.bestSeasonW?.top5} />
                  <RecordCard label="Worst Loss Streak in a Single Season" value={streakRecords.bestSeasonL?.value} sub={streakRecords.bestSeasonL?.teams} accent="red"    icon={TrendingDown} top5={streakRecords.bestSeasonL?.top5} />
                </RecordSection>
              </>
            )}

            {/* GAMES */}
            {tab === 'games' && (
              <>
                <RecordSection title="Highest Scores — Including Double Weeks">
                  <RecordCard label="Highest Score All-Time"   value={gameRecords.highAll?.value}  sub={gameRecords.highAll?.teams}  sub2={gameRecords.highAll?.sub2}  accent="gold"   icon={Flame}       top5={gameRecords.highAll?.top5} />
                  <RecordCard label="Highest Score Reg Season" value={gameRecords.highReg?.value}  sub={gameRecords.highReg?.teams}  sub2={gameRecords.highReg?.sub2}  accent="cyan"   icon={Flame}       top5={gameRecords.highReg?.top5} />
                  <RecordCard label="Highest Score Playoffs"   value={gameRecords.highPO?.value}   sub={gameRecords.highPO?.teams}   sub2={gameRecords.highPO?.sub2}   accent="purple" icon={Flame}       top5={gameRecords.highPO?.top5} />
                </RecordSection>
                <RecordSection title="Highest Scores — Single Weeks Only">
                  <RecordCard label="Highest Score (No Double Weeks)" value={gameRecords.highNoDouble?.value} sub={gameRecords.highNoDouble?.teams} sub2={gameRecords.highNoDouble?.sub2} accent="emerald" icon={Flame} top5={gameRecords.highNoDouble?.top5} />
                </RecordSection>
                <RecordSection title="Lowest Scores">
                  <RecordCard label="Lowest Score All-Time (inc. doubles)" value={gameRecords.lowAll?.value}      sub={gameRecords.lowAll?.teams}      sub2={gameRecords.lowAll?.sub2}      accent="red"    icon={TrendingDown} top5={gameRecords.lowAll?.top5} />
                  <RecordCard label="Lowest Score (Single Weeks Only)"     value={gameRecords.lowNoDouble?.value}  sub={gameRecords.lowNoDouble?.teams}  sub2={gameRecords.lowNoDouble?.sub2}  accent="orange" icon={TrendingDown} top5={gameRecords.lowNoDouble?.top5} />
                </RecordSection>
                <RecordSection title="Notable Games">
                  <RecordCard label="Closest Game (Smallest Margin)"       value={gameRecords.closestAll?.value}       sub={gameRecords.closestAll?.teams}       sub2={gameRecords.closestAll?.sub2}       accent="emerald" icon={Target} top5={gameRecords.closestAll?.top5} />
                  <RecordCard label="Biggest Win — inc. Double Weeks"      value={gameRecords.biggestAll?.value}       sub={gameRecords.biggestAll?.teams}       sub2={gameRecords.biggestAll?.sub2}       accent="gold"    icon={Zap}    top5={gameRecords.biggestAll?.top5} />
                  <RecordCard label="Biggest Win — Single Weeks Only"      value={gameRecords.biggestNoDouble?.value}  sub={gameRecords.biggestNoDouble?.teams}  sub2={gameRecords.biggestNoDouble?.sub2}  accent="orange"  icon={Zap}    top5={gameRecords.biggestNoDouble?.top5} />
                </RecordSection>
              </>
            )}

            {/* SEASONS */}
            {tab === 'seasons' && (
              <>
                <RecordSection title="Best & Worst Records in a Single Season">
                  <RecordCard label="Best RS Record"       value={`${parseNumber(seasonRecords.byWin?.value?.RS_W)}–${parseNumber(seasonRecords.byWin?.value?.RS_L)}`}   sub={seasonRecords.byWin?.teams}   accent="gold"   icon={Trophy}       top5={seasonRecords.byWin?.top5?.map(r=>({...r,value:`${r.value}W`}))} />
                  <RecordCard label="Worst RS Record"      value={`${parseNumber(seasonRecords.byLoss?.value?.RS_W)}–${parseNumber(seasonRecords.byLoss?.value?.RS_L)}`}  sub={seasonRecords.byLoss?.teams}  accent="red"    icon={TrendingDown} top5={seasonRecords.byLoss?.top5?.map(r=>({...r,value:`${r.value}L`}))} />
                  <RecordCard label="Best Overall Record"  value={`${parseNumber(seasonRecords.byTotW?.value?.W)}–${parseNumber(seasonRecords.byTotW?.value?.L)}`}        sub={seasonRecords.byTotW?.teams}  accent="cyan"   icon={Star}         top5={seasonRecords.byTotW?.top5?.map(r=>({...r,value:`${r.value}W`}))} />
                  <RecordCard label="Worst Overall Record" value={`${parseNumber(seasonRecords.byTotL?.value?.W)}–${parseNumber(seasonRecords.byTotL?.value?.L)}`}        sub={seasonRecords.byTotL?.teams}  accent="orange" icon={TrendingDown} top5={seasonRecords.byTotL?.top5?.map(r=>({...r,value:`${r.value}L`}))} />
                </RecordSection>
                <RecordSection title="Scoring Records in a Season">
                  <RecordCard label="Most Points (RS)"         value={Math.round(parseNumber(seasonRecords.byPF?.value?.RS_PF)).toLocaleString()}    sub={seasonRecords.byPF?.teams}    accent="gold"    icon={Flame}       top5={seasonRecords.byPF?.top5?.map(r=>({...r,value:Math.round(r.value).toLocaleString()}))} />
                  <RecordCard label="Fewest Points (RS) — All" value={Math.round(parseNumber(seasonRecords.byLowPF?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLowPF?.teams} accent="red"     icon={TrendingDown} top5={seasonRecords.byLowPF?.top5?.map(r=>({...r,value:Math.round(r.value).toLocaleString()}))} />
                  <RecordCard label="Fewest Points (RS — 2021+)" value={Math.round(parseNumber(seasonRecords.byLow21?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow21?.teams} sub2="From 2021" accent="orange"  icon={TrendingDown} top5={seasonRecords.byLow21?.top5?.map(r=>({...r,value:Math.round(r.value).toLocaleString()}))} />
                  <RecordCard label="Fewest Points (RS — 2023+)" value={Math.round(parseNumber(seasonRecords.byLow23?.value?.RS_PF)).toLocaleString()} sub={seasonRecords.byLow23?.teams} sub2="From 2023" accent="purple"  icon={TrendingDown} top5={seasonRecords.byLow23?.top5?.map(r=>({...r,value:Math.round(r.value).toLocaleString()}))} />
                  <RecordCard label="Best Avg Pts/Week in a Season" value={seasonRecords.avgRecord?.avgVal?.toFixed(2)} sub={seasonRecords.avgRecord?.teams} accent="emerald" icon={Activity} top5={seasonRecords.avgRecord?.top5} />
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
                  <RecordCard label="Most Balanced Rivalry"  value={rivalryRecords.mostBalanced?.value}  sub={rivalryRecords.mostBalanced?.teams}  accent="emerald" icon={Target}     top5={rivalryRecords.mostBalanced?.top5} />
                  <RecordCard label="Highest Avg Margin H2H" value={rivalryRecords.highestMargin?.value} sub={rivalryRecords.highestMargin?.teams} accent="red"     icon={TrendingUp} top5={rivalryRecords.highestMargin?.top5} />
                  <RecordCard label="Closest Avg Margin H2H" value={rivalryRecords.lowestMargin?.value}  sub={rivalryRecords.lowestMargin?.teams}  accent="cyan"    icon={Target}     top5={rivalryRecords.lowestMargin?.top5} />
                </RecordSection>
              </>
            )}

            {/* GLORY */}
            {tab === 'glory' && (
              <>
                <RecordSection title="Championship Leaders">
                  <RecordCard label="Most Titles"            value={gloryRecords.mostTitles?.value}  sub={gloryRecords.mostTitles?.teams}  accent="gold"  icon={Trophy}       top5={gloryRecords.mostTitles?.top5} />
                  <RecordCard label="Most Finals Apps"       value={gloryRecords.mostFinals?.value}  sub={gloryRecords.mostFinals?.teams}  accent="purple" icon={Star}        top5={gloryRecords.mostFinals?.top5} />
                  <RecordCard label="Most Unicorn Years 🦄"  value={gloryRecords.mostUnicorn?.value} sub={gloryRecords.mostUnicorn?.teams} accent="slate"  icon={TrendingDown} top5={gloryRecords.mostUnicorn?.top5} />
                </RecordSection>

                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Champions</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 mb-10">
                  {gloryRecords.champions?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-yellow-400/20 bg-yellow-400/5 p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">🏆 {String(r?.Season||'').trim()}</div>
                      <div className="font-black text-white leading-tight" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>{String(r?.Team||'').trim()}</div>
                      <div className="mt-1 text-xs text-slate-500">{parseNumber(r?.W)}–{parseNumber(r?.L)} overall</div>
                    </div>
                  ))}
                </div>

                <div className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Hall of Unicorns 🦄</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {gloryRecords.unicorns?.map((r, i) => (
                    <div key={i} className="rounded-[20px] border border-white/5 bg-white/[0.02] p-4">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">🦄 {String(r?.Season||'').trim()}</div>
                      <div className="font-black text-slate-400 leading-tight" style={{ fontSize: 'clamp(14px, 2vw, 18px)' }}>{String(r?.Team||'').trim()}</div>
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
