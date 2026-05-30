'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bebas_Neue } from 'next/font/google'

import {
  Activity,
  ChevronDown,
  Flame,
  Stars,
  Swords
} from 'lucide-react'

const SHEET_ID =
  '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'

const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: '400'
})

/* =====================================================
UTILS
===================================================== */

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  const text = String(value)
    .replace(',', '.')
    .trim()

  const parsed = parseFloat(text)

  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function safeFetch(url) {
  try {
    const res = await fetch(url)

    if (!res.ok) return []

    const json = await res.json()

    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

function getRivalryHeat(
  games,
  aWins,
  bWins,
  avgMargin
) {
  const totalGames = parseNumber(games)

  const winsA = parseNumber(aWins)

  const winsB = parseNumber(bWins)

  const recordGap = Math.abs(winsA - winsB)

  const margin = Math.abs(
    parseFloat(
      String(avgMargin).replace(',', '.')
    ) || 0
  )

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

  if (score >= 13) return 'LEGENDARY'
  if (score >= 10) return 'ELITE'
  if (score >= 7) return 'HIGH'
  if (score >= 4) return 'MEDIUM'

  return 'LOW'
}

/* =====================================================
PARSERS
===================================================== */

function parseCurrentStreak(streak) {
  if (!streak || streak === '—') {
    return null
  }

  const text = String(streak)

  const match = text.match(
    /(.*?)\s([WL])(\d+)/i
  )

  if (!match) {
    return {
      raw: text,
      team: text,
      result: '',
      count: ''
    }
  }

  return {
    raw: text,
    team: match[1].trim(),
    result: match[2],
    count: match[3]
  }
}

function parseBestStreak(streak) {
  if (!streak || streak === '—') {
    return null
  }

  const text = String(streak).trim()

  const firstMatch = text.match(
    /^(.*?)\s([WL])([\d/-]+)/
  )

  const rangeMatch = text.match(
    /\((.*?)\)/
  )

  if (!firstMatch) {
    return {
      raw: text
    }
  }

  let start = ''
  let end = ''

  if (rangeMatch) {
    const cleaned = rangeMatch[1]

    const parts = cleaned.split(
      /\s*(?:→|=>|⇒)\s*/
    )

    if (parts.length >= 2) {
      start = parts[0]
        .replace(/\s+/g, ' ')
        .trim()
        .replace(
          /W\s*([\d/-]+)/i,
          'Week $1'
        )

      end = parts[1]
        .replace(/\s+/g, ' ')
        .trim()
        .replace(
          /W\s*([\d/-]+)/i,
          'Week $1'
        )
    }
  }

  return {
    raw: text,

    team: firstMatch[1].trim(),

    result: firstMatch[2],

    count: firstMatch[3],

    start,

    end
  }
}

function parseBiggestWin(value) {
  if (!value || value === '—') {
    return null
  }

  const text = String(value)

  const scoreMatch = text.match(
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/
  )

  const marginMatch = text.match(
    /\(\+?(\d+(?:\.\d+)?)\)/
  )

  const weekMatch = text.match(
    /(\d{4}\sW[\d/-]+)/
  )

  return {
    raw: text,

    scoreA: scoreMatch
      ? scoreMatch[1]
      : '0',

    scoreB: scoreMatch
      ? scoreMatch[2]
      : '0',

    margin: marginMatch
      ? marginMatch[1]
      : '0',

    game: weekMatch
      ? weekMatch[1].replace(
        /W(\d+)/,
        'Week $1'
      )
      : ''
  }
}

/* =====================================================
BADGE
===================================================== */

function HeatBadge({ heat }) {
  const colors = {
    LEGENDARY:
      'bg-yellow-400/15 text-yellow-300 border-yellow-400/20',

    ELITE:
      'bg-orange-400/15 text-orange-300 border-orange-400/20',

    HIGH:
      'bg-cyan-400/15 text-cyan-300 border-cyan-400/20',

    MEDIUM:
      'bg-slate-400/15 text-slate-300 border-slate-400/20',

    LOW:
      'bg-slate-700/20 text-slate-500 border-slate-700/20'
  }

  return (
    <div
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.3em] ${colors[heat]}`}
    >
      {heat}
    </div>
  )
}

/* =====================================================
PAGE
===================================================== */

export default function RivalriesPage() {
  const [h2hData, setH2hData] =
    useState([])

  const [gamesData, setGamesData] =
    useState([])

  const [selected, setSelected] =
    useState(null)

  const [teamFilterA, setTeamFilterA] =
    useState('ALL')

  const [teamFilterB, setTeamFilterB] =
    useState('ALL')

  const [sortBy, setSortBy] =
    useState('HEAT')

  const [seasonFilter, setSeasonFilter] =
    useState('ALL')

  /* =====================================================
  LOAD
  ===================================================== */

  useEffect(() => {
    async function load() {
      const [h2h, games] =
        await Promise.all([
          safeFetch(
            `${BASE_URL}/HEAD_TO_HEAD_SORTED`
          ),

          safeFetch(
            `${BASE_URL}/GAME_FACTS_ALL`
          )
        ])

      setH2hData(h2h)

      setGamesData(games)
    }

    load()
  }, [])

  /* =====================================================
  TEAMS
  ===================================================== */

  const allTeams = useMemo(() => {
    return [
      ...new Set(
        h2hData.flatMap((r) => [
          String(r['Team A'] || ''),
          String(r['Team B'] || '')
        ])
      )
    ]
      .filter(Boolean)
      .sort()
  }, [h2hData])

  /* =====================================================
  RIVALRIES
  ===================================================== */

  const heatRank = {
    LEGENDARY: 5,
    ELITE: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  }

  const rivalries = useMemo(() => {
    const result = []

    const seen = new Set()

    h2hData.forEach((r) => {
      const a = String(
        r?.['Team A'] || ''
      ).trim()

      const b = String(
        r?.['Team B'] || ''
      ).trim()

      if (!a || !b) return

      const key = `${normalizeString(a)}|${normalizeString(b)}`

      if (seen.has(key)) return

      seen.add(key)

      let teamA = a
      let teamB = b

      let aWins = parseNumber(
        r?.['A Wins']
      )

      let bWins = parseNumber(
        r?.['B Wins']
      )

      const swapped =
        teamFilterA !== 'ALL' &&
        b === teamFilterA

      result.push({
        teamA,
        teamB,

        aWins,
        bWins,

        games: parseNumber(r?.Games),

        avgMargin: String(
          r?.['Avg Margin'] || '0'
        ),

        streak: String(
          r?.['Current Streak'] || '—'
        ),

        biggestA: swapped
          ? String(
            r?.['Biggest Win Team B'] || '—'
          )
          : String(
            r?.['Biggest Win Team A'] || '—'
          ),

        biggestB: swapped
          ? String(
            r?.['Biggest Win Team A'] || '—'
          )
          : String(
            r?.['Biggest Win Team B'] || '—'
          ),

        bestA: swapped
          ? String(
            r?.['Best Streak Team B'] || '—'
          )
          : String(
            r?.['Best Streak Team A'] || '—'
          ),

        bestB: swapped
          ? String(
            r?.['Best Streak Team A'] || '—'
          )
          : String(
            r?.['Best Streak Team B'] || '—'
          ),

        heat: getRivalryHeat(
          r?.Games,
          r?.['A Wins'],
          r?.['B Wins'],
          r?.['Avg Margin']
        )
      })
    })

    return result
      .filter((r) => {
        const matchA =
          teamFilterA === 'ALL' ||
          r.teamA === teamFilterA

        const matchB =
          teamFilterB === 'ALL' ||
          r.teamB === teamFilterB

        return matchA && matchB
      })
      .sort((a, b) => {
        if (sortBy === 'GAMES') {
          return b.games - a.games
        }

        if (sortBy === 'CLOSEST') {
          // =====================================================
          // 1. MENOR DIFERENÇA DE VITÓRIAS
          // =====================================================

          const diffA = Math.abs(
            a.aWins - a.bWins
          )

          const diffB = Math.abs(
            b.aWins - b.bWins
          )

          if (diffA !== diffB) {
            return diffA - diffB
          }

          // =====================================================
          // 2. MAIS JOGOS DISPUTADOS
          // =====================================================

          const gamesA =
            a.aWins + a.bWins

          const gamesB =
            b.aWins + b.bWins

          if (gamesA !== gamesB) {
            return gamesB - gamesA
          }

          // =====================================================
          // 3. MENOR AVG MARGIN
          // =====================================================

          const marginA = Math.abs(
            parseFloat(a.avgMargin)
          )

          const marginB = Math.abs(
            parseFloat(b.avgMargin)
          )

          return marginA - marginB
        }

        if (sortBy === 'HEAT') {
          const heatDiff =
            heatRank[b.heat] -
            heatRank[a.heat]

          // desempate por jogos
          if (heatDiff !== 0) {
            return heatDiff
          }

          return b.games - a.games
        }

        return 0
      })
  }, [
    h2hData,
    teamFilterA,
    teamFilterB,
    sortBy
  ])

  /* =====================================================
  AUTO SELECT
  ===================================================== */

  useEffect(() => {
  if (rivalries.length === 1) {
    setSelected(rivalries[0])
  } else {
    setSelected(null)
  }
}, [teamFilterA, teamFilterB])

  /* =====================================================
  HISTORY
  ===================================================== */

  const history = useMemo(() => {
    if (!selected) return []

    const seen = new Set()

    return gamesData.filter((g) => {
      const team = normalizeString(g.Team)

      const opp = normalizeString(
        g.Opponent
      )

      const a = normalizeString(
        selected.teamA
      )

      const b = normalizeString(
        selected.teamB
      )

      const isMatch =
        (team === a && opp === b) ||
        (team === b && opp === a)

      if (!isMatch) return false

      // chave única da partida
      const key = [
        g.Season,
        g.Week,
        a,
        b
      ]
        .sort()
        .join('|')

      // já existe
      if (seen.has(key)) {
        return false
      }

      seen.add(key)

      return true
    })
  }, [selected, gamesData])

  const seasons = [
    'ALL',

    ...new Set(
      history.map((g) => g.Season)
    )
  ]

  const filteredHistory =
    seasonFilter === 'ALL'
      ? history
      : history.filter(
        (g) =>
          g.Season === seasonFilter
      )

  /* =====================================================
  PARSED
  ===================================================== */

  const currentStreak = selected
    ? parseCurrentStreak(selected.streak)
    : null

  const parsedBestA = selected
    ? parseBestStreak(selected.bestA)
    : null

  const parsedBestB = selected
    ? parseBestStreak(selected.bestB)
    : null

  const bestA =
    parsedBestA?.team ===
      selected?.teamA
      ? parsedBestA
      : parsedBestB

  const bestB =
    parsedBestA?.team ===
      selected?.teamA
      ? parsedBestB
      : parsedBestA

  const parsedBiggestA = selected
    ? parseBiggestWin(selected.biggestA)
    : null

  const parsedBiggestB = selected
    ? parseBiggestWin(selected.biggestB)
    : null

  const biggestA = parsedBiggestA

  const biggestB = parsedBiggestB

  const titleFont = {
    fontFamily: bebas.style.fontFamily
  }

  const teamAColor =
    'text-cyan-300'

  const teamABg =
    'bg-cyan-400'

  const teamAAccent =
    'border-cyan-400/20 bg-cyan-400/10'

  const teamBColor =
    'text-purple-300'

  const teamBBg =
    'bg-purple-400'

  const teamBAccent =
    'border-purple-400/20 bg-purple-400/10'

  const streakCount = parseInt(
    currentStreak?.count || 0
  )

  const streakColors =
    streakCount >= 8
      ? {
        border:
          'border-red-400/30',
        bg: 'bg-red-400/10',
        text: 'text-red-300',
        glow: 'shadow-red-500/20'
      }
      : streakCount >= 5
        ? {
          border:
            'border-orange-400/30',
          bg: 'bg-orange-400/10',
          text: 'text-orange-300',
          glow:
            'shadow-orange-500/20'
        }
        : streakCount >= 3
          ? {
            border:
              'border-yellow-400/30',
            bg: 'bg-yellow-400/10',
            text: 'text-yellow-300',
            glow:
              'shadow-yellow-500/20'
          }
          : {
            border:
              'border-cyan-400/20',
            bg: 'bg-cyan-400/10',
            text: 'text-cyan-300',
            glow:
              'shadow-cyan-500/10'
          }

  /* =====================================================
RENDER
===================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] text-white">
      {/* HEADER */}

      <header className="mx-auto flex max-w-[1680px] items-center justify-between px-6 py-5">
        {/* LOGO */}

        <a
          href="/"
          className="flex items-center gap-3"
        >
          <Image
            src="/images/LogoFinalBlack.png"
            alt="Tapitas League"
            width={36}
            height={36}
            style={{ filter: 'invert(1)' }}
            className="opacity-80"
          />

          <span className="text-base font-black tracking-[-0.04em]">
            Tapitas
            <span className="text-cyan-400">
              League
            </span>
          </span>
        </a>

        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3">
          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-1 md:flex">
            {[
              'Home',
              'Standings',
              'Matchups',
              'History',
              'Rivalries'
            ].map((item) => {
              const href =
                item === 'Home'
                  ? '/'
                  : `/${item.toLowerCase()}`

              const isActive =
                item === 'Rivalries'

              return (
                <a
                  key={item}
                  href={href}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all hover:bg-white/[0.06] hover:text-white ${isActive
                    ? 'bg-white/[0.06] text-white'
                    : 'text-slate-400'
                    }`}
                >
                  {item}
                </a>
              )
            })}
          </nav>

        </div>
      </header>
      <section className="mx-auto max-w-[1800px] px-3 py-3 md:px-5">

  {/* SELETOR DE TIMES */}
  <div className="mb-4 grid grid-cols-2 gap-3">
    <div className="rounded-[24px] border border-white/10 bg-[#071120] px-5 py-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
        Team
      </div>
      <select
        value={teamFilterA}
        onChange={(e) => {
          setTeamFilterA(e.target.value)
          setSelected(null)
        }}
        className="w-full bg-transparent text-base font-black outline-none"
      >
        <option value="ALL">Select team...</option>
        {allTeams.map((team) => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
    </div>

    <div className="rounded-[24px] border border-white/10 bg-[#071120] px-5 py-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
        Opponent
      </div>
      <select
        value={teamFilterB}
        onChange={(e) => {
          setTeamFilterB(e.target.value)
          setSelected(null)
        }}
        className="w-full bg-transparent text-base font-black outline-none"
      >
        <option value="ALL">vs opponent...</option>
        {allTeams.map((team) => (
          <option key={team} value={team}>{team}</option>
        ))}
      </select>
    </div>
  </div>

  {/* SORT */}
  <div className="mb-6 flex gap-2">
    {[
      { label: 'Heat', value: 'HEAT', icon: '🔥' },
      { label: 'Games', value: 'GAMES', icon: '📊' },
      { label: 'Closest', value: 'CLOSEST', icon: '⚔️' }
    ].map((item) => (
      <button
        key={item.value}
        onClick={() => setSortBy(item.value)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-black transition-all ${
          sortBy === item.value
            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
            : 'border-white/10 bg-white/[0.03] text-slate-500'
        }`}
      >
        <span>{item.icon}</span>
        {item.label}
      </button>
    ))}
  </div>

  {/* LISTA DE RIVALIDADES */}
  {!selected && (
    <div className="flex flex-col gap-3 mb-6">
      {rivalries.map((r, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelected(r)}
          className="w-full rounded-[28px] border border-white/10 bg-[#071120] p-5 text-left transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]"
        >
          <div className="mb-3 flex items-center justify-between">
            <HeatBadge heat={r.heat} />
            <div className="text-slate-500 text-sm font-black">
              {r.aWins + r.bWins} jogos
            </div>
          </div>

          <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '28px', lineHeight: 0.9 }}>
            {r.teamA}
          </div>

          <div className="my-1 text-xs font-black uppercase tracking-[0.3em] text-cyan-400">
            vs
          </div>

          <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '28px', lineHeight: 0.9 }}>
            {r.teamB}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-black">{r.aWins}</div>
            <div className="text-3xl font-black text-slate-600">—</div>
            <div className="text-3xl font-black text-slate-600">{r.bWins}</div>
          </div>
        </motion.button>
      ))}
    </div>
  )}

  {/* CONTEÚDO DO HEAD TO HEAD */}
  <div className="min-w-0 flex-1 overflow-hidden">
    {selected ? (
      <>
        {/* BOTÃO VOLTAR */}
        <button
          onClick={() => {
            setSelected(null)
            setTeamFilterA('ALL')
            setTeamFilterB('ALL')
          }}
          className="mb-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-black text-slate-400 transition-all hover:text-white"
        >
          ← Voltar
        </button>

        {/* HERO */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#071120]"
        >
          <div className="absolute inset-0">
            <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-[-140px] right-[-100px] h-[360px] w-[360px] rounded-full bg-purple-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 px-5 py-5 md:px-10 md:py-8">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <HeatBadge heat={selected.heat} />
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                Historic Rivalry
              </div>
            </div>

            <div
              className="mb-6 leading-[0.82] md:mb-8"
              style={{
                fontFamily: bebas.style.fontFamily,
                fontSize: 'clamp(38px,11vw,110px)'
              }}
            >
              <div>{selected.teamA}</div>
              <div className="text-cyan-400">vs</div>
              <div>{selected.teamB}</div>
            </div>

            <div className="flex items-end gap-3 overflow-hidden">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                  Overall Record
                </div>
                <div className="mt-2 flex items-end gap-1 whitespace-nowrap" style={{ flexShrink: 0 }}>
                  <div className="shrink-0 text-[72px] font-black leading-none sm:text-[110px] md:text-[140px]">
                    {selected.aWins}
                  </div>
                  <div className="shrink-0 pb-2 text-[42px] font-black text-cyan-400 sm:text-[72px] md:pb-5">
                    —
                  </div>
                  <div className="shrink-0 text-[72px] font-black leading-none sm:text-[110px] md:text-[140px]">
                    {selected.bWins}
                  </div>
                </div>
              </div>

              <div className={`ml-auto shrink-0 w-[145px] sm:w-[210px] rounded-[20px] sm:rounded-[24px] border p-3 sm:p-4 shadow-2xl transition-all ${streakColors.border} ${streakColors.bg} ${streakColors.glow}`}>
                <div className="mb-2 flex items-center gap-2 sm:mb-3">
                  <Flame className={`h-4 w-4 sm:h-5 sm:w-5 ${streakColors.text}`} />
                  <div className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.35em] ${streakColors.text}`}>
                    Current Streak
                  </div>
                </div>
                <div className={`text-[42px] sm:text-[64px] font-black leading-none ${streakColors.text}`}>
                  {currentStreak?.result}{currentStreak?.count}
                </div>
                <div className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] sm:text-base font-black leading-tight">
                  {currentStreak?.team}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* BIGGEST WINS */}
        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[{ data: biggestA, side: 'A' }, { data: biggestB, side: 'B' }].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[32px] border border-white/10 bg-[#071120]"
            >
              <div className="border-b border-white/5 p-6">
                <div className={`mb-6 flex items-center gap-2 ${item.side === 'A' ? teamAColor : teamBColor}`}>
                  <Stars className="h-5 w-5" />
                  <div className="text-[10px] font-black uppercase tracking-[0.35em]">Biggest Win</div>
                </div>
                <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '54px', lineHeight: 0.9 }}>
                  {item.side === 'A' ? selected.teamA : selected.teamB}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-baseline gap-3">
                  <div className={`sm:text-[72px] md:text-[92px] leading-none text-[52px] font-black ${item.side === 'A' ? 'text-cyan-300' : 'text-purple-300'}`}>
                    {Math.max(item.data?.scoreA || 0, item.data?.scoreB || 0)}
                  </div>
                  <div className="pb-3 text-4xl font-black text-slate-600">—</div>
                  <div className="pb-3 text-4xl font-black text-slate-500">
                    {Math.min(item.data?.scoreA || 0, item.data?.scoreB || 0)}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">Season</div>
                    <div className="mt-2 text-lg font-black">{item.data?.game?.split(' ')[0]}</div>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] p-3">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">Week</div>
                    <div className="mt-2 text-lg font-black">{item.data?.game?.match(/Week\s[\d/-]+/)?.[0]}</div>
                  </div>
                  <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-3">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-green-200">Margin</div>
                    <div className="mt-2 text-lg font-black text-green-300">+{item.data?.margin}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* BEST STREAKS */}
        <section className="mb-6 mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[{ data: bestA, side: 'A' }, { data: bestB, side: 'B' }].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="rounded-[32px] border border-white/10 bg-[#071120] p-6"
            >
              <div className={`mb-6 flex items-center gap-2 ${item.side === 'A' ? 'text-cyan-300' : 'text-purple-300'}`}>
                <Flame className="h-5 w-5" />
                <div className="text-[10px] font-black uppercase tracking-[0.35em]">Best Streak</div>
              </div>
              <div className="mt-4 leading-[0.9]" style={{ fontFamily: bebas.style.fontFamily, fontSize: '54px' }}>
                {item.data?.team}
              </div>
              <div className={`mt-6 text-7xl font-black ${item.side === 'A' ? 'text-cyan-300' : 'text-purple-300'}`}>
                {item.data?.result}{item.data?.count}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/5 pt-5">
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Started</div>
                  <div className="mt-2 text-sm font-bold">{item.data?.start}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Ended</div>
                  <div className="mt-2 text-sm font-bold">{item.data?.end}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* TIMELINE */}
        <section className="mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-[#071120]">
          <div className="border-b border-white/5 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-cyan-300" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                  Rivalry Timeline
                </div>
                <div className="mt-2" style={{ ...titleFont, fontSize: 'clamp(42px,7vw,62px)', lineHeight: 0.9 }}>
                  Every Chapter
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 pt-5 md:px-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {seasons.map((season) => (
                <button
                  key={season}
                  onClick={() => setSeasonFilter(season)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition-all ${
                    seasonFilter === season ? 'bg-cyan-400 text-black' : 'bg-white/[0.03] text-slate-400'
                  }`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-5 md:p-8">
            {filteredHistory.map((g, i) => {
              const won = g.Result === 'W'
              const winner = won ? g.Team : g.Opponent
              const loser = won ? g.Opponent : g.Team
              const winnerScore = won ? parseNumber(g.PF) : parseNumber(g.PA)
              const loserScore = won ? parseNumber(g.PA) : parseNumber(g.PF)
              const winnerIsA = normalizeString(winner) === normalizeString(selected.teamA)
              const marginValue = Math.abs(winnerScore - loserScore)
              const marginStyle =
                marginValue >= 40
                  ? { border: 'border-red-400/30', bg: 'bg-red-400/15', text: 'text-red-300', label: 'text-red-200' }
                  : marginValue >= 25
                  ? { border: 'border-orange-400/30', bg: 'bg-orange-400/15', text: 'text-orange-300', label: 'text-orange-200' }
                  : marginValue >= 15
                  ? { border: 'border-yellow-400/25', bg: 'bg-yellow-400/10', text: 'text-yellow-300', label: 'text-yellow-200' }
                  : marginValue >= 8
                  ? { border: 'border-cyan-400/20', bg: 'bg-cyan-400/10', text: 'text-cyan-300', label: 'text-cyan-200' }
                  : { border: 'border-emerald-400/20', bg: 'bg-emerald-400/10', text: 'text-emerald-300', label: 'text-emerald-200' }

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${winnerIsA ? teamABg : teamBBg}`} />
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                      {g.Season} · Week {g.Week}
                    </div>
                  </div>

                  {g.GameStage && g.GameStage !== 'Reg Season' && (
                    <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                      g.GameStage === 'Playoffs'
                        ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                        : 'border-slate-400/20 bg-slate-400/10 text-slate-300'
                    }`}>
                      {g.GameStage === 'Playoffs' ? 'PLAYOFF' : 'CONSOLATION'}
                    </div>
                  )}

                  <div className="text-xl font-black leading-tight">
                    <span className={winnerIsA ? teamAColor : teamBColor}>{winner}</span>
                    <span className="mx-2 text-slate-600">def.</span>
                    <span>{loser}</span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 overflow-hidden">
                    <div className="min-w-0 flex flex-1 items-baseline gap-1.5">
                      <div className="text-[44px] font-black leading-none sm:text-[62px]">
                        {winnerScore.toFixed(1)}
                      </div>
                      <div className="pb-1 text-lg font-black text-slate-600 sm:text-2xl">—</div>
                      <div className="pb-1 text-[30px] font-black text-slate-500 sm:text-[42px]">
                        {loserScore.toFixed(1)}
                      </div>
                    </div>

                    <div className={`shrink-0 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 transition-all ${marginStyle.border} ${marginStyle.bg}`}>
                      <div className={`text-[9px] uppercase tracking-[0.25em] ${marginStyle.label}`}>Margin</div>
                      <div className={`mt-1 text-base sm:text-lg font-black ${marginStyle.text}`}>
                        +{marginValue.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      </>
    ) : (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[34px] border border-white/10 bg-[#071120]">
        <div className="text-center">
          <Swords className="mx-auto mb-6 h-14 w-14 text-slate-700" />
          <div style={{ fontFamily: bebas.style.fontFamily, fontSize: '64px' }}>
            SELECT A RIVALRY
          </div>
          <p className="mt-2 text-slate-500">
            Explore the greatest battles in league history
          </p>
        </div>
      </div>
    )}
  </div>

</section>
    </main>
  )
}