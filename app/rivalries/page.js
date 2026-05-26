'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useRef } from 'react'
import { Swords, Flame, Trophy, Target, Activity, ChevronRight, Radar, Stars } from 'lucide-react'

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

function getRivalryHeat(games, aWins, bWins, avgMargin) {
  const totalGames = parseNumber(games)
  const winsA = parseNumber(aWins)
  const winsB = parseNumber(bWins)
  const recordGap = Math.abs(winsA - winsB)
  const margin = Math.abs(parseFloat(String(avgMargin).replace(',', '.')) || 0)
  let score = 0
  if (recordGap === 0) score += 7
  else if (recordGap === 1) score += 5
  else if (recordGap === 2) score += 3
  else if (recordGap === 3) score += 1
  else score -= 3
  if (totalGames >= 14) score += 5
  else if (totalGames >= 10) score += 4
  else if (totalGames >= 6) score += 2
  if (margin <= 3) score += 5
  else if (margin <= 7) score += 3
  else if (margin <= 12) score += 1
  if (score >= 13) return { label: 'Legendary', color: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' }
  if (score >= 10) return { label: 'Elite',     color: 'text-orange-400 border-orange-400/20 bg-orange-400/10' }
  if (score >= 7)  return { label: 'High',      color: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10' }
  if (score >= 4)  return { label: 'Medium',    color: 'text-slate-300 border-slate-300/20 bg-slate-300/10' }
  return { label: 'Low', color: 'text-slate-500 border-slate-500/20 bg-slate-500/10' }
}

// Dropdown customizado
function Select({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all w-full ${
          open ? 'border-cyan-400/40 bg-white/[0.07] text-white' : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]'
        }`}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>{value || placeholder}</span>
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

export default function RivalriesPage() {
  const [h2hData,   setH2hData]   = useState([])
  const [gamesData, setGamesData] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filterTeam, setFilterTeam] = useState('')
  const [selected,  setSelected]  = useState(null)
  const [sortBy,    setSortBy]    = useState('heat')

  useEffect(() => {
    async function load() {
      const [h2h, games] = await Promise.all([
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])
      setH2hData(h2h)
      setGamesData(games)
      setLoading(false)
    }
    load()
  }, [])

  const allTeams = useMemo(() => {
    const teams = new Set()
    h2hData.forEach(r => {
      if (r?.['Team A']) teams.add(String(r['Team A']).trim())
      if (r?.['Team B']) teams.add(String(r['Team B']).trim())
    })
    return Array.from(teams).sort()
  }, [h2hData])

  // Deduplica — pega só uma linha por par de times
  const rivalries = useMemo(() => {
    const seen = new Set()
    const result = []
    h2hData.forEach(r => {
      const a = String(r?.['Team A'] || '').trim()
      const b = String(r?.['Team B'] || '').trim()
      if (!a || !b) return
      const key = [normalizeString(a), normalizeString(b)].sort().join('|')
      if (seen.has(key)) return
      seen.add(key)

      const heat = getRivalryHeat(r?.Games, r?.['A Wins'], r?.['B Wins'], r?.['Avg Margin'])
      const heatScore = heat.label === 'Legendary' ? 5 : heat.label === 'Elite' ? 4 : heat.label === 'High' ? 3 : heat.label === 'Medium' ? 2 : 1

      result.push({
        teamA:       a,
        teamB:       b,
        games:       parseNumber(r?.Games),
        aWins:       parseNumber(r?.['A Wins']),
        bWins:       parseNumber(r?.['B Wins']),
        pfA:         parseNumber(r?.['PF A']),
        pfB:         parseNumber(r?.['PF B']),
        avgMargin:   String(r?.['Avg Margin'] || '0'),
        aRsW:        parseNumber(r?.['A RS_W']),
        bRsW:        parseNumber(r?.['B RS_W']),
        aPoW:        parseNumber(r?.['A PO_W']),
        bPoW:        parseNumber(r?.['B PO_W']),
        streak:      String(r?.['Current Streak'] || '—'),
        bestStreakA:  String(r?.['Best Streak Team A'] || '—'),
        bestStreakB:  String(r?.['Best Streak Team B'] || '—'),
        lastMatch:   String(r?.['Last Match'] || ''),
        biggestWinA: String(r?.['Biggest Win Team A'] || '—'),
        biggestWinB: String(r?.['Biggest Win Team B'] || '—'),
        heat,
        heatScore,
      })
    })

    // Filtra por time
    const filtered = filterTeam
      ? result.filter(r =>
          normalizeString(r.teamA) === normalizeString(filterTeam) ||
          normalizeString(r.teamB) === normalizeString(filterTeam)
        )
      : result

    // Ordena
    return filtered.sort((a, b) => {
      if (sortBy === 'heat')  return b.heatScore - a.heatScore
      if (sortBy === 'games') return b.games - a.games
      if (sortBy === 'close') return Math.abs(a.aWins - a.bWins) - Math.abs(b.aWins - b.bWins)
      return 0
    })
  }, [h2hData, filterTeam, sortBy])

  // Histórico jogo a jogo do confronto selecionado
  const matchHistory = useMemo(() => {
    if (!selected) return []
    const seen = new Set()
    return gamesData
      .filter(g => {
        const team = normalizeString(g?.Team || '')
        const opp  = normalizeString(g?.Opponent || '')
        const a    = normalizeString(selected.teamA)
        const b    = normalizeString(selected.teamB)
        return (team === a && opp === b) || (team === b && opp === a)
      })
      .filter(g => {
        const key = [
          String(g?.Season || '').trim(),
          String(g?.Week || '').trim(),
          normalizeString(g?.Team || ''),
          normalizeString(g?.Opponent || ''),
        ].sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(g => ({
        season:   String(g?.Season || '').trim(),
        week:     String(g?.Week || '').trim(),
        team:     String(g?.Team || '').trim(),
        opponent: String(g?.Opponent || '').trim(),
        pf:       parseNumber(g?.PF || 0),
        pa:       parseNumber(g?.PA || 0),
        result:   String(g?.Result || '').trim().toUpperCase(),
        stage:    String(g?.GameType || g?.GameStage || '').trim(),
      }))
      .sort((a, b) => {
        if (a.season !== b.season) return Number(a.season) - Number(b.season)
        return parseFloat(a.week) - parseFloat(b.week)
      })
  }, [selected, gamesData])

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');`}</style>

      {/* Header */}
      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/images/LogoFinalBlack.png" alt="Tapitas League" width={36} height={36} style={{ filter: 'invert(1)' }} className="opacity-80" />
          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas<span className="text-cyan-400">League</span>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {['Home', 'Standings', 'Matchups', 'History', 'Rivalries'].map(item => {
            const href = item === 'Home' ? '/' : `/${item.toLowerCase()}`
            const isActive = item === 'Rivalries'
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
        <div className="relative mb-8 overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,#08111f,#0b1422,#0d1028)] p-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
          </div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
            <Swords className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Head to Head</span>
          </div>
          <h1 className="leading-[0.9] tracking-[-0.02em]"
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 'clamp(48px, 7vw, 96px)',
              background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
            All{' '}
            <span style={{
              background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Rivalries</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-slate-400">
            Every matchup. Every grudge. Every chapter of the league's fiercest battles.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 font-bold">Loading...</div>
        ) : (
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">

            {/* Coluna esquerda — lista de rivalidades */}
            <div className="w-full xl:w-[420px] flex-shrink-0">
              <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

                {/* Filtros */}
                <div className="border-b border-white/5 p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex-shrink-0">
                      <Swords className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Rivalries</div>
                      <div className="text-base text-slate-400">{rivalries.length} matchups</div>
                    </div>
                  </div>

                  <Select
                    value={filterTeam}
                    onChange={setFilterTeam}
                    options={['', ...allTeams]}
                    placeholder="Filter by team..."
                  />

                  <div className="flex gap-2">
                    {[
                      { key: 'heat',  label: '🔥 Heat' },
                      { key: 'games', label: '📊 Games' },
                      { key: 'close', label: '⚔️ Closest' },
                    ].map(s => (
                      <button key={s.key} onClick={() => setSortBy(s.key)}
                        className={`flex-1 rounded-2xl px-3 py-2 text-xs font-black transition-all ${
                          sortBy === s.key
                            ? 'bg-cyan-400/10 border border-cyan-400/25 text-cyan-300'
                            : 'border border-white/5 bg-white/[0.03] text-slate-500 hover:text-slate-300'
                        }`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                {/* Lista */}
                <div className="max-h-[600px] overflow-y-auto">
                  {rivalries.map((r, i) => {
                    const isSelected = selected === r
                    const leader = r.aWins > r.bWins ? r.teamA : r.bWins > r.aWins ? r.teamB : null
                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(isSelected ? null : r)}
                        className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all border-b border-white/[0.03] last:border-0 ${
                          isSelected ? 'bg-cyan-400/[0.05]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Heat badge */}
                        <div className={`flex-shrink-0 rounded-xl border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${r.heat.color}`}>
                          {r.heat.label}
                        </div>

                        {/* Times */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-white truncate">
                            {r.teamA} <span className="text-cyan-400 mx-1">vs</span> {r.teamB}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {r.aWins}–{r.bWins} · {r.games} games
                            {leader ? ` · ${leader.split(' ')[0]} leads` : ' · Tied'}
                          </div>
                        </div>

                        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-600 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Coluna direita — detalhe */}
            {selected ? (
              <div className="flex-1 flex flex-col gap-6">

                {/* Stats do confronto */}
                <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

                  {/* Header */}
                  <div className="border-b border-white/5 px-8 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h2 className="font-black leading-tight"
                        style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(22px, 4vw, 44px)' }}>
                        {selected.teamA}
                        <span className="mx-3 text-cyan-400" style={{ fontSize: '0.6em' }}>vs</span>
                        {selected.teamB}
                      </h2>
                      <div className={`rounded-2xl border px-4 py-1.5 text-sm font-black uppercase tracking-widest ${selected.heat.color}`}>
                        {selected.heat.label} Rivalry
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3">
                    {[
                      [Target,   'Overall Record',    `${selected.aWins}–${selected.bWins}`],
                      [Activity, 'Total Games',        selected.games],
                      [Flame,    'Avg Margin',         `${selected.avgMargin} pts`],
                      [Trophy,   'Playoff Record',     `${selected.aPoW}–${selected.bPoW}`],
                      [Radar,    'RS Record',          `${selected.aRsW}–${selected.bRsW}`],
                      [Stars,    'Current Streak',     selected.streak],
                      [Swords,   'Best Streak A',      selected.bestStreakA],
                      [Swords,   'Best Streak B',      selected.bestStreakB],
                      [Flame,    'Biggest Win A',      selected.biggestWinA],
                      [Flame,    'Biggest Win B',      selected.biggestWinB],
                    ].map(([Icon, label, value]) => (
                      <div key={label} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                          <Icon className="h-4 w-4 text-cyan-300" />
                        </div>
                        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</div>
                        <div className="text-xl font-black text-white leading-tight">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Histórico jogo a jogo */}
                <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">
                  <div className="border-b border-white/5 px-8 py-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                      <Activity className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Game History</div>
                      <div className="text-base text-slate-400">{matchHistory.length} games played</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Season</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Week</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Type</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Winner</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Score</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((g, i) => {
                          const won = g.result === 'W'
                          const winner = won ? g.team : g.opponent
                          const margin = Math.abs(g.pf - g.pa)
                          const isPlayoff = g.stage && g.stage !== 'Reg Season'
                          return (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-3 text-sm font-black text-white">{g.season}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">W{g.week}</td>
                              <td className="px-4 py-3">
                                {isPlayoff ? (
                                  <span className="text-[9px] font-black uppercase tracking-widest rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-cyan-300">
                                    {g.stage}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-600">Reg</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-black text-white">{winner}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold text-cyan-300">{won ? g.pf.toFixed(2) : g.pa.toFixed(2)}</span>
                                <span className="text-slate-600 mx-1">–</span>
                                <span className="text-sm font-bold text-slate-400">{won ? g.pa.toFixed(2) : g.pf.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-slate-500">{margin.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center rounded-[38px] border border-white/5 bg-white/[0.02] py-20">
                <div className="text-center">
                  <Swords className="h-10 w-10 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-600 font-bold">Select a rivalry to see the full history</p>
                </div>
              </div>
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