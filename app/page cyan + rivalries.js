'use client'

import Image from 'next/image'
import {
  Shield, Calendar, Trophy, Flame, ChevronRight, ChevronLeft,
  Swords, Stars, Activity, Radar, Target, Medal, Clock3, ScrollText,
  TrendingUp, Landmark, Newspaper, Laugh, FileText, BarChart2,
  Users, BookOpen, Zap, TrendingDown, Minus, Hash,
} from 'lucide-react'
import { useEffect, useMemo, memo, useState, useRef } from 'react'
import { useDrawer } from './context/DrawerContext'
import { motion } from 'framer-motion'
import Header from './components/Header'


const FALLBACK_TEAMS = [
  {
    team: 'Moneyball',
    wins: 112,
    losses: 54,
    pf: 2145,
  },
  {
    team: 'Peytão da Massa',
    wins: 106,
    losses: 60,
    pf: 2088,
  },
]



function normalizeString(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')

  const parsed = Number(cleaned)

  return Number.isNaN(parsed) ? 0 : parsed
}

function TeamSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find((o) => o === value)

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[12px] font-bold transition-all duration-300 ${disabled
          ? 'cursor-not-allowed border-white/5 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-slate-600'
          : open
            ? 'border-cyan-400 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]'
            : 'border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-white hover:border-white/20 hover:bg-[linear-gradient(160deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]'
          }`}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>
          {selected || placeholder}
        </span>
        <ChevronRight
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-300 ${open ? 'rotate-90 text-cyan-400' : ''
            }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[12px] font-bold transition-all duration-200 hover:bg-white/[0.06] ${opt === value ? 'text-cyan-300 bg-cyan-500/[0.03]' : 'text-slate-300'
                  }`}
              >
                {opt === value && (
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                )}
                <span className={opt === value ? 'ml-0' : 'ml-[14px]'}>
                  {opt}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeTeam(team, index) {
  return {
    team: (team && (team.Team || team.team || team.Name)) || `Franchise ${index + 1}`,
    wins: parseNumber(team?.W || team?.Wins || team?.wins || 0),
    losses: parseNumber(team?.L || team?.Losses || team?.losses || 0),
    pf: parseNumber(team?.PF || team?.Points || team?.points_for || 0),
    rsW: parseNumber(team?.RS_W || 0),
    rsL: parseNumber(team?.RS_L || 0),
    rsPF: parseNumber(team?.RS_PF || 0),
    poW: parseNumber(team?.PO_W || 0),
    poL: parseNumber(team?.PO_L || 0),
    poPF: parseNumber(team?.PO_PF || 0),
    winPct: parseNumber(team?.['W%'] || 0),
    rsWinPct: parseNumber(
      team?.['RS_W%'] ?? team?.RS_W_pct ?? team?.['RS_W%'.toString()] ?? 0
    ),
    poWinPct: parseNumber(
      team?.['PO_W%'] ?? team?.PO_W_pct ?? team?.['PO_W%'.toString()] ?? 0
    ),
    wStreakRS: parseNumber(team?.['W Streak RS'] || 0),
    wStreakTotal: parseNumber(team?.['W Streak Total'] || 0),
    lStreakRS: parseNumber(team?.['L Streak RS'] || 0),
    lStreakTotal: parseNumber(team?.['L Streak Total'] || 0),
    playoffApps: parseNumber(team?.['Playoff Apps'] || 0),
    finals: parseNumber(team?.Finals || 0),
    titles: parseNumber(team?.Titles || 0),
  }
}

async function safeSheetFetch(url) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const json = await response.json()

    return Array.isArray(json) ? json : []
  } catch (error) {
    console.error(error)
    return []
  }
}

function GameRow({ game }) {
  return (
    <div className="flex flex-col border-b border-white/5 py-[6px] last:border-0">
      <div className="flex items-center gap-1">
        <span
          className={`text-[13px] font-black ${game.result === 'W' ? 'text-emerald-400' : 'text-red-400'
            }`}
        >
          {game.result}
        </span>
        <span className="truncate text-[13px] text-slate-300">
          &nbsp;vs {game.opp}
        </span>
      </div>
      <span className="text-[11px] text-slate-500">
        {game.score.toFixed(2)} – {game.oppScore.toFixed(2)}
      </span>
    </div>
  )
}

const ChampionCard = memo(function ChampionCard({ champ, index, isOpen, onToggle }) {
  const half = Math.ceil(champ.regGames.length / 2)
  const regCol1 = champ.regGames.slice(0, half)
  const regCol2 = champ.regGames.slice(half)

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
        ease: 'easeOut',
      }}
      className={`mb-4 break-inside-avoid relative overflow-hidden rounded-[28px] border transition-all duration-200 ${isOpen
        ? 'border-cyan-400/30'
        : 'border-white/5 hover:border-white/10'
        } bg-[linear-gradient(180deg,rgba(12,20,38,0.9),rgba(5,10,25,0.95))]`}
    >
      {/* Badge Reigning — sobreposto no canto superior direito */}
      {index === 0 && (
        <div className="absolute right-3 top-3 z-10 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-300">
          Reigning
        </div>
      )}

      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-4 px-6 text-left transition-all ${index === 0 ? 'pb-5 pt-9' : 'py-5'
          }`}
      >
        {!isOpen && (
          <Trophy className="h-5 w-5 flex-shrink-0 text-cyan-400" />
        )}

        <span
          className={`flex-shrink-0 font-black leading-none transition-all ${isOpen ? 'text-[42px] text-white' : 'text-[28px] text-slate-400'
            }`}
          style={{ fontFamily: '"Bebas Neue", sans-serif' }}
        >
          {champ.season}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-black text-white transition-all ${isOpen ? 'text-xl' : 'text-base'
              }`}
          >
            {champ.team}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {champ.wins}–{champ.losses} overall
            {champ.playoffWins > 0 || champ.playoffLosses > 0
              ? ` • ${champ.playoffWins}–${champ.playoffLosses} playoffs`
              : ''}
            {champ.pf > 0 ? ` • ${Math.round(champ.pf)} pts` : ''}
          </div>
        </div>

        <ChevronRight
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-white/5 px-6 pb-6 pt-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Reg Season
              </div>
              {regCol1.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] opacity-0">
                &nbsp;
              </div>
              {regCol2.map((g, i) => (
                <GameRow key={i} game={g} />
              ))}
            </div>
            <div>
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-400">
                Playoffs
              </div>
              {champ.playoffGames.length > 0 ? (
                champ.playoffGames.map((g, i) => (
                  <GameRow key={i} game={g} />
                ))
              ) : (
                <div className="text-[11px] text-slate-600">Sem dados</div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
})



function ChampionsWall({ champions }) {
  const [openSet, setOpenSet] = useState(new Set())

  const toggle = (index) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 30,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.15,
      }}
      transition={{
        duration: 0.45,
        ease: 'easeOut',
      }}
    >

      <section className="mt-8 mb-8">
        <div className="overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))]">

          <div className="flex items-center justify-between border-b border-white/5 px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Trophy className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                  Champions Wall
                </div>
                <div className="text-base text-slate-400">
                  Every title. Every campaign.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3 items-start">
            {champions.map((champ, index) => (
              <ChampionCard
                key={champ.season}
                champ={champ}
                index={index}
                isOpen={openSet.has(index)}
                onToggle={() => toggle(index)}
              />
            ))}
          </div>

        </div>
      </section>

    </motion.div>
  )
}

function ChampionsWallInline({ champions }) {
  const [openSet, setOpenSet] = useState(new Set())

  const toggle = (index) => {
    setOpenSet(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
      {champions.map((champ, index) => {
        const isOpen = openSet.has(index)
        const avatar = getTeamAvatar(champ.team)
        const half = Math.ceil(champ.regGames.length / 2)
        const regCol1 = champ.regGames.slice(0, half)
        const regCol2 = champ.regGames.slice(half)

        return (
          <div
            key={champ.season}
            className={`relative overflow-hidden rounded-[24px] border shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition-all ${isOpen
              ? 'border-yellow-300/25 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))]'
              : 'border-white/8 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] hover:border-white/12 hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]'
              }`}
          >
            {index === 0 && (
              <div className="absolute right-3 top-3 z-10 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-yellow-200">
                Reigning
              </div>
            )}

            <button
              onClick={() => toggle(index)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
            >
              {!isOpen && (
                <Trophy className="h-4 w-4 flex-shrink-0 text-yellow-300" />
              )}

              {avatar ? (
                <img
                  src={avatar}
                  alt={champ.team}
                  className={`flex-shrink-0 object-cover transition-all ${isOpen ? 'h-10 w-10 rounded-[16px]' : 'h-8 w-8 rounded-[14px]'
                    }`}
                />
              ) : (
                <div
                  className={`flex flex-shrink-0 items-center justify-center border border-white/10 bg-white/10 font-black text-slate-100 transition-all ${isOpen
                    ? 'h-10 w-10 rounded-[16px] text-[10px]'
                    : 'h-8 w-8 rounded-[14px] text-[9px]'
                    }`}
                >
                  {champ.team.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div
                  className={`font-black leading-none transition-all ${isOpen ? 'text-2xl text-white' : 'text-lg text-slate-100'
                    }`}
                  style={{ fontFamily: '"Bebas Neue", sans-serif' }}
                >
                  {champ.season}
                </div>

                <div
                  className={`truncate font-black transition-all ${isOpen ? 'text-base text-white' : 'text-sm text-white'
                    }`}
                >
                  {champ.team}
                </div>

                {!isOpen && (
                  <div className="text-[11px] text-slate-300">
                    {champ.wins}–{champ.losses} · {Math.round(champ.pf)} pts
                  </div>
                )}
              </div>

              <ChevronRight
                className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform ${isOpen ? 'rotate-90' : ''
                  }`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-white/8 bg-black/10 px-4 pb-4 pt-3">
                <div className="mb-3 text-[11px] text-slate-200">
                  {champ.wins}–{champ.losses} overall · {champ.playoffWins}–{champ.playoffLosses} playoffs · {Math.round(champ.pf)} pts
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[regCol1, regCol2, champ.playoffGames].map((games, ci) => (
                    <div key={ci}>
                      {ci === 2 && (
                        <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-yellow-200">
                          Playoffs
                        </div>
                      )}

                      {games.map((g, gi) => (
                        <div
                          key={gi}
                          className="flex flex-col border-b border-white/[0.08] py-1.5 last:border-0"
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[11px] font-black ${g.result === 'W' ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                            >
                              {g.result}
                            </span>

                            <span className="truncate text-[11px] text-slate-200">
                              vs {g.opp}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-300">
                            {g.score.toFixed(1)}–{g.oppScore.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const TEAM_AVATARS = {
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

function getTeamAvatar(name) {
  return TEAM_AVATARS[normalizeString(name)] || null
}

function normalizePlayerKey(value) {
  return normalizeString(value)
    .replace(/\./g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPlayerLookup(rows) {
  const lookup = new Map()

  rows.forEach((row) => {
    const playerId = String(row?.player_id || '').trim()
    const fullName = String(row?.full_name || '').trim()
    const firstName = String(row?.first_name || '').trim()
    const lastName = String(row?.last_name || '').trim()
    const team = String(row?.team || '').trim()
    const pos = String(row?.position || row?.pos || '').trim().toUpperCase()

    if (!playerId) return

    const entry = { playerId, team, pos, fullName }

      ;[fullName, `${firstName} ${lastName}`, row?.search_full_name].forEach((value) => {
        const key = normalizePlayerKey(value)
        if (!key || lookup.has(key)) return
        lookup.set(key, entry)
      })
  })

  return lookup
}

function getPlayerDataByFullName(name, playerLookup) {
  if (!playerLookup || !name) return null
  const key = normalizePlayerKey(name)
  if (!key) return null
  return playerLookup.get(key) || null
}

function DraftPickPlayerAvatar({ name, playerLookup, size = 36 }) {
  const [photoFailed, setPhotoFailed] = useState(false)

  const data = getPlayerDataByFullName(name, playerLookup)
  const playerId = data?.playerId

  useEffect(() => {
    setPhotoFailed(false)
  }, [name, playerId])

  const photoSrc =
    !photoFailed && playerId
      ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
      : null

  return photoSrc ? (
    <img
      src={photoSrc}
      alt={name}
      className="flex-shrink-0 rounded-[14px] object-cover"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={() => setPhotoFailed(true)}
    />
  ) : (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/8 text-[9px] font-black text-slate-100"
      style={{ width: size, height: size }}
      aria-label={name}
      title={name}
    >
      {String(name || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || '?'}
    </div>
  )
}

function buildSeasonRanges(years) {
  if (!years || years.length === 0) return ''

  const sorted = [...years].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)
      start = sorted[i]
      end = sorted[i]
    }
  }

  ranges.push(start === end ? `'${String(start).slice(2)}` : `'${String(start).slice(2)}-'${String(end).slice(2)}`)

  return ranges.join(' • ')
}

const SORT_OPTIONS = [
  {
    label: 'Wins',
    subs: [
      { label: 'Total', key: 'W', order: 'desc' },
      { label: 'Reg Season', key: 'RS_W', order: 'desc' },
      { label: 'Playoffs', key: 'PO_W', order: 'desc' },
    ],
  },
  {
    label: 'Losses',
    subs: [
      { label: 'Total', key: 'L', order: 'desc' },
      { label: 'Reg Season', key: 'RS_L', order: 'desc' },
      { label: 'Playoffs', key: 'PO_L', order: 'desc' },
    ],
  },
  {
    label: 'Win %',
    subs: [
      { label: 'Total', key: 'W%', order: 'desc' },
      { label: 'Reg Season', key: 'RS_W%', order: 'desc' },
      { label: 'Playoffs', key: 'PO_W%', order: 'desc' },
    ],
  },
  {
    label: 'Points',
    subs: [
      { label: 'All-Time', key: 'PF', order: 'desc' },
      { label: 'Reg Season', key: 'RS_PF', order: 'desc' },
      { label: 'Playoffs', key: 'PO_PF', order: 'desc' },
    ],
  },
  {
    label: 'Win Streak',
    subs: [
      { label: 'Reg Season', key: 'W Streak RS', order: 'desc' },
      { label: 'Total', key: 'W Streak Total', order: 'desc' },
    ],
  },
  {
    label: 'Loss Streak',
    subs: [
      { label: 'Reg Season', key: 'L Streak RS', order: 'desc' },
      { label: 'Total', key: 'L Streak Total', order: 'desc' },
    ],
  },
  {
    label: 'Playoffs Appearances',
    subs: [
      { label: 'Appearances', key: 'Playoff Apps', order: 'desc' },
    ],
  },
  {
    label: 'Finals Appearances',
    subs: [
      { label: 'Appearances', key: 'Finals', order: 'desc' },
    ],
  },
  {
    label: 'Championships',
    subs: [
      { label: 'Titles', key: 'Titles', order: 'desc' },
    ],
  },
]

function buildStreakMap(gamesJson, teamsJson) {
  const byTeam = {}

  // Temporada mais recente do banco
  let maxSeason = 0
  gamesJson.forEach((game) => {
    const season = parseNumber(game?.Season || game?.season || 0)
    if (season > maxSeason) maxSeason = season
  })

  // Monta lookup do melhor streak por time vindo do TEAM_ALL_TIME
  const bestStreakByTeam = {}
  teamsJson.forEach((row) => {
    const team = String(row?.Team || row?.team || '').trim()
    if (!team) return
    bestStreakByTeam[team] = {
      wStreakRS: parseNumber(String(row?.['W Streak RS'] || '0').replace(/[WL]/i, '')),
      wStreakTotal: parseNumber(String(row?.['W Streak Total'] || '0').replace(/[WL]/i, '')),
      lStreakRS: parseNumber(String(row?.['L Streak RS'] || '0').replace(/[WL]/i, '')),
      lStreakTotal: parseNumber(String(row?.['L Streak Total'] || '0').replace(/[WL]/i, '')),
    }
  })

  // Agrupa jogos por time ordenado cronologicamente
  gamesJson.forEach((game) => {
    const team = String(game?.Team || game?.team || '').trim()
    if (!team) return

    const week = parseNumber(game?.Week || game?.week || 0)
    const season = parseNumber(game?.Season || game?.season || 0)
    const streakRS = parseNumber(game?.Streak || 0)
    const streakTotal = parseNumber(game?.Streak_Total || 0)

    if (!byTeam[team]) byTeam[team] = []
    byTeam[team].push({ week, season, streakRS, streakTotal })
  })

  const result = {}

  Object.entries(byTeam).forEach(([team, games]) => {
    const sorted = games.sort((a, b) =>
      a.season !== b.season ? a.season - b.season : a.week - b.week
    )

    const best = bestStreakByTeam[team]
    if (!best) return

    const findBestStreak = (key, bestVal, isWin) => {
      if (!bestVal || bestVal === 0) return null

      // O valor que buscamos: positivo pra win, negativo pra loss
      const targetVal = isWin ? bestVal : -bestVal

      // Encontra o índice onde o streak atingiu o valor máximo pela PRIMEIRA vez
      let peakIndex = -1
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i][key] === targetVal) {
          peakIndex = i
          break
        }
      }

      if (peakIndex === -1) return null

      const endGame = sorted[peakIndex]

      // Percorre para trás a partir do peak até achar o 1 ou -1
      const startTarget = isWin ? 1 : -1
      let startIndex = peakIndex
      for (let i = peakIndex; i >= 0; i--) {
        if (sorted[i][key] === startTarget) {
          startIndex = i
          break
        }
      }

      const startGame = sorted[startIndex]

      // Streak é ativo se o último jogo do time está na temporada mais recente
      const lastGame = sorted[sorted.length - 1]
      const isActive = lastGame.season === maxSeason && Math.abs(sorted[sorted.length - 1][key]) >= bestVal

      return {
        startWeek: startGame.week,
        startSeason: startGame.season,
        endWeek: endGame.week,
        endSeason: endGame.season,
        active: isActive,
      }
    }

    result[team] = {
      streakRS: findBestStreak('streakRS', best.wStreakRS, true),
      streakTotal: findBestStreak('streakTotal', best.wStreakTotal, true),
      lStreakRS: findBestStreak('streakRS', best.lStreakRS, false),
      lStreakTotal: findBestStreak('streakTotal', best.lStreakTotal, false),
    }
  })

  return result
}

// ── NEW CONSTANTS ─────────────────────────────────────────────────────────────

const NEWS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQ0H5cbeMhSM8OXKTkoNoqEwZkMG93EiUcJNyNOsK6e-JoRRhQ13OuqhUDpJMq8zB0/exec'
const SHEET_ID_HOME = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
const BASE_URL_HOME = `https://opensheet.elk.sh/${SHEET_ID_HOME}`

const CATEGORY_STYLE = {
  'Meme': { color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/10', icon: Laugh },
  'Recap': { color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/10', icon: FileText },
  'Notícia': { color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/10', icon: Newspaper },
}

function formatDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}

// Short display name for Records card — first meaningful word, not "I" or "The"
function shortTeamName(name) {
  if (!name) return '—'
  // Skip articles AND single-letter words (like "I")
  const skip = new Set(['i', 'the', 'a', 'an', 'am', 'os', 'as', 'o', 'de', 'do', 'da'])
  const words = name.split(' ').filter(Boolean)
  const first = words.find(w => w.length > 2 && !skip.has(w.toLowerCase())) || words[0]
  return first || name
}

// Returns top N teams for a key, handling ties
function topNTeams(arr, getter, n = 3) {
  const sorted = [...arr].sort((a, b) => getter(b) - getter(a))
  if (!sorted.length) return []
  const topVal = getter(sorted[0])
  const tied = sorted.filter(t => getter(t) === topVal)
  return tied.slice(0, n)
}

const QUICK_NAV = [
  { label: 'Standings', href: '/standings', icon: BarChart2, color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/10' },
  { label: 'Matchups', href: '/matchups', icon: Swords, color: 'text-orange-400', border: 'border-orange-400/20', bg: 'bg-orange-400/10' },
  { label: 'Power Rankings', href: '/powerrankings', icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/10' },
  { label: 'Records', href: '/records', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/10' },
  { label: 'Rivalries', href: '/rivalries', icon: Stars, color: 'text-red-400', border: 'border-red-400/20', bg: 'bg-red-400/10' },
  { label: 'Teams', href: '/teams', icon: Users, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/10' },
  { label: 'Draft', href: '/draft', icon: ScrollText, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/10' },
  { label: 'History', href: '/history', icon: BookOpen, color: 'text-slate-400', border: 'border-white/15', bg: 'bg-white/[0.04]' },
  { label: 'News', href: '/news', icon: Newspaper, color: 'text-sky-400', border: 'border-sky-400/20', bg: 'bg-sky-400/10' },
]

const POS_COLORS = {
  QB: 'text-red-400 border-red-400/25 bg-red-400/10',
  RB: 'text-emerald-400 border-emerald-400/25 bg-emerald-400/10',
  WR: 'text-cyan-400 border-cyan-400/25 bg-cyan-400/10',
  TE: 'text-orange-400 border-orange-400/25 bg-orange-400/10',
  K: 'text-slate-400 border-slate-400/25 bg-slate-400/10',
  DEF: 'text-purple-400 border-purple-400/25 bg-purple-400/10',
}

function parseBiggestWin(value) {
  if (!value || String(value) === '—') return null
  const text = String(value)
  const scoreMatch = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
  const marginMatch = text.match(/\(\+?(\d+(?:\.\d+)?)\)/)
  const weekMatch = text.match(/Week\s*([\d][\d\-\/]*)/i)
  const yearMatch = text.match(/(20\d{2})/)
  return {
    scoreA: scoreMatch ? scoreMatch[1] : '0',
    scoreB: scoreMatch ? scoreMatch[2] : '0',
    margin: marginMatch ? marginMatch[1] : null,
    label: [weekMatch ? `Week ${weekMatch[1]}` : '', yearMatch ? yearMatch[1] : ''].filter(Boolean).join(' · '),
  }
}

function parseBestStreak(value) {
  if (!value || String(value) === '—') return null
  const text = String(value).trim()
  const countMatch = text.match(/([WL])(\d+)/i)
  const rangeMatch = text.match(/\(([^)]+)\)/)
  if (!countMatch) return { raw: text }
  let start = '', end = ''
  if (rangeMatch) {
    const parts = rangeMatch[1].split(/\s*(?:→|->|⇒)\s*/)
    if (parts.length >= 2) { start = parts[0].trim(); end = parts[1].trim() }
    else { start = rangeMatch[1].trim() }
  }
  return { result: countMatch[1].toUpperCase(), count: countMatch[2], start, end }
}

export default function TapitasLeagueHomepage() {
  const [rawData, setRawData] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [selectedTeamA, setSelectedTeamA] = useState('I am Megatron')
  const [selectedTeamB, setSelectedTeamB] = useState('Ocupa e Resiste')
  const [sortCategory, setSortCategory] = useState('Wins')
  const [sortSub, setSortSub] = useState('Total')
  const [standingsPage, setStandingsPage] = useState(0)
  const [streakMap, setStreakMap] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [seasonSummary, setSeasonSummary] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState('2025')
  const [currentSlide, setCurrentSlide] = useState(0)

  // ── NEW STATE ──────────────────────────────────────────────────────────────
  const [newsPosts, setNewsPosts] = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [prData, setPrData] = useState([])
  const [prLoading, setPrLoading] = useState(true)
  const [currentStandings, setCurrentStandings] = useState([])
  const [currentSeason, setCurrentSeason] = useState('')
  const [currentWeekLabel, setCurrentWeekLabel] = useState('')
  const [draftPicks, setDraftPicks] = useState([])   // last draft picks
  const [draftSeason, setDraftSeason] = useState('')
  const [recentMatchups, setRecentMatchups] = useState([]) // last week games
  const [playerLookup, setPlayerLookup] = useState(new Map())

  const touchStartX = useRef(null);
  const totalSlides = 3;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    const threshold = 50; // distância mínima do swipe

    if (diff > threshold) {
      // swipe para esquerda -> próximo slide
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }

    if (diff < -threshold) {
      // swipe para direita -> slide anterior
      setCurrentSlide(
        (prev) => (prev - 1 + totalSlides) % totalSlides
      );
    }

    touchStartX.current = null;
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 3);
  };

  useEffect(() => {
    const timer = setTimeout(nextSlide, 10000);

    return () => clearTimeout(timer);
  }, [currentSlide]);

  const [leagueStats, setLeagueStats] = useState({
    franchises: 0,
    seasons: 0,
    seasonRange: '',
    allSeasons: [],  // <-- adicione
    games: 0,
    highestScore: 0,
    highestScoreTeam: '',
  })

  // ===== CHAMPIONS WALL =====
  // Adicione este useEffect e estado junto aos outros no componente principal

  const [championsData, setChampionsData] = useState([])


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
    // limpa ao sair da página
    return () => setLeftSlot(null)
  }, [])

  useEffect(() => {
    const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
    if (cat && !cat.subs.find((s) => s.label === sortSub)) {
      setSortSub(cat.subs[0].label)
    }
    setStandingsPage(0)
  }, [sortCategory])

  useEffect(() => {
    setStandingsPage(0)
  }, [sortSub])

  useEffect(() => {
    let mounted = true
    async function loadChampionsData() {
      try {
        const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
        const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

        const [historyJson, gamesJson] = await Promise.all([
          safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
          safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        ])

        if (!mounted) return

        // Filtra apenas os campeões de cada temporada
        const champions = historyJson
          .filter((row) => {
            const isChamp = String(
              row?.Champion || row?.champion || ''
            ).trim().toUpperCase()
            return isChamp === 'TRUE'
          })
          .map((row) => ({
            season: String(row?.Season || row?.season || '').trim(),
            team: String(row?.Team || row?.team || '').trim(),
            wins: parseNumber(row?.Wins || row?.wins || row?.W || 0),
            losses: parseNumber(row?.Losses || row?.losses || row?.L || 0),
            pf: parseNumber(row?.PF || row?.Points || row?.points_for || 0),
            playoffWins: parseNumber(row?.PlayoffWins || row?.playoff_wins || row?.POW || 0),
            playoffLosses: parseNumber(row?.PlayoffLosses || row?.playoff_losses || row?.POL || 0),
            playoffPF: parseNumber(row?.PlayoffPF || row?.playoff_pf || row?.POPF || 0),
          }))
          .sort((a, b) => Number(b.season) - Number(a.season))

        // Para cada campeão, busca os jogos daquela temporada
        const championsWithGames = champions.map((champ) => {
          const seasonGames = gamesJson.filter((game) => {
            const season = String(game?.Season || game?.season || '').trim()
            const team = String(game?.Team || game?.team || '').trim()
            const stage = String(game?.gameStage || game?.GameStage || '').trim()
            return (
              season === champ.season &&
              normalizeString(team) === normalizeString(champ.team) &&
              (stage === 'Reg Season' || stage === 'Playoffs')
            )
          })

          // Ordena por semana cronologicamente
          const sorted = seasonGames.sort((a, b) => {
            const wA = parseNumber(String(a?.Week || a?.week || '0').replace(/\D/g, ''))
            const wB = parseNumber(String(b?.Week || b?.week || '0').replace(/\D/g, ''))
            return wA - wB
          })

          const regGames = sorted.filter((g) => {
            const stage = String(g?.gameStage || g?.GameStage || '').trim()
            return stage === 'Reg Season'
          })

          const playoffGames = sorted.filter((g) => {
            const stage = String(g?.gameStage || g?.GameStage || '').trim()
            return stage === 'Playoffs'
          })

          const mapGame = (game) => {
            const score = parseNumber(game?.Score || game?.score || game?.PF || 0)
            const oppScore = parseNumber(game?.OpponentScore || game?.opponent_score || game?.OppPF || game?.PA || 0)
            const opp = String(game?.Opponent || game?.opponent || '').trim()
            const week = String(game?.Week || game?.week || '').trim()
            const result = score > oppScore ? 'W' : 'L'
            return { result, opp, score, oppScore, week }
          }

          return {
            ...champ,
            regGames: regGames.map(mapGame),
            playoffGames: playoffGames.map(mapGame),
          }
        })

        if (mounted) setChampionsData(championsWithGames)
      } catch (error) {
        console.error(error)
      }
    }
    loadChampionsData()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadLeagueData() {
      try {
        const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
        const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

        const [teamsJson, gamesJson, h2hSortedJson] = await Promise.all([
          safeSheetFetch(`${BASE_URL}/TEAM_ALL_TIME`),
          safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
          safeSheetFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        ])


        if (!mounted) {
          return
        }

        setRawData(teamsJson)

        const uniqueFranchises = new Set()
        const uniqueSeasons = new Set()
        const uniqueGames = new Set()

        let highestScore = 0
        let highestScoreTeam = ''

        teamsJson.forEach((teamRow) => {
          const franchiseName = String(
            teamRow?.Team ||
            teamRow?.team ||
            teamRow?.Name ||
            teamRow?.Franchise ||
            ''
          ).trim()

          if (franchiseName) {
            uniqueFranchises.add(franchiseName)
          }
        })

        gamesJson.forEach((game) => {
          const rawWeek = String(game?.Week || game?.week || '')

          const season = String(
            game?.Season || game?.season || game?.Year || ''
          ).trim()

          const team = String(game?.Team || game?.team || '').trim()

          const opponent = String(
            game?.Opponent || game?.opponent || ''
          ).trim()

          // Only count games that have actually been played (PF > 0)
          const score = parseNumber(
            game?.Score || game?.score || game?.PF || game?.pf
          )
          const hasScore = score > 0

          const matchupKey = [season, rawWeek, team, opponent]
            .sort()
            .join('|')

          // Only count seasons that have at least one played game
          if (season && hasScore) {
            uniqueSeasons.add(season)
          }

          // Only count games that have been played
          if (team && opponent && rawWeek && hasScore) {
            uniqueGames.add(matchupKey)
          }

          const isCombinedWeek =
            rawWeek.includes('-') ||
            rawWeek.includes('&')

          if (!isCombinedWeek && hasScore && score > highestScore) {
            highestScore = score
            highestScoreTeam = team
          }
        })

        const sortedSeasons = Array.from(uniqueSeasons)
          .map((season) => Number(season))
          .filter((season) => !Number.isNaN(season))
          .sort((a, b) => a - b)

        const seasonRange =
          sortedSeasons.length > 0
            ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
              sortedSeasons[sortedSeasons.length - 1]
            ).slice(2)}`
            : ''

        setLeagueStats({
          franchises: uniqueFranchises.size,
          seasons: uniqueSeasons.size,
          seasonRange:
            sortedSeasons.length > 0
              ? `'${String(sortedSeasons[0]).slice(2)}-'${String(
                sortedSeasons[sortedSeasons.length - 1]
              ).slice(2)}`
              : '',
          allSeasons: sortedSeasons,
          games: uniqueGames.size,
          highestScore: Math.round(highestScore * 100) / 100,
          highestScoreTeam,
        })

        if (mounted) {
          setStreakMap(buildStreakMap(gamesJson, teamsJson))
        }

        if (Array.isArray(h2hSortedJson) && h2hSortedJson.length > 0) {
          setH2hData(h2hSortedJson)
        }
      } catch (error) {
        console.error(error)
      }
    }
    loadLeagueData()
    return () => {
      mounted = false
    }
  }, [])

  // ── News posts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(NEWS_SCRIPT_URL)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date))
        setNewsPosts(sorted.slice(0, 4))
      })
      .catch(() => setNewsPosts([]))
      .finally(() => setNewsLoading(false))
  }, [])

  // ── Power Rankings + Standings + Draft picks + Recent matchups ─────────────
  useEffect(() => {
    let mounted = true
    async function loadExtra() {
      try {
        const [gameData, historyData, draftData, playerCacheData] = await Promise.all([
          safeSheetFetch(`${BASE_URL_HOME}/GAME_FACTS_ALL`),
          safeSheetFetch(`${BASE_URL_HOME}/TEAM_HISTORY_SORTED`),
          safeSheetFetch(`${BASE_URL_HOME}/DRAFT_BOARD`),
          safeSheetFetch(`${BASE_URL_HOME}/_PLAYER_CACHE`),
        ])
        if (!mounted) return

        setPlayerLookup(buildPlayerLookup(playerCacheData))

        // ── Power Rankings ──────────────────────────────────────────────────
        const seasonsWithPR = [...new Set(
          gameData.filter(g => parseNumber(g?.['Power Ranking']) > 0)
            .map(g => String(g?.Season || '').trim()).filter(Boolean)
        )].sort((a, b) => Number(a) - Number(b))

        if (seasonsWithPR.length > 0) {
          const latestSeason = seasonsWithPR[seasonsWithPR.length - 1]
          const seasonGames = gameData.filter(g =>
            String(g?.Season || '').trim() === latestSeason &&
            parseNumber(g?.['Power Ranking']) > 0
          )
          const weeks = [...new Set(seasonGames.map(g => String(g?.Week || '').trim()).filter(Boolean))]
            .sort((a, b) => parseFloat(a) - parseFloat(b))
          const latestWeek = weeks[weeks.length - 1]
          const prevWeek = weeks[weeks.length - 2]

          const currentWeekGames = seasonGames
            .filter(g => String(g?.Week || '').trim() === latestWeek)
            .sort((a, b) => parseNumber(a?.['Power Ranking']) - parseNumber(b?.['Power Ranking']))
          const prevGames = prevWeek ? seasonGames.filter(g => String(g?.Week || '').trim() === prevWeek) : []

          const prRows = currentWeekGames.slice(0, 8).map(g => {
            const team = String(g?.Team || '').trim()
            const rank = parseNumber(g?.['Power Ranking'])
            const prev = prevGames.find(p => String(p?.Team || '').trim() === team)
            const prevRank = prev ? parseNumber(prev?.['Power Ranking']) : rank
            return { team, rank, delta: prevRank - rank }
          })
          if (mounted) { setPrData(prRows); setCurrentSeason(latestSeason) }

          // ── Current standings ─────────────────────────────────────────────
          // Find the latest season that has any PLAYED games (PF > 0)
          const allSeasonsList = [...new Set(
            gameData
              .filter(g => parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0) > 0)
              .map(g => String(g?.Season || '').trim()).filter(Boolean)
          )].sort((a, b) => Number(a) - Number(b))
          const newestSeason = allSeasonsList[allSeasonsList.length - 1]

          const rsGamesNewest = gameData.filter(g =>
            String(g?.Season || '').trim() === newestSeason &&
            String(g?.gameStage || g?.GameStage || '').trim() === 'Reg Season'
          )
          const poGamesNewest = gameData.filter(g =>
            String(g?.Season || '').trim() === newestSeason &&
            String(g?.gameStage || g?.GameStage || '').trim() !== 'Reg Season' &&
            String(g?.gameStage || g?.GameStage || '').trim() !== ''
          )

          // Helper: read final standings from TEAM_HISTORY_SORTED using Standing column
          const buildFromHistory = (season) => {
            const rows = historyData
              .filter(r => String(r?.Season || '').trim() === season && parseNumber(r?.Standing) > 0)
              .map(r => ({
                team: String(r?.Team || r?.team || '').trim(),
                w: parseNumber(r?.W || 0),
                l: parseNumber(r?.L || 0),
                pf: parseNumber(r?.PF || 0),
                standing: parseNumber(r?.Standing),
              }))
              .sort((a, b) => a.standing - b.standing)
            return rows
          }

          let displaySeason = newestSeason
          let isSeasonFinished = poGamesNewest.length > 0
          let seasonRows = []
          let weekLabel = ''

          if (rsGamesNewest.length === 0) {
            // New season with no reg games yet — show previous finished season
            const prevSeason = allSeasonsList[allSeasonsList.length - 2]
            if (prevSeason) {
              displaySeason = prevSeason
              isSeasonFinished = true
              seasonRows = buildFromHistory(prevSeason)
            }
          } else if (isSeasonFinished) {
            // Season over — use Standing column from TEAM_HISTORY_SORTED
            seasonRows = buildFromHistory(newestSeason)
          } else {
            // Season in progress — accumulate reg season week by week
            const rsWeeksSorted = [...new Set(
              rsGamesNewest.map(g => String(g?.Week || '').trim()).filter(Boolean)
            )].sort((a, b) => parseFloat(a) - parseFloat(b))
            weekLabel = rsWeeksSorted[rsWeeksSorted.length - 1] || ''

            const teamStatsMap = {}
            rsGamesNewest.forEach(g => {
              const team = String(g?.Team || '').trim()
              if (!team) return
              if (!teamStatsMap[team]) teamStatsMap[team] = { team, w: 0, l: 0, pf: 0 }
              const pf = parseNumber(g?.Score || g?.PF || 0)
              const pa = parseNumber(g?.OpponentScore || g?.PA || 0)
              teamStatsMap[team].pf += pf
              if (pf > pa) teamStatsMap[team].w += 1
              else if (pa > pf) teamStatsMap[team].l += 1
            })
            seasonRows = Object.values(teamStatsMap)
              .sort((a, b) => b.w - a.w || a.l - b.l || b.pf - a.pf)
          }

          if (mounted) {
            setCurrentStandings(seasonRows)
            setCurrentSeason(displaySeason)
            setCurrentWeekLabel(isSeasonFinished ? '__final__' : weekLabel)
          }
        } // end if seasonsWithPR

        // ── Recent matchups — independent of PR data ──────────────────────────
        {
          const allSeasons2 = [...new Set(
            gameData
              .filter(g => parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0) > 0)
              .map(g => String(g?.Season || '').trim()).filter(Boolean)
          )].sort((a, b) => Number(a) - Number(b))
          const newestSeason2 = allSeasons2[allSeasons2.length - 1]

          // All games from newest season with actual scores (both sides filled)
          const allNewestGames2 = gameData.filter(g => {
            if (String(g?.Season || '').trim() !== newestSeason2) return false
            if (!String(g?.Team || '').trim() || !String(g?.Opponent || '').trim()) return false
            const pf = parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0)
            const pa = parseNumber(g?.OpponentScore || g?.PA || g?.opponent_score || g?.pa || 0)
            return pf > 0 && pa > 0
          })

          // Sort weeks numerically (handle "15-16" → 15, "17" → 17)
          const allWeeksSorted2 = [...new Set(
            allNewestGames2.map(g => String(g?.Week || '').trim()).filter(Boolean)
          )].sort((a, b) => parseFloat(a) - parseFloat(b))
          const lastWeek2 = allWeeksSorted2[allWeeksSorted2.length - 1]

          const seen2 = new Set()
          const matchups2 = []
          for (const g of allNewestGames2.filter(g => String(g?.Week || '').trim() === lastWeek2)) {
            const team = String(g?.Team || '').trim()
            const opp = String(g?.Opponent || '').trim()
            const key = [team, opp].sort().join('|')
            if (seen2.has(key)) continue
            seen2.add(key)
            const score = parseNumber(g?.Score || g?.PF || g?.score || g?.pf || 0)
            const oppScore = parseNumber(g?.OpponentScore || g?.PA || g?.opponent_score || g?.pa || 0)
            const stage = String(g?.gameStage || g?.GameStage || g?.Stage || '').trim()
            matchups2.push({ team, opp, score, oppScore, week: lastWeek2, season: newestSeason2, stage })
          }
          if (mounted) setRecentMatchups(matchups2.slice(0, 6))
        }

        // ── Draft picks ───────────────────────────────────────────────────────
        if (draftData.length > 0) {
          const draftSeasons = [...new Set(draftData.map(r => String(r?.Season || '').trim()).filter(Boolean))]
            .sort((a, b) => Number(a) - Number(b))
          const lastDraftSeason = draftSeasons[draftSeasons.length - 1]
          const picks = draftData
            .filter(r => String(r?.Season || '').trim() === lastDraftSeason)
            .map(r => ({
              pick: parseNumber(r?.Pick || r?.Overall || 0),
              round: parseNumber(r?.Round || 0),
              team: String(r?.Team || '').trim(),
              player: String(r?.Player || r?.Name || '').trim(),
              position: String(r?.Position || r?.Pos || '').trim().toUpperCase(),
            }))
            .filter(r => r.player && r.player !== '')
            .sort((a, b) => a.pick - b.pick)
          if (mounted) { setDraftPicks(picks.slice(0, 10)); setDraftSeason(lastDraftSeason) }
        }
      } catch (e) { console.error(e) }
      finally { if (mounted) setPrLoading(false) }
    }
    loadExtra()
    return () => { mounted = false }
  }, [])

  const standings = useMemo(() => {
    const base =
      Array.isArray(rawData) && rawData.length > 0
        ? rawData : FALLBACK_TEAMS

    const mapped = base.map(normalizeTeam)


    const cat = SORT_OPTIONS.find((o) => o.label === sortCategory)
    const sub = cat?.subs.find((s) => s.label === sortSub) ?? cat?.subs[0]

    const keyMap = {
      'W': (t) => t.wins,
      'RS_W': (t) => t.rsW,
      'PO_W': (t) => t.poW,
      'L': (t) => t.losses,
      'RS_L': (t) => t.rsL,
      'PO_L': (t) => t.poL,
      'W%': (t) => t.winPct,
      'RS_W%': (t) => t.rsWinPct,
      'PO_W%': (t) => t.poWinPct,
      'PF': (t) => t.pf,
      'RS_PF': (t) => t.rsPF,
      'PO_PF': (t) => t.poPF,
      'W Streak RS': (t) => t.wStreakRS,
      'W Streak Total': (t) => t.wStreakTotal,
      'L Streak RS': (t) => t.lStreakRS,
      'L Streak Total': (t) => t.lStreakTotal,
      'Playoff Apps': (t) => t.playoffApps,
      'Finals': (t) => t.finals,
      'Titles': (t) => t.titles,
    }

    const getter = sub ? keyMap[sub.key] : (t) => t.wins
    const order = sub?.order ?? 'desc'

    return mapped.sort((a, b) => {
      const diff = order === 'desc'
        ? getter(b) - getter(a)
        : getter(a) - getter(b)
      if (diff !== 0) return diff
      // desempate sempre por wins desc → losses asc → pf desc
      if (b.wins !== a.wins) return b.wins - a.wins
      if (a.losses !== b.losses) return a.losses - b.losses
      return b.pf - a.pf
    })
  }, [rawData, sortCategory, sortSub])

  // Lista única de times extraída do h2h
  const allTeams = useMemo(() => {
    const teams = new Set()
    h2hData.forEach((row) => {
      const keys = Object.keys(row)
      const a = String(row[keys[0]] || '').trim()
      const b = String(row[keys[1]] || '').trim()
      if (a) teams.add(a)
      if (b) teams.add(b)
    })
    return Array.from(teams).sort()
  }, [h2hData])

  // Times disponíveis para o segundo dropdown (exclui o time A)
  const teamsForB = useMemo(() => {
    if (!selectedTeamA) return allTeams.filter((t) => t !== selectedTeamA)
    // Só mostra times que têm confronto com teamA na planilha
    return h2hData
      .filter((row) => {
        const keys = Object.keys(row)
        const a = String(row[keys[0]] || '').trim()
        return normalizeString(a) === normalizeString(selectedTeamA)
      })
      .map((row) => {
        const keys = Object.keys(row)
        return String(row[keys[1]] || '').trim()
      })
      .filter(Boolean)
      .sort()
  }, [h2hData, selectedTeamA])

  // Confronto selecionado
  const selectedRivalry = useMemo(() => {
    if (!selectedTeamA || !selectedTeamB) return null

    const row = h2hData.find((r) => {
      const keys = Object.keys(r)
      const a = String(r[keys[0]] || '').trim()
      const b = String(r[keys[1]] || '').trim()
      return (
        normalizeString(a) === normalizeString(selectedTeamA) &&
        normalizeString(b) === normalizeString(selectedTeamB)
      )
    })

    if (!row) return null

    const lastMatch = String(row['Last Match'] || row['last match'] || '')
    const scoreMatch = lastMatch.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
    const weekMatch = lastMatch.match(/Week\s*([\d][\d\-\/]*)/i) || lastMatch.match(/\bW(\d[\d\-\/]*)\b/i)
    const yearMatch = lastMatch.match(/(20\d{2})/)

    const winsA = parseNumber(
      row['A W'] || row['A_W'] || row['A_WINS'] || row['A Wins'] || row['A'] || 0
    )
    const winsB = parseNumber(
      row['B W'] || row['B_W'] || row['B_WINS'] || row['B Wins'] || row['B'] || 0
    )
    const poWinsA = parseNumber(row['A PO_W'] || 0)
    const poWinsB = parseNumber(row['B PO_W'] || 0)
    const avgMargin = String(
      row['Avg Margin'] || row['AVG_MARGIN'] || row['Average Margin'] || row['Margin'] || '0.0'
    )
    const streak = String(row['Current Streak'] || '--')

    const totalGames = winsA + winsB
    const recordGap = Math.abs(winsA - winsB)
    const margin = Math.abs(parseFloat(avgMargin) || 0)
    let rivalryScore = 0
    if (recordGap === 0) rivalryScore += 7
    else if (recordGap === 1) rivalryScore += 5
    else if (recordGap === 2) rivalryScore += 3
    else if (recordGap === 3) rivalryScore += 1
    else rivalryScore -= 3
    if (totalGames >= 14) rivalryScore += 5
    else if (totalGames >= 10) rivalryScore += 4
    else if (totalGames >= 6) rivalryScore += 2
    if (margin <= 3) rivalryScore += 5
    else if (margin <= 7) rivalryScore += 3
    else if (margin <= 12) rivalryScore += 1
    const heat =
      rivalryScore >= 13 ? 'Legendary' :
        rivalryScore >= 10 ? 'Elite' :
          rivalryScore >= 7 ? 'High' :
            rivalryScore >= 4 ? 'Medium' : 'Low'

    const shortName = (name) => {
      const mappings = {
        'i am megatron': 'Megatron', 'h-lera do mahl': 'H-Lera',
        'peytão da massa': 'Peytao', 'peytao da massa': 'Peytao',
        'ocupa meu slot': 'Ocupa', 'green bay pequers': 'Pequers',
        'settlers of rincão': 'Rincão', 'settlers of rincao': 'Rincão',
        'old brady bunch': 'OldBrady', 'moneyball fc': 'Moneyball',
        'patrolão': 'Patrolao', 'patrolao': 'Patrolao',
        'how much is the fish': 'Howmuch',
      }
      const n = normalizeString(name)
      return mappings[n] || String(name).split(' ')[0]
    }

    const formattedStreak = streak
      .replace(selectedTeamA, shortName(selectedTeamA))
      .replace(selectedTeamB, shortName(selectedTeamB))
    const streakParts = formattedStreak.split(' ')
    const streakVal = streakParts.pop()
    const streakTeam = streakParts.join(' ')

    return {
      teamA: selectedTeamA,
      teamB: selectedTeamB,
      winsA,
      winsB,
      record: `${winsA}-${winsB}`,
      playoffRecord: `${poWinsA}-${poWinsB}`,
      avgMargin,
      heat,
      streak: `${streakTeam} ${streakVal}`,
      lastMeeting: {
        score: scoreMatch ? `${scoreMatch[1]} vs ${scoreMatch[2]}` : '-- vs --',
        meta: (weekMatch || yearMatch)
          ? `${weekMatch ? `Week ${weekMatch[1]}` : ''} ${yearMatch ? `· ${yearMatch[1]}` : ''}`.trim()
          : '',
      },
      biggestA: String(row['Biggest Win Team A'] || row['biggest_win_a'] || '—'),
      biggestB: String(row['Biggest Win Team B'] || row['biggest_win_b'] || '—'),
      bestStreakA: String(row['Best Streak Team A'] || row['best_streak_a'] || '—'),
      bestStreakB: String(row['Best Streak Team B'] || row['best_streak_b'] || '—'),
    }
  }, [h2hData, selectedTeamA, selectedTeamB])

  useEffect(() => {
    if (!drawerOpen || seasonSummary) return

    async function loadSummary() {
      const SHEET_ID = '1-dBrTduiDzy_FBxyY3K-1kiDvs1bWENlOIXk9Pn9imA'
      const BASE_URL = `https://opensheet.elk.sh/${SHEET_ID}`

      const [historyJson, historyRawJson, gamesJson] = await Promise.all([
        safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeSheetFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
        safeSheetFetch(`${BASE_URL}/GAME_FACTS_ALL`),
      ])

      const SEASON = String(selectedSeason)

      const seasonTeams = historyJson.filter(r =>
        String(r?.Season || '').trim() === SEASON
      )
      const rawSeasonTeams = historyRawJson.filter(r =>
        String(r?.Season || '').trim() === SEASON
      )

      const champion = rawSeasonTeams.find(r =>
        String(r?.Champion || '').toUpperCase() === 'TRUE'
      )

      const finalist = rawSeasonTeams.find(r =>
        String(r?.Reached_Final || '').toUpperCase() === 'TRUE' &&
        String(r?.Champion || '').toUpperCase() !== 'TRUE'
      )

      const sortedByWins = [...rawSeasonTeams].sort((a, b) =>
        parseNumber(b?.RS_W) - parseNumber(a?.RS_W)
      )

      const bestRecord = sortedByWins[0]
      const worstRecord = sortedByWins[sortedByWins.length - 1]

      const sortedByPF = [...rawSeasonTeams].sort((a, b) =>
        parseNumber(b?.RS_PF) - parseNumber(a?.RS_PF)
      )

      const highestScorer = sortedByPF[0]
      const lowestScorer = sortedByPF[sortedByPF.length - 1]

      const validStandings = rawSeasonTeams.filter((team) => {
        const standing = parseNumber(team?.Standing)
        return standing > 0
      })

      const unicorn = [...validStandings].sort((a, b) =>
        parseNumber(a?.Standing) - parseNumber(b?.Standing)
      )[validStandings.length - 1]

      // Maior pontuação em um único jogo
      const seasonGames = gamesJson.filter(r => {
        const s = String(r?.Season || '').trim()
        return s === SEASON &&
          parseNumber(r?.PF || 0) > 0 &&
          parseNumber(r?.PA || 0) > 0
      })

      const highestGame = seasonGames.reduce((best, g) => {
        const score = parseNumber(g?.PF || 0)
        return score > (best?.score ?? 0)
          ? { score, team: String(g?.Team || '').trim(), week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : best
      }, null)

      const lowestGame = seasonGames.reduce((worst, g) => {
        const score = parseNumber(g?.PF || 0)
        if (score === 0) return worst
        return score < (worst?.score ?? 9999)
          ? { score, team: String(g?.Team || '').trim(), week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : worst
      }, null)

      const closestGame = seasonGames.reduce((closest, g) => {
        const score = parseNumber(g?.PF || 0)
        const opp = parseNumber(g?.PA || 0)
        if (score === 0 || opp === 0) return closest
        const margin = Math.abs(score - opp)
        return margin < (closest?.margin ?? 9999)
          ? { margin, team: String(g?.Team || '').trim(), score, opp, week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : closest
      }, null)

      const biggestWin = seasonGames.reduce((best, g) => {
        const score = parseNumber(g?.PF || 0)
        const opp = parseNumber(g?.PA || 0)
        if (score <= opp) return best
        const margin = score - opp
        return margin > (best?.margin ?? 0)
          ? { margin, team: String(g?.Team || '').trim(), score, opp, week: g?.Week, opponent: String(g?.Opponent || '').trim() }
          : best
      }, null)

      setSeasonSummary({
        season: SEASON,
        champion,
        finalist,
        bestRecord,
        worstRecord,
        highestScorer,
        lowestScorer,
        unicorn,
        highestGame,
        lowestGame,
        closestGame,
        biggestWin,
        totalTeams: seasonTeams.length,
      })
    }

    loadSummary()
  }, [drawerOpen, selectedSeason])

  return (
    <main className="min-h-screen bg-[#020617] text-white overflow-hidden">
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

      @keyframes heroFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-10px); }
      }
    `}</style>

      {/* ===== HEADER ===== */}
      <Header
        rightSlot={
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-5 text-sm font-black text-cyan-200 transition-all hover:bg-cyan-400/20"
          >
            Summary
            <ChevronRight className="h-4 w-4" />
          </button>
        }
      />

      {/* ===== HERO ===== */}
      <section className="relative z-10 px-3 md:px-6 pb-5">
        <div
          className="relative isolate mb-10 overflow-hidden rounded-2xl md:rounded-[38px] border border-white/10"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              width: '300%',
              transform: `translateX(-${currentSlide * 33.3333}%)`,
            }}
          >
            {/* SLIDE 1 - CAPA */}
            <div className="relative w-1/3 shrink-0">

              {/* Background */}
              <div className="absolute inset-0 overflow-hidden rounded-[28px] md:rounded-[38px] pointer-events-none">

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

              {/* Conteúdo */}
              <div className="relative z-10 flex flex-row items-center justify-between gap-3 md:gap-10 p-5 sm:p-7 md:p-14">

                {/* Texto */}
                <div className="flex-1 text-left">

                  {/* Badge */}
                  <div className="mb-6 inline-flex max-w-full items-center gap-1.5 rounded-xl md:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-[5px] md:px-4 md:py-2">

                    <Flame className="h-3 w-3 md:h-4 md:w-4 text-cyan-300 flex-shrink-0" />

                    <span
                      className="font-black uppercase text-cyan-300 whitespace-nowrap leading-none"
                      style={{
                        fontSize: 'clamp(8px, 0.9vw, 14px)',
                        letterSpacing: 'clamp(0.02em, 0.12vw, 0.12em)',
                      }}
                    >
                      EST. 2014 | A LEAGUE. A HISTORY. A LEGACY.
                    </span>

                  </div>

                  {/* Título */}
                  <h1
                    className="mb-2 leading-[0.9]"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: 'clamp(84px, 9vw, 100px)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'clamp(58px, 9vw, 100px)',
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      THE HOME OF
                    </span>

                    <span
                      style={{
                        display: 'block',
                        background:
                          'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.3))',
                      }}
                    >
                      TAPITAS{' '}

                    </span>
                    <span
                      style={{
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #64748b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      HISTORY
                    </span>
                  </h1>

                  <div className="mx-0 mb-5 md:mb-6 text-slate-400 flex flex-col gap-1 md:gap-1.5">

                    <p className="text-[14px] sm:text-[14px] md:text-base font-medium leading-tight whitespace-nowrap">
                      All the stats. All the moments. All the rivalry.
                    </p>

                    <p className="text-[14px] sm:text-[14px] md:text-base text-slate-500 leading-tight">
                      Explore the history that built the league.
                    </p>

                  </div>
                  {/* Botões */}
                  <div className="flex flex-row items-start gap-1.5 md:gap-3">

                    <a
                      href="/history"
                      className="inline-flex h-8 md:h-12 items-center gap-1 md:gap-2 rounded-lg md:rounded-2xl bg-cyan-400 px-2.5 md:px-6 text-[12px] md:text-sm font-bold text-[#020617] transition-all hover:bg-cyan-300 whitespace-nowrap"
                    >
                      <Landmark className="h-3 w-3 md:h-4 md:w-4" />
                      League History
                    </a>

                  </div>
                </div>

                {/* Logo */}
                <div
                  className="hidden [@media(min-width:480px)]:flex relative items-center justify-center min-w-[240px]"
                  style={{
                    animation: 'heroFloat 5s ease-in-out infinite',
                  }}
                >
                  <Image
                    src="/images/LogoFinalBlack.png"
                    alt="Tapitas League Logo"
                    width={600}
                    height={600}
                    priority
                    style={{
                      width: 'clamp(240px, 24vw, 600px)',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                </div>

              </div>
            </div>
            {/* SLIDE 2 - DRAFT*/}
            <div className="relative w-1/3 shrink-0">

              {/* Imagem de fundo */}
              <div className="absolute inset-0">
                <Image
                  src="/images/draft.png"
                  alt="Hero Background"
                  fill
                  className="object-cover object-[75%_center] md:object-center"
                />
              </div>

              {/* Overlay escuro */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(105deg, rgba(2,6,23,0.72) 25%, rgba(2,6,23,0.40) 52%, rgba(2,6,23,0.00) 100%)',
                }}
              />

              {/* Conteúdo */}
              <div className="relative z-10 flex flex-row items-center justify-between gap-3 md:gap-10 p-5 sm:p-7 md:p-14">

                {/* Texto */}
                <div className="flex-1 text-left">

                  {/* Badge */}
                  <div className="mb-6 inline-flex max-w-full items-center gap-1.5 rounded-xl md:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-[5px] md:px-4 md:py-2">

                    <Clock3 className="h-3 w-3 md:h-4 md:w-4 text-cyan-300 flex-shrink-0" />

                    <span
                      className="font-black uppercase whitespace-nowrap leading-none"
                      style={{
                        fontSize: 'clamp(8px, 0.9vw, 14px)',
                        letterSpacing: 'clamp(0.02em, 0.12vw, 0.12em)',
                        background:
                          'linear-gradient(160deg, #a5f3fc 0%, #67e8f9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      YOUR TEAM IS NOW ON THE CLOCK
                    </span>

                  </div>

                  {/* Título */}
                  <h2
                    className="mb-2 leading-[0.9]"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: 'clamp(84px, 9vw, 100px)',
                      letterSpacing: '0.02em',
                    }}
                  >

                    <span
                      style={{
                        display: 'block',
                        fontSize: 'clamp(58px, 9vw, 100px)',
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      THE
                    </span>

                    <span
                      style={{
                        display: 'block',
                        background:
                          'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.3))',
                      }}
                    >
                      DRAFT
                    </span>
                    <span
                      style={{
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #64748b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      DAY
                    </span>

                  </h2>

                  {/* Subtítulo */}
                  <div className="mx-0 mb-5 md:mb-6 text-slate-300 flex flex-col gap-1 md:gap-1.5">

                    <p className="text-[14px] sm:text-[14px] md:text-base font-medium leading-tight">
                      Every dynasty started with a pick.
                    </p>

                    <p className="text-[14px] sm:text-[14px] md:text-base text-slate-400 leading-tight">
                      And probably a beer or two.
                    </p>

                  </div>

                  {/* Botões */}
                  <div className="flex flex-wrap gap-2 md:gap-3">

                    <a
                      href="/draft"
                      className="inline-flex h-8 md:h-12 items-center gap-1 md:gap-2 rounded-lg md:rounded-2xl bg-cyan-400 px-2.5 md:px-6 text-[12px] md:text-sm font-bold text-[#020617] transition-all hover:bg-cyan-300 whitespace-nowrap"
                    >
                      <ScrollText className="h-3 w-3 md:h-4 md:w-4" />
                      Draft History
                    </a>

                  </div>

                </div>

                {/* Área direita igual ao Hero */}
                <div
                  className="hidden [@media(min-width:4100px)]:flex relative items-center justify-center min-w-[240px]"
                  style={{
                    animation: 'heroFloat 5s ease-in-out infinite',
                  }}
                >
                  <Image
                    src="/images/LogoFinalBlack.png"
                    alt="Tapitas League Logo"
                    width={600}
                    height={600}
                    style={{
                      width: 'clamp(240px, 24vw, 600px)',
                      height: 'auto',
                      objectFit: 'contain',
                      opacity: 0,
                    }}
                  />
                </div>

              </div>

            </div>

            {/* SLIDE 3 - POWER RANKINGS */}
            <div className="relative w-1/3 shrink-0">

              {/* Background */}
              <div className="absolute inset-0 overflow-hidden rounded-[28px] md:rounded-[38px] pointer-events-none">

                <svg
                  className="
                    absolute
                    inset-y-0
                    left-1/2
                    -translate-x-[52%]
                    h-full
                    w-[105%]
                    md:w-[135%]
                    max-w-none
                  "
                  preserveAspectRatio="xMidYMid slice"
                  viewBox="0 0 900 340"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >

                  {/* Flecha principal */}
                  <g
                    opacity="0.70"
                    style={{
                      filter: 'drop-shadow(0 0 60px rgba(34,197,94,0.45))',
                    }}
                  >
                    <path
                      d="M500 300 L710 110 L750 150 L750 70 L670 70 L710 110 L500 300 Z"
                      fill="#22c55e"
                    />
                  </g>

                  {/* Flechas secundárias preenchidas */}
                  <g
                    opacity="0.50"
                    fill="#22d3ee"
                    style={{
                      filter: 'drop-shadow(0 0 45px rgba(34,211,238,0.35))',
                    }}
                  >

                    <path d="M410 250 L500 160 L535 195 L535 125 L465 125 L500 160 L410 250 Z" />

                    <path d="M660 300 L730 230 L755 255 L755 205 L705 205 L730 230 L660 300 Z" />

                  </g>

                  {/* Flechas outline */}
                  <g
                    opacity="0.60"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="5"
                    style={{
                      filter: 'drop-shadow(0 0 25px rgba(34,211,238,0.4))',
                    }}
                  >

                    <path d="M570 240 L670 140" />

                    <polyline
                      points="625,140 670,140 670,185"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    <path d="M450 290 L540 200" />

                    <polyline
                      points="495,200 540,200 540,245"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                  </g>

                  {/* Flechas vermelhas */}
                  <g
                    opacity="0.40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="5"
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.35))',
                    }}
                  >

                    <path d="M430 80 L510 160" />

                    <polyline
                      points="465,160 510,160 510,115"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    <path d="M610 40 L690 120" />

                    <polyline
                      points="645,120 690,120 690,75"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                  </g>

                  {/* Grid ranking */}
                  <g
                    opacity="0.35"
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                  >

                    {[40, 80, 120, 160, 200, 240, 280, 320].map((y) => (
                      <line
                        key={y}
                        x1="300"
                        y1={y}
                        x2="860"
                        y2={y}
                      />
                    ))}

                  </g>

                  {/* Linhas diagonais */}
                  <g
                    opacity="0.24"
                    stroke="#22d3ee"
                    strokeWidth="2"
                  >

                    <line x1="380" y1="0" x2="560" y2="340" />
                    <line x1="500" y1="0" x2="680" y2="340" />
                    <line x1="620" y1="0" x2="800" y2="340" />

                  </g>

                  {/* Número principal */}
                  <text
                    x="620"
                    y="300"
                    fontFamily="'Bebas Neue', sans-serif"
                    fontSize="320"
                    fill="#22d3ee"
                    opacity="0.18"
                  >
                    #1
                  </text>

                  {/* Rankings secundários */}
                  <g
                    fontFamily="'Bebas Neue', sans-serif"
                    fill="#22d3ee"
                    opacity="0.28"
                  >

                    <text x="430" y="95" fontSize="80">02</text>

                    <text x="540" y="195" fontSize="80">03</text>

                    <text x="640" y="120" fontSize="80">05</text>

                    <text x="740" y="325" fontSize="80">10</text>

                  </g>

                  {/* Analytics dots topo */}
                  <g opacity="0.40" fill="#22d3ee">

                    {[0, 1, 2, 3, 4].map((row) =>
                      [0, 1, 2, 3, 4].map((col) => (
                        <circle
                          key={`top-${row}-${col}`}
                          cx={790 + col * 14}
                          cy={35 + row * 14}
                          r="2.2"
                        />
                      ))
                    )}

                  </g>

                  {/* Analytics dots inferior */}
                  <g opacity="0.22" fill="#22d3ee">

                    {[0, 1, 2, 3].map((row) =>
                      [0, 1, 2, 3].map((col) => (
                        <circle
                          key={`bottom-${row}-${col}`}
                          cx={350 + col * 14}
                          cy={270 + row * 14}
                          r="2"
                        />
                      ))
                    )}

                  </g>

                  {/* Movimentações positivas */}
                  <g
                    fontFamily="'Bebas Neue', sans-serif"
                    fill="#22c55e"
                    opacity="0.65"
                  >

                    <text x="510" y="140" fontSize="34">
                      ▲ +3
                    </text>

                    <text x="720" y="240" fontSize="34">
                      ▲ +5
                    </text>

                    <text x="460" y="285" fontSize="30">
                      ▲ +1
                    </text>

                  </g>

                  {/* Movimentações negativas */}
                  <g
                    fontFamily="'Bebas Neue', sans-serif"
                    fill="#ef4444"
                    opacity="0.55"
                  >

                    <text x="520" y="175" fontSize="34">
                      ▼ -2
                    </text>

                    <text x="400" y="305" fontSize="30">
                      ▼ -1
                    </text>

                  </g>

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

              {/* Conteúdo */}
              <div className="relative z-10 flex flex-row items-center justify-between gap-3 md:gap-10 p-5 sm:p-7 md:p-14 pb-10 md:pb-14">

                <div className="flex-1 text-left">

                  {/* Badge */}
                  <div className="mb-6 inline-flex max-w-full items-center gap-1.5 rounded-xl md:rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-2 py-[5px] md:px-4 md:py-2">

                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-cyan-300 flex-shrink-0" />

                    <span
                      className="font-black uppercase text-cyan-300 whitespace-nowrap leading-none"
                      style={{
                        fontSize: 'clamp(8px, 0.9vw, 14px)',
                        letterSpacing: 'clamp(0.02em, 0.12vw, 0.12em)',
                      }}
                    >
                      POWER RANKINGS | WEEKLY MOVEMENT
                    </span>

                  </div>

                  {/* Título */}
                  <h2
                    className="mb-2 leading-[0.9]"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: 'clamp(84px, 9vw, 100px)',
                      letterSpacing: '0.02em',
                    }}
                  >

                    <span
                      style={{
                        display: 'block',
                        fontSize: 'clamp(58px, 9vw, 100px)',
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      WEEKLY
                    </span>

                    <span
                      style={{
                        display: 'block',
                        background:
                          'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.3))',
                      }}
                    >
                      POWER{' '}
                    </span>

                    <span
                      style={{
                        background:
                          'linear-gradient(160deg, #e2e8f0 0%, #64748b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      RANKINGS
                    </span>

                  </h2>

                  {/* Texto */}
                  <div className="mx-0 mb-5 md:mb-6 text-slate-400 flex flex-col gap-1 md:gap-1.5">

                    <p className="text-[14px] sm:text-[14px] md:text-base font-medium leading-tight">
                      Every rise. Every fall. Every debate.
                    </p>

                    <p className="text-[14px] sm:text-[14px] md:text-base text-slate-500 leading-tight">
                      Track weekly movement, strength of schedule and league trends.
                    </p>

                  </div>

                  {/* Botões */}
                  <div className="flex flex-row items-start gap-1.5 md:gap-3">

                    <a
                      href="/powerrankings"
                      className="inline-flex h-8 md:h-12 items-center gap-1 md:gap-2 rounded-lg md:rounded-2xl bg-cyan-400 px-2.5 md:px-6 text-[12px] md:text-sm font-bold text-[#020617] transition-all hover:bg-cyan-300 whitespace-nowrap"
                    >
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                      Current Rankings
                    </a>

                  </div>

                </div>

              </div>

            </div>

          </div>


        </div>
        <div className="mt-3 md:mt-4 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all ${currentSlide === i
                ? 'w-8 bg-cyan-400'
                : 'w-2 bg-white/40'
                }`}
            />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CONTENT SECTION
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 mx-auto max-w-[16100px] px-3 pb-12 pt-3">

        {/* ── STAT STRIP ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }}
          className="mb-8 grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {[
            { icon: Shield, label: 'Franchises', value: leagueStats.franchises, sub: 'All-time', color: 'cyan' },
            { icon: Calendar, label: 'Seasons', value: leagueStats.seasons, sub: buildSeasonRanges(leagueStats.allSeasons), color: 'purple' },
            { icon: Radar, label: 'Games Played', value: leagueStats.games, sub: 'All-time', color: 'emerald' },
            { icon: Flame, label: 'Highest Score', value: leagueStats.highestScore, sub: leagueStats.highestScoreTeam, color: 'orange' },
          ].map(({ icon: Icon, label, value, sub, color }) => {
            const c = {
              cyan: { icon: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300', val: 'text-cyan-300', border: 'border-cyan-400/10 hover:border-cyan-400/25' },
              purple: { icon: 'border-purple-400/20 bg-purple-400/10 text-purple-300', val: 'text-purple-300', border: 'border-purple-400/10 hover:border-purple-400/25' },
              emerald: { icon: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300', val: 'text-emerald-300', border: 'border-emerald-400/10 hover:border-emerald-400/25' },
              orange: { icon: 'border-orange-400/20 bg-orange-400/10 text-orange-300', val: 'text-orange-300', border: 'border-orange-400/10 hover:border-orange-400/25' },
            }[color]
            return (
              <div key={label} className={`flex items-center gap-4 rounded-[22px] border ${c.border} bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] px-5 py-4 transition-all`}>
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${c.icon}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
                  <div className={`text-2xl font-black leading-none ${c.val}`}>{value}</div>
                  <div className="mt-0.5 truncate text-[10px] font-bold text-slate-600">{sub}</div>
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* ── QUICK NAV ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.4 }}
          className="mb-8 mt-4"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {QUICK_NAV.map(({ label, href, icon: Icon, color, border, bg }) => (
              <a key={label} href={href}
                className={`group flex flex-col items-center gap-1.5 rounded-[18px] border ${border} ${bg} px-2 py-3 text-center transition-all hover:scale-[1.05] hover:brightness-125`}>
                <Icon className={`h-4 w-4 ${color}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.12em] ${color}`}>{label}</span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* ── POWER RANKINGS + STANDINGS ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: false, amount: 0.06 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex flex-col gap-4 xl:flex-row"
        >
          {/* Power Rankings */}
          <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)] xl:flex-1">
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/14 bg-white/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-white"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    Power Rankings
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-cyan-50/85 sm:text-sm">
                    {currentSeason ? `${currentSeason} · Latest week` : 'Carregando...'}
                  </div>
                </div>
              </div>

              <a
                href="/powerrankings"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
              >
                Ver tudo
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {prLoading ? (
                <div className="py-8 text-center text-sm font-bold text-white/82">
                  Carregando...
                </div>
              ) : (
                prData.map((row, i) => {
                  const avatar = getTeamAvatar(row.team)

                  return (
                    <a
                      key={row.team}
                      href={`/teams?team=${encodeURIComponent(row.team)}`}
                      className="flex items-center gap-3 rounded-[24px] border border-white/9 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-3.5 text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
                    >
                      <div className="flex w-8 flex-shrink-0 justify-center">
                        <span
                          className="text-center font-black leading-none"
                          style={{
                            fontFamily: '"Bebas Neue", sans-serif',
                            fontSize: '24px',
                            color:
                              i === 0
                                ? '#ffffff'
                                : i <= 1
                                  ? '#dbe7ff'
                                  : i <= 3
                                    ? '#b4cbed'
                                    : '#89a3c8',
                          }}
                        >
                          {row.rank}
                        </span>
                      </div>

                      {avatar ? (
                        <img
                          src={avatar}
                          alt={row.team}
                          className="h-10 w-10 flex-shrink-0 rounded-[16px] object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] border border-cyan-100/16 bg-white/8 text-[10px] font-black text-cyan-50">
                          {row.team.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black tracking-[0.01em] text-white">
                          {row.team}
                        </div>
                      </div>

                      <span
                        className={`flex min-w-[34px] items-center justify-end gap-1 text-xs font-black ${row.delta > 0
                          ? 'text-emerald-300'
                          : row.delta < 0
                            ? 'text-rose-300'
                            : 'text-slate-300'
                          }`}
                      >
                        {row.delta > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : row.delta < 0 ? (
                          <TrendingDown className="h-3.5 w-3.5" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                        {row.delta !== 0 ? Math.abs(row.delta) : ''}
                      </span>
                    </a>
                  )
                })
              )}
            </div>
          </div>

          {/* Current Standings */}
          <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)] xl:flex-1">
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <BarChart2 className="h-5 w-5 text-cyan-300" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-white"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    Standings
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-slate-300 sm:text-sm">
                    {currentSeason
                      ? currentWeekLabel === '__final__'
                        ? `${currentSeason} · Final Standings`
                        : currentWeekLabel
                          ? `${currentSeason} · Through Week ${currentWeekLabel}`
                          : `${currentSeason}`
                      : 'Carregando...'}
                  </div>
                </div>
              </div>

              <a
                href="/standings"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
              >
                Ver tudo
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {currentStandings.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-300">
                  Carregando...
                </div>
              ) : (
                currentStandings.slice(0, 10).map((row, i) => {
                  const avatar = getTeamAvatar(row.team)

                  return (
                    <a
                      key={row.team}
                      href={`/teams?team=${encodeURIComponent(row.team)}`}
                      className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-3.5 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
                    >
                      <div className="flex w-8 flex-shrink-0 justify-center">
                        <span
                          className="text-center font-black leading-none"
                          style={{
                            fontFamily: '"Bebas Neue", sans-serif',
                            fontSize: '24px',
                            color:
                              i === 0
                                ? '#ffffff'
                                : i <= 3
                                  ? '#dbe7ff'
                                  : '#7b95bf',
                          }}
                        >
                          {i + 1}
                        </span>
                      </div>

                      {avatar ? (
                        <img
                          src={avatar}
                          alt={row.team}
                          className="h-10 w-10 flex-shrink-0 rounded-[16px] object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] border border-sky-300/15 bg-sky-300/10 text-[10px] font-black text-sky-100">
                          {row.team.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black tracking-[0.01em] text-white">
                          {row.team}
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1.5 pl-2 whitespace-nowrap">
                        <span className="text-sm font-black text-emerald-400">{row.w}W</span>
                        <span className="text-xs text-white/25">·</span>
                        <span className="text-sm font-black text-rose-400">{row.l}L</span>
                        <span className="text-xs text-white/25">·</span>
                        <span className="text-sm font-bold text-slate-200">{Math.round(row.pf)} pts</span>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </motion.div>

        {/* ── NEWS PREVIEW ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: false, amount: 0.06 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 overflow-hidden bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_60%,#0e7490_100%)] p-3 shadow-[0_8px_32px_rgba(6,182,212,0.25)]"
        >
          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-black/20 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                <Newspaper className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <div
                  className="uppercase leading-none text-[rgba(18,30,52,0.98)]"
                  style={{
                    fontFamily: '"Bebas Neue", sans-serif',
                    fontSize: '24px',
                    letterSpacing: '0.075em',
                    fontWeight: 900,
                  }}
                >
                  Newsletter
                </div>

                <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-white/85 sm:text-sm">
                  Memes, recaps and news
                </div>
              </div>
            </div>

            <a
              href="/news"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
            >
              Ver tudo
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {newsLoading ? (
            <div className="py-10 text-center text-sm font-bold text-slate-300">
              Carregando...
            </div>
          ) : newsPosts.length === 0 ? (
            <div className="py-10 text-center text-sm font-bold text-slate-300">
              Nenhum post ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {newsPosts.map((post, i) => {
                const s = CATEGORY_STYLE[post.category]
                const Icon = s?.icon || Newspaper

                return (
                  <a
                    key={post.id || i}
                    href={`/news/${post.slug}`}
                    className="group overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-[1px] hover:bg-white/[0.05] hover:border-white/12"
                  >
                    {post.imageUrl && (
                      <div className="h-36 w-full overflow-hidden rounded-t-[24px]">
                        <img
                          src={post.imageUrl.split('|')[0]}
                          alt={post.title}
                          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      {post.category && s && (
                        <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${s.border} ${s.bg} ${s.color}`}>
                          <Icon className="h-3 w-3" />
                          {post.category}
                        </div>
                      )}

                      <h3 className="line-clamp-2 text-[14px] font-black leading-[1.15] text-white transition-colors group-hover:text-cyan-300 sm:text-[15px]">
                        {post.title}
                      </h3>

                      <div className="mt-2 text-[12px] font-bold text-slate-400">
                        {formatDate(post.date)}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ── DRAFT PICKS + RECORDS ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: false, amount: 0.06 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {/* DRAFT — scrolling picks feed */}
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)]">
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                  <ScrollText className="h-5 w-5 text-pink-300" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-white"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    Last Draft
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-slate-300 sm:text-sm">
                    {draftSeason ? `${draftSeason} · First 10 picks` : 'Carregando...'}
                  </div>
                </div>
              </div>

              <a
                href="/draft"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
              >
                Draft Board
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {draftPicks.length === 0 ? (
                <div className="py-8 text-center text-sm font-bold text-slate-300">
                  Carregando...
                </div>
              ) : (
                draftPicks.map((pick, i) => {
                  const posColor =
                    POS_COLORS[pick.position] || 'text-slate-200 border-white/10 bg-white/8'

                  return (
                    <a
                      key={i}
                      href={`/teams?team=${encodeURIComponent(pick.team)}`}
                      className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-3 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
                    >
                      <span
                        className="w-7 flex-shrink-0 text-center font-black leading-none text-slate-300"
                        style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px' }}
                      >
                        {pick.pick}
                      </span>

                      <DraftPickPlayerAvatar
                        name={pick.player}
                        playerLookup={playerLookup}
                        size={36}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black tracking-[-0.01em] text-white">
                          {pick.player}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[11px] font-bold text-slate-400">
                          <span className="truncate">{pick.team}</span>
                          {getTeamAvatar(pick.team) ? (
                            <img
                              src={getTeamAvatar(pick.team)}
                              alt={pick.team}
                              className="h-4 w-4 flex-shrink-0 rounded-md object-cover"
                            />
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${posColor}`}
                      >
                        {pick.position || '—'}
                      </span>
                    </a>
                  )
                })
              )}
            </div>
          </div>

          {/* RECORDS — leaders per category with tied display */}
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)]">
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/14 bg-white/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Zap className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-white"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    All-Time Records
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-cyan-50/85 sm:text-sm">
                    Best of the best
                  </div>
                </div>
              </div>

              <a
                href="/records"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
              >
                Ver tudo
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {[
                { emoji: '🏆', label: 'Most Titles', getter: t => t.titles, fmt: v => v, color: 'text-yellow-300' },
                { emoji: '📈', label: 'Most Wins', getter: t => t.wins, fmt: v => v, color: 'text-emerald-300' },
                { emoji: '🔥', label: 'Top Scorer', getter: t => t.pf, fmt: v => Math.round(v) + ' pts', color: 'text-orange-300' },
                { emoji: '🎯', label: 'Best Win%', getter: t => t.winPct, fmt: v => v + '%', color: 'text-cyan-200' },
                { emoji: '🏅', label: 'Playoff Apps', getter: t => t.playoffApps, fmt: v => v, color: 'text-violet-300' },
                { emoji: '⚔️', label: 'Finals Apps', getter: t => t.finals, fmt: v => v, color: 'text-rose-300' },
              ].map(({ emoji, label, getter, fmt, color }) => {
                const leaders = topNTeams(standings, getter, 3)
                const topVal = leaders[0] ? getter(leaders[0]) : 0

                return (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-[24px] border border-white/9 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
                  >


                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[12px] font-black uppercase tracking-[0.15em] text-cyan-50/72">
                        {label}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {leaders.map(t => {
                          const av = getTeamAvatar(t.team)

                          return (
                            <a
                              key={t.team}
                              href={`/teams?team=${encodeURIComponent(t.team)}`}
                              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all hover:bg-white/12"
                            >
                              {av ? (
                                <img
                                  src={av}
                                  alt={t.team}
                                  className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                                />
                              ) : null}

                              <span className="max-w-[88px] truncate text-xs font-black text-white">
                                {shortTeamName(t.team)}
                              </span>
                            </a>
                          )
                        })}
                      </div>
                    </div>

                    <span className={`flex-shrink-0 text-lg font-black leading-none ${color}`}>
                      {leaders[0] ? fmt(topVal) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* ── RECENT MATCHUPS ─────────────────────────────────────────────── */}
        {recentMatchups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.06 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 overflow-hidden bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_60%,#0e7490_100%)] p-3 shadow-[0_8px_32px_rgba(6,182,212,0.25)]"
          >
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-black/20 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Swords className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-[rgba(18,30,52,0.98)]"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    Recent Matchups
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-[rgba(18,30,52,0.98)] sm:text-sm">
                    {`${currentSeason} · Week ${recentMatchups[0]?.week}`}
                  </div>
                </div>
              </div>

              <a
                href="/matchups"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
              >
                Ver tudo
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {recentMatchups.map((m, i) => {
                const avA = getTeamAvatar(m.team)
                const avB = getTeamAvatar(m.opp)
                const winA = m.score > m.oppScore

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-[24px] border border-white/[0.06] bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] p-3 transition-all hover:bg-white/[0.05]"
                  >
                    <a
                      href={`/teams?team=${encodeURIComponent(m.team)}`}
                      className="group flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      {avA ? (
                        <img src={avA} alt={m.team} className="h-10 w-10 rounded-[16px] object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-[10px] font-black text-slate-400">
                          {m.team.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <span className="line-clamp-1 text-center text-[10px] font-black leading-tight text-white transition-colors group-hover:text-cyan-300">
                        {m.team}
                      </span>

                      <span className={`text-base font-black leading-none ${winA ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {m.score.toFixed(1)}
                      </span>
                    </a>

                    <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">vs</span>
                      {winA ? (
                        <span className="text-[9px] font-black text-emerald-400">W</span>
                      ) : (
                        <span className="text-[9px] font-black text-red-400">L</span>
                      )}
                    </div>

                    <a
                      href={`/teams?team=${encodeURIComponent(m.opp)}`}
                      className="group flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      {avB ? (
                        <img src={avB} alt={m.opp} className="h-10 w-10 rounded-[16px] object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-[10px] font-black text-slate-400">
                          {m.opp.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <span className="line-clamp-1 text-center text-[10px] font-black leading-tight text-white transition-colors group-hover:text-cyan-300">
                        {m.opp}
                      </span>

                      <span className={`text-base font-black leading-none ${!winA ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {m.oppScore.toFixed(1)}
                      </span>
                    </a>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── RIVALRY SPOTLIGHT + FRANCHISE LEADERS ──────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 xl:flex-row">

          {/* RIVALRY SPOTLIGHT */}
          <motion.div
            initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.08 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)] xl:flex-[1.15]"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/14 bg-white/7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Swords className="h-5 w-5 text-red-300" />
                  </div>

                  <div>
                    <div
                      className="uppercase leading-none text-white"
                      style={{
                        fontFamily: '"Bebas Neue", sans-serif',
                        fontSize: '24px',
                        letterSpacing: '0.075em',
                        fontWeight: 900,
                      }}
                    >
                      Rivalry Spotlight
                    </div>
                    <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-cyan-50/85 sm:text-sm">
                      All-time H2H
                    </div>
                  </div>
                </div>

                <a
                  href="/rivalries"
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-[1px] hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))]"
                >
                  Ver tudo
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-5">
                <TeamSelect
                  value={selectedTeamA}
                  onChange={(val) => {
                    setSelectedTeamA(val)
                    setSelectedTeamB('')
                  }}
                  options={allTeams}
                  placeholder="Time A..."
                />
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/12 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-xs font-black text-white">
                  vs
                </div>
                <TeamSelect
                  value={selectedTeamB}
                  onChange={setSelectedTeamB}
                  options={teamsForB}
                  placeholder="Time B..."
                  disabled={!selectedTeamA}
                />
              </div>

              {!selectedRivalry ? (
                <div className="mx-4 mb-2 flex flex-1 flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/12 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] py-10 text-center sm:mx-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05]">
                    <Swords className="h-5 w-5 text-slate-200" />
                  </div>
                  <p className="text-xs font-bold text-cyan-50/75">
                    Selecione dois times para ver o confronto
                  </p>
                </div>
              ) : (() => {
                const bigA = parseBiggestWin(selectedRivalry.biggestA)
                const bigB = parseBiggestWin(selectedRivalry.biggestB)
                const strA = parseBestStreak(selectedRivalry.bestStreakA)
                const strB = parseBestStreak(selectedRivalry.bestStreakB)
                const wA = selectedRivalry.winsA
                const wB = selectedRivalry.winsB
                const aLeads = wA > wB
                const bLeads = wB > wA

                return (
                  <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
                    {/* VS strip */}
                    <div className="overflow-hidden rounded-[24px] border border-white/9 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] p-4 shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                      <div className="flex items-center justify-between gap-4">
                        <a
                          href={`/teams?team=${encodeURIComponent(selectedRivalry.teamA)}`}
                          className="group flex flex-1 flex-col items-center gap-1.5"
                        >
                          {(() => {
                            const av = getTeamAvatar(selectedRivalry.teamA)
                            return av ? (
                              <img
                                src={av}
                                alt={selectedRivalry.teamA}
                                className="h-14 w-14 rounded-[18px] object-cover transition-all group-hover:ring-2 group-hover:ring-cyan-200/45"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-sm font-black text-slate-300">
                                {selectedRivalry.teamA.slice(0, 2).toUpperCase()}
                              </div>
                            )
                          })()}
                          <span className="text-center text-xs font-black text-white transition-colors group-hover:text-cyan-200">
                            {shortTeamName(selectedRivalry.teamA)}
                          </span>
                          <span
                            className="text-3xl font-black leading-none"
                            style={{
                              fontFamily: '"Bebas Neue",sans-serif',
                              color: aLeads ? '#86efac' : bLeads ? '#fca5a5' : '#e2e8f0',
                            }}
                          >
                            {wA}
                          </span>
                        </a>

                        <div className="flex flex-shrink-0 flex-col items-center gap-1">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-50/65">
                            All-Time
                          </div>
                          <div className="h-px w-6 bg-white/10" />
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-50/65">
                            Record
                          </div>
                        </div>

                        <a
                          href={`/teams?team=${encodeURIComponent(selectedRivalry.teamB)}`}
                          className="group flex flex-1 flex-col items-center gap-1.5"
                        >
                          {(() => {
                            const av = getTeamAvatar(selectedRivalry.teamB)
                            return av ? (
                              <img
                                src={av}
                                alt={selectedRivalry.teamB}
                                className="h-14 w-14 rounded-[18px] object-cover transition-all group-hover:ring-2 group-hover:ring-cyan-200/45"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.05] text-sm font-black text-slate-300">
                                {selectedRivalry.teamB.slice(0, 2).toUpperCase()}
                              </div>
                            )
                          })()}
                          <span className="text-center text-xs font-black text-white transition-colors group-hover:text-cyan-200">
                            {shortTeamName(selectedRivalry.teamB)}
                          </span>
                          <span
                            className="text-3xl font-black leading-none"
                            style={{
                              fontFamily: '"Bebas Neue",sans-serif',
                              color: bLeads ? '#86efac' : aLeads ? '#fca5a5' : '#e2e8f0',
                            }}
                          >
                            {wB}
                          </span>
                        </a>
                      </div>

                      <div className="mt-3 flex justify-center">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${selectedRivalry.heat === 'Legendary'
                            ? 'border-yellow-300/30 bg-yellow-300/10 text-yellow-200'
                            : selectedRivalry.heat === 'Elite'
                              ? 'border-orange-300/30 bg-orange-300/10 text-orange-200'
                              : selectedRivalry.heat === 'High'
                                ? 'border-rose-300/30 bg-rose-300/10 text-rose-200'
                                : 'border-white/10 bg-white/[0.04] text-cyan-50/75'
                            }`}
                        >
                          <Flame className="h-3 w-3" />
                          {selectedRivalry.heat} Rivalry
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    {/* Stats — 3-column table: A | Label | B */}
                    <div className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-white/[0.025]">
                      {[
                        {
                          label: 'Current Streak', icon: Radar,
                          valA: selectedRivalry.streak, valB: null, single: true
                        },
                        {
                          label: 'Playoffs', icon: Trophy,
                          valA: selectedRivalry.playoffRecord.split('-')[0],
                          valB: selectedRivalry.playoffRecord.split('-')[1]
                        },
                        {
                          label: 'Avg Margin', icon: Activity,
                          valA: `${selectedRivalry.avgMargin} pts`, valB: null, single: true
                        },
                        {
                          label: 'Last Game', icon: Stars,
                          valA: selectedRivalry.lastMeeting.score.split(' vs ')[0],
                          valB: selectedRivalry.lastMeeting.score.split(' vs ')[1],
                          subA: selectedRivalry.lastMeeting.meta || null,
                          subB: selectedRivalry.lastMeeting.meta || null
                        },
                        {
                          label: 'Biggest Win', icon: Flame,
                          valA: bigA ? `${bigA.scoreA}–${bigA.scoreB}${bigA.margin ? ` (+${bigA.margin})` : ''}` : '—',
                          valB: bigB ? `${bigB.scoreA}–${bigB.scoreB}${bigB.margin ? ` (+${bigB.margin})` : ''}` : '—',
                          subA: bigA?.label || null, subB: bigB?.label || null
                        },
                        {
                          label: 'Best Streak', icon: TrendingUp,
                          valA: strA?.count ? `${strA.result}${strA.count}` : '—',
                          valB: strB?.count ? `${strB.result}${strB.count}` : '—',
                          subA: strA?.start ? `${strA.start}${strA.end ? ` → ${strA.end}` : ''}` : null,
                          subB: strB?.start ? `${strB.start}${strB.end ? ` → ${strB.end}` : ''}` : null
                        },
                      ].map(({ label, icon: Icon, valA, valB, subA, subB, single }) => (
                        <div key={label} className="grid grid-cols-[1fr_auto_1fr] border-b border-white/[0.05] last:border-0">
                          {/* Team A */}
                          <div className="flex flex-col justify-center px-3 py-2.5 min-w-0">
                            <span className="text-sm font-black text-white leading-tight truncate">{valA ?? '—'}</span>
                            {subA && <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{subA}</span>}
                          </div>
                          {/* Center label */}
                          <div className="flex flex-col items-center justify-center gap-1 border-x border-white/[0.05] px-3 py-2.5 min-w-[86px]">
                            <Icon className="h-3 w-3 text-red-400/60 flex-shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 text-center leading-tight">{label}</span>
                          </div>
                          {/* Team B */}
                          <div className="flex flex-col items-end justify-center px-3 py-2.5 min-w-0">
                            {!single && (
                              <>
                                <span className="text-sm font-black text-white leading-tight truncate">{valB ?? '—'}</span>
                                {subB && <span className="text-[10px] text-slate-500 mt-0.5 leading-tight text-right">{subB}</span>}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </motion.div>

          {/* FRANCHISE LEADERS */}
          <motion.div
            initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.08 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(2,6,23,0.9))] p-3 shadow-[0_24px_56px_rgba(7,28,45,0.20)] xl:flex-[0.85]"
          >
            <div className="flex h-full flex-col">
              <div className="mb-4 flex items-start justify-between gap-4 px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                    <Medal className="h-5 w-5 text-yellow-300" />
                  </div>

                  <div>
                    <div
                      className="uppercase leading-none text-white"
                      style={{
                        fontFamily: '"Bebas Neue", sans-serif',
                        fontSize: '24px',
                        letterSpacing: '0.075em',
                        fontWeight: 900,
                      }}
                    >
                      Franchise Leaders
                    </div>

                    <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-slate-300 sm:text-sm">
                      League Rankings
                    </div>
                  </div>
                </div>

                {standings.length > 5 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setStandingsPage(p => Math.max(0, p - 1))}
                      disabled={standingsPage === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-slate-300 transition-all hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))] hover:text-white disabled:opacity-20"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <span className="text-[10px] font-black text-slate-400">
                      {standingsPage + 1}/{Math.ceil(standings.length / 5)}
                    </span>

                    <button
                      onClick={() => setStandingsPage(p => Math.min(Math.ceil(standings.length / 5) - 1, p + 1))}
                      disabled={standingsPage >= Math.ceil(standings.length / 5) - 1}
                      className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-white/10 bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] text-slate-300 transition-all hover:bg-[linear-gradient(135deg,rgba(22,34,58,0.9),rgba(6,12,30,0.96))] hover:text-white disabled:opacity-20"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:px-5">
                <TeamSelect
                  value={sortCategory}
                  onChange={setSortCategory}
                  options={SORT_OPTIONS.map(o => o.label)}
                  placeholder="Category..."
                />

                {SORT_OPTIONS.find(o => o.label === sortCategory)?.subs.length > 1 && (
                  <TeamSelect
                    value={sortSub}
                    onChange={setSortSub}
                    options={SORT_OPTIONS.find(o => o.label === sortCategory)?.subs.map(s => s.label) ?? []}
                    placeholder="Type..."
                  />
                )}
              </div>

              <div className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
                {standings.slice(standingsPage * 5, standingsPage * 5 + 5).map((team, index) => {
                  const globalIndex = standingsPage * 5 + index
                  const cat = SORT_OPTIONS.find(o => o.label === sortCategory)
                  const sub = cat?.subs.find(s => s.label === sortSub) ?? cat?.subs[0]

                  const keyMap = {
                    'W': t => t.wins,
                    'RS_W': t => t.rsW,
                    'PO_W': t => t.poW,
                    'L': t => t.losses,
                    'RS_L': t => t.rsL,
                    'PO_L': t => t.poL,
                    'W%': t => `${Math.round(t.winPct)}%`,
                    'RS_W%': t => `${Math.round(t.rsWinPct)}%`,
                    'PO_W%': t => `${Math.round(t.poWinPct)}%`,
                    'PF': t => Math.round(t.pf),
                    'RS_PF': t => Math.round(t.rsPF),
                    'PO_PF': t => Math.round(t.poPF),
                    'W Streak RS': t => t.wStreakRS,
                    'W Streak Total': t => t.wStreakTotal,
                    'L Streak RS': t => t.lStreakRS,
                    'L Streak Total': t => t.lStreakTotal,
                    'Playoff Apps': t => t.playoffApps,
                    'Finals': t => t.finals,
                    'Titles': t => t.titles,
                  }

                  const shortLabelMap = {
                    'W': 'Wins',
                    'RS_W': 'Wins',
                    'PO_W': 'Wins',
                    'L': 'Losses',
                    'RS_L': 'Losses',
                    'PO_L': 'Losses',
                    'W%': 'Win %',
                    'RS_W%': 'Win %',
                    'PO_W%': 'Win %',
                    'PF': 'Points',
                    'RS_PF': 'Points',
                    'PO_PF': 'Points',
                    'W Streak RS': 'Games',
                    'W Streak Total': 'Games',
                    'L Streak RS': 'Games',
                    'L Streak Total': 'Games',
                    'Playoff Apps': 'Apps',
                    'Finals': 'Finals',
                    'Titles': 'Titles',
                  }

                  const displayValue = sub ? keyMap[sub.key]?.(team) ?? '—' : team.wins
                  const shortLabel = sub ? shortLabelMap[sub.key] ?? sortCategory : sortCategory
                  const avatar = getTeamAvatar(team.team)

                  return (
                    <a
                      key={`${team.team}-${globalIndex}`}
                      href={`/teams?team=${encodeURIComponent(team.team)}`}
                      className="group flex items-center gap-3 rounded-[22px] border border-white/[0.06] bg-[linear-gradient(160deg,rgba(18,30,52,0.98),rgba(10,18,35,0.99))] px-4 py-3 transition-all hover:border-white/10 hover:bg-white/[0.05]"
                    >
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] border border-cyan-300/20 bg-cyan-300/10 font-black text-cyan-200"
                        style={{ fontFamily: '"Bebas Neue",sans-serif', fontSize: '18px' }}
                      >
                        {globalIndex + 1}
                      </div>

                      {avatar ? (
                        <img
                          src={avatar}
                          alt={team.team}
                          className="h-9 w-9 flex-shrink-0 rounded-[14px] object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-[10px] font-black text-slate-300">
                          {team.team.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-black text-white transition-colors group-hover:text-cyan-200">
                          {team.team}
                        </div>

                        {(sub?.key === 'W Streak RS' ||
                          sub?.key === 'W Streak Total' ||
                          sub?.key === 'L Streak RS' ||
                          sub?.key === 'L Streak Total') ? (() => {
                            const kl = {
                              'W Streak RS': 'streakRS',
                              'W Streak Total': 'streakTotal',
                              'L Streak RS': 'lStreakRS',
                              'L Streak Total': 'lStreakTotal',
                            }
                            const si = streakMap[team.team]?.[kl[sub.key]]
                            if (!si) return null

                            return (
                              <div className="text-[11px] font-bold text-slate-400">
                                W{si.startWeek}, {si.startSeason} → W{si.endWeek}, {si.endSeason}
                                {si.active && <span className="ml-1 text-cyan-300">(active)</span>}
                              </div>
                            )
                          })() : (
                          <div className="text-[11px] font-bold text-slate-400">
                            {team.wins}W · {team.losses}L · {Math.round(team.pf)} pts
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div
                          className="font-black leading-none text-cyan-200"
                          style={{ fontSize: 'clamp(24px,4vw,36px)' }}
                        >
                          {displayValue}
                        </div>
                        <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                          {shortLabel}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── CHAMPIONS WALL ──────────────────────────────────────────────── */}
        {championsData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.06 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 overflow-hidden bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_60%,#0e7490_100%)] p-3 shadow-[0_8px_32px_rgba(6,182,212,0.25)]"
          >
            <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[20px] border border-black/20 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Trophy className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div
                    className="uppercase leading-none text-[rgba(18,30,52,0.98)]"
                    style={{
                      fontFamily: '"Bebas Neue", sans-serif',
                      fontSize: '24px',
                      letterSpacing: '0.075em',
                      fontWeight: 900,
                    }}
                  >
                    Champions Wall
                  </div>

                  <div className="mt-1.5 text-[13px] font-bold tracking-[0.02em] text-[rgba(18,30,52,0.98)] sm:text-sm">
                    Every title. Every campaign.
                  </div>
                </div>
              </div>
            </div>

            <ChampionsWallInline champions={championsData} />
          </motion.div>
        )}



      </section>

      {/* FOOTER */}
      <footer className="relative z-10 mx-auto max-w-[16100px] px-3 pb-8 pt-0">
        <div className="flex flex-col items-center gap-8 rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,23,0.98))] px-8 py-16 text-center">

          {/* Frase */}
          <h2
            className="whitespace-nowrap leading-[0.9] tracking-[-0.03em]"
            style={{
              fontFamily: '"Bebas Neue", sans-serif',
              fontSize: 'clamp(24px, 5vw, 96px)',
              background: 'linear-gradient(160deg, #e2e8f0 0%, #94a3b8 40%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            The game ends.{' '}
            <span
              style={{
                background: 'linear-gradient(160deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              The history remains.
            </span>
          </h2>

          {/* Linha divisória */}
          <div className="h-px w-24 bg-white/10" />

          {/* Logo + nome */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/LogoFinalBlack.png"
              alt="Tapitas League"
              width={32}
              height={32}
              className="opacity-40"
              style={{ filter: 'invert(1)' }}
            />
            <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
              Tapitas League
            </span>
          </div>

          {/* Copyright */}
          <p className="text-xs font-bold text-slate-600">
            © {new Date().getFullYear()} Tapitas League · Est. 2014 · All rights reserved.
          </p>

        </div>
      </footer>

      {/* DRAWER — Season Summary */}
      <>
        {/* Overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-[#080f1e] border-l border-white/10 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {/* Header do drawer */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080f1e] px-6 py-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Season Summary
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="text-xl font-black text-white">
                  Season{' '}
                  <select
                    value={selectedSeason}
                    onChange={(e) => {
                      setSeasonSummary(null)
                      setSelectedSeason(e.target.value)
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1 text-sm font-bold text-white outline-none"
                  >
                    {leagueStats?.allSeasons
                      ?.slice()
                      .sort((a, b) => b - a)
                      .map((season) => (
                        <option
                          key={season}
                          value={season}
                          className="bg-[#080f1e]"
                        >
                          {season}
                        </option>
                      ))}
                  </select>
                </div>
                {seasonSummary && !seasonSummary.champion && (
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 rounded-lg px-2 py-0.5 whitespace-nowrap">
                    In Progress
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            {!seasonSummary ? (
              <div className="flex items-center justify-center py-20 text-slate-500 font-bold">
                Loading...
              </div>
            ) : (
              <div className="flex flex-col gap-4">

                {/* In-progress warning */}
                {!seasonSummary.champion && (
                  <div className="rounded-[20px] border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-1">⏳ Temporada em andamento</div>
                    <div className="text-xs text-slate-500">Dados parciais. Champion, Finalist e Unicórnio só aparecem quando a temporada terminar.</div>
                  </div>
                )}

                {/* Campeão */}
                {seasonSummary.champion && (
                  <div className="rounded-[24px] border border-cyan-400/30 bg-cyan-400/[0.06] p-5">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">🏆 Champion</div>
                    <div className="text-2xl font-black text-white">{seasonSummary.champion.Team || seasonSummary.champion.team}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {parseNumber(seasonSummary.champion.RS_W)}–{parseNumber(seasonSummary.champion.RS_L)} reg season
                      {' • '}
                      {parseNumber(seasonSummary.champion.PO_W)}–{parseNumber(seasonSummary.champion.PO_L)} playoffs
                    </div>
                  </div>
                )}

                {/* Finalista */}
                {seasonSummary.finalist && (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">🥈 2nd Place</div>
                    <div className="text-xl font-black text-white">{seasonSummary.finalist.Team || seasonSummary.finalist.team}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {parseNumber(seasonSummary.finalist.RS_W)}–{parseNumber(seasonSummary.finalist.RS_L)} reg season
                      {' • '}
                      {parseNumber(seasonSummary.finalist.PO_W)}–{parseNumber(seasonSummary.finalist.PO_L)} playoffs
                    </div>
                  </div>
                )}

                {/* Grid de stats */}
                <div className="grid grid-cols-2 gap-3">
                  {seasonSummary.bestRecord && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🚀 Best Record</div>
                      <div className="text-lg font-black text-white">{seasonSummary.bestRecord.Team || seasonSummary.bestRecord.team}</div>
                      <span className="text-sm text-cyan-300">{parseNumber(seasonSummary.bestRecord.RS_W)}–{parseNumber(seasonSummary.bestRecord.RS_L)}</span>
                      <span className="mt-1 text-sm text-slate-400"> (reg season)</span>
                    </div>
                  )}
                  {seasonSummary.worstRecord && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💩 Worst Record</div>
                      <div className="text-lg font-black text-white">{seasonSummary.worstRecord.Team || seasonSummary.worstRecord.team}</div>
                      <span className="text-sm text-red-400">{parseNumber(seasonSummary.worstRecord.RS_W)}–{parseNumber(seasonSummary.worstRecord.RS_L)}</span>
                      <span className="mt-1 text-sm text-slate-400"> (reg season)</span>
                    </div>
                  )}
                  {seasonSummary.highestScorer && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💯 Top Scorer</div>
                      <div className="text-lg font-black text-white">{seasonSummary.highestScorer.Team || seasonSummary.highestScorer.team}</div>
                      <span className="text-sm text-cyan-300">{Math.round(parseNumber(seasonSummary.highestScorer.RS_PF))} pts</span>
                      <span className="mt-1 text-sm text-slate-400"> (reg season)</span>
                    </div>
                  )}
                  {seasonSummary.lowestScorer && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">😵‍💫 Lowest Scorer</div>
                      <div className="text-lg font-black text-white">{seasonSummary.lowestScorer.Team || seasonSummary.lowestScorer.team}</div>
                      <span className="text-sm text-red-400">{Math.round(parseNumber(seasonSummary.lowestScorer.RS_PF))} pts</span>
                      <span className="mt-1 text-sm text-slate-400"> (reg season)</span>
                    </div>
                  )}
                </div>

                {/* Unicórnio */}
                {seasonSummary.unicorn && seasonSummary.champion && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🦄 Unicórnio</div>
                    <div className="text-xl font-black text-white">{seasonSummary.unicorn.Team || seasonSummary.unicorn.team}</div>
                    <div className="text-sm text-slate-400">
                      {parseNumber(seasonSummary.unicorn.RS_W)}–{parseNumber(seasonSummary.unicorn.RS_L)} reg season
                    </div>
                  </div>
                )}

                {/* Jogos notáveis */}
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Notable Games</div>

                {seasonSummary.highestGame && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">🔥 Highest Score</div>
                    <div className="text-lg font-black text-white">{seasonSummary.highestGame.team}</div>
                    <div className="text-sm text-cyan-300">{seasonSummary.highestGame.score.toFixed(2)} pts</div>
                    <div className="text-xs text-slate-500">vs {seasonSummary.highestGame.opponent} · W{seasonSummary.highestGame.week}</div>
                  </div>
                )}

                {seasonSummary.closestGame && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">⚔️ Closest Game</div>
                    <div className="text-lg font-black text-white">{seasonSummary.closestGame.team}</div>
                    <div className="text-sm text-cyan-300">{seasonSummary.closestGame.score.toFixed(2)} vs {seasonSummary.closestGame.opp.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">vs {seasonSummary.closestGame.opponent} · W{seasonSummary.closestGame.week} · Margin: {seasonSummary.closestGame.margin.toFixed(2)}</div>
                  </div>
                )}

                {seasonSummary.biggestWin && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">💥 Biggest Win</div>
                    <div className="text-lg font-black text-white">{seasonSummary.biggestWin.team}</div>
                    <div className="text-sm text-cyan-300">{seasonSummary.biggestWin.score.toFixed(2)} vs {seasonSummary.biggestWin.opp.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">vs {seasonSummary.biggestWin.opponent} · W{seasonSummary.biggestWin.week} · Margin: {seasonSummary.biggestWin.margin.toFixed(2)}</div>
                  </div>
                )}

                {seasonSummary.lowestGame && (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">😬 Lowest Score</div>
                    <div className="text-lg font-black text-white">{seasonSummary.lowestGame.team}</div>
                    <div className="text-sm text-red-400">{seasonSummary.lowestGame.score.toFixed(2)} pts</div>
                    <div className="text-xs text-slate-500">vs {seasonSummary.lowestGame.opponent} · W{seasonSummary.lowestGame.week}</div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </>
    </main>
  )
}