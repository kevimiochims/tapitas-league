'use client'

import { useEffect, useState, useMemo } from 'react'
import { Trophy, Activity, Target, Flame, TrendingUp, TrendingDown, Star, Swords, ChevronRight, Skull, Zap } from 'lucide-react'
import Header from '../components/Header'

const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const TEAM_IMAGES = {
  'howmuch': '/images/howmuch.png',
  'i am megatron': '/images/megatron.png',
  'moneyball': '/images/moneyball.png',
  'ocupa e resiste': '/images/ocupa.png',
  'oldbrady': '/images/oldbrady.png',
  'patrolao squad': '/images/patrolao.png',
  'pequers verde': '/images/pequers.png',
  'peytao da massa': '/images/peytao.png',
  'rincao settlers': '/images/rincao.png',
  'h-lera do mahl': '/images/hlera.png',
}

function getTeamImage(name) {
  const key = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  return TEAM_IMAGES[key] || null
}

function getInitials(name) {
  return String(name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function parseNumber(value) {
  if (!value && value !== 0) return 0
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

// Returns an ordinal label like "most all-time", "2nd all-time", "3rd all-time"...
// Ties share the same rank, and the next distinct value skips ahead accordingly
// (e.g. two teams tied for 2nd push the next team to 4th, not 3rd).
// Values <= 0 return null (no ranking shown).
function getOrdinalRankLabel(value, allValues) {
  if (!value || value <= 0) return null
  const valid = allValues.filter(v => v > 0)
  if (!valid.some(v => v === value)) return null
  const rank = valid.filter(v => v > value).length + 1
  if (rank === 1) return 'most all-time'
  const suffix = (rank % 100 >= 11 && rank % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][rank % 10] || 'th')
  return `${rank}${suffix} all-time`
}

function TeamAvatar({ name, size = 'md' }) {
  const img = getTeamImage(name)
  const sizes = { sm: 40, md: 64, lg: 96, xl: 128 }
  const px = sizes[size]
  const rounded = size === 'xl' ? 'rounded-[24px]' : size === 'lg' ? 'rounded-[18px]' : 'rounded-[14px]'

  if (img) return (
    <div className={`overflow-hidden flex-shrink-0 ${rounded}`} style={{ width: px, height: px }}>
      <img src={img} alt={name} className="w-full h-full object-cover" />
    </div>
  )
  return (
    <div className={`flex-shrink-0 flex items-center justify-center bg-cyan-400/10 border border-cyan-400/20 font-black text-cyan-300 ${rounded}`}
      style={{ width: px, height: px, fontSize: px * 0.3 }}>
      {getInitials(name)}
    </div>
  )
}

export default function TeamsPage() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      const [at, hi, h2h, ga] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])
      setAllTime(at)
      setHistory(hi)
      setH2hData(h2h)
      setGames(ga)
      setLoading(false)

      // Auto-select team from ?team= URL param
      const teamParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('team')
          : null
      if (teamParam) {
        const match = at.find(r =>
          String(r?.Team || '').trim().toLowerCase() === teamParam.toLowerCase()
        )
        if (match) setSelected({ ...match, team: String(match.Team || '').trim() })
      }
    }
    load()
  }, [])

  const teams = useMemo(() => {
    return allTime
      .map(r => ({ ...r, team: String(r?.Team || '').trim() }))
      .filter(r => r.team)
      .sort((a, b) => parseNumber(b.W) - parseNumber(a.W))
  }, [allTime])

  const getTeamHistory = (teamName) =>
    history.filter(r => String(r?.Team || '').trim() === teamName)
      .sort((a, b) => Number(b.Season) - Number(a.Season))

  const getTeamH2H = (teamName) => {
    const seen = new Set()
    return h2hData.filter(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      const key = [a, b].sort().join('|')
      if (seen.has(key)) return false
      seen.add(key)
      return a === teamName || b === teamName
    }).map(r => {
      const isA = String(r?.['Team A'] || '').trim() === teamName
      return {
        opponent: isA ? String(r?.['Team B'] || '').trim() : String(r?.['Team A'] || '').trim(),
        wins: isA ? parseNumber(r?.['A Wins']) : parseNumber(r?.['B Wins']),
        losses: isA ? parseNumber(r?.['B Wins']) : parseNumber(r?.['A Wins']),
        games: parseNumber(r?.Games),
        streak: String(r?.['Current Streak'] || ''),
      }
    }).sort((a, b) => b.games - a.games)
  }

  // ── GAME_FACTS_ALL derived stats: 200+ pt games & PR #1 weeks ───────
  const isDoubleWeek = g => { const w = String(g?.Week || ''); return w.includes('-') || w.includes('&') }

  const getTeam200Games = (teamName) => {
    const seen = new Set()
    let count = 0
    games.filter(g => String(g?.Team || '').trim() === teamName && !isDoubleWeek(g)).forEach(g => {
      const key = `${String(g?.Season || '')}|${String(g?.Week || '')}`
      if (seen.has(key)) return
      seen.add(key)
      if (parseNumber(g?.PF) >= 200) count++
    })
    return count
  }

  const getTeamPR1Weeks = (teamName) =>
    games.filter(g => String(g?.Team || '').trim() === teamName && parseNumber(g?.['Power Ranking']) === 1).length

  // Unicorn seasons for a given team (seasons where standing == max standing that season)
  const getTeamUnicornSeasons = (teamName) => {
    const teamH = getTeamHistory(teamName)
    return teamH.filter(r => {
      const seasonRows = history.filter(h => String(h.Season) === String(r.Season))
      const maxStanding = Math.max(...seasonRows.map(s => Number(s.Standing) || 0))
      return Number(r.Standing) === maxStanding
    })
  }

  // ── League-wide values per stat, used to rank every team against all others ──
  const leagueStats = useMemo(() => {
    if (!allTime.length) return null

    const byTeam = {}
    teams.forEach(t => {
      const teamH = getTeamHistory(t.team)
      const titlesArr = teamH.filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE')
      const finalsArr = teamH.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE')
      const completedSeasonsArr = teamH.filter(r => parseNumber(r?.Standing) > 0)
      const unicornArr = getTeamUnicornSeasons(t.team)

      byTeam[t.team] = {
        titles: titlesArr.length,
        finals: finalsArr.length,
        playoffApps: parseNumber(t['Playoff Apps']),
        completedSeasons: completedSeasonsArr.length,
        playoffWins: parseNumber(t.PO_W),
        playoffGames: parseNumber(t.PO_W) + parseNumber(t.PO_L),
        rsWins: parseNumber(t.RS_W),
        rsLosses: parseNumber(t.RS_L),
        totalPoints: parseNumber(t.PF),
        unicorns: unicornArr.length,
        games200: getTeam200Games(t.team),
        pr1Weeks: getTeamPR1Weeks(t.team),
      }
    })
    return byTeam
  }, [allTime, history, games, teams])

  const allValuesFor = (key) => leagueStats ? Object.values(leagueStats).map(v => v[key]) : []

  if (selected) {
    const teamH = getTeamHistory(selected.team)
    const teamH2H = getTeamH2H(selected.team)
    const titles = teamH.filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE')
    const unicorns = teamH.filter(r => {
      const seasonRows = history.filter(
        h => String(h.Season) === String(r.Season)
      )

      const maxStanding = Math.max(
        ...seasonRows.map(s => Number(s.Standing) || 0)
      )

      return Number(r.Standing) === maxStanding
    })
    // Only completed seasons (have Standing data) for best/worst
    const completedTeamH = teamH.filter(r => parseNumber(r?.Standing) > 0)
    const bestSeason = [...completedTeamH].sort((a, b) => parseNumber(b.RS_W) - parseNumber(a.RS_W))[0]
    const worstSeason = [...completedTeamH].sort((a, b) => parseNumber(a.RS_W) - parseNumber(b.RS_W))[0]
    const winPct = String(selected?.['W%'] || '').trim()
    const poWinPct = String(selected?.['PO_W%'] || '').trim()
    const games200 = getTeam200Games(selected.team)
    const pr1Weeks = getTeamPR1Weeks(selected.team)

    // ── Build rank-aware subtitles ──────────────────────────────────
    const fmtYears = (rows) => rows.map(r => `'${String(r.Season).slice(-2)}`).join(', ')

    const titlesRank = leagueStats ? getOrdinalRankLabel(titles.length, allValuesFor('titles')) : null
    const titlesSub = titles.length
      ? `${fmtYears(titles)}${titlesRank === 'most all-time' ? ' (most all-time)' : ''}`
      : 'never'

    const finalsTeamH = teamH.filter(r => String(r?.Reached_Final || '').toUpperCase() === 'TRUE')
    const finalsRank = leagueStats ? getOrdinalRankLabel(finalsTeamH.length, allValuesFor('finals')) : null
    const finalsSub = finalsTeamH.length
      ? `${fmtYears(finalsTeamH)}${finalsRank === 'most all-time' ? ' (most all-time)' : ''}`
      : 'never'

    const poApps = parseNumber(selected['Playoff Apps'])
    const completedSeasonsCount = teamH.filter(r => parseNumber(r?.Standing) > 0).length
    const poAppsRank = leagueStats ? getOrdinalRankLabel(poApps, allValuesFor('playoffApps')) : null
    const poAppsSub = `in ${completedSeasonsCount} season${completedSeasonsCount === 1 ? '' : 's'}${poAppsRank ? ` (${poAppsRank})` : ''}`

    const poWins = parseNumber(selected.PO_W)
    const poGames = poWins + parseNumber(selected.PO_L)
    const poWinsRank = leagueStats ? getOrdinalRankLabel(poWins, allValuesFor('playoffWins')) : null
    const poWinsSub = `in ${poGames} game${poGames === 1 ? '' : 's'} · ${poWinPct}${poWinsRank ? ` (${poWinsRank})` : ''}`

    const rsWinsRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.RS_W), allValuesFor('rsWins')) : null
    const rsLossesRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.RS_L), allValuesFor('rsLosses')) : null
    const totalPointsRank = leagueStats ? getOrdinalRankLabel(parseNumber(selected.PF), allValuesFor('totalPoints')) : null

    const unicornsRank = leagueStats ? getOrdinalRankLabel(unicorns.length, allValuesFor('unicorns')) : null
    const unicornsSub = unicorns.length
      ? `${fmtYears(unicorns)}${unicornsRank === 'most all-time' ? ' (most all-time)' : ''}`
      : 'never'

    const games200Rank = leagueStats ? getOrdinalRankLabel(games200, allValuesFor('games200')) : null
    const pr1Rank = leagueStats ? getOrdinalRankLabel(pr1Weeks, allValuesFor('pr1Weeks')) : null

    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

        <Header />


        <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">
          <button onClick={() => setSelected(null)}
            className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-all">
            ← All Teams
          </button>

          {/* Team Hero */}
          <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)]" style={{ minHeight: '260px' }}>
            <div className="absolute inset-0 overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 900 260" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <g opacity="0.08">
                  {[400, 475, 550, 625, 700, 775].map((x, i) => (
                    <rect key={i} x={x} y="-60" width={i % 2 === 0 ? 50 : 20} height="400" fill="#22d3ee" transform={`rotate(-18 ${x + 25} 130)`} />
                  ))}
                </g>
                <g opacity="0.05" fill="none" stroke="#22d3ee" strokeWidth="1">
                  {[25, 45, 65].map(r => <circle key={r} cx="850" cy="50" r={r} />)}
                </g>
              </svg>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #08111f 30%, rgba(8,17,31,0.8) 55%, rgba(8,17,31,0.2) 100%)' }} />
            </div>

            <div className="relative z-10 flex items-center gap-8 p-10 md:p-14">
              <TeamAvatar name={selected.team} size="xl" />
              <div className="flex-1">
                <div className="mt-3 mb-3 flex flex-wrap gap-2">
                  {titles.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5">
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                        {titles.length}X Champion — {titles.map(t => t.Season).join(', ')}
                      </span>
                    </div>
                  )}

                  {unicorns.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-pink-400/20 bg-pink-400/10 px-3 py-1.5">
                      <span className="text-[11px]">🦄</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-pink-300">
                        {unicorns.length}X Unicorn — {unicorns.map(u => u.Season).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <h1 className="mb-2 leading-none font-black text-white"
                  style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(36px, 6vw, 80px)' }}>
                  {selected.team}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-400">
                  <span>{parseNumber(selected.W)}W – {parseNumber(selected.L)}L</span>
                  <span>·</span>
                  <span>{winPct} win rate</span>
                  <span>·</span>
                  <span>{teamH.length} seasons</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              [Trophy, 'Titles', parseNumber(selected.Titles), titlesSub, 'gold'],
              [Star, 'Finals Apps', parseNumber(selected.Finals), finalsSub, 'purple'],
              [Activity, 'Playoff Apps', poApps, poAppsSub, 'cyan'],
              [TrendingUp, 'Playoff Wins', poWins, poWinsSub, 'emerald'],
              [Target, 'RS Wins', parseNumber(selected.RS_W), rsWinsRank || 'regular season', 'cyan'],
              [TrendingDown, 'RS Losses', parseNumber(selected.RS_L), rsLossesRank || 'regular season', 'red'],
              [Flame, 'Total Points', Math.round(parseNumber(selected.PF)).toLocaleString(), totalPointsRank || 'all-time', 'orange'],
              [Skull, 'Unicorns', unicorns.length, unicornsSub, 'pink'],
              [Zap, '200+ Pt Games', games200, games200Rank || 'single weeks only', 'orange'],
              [TrendingUp, 'Weeks at #1 (PR)', pr1Weeks, pr1Rank || 'power rankings', 'gold'],
            ].map(([Icon, label, value, sub, accent]) => {
              const colors = {
                gold: { border: 'border-yellow-400/20', bg: 'bg-yellow-400/5', text: 'text-yellow-300', iconBg: 'bg-yellow-400/10 border-yellow-400/20' },
                purple: { border: 'border-purple-400/20', bg: 'bg-purple-400/5', text: 'text-purple-300', iconBg: 'bg-purple-400/10 border-purple-400/20' },
                cyan: { border: 'border-cyan-400/20', bg: 'bg-cyan-400/5', text: 'text-cyan-300', iconBg: 'bg-cyan-400/10 border-cyan-400/20' },
                emerald: { border: 'border-emerald-400/20', bg: 'bg-emerald-400/5', text: 'text-emerald-300', iconBg: 'bg-emerald-400/10 border-emerald-400/20' },
                orange: { border: 'border-orange-400/20', bg: 'bg-orange-400/5', text: 'text-orange-300', iconBg: 'bg-orange-400/10 border-orange-400/20' },
                slate: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-slate-200', iconBg: 'bg-white/[0.06] border-white/10' },
                red: { border: 'border-red-400/20', bg: 'bg-red-400/5', text: 'text-red-300', iconBg: 'bg-red-400/10 border-red-400/20' },
                pink: { border: 'border-pink-400/20', bg: 'bg-pink-400/5', text: 'text-pink-300', iconBg: 'bg-pink-400/10 border-pink-400/20' },
              }
              const c = colors[accent]
              return (
                <div key={label} className={`rounded-[20px] border p-4 ${c.border} ${c.bg}`}>
                  <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl border ${c.iconBg}`}>
                    <Icon className={`h-4 w-4 ${c.text}`} />
                  </div>
                  <div className={`mb-1 text-[9px] font-black uppercase tracking-[0.2em] ${c.text} opacity-80`}>{label}</div>
                  <div className={`font-black leading-none ${c.text}`} style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(24px, 3vw, 40px)' }}>
                    {value}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-200">{sub}</div>
                </div>
              )
            })}
          </div>


          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Season History */}
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
              <div className="border-b border-white/5 px-6 py-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                  <Activity className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Season History</div>
                  <div className="text-sm text-slate-400">{teamH.length} seasons</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Season', 'Reg Season', 'Overall', 'PF', 'Playoffs', 'Result'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamH.map((r, i) => {
                      const isChamp = String(r?.Champion || '').toUpperCase() === 'TRUE'
                      const isFinal = String(r?.Reached_Final || '').toUpperCase() === 'TRUE'
                      const isPlayoff = String(r?.Made_Playoffs || '').toUpperCase() === 'TRUE'
                      const seasonRows = history.filter(
                        h => String(h.Season) === String(r.Season)
                      )

                      const maxStanding = Math.max(
                        ...seasonRows.map(s => Number(s.Standing) || 0)
                      )

                      const isUnicorn = Number(r.Standing) === maxStanding
                      return (
                        <tr key={i} className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${isChamp ? 'bg-yellow-400/[0.03]' : ''}`}>
                          <td className="px-4 py-3 text-sm font-black text-white whitespace-nowrap">{r.Season}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{parseNumber(r.RS_W)}–{parseNumber(r.RS_L)}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{parseNumber(r.W)}–{parseNumber(r.L)}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{Math.round(parseNumber(r.RS_PF))}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isChamp ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-yellow-400 border border-yellow-400/20 bg-yellow-400/10 rounded-lg px-2 py-0.5">🏆 Champion</span>
                              : isUnicorn ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-pink-400 border border-pink-400/20 bg-pink-400/10 rounded-lg px-2 py-0.5">🦄 Unicorn</span>
                                : isFinal ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-purple-400 border border-purple-400/20 bg-purple-400/10 rounded-lg px-2 py-0.5">Final</span>
                                  : isPlayoff ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-cyan-400 border border-cyan-400/20 bg-cyan-400/10 rounded-lg px-2 py-0.5">Playoffs</span>
                                    : <span className="text-[9px] text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {parseNumber(r.Standing) > 0 && (
                              <span className="text-xs font-black text-slate-500">#{parseNumber(r.Standing)}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* H2H */}
            <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
              <div className="border-b border-white/5 px-6 py-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                  <Swords className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Head to Head</div>
                  <div className="text-sm text-slate-400">vs all franchises</div>
                </div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {teamH2H.map((h, i) => {
                  const total = h.wins + h.losses
                  const pct = total > 0 ? Math.round((h.wins / total) * 100) : 0
                  const ahead = h.wins > h.losses
                  const tied = h.wins === h.losses
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <TeamAvatar name={h.opponent} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-white truncate">{h.opponent}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{h.games} games · {h.streak}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-black ${ahead ? 'text-emerald-400' : tied ? 'text-slate-400' : 'text-red-400'}`}>
                          {h.wins}–{h.losses}
                        </div>
                        <div className="text-[10px] text-slate-600">{pct}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Best/Worst Season */}
          {(bestSeason || worstSeason) && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bestSeason && (
                <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">🏅 Best Season</div>
                  <div className="text-3xl font-black text-white" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                    {parseNumber(bestSeason.RS_W)}–{parseNumber(bestSeason.RS_L)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-400">{bestSeason.Season} · {Math.round(parseNumber(bestSeason.RS_PF))} pts</div>
                </div>
              )}
              {worstSeason && (
                <div className="rounded-[24px] border border-red-400/20 bg-red-400/5 p-5">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">📉 Worst Season</div>
                  <div className="text-3xl font-black text-white" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                    {parseNumber(worstSeason.RS_W)}–{parseNumber(worstSeason.RS_L)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-400">{worstSeason.Season} · {Math.round(parseNumber(worstSeason.RS_PF))} pts</div>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="mx-auto max-w-[1680px] px-6 pb-12">
          <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
            <img src="/images/LogoFinalBlack.png" alt="" width={24} height={24} style={{ filter: 'invert(1)', opacity: 0.3 }} />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
          </div>
        </footer>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      <Header>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Teams', 'Records', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            return (
              <a key={item} href={href}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${item === 'Teams' ? 'bg-white/[0.06] text-white' : 'text-slate-400'}`}
              >{item}</a>
            )
          })}
        </nav>
      </Header>

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10" style={{ background: '#020617', minHeight: '240px' }}>
          <div className="absolute inset-0 overflow-hidden rounded-[38px]">
            <svg width="100%" height="100%" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.09">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect key={i} x={x} y="-60" width={i % 2 === 0 ? 55 : 22} height="380" fill="#22d3ee" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 120)`} />
                ))}
              </g>
              <g opacity="0.07" fill="none" stroke="#22d3ee" strokeWidth="1">
                {["M380 -20 L460 80 L380 180 L300 80 Z", "M540 -20 L620 80 L540 180 L460 80 Z", "M700 -20 L780 80 L700 180 L620 80 Z", "M860 -20 L940 80 L860 180 L780 80 Z"].map((d, i) => <path key={i} d={d} />)}
              </g>
              <g opacity="0.07" fill="#22d3ee">
                <polygon points="900,0 900,110 790,0" />
                <polygon points="900,240 900,130 790,240" />
              </g>
              <text x="820" y="230" fontFamily="'Bebas Neue',sans-serif" fontSize="240" fill="#22d3ee" opacity="0.025" textAnchor="middle">TMS</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #020617 28%, rgba(2,6,23,0.9) 48%, rgba(2,6,23,0.15) 100%)' }} />
          </div>
          <div className="relative z-10 p-10 md:p-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
              <Swords className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">All Franchises</span>
            </div>
            <h1 className="leading-[0.88]"
              style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(48px, 7vw, 88px)', letterSpacing: '0.02em' }}>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>THE</span>
              <span style={{ display: 'block', background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>FRANCHISES</span>
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team, i) => {
              const teamHistory = getTeamHistory(team.team)
              const titles = teamHistory.filter(r => String(r?.Champion || '').toUpperCase() === 'TRUE').length
              const currentSeason = teamHistory[0]
              const winPct = String(team?.['W%'] || '').trim()
              const isChampion = titles > 0
              const unicornCount = teamHistory.filter(r => {
                const seasonRows = history.filter(
                  h => String(h.Season) === String(r.Season)
                )

                const maxStanding = Math.max(
                  ...seasonRows.map(s => Number(s.Standing) || 0)
                )

                return Number(r.Standing) === maxStanding
              }).length

              return (
                <button key={i} onClick={() => setSelected(team)}
                  className={`overflow-hidden rounded-[28px] border text-left transition-all hover:scale-[1.02] ${isChampion ? 'border-yellow-400/20 hover:border-yellow-400/40' : 'border-white/5 hover:border-white/15'
                    } bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]`}
                >
                  {/* Card Header */}
                  <div className="relative p-5 pb-4">
                    <div className="absolute right-4 top-4 flex gap-1 text-lg">
                      {titles >= 1 && '🏆'.repeat(Math.min(titles, 3))}
                      {unicornCount >= 1 && '🦄'.repeat(Math.min(unicornCount, 3))}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <TeamAvatar name={team.team} size="md" />
                      <div className="min-w-0">
                        <div className="font-black text-white leading-tight truncate" style={{ fontSize: 'clamp(13px, 1.8vw, 16px)' }}>
                          {team.team}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{teamHistory.length} seasons</div>
                      </div>
                    </div>

                    {/* Record */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-black text-cyan-300" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        {parseNumber(team.W)}
                      </span>
                      <span className="text-slate-400 font-black">–</span>
                      <span className="text-3xl font-black text-slate-300" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        {parseNumber(team.L)}
                      </span>
                      <span className="text-xs font-bold text-slate-300 ml-1">{winPct}</span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        ['Titles', titles || '—'],
                        ['Finals', parseNumber(team.Finals) || '—'],
                        ['PO Apps', parseNumber(team['Playoff Apps']) || '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-2 text-center">
                          <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-300">{label}</div>
                          <div className="text-sm font-black text-white mt-0.5">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Current season */}
                    {currentSeason && (
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          {currentSeason.Season}
                        </span>
                        <span className="text-xs font-black text-slate-200">
                          {parseNumber(currentSeason.RS_W)}–{parseNumber(currentSeason.RS_L)}
                          {String(currentSeason?.Champion || '').toUpperCase() === 'TRUE' && ' 🏆'}
                          {String(currentSeason?.Reached_Final || '').toUpperCase() === 'TRUE' && String(currentSeason?.Champion || '').toUpperCase() !== 'TRUE' && ' 🥈'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">View Profile</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-[1680px] px-6 pb-12">
        <div className="flex items-center justify-center gap-3 rounded-[28px] border border-white/5 py-6">
          <img src="/images/LogoFinalBlack.png" alt="" width={24} height={24} style={{ filter: 'invert(1)', opacity: 0.3 }} />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}