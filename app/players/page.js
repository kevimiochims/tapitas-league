'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Activity, Target, Flame, TrendingUp, TrendingDown, Star, Swords, ChevronLeft, ChevronRight, Skull, Zap, Filter, Users } from 'lucide-react'
import { BrandBackdrop, PageShell, PageBar, BarTab, LeaderCard, CardShell, FilterBar, MultiFilterPill, ToggleChip, SearchInput, SortHeader, Tag, ResultBadge, PositionBadge, TeamLogo, Pager, StableHeight } from '../components/ui'
import PlayerProfileModal from '../components/PlayerProfileModal'
import PlayerCutout from '../components/PlayerCutout'
import LeagueNewsCard from '../components/nfl/LeagueNewsCard'
import { buildFactsNameIndex, resolveFactsName } from '../lib/factsNames'

const BASE_URL = '/api/sheet'

// Sleeper player data is loaded directly from Sleeper when a Player Profile
// is opened. The API returns the complete NFL player map; cache the promise
// in this module so the 5MB payload is not downloaded repeatedly.

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
  'ari': 'ari', 'atl': 'atl', 'bal': 'bal', 'buf': 'buf', 'car': 'car', 'chi': 'chi',
  'cin': 'cin', 'cle': 'cle', 'dal': 'dal', 'den': 'den', 'det': 'det', 'gb': 'gb',
  'hou': 'hou', 'ind': 'ind', 'jax': 'jax', 'kc': 'kc', 'lac': 'lac', 'lar': 'lar',
  'lv': 'lv', 'mia': 'mia', 'min': 'min', 'ne': 'ne', 'no': 'no', 'nyg': 'nyg',
  'nyj': 'nyj', 'phi': 'phi', 'pit': 'pit', 'sea': 'sea', 'sf': 'sf', 'tb': 'tb',
  'ten': 'ten', 'wsh': 'wsh',
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

// GAME_FACTS_ALL weekly fantasy scores may use a decimal point (e.g. 215.7).
// Keep that decimal instead of treating the dot as a thousands separator.
function parseWeeklyPoints(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value).trim().replace(/[^0-9,.-]/g, '')
  if (!raw) return 0
  if (raw.includes(',') && raw.includes('.')) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')
    const normalized = lastComma > lastDot
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  if (raw.includes(',')) {
    const parsed = Number(raw.replace(/\./g, '').replace(',', '.'))
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeFetch(url, timeoutMs = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
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
    <div className="flex-shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-[#E6E8EB]" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : defenseLogo ? (
        <img src={defenseLogo} alt={name} className="h-full w-full object-contain bg-white p-1" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#16274F] font-semibold text-white" style={{ fontSize: size * 0.32 }}>
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

function isDoubleWeek(game) {
  const week = String(game?.Week || '').trim()
  return week.includes('-') || week.includes('&')
}

function getPositionBadgeClasses(position) {
  const colors = {
    QB: 'border-[#0A0A0A] bg-[#D01F2D] text-white',
    RB: 'border-[#0A0A0A] bg-[#1E8E3E] text-white',
    WR: 'border-[#0A0A0A] bg-[#5B2CA0] text-white',
    TE: 'border-[#0A0A0A] bg-[#B8860B] text-white',
    FLEX: 'border-[#0A0A0A] bg-[#3F4757] text-white',
    K: 'border-[#0A0A0A] bg-[#6B7280] text-white',
    DEF: 'border-[#0A0A0A] bg-[#3F4757] text-white',
  }
  return colors[String(position || '').toUpperCase()] || 'border-[#0A0A0A]/20 bg-[#F7F6F2] text-[#16274F]'
}

function formatPlayerHeight(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d+'\d+\"$/.test(raw)) return raw
  const inches = Number(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(inches) || inches <= 0) return raw
  const feet = Math.floor(inches / 12)
  const remaining = Math.round(inches % 12)
  return `${feet}'${remaining}\"`
}

function formatPlayerWeight(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const numeric = Number(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? `${numeric} lbs` : raw
}

function getPlayerIdentity(name, playerLookup) {
  const raw = String(name || '').trim()
  const playerId = getPlayerId(raw, playerLookup)
  return playerId ? `id:${playerId}` : `name:${normalizePlayerKey(raw)}`
}

function canonicalMatchupHref(game, games) {
  if (!game) return '/matchups'

  // Performance rows use normalized lowercase keys (season/week/team/opponent),
  // while GAME_FACTS_ALL uses the original column names (Season/Week/Team/Opponent).
  // Read both forms so a performance click always carries the correct matchup.
  const season = String(game?.Season ?? game?.season ?? '').trim()
  const week = String(game?.Week ?? game?.week ?? '').trim()
  const team = String(game?.Team ?? game?.team ?? '').trim()
  const opp = String(game?.Opponent ?? game?.opponent ?? '').trim()

  // Always resolve the canonical/original first row of that matchup from the
  // complete GAME_FACTS_ALL array. This guarantees Matchups opens the same
  // matchup regardless of which performance row was clicked.
  const canonical = Array.isArray(games) ? games.find(row => {
    if (String(row?.Season || '').trim() !== season || String(row?.Week || '').trim() !== week) return false
    const rowTeam = normalizeTeamName(row?.Team)
    const rowOpp = normalizeTeamName(row?.Opponent)
    return (rowTeam === normalizeTeamName(team) && rowOpp === normalizeTeamName(opp)) ||
      (rowTeam === normalizeTeamName(opp) && rowOpp === normalizeTeamName(team))
  }) : null

  const target = canonical || game
  const targetSeason = String(target?.Season ?? target?.season ?? season).trim()
  const targetWeek = String(target?.Week ?? target?.week ?? week).trim()
  const targetTeam = String(target?.Team ?? target?.team ?? team).trim()
  const targetOpp = String(target?.Opponent ?? target?.opponent ?? opp).trim()

  if (!targetSeason || !targetWeek || !targetTeam || !targetOpp) return '/matchups'

  return `/matchups?season=${encodeURIComponent(targetSeason)}&week=${encodeURIComponent(targetWeek)}&team=${encodeURIComponent(targetTeam)}&opp=${encodeURIComponent(targetOpp)}`
}

const shortName = (name) => {
  const mappings = {
    'i am megatron': 'Megatron',
    'h-lera do mahl': 'H-Lera',
    'peytão da massa': 'Peytao',
    'peytao da massa': 'Peytao',
    'ocupa & resiste': 'Ocupa',
    'ocupa e resiste': 'Ocupa',
    'pequers verde': 'Pequers',
    'rincao settlers': 'Rincão',
    'rincão settlers': 'Rincão',
    'old brady': 'OldBrady',
    'oldbrady': 'OldBrady',
    'moneyball': 'Moneyball',
    'patrolao': 'Patrolao',
    'patrolão squad': 'Patrolão',
    'patrolao squad': 'Patrolao',
    'how much': 'Howmuch',
    'howmuchyoutruck': 'Howmuch',
    'hangover football club': 'Hangover FC',
    'porto alegre coelhos': 'PA Coelhos',
    'santa cruz frangos': 'SC Frangos',
    'seguidores de charlao': 'Seg de Charlao',
    'canoas andres limas': 'Canoas A Limas',
    'rj skipknows': 'RJ SkipKnows',
    '4winclutch': '4WinClutch',
  }
  const raw = String(name || '').trim()
  const key = raw.toLocaleLowerCase()
  return mappings[key] || raw
}

function canonicalPlayerKey(rawName, allAppearances, playerLookup) {
  const raw = String(rawName || '').trim()
  const data = playerLookup?.get(normalizePlayerKey(raw))
  const fullName = String(data?.fullName || '').trim()
  if (!fullName) return `raw:${raw}`

  // Resolve identity before abbreviation. If the full name exists anywhere in
  // GAME_FACTS_ALL, it is the canonical identity. This keeps homonyms such as
  // Bijan Robinson and Brian Robinson separate even when their display names
  // are abbreviated similarly.
  const fullKey = normalizePlayerKey(fullName)
  const hasFullNameInFacts = !!fullKey && allAppearances.some(a => normalizePlayerKey(a.name) === fullKey)
  if (hasFullNameInFacts) return `full:${fullKey}`

  const parts = fullName.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `abbr:${normalizePlayerKey(`${parts[0][0]}. ${parts.at(-1)}`)}`
  return `raw:${raw}`
}

function buildCanonicalIdentityMap(allAppearances, playerLookup) {
  const fullNamesInFacts = new Set()
  allAppearances.forEach(a => {
    const key = normalizePlayerKey(a?.name)
    if (key) fullNamesInFacts.add(key)
  })
  const map = new Map()
  allAppearances.forEach(a => {
    const raw = String(a?.name || '').trim()
    if (!raw) return
    const data = playerLookup?.get(normalizePlayerKey(raw))
    const fullName = String(data?.fullName || '').trim()
    let key
    if (fullName && fullNamesInFacts.has(normalizePlayerKey(fullName))) {
      key = `full:${normalizePlayerKey(fullName)}`
    } else if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean)
      key = parts.length >= 2
        ? `abbr:${normalizePlayerKey(`${parts[0][0]}. ${parts.at(-1)}`)}`
        : `raw:${normalizePlayerKey(raw)}`
    } else {
      key = `raw:${normalizePlayerKey(raw)}`
    }
    if (!map.has(normalizePlayerKey(raw))) map.set(normalizePlayerKey(raw), key)
  })
  return map
}

function makePlayerIdentityMatcher(player, identityMap) {
  const aliases = new Set(Array.isArray(player?.aliases) ? player.aliases.map(normalizePlayerKey) : [])
  return (name) => {
    const rawKey = normalizePlayerKey(name)
    const key = identityMap.get(rawKey) || `raw:${rawKey}`
    return key === player.identityKey || aliases.has(rawKey)
  }
}

function formatSeasonList(seasons) {
  const years = Array.from(new Set(seasons || [])).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!years.length) return '—'
  const parts = []
  let start = years[0], prev = years[0]
  const flush = () => {
    const count = prev - start + 1
    if (count >= 3) parts.push(`'${String(start).slice(-2)}-'${String(prev).slice(-2)}`)
    else for (let y = start; y <= prev; y++) parts.push(`'${String(y).slice(-2)}`)
  }
  for (let i = 1; i < years.length; i++) {
    if (years[i] === prev + 1) prev = years[i]
    else { flush(); start = prev = years[i] }
  }
  flush()
  return parts.join(' ')
}

export default function PlayersPage() {
  const router = useRouter()
  const [games, setGames] = useState([]), [playerLookup, setPlayerLookup] = useState(new Map()), [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState(['All'])
  const [teamFilter, setTeamFilter] = useState(['All'])
  const [season, setSeason] = useState(['All'])
  const [minApps, setMinApps] = useState('')
  const [sort, setSort] = useState({ key: 'appearances', dir: 'desc' })
  const [archiveView, setArchiveView] = useState('consolidated')
  const [newsPlayer, setNewsPlayer] = useState(null)
  const [performanceSort, setPerformanceSort] = useState({ key: 'pts', dir: 'desc' })
  const [performanceIncludeDoubleWeeks, setPerformanceIncludeDoubleWeeks] = useState(false)
  const [performancePage, setPerformancePage] = useState(0)
  const [consolidatedPage, setConsolidatedPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const closeProfile = () => setSelected(null)

  useEffect(() => {
    let alive = true
    const loadFacts = async () => {
      const rows = await safeFetch(`${BASE_URL}/GAME_FACTS_ALL`, 30000)
      if (!alive) return
      setGames(rows)
      setLoading(false)
    }
    const loadCache = async () => {
      const rows = await safeFetch(`${BASE_URL}/_PLAYER_CACHE`, 12000)
      if (!alive) return
      if (rows.length) setPlayerLookup(buildPlayerLookup(rows))
    }
    loadFacts()
    loadCache()
    return () => { alive = false }
  }, [])

  const gameAppearances = useMemo(() => games.map(g => extractPlayerAppearances(g)), [games])
  const allAppearances = useMemo(() => gameAppearances.flat(), [gameAppearances])
  const identityMap = useMemo(() => buildCanonicalIdentityMap(allAppearances, playerLookup), [allAppearances, playerLookup])

  const players = useMemo(() => {
    const seasonSel = season.includes('All') ? null : season
    const teamSel = teamFilter.includes('All') ? null : teamFilter.map(normalizeTeamName)

    const map = new Map()
    gameAppearances.forEach((apps, gameIndex) => {
      const g = games[gameIndex]
      const doubleWeek = isDoubleWeek(g)
      const gSeason = String(g?.Season || '').trim()
      const gTeam = String(g?.Team || '').trim()
      // Season e Franchise escopam quais jogos entram na agregação — assim
      // Best/Avg/Apps/etc. refletem só o recorte filtrado, não a carreira toda.
      if (seasonSel && !seasonSel.includes(gSeason)) return
      if (teamSel && !teamSel.includes(normalizeTeamName(gTeam))) return

      const seen = new Set()
      apps.forEach(app => {
        const raw = String(app.name || '').trim()
        if (!raw || getNFLTeamLogo(raw)) return
        // GAME_FACTS_ALL is the source of truth for identity. Keep the exact
        // stored name as the key. In particular, full-name rows such as
        // "Bijan Robinson" and "Brian Robinson" must never be merged merely
        // because their display abbreviations collide.
        const key = `raw:${raw}`
        if (seen.has(key)) return
        seen.add(key)
        if (!map.has(key)) {
          const rawKey = normalizePlayerKey(raw)
          const displayName = raw
          map.set(key, {
            identityKey: key,
            rawName: raw,
            name: displayName,
            position: getPlayerPosition(raw, playerLookup),
            aliases: new Set(), appearances: 0, starts: 0, bench: 0,
            total: 0, avgTotal: 0, avgCount: 0, best: 0,
            seasons: new Set(), teams: new Set(), teamApps: {}, rostered: 0,
          })
        }
        const p = map.get(key)
        p.aliases.add(raw)
        p.appearances++
        if (app.status === 'Starter') p.starts++
        else p.bench++
        const points = doubleWeek ? app.pts / 2 : app.pts
        p.total += points
        if (gSeason) p.seasons.add(gSeason)
        if (gTeam) { p.teams.add(gTeam); p.teamApps[gTeam] = (p.teamApps[gTeam] || 0) + 1 }
        if (!(app.status === 'Bench' && app.pts === 0)) {
          p.avgTotal += points
          p.avgCount++
        }
        if (!doubleWeek) p.best = Math.max(p.best, app.pts || 0)
      })
    })
    return Array.from(map.values())
      .filter(p => p.position !== 'DEF')
      .map(p => ({ ...p, aliases: Array.from(p.aliases), teams: Array.from(p.teams), avg: p.avgCount ? p.avgTotal / p.avgCount : 0 }))
      .sort((a, b) => b.appearances - a.appearances || b.starts - a.starts || a.name.localeCompare(b.name))
  }, [games, gameAppearances, playerLookup, season, teamFilter])

  // Listas de opções sempre derivadas de TODOS os jogos (não do recorte atual),
  // senão os próprios filtros ficariam presos ao que já está selecionado.
  const allPlayerNames = useMemo(() => {
    const names = new Set()
    gameAppearances.forEach(apps => apps.forEach(app => {
      const raw = String(app.name || '').trim()
      if (raw && !getNFLTeamLogo(raw)) names.add(raw)
    }))
    return Array.from(names)
  }, [gameAppearances])

  const positions = useMemo(() => ['All', ...Array.from(new Set(allPlayerNames.map(n => getPlayerPosition(n, playerLookup)).filter(p => p && p !== 'DEF'))).sort()], [allPlayerNames, playerLookup])
  const seasons = useMemo(() => ['All', ...Array.from(new Set(games.map(g => String(g?.Season || '').trim()).filter(Boolean))).sort((a, b) => Number(b) - Number(a))], [games])
  const teams = useMemo(() => {
    const set = new Set()
    games.forEach((g, i) => {
      if (gameAppearances[i] && gameAppearances[i].length > 0) {
        const t = String(g?.Team || '').trim()
        if (t) set.add(t)
      }
    })
    return ['All', ...Array.from(set).sort()]
  }, [games, gameAppearances])

  const toggleSortCol = (key) => setSort(cur => cur.key === key ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })

  const filtered = useMemo(() => {
    const posSel = position.includes('All') ? null : position
    const minAppsNum = minApps.trim() === '' ? null : Number(minApps)

    return players
      .filter(p => normalizePlayerKey(p.name).includes(normalizePlayerKey(search)))
      .filter(p => !posSel || posSel.includes(p.position))
      .filter(p => minAppsNum === null || p.appearances >= minAppsNum)
      .sort((a, b) => {
        const dirMul = sort.dir === 'desc' ? 1 : -1
        const byKey = {
          appearances: b.appearances - a.appearances,
          starts: b.starts - a.starts,
          bench: b.bench - a.bench,
          avg: b.avg - a.avg,
          best: b.best - a.best,
        }[sort.key] ?? (b.appearances - a.appearances)
        return byKey * dirMul || b.appearances - a.appearances || a.name.localeCompare(b.name)
      })
  }, [players, search, position, teamFilter, season, minApps, sort])

  const togglePerformanceSort = (key) => setPerformanceSort(cur => cur.key === key
    ? { key, dir: cur.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: 'desc' })

  const performanceRows = useMemo(() => {
    const seasonSel = season.includes('All') ? null : season
    const teamSel = teamFilter.includes('All') ? null : teamFilter.map(normalizeTeamName)
    const posSel = position.includes('All') ? null : position
    const searchKey = normalizePlayerKey(search)

    const playerByKey = new Map(players.map(p => [p.identityKey, p]))
    const rows = []

    gameAppearances.forEach((apps, gameIndex) => {
      const g = games[gameIndex]
      const gSeason = String(g?.Season || '').trim()
      const gTeam = String(g?.Team || '').trim()
      const gOpponent = String(g?.Opponent || '').trim()
      const result = String(g?.Result || '').trim().toUpperCase()
      const stage = String(g?.GameStage || '').trim()
      const doubleWeek = isDoubleWeek(g)

      if (seasonSel && !seasonSel.includes(gSeason)) return
      if (!performanceIncludeDoubleWeeks && doubleWeek) return
      if (teamSel && !teamSel.includes(normalizeTeamName(gTeam))) return

      const seen = new Set()
      apps.forEach(app => {
        const raw = String(app.name || '').trim()
        if (!raw || getNFLTeamLogo(raw)) return
        const key = `raw:${raw}`
        if (seen.has(key)) return
        seen.add(key)

        const playerPosition = getPlayerPosition(raw, playerLookup)
        if (playerPosition === 'DEF') return
        const displayName = getDisplayPlayerName(raw, playerLookup)
        if (posSel && !posSel.includes(playerPosition)) return
        if (searchKey && !normalizePlayerKey(displayName).includes(searchKey)) return

        const player = playerByKey.get(key) || {
          identityKey: key,
          rawName: raw,
          name: displayName,
          position: playerPosition,
          appearances: 0,
          starts: 0,
          bench: 0,
          total: 0,
          avg: 0,
          best: 0,
          seasons: [],
          teams: [],
          rostered: 0,
        }

        rows.push({
          identityKey: key,
          rawName: raw,
          name: displayName,
          position: playerPosition,
          pts: Number.isFinite(Number(app.pts)) ? Number(app.pts) : 0,
          season: gSeason,
          week: String(g?.Week || '').trim(),
          team: gTeam,
          opponent: gOpponent,
          status: app.status,
          result,
          stage,
          isDoubleWeek: doubleWeek,
          player,
          href: canonicalMatchupHref(g, games),
        })
      })
    })

    const sorted = [...rows].sort((a, b) => {
      const dirMul = performanceSort.dir === 'desc' ? 1 : -1
      const valueA = performanceSort.key === 'season' ? (Number(a.season) || 0)
        : performanceSort.key === 'week' ? (parseFloat(a.week) || 0)
          : a.pts
      const valueB = performanceSort.key === 'season' ? (Number(b.season) || 0)
        : performanceSort.key === 'week' ? (parseFloat(b.week) || 0)
          : b.pts
      const diff = (valueB - valueA) * dirMul
      if (diff !== 0) return diff
      return (Number(b.season) - Number(a.season)) || ((parseFloat(b.week) || 0) - (parseFloat(a.week) || 0)) || a.name.localeCompare(b.name)
    })

    return sorted
  }, [games, gameAppearances, players, playerLookup, search, position, teamFilter, season, performanceSort, performanceIncludeDoubleWeeks])

  // Vitrine do Top Performances: pódio e melhor jogo por posição (sempre por pontos, respeitando os filtros)
  const performanceShowcase = useMemo(() => {
    const byPts = [...performanceRows].sort((a, b) => b.pts - a.pts)
    const bestOf = (filter) => byPts.find(filter) || null
    return {
      podium: byPts.slice(0, 3),
      max: byPts[0]?.pts || 0,
      positions: [
        ...['QB', 'RB', 'WR', 'TE', 'K'].map(pos => ({ label: pos, row: bestOf(r => r.position === pos) })),
        { label: 'Bench', row: bestOf(r => r.status && r.status !== 'Starter') },
      ],
    }
  }, [performanceRows])

  const consolidatedPageSize = 15
  const consolidatedTotalPages = Math.max(1, Math.ceil(filtered.length / consolidatedPageSize))
  const visibleConsolidatedRows = useMemo(() => {
    const start = consolidatedPage * consolidatedPageSize
    return filtered.slice(start, start + consolidatedPageSize)
  }, [filtered, consolidatedPage])

  const performancePageSize = 15
  const performanceTotalPages = Math.max(1, Math.ceil(performanceRows.length / performancePageSize))
  const visiblePerformanceRows = useMemo(() => {
    const start = performancePage * performancePageSize
    return performanceRows.slice(start, start + performancePageSize)
  }, [performanceRows, performancePage])

  useEffect(() => {
    setConsolidatedPage(0)
  }, [archiveView, search, position, teamFilter, season, minApps, sort])

  useEffect(() => {
    setConsolidatedPage(current => Math.min(current, consolidatedTotalPages - 1))
  }, [consolidatedTotalPages])

  useEffect(() => {
    setPerformancePage(0)
  }, [archiveView, search, position, teamFilter, season, performanceSort, performanceIncludeDoubleWeeks])

  useEffect(() => {
    setPerformancePage(current => Math.min(current, performanceTotalPages - 1))
  }, [performanceTotalPages])

  const goConsolidatedPage = (direction) => {
    setConsolidatedPage(current => {
      const next = current + direction
      if (next < 0 || next >= consolidatedTotalPages) return current
      return next
    })
  }

  const goPerformancePage = (direction) => {
    setPerformancePage(current => {
      const next = current + direction
      if (next < 0 || next >= performanceTotalPages) return current
      return next
    })
  }

  const scopeParts = []
  if (!season.includes('All')) scopeParts.push(`Season ${season.join(', ')}`)
  if (!teamFilter.includes('All')) scopeParts.push(teamFilter.map(shortName).join(', '))
  if (!position.includes('All')) scopeParts.push(position.join(', '))
  if (archiveView === 'consolidated' && minApps.trim()) scopeParts.push(`${minApps.trim()}+ apps`)
  if (search.trim()) scopeParts.push(`"${search.trim()}"`)
  const scopeLabel = scopeParts.length ? scopeParts.join(' · ') : 'All Tapitas League franchises'
  const hasFilters = scopeParts.length > 0
  const clearFilters = () => { setSeason(['All']); setTeamFilter(['All']); setPosition(['All']); setMinApps(''); setSearch('') }

  const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium text-[#6B7280] lg:px-4'
  const thRight = 'whitespace-nowrap px-3 py-2 text-right text-[11px] font-medium text-[#6B7280] lg:px-4'
  const td = 'px-3 py-2.5 lg:px-4'

  return (
    <PageShell loading={loading}>
      <PageBar title="Players">
        <BarTab active={archiveView === 'consolidated'} onClick={() => setArchiveView('consolidated')}>Player Archive</BarTab>
        <BarTab active={archiveView === 'performances'} onClick={() => setArchiveView('performances')}>Top Performances</BarTab>
        <BarTab active={archiveView === 'news'} onClick={() => setArchiveView('news')}>Player News</BarTab>
      </PageBar>

      {/* Notícias dos jogadores da liga (ESPN, RotoWire, RotoBaller, FantasyPros…) */}
      {archiveView === 'news' && <LeagueNewsCard sidebar={false} initialLimit={20} onOpenPlayer={p => p && setNewsPlayer(p)} />}

      {/* Líderes do recorte atual (respeitam os filtros da tabela) */}
      {archiveView === 'consolidated' && filtered.length > 0 && (
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: 'Most appearances', icon: Users, accent: 'bg-[#EEF3FF] text-[#02275F]', list: [...filtered].sort((a, b) => b.appearances - a.appearances), value: p => p.appearances },
            { title: 'Best average (10+ apps)', icon: TrendingUp, accent: 'bg-[#E8F5EC] text-[#1E8E3E]', list: [...filtered].filter(p => p.appearances >= 10).sort((a, b) => b.avg - a.avg), value: p => p.avg.toFixed(2) },
            { title: 'Best single game', icon: Flame, accent: 'bg-[#FFF2B8] text-[#8D6A00]', list: [...filtered].sort((a, b) => b.best - a.best), value: p => p.best.toFixed(2) },
            { title: 'Most starts', icon: Star, accent: 'bg-[#FDECEE] text-[#D01F2D]', list: [...filtered].sort((a, b) => b.starts - a.starts), value: p => p.starts },
          ].map((card, cardIndex) => {
            const [first, ...rest] = card.list.slice(0, 5)
            return (
              <LeaderCard
                key={card.title}
                featured={cardIndex === 0}
                title={card.title}
                icon={card.icon}
                accentClass={card.accent}
                leader={first && {
                  avatar: <PlayerAvatar name={first.rawName} playerLookup={playerLookup} size={44} />,
                  name: first.name,
                  badge: <PositionBadge position={first.position} />,
                  sub: `${first.appearances} apps · ${formatSeasonList(Array.from(first.seasons))}`,
                  value: card.value(first),
                  onClick: () => setSelected(first),
                }}
                others={rest.map(p => ({ key: p.identityKey, avatar: <PlayerAvatar name={p.rawName} playerLookup={playerLookup} size={22} />, name: p.name, value: card.value(p), onClick: () => setSelected(p) }))}
              />
            )
          })}
        </div>
      )}

      {archiveView === 'performances' && performanceShowcase.podium.length > 0 && (
        <>
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            {performanceShowcase.podium.map((g, i) => {
              const first = i === 0
              return (
                <a
                  key={`${g.identityKey}-${g.season}-${g.week}-${i}`}
                  href={g.href}
                  className={`group relative flex items-center gap-4 overflow-hidden rounded-xl p-4 transition-shadow hover:shadow-md ${first ? 'min-h-[118px] pr-[120px] text-white' : 'bg-white text-[#111]'}`}
                >
                  {first && <BrandBackdrop />}
                  <span className={`absolute right-3 top-2 text-[64px] font-black italic leading-none tabular-nums ${first ? 'text-white/10' : 'text-[#02275F]/[0.06]'}`}>{i + 1}</span>
                  {/* 1º lugar: foto recortada grande à direita; os outros, a foto redonda */}
                  {first
                    ? <div className="absolute -right-2 bottom-0"><PlayerCutout sleeperId={getPlayerId(g.rawName, playerLookup)} name={g.name} className="h-[118px]" /></div>
                    : (
                      <div className={`flex-shrink-0 rounded-full p-0.5 ${i === 1 ? 'bg-[#C0C4CC]' : 'bg-[#C98A55]'}`}>
                        <PlayerAvatar name={g.rawName} playerLookup={playerLookup} size={64} />
                      </div>
                    )}
                  <div className="relative min-w-0 flex-1">
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${first ? 'text-[#E8C766]' : 'text-[#6B7280]'}`}>{first ? 'Top performance' : `#${i + 1} performance`}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <span className={`truncate text-[15px] font-semibold ${first ? '' : 'group-hover:text-[#D01F2D]'}`}>{g.name}</span>
                      <PositionBadge position={g.position} />
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[32px] font-bold leading-none tabular-nums">{g.pts.toFixed(2)}</span>
                      <span className={`text-[12px] ${first ? 'text-white/70' : 'text-[#6B7280]'}`}>pts</span>
                    </div>
                    <div className={`mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] ${first ? 'text-white/80' : 'text-[#6B7280]'}`}>
                      <TeamLogo name={g.team} size={16} />
                      <span className="truncate">{shortName(g.team)} vs {shortName(g.opponent)} · {g.season} W{g.week}</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {performanceShowcase.positions.map(({ label, row }) => (
              <a key={label} href={row?.href} className="group flex flex-col rounded-xl bg-white p-3 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">Best {label}</span>
                  {label === 'Bench' ? <Tag>Bench</Tag> : <PositionBadge position={label} />}
                </div>
                {row ? (
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <PlayerAvatar name={row.rawName} playerLookup={playerLookup} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{row.name}</div>
                      <div className="truncate text-[11px] text-[#6B7280]">{row.season} W{row.week} · {shortName(row.team)}</div>
                    </div>
                    <span className="flex-shrink-0 text-[18px] font-bold tabular-nums text-[#111]">{row.pts.toFixed(1)}</span>
                  </div>
                ) : <div className="mt-2.5 py-2 text-[12px] text-[#9CA3AF]">No data</div>}
              </a>
            ))}
          </div>
        </>
      )}

      {/* Franchise icons (mais jogos por um só time) e Journeymen (mais times diferentes) */}
      {archiveView === 'consolidated' && filtered.length > 0 && (() => {
        const icons = filtered
          .map(p => {
            const [team, apps] = Object.entries(p.teamApps || {}).sort((a, b) => b[1] - a[1])[0] || []
            return team ? { p, team, apps, share: apps / Math.max(p.appearances, 1) } : null
          })
          .filter(Boolean)
          .sort((a, b) => b.apps - a.apps || b.share - a.share)
          .slice(0, 5)
        const journeymen = [...filtered]
          .filter(p => p.teams.length > 1)
          .sort((a, b) => b.teams.length - a.teams.length || b.appearances - a.appearances)
          .slice(0, 5)
        return (
          <div className="mb-2 grid gap-2 lg:grid-cols-2">
            <CardShell title="Franchise icons" subtitle="Most games with a single franchise" className="mb-0">
              <div className="py-1">
                {icons.map(({ p, team, apps, share }, i) => (
                  <button key={p.identityKey} type="button" onClick={() => setSelected(p)} className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F7F8FA] lg:px-4">
                    <span className="w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 1}</span>
                    <span className="relative flex-shrink-0">
                      <PlayerAvatar name={p.rawName} playerLookup={playerLookup} size={38} />
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-px shadow"><TeamLogo name={team} size={18} /></span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{p.name}</span><PositionBadge position={p.position} /></span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F2]"><span className="block h-full rounded-full bg-[#02275F]" style={{ width: `${Math.round(share * 100)}%` }} /></span>
                        <span className="flex-shrink-0 text-[11px] tabular-nums text-[#6B7280]">{Math.round(share * 100)}% of career</span>
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block text-[18px] font-bold leading-none tabular-nums text-[#111]">{apps}</span>
                      <span className="text-[10px] text-[#6B7280]">apps</span>
                    </span>
                  </button>
                ))}
              </div>
            </CardShell>
            <CardShell title="Journeymen" subtitle="Players who suited up for the most franchises" className="mb-0">
              <div className="py-1">
                {journeymen.map((p, i) => (
                  <button key={p.identityKey} type="button" onClick={() => setSelected(p)} className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#F7F8FA] lg:px-4">
                    <span className="w-4 flex-shrink-0 text-[12px] font-semibold tabular-nums text-[#9CA3AF]">{i + 1}</span>
                    <PlayerAvatar name={p.rawName} playerLookup={playerLookup} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[13px] font-semibold text-[#111] group-hover:text-[#D01F2D]">{p.name}</span><PositionBadge position={p.position} /></span>
                      <span className="mt-1 flex -space-x-1.5">
                        {[...p.teams].sort((a, b) => (p.teamApps?.[b] || 0) - (p.teamApps?.[a] || 0)).map(t => <span key={t} title={`${t} · ${p.teamApps?.[t] || 0} apps`} className="rounded-full bg-white ring-2 ring-white"><TeamLogo name={t} size={20} /></span>)}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block text-[18px] font-bold leading-none tabular-nums text-[#111]">{p.teams.length}</span>
                      <span className="text-[10px] text-[#6B7280]">teams</span>
                    </span>
                  </button>
                ))}
              </div>
            </CardShell>
          </div>
        )
      })()}

      {archiveView !== 'news' && <CardShell
        title={archiveView === 'consolidated' ? `${filtered.length} players` : `${performanceRows.length} performances`}
        subtitle={hasFilters ? `Stats scoped to ${scopeLabel}` : scopeLabel}
        action={hasFilters && <button type="button" onClick={clearFilters} className="flex-shrink-0 text-[12px] font-medium text-[#D01F2D] hover:underline">Clear filters</button>}
        withMenus
      >
        <FilterBar>
          <MultiFilterPill value={season} onChange={setSeason} options={seasons} label="Season" />
          <MultiFilterPill value={position} onChange={setPosition} options={positions} label="Position" />
          <MultiFilterPill value={teamFilter} onChange={setTeamFilter} options={teams} label="Franchise" displayOption={shortName} />
          {archiveView === 'consolidated' && (
            <input
              value={minApps}
              onChange={e => setMinApps(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Min apps"
              inputMode="numeric"
              className="h-8 w-24 rounded-full bg-[#F4F5F7] px-3 text-[12px] text-[#111] outline-none placeholder:text-[#6B7280] focus:bg-white focus:ring-1 focus:ring-[#02275F]"
            />
          )}
          {archiveView === 'performances' && (
            <ToggleChip active={performanceIncludeDoubleWeeks} onClick={() => setPerformanceIncludeDoubleWeeks(v => !v)}>Include double weeks</ToggleChip>
          )}
          <div className="w-full sm:ml-auto sm:w-auto">
            <SearchInput value={search} onChange={setSearch} placeholder="Search player…" className="sm:w-56" />
          </div>
        </FilterBar>

        {archiveView === 'consolidated' ? (
          <div className="overflow-hidden rounded-b-xl">
            <StableHeight resetKey={`players|${filtered.length}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-[#EEF0F2]">
                      <th className={`${th} w-10`}>#</th>
                      <th className={th}>Player</th>
                      <th className={th}>Franchises</th>
                      {[['Apps', 'appearances'], ['Starts', 'starts'], ['Avg pts', 'avg'], ['Best', 'best']].map(([label, key]) => (
                        <th key={key} className={thRight}>
                          <SortHeader label={label} active={sort.key === key} dir={sort.dir} onClick={() => toggleSortCol(key)} align="right" />
                        </th>
                      ))}
                      <th className={th}>Seasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleConsolidatedRows.map((p, i) => (
                      <tr key={p.identityKey} onClick={() => setSelected(p)} className="group cursor-pointer border-b border-[#F1F2F4] transition-colors hover:bg-[#F7F8FA]">
                        <td className={`${td} text-[13px] font-semibold tabular-nums text-[#9CA3AF]`}>{consolidatedPage * consolidatedPageSize + i + 1}</td>
                        <td className={td}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <PlayerAvatar name={p.rawName} playerLookup={playerLookup} size={34} />
                            <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{p.name}</span>
                            <PositionBadge position={p.position} />
                          </div>
                        </td>
                        <td className={`${td} max-w-[240px]`}>
                          <div className="flex items-center gap-1">
                            {p.teams.slice(0, 5).map(t => <span key={t} title={t}><TeamLogo name={t} size={20} /></span>)}
                            {p.teams.length > 5 && <span className="text-[11px] text-[#6B7280]">+{p.teams.length - 5}</span>}
                          </div>
                        </td>
                        <td className={`${td} text-right text-[13px] tabular-nums text-[#3F4757]`}>{p.appearances}</td>
                        <td className={`${td} text-right text-[13px] tabular-nums text-[#3F4757]`}>{p.starts}</td>
                        <td className={`${td} text-right text-[13px] font-semibold tabular-nums text-[#111]`}>{p.avg.toFixed(2)}</td>
                        <td className={`${td} text-right text-[13px] font-semibold tabular-nums text-[#111]`}>{p.best.toFixed(2)}</td>
                        <td className={`${td} whitespace-nowrap text-[12px] text-[#6B7280]`}>{formatSeasonList(Array.from(p.seasons))}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan="8" className="py-12 text-center text-[13px] text-[#6B7280]">No players found</td></tr>}
                  </tbody>
                </table>
              </div>
            </StableHeight>
            <Pager page={consolidatedPage} totalPages={consolidatedTotalPages} total={filtered.length} pageSize={consolidatedPageSize} onPrev={() => goConsolidatedPage(-1)} onNext={() => goConsolidatedPage(1)} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-b-xl">
            <StableHeight resetKey={`perf|${performanceRows.length}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                  <thead>
                    <tr className="border-b border-[#EEF0F2]">
                      <th className={`${th} w-10`}>#</th>
                      <th className={th}>Player</th>
                      <th className={th}><SortHeader label="Season" active={performanceSort.key === 'season'} dir={performanceSort.dir} onClick={() => togglePerformanceSort('season')} /></th>
                      <th className={th}><SortHeader label="Week" active={performanceSort.key === 'week'} dir={performanceSort.dir} onClick={() => togglePerformanceSort('week')} /></th>
                      <th className={th}>Matchup</th>
                      <th className={thRight}><SortHeader label="Points" active={performanceSort.key === 'pts'} dir={performanceSort.dir} onClick={() => togglePerformanceSort('pts')} align="right" /></th>
                      <th className={th}>Status</th>
                      <th className={th}>Result</th>
                      <th className={th}>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePerformanceRows.map((g, i) => (
                      <tr
                        key={`${g.identityKey}-${g.season}-${g.week}-${g.team}-${i}`}
                        onClick={() => router.push(canonicalMatchupHref(g, games))}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(canonicalMatchupHref(g, games)) }}
                        tabIndex={0}
                        className="group cursor-pointer border-b border-[#F1F2F4] transition-colors hover:bg-[#F7F8FA] focus:bg-[#F7F8FA] focus:outline-none"
                      >
                        <td className={`${td} text-[13px] font-semibold tabular-nums text-[#9CA3AF]`}>{performancePage * performancePageSize + i + 1}</td>
                        <td className={td}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <PlayerAvatar name={g.rawName} playerLookup={playerLookup} size={34} />
                            <span className="truncate text-[13px] font-medium text-[#111] group-hover:text-[#D01F2D]">{g.name}</span>
                            <PositionBadge position={g.position} />
                          </div>
                        </td>
                        <td className={`${td} text-[13px] font-semibold text-[#111]`}>{g.season}</td>
                        <td className={`${td} whitespace-nowrap text-[13px] tabular-nums text-[#3F4757]`}>{g.week}</td>
                        <td className={td}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[#111]">
                            <TeamLogo name={g.team} size={18} />{shortName(g.team)}
                            <span className="text-[#9CA3AF]">vs</span>
                            <TeamLogo name={g.opponent} size={18} />{shortName(g.opponent)}
                          </div>
                        </td>
                        <td className={`${td} whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-[#111]`}>
                          {g.pts.toFixed(2)}{g.isDoubleWeek && <span className="ml-1"><Tag>DW</Tag></span>}
                          <div className="ml-auto mt-1 h-1 w-20 overflow-hidden rounded-full bg-[#EEF0F2]">
                            <div className="ml-auto h-full rounded-full bg-[#02275F]" style={{ width: `${performanceShowcase.max > 0 ? Math.max(0, g.pts) / performanceShowcase.max * 100 : 0}%` }} />
                          </div>
                        </td>
                        <td className={td}><Tag tone={g.status === 'Starter' ? 'green' : undefined}>{g.status}</Tag></td>
                        <td className={td}><ResultBadge result={g.result} /></td>
                        <td className={`${td} text-[12px] text-[#6B7280]`}>{g.stage || '—'}</td>
                      </tr>
                    ))}
                    {performanceRows.length === 0 && <tr><td colSpan="9" className="py-12 text-center text-[13px] text-[#6B7280]">No performances found</td></tr>}
                  </tbody>
                </table>
              </div>
            </StableHeight>
            <Pager page={performancePage} totalPages={performanceTotalPages} total={performanceRows.length} pageSize={performancePageSize} onPrev={() => goPerformancePage(-1)} onNext={() => goPerformancePage(1)} />
          </div>
        )}
      </CardShell>}

      {newsPlayer && (
        <PlayerProfileModal
          key={`news-${newsPlayer.id}`}
          rawName={resolveFactsName(buildFactsNameIndex(games), newsPlayer)}
          displayName={newsPlayer.name}
          position={newsPlayer.pos}
          playerId={newsPlayer.id}
          initialTab="news"
          games={games}
          onClose={() => setNewsPlayer(null)}
        />
      )}

      {selected && <PlayerProfileModal key={selected.identityKey} rawName={selected.rawName} displayName={selected.name} position={selected.position} playerId={getPlayerId(selected.rawName, playerLookup)} games={games} onClose={closeProfile} />}
    </PageShell>
  )
}
