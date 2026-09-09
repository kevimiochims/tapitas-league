'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Trophy, Activity, Target, Flame, TrendingUp, TrendingDown, Star, Swords, ChevronRight, Skull, Zap, Filter, Users } from 'lucide-react'
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

const NFL_TEAM_NAME_MAP = {
  'cardinals': 'ari', 'arizona': 'ari', 'arizona cardinals': 'ari',
  'falcons': 'atl', 'atlanta': 'atl', 'atlanta falcons': 'atl',
  'ravens': 'bal', 'baltimore': 'bal', 'baltimore ravens': 'bal',
  'bills': 'buf', 'buffalo': 'buf', 'buffalo bills': 'buf',
  'panthers': 'car', 'carolina': 'car', 'carolina panthers': 'car',
  'bears': 'chi', 'chicago': 'chi', 'chicago bears': 'chi',
  'bengals': 'cin', 'cincinnati': 'cin', 'cincinnati bengals': 'cin',
  'browns': 'cle', 'cleveland': 'cle', 'cleveland browns': 'cle',
  'cowboys': 'dal', 'dallas': 'dal', 'dallas cowboys': 'dal',
  'broncos': 'den', 'denver': 'den', 'denver broncos': 'den',
  'lions': 'det', 'detroit': 'det', 'detroit lions': 'det',
  'packers': 'gb', 'green bay': 'gb', 'green bay packers': 'gb',
  'texans': 'hou', 'houston': 'hou', 'houston texans': 'hou',
  'colts': 'ind', 'indianapolis': 'ind', 'indianapolis colts': 'ind',
  'jaguars': 'jax', 'jacksonville': 'jax', 'jacksonville jaguars': 'jax',
  'chiefs': 'kc', 'kansas city': 'kc', 'kansas city chiefs': 'kc',
  'chargers': 'lac', 'los angeles chargers': 'lac', 'la chargers': 'lac',
  'rams': 'lar', 'los angeles rams': 'lar', 'la rams': 'lar',
  'raiders': 'lv', 'las vegas': 'lv', 'las vegas raiders': 'lv', 'oakland': 'lv', 'oakland raiders': 'lv',
  'dolphins': 'mia', 'miami': 'mia', 'miami dolphins': 'mia',
  'vikings': 'min', 'minnesota': 'min', 'minnesota vikings': 'min',
  'patriots': 'ne', 'new england': 'ne', 'new england patriots': 'ne',
  'saints': 'no', 'new orleans': 'no', 'new orleans saints': 'no',
  'giants': 'nyg', 'new york giants': 'nyg', 'ny giants': 'nyg',
  'jets': 'nyj', 'new york jets': 'nyj', 'ny jets': 'nyj',
  'eagles': 'phi', 'philadelphia': 'phi', 'philadelphia eagles': 'phi',
  'steelers': 'pit', 'pittsburgh': 'pit', 'pittsburgh steelers': 'pit',
  'seahawks': 'sea', 'seattle': 'sea', 'seattle seahawks': 'sea',
  '49ers': 'sf', 'san francisco': 'sf', 'san francisco 49ers': 'sf',
  'buccaneers': 'tb', 'tampa bay': 'tb', 'tampa bay buccaneers': 'tb',
  'titans': 'ten', 'tennessee': 'ten', 'tennessee titans': 'ten',
  'commanders': 'wsh', 'washington': 'wsh', 'washington commanders': 'wsh',
  'redskins': 'wsh', 'washington redskins': 'wsh', 'football team': 'wsh',
}

function getNFLTeamLogo(name) {
  const raw = normalizePlayerKey(name)
    .replace(/\b(d\/st|dst|def|defense|special teams)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const mapped = NFL_TEAM_NAME_MAP[raw]
  return mapped ? `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png` : null
}

function normalizeTeamName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isTrueFlag(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['true', 'yes', 'sim', '1'].includes(normalized)
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

  if (img) return (
    <div className="flex-shrink-0" style={{ width: px, height: px }}>
      <img src={img} alt={name} className="w-full h-full object-contain" />
    </div>
  )
  return (
    <div className="flex-shrink-0 flex items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] font-black text-white"
      style={{ width: px, height: px, fontSize: px * 0.3 }}>
      {getInitials(name)}
    </div>
  )
}

// ── Player lookup (mirrors the pattern used on the Matchups page) ──────
function normalizePlayerKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function buildPlayerLookup(rows) {
  const map = new Map()
  rows.forEach(row => {
    const playerId = String(row?.player_id || '').trim()
    const abbreviated = String(row?.name || '').trim()
    const fullName = String(row?.full_name || '').trim()
    if (!playerId) return
    const entry = {
      playerId,
      abbreviated,
      fullName,
      position: String(row?.pos || row?.position || row?.Position || '').trim().toUpperCase(),
    }
      ;[abbreviated, fullName].filter(Boolean).forEach(value => {
        const baseKey = normalizePlayerKey(value)
        if (baseKey && !map.has(baseKey)) map.set(baseKey, entry)
      })
  })
  return map
}

function getPlayerId(name, playerLookup) {
  if (!playerLookup || !name) return null
  return playerLookup.get(normalizePlayerKey(name))?.playerId || null
}

function PlayerAvatar({ name, playerLookup, size = 56 }) {
  const [failed, setFailed] = useState(false)
  const playerId = getPlayerId(name, playerLookup)
  const defenseLogo = getNFLTeamLogo(name)
  const src = playerId && !failed ? `https://sleepercdn.com/content/nfl/players/${playerId}.jpg` : null
  const initials = String(name || '?').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex-shrink-0 overflow-hidden rounded-full border-2 border-[#0A0A0A] bg-[#F7F6F2]" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : defenseLogo ? (
        <img src={defenseLogo} alt={name} className="h-full w-full object-contain bg-white p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#16274F] font-black text-white" style={{ fontSize: size * 0.32 }}>
          {initials}
        </div>
      )}
    </div>
  )
}

// ── Extract a team's roster (starters or bench) from a GAME_FACTS_ALL row ──
function extractRosterNames(game, prefix, max = 13) {
  const names = []
  for (let i = 1; i <= max; i++) {
    const name = game?.[`${prefix}${i}_Name`]
    if (name && name !== '--empty--' && String(name).trim() !== '') {
      names.push(String(name).trim())
    }
  }
  return names
}

function extractPlayerAppearances(game, max = 13) {
  const appearances = []
  for (let i = 1; i <= max; i++) {
    const starterName = game?.[`S${i}_Name`]
    const starterPts = game?.[`S${i}_Pts`]
    if (starterName && starterName !== '--empty--' && String(starterName).trim() !== '') {
      appearances.push({ name: String(starterName).trim(), status: 'Starter', pts: parseNumber(starterPts) })
    }
    const benchName = game?.[`B${i}_Name`]
    const benchPts = game?.[`B${i}_Pts`]
    if (benchName && benchName !== '--empty--' && String(benchName).trim() !== '') {
      appearances.push({ name: String(benchName).trim(), status: 'Bench', pts: parseNumber(benchPts) })
    }
  }
  return appearances
}

function getDisplayPlayerName(name, playerLookup) {
  const raw = String(name || '').trim()
  // Defenses are teams, not individual players. Keep their football name intact
  // so the NFL logo mapping remains available and avoid showing names like "I. Colts".
  if (getNFLTeamLogo(raw)) return raw
  const data = playerLookup?.get(normalizePlayerKey(raw))
  return data?.abbreviated || data?.fullName && formatFallbackPlayerName(data.fullName) || formatFallbackPlayerName(raw)
}

function formatFallbackPlayerName(name) {
  const raw = String(name || '').trim()
  if (!raw) return raw
  if (/^[A-Za-z]\.\s/.test(raw)) return raw
  const parts = raw.split(/\s+/)
  if (parts.length < 2) return raw
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`
}

function getPlayerPosition(name, playerLookup) {
  const raw = String(name || '').trim()
  const data = playerLookup?.get(normalizePlayerKey(raw))
  const position = String(data?.position || data?.pos || '').trim().toUpperCase()
  if (position) return position
  return getNFLTeamLogo(raw) ? 'DEF' : ''
}

function getPositionBadgeClasses(position) {
  const colors = {
    QB: 'border-[#0A0A0A] bg-[#D01F2D] text-white',
    RB: 'border-[#0A0A0A] bg-[#1E8E3E] text-white',
    WR: 'border-[#0A0A0A] bg-[#16274F] text-white',
    TE: 'border-[#0A0A0A] bg-[#B8860B] text-white',
    FLEX: 'border-[#0A0A0A] bg-[#3F4757] text-white',
    K: 'border-[#0A0A0A] bg-[#6B7280] text-white',
    DEF: 'border-[#0A0A0A] bg-[#3F4757] text-white',
  }
  return colors[String(position || '').toUpperCase()] || 'border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#16274F]'
}

function getPlayerIdentity(name, playerLookup) {
  const raw = String(name || '').trim()
  const playerId = getPlayerId(raw, playerLookup)
  return playerId ? `id:${playerId}` : `name:${normalizePlayerKey(raw)}`
}

function canonicalMatchupHref(game, games) {
  if (!game) return '/matchups'
  const season = String(game?.Season || '').trim()
  const week = String(game?.Week || '').trim()
  const team = String(game?.Team || '').trim()
  const opp = String(game?.Opponent || '').trim()
  const canonical = Array.isArray(games) ? games.find(row => {
    if (String(row?.Season || '').trim() !== season || String(row?.Week || '').trim() !== week) return false
    const rowTeam = normalizeTeamName(row?.Team)
    const rowOpp = normalizeTeamName(row?.Opponent)
    return (rowTeam === normalizeTeamName(team) && rowOpp === normalizeTeamName(opp)) ||
      (rowTeam === normalizeTeamName(opp) && rowOpp === normalizeTeamName(team))
  }) : null
  const target = canonical || game
  return `/matchups?season=${encodeURIComponent(String(target?.Season || '').trim())}&week=${encodeURIComponent(String(target?.Week || '').trim())}&team=${encodeURIComponent(String(target?.Team || '').trim())}&opp=${encodeURIComponent(String(target?.Opponent || '').trim())}`
}

function HeaderFilter({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(p => !p)} className={`inline-flex items-center gap-1 uppercase tracking-[0.18em] hover:text-[#D01F2D] ${value !== 'All' ? 'text-[#D01F2D]' : ''}`}>
        {value === 'All' ? label : value}
        <span className="text-[9px] text-[#D01F2D]">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[150px] overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false) }} className={`block w-full px-3 py-2 text-left text-[10px] font-black uppercase hover:bg-[#F7F6F2] ${opt === value ? 'bg-[#FDEDEE] text-[#D01F2D]' : 'text-[#3F4757]'}`}>
                {opt === 'All' ? label : opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
        className={`flex w-full items-center justify-between gap-3 border-2 px-4 py-2.5 text-sm font-bold transition-all ${disabled ? 'cursor-not-allowed border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#6B7280]/50'
          : open ? 'border-[#D01F2D] bg-white text-[#16274F] tp-shadow-red-sm'
            : 'border-[#0A0A0A] bg-white text-[#16274F] hover:bg-[#F7F6F2]'
          }`}
      >
        <span className="truncate">{value === 'All' ? placeholder : value}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-[#6B7280] transition-transform duration-200 ${open ? 'rotate-90 text-[#D01F2D]' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
          <div className="max-h-56 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition-all hover:bg-[#F7F6F2] ${opt === value ? 'text-[#D01F2D] bg-[#FDEDEE]' : 'text-[#3F4757]'}`}
              >
                {opt === value && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D01F2D]" />}
                <span className={opt === value ? '' : 'ml-[14px]'}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeamsPage() {
  const [allTime, setAllTime] = useState([])
  const [history, setHistory] = useState([])
  const [historyRaw, setHistoryRaw] = useState([])
  const [h2hData, setH2hData] = useState([])
  const [games, setGames] = useState([])
  const [playerLookup, setPlayerLookup] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const gameLogRef = useRef(null)

  // ── Game Log filters ─────────────────────────────────────────────
  const [logSeason, setLogSeason] = useState('All')
  const [logOpponent, setLogOpponent] = useState('All')
  const [logGameType, setLogGameType] = useState('All')
  const [log200Only, setLog200Only] = useState(false)
  const [logHighestOnly, setLogHighestOnly] = useState(false)
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(null)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerPositionFilter, setPlayerPositionFilter] = useState('All')
  const [playerSort, setPlayerSort] = useState('Appearances')
  const [playerSeasonFilter, setPlayerSeasonFilter] = useState('All')
  const [playerMinApps, setPlayerMinApps] = useState('All')
  const [playerLogSort, setPlayerLogSort] = useState({ key: 'season', dir: 'desc' })
  const [playerLogOpponentFilter, setPlayerLogOpponentFilter] = useState('All')
  const [playerLogStatusFilter, setPlayerLogStatusFilter] = useState('All')
  const [playerLogResultFilter, setPlayerLogResultFilter] = useState('All')
  const [playerLogStageFilter, setPlayerLogStageFilter] = useState('All')

  useEffect(() => {
    setLogSeason('All')
    setLogOpponent('All')
    setLogGameType('All')
    setLog200Only(false)
    setLogHighestOnly(false)
    setSelectedPlayerKey(null)
    setPlayerSearch('')
    setPlayerPositionFilter('All')
    setPlayerSort('Appearances')
    setPlayerSeasonFilter('All')
    setPlayerMinApps('All')
    setPlayerLogSort({ key: 'season', dir: 'desc' })
    setPlayerLogOpponentFilter('All')
    setPlayerLogStatusFilter('All')
    setPlayerLogResultFilter('All')
    setPlayerLogStageFilter('All')
  }, [selected])

  // Force the page to the top after navigating between franchises from Historic.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const shouldResetScroll = params.get('scroll') === 'top' || sessionStorage.getItem('teams-scroll-top') === '1'
    if (!shouldResetScroll) return

    sessionStorage.removeItem('teams-scroll-top')
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
    const timer = setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    async function load() {
      const [at, hi, hr, h2h, ga, pc] = await Promise.all([
        safeFetch(`${BASE_URL}/TEAM_ALL_TIME`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_SORTED`),
        safeFetch(`${BASE_URL}/TEAM_HISTORY_RAW`),
        safeFetch(`${BASE_URL}/HEAD_TO_HEAD_SORTED`),
        safeFetch(`${BASE_URL}/GAME_FACTS_ALL`),
        safeFetch(`${BASE_URL}/_PLAYER_CACHE`),
      ])
      setAllTime(at)
      setHistory(hi)
      setHistoryRaw(hr)
      setH2hData(h2h)
      setGames(ga)
      setPlayerLookup(buildPlayerLookup(pc))
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

  const historySource = historyRaw.length ? historyRaw : history

  const getTeamHistory = (teamName) =>
    historySource
      .filter(r => normalizeTeamName(r?.Team) === normalizeTeamName(teamName))
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

  // Highest PF among all teams for a given Season+Week, Reg Season only.
  // The weekly-high record is intentionally RS-only because all franchises
  // are eligible during the regular season.
  const weeklyMaxPFRS = useMemo(() => {
    const map = {}
    games.forEach(g => {
      if (String(g?.GameStage || '').trim() !== 'Reg Season') return
      const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
      const pf = parseNumber(g?.PF)
      if (map[key] === undefined || pf > map[key]) map[key] = pf
    })
    return map
  }, [games])

  // Most rostered (started or benched) and most started player for a team, from GAME_FACTS_ALL
  const getMostRosteredPlayers = (teamName) => {
    const teamGames = games.filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(teamName) && !isDoubleWeek(g))
    const rosterCounts = new Map()
    const starterCounts = new Map()
    const metadata = new Map()

    // Use each team's actual game season instead of a global/selected season.
    teamGames.forEach(g => {
      const season = String(g?.Season || '').trim()
      const starters = extractRosterNames(g, 'S')
      const bench = extractRosterNames(g, 'B')
      ;[...starters, ...bench].forEach(name => {
        const identity = getPlayerIdentity(name, playerLookup)
        if (!identity) return
        if (!metadata.has(identity)) {
          metadata.set(identity, {
            rawName: String(name || '').trim(),
            name: getDisplayPlayerName(name, playerLookup),
            position: getPlayerPosition(name, playerLookup),
            seasons: new Set(),
          })
        }
        metadata.get(identity).seasons.add(season)
        rosterCounts.set(identity, (rosterCounts.get(identity) || 0) + 1)
      })
      starters.forEach(name => {
        const identity = getPlayerIdentity(name, playerLookup)
        if (identity) starterCounts.set(identity, (starterCounts.get(identity) || 0) + 1)
      })
    })

    const topRostered = Array.from(rosterCounts.entries()).sort((a, b) => b[1] - a[1])[0]
    const topStarter = Array.from(starterCounts.entries()).sort((a, b) => b[1] - a[1])[0]
    const build = entry => {
      if (!entry) return null
      const [identity, count] = entry
      const meta = metadata.get(identity)
      return meta ? {
        ...meta,
        count,
        seasons: Array.from(meta.seasons).filter(Boolean).sort((a, b) => Number(a) - Number(b)),
      } : null
    }

    return {
      mostRostered: build(topRostered),
      mostStarted: build(topStarter),
    }
  }


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
    games.filter(g =>
      normalizeTeamName(g?.Team) === normalizeTeamName(teamName) &&
      String(g?.GameStage || '').trim() === 'Reg Season' &&
      parseNumber(g?.['Power Ranking']) === 1
    ).length

  // Unicorn seasons for a given team (seasons where standing == max standing that season)
  const getTeamUnicornSeasons = (teamName) => {
    const teamH = getTeamHistory(teamName)
    return teamH.filter(r => {
      const seasonRows = historySource.filter(h => String(h.Season) === String(r.Season))
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
      const titlesArr = teamH.filter(r => isTrueFlag(r?.Champion))
      const finalsArr = teamH.filter(r => isTrueFlag(r?.Reached_Final))
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
  }, [allTime, history, historyRaw, games, teams])

  const allValuesFor = (key) => leagueStats ? Object.values(leagueStats).map(v => v[key]) : []

  if (selected) {
    const teamH = getTeamHistory(selected.team)
    const teamH2H = getTeamH2H(selected.team)
    const titles = teamH.filter(r => isTrueFlag(r?.Champion))
    const unicorns = teamH.filter(r => {
      const seasonRows = historySource.filter(
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

    const finalsTeamH = teamH.filter(r => isTrueFlag(r?.Reached_Final))
    const finalsRank = leagueStats ? getOrdinalRankLabel(finalsTeamH.length, allValuesFor('finals')) : null
    const finalsSub = finalsTeamH.length
      ? `${fmtYears(finalsTeamH)}${finalsRank === 'most all-time' ? ' (most all-time)' : ''}`
      : 'never'

    const poApps = parseNumber(selected['Playoff Apps']) || teamH.filter(r => isTrueFlag(r?.Made_Playoffs) || parseNumber(r?.PO_W) > 0 || parseNumber(r?.PO_L) > 0).length
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

    // ── Most Rostered / Most Started player ─────────────────────────
    const { mostRostered, mostStarted } = getMostRosteredPlayers(selected.team)

    // ── Game Log (individual games, filterable) ──────────────────────
    const teamGames = games
      .filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(selected.team))
      .sort((a, b) => {
        const sa = Number(a?.Season) || 0, sb = Number(b?.Season) || 0
        if (sb !== sa) return sb - sa
        return parseFloat(String(b?.Week || '0')) - parseFloat(String(a?.Week || '0'))
      })

    const logSeasonOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.Season || '').trim()).filter(Boolean))).sort((a, b) => b.localeCompare(a))]
    const logOpponentOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.Opponent || '').trim()).filter(Boolean))).sort()]
    // Filter by GameStage (column I in GAME_FACTS_ALL): Reg Season / Playoffs / Consolation.
    const logGameTypeOptions = ['All', ...Array.from(new Set(teamGames.map(g => String(g?.GameStage || '').trim()).filter(Boolean)))]

    const filteredLog = teamGames.filter(g => {
      if (logSeason !== 'All' && String(g?.Season || '').trim() !== logSeason) return false
      if (logOpponent !== 'All' && String(g?.Opponent || '').trim() !== logOpponent) return false
      const gameStage = String(g?.GameStage || '').trim()
      if (logGameType !== 'All' && gameStage !== logGameType) return false
      // 200+ filter: only single-week games; double weeks are excluded.
      if (log200Only && (isDoubleWeek(g) || parseNumber(g?.PF) < 200)) return false
      // Highest score of week (RS): Reg Season only, where every franchise is eligible.
      if (logHighestOnly) {
        if (gameStage !== 'Reg Season') return false
        const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
        if (parseNumber(g?.PF) !== weeklyMaxPFRS[key]) return false
      }
      return true
    })

    // ── Player Archive ───────────────────────────────────────────────
    // IMPORTANT: archive identity is the EXACT player name stored in
    // GAME_FACTS_ALL. Do NOT normalize/abbreviate this key and do NOT use
    // the player cache ID here. This prevents different players such as
    // "Javonte Williams" and "J. Williams" from being merged. The
    // abbreviation is presentation-only.
    // Player Archive follows the same eligibility used by Most Rostered:
    // double-weeks are excluded, because those are combined fantasy weeks.
    // IMPORTANT: the archive identity is the EXACT name stored in GAME_FACTS_ALL.
    // Never normalize, abbreviate or merge names before counting.
    const playerArchiveGames = teamGames.filter(g => !isDoubleWeek(g))
    const playerStatsMap = new Map()
    playerArchiveGames.forEach(g => {
      const season = String(g?.Season || '').trim()
      const week = String(g?.Week || '').trim()
      const seenExactNamesInGame = new Set()
      extractPlayerAppearances(g).forEach(app => {
        const rawName = String(app.name || '').trim()
        if (!rawName || getNFLTeamLogo(rawName) || seenExactNamesInGame.has(rawName)) return
        seenExactNamesInGame.add(rawName)

        // The raw GAME_FACTS_ALL name is the sole key. The player cache is
        // used only afterwards for presentation metadata (photo/position/name).
        const key = `raw:${rawName}`
        if (!playerStatsMap.has(key)) {
          playerStatsMap.set(key, {
            archiveKey: key,
            name: getDisplayPlayerName(rawName, playerLookup),
            rawName,
            position: getPlayerPosition(rawName, playerLookup),
            appearances: 0,
            starts: 0,
            bench: 0,
            totalPts: 0,
            bestPts: 0,
            seasons: new Set(),
            first: null,
            last: null,
          })
        }
        const entry = playerStatsMap.get(key)
        entry.seasons.add(season)
        entry.appearances += 1
        if (app.status === 'Starter') entry.starts += 1
        else entry.bench += 1
        entry.totalPts += app.pts
        entry.bestPts = Math.max(entry.bestPts, app.pts)
        const marker = {
          season: Number(season) || 0,
          week: parseFloat(week.replace(/[^0-9.]/g, '')) || 0,
        }
        if (!entry.first || marker.season < entry.first.season || (marker.season === entry.first.season && marker.week < entry.first.week)) entry.first = marker
        if (!entry.last || marker.season > entry.last.season || (marker.season === entry.last.season && marker.week > entry.last.week)) entry.last = marker
      })
    })

    const playerArchive = Array.from(playerStatsMap.values())
      .filter(p => p.position !== 'DEF')
      .map(p => ({ ...p, avgPts: p.appearances ? p.totalPts / p.appearances : 0 }))
      .sort((a, b) => b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))

    const playerPositionOptions = ['All', ...Array.from(new Set(playerArchive.map(p => p.position).filter(Boolean))).sort()]
    const playerSeasonOptions = ['All', ...Array.from(new Set(playerArchive.flatMap(p => Array.from(p.seasons)).filter(Boolean))).sort((a, b) => Number(b) - Number(a))]
    const playerMinAppOptions = ['All', ...[10, 20, 30].filter(n => playerArchive.some(p => p.appearances > n)).map(n => `>${n} appearances`)]

    const filteredPlayers = playerArchive
      .filter(p => normalizePlayerKey(p.name).includes(normalizePlayerKey(playerSearch)))
      .filter(p => playerPositionFilter === 'All' || p.position === playerPositionFilter)
      .filter(p => playerSeasonFilter === 'All' || p.seasons.has(playerSeasonFilter))
      .filter(p => playerMinApps === 'All' || p.appearances > Number(String(playerMinApps).replace(/[^0-9]/g, '')))
      .sort((a, b) => {
        if (playerSort === 'Starts') return b.starts - a.starts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Benchs') return b.bench - a.bench || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Average Points') return b.avgPts - a.avgPts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        if (playerSort === 'Highest Score') return b.bestPts - a.bestPts || b.appearances - a.appearances || a.name.localeCompare(b.name)
        return b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name)
      })

    const selectedPlayer = selectedPlayerKey
      ? playerArchive.find(p => p.archiveKey === selectedPlayerKey) || null
      : null

    const selectedPlayerGames = selectedPlayer
      ? playerArchiveGames.flatMap(g => {
          const appearance = extractPlayerAppearances(g).find(a => {
            const rawName = String(a?.name || '').trim()
            return `raw:${rawName}` === selectedPlayer.archiveKey
          })
          if (!appearance) return []
          return [{
            season: String(g?.Season || '').trim(),
            week: String(g?.Week || '').trim(),
            opponent: String(g?.Opponent || '').trim(),
            status: appearance.status,
            pts: appearance.pts,
            position: getPlayerPosition(appearance.name, playerLookup),
            matchupHref: canonicalMatchupHref(g, games),
            teamPF: parseNumber(g?.PF),
            result: String(g?.Result || '').trim().toUpperCase(),
            gameStage: String(g?.GameStage || '').trim(),
          }]
        }).sort((a, b) => {
          const sa = Number(a.season) || 0, sb = Number(b.season) || 0
          if (sb !== sa) return sb - sa
          return (parseFloat(b.week.replace(/[^0-9.]/g, '')) || 0) - (parseFloat(a.week.replace(/[^0-9.]/g, '')) || 0)
        })
      : []

    const playerLogOpponentOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.opponent).filter(Boolean))).sort()]
    const playerLogStatusOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.status).filter(Boolean))).sort()]
    const playerLogResultOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.result).filter(Boolean))).sort()]
    const playerLogStageOptions = ['All', ...Array.from(new Set(selectedPlayerGames.map(g => g.gameStage).filter(Boolean))).sort()]

    const filteredSelectedPlayerGames = selectedPlayerGames
      .filter(g => playerLogOpponentFilter === 'All' || g.opponent === playerLogOpponentFilter)
      .filter(g => playerLogStatusFilter === 'All' || g.status === playerLogStatusFilter)
      .filter(g => playerLogResultFilter === 'All' || g.result === playerLogResultFilter)
      .filter(g => playerLogStageFilter === 'All' || g.gameStage === playerLogStageFilter)

    const sortedSelectedPlayerGames = [...filteredSelectedPlayerGames].sort((a, b) => {
      const direction = playerLogSort.dir === 'asc' ? 1 : -1
      const getSortValue = (row) => {
        switch (playerLogSort.key) {
          case 'week': return parseFloat(String(row.week || '').replace(/[^0-9.]/g, '')) || 0
          case 'pts': return row.pts || 0
          case 'teamPF': return row.teamPF || 0
          case 'season':
          default: return Number(row.season) || 0
        }
      }
      const av = getSortValue(a)
      const bv = getSortValue(b)
      if (av !== bv) return (av - bv) * direction
      return `${a.season}-${a.week}-${a.opponent}`.localeCompare(`${b.season}-${b.week}-${b.opponent}`)
    })

    const handlePlayerLogSort = (key) => {
      setPlayerLogSort(current => ({
        key,
        dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc',
      }))
    }

    // Historic clubs: scan the COMPLETE GAME_FACTS_ALL dataset using the
    // player's exact raw name as identity. This intentionally does not use
    // normalized/abbreviated names, so different players with the same
    // display abbreviation are never merged.
    const selectedPlayerClubs = selectedPlayer
      ? Array.from(new Map(
          games
            .filter(g => extractPlayerAppearances(g).some(a => {
              const rawName = String(a?.name || '').trim()
              return `raw:${rawName}` === selectedPlayer.archiveKey
            }))
            .map(g => {
              const teamName = String(g?.Team || '').trim()
              return [teamName, null]
            })
        ).keys())
          .filter(Boolean)
          .map(teamName => ({
            team: teamName,
            seasons: Array.from(new Set(
              games
                .filter(g => normalizeTeamName(g?.Team) === normalizeTeamName(teamName))
                .filter(g => extractPlayerAppearances(g).some(a => {
                  const rawName = String(a?.name || '').trim()
                  return `raw:${rawName}` === selectedPlayer.archiveKey
                }))
                .map(g => String(g?.Season || '').trim())
                .filter(Boolean)
            )).sort((a, b) => Number(a) - Number(b)),
          }))
          .sort((a, b) => {
            const selectedKey = normalizeTeamName(selected.team)
            return normalizeTeamName(a.team) === selectedKey ? -1 : normalizeTeamName(b.team) === selectedKey ? 1 : normalizeTeamName(a.team).localeCompare(normalizeTeamName(b.team))
          })
      : []


    return (
      <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
          .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
          .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
          .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
        `}</style>

        <Header />


        <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">
          <button onClick={() => setSelected(null)}
            className="mb-8 border-2 border-[#0A0A0A] bg-white px-4 py-2 text-sm font-bold text-[#3F4757] hover:bg-[#F7F6F2] transition-all">
            ← All Teams
          </button>

          {/* Team Hero */}
          <div className="relative mb-8 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy" style={{ minHeight: '260px' }}>
            <div className="absolute inset-0 overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 900 260" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <g opacity="0.06">
                  {[400, 475, 550, 625, 700, 775].map((x, i) => (
                    <rect key={i} x={x} y="-60" width={i % 2 === 0 ? 50 : 20} height="400" fill="#16274F" transform={`rotate(-18 ${x + 25} 130)`} />
                  ))}
                </g>
                <g opacity="0.08" fill="none" stroke="#16274F" strokeWidth="1">
                  {[25, 45, 65].map(r => <circle key={r} cx="850" cy="50" r={r} />)}
                </g>
              </svg>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #F7F6F2 30%, rgba(247,246,242,0.85) 55%, rgba(247,246,242,0.2) 100%)' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-5 p-6 sm:p-8 md:flex-row md:items-center md:gap-8 md:p-14">
              <div className="flex-shrink-0">
                <TeamAvatar name={selected.team} size="xl" />
              </div>
              <div className="w-full min-w-0 text-center md:text-left">
                <div className="mt-3 mb-3 flex flex-wrap justify-center gap-2 md:justify-start">
                  {titles.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 border-2 border-[#0A0A0A] bg-[#F5C518] px-3 py-1.5">
                      <Trophy className="h-3.5 w-3.5 text-[#0A0A0A]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]">
                        {titles.length}X Champion — {titles.map(t => t.Season).join(', ')}
                      </span>
                    </div>
                  )}

                  {unicorns.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 border-2 border-[#0A0A0A] bg-white px-3 py-1.5">
                      <span className="text-[11px]">🦄</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#D01F2D]">
                        {unicorns.length}X Unicorn — {unicorns.map(u => u.Season).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <h1 className="mb-2 leading-none font-black text-[#16274F]"
                  style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(36px, 6vw, 80px)' }}>
                  {selected.team}
                </h1>
                <div className="flex flex-wrap justify-center gap-4 text-sm font-bold text-[#3F4757] md:justify-start">
                  <span>{parseNumber(selected.W)}W – {parseNumber(selected.L)}L</span>
                  <span>·</span>
                  <span>{winPct} win rate</span>
                  <span>·</span>
                  <span>{new Set(teamH.map(r => String(r?.Season || '').trim()).filter(Boolean)).size} seasons</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              [Trophy, 'Titles', titles.length, titlesSub, 'gold'],
              [Star, 'Finals Apps', finalsTeamH.length, finalsSub, 'navy'],
              [Activity, 'Playoff Apps', poApps, poAppsSub, 'navy'],
              [TrendingUp, 'Playoff Wins', poWins, poWinsSub, 'green'],
              [Target, 'RS Wins', parseNumber(selected.RS_W), rsWinsRank || 'regular season', 'green'],
              [TrendingDown, 'RS Losses', parseNumber(selected.RS_L), rsLossesRank || 'regular season', 'red'],
              [Flame, 'Total Points', Math.round(parseNumber(selected.PF)).toLocaleString(), totalPointsRank || 'all-time', 'navy'],
              [Skull, 'Unicorns', unicorns.length, unicornsSub, 'red'],
              [Zap, '200+ Pt Games', games200, games200Rank || 'single weeks only', 'gold'],
              [TrendingUp, 'Weeks at #1 (PR)', pr1Weeks, pr1Rank || 'power rankings', 'gold'],
            ].map(([Icon, label, value, sub, accent]) => {
              const colors = {
                gold: { text: 'text-[#B8860B]', iconBg: 'bg-[#F5C518] text-[#0A0A0A]' },
                navy: { text: 'text-[#16274F]', iconBg: 'bg-[#16274F] text-white' },
                green: { text: 'text-[#1E8E3E]', iconBg: 'bg-[#1E8E3E] text-white' },
                red: { text: 'text-[#D01F2D]', iconBg: 'bg-[#D01F2D] text-white' },
              }
              const c = colors[accent]
              return (
                <div key={label} className="border-2 border-[#0A0A0A] bg-white p-4 tp-shadow-navy-sm">
                  <div className={`mb-3 flex h-8 w-8 items-center justify-center border-2 border-[#0A0A0A] ${c.iconBg}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={`mb-1 text-[9px] font-black uppercase tracking-[0.2em] ${c.text}`}>{label}</div>
                  <div className={`font-black leading-none ${c.text}`} style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(24px, 3vw, 40px)' }}>
                    {value}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-[#6B7280]">{sub}</div>
                </div>
              )
            })}

            {/* Player record cards stay in the same stats sequence */}
            {mostRostered && (
              <div className="relative overflow-hidden border-2 border-[#0A0A0A] bg-white p-4 tp-shadow-navy-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_68px] gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_96px]">
                  <div className="min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F] text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#16274F]">Most Rostered</div>
                      <div className="font-black leading-none text-[#16274F]" style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(34px, 4vw, 48px)' }}>{mostRostered.count}</div>
                    </div>
                  </div>
                  <div className="flex h-full min-h-[68px] items-start justify-end sm:min-h-[96px]">
                    <PlayerAvatar name={mostRostered.rawName} playerLookup={playerLookup} size={68} />
                  </div>
                  <div className="col-span-2 min-w-0 border-t-2 border-[#0A0A0A]/10 pt-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="min-w-0 truncate text-sm font-black text-[#16274F]">{mostRostered.name}</div>
                      {mostRostered.position && <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${getPositionBadgeClasses(mostRostered.position)}`}>{mostRostered.position}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mostStarted && (
              <div className="relative overflow-hidden border-2 border-[#0A0A0A] bg-white p-4 tp-shadow-navy-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_68px] gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_96px]">
                  <div className="min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center border-2 border-[#0A0A0A] bg-[#1E8E3E] text-white">
                      <Star className="h-4 w-4" />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#1E8E3E]">Most Started</div>
                      <div className="font-black leading-none text-[#1E8E3E]" style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(34px, 4vw, 48px)' }}>{mostStarted.count}</div>
                    </div>
                  </div>
                  <div className="flex h-full min-h-[68px] items-start justify-end sm:min-h-[96px]">
                    <PlayerAvatar name={mostStarted.rawName} playerLookup={playerLookup} size={68} />
                  </div>
                  <div className="col-span-2 min-w-0 border-t-2 border-[#0A0A0A]/10 pt-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div className="min-w-0 truncate text-sm font-black text-[#16274F]">{mostStarted.name}</div>
                      {mostStarted.position && <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${getPositionBadgeClasses(mostStarted.position)}`}>{mostStarted.position}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Season History */}
            <div className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
              <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F]">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-[#16274F]">Season History</div>
                  <div className="text-sm text-[#6B7280]">{new Set(teamH.map(r => String(r?.Season || '').trim()).filter(Boolean)).size} seasons</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#0A0A0A]/10">
                      {['Season', 'Reg Season', 'Overall', 'PF', 'Playoffs', 'Result'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamH.map((r, i) => {
                      const isChamp = isTrueFlag(r?.Champion)
                      const isFinal = isTrueFlag(r?.Reached_Final)
                      const isPlayoff = String(r?.Made_Playoffs || '').toUpperCase() === 'TRUE'
                      const seasonRows = historySource.filter(
                        h => String(h.Season) === String(r.Season)
                      )

                      const maxStanding = Math.max(
                        ...seasonRows.map(s => Number(s.Standing) || 0)
                      )

                      const isUnicorn = Number(r.Standing) === maxStanding
                      return (
                        <tr
                          key={i}
                          onClick={() => {
                            setLogSeason(String(r.Season))
                            setLogOpponent('All')
                            setLogGameType('All')
                            setLog200Only(false)
                            setLogHighestOnly(false)
                            gameLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className={`cursor-pointer border-b border-[#0A0A0A]/8 transition-colors hover:bg-[#F7F6F2] ${isChamp ? 'bg-[#FFF9E5]' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm font-black text-[#16274F] whitespace-nowrap">{r.Season}</td>
                          <td className="px-4 py-3 text-sm text-[#3F4757] whitespace-nowrap">{parseNumber(r.RS_W)}–{parseNumber(r.RS_L)}</td>
                          <td className="px-4 py-3 text-sm text-[#3F4757] whitespace-nowrap">{parseNumber(r.W)}–{parseNumber(r.L)}</td>
                          <td className="px-4 py-3 text-sm text-[#3F4757] whitespace-nowrap">{Math.round(parseNumber(r.RS_PF))}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isChamp ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-[#0A0A0A] border-2 border-[#0A0A0A] bg-[#F5C518] px-2 py-0.5">🏆 Champion</span>
                              : isUnicorn ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-[#D01F2D] border-2 border-[#0A0A0A] bg-white px-2 py-0.5">🦄 Unicorn</span>
                                : isFinal ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-white border-2 border-[#0A0A0A] bg-[#16274F] px-2 py-0.5">Final</span>
                                  : isPlayoff ? <span className="inline-block whitespace-nowrap text-[9px] font-black text-[#16274F] border-2 border-[#0A0A0A]/20 bg-[#F7F6F2] px-2 py-0.5">Playoffs</span>
                                    : <span className="text-[9px] text-[#6B7280]">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {parseNumber(r.Standing) > 0 && (
                              <span className="text-xs font-black text-[#6B7280]">#{parseNumber(r.Standing)}</span>
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
            <div className="overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
              <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F]">
                  <Swords className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-[#16274F]">Head to Head</div>
                  <div className="text-sm text-[#6B7280]">vs all franchises</div>
                </div>
              </div>
              <div className="divide-y-2 divide-[#0A0A0A]/8">
                {teamH2H.map((h, i) => {
                  const total = h.wins + h.losses
                  const pct = total > 0 ? Math.round((h.wins / total) * 100) : 0
                  const ahead = h.wins > h.losses
                  const tied = h.wins === h.losses
                  return (
                    <a
                      key={i}
                      href={`/rivalries?teamA=${encodeURIComponent(selected.team)}&teamB=${encodeURIComponent(h.opponent)}`}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#F7F6F2]"
                    >
                      <TeamAvatar name={h.opponent} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-[#16274F] truncate">{h.opponent}</div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{h.games} games · {h.streak}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-black ${ahead ? 'text-[#1E8E3E]' : tied ? 'text-[#6B7280]' : 'text-[#D01F2D]'}`}>
                          {h.wins}–{h.losses}
                        </div>
                        <div className="text-[10px] text-[#6B7280]">{pct}%</div>
                      </div>
                      <div className="flex w-7 flex-shrink-0 justify-end"><ChevronRight className="h-4 w-4 text-[#6B7280]" /></div>
                    </a>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Game Log */}
          <div ref={gameLogRef} className="mb-6 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm scroll-mt-6">
            <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F]">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.25em] text-[#16274F]">Game Log</div>
                <div className="text-sm text-[#6B7280]">{filteredLog.length} of {teamGames.length} games</div>
              </div>
            </div>

            {/* Filters */}
            <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Select value={logSeason} onChange={setLogSeason} options={logSeasonOptions} placeholder="Season" />
                <Select value={logOpponent} onChange={setLogOpponent} options={logOpponentOptions} placeholder="Opponent" />
                <Select value={logGameType} onChange={setLogGameType} options={logGameTypeOptions} placeholder="Game Type" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setLog200Only(p => !p)}
                  className={`border-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${log200Only
                    ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                    : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                    }`}
                >
                  200+ pts only
                </button>
                <button
                  onClick={() => setLogHighestOnly(p => !p)}
                  className={`border-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${logHighestOnly
                    ? 'border-[#0A0A0A] bg-[#D01F2D] text-white'
                    : 'border-[#0A0A0A] bg-white text-[#3F4757] hover:bg-[#F7F6F2]'
                    }`}
                >
                  Highest score of week (RS)
                </button>
                {(logSeason !== 'All' || logOpponent !== 'All' || logGameType !== 'All' || log200Only || logHighestOnly) && (
                  <button
                    onClick={() => {
                      setLogSeason('All'); setLogOpponent('All'); setLogGameType('All')
                      setLog200Only(false); setLogHighestOnly(false)
                    }}
                    className="border-2 border-[#0A0A0A]/20 bg-[#F7F6F2] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#6B7280] transition-all hover:bg-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Games list */}
            <div className="max-h-[520px] overflow-auto">
              <div className="grid w-max min-w-full grid-cols-[58px_32px_max-content_auto] divide-y-2 divide-[#0A0A0A]/8 sm:grid-cols-[80px_40px_minmax(0,1fr)_auto]">
              {filteredLog.map((g, i) => {
                const won = String(g?.Result || '').trim().toUpperCase() === 'W'
                const pf = parseNumber(g?.PF)
                const pa = parseNumber(g?.PA)
                const gType = String(g?.GameStage || '').trim()
                const key = `${String(g?.Season || '').trim()}|${String(g?.Week || '').trim()}`
                const isWeekHigh = gType === 'Reg Season' && pf > 0 && pf === weeklyMaxPFRS[key]

                // Matchups deduplicates mirrored rows and selects the first row it
                // encounters for a given Season + Week + Team/Opponent pair.
                // Use that same canonical row in the URL so the matchup opens selected.
                const canonicalMatchup = games.find(row => {
                  const sameSeason = String(row?.Season || '').trim() === String(g?.Season || '').trim()
                  const sameWeek = String(row?.Week || '').trim() === String(g?.Week || '').trim()
                  if (!sameSeason || !sameWeek) return false
                  const rowTeam = normalizeTeamName(row?.Team)
                  const rowOpp = normalizeTeamName(row?.Opponent)
                  const selectedTeam = normalizeTeamName(selected.team)
                  const opponent = normalizeTeamName(g?.Opponent)
                  return (rowTeam === selectedTeam && rowOpp === opponent) ||
                    (rowTeam === opponent && rowOpp === selectedTeam)
                }) || g
                const matchupHref = `/matchups?season=${encodeURIComponent(String(canonicalMatchup?.Season || '').trim())}&week=${encodeURIComponent(String(canonicalMatchup?.Week || '').trim())}&team=${encodeURIComponent(String(canonicalMatchup?.Team || '').trim())}&opp=${encodeURIComponent(String(canonicalMatchup?.Opponent || '').trim())}`

                return (
                  <a
                    key={i}
                    href={matchupHref}
                    className="col-span-4 grid min-w-max grid-cols-subgrid items-center gap-2 px-3 py-3.5 transition-colors hover:bg-[#F7F6F2] sm:min-w-0 sm:w-full sm:gap-3 sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-[#16274F]">{g.Season}</div>
                      <div className="text-[10px] font-bold text-[#6B7280]">Week {g.Week}</div>
                    </div>

                    <div className="ml-3 flex items-center justify-center">
                      <TeamAvatar name={g.Opponent} size="sm" />
                    </div>

                    <div className="ml-3 min-w-0 w-max sm:w-auto">
                      <div className="whitespace-nowrap text-sm font-black text-[#16274F]">vs {g.Opponent}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {gType !== 'Reg Season' && (
                          <span className="inline-block border border-[#0A0A0A]/20 bg-[#F7F6F2] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#6B7280]">
                            {gType}
                          </span>
                        )}
                        {pf >= 200 && (
                          <span className="inline-block border border-[#0A0A0A] bg-[#F5C518] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#0A0A0A]">
                            200+
                          </span>
                        )}
                        {isWeekHigh && (
                          <span className="inline-block border border-[#0A0A0A] bg-[#16274F] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                            Week High
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-auto flex min-w-max items-center justify-end gap-1 sm:gap-1">
                      <div className={`text-sm font-black whitespace-nowrap ${won ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>
                        {won ? 'W' : 'L'} {pf.toFixed(1)}–{pa.toFixed(1)}
                      </div>
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-end">
                        <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                      </div>
                    </div>
                  </a>
                )
              })}
              </div>

              {filteredLog.length === 0 && (
                <div className="py-10 text-center text-sm font-bold text-[#6B7280]">
                  No games match these filters
                </div>
              )}
            </div>
          </div>


          {/* Player Archive */}
          <div className="mb-6 overflow-hidden border-2 border-[#0A0A0A] bg-white tp-shadow-navy-sm">
            <div className="border-b-2 border-[#0A0A0A]/10 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border-2 border-[#0A0A0A] bg-[#16274F]">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-[#16274F]">Player Archive</div>
                  <div className="text-sm text-[#6B7280]">{playerArchive.length} players who wore the jersey</div>
                </div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:items-center">
                <div className="w-full lg:w-32">
                  <Select value={playerPositionFilter} onChange={setPlayerPositionFilter} options={playerPositionOptions} placeholder="Position" />
                </div>
                <div className="w-full lg:w-40">
                  <Select value={playerSort} onChange={setPlayerSort} options={['Appearances', 'Starts', 'Benchs', 'Average Points', 'Highest Score']} placeholder="Sort by" />
                </div>
                <div className="w-full lg:w-32">
                  <Select value={playerSeasonFilter} onChange={setPlayerSeasonFilter} options={playerSeasonOptions} placeholder="Season" />
                </div>
                <div className="w-full lg:w-32">
                  <Select value={playerMinApps} onChange={setPlayerMinApps} options={playerMinAppOptions} placeholder="Appearances" />
                </div>
                <div className="w-full lg:w-64">
                  <input
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    placeholder="Search player..."
                    className="w-full border-2 border-[#0A0A0A] bg-[#F7F6F2] px-4 py-2.5 text-sm font-bold text-[#16274F] outline-none placeholder:text-[#9CA3AF] focus:border-[#D01F2D]"
                  />
                </div>
              </div>
            </div>
            <div className="max-h-[720px] overflow-y-auto grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPlayers.map(player => (
                <button
                  key={player.archiveKey}
                  onClick={() => setSelectedPlayerKey(player.archiveKey)}
                  className="group relative overflow-hidden border-2 border-[#0A0A0A] bg-[#F7F6F2] p-4 text-left transition-colors hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={player.rawName} playerLookup={playerLookup} size={54} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="truncate text-sm font-black text-[#16274F] group-hover:text-[#D01F2D]">{player.name}</div>
                        {player.position && <span className={`inline-flex flex-shrink-0 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${getPositionBadgeClasses(player.position)}`}>{player.position}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-bold text-[#6B7280]">
                        <span>{player.appearances} apps</span>
                        <span>·</span>
                        <span>{player.starts} starts</span>
                        <span>·</span>
                        <span>{player.bench} bench</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#6B7280] transition-transform group-hover:translate-x-1 group-hover:text-[#D01F2D]" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#0A0A0A]/10 pt-3">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Avg Pts</div>
                      <div className="mt-0.5 text-sm font-black text-[#16274F]">{player.avgPts.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Best</div>
                      <div className="mt-0.5 text-sm font-black text-[#16274F]">{player.bestPts.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">Seasons</div>
                      <div className="mt-0.5 truncate text-sm font-black text-[#16274F]">{player.seasons.size ? Array.from(player.seasons).sort((a,b) => Number(a)-Number(b)).map(y => `'${String(y).slice(-2)}`).join(', ') : '—'}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="col-span-full py-10 text-center text-sm font-bold text-[#6B7280]">No players found</div>
              )}
            </div>
          </div>

          {/* Player detail */}
          {selectedPlayer && (
            <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#0A0A0A]/55 p-3 pt-4 sm:items-center sm:p-6" onClick={() => setSelectedPlayerKey(null)}>
              <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden border-2 border-[#0A0A0A] bg-white shadow-[6px_6px_0_#16274F]" onClick={e => e.stopPropagation()}>
                <div className="border-b-2 border-[#0A0A0A]/10 p-4 sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D01F2D] sm:text-xs">Player Profile</div>
                    <button onClick={() => setSelectedPlayerKey(null)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center border-2 border-[#0A0A0A] text-xl font-black text-[#16274F] hover:bg-[#F7F6F2]" aria-label="Close player profile">×</button>
                  </div>
                  <div className="flex min-w-0 items-start gap-4">
                    <PlayerAvatar name={selectedPlayer.rawName} playerLookup={playerLookup} size={72} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2 text-2xl font-black text-[#16274F] sm:text-3xl">
                        <span className="truncate">{selectedPlayer.rawName}</span>
                        {selectedPlayer.position && <span className={`inline-flex flex-shrink-0 px-2 py-1 align-middle text-[9px] font-black uppercase tracking-wide ${getPositionBadgeClasses(selectedPlayer.position)}`}>{selectedPlayer.position}</span>}
                      </div>
                      {selectedPlayerClubs.filter(c => normalizeTeamName(c.team) !== normalizeTeamName(selected.team)).length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#16274F]">Historic:</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPlayerClubs.filter(c => normalizeTeamName(c.team) !== normalizeTeamName(selected.team)).map(c => (
                              <a key={`${normalizeTeamName(c.team)}|${c.seasons.join('-')}`} href={`/teams?team=${encodeURIComponent(c.team)}&scroll=top`} onClick={() => { sessionStorage.setItem('teams-scroll-top', '1') }} className="inline-flex items-center gap-1 border-2 border-[#0A0A0A]/15 bg-[#F7F6F2] px-2 py-1 text-[10px] font-black text-[#16274F] hover:border-[#D01F2D] hover:text-[#D01F2D]">
                                {c.team} · {c.seasons.map(y => `'${String(y).slice(-2)}`).join(', ')}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-b-2 border-[#0A0A0A]/10 bg-white p-3 sm:p-4">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[
                    ['Apps', selectedPlayer.appearances, 'border-[#16274F] bg-[#F3F7FF] text-[#16274F]'],
                    ['Starts', selectedPlayer.starts, 'border-[#1E8E3E] bg-[#F4FAF5] text-[#1E8E3E]'],
                    ['Bench', selectedPlayer.bench, 'border-[#D97706] bg-[#FFF7ED] text-[#D97706]'],
                    ['Avg Pts', selectedPlayer.avgPts.toFixed(2), 'border-[#7C3AED] bg-[#F5F3FF] text-[#7C3AED]'],
                    ['Best Pts', selectedPlayer.bestPts.toFixed(2), 'border-[#F5C518] bg-[#FFF9E5] text-[#16274F]'],
                    ['Seasons', selectedPlayer.seasons.size ? Array.from(selectedPlayer.seasons).sort((a,b) => Number(a)-Number(b)).map(y => `'${String(y).slice(-2)}`).join(', ') : '—', 'border-[#D01F2D] bg-[#FFF3F4] text-[#D01F2D]'],
                  ].map(([label, value, tone]) => (
                    <div key={label} className={`border-2 p-3 ${tone}`}>
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">{label}</div>
                      <div className="mt-1 text-xl font-black" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>{value}</div>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="max-h-[55vh] overflow-auto">
                  <table className="min-w-[760px] w-full">
                    <thead className="sticky top-0 z-10 bg-[#F7F6F2]">
                      <tr className="border-b-2 border-[#0A0A0A]/10">
                        {['Season', 'Week', 'Opponent', 'Status', 'Player Pts', 'Team PF', 'Result', 'Stage'].map((h, i) => (
                          <th key={h} className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-[0.18em] text-[#6B7280] whitespace-nowrap">
                            {h === 'Opponent' ? (
                              <HeaderFilter value={playerLogOpponentFilter} onChange={setPlayerLogOpponentFilter} options={playerLogOpponentOptions} label="Opponent" />
                            ) : h === 'Status' ? (
                              <HeaderFilter value={playerLogStatusFilter} onChange={setPlayerLogStatusFilter} options={playerLogStatusOptions} label="Status" />
                            ) : h === 'Result' ? (
                              <HeaderFilter value={playerLogResultFilter} onChange={setPlayerLogResultFilter} options={playerLogResultOptions} label="Result" />
                            ) : h === 'Stage' ? (
                              <HeaderFilter value={playerLogStageFilter} onChange={setPlayerLogStageFilter} options={playerLogStageOptions} label="Stage" />
                            ) : (
                              <button type="button" onClick={() => handlePlayerLogSort(['season','week','','','pts','teamPF'][i])} className="inline-flex items-center gap-1 hover:text-[#D01F2D]">
                                {h}
                                <span className="text-[9px] text-[#D01F2D]">{playerLogSort.key === ['season','week','','','pts','teamPF'][i] ? (playerLogSort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                              </button>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSelectedPlayerGames.map((g, i) => (
                        <tr key={`${g.season}-${g.week}-${g.opponent}-${i}`} onClick={() => { window.location.href = g.matchupHref }} className="cursor-pointer border-b border-[#0A0A0A]/8 hover:bg-[#F7F6F2]">
                          <td className="px-4 py-3 text-xs font-black text-[#16274F]">{g.season}</td>
                          <td className="px-4 py-3 text-xs font-bold text-[#3F4757]">{g.week}</td>
                          <td className="px-4 py-3 text-xs font-black text-[#16274F]">{g.opponent}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${g.status === 'Starter' ? 'border-[#1E8E3E] bg-[#F4FAF5] text-[#1E8E3E]' : 'border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#6B7280]'}`}>{g.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-[#16274F]">{g.pts.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-[#3F4757]">{g.teamPF.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-xs font-black ${g.result === 'W' ? 'text-[#1E8E3E]' : 'text-[#D01F2D]'}`}>{g.result || '—'}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-[#6B7280]">{g.gameStage || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Best/Worst Season */}
          {(bestSeason || worstSeason) && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bestSeason && (
                <div className="border-2 border-[#0A0A0A] bg-white p-5 tp-shadow-navy-sm">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#1E8E3E]">🏅 Best Season</div>
                  <div className="text-3xl font-black text-[#16274F]" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                    {parseNumber(bestSeason.RS_W)}–{parseNumber(bestSeason.RS_L)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#6B7280]">{bestSeason.Season} · {Math.round(parseNumber(bestSeason.RS_PF))} pts</div>
                </div>
              )}
              {worstSeason && (
                <div className="border-2 border-[#0A0A0A] bg-white p-5 tp-shadow-navy-sm">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#D01F2D]">📉 Worst Season</div>
                  <div className="text-3xl font-black text-[#16274F]" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                    {parseNumber(worstSeason.RS_W)}–{parseNumber(worstSeason.RS_L)}
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#6B7280]">{worstSeason.Season} · {Math.round(parseNumber(worstSeason.RS_PF))} pts</div>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
          <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
            <img src="/images/LogoFinalBlack.png" alt="" width={24} height={24} style={{ filter: 'invert(1)', opacity: 0.7 }} />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">Tapitas League · Est. 2014</span>
          </div>
        </footer>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#0A0A0A]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .tp-shadow-navy { box-shadow: 6px 6px 0 0 #16274F; }
        .tp-shadow-navy-sm { box-shadow: 4px 4px 0 0 #16274F; }
        .tp-shadow-black { box-shadow: 5px 5px 0 0 #0A0A0A; }
      `}</style>

      <Header />

      <section className="mx-auto max-w-[1680px] px-6 pb-24 pt-4">

        {/* Hero */}
        <div className="relative mb-8 overflow-hidden border-2 border-[#0A0A0A] tp-shadow-navy" style={{ minHeight: '240px' }}>
          <div className="absolute inset-0 overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 900 240" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <g opacity="0.06">
                {[280, 355, 400, 475, 520, 595, 640, 715, 760, 835].map((x, i) => (
                  <rect key={i} x={x} y="-60" width={i % 2 === 0 ? 55 : 22} height="380" fill="#16274F" transform={`rotate(-18 ${x + (i % 2 === 0 ? 27 : 11)} 120)`} />
                ))}
              </g>
              <g opacity="0.10" fill="none" stroke="#16274F" strokeWidth="1">
                {["M380 -20 L460 80 L380 180 L300 80 Z", "M540 -20 L620 80 L540 180 L460 80 Z", "M700 -20 L780 80 L700 180 L620 80 Z", "M860 -20 L940 80 L860 180 L780 80 Z"].map((d, i) => <path key={i} d={d} />)}
              </g>
              <g opacity="0.08" fill="#D01F2D">
                <polygon points="900,0 900,110 790,0" />
                <polygon points="900,240 900,130 790,240" />
              </g>
              <text x="820" y="230" fontFamily="'Bebas Neue',sans-serif" fontSize="240" fill="#16274F" opacity="0.04" textAnchor="middle">TMS</text>
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(105deg, #F7F6F2 28%, rgba(247,246,242,0.9) 48%, rgba(247,246,242,0.15) 100%)' }} />
          </div>
          <div className="relative z-10 p-10 md:p-14">
            <div
              className="mb-4 inline-flex items-center gap-2 bg-[#D01F2D] px-4 py-2"
              style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0% 100%)' }}
            >
              <Swords className="h-4 w-4 text-white" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-white">All Franchises</span>
            </div>
            <h1 className="leading-[0.88] text-[#16274F]"
              style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(48px, 7vw, 88px)', letterSpacing: '0.02em' }}>
              <span style={{ display: 'block' }}>THE</span>
              <span className="text-[#D01F2D]" style={{ display: 'block' }}>FRANCHISES</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold text-[#6B7280] sm:text-base">
              The teams, rivalries and legacies that built Tapitas League.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#6B7280] font-bold">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team, i) => {
              const teamHistory = getTeamHistory(team.team)
              const titles = teamHistory.filter(r => isTrueFlag(r?.Champion)).length
              const currentSeason = teamHistory[0]
              const seasonCount = new Set(teamHistory.map(r => String(r?.Season || '').trim()).filter(Boolean)).size
              const winPct = String(team?.['W%'] || '').trim()
              const isChampion = titles > 0
              const unicornCount = teamHistory.filter(r => {
                const seasonRows = historySource.filter(
                  h => String(h.Season) === String(r.Season)
                )

                const maxStanding = Math.max(
                  ...seasonRows.map(s => Number(s.Standing) || 0)
                )

                return Number(r.Standing) === maxStanding
              }).length

              return (
                <button key={i} onClick={() => setSelected(team)}
                  className={`overflow-hidden border-2 border-[#0A0A0A] bg-white text-left transition-all hover:-translate-y-[1px] ${isChampion ? 'tp-shadow-navy' : 'tp-shadow-navy-sm'
                    }`}
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
                        <div className="font-black text-[#16274F] leading-tight truncate" style={{ fontSize: 'clamp(13px, 1.8vw, 16px)' }}>
                          {team.team}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-0.5">{seasonCount} seasons</div>
                      </div>
                    </div>

                    {/* Record */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-black text-[#16274F]" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        {parseNumber(team.W)}
                      </span>
                      <span className="text-[#6B7280] font-black">–</span>
                      <span className="text-3xl font-black text-[#6B7280]" style={{ fontFamily: '"Bebas Neue", sans-serif' }}>
                        {parseNumber(team.L)}
                      </span>
                      <span className="text-xs font-bold text-[#6B7280] ml-1">{winPct}</span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        ['Titles', titles || '—'],
                        ['Finals', parseNumber(team.Finals) || '—'],
                        ['PO Apps', parseNumber(team['Playoff Apps']) || '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] p-2 text-center">
                          <div className="text-[8px] font-black uppercase tracking-[0.15em] text-[#6B7280]">{label}</div>
                          <div className="text-sm font-black text-[#16274F] mt-0.5">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Current season */}
                    {currentSeason && (
                      <div className="flex items-center justify-between border-2 border-[#0A0A0A]/10 bg-[#F7F6F2] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                          {currentSeason.Season}
                        </span>
                        <span className="text-xs font-black text-[#16274F]">
                          {parseNumber(currentSeason.RS_W)}–{parseNumber(currentSeason.RS_L)}
                          {isTrueFlag(currentSeason?.Champion) && ' 🏆'}
                          {isTrueFlag(currentSeason?.Reached_Final) && !isTrueFlag(currentSeason?.Champion) && ' 🥈'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t-2 border-[#0A0A0A]/10 px-5 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">View Profile</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#6B7280]" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <footer className="w-full border-t-4 border-[#D01F2D] bg-[#16274F]">
        <div className="mx-auto flex max-w-[1920px] items-center justify-center gap-3 px-5 py-6 sm:px-8 lg:px-12">
          <img src="/images/LogoFinalBlack.png" alt="" width={24} height={24} style={{ filter: 'invert(1)', opacity: 0.7 }} />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-white/70">Tapitas League · Est. 2014</span>
        </div>
      </footer>
    </main>
  )
}